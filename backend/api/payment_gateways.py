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

PAYMOB_BASE = getattr(settings, "PAYMOB_BASE_URL", "https://accept.paymob.com/api")


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
    if resp.status_code >= 400:
        logger.error(f"Paymob register order {resp.status_code}: {resp.text}")
        resp.raise_for_status()
    return resp.json()["id"]


def _get_paymob_payment_key(auth_token, order_id, billing_data, amount_cents=0, payment_method="card"):
    """Get a payment key for the order."""
    if payment_method == "paymob_wallet":
        integration_id = getattr(settings, "PAYMOB_WALLET_INTEGRATION_ID", "")
        if not integration_id:
            raise ValueError("PAYMOB_WALLET_INTEGRATION_ID not configured. Wallet payments unavailable.")
    else:
        integration_id = getattr(settings, "PAYMOB_INTEGRATION_ID", "")
    if not integration_id:
        raise ValueError("PAYMOB_INTEGRATION_ID not configured")
    redirect_url = ""
    backend_url = getattr(settings, "BACKEND_URL", "")
    if backend_url:
        redirect_url = f"{backend_url}/api/payments/paymob/callback/"
    resp = requests.post(
        f"{PAYMOB_BASE}/acceptance/payment_keys",
        json={
            "auth_token": auth_token,
            "amount_cents": amount_cents,
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
    if resp.status_code >= 400:
        error_body = resp.text
        logger.error(f"Paymob payment_keys {resp.status_code}: {error_body}")
        try:
            raise ValueError(f"Paymob {resp.status_code}: {resp.json()}")
        except ValueError:
            raise ValueError(f"Paymob {resp.status_code}: {error_body[:500]}")
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
        payment_method = request.data.get("payment_method", "card")

        if not order_id:
            return Response({"error": "order_id required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            order = Order.objects.get(pk=order_id, owner=request.user)
        except Order.DoesNotExist:
            return Response({"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND)

        billing = {
            "apartment": billing_data.get("apartment") or "NA",
            "email": billing_data.get("email") or request.user.email or "customer@example.com",
            "floor": billing_data.get("floor") or "NA",
            "first_name": request.user.first_name or "Customer",
            "last_name": request.user.last_name or "NA",
            "phone_number": billing_data.get("phone_number") or request.user.username or "01000000000",
            "street": billing_data.get("street") or "NA",
            "building": billing_data.get("building") or "NA",
            "shipping_method": "PKG",
            "postal_code": billing_data.get("postal_code") or "00000",
            "city": billing_data.get("city") or "Cairo",
            "country": billing_data.get("country") or "EG",
            "state": billing_data.get("state") or "Cairo",
        }

        try:
            auth_token = _get_paymob_auth_token()
            paymob_order_id = _register_paymob_order(auth_token, order)
            amount_cents = int(order.total_price * 100)
            logger.info(f"Paymob init: order={order_id}, total={order.total_price}, amount_cents={amount_cents}, integration={getattr(settings, 'PAYMOB_INTEGRATION_ID', '')}, base={PAYMOB_BASE}")
            if amount_cents <= 0:
                return Response({"error": f"Order total is {order.total_price}, cannot pay"}, status=status.HTTP_400_BAD_REQUEST)
            payment_token = _get_paymob_payment_key(auth_token, paymob_order_id, billing, amount_cents=amount_cents, payment_method=payment_method)

            # Store payment record
            payment = Payment.objects.create(
                owner=request.user,
                method=payment_method,
                amount=order.total_price,
                provider_payment_id=str(paymob_order_id),
                status="pending",
                raw_response=json.dumps({"payment_token": payment_token}),
            )
            order.payment = payment
            order.save(update_fields=["payment"])

            if payment_method == "paymob_wallet":
                iframe_id = getattr(settings, "PAYMOB_WALLET_IFRAME_ID", getattr(settings, "PAYMOB_IFRAME_ID", "947643"))
            else:
                iframe_id = getattr(settings, "PAYMOB_IFRAME_ID", "947643")

            return Response({
                "payment_token": payment_token,
                "paymob_order_id": paymob_order_id,
                "payment_method": payment_method,
                "iframe_url": f"https://accept.paymob.com/api/acceptance/iframes/{iframe_id}?payment_token={payment_token}",
            })

        except Exception as e:
            logger.exception("Paymob init error")
            detail = str(e)
            if hasattr(e, "response") and e.response is not None:
                try:
                    detail = e.response.json()
                except Exception:
                    detail = e.response.text[:500]
            return Response({"error": "Paymob init failed", "details": str(detail)}, status=status.HTTP_400_BAD_REQUEST)


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
            logger.info(f"Paymob /payments/pay response (status={resp.status_code}): {json.dumps(resp_data)}")

            if resp.status_code == 200 and resp_data.get("success"):
                paymob_order_id = str(resp_data.get("order", {}).get("id", ""))
                transaction_id = str(resp_data.get("id", ""))

                payment = None
                if paymob_order_id:
                    payment = Payment.objects.filter(provider_payment_id=paymob_order_id).first()
                if not payment:
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

            redirect_url = resp_data.get("redirect_url")
            if redirect_url:
                return Response({
                    "success": False,
                    "requires_3ds": True,
                    "redirect_url": redirect_url,
                })

            error_msg = resp_data.get("message", resp_data.get("detail", "Payment failed"))
            error_code = resp_data.get("code", "")

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
                "paymob_response": resp_data,
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


class PaymobWalletPayView(APIView):
    """
    POST /api/payments/paymob/wallet/
    Initiates a mobile wallet payment (Vodafone Cash, Orange Cash, etc.)
    Body: { "order_id": 123, "wallet_number": "010XXXXXXXX" }
    Returns: { "redirect_url": "https://..." } — user goes there to enter OTP
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        order_id = request.data.get("order_id")
        wallet_number = request.data.get("wallet_number", "").strip()

        if not order_id:
            return Response({"error": "order_id required"}, status=status.HTTP_400_BAD_REQUEST)
        if not wallet_number:
            return Response({"error": "wallet_number required (e.g. 01012345678)"}, status=status.HTTP_400_BAD_REQUEST)

        wallet_integration_id = getattr(settings, "PAYMOB_WALLET_INTEGRATION_ID", "")
        if not wallet_integration_id:
            return Response(
                {"error": "Mobile wallet payments are not configured yet."},
                status=status.HTTP_501_NOT_IMPLEMENTED,
            )

        try:
            order = Order.objects.get(pk=order_id, owner=request.user)
        except Order.DoesNotExist:
            return Response({"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND)

        billing = {
            "apartment": "NA",
            "email": request.user.email or "customer@example.com",
            "floor": "NA",
            "first_name": request.user.first_name or "Customer",
            "last_name": request.user.last_name or "NA",
            "phone_number": wallet_number,
            "street": "NA",
            "building": "NA",
            "shipping_method": "PKG",
            "postal_code": "00000",
            "city": "Cairo",
            "country": "EG",
            "state": "Cairo",
        }

        try:
            auth_token = _get_paymob_auth_token()
            paymob_order_id = _register_paymob_order(auth_token, order)
            amount_cents = int(order.total_price * 100)

            if amount_cents <= 0:
                return Response({"error": f"Order total is {order.total_price}, cannot pay"}, status=status.HTTP_400_BAD_REQUEST)

            resp = requests.post(
                f"{PAYMOB_BASE}/acceptance/payment_keys",
                json={
                    "auth_token": auth_token,
                    "amount_cents": amount_cents,
                    "expiration": 3600,
                    "order_id": paymob_order_id,
                    "billing_data": billing,
                    "currency": "EGP",
                    "integration_id": int(wallet_integration_id),
                },
                headers=_paymob_headers(),
                timeout=15,
            )
            if resp.status_code >= 400:
                logger.error(f"Paymob wallet payment_keys {resp.status_code}: {resp.text}")
                return Response({"error": "Failed to initialize wallet payment", "details": resp.text[:500]},
                                status=status.HTTP_402_PAYMENT_REQUIRED)
            payment_token = resp.json()["token"]

            wallet_resp = requests.post(
                f"{PAYMOB_BASE}/acceptance/payments/pay",
                json={
                    "source": {"identifier": wallet_number},
                    "payment_token": payment_token,
                },
                headers=_paymob_headers(),
                timeout=30,
            )
            wallet_data = wallet_resp.json()
            logger.info(f"Paymob wallet /payments/pay response (status={wallet_resp.status_code}): {json.dumps(wallet_data)}")

            redirect_url = wallet_data.get("redirect_url")

            if redirect_url:
                Payment.objects.create(
                    owner=request.user,
                    method="paymob_wallet",
                    amount=order.total_price,
                    provider_payment_id=str(paymob_order_id),
                    status="pending",
                    raw_response=json.dumps(wallet_data),
                )
                return Response({
                    "success": True,
                    "redirect_url": redirect_url,
                    "paymob_order_id": paymob_order_id,
                })

            error_msg = wallet_data.get("message", wallet_data.get("detail", "Wallet payment failed"))
            return Response({"error": error_msg, "paymob_response": wallet_data},
                            status=status.HTTP_402_PAYMENT_REQUIRED)

        except requests.exceptions.RequestException as e:
            logger.exception("Paymob wallet request failed")
            return Response({"error": "Payment gateway unreachable", "details": str(e)},
                            status=status.HTTP_502_BAD_GATEWAY)
        except Exception as e:
            logger.exception("Paymob wallet error")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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

        order_field = data.get("order")
        if isinstance(order_field, dict):
            paymob_order_id = str(order_field.get("id", ""))
        else:
            paymob_order_id = str(order_field) if order_field else ""
        success = data.get("success", False)

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
    User browser is redirected here after payment. Must break out of iframe
    using JavaScript to navigate the top-level window.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        success = request.query_params.get("success", "false")
        paymob_order_id = request.query_params.get("order", "")
        frontend_url = getattr(settings, "FRONTEND_URL", "https://dream-project-roan.vercel.app")

        our_order_id = ""
        if paymob_order_id:
            payment = Payment.objects.filter(provider_payment_id=str(paymob_order_id)).first()
            if payment and hasattr(payment, "order") and payment.order:
                our_order_id = str(payment.order.pk)

        redirect_url = f"{frontend_url}/payment/result?success={success}&order={our_order_id}"

        html = f"""<!DOCTYPE html>
<html><head><title>Redirecting...</title></head>
<body>
<script>
try {{
    window.top.location.href = "{redirect_url}";
}} catch(e) {{
    window.location.href = "{redirect_url}";
}}
</script>
<noscript>
<meta http-equiv="refresh" content="0;url={redirect_url}">
</noscript>
</body></html>"""
        from django.http import HttpResponse
        return HttpResponse(html)


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
