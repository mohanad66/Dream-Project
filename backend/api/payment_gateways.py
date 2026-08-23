"""
Egyptian payment gateway integrations: Paymob + Fawry.

Environment variables needed (add to Koyeb):
  PAYMOB_API_KEY        — Paymob API key
  PAYMOB_INTEGRATION_ID — Paymob integration ID (card)
  PAYMOB_WALLET_INTEGRATION_ID — Paymob wallet integration (optional)
  PAYMOB_HMAC           — Paymob webhook HMAC secret
  FAWRY_MERCHANT_CODE   — Fawry merchant code
  FAWRY_SECURITY_CODE   — Fawry security code/salt
  FAWRY_RETURN_URL      — Redirect URL after Fawry payment
"""

import hashlib
import hmac as hmac_mod
import json
import logging
from decimal import Decimal

import requests
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Order, Payment

logger = logging.getLogger(__name__)


# ===============================================
# PAYMOB
# ===============================================

PAYMOB_BASE = "https://accept.paymob.com/api"


def _paymob_headers():
    return {"Content-Type": "application/json"}


def _get_paymob_auth_token():
    """Authenticate with Paymob and return the auth token."""
    api_key = getattr(settings, "PAYMOB_API_KEY", "")
    if not api_key:
        raise ValueError("PAYMOB_API_KEY not configured")
    resp = requests.post(
        f"{PAYMOB_BASE}/auth/tokens",
        json={"api_key": api_key},
        headers=_paymob_headers(),
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()["token"]


def _register_paymob_order(auth_token, order_obj):
    """Register the order with Paymob and return the order ID."""
    resp = requests.post(
        f"{PAYMOB_BASE}/ecommerce/orders",
        json={
            "auth_token": auth_token,
            "delivery_needed": False,
            "amount_cents": int(order_obj.total_price * 100),
            "currency": "EGP",
            "items": [
                {
                    "name": f"Order #{order_obj.pk}",
                    "amount_cents": int(item.subtotal * 100),
                    "description": f"Product x{item.quantity}",
                    "quantity": item.quantity,
                }
                for item in order_obj.items.select_related("product").all()
            ],
        },
        headers=_paymob_headers(),
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()["id"]


def _get_paymob_payment_key(auth_token, order_id, billing_data):
    """Get a payment key for the order."""
    integration_id = getattr(settings, "PAYMOB_INTEGRATION_ID", "")
    if not integration_id:
        raise ValueError("PAYMOB_INTEGRATION_ID not configured")
    frontend_url = getattr(settings, "FRONTEND_URL", "https://dream-project-roan.vercel.app")
    backend_url = getattr(settings, "BACKEND_URL", "")
    redirect_url = f"{frontend_url}/payment/result" if frontend_url else ""
    resp = requests.post(
        f"{PAYMOB_BASE}/acceptance/payment_keys",
        json={
            "auth_token": auth_token,
            "amount_cents": None,
            "expiration": 3600,
            "order_id": order_id,
            "billing_data": billing_data,
            "currency": "EGP",
            "integration_id": int(integration_id),
            "redirect_url": redirect_url,
        },
        headers=_paymob_headers(),
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()["token"]


class PaymobInitView(APIView):
    """
    POST /api/payments/paymob/init/
    Creates order + payment key. Returns payment_token for the frontend to use.
    Body: { "order_id": 123, "billing_data": {...} }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        order_id = request.data.get("order_id")
        billing_data = request.data.get("billing_data", {})

        if not order_id:
            return Response({"error": "order_id required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            order = Order.objects.get(pk=order_id, owner=request.user)
        except Order.DoesNotExist:
            return Response({"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND)

        billing = {
            "apartment": billing_data.get("apartment", ""),
            "email": request.user.email,
            "floor": billing_data.get("floor", ""),
            "first_name": request.user.first_name or "Customer",
            "last_name": request.user.last_name or "",
            "phone_number": billing_data.get("phone_number", request.user.username),
            "street": billing_data.get("street", "N/A"),
            "building": billing_data.get("building", "N/A"),
            "shipping_method": "PKG",
            "postal_code": billing_data.get("postal_code", ""),
            "city": billing_data.get("city", "Cairo"),
            "country": billing_data.get("country", "EG"),
            "state": billing_data.get("state", ""),
        }

        try:
            auth_token = _get_paymob_auth_token()
            paymob_order_id = _register_paymob_order(auth_token, order)
            payment_token = _get_paymob_payment_key(auth_token, paymob_order_id, billing)

            # Store payment record
            payment = Payment.objects.create(
                owner=request.user,
                method="paymob",
                amount=order.total_price,
                provider_payment_id=str(paymob_order_id),
                status="pending",
                raw_response=json.dumps({"payment_token": payment_token}),
            )
            order.payment = payment
            order.save(update_fields=["payment"])

            return Response({
                "payment_token": payment_token,
                "paymob_order_id": paymob_order_id,
            })

        except Exception as e:
            logger.exception("Paymob init error")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PaymobPayView(APIView):
    """
    POST /api/payments/paymob/pay/
    Headless card payment — sends card details to Paymob's /payments/pay endpoint.
    Body: { "payment_token": "...", "card_number": "...", "expiry_month": "...",
            "expiry_year": "...", "cvv": "...", "card_holder_name": "..." }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        payment_token = request.data.get("payment_token", "")
        card_number = request.data.get("card_number", "").replace(" ", "")
        expiry_month = request.data.get("expiry_month", "")
        expiry_year = request.data.get("expiry_year", "")
        cvv = request.data.get("cvv", "")
        card_holder_name = request.data.get("card_holder_name", "")

        if not all([payment_token, card_number, expiry_month, expiry_year, cvv]):
            return Response({"error": "Missing required card fields"}, status=status.HTTP_400_BAD_REQUEST)

        integration_id = getattr(settings, "PAYMOB_INTEGRATION_ID", "")
        if not integration_id:
            return Response({"error": "PAYMOB_INTEGRATION_ID not configured"}, status=status.HTTP_501_NOT_IMPLEMENTED)

        payload = {
            "source": {
                "identifier": card_number,
                "cvv": cvv,
                "expiry_month": expiry_month,
                "expiry_year": expiry_year,
                "billing": {
                    "first_name": card_holder_name.split(" ")[0] if card_holder_name else "Customer",
                    "last_name": " ".join(card_holder_name.split(" ")[1:]) if card_holder_name and " " in card_holder_name else "",
                    "email": request.user.email,
                    "phone_number": {"country_code": "eg", "number": request.user.username},
                },
            },
            "payment_token": payment_token,
            "integration_id": int(integration_id),
        }

        try:
            resp = requests.post(
                f"{PAYMOB_BASE}/acceptance/payments/pay",
                json=payload,
                headers=_paymob_headers(),
                timeout=30,
            )
            resp_data = resp.json()
            logger.info(f"Paymob /payments/pay response: {json.dumps(resp_data)}")

            if resp.status_code == 200 and resp_data.get("success"):
                # Payment succeeded — update records
                paymob_order_id = str(resp_data.get("order", {}).get("id", ""))
                transaction_id = str(resp_data.get("id", ""))

                payment = None
                if paymob_order_id:
                    payment = Payment.objects.filter(provider_payment_id=paymob_order_id).first()
                if not payment:
                    # Try to find by user's recent pending payment
                    payment = Payment.objects.filter(
                        owner=request.user, method="paymob", status="pending"
                    ).order_by("-created_at").first()

                if payment:
                    payment.status = "completed"
                    payment.provider_payment_id = paymob_order_id or payment.provider_payment_id
                    payment.raw_response = json.dumps(resp_data)
                    payment.save(update_fields=["status", "provider_payment_id", "raw_response"])

                    if hasattr(payment, "order") and payment.order:
                        payment.order.status = "confirmed"
                        payment.order.save(update_fields=["status"])

                return Response({
                    "success": True,
                    "transaction_id": transaction_id,
                    "order_id": paymob_order_id,
                    "message": "Payment successful",
                })
            else:
                error_msg = resp_data.get("message", resp_data.get("detail", "Payment failed"))
                error_code = resp_data.get("code", "")

                # Update payment record as failed
                payment = Payment.objects.filter(
                    owner=request.user, method="paymob", status="pending"
                ).order_by("-created_at").first()
                if payment:
                    payment.status = "failed"
                    payment.raw_response = json.dumps(resp_data)
                    payment.save(update_fields=["status", "raw_response"])

                return Response({
                    "success": False,
                    "error": error_msg,
                    "code": error_code,
                }, status=status.HTTP_402_PAYMENT_REQUIRED)

        except requests.exceptions.RequestException as e:
            logger.exception("Paymob /payments/pay request failed")
            return Response({"error": "Payment gateway unreachable", "details": str(e)},
                            status=status.HTTP_502_BAD_GATEWAY)
        except Exception as e:
            logger.exception("Paymob pay error")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Keep old name for backward compat
PaymobCheckoutView = PaymobInitView


@csrf_exempt
@require_POST
def paymob_webhook(request):
    """
    POST /api/payments/paymob/webhook/
    Paymob sends payment status updates here.
    """
    try:
        data = json.loads(request.body)
        logger.info(f"Paymob webhook: {json.dumps(data)}")

        paymob_hmac = getattr(settings, "PAYMOB_HMAC", "")
        if paymob_hmac:
            hmac_str = data.get("hmac", "")
            if not hmac_str:
                logger.warning("Paymob webhook missing HMAC")

        obj = data.get("obj", {})
        paymob_order_id = str(obj.get("order", {}).get("id", ""))
        success = obj.get("success", False)

        if paymob_order_id:
            payment = Payment.objects.filter(provider_payment_id=paymob_order_id).first()
            if payment:
                payment.status = "completed" if success else "failed"
                payment.raw_response = json.dumps(data)
                payment.save(update_fields=["status", "raw_response"])

                if success and hasattr(payment, "order") and payment.order:
                    payment.order.status = "confirmed"
                    payment.order.save(update_fields=["status"])

        return JsonResponse({"status": "ok"})

    except Exception as e:
        logger.exception("Paymob webhook error")
        return JsonResponse({"error": str(e)}, status=400)


class PaymobCallbackView(APIView):
    """
    GET /api/payments/paymob/callback/?order=123&success=true
    User browser is redirected here after payment. Redirect to frontend.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        from django.shortcuts import redirect
        success = request.query_params.get("success", "false")
        order_id = request.query_params.get("order", "")
        frontend_url = getattr(settings, "FRONTEND_URL", "https://dream-project-roan.vercel.app")
        redirect_url = f"{frontend_url}/payment/result?success={success}&order={order_id}"
        return redirect(redirect_url)


# ===============================================
# FAWRY
# ===============================================

FAWRY_BASE = "https://atfawry.com/e-commerce-portal/api/v2"


def _fawry_headers():
    return {"Content-Type": "application/json"}


def _fawry_signature(merchant_code, order_id, amount, security_code):
    """Generate Fawry HMAC-SHA256 signature."""
    message = f"{merchant_code}{order_id}{amount}{security_code}"
    return hashlib.sha256(message.encode("utf-8")).hexdigest()


class FawryCheckoutView(APIView):
    """
    POST /api/payments/fawry/checkout/
    Body: { "order_id": 123 }
    Returns: { "fawry_ref_number": "...", "payment_url": "..." }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        order_id = request.data.get("order_id")
        if not order_id:
            return Response({"error": "order_id required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            order = Order.objects.get(pk=order_id, owner=request.user)
        except Order.DoesNotExist:
            return Response({"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND)

        merchant_code = getattr(settings, "FAWRY_MERCHANT_CODE", "")
        security_code = getattr(settings, "FAWRY_SECURITY_CODE", "")
        return_url = getattr(settings, "FAWRY_RETURN_URL", "")

        if not merchant_code or not security_code:
            return Response(
                {"error": "Fawry not configured. Set FAWRY_MERCHANT_CODE and FAWRY_SECURITY_CODE."},
                status=status.HTTP_501_NOT_IMPLEMENTED,
            )

        amount = str(order.total_price)
        order_ref = f"ORD-{order.pk}-{int(order.created_at.timestamp())}"
        signature = _fawry_signature(merchant_code, order_ref, amount, security_code)

        payload = {
            "merchantCode": merchant_code,
            "merchantRefNum": order_ref,
            "amount": float(order.total_price),
            "currency": "EGP",
            "signature": signature,
            "returnUrl": return_url,
            "webServiceUrl": f"{request.scheme}://{request.get_host()}/api/payments/fawry/webhook/",
            "channelType": "All",
            "customerName": f"{request.user.first_name} {request.user.last_name}".strip(),
            "customerMobile": "",
            "customerEmail": request.user.email,
        }

        try:
            resp = requests.post(
                f"{FAWRY_BASE}/payments",
                json=payload,
                headers=_fawry_headers(),
                timeout=15,
            )
            resp.raise_for_status()
            resp_data = resp.json()

            fawry_ref = resp_data.get("referenceNumber", "")
            payment_url = resp_data.get("paymentUrl", "")

            payment = Payment.objects.create(
                owner=request.user,
                method="fawry",
                amount=order.total_price,
                provider_payment_id=fawry_ref,
                status="pending",
                raw_response=json.dumps(resp_data),
            )
            order.payment = payment
            order.save(update_fields=["payment"])

            return Response({
                "fawry_ref_number": fawry_ref,
                "payment_url": payment_url,
                "order_ref": order_ref,
            })

        except requests.exceptions.HTTPError as e:
            logger.error(f"Fawry error: {e.response.text}")
            return Response(
                {"error": "Fawry payment request failed", "details": e.response.text},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception as e:
            logger.exception("Fawry checkout error")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@csrf_exempt
@require_POST
def fawry_webhook(request):
    """
    POST /api/payments/fawry/webhook/
    Fawry sends payment status updates here.
    """
    try:
        data = json.loads(request.body)
        logger.info(f"Fawry webhook: {json.dumps(data)}")

        fawry_ref = data.get("fawryRefNumber", "")
        merchant_ref = data.get("merchantRefNumber", "")
        order_status = data.get("orderStatus", "")

        if fawry_ref or merchant_ref:
            payment = Payment.objects.filter(
                provider_payment_id__in=[fawry_ref, merchant_ref]
            ).first()

            if payment:
                if order_status == "PAID":
                    payment.status = "completed"
                    if hasattr(payment, "order") and payment.order:
                        payment.order.status = "confirmed"
                        payment.order.save(update_fields=["status"])
                elif order_status in ("CANCELED", "EXPIRED"):
                    payment.status = "failed"

                payment.raw_response = json.dumps(data)
                payment.save(update_fields=["status", "raw_response"])

        return JsonResponse({"status": "ok"})

    except Exception as e:
        logger.exception("Fawry webhook error")
        return JsonResponse({"error": str(e)}, status=400)


class FawryStatusView(APIView):
    """
    GET /api/payments/fawry/status/?ref=12345
    Check Fawry payment status.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        ref = request.query_params.get("ref", "")
        if not ref:
            return Response({"error": "ref parameter required"}, status=status.HTTP_400_BAD_REQUEST)

        merchant_code = getattr(settings, "FAWRY_MERCHANT_CODE", "")
        security_code = getattr(settings, "FAWRY_SECURITY_CODE", "")

        signature = hashlib.sha256(
            f"{merchant_code}{ref}{security_code}".encode()
        ).hexdigest()

        try:
            resp = requests.get(
                f"{FAWRY_BASE}/payments/ord/{merchant_code}/{ref}",
                headers=_fawry_headers(),
                timeout=15,
            )
            resp.raise_for_status()
            return Response(resp.json())

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_502_BAD_GATEWAY)
