import logging
from decimal import Decimal
from datetime import timedelta
import stripe
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.views.decorators.csrf import csrf_exempt
from rest_framework import generics, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from .cache_utils import cache_api_response
from .models import *
from .serializer import *

logger = logging.getLogger(__name__)
User = get_user_model()
stripe.api_key = settings.STRIPE_SECRET_KEY


# ===============================================
# NOTIFICATION HELPER
# ===============================================

def create_notification(user, notification_type, title, message, link=""):
    """Create a notification for a user."""
    try:
        Notification.objects.create(
            user=user,
            notification_type=notification_type,
            title=title,
            message=message,
            link=link,
        )
    except Exception as e:
        logger.error(f"Failed to create notification: {e}")

class IsSuperUser(IsAdminUser):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_superuser)


from rest_framework.permissions import BasePermission
 
 
class IsApprovedSeller(BasePermission):
    """
    Restricts access to users who have a SellerProfile that's approved
    and active. Use on every seller-dashboard endpoint from Phase 2 onward.
    """
 
    message = "You must be an approved seller to access this."
 
    def has_permission(self, request, view):
        profile = getattr(request.user, "seller_profile", None)
        return bool(
            request.user
            and request.user.is_authenticated
            and profile is not None
            and profile.is_approved
            and profile.is_active
        )
 
class IsProductOwner(BasePermission):
    """Object-level check: seller can only touch their own products."""
 
    def has_object_permission(self, request, view, obj):
        return obj.seller and obj.seller.user_id == request.user.id
 


class SellerRegisterView(generics.CreateAPIView):
    """POST /api/sellers/register/ — public. Creates User + SellerProfile (pending)."""
 
    serializer_class = SellerRegistrationSerializer
    permission_classes = [AllowAny]
 
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        seller_profile = serializer.save()
 
        refresh = RefreshToken.for_user(seller_profile.user)
        return Response(
            {
                "seller": SellerProfileSerializer(seller_profile).data,
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            },
            status=status.HTTP_201_CREATED,
        )

class SellerUpgradeView(generics.CreateAPIView):
    """POST /api/sellers/upgrade/ — Upgrades an existing authenticated user to a seller."""
    serializer_class = SellerUpgradeSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        if hasattr(request.user, 'seller_profile'):
            return Response({"error": "User is already a seller."}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        seller_profile = serializer.save(user=request.user)

        return Response(
            SellerProfileSerializer(seller_profile).data,
            status=status.HTTP_201_CREATED,
        )
 
 
class SellerMeView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/sellers/me/ — a seller's own profile, any status."""
 
    serializer_class = SellerProfileSerializer
    permission_classes = [IsAuthenticated]
 
    def get_object(self):
        profile = getattr(self.request.user, "seller_profile", None)
        if profile is None:
            from rest_framework.exceptions import NotFound
            raise NotFound("This account has no seller profile.")
        return profile
 





class CacheInvalidateMixin:
    def perform_create(self, serializer):
        super().perform_create(serializer)
        if getattr(settings, "ENABLE_CACHING", True):
            cache.clear()

    def perform_update(self, serializer):
        super().perform_update(serializer)
        if getattr(settings, "ENABLE_CACHING", True):
            cache.clear()

    def perform_destroy(self, instance):
        super().perform_destroy(instance)
        if getattr(settings, "ENABLE_CACHING", True):
            cache.clear()


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 9
    page_size_query_param = "page_size"
    max_page_size = 1000


# ++++++++++ ADDED ADMIN VIEWSETS ++++++++++
class ProductAdminViewSet(CacheInvalidateMixin, viewsets.ModelViewSet):
    queryset = Product.objects.all().select_related("seller__user").prefetch_related("tags", "gallery_images")
    serializer_class = ProductSerializer
    permission_classes = [IsAdminUser]
    pagination_class = StandardResultsSetPagination  # ✅ Add this line


class CategoryAdminViewSet(CacheInvalidateMixin, viewsets.ModelViewSet):
    queryset = Category.objects.all()
    pagination_class = StandardResultsSetPagination  # ✅ Add this line
    serializer_class = CategorySerializer
    permission_classes = [IsAdminUser]


class ServiceAdminViewSet(CacheInvalidateMixin, viewsets.ModelViewSet):
    queryset = Service.objects.all()
    pagination_class = StandardResultsSetPagination  # ✅ Add this line
    serializer_class = ServiceSerializer
    permission_classes = [IsAdminUser]


class ContactAdminViewSet(CacheInvalidateMixin, viewsets.ModelViewSet):
    queryset = Contact.objects.all()
    pagination_class = StandardResultsSetPagination  # ✅ Add this line
    serializer_class = ContactSerializer
    permission_classes = [IsAdminUser]


class TagsAdminViewSet(CacheInvalidateMixin, viewsets.ModelViewSet):
    queryset = Tag.objects.all()
    pagination_class = StandardResultsSetPagination  # ✅ Add this line
    serializer_class = TagsSerializer
    permission_classes = [IsAdminUser]


class CarouselAdminViewSet(CacheInvalidateMixin, viewsets.ModelViewSet):
    queryset = CarouselImg.objects.all()
    pagination_class = StandardResultsSetPagination  # ✅ Add this line
    serializer_class = CarouselImgSerializer
    permission_classes = [IsSuperUser]


class ProductGalleryImageDeleteView(APIView):
    """DELETE /api/admins/products/<pk>/gallery/<img_id>/ — remove a single gallery image."""

    permission_classes = [IsAdminUser]

    def delete(self, request, pk, img_id):
        product = get_object_or_404(Product, pk=pk)
        gallery_image = get_object_or_404(ProductImage, pk=img_id, product=product)
        gallery_image.delete()
        if getattr(settings, "ENABLE_CACHING", True):
            cache.clear()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        logger.info(f"Token request from IP: {request.META.get('REMOTE_ADDR')}")

        if isinstance(request.data, list):
            return Response(
                {
                    "error": "Expected JSON object, got array",
                    "hint": 'Send credentials as {"username":"...","password":"..."}',
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if isinstance(request.data, dict):
            safe_data = {
                k: "***" if "password" in k.lower() else v
                for k, v in request.data.items()
            }

        required = {"username", "password"}
        missing = required - set(request.data.keys())
        if missing:
            return Response(
                {
                    "error": f'Missing fields: {", ".join(missing)}',
                    "required_fields": list(required),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            response = super().post(request, *args, **kwargs)
            logger.info(f"Successful auth for {request.data.get('username')}")
            return response
        except AuthenticationFailed:
            logger.warning(f"Failed auth attempt for {request.data.get('username')}")
            return Response(
                {"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED
            )
        except Exception as e:
            logger.error(f"Auth error: {str(e)}", exc_info=True)
            return Response(
                {"error": "Authentication failed"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]


@api_view(["GET"])
@permission_classes([IsAdminUser])
def get_all_users(request):
    try:
        users = (
            User.objects.all()
            .order_by("-date_joined")
            .only("id", "username", "email", "is_active", "is_staff", "date_joined")
        )

        if is_active := request.query_params.get("is_active"):
            users = users.filter(is_active=is_active.lower() == "true")

        if search := request.query_params.get("search"):
            from django.db.models import Q

            users = users.filter(
                Q(username__icontains=search) | Q(email__icontains=search)
            )

        # +++ ADD PAGINATION LOGIC +++
        paginator = StandardResultsSetPagination()
        paginated_users = paginator.paginate_queryset(users, request)

        serializer = UserSerializer(
            paginated_users,  # Use the paginated queryset
            many=True,
            context={"is_admin": request.user.is_superuser},
        )

        # Return the paginated response
        return paginator.get_paginated_response(serializer.data)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserDetailView(APIView):
    def get_permissions(self):
        if self.request.method in ["PATCH", "DELETE"]:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def get(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        if user != request.user and not request.user.is_staff:
            return Response(
                {"detail": "You can only view your own profile"},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer_class = (
            AdminUserSerializer if request.user.is_staff else UserSerializer
        )
        return Response(serializer_class(user).data)

    def patch(self, request, pk):
        print(f"Received PATCH request for user {pk}")
        print(f"Request data: {request.data}")
        print(f"Request user: {request.user} (superuser: {request.user.is_superuser})")

        if not request.user.is_superuser:
            return Response(
                {"detail": "You do not have permission to modify user roles."},
                status=status.HTTP_403_FORBIDDEN,
            )

        user_to_modify = get_object_or_404(User, pk=pk)

        # Prevent modifying other superusers
        if user_to_modify.is_superuser:
            return Response(
                {"detail": "Cannot modify superuser roles."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Prevent self-modification
        if user_to_modify == request.user:
            return Response(
                {"detail": "You cannot modify your own role."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = AdminUserSerializer(
            instance=user_to_modify, data=request.data, partial=True
        )

        if serializer.is_valid():
            print("Serializer valid - saving changes")
            serializer.save()
            return Response(
                AdminUserSerializer(user_to_modify).data, status=status.HTTP_200_OK
            )

        print(f"Serializer errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        user = get_object_or_404(User, pk=pk)

        if user == request.user:
            return Response(
                {"detail": "You cannot delete your own account"},
                status=status.HTTP_403_FORBIDDEN,
            )

        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CurrentUserView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method == "PATCH":
            return UserProfileUpdateSerializer
        return UserSerializer


# Public Content Views
def create_public_list_view(
    model, serializer_class, order_by=None, filter_active=False
):
    @api_view(["GET"])
    @permission_classes([AllowAny])
    def view_func(request):
        try:
            queryset = model.objects.all()

            # Optimize queries
            if model == Product:
                queryset = queryset.select_related("seller__user").prefetch_related("tags", "gallery_images")

            if filter_active:
                queryset = queryset.filter(is_active=True)
                if model == Product:
                    queryset = queryset.filter(
                        approval_status=Product.ApprovalStatus.APPROVED
                    ).exclude(seller__is_active=False)
            if order_by:
                queryset = queryset.order_by(order_by)

            # Pagination
            paginator = StandardResultsSetPagination()
            paginated_queryset = paginator.paginate_queryset(queryset, request)

            # Serialize paginated data
            serializer = serializer_class(
                paginated_queryset,
                many=True,
                context={"is_admin": request.user.is_staff},
            )

            response = paginator.get_paginated_response(serializer.data)

            # Add HTTP cache headers for browser caching
            if not request.user.is_authenticated:
                response["Cache-Control"] = "public, max-age=600"  # 10 minutes

            return response

        except Exception as e:
            logger.error(f"Error fetching {model.__name__}: {str(e)}")
            return Response(
                {"error": f"Failed to retrieve {model.__name__.lower()}s"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    return view_func


class PasswordChangeView(generics.GenericAPIView):
    serializer_class = PasswordChangeSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request):
        pagination_class = StandardResultsSetPagination  # ✅ Add this line
        serializer = self.get_serializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        user = request.user
        user.set_password(serializer.validated_data["new_password"])
        user.save()

        from django.contrib.auth import update_session_auth_hash

        update_session_auth_hash(request, user)

        return Response(
            {"detail": "Password updated successfully."}, status=status.HTTP_200_OK
        )


# Instantiate public views
get_carouselImg = create_public_list_view(
    CarouselImg, CarouselImgSerializer, filter_active=True
)
get_product = create_public_list_view(
    Product, ProductSerializer, filter_active=True  # Keep filtering for active products
)
get_category = create_public_list_view(Category, CategorySerializer, filter_active=True)
get_services = create_public_list_view(Service, ServiceSerializer, order_by="price")
get_contact = create_public_list_view(Contact, ContactSerializer, filter_active=True)

get_tags = create_public_list_view(Tag, TagsSerializer)


class PaymentListView(ListAPIView):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer


class CreatePaymentIntentView(APIView):
    """
    Create payment intent AFTER creating the order.
    Flow: Create Order → Create Payment Intent → Return to frontend
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # Extract data from request
            amount = request.data.get("amount")  # in cents
            currency = request.data.get("currency", "egp").lower()
            order_items = request.data.get("order_items", [])
            shipping_address = request.data.get("shipping_address", "")
            note = request.data.get("note", "")

            # Validate amount
            if not amount or amount <= 0:
                return Response(
                    {"error": "Invalid amount"}, status=status.HTTP_400_BAD_REQUEST
                )

            if not order_items or len(order_items) == 0:
                return Response(
                    {"error": "Order must contain at least one item"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # ===== STEP 1: CREATE ORDER FIRST =====
            order = Order.objects.create(
                owner=request.user,
                status="pending",  # Order starts as pending
                shipping_address=shipping_address,
                note=note,
            )

            # ===== STEP 2: CREATE ORDER ITEMS =====
            total_price = 0
            for item_data in order_items:
                try:
                    product = Product.objects.get(id=item_data.get("id"))
                    quantity = item_data.get("quantity", 1)
                    price = float(item_data.get("price", product.price))

                    OrderItem.objects.create(
                        order=order,
                        product=product,
                        quantity=quantity,
                        unit_price=product.price,
                    )
                    total_price += price * quantity
                except Product.DoesNotExist:
                    order.delete()  # Rollback if product not found
                    return Response(
                        {"error": f'Product {item_data.get("id")} not found'},
                        status=status.HTTP_404_NOT_FOUND,
                    )

            # ===== STEP 3: CREATE PAYMENT INTENT =====
            try:
                # Convert amount to proper format (Stripe expects smallest currency unit)
                amount_in_cents = int(amount)

                payment_intent = stripe.PaymentIntent.create(
                    amount=amount_in_cents,
                    currency=currency,
                    transfer_group=str(order.id),
                    metadata={
                        "order_id": order.id,
                        "user_id": request.user.id,
                        "user_email": request.user.email,
                    },
                )

                # ===== STEP 4: CREATE PAYMENT RECORD =====
                payment = Payment.objects.create(
                    stripe_payment_id=payment_intent.id,
                    amount=amount_in_cents / 100,  # Convert back to EGP
                    currency=currency,
                    status="pending",  # Payment starts as pending
                )

                return Response(
                    {
                        "clientSecret": payment_intent.client_secret,
                        "orderId": order.id,
                        "paymentId": payment.id,
                        "amount": amount_in_cents / 100,
                        "currency": currency,
                    },
                    status=status.HTTP_201_CREATED,
                )

            except stripe.error.CardError as e:
                order.delete()  # Rollback order if payment intent fails
                return Response(
                    {"error": f"Card error: {e.user_message}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            except stripe.error.RateLimitError:
                order.delete()
                return Response(
                    {"error": "Too many requests to Stripe"},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )
            except stripe.error.InvalidRequestError as e:
                order.delete()
                return Response(
                    {"error": f"Invalid request: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            except stripe.error.AuthenticationError:
                order.delete()
                return Response(
                    {"error": "Stripe authentication failed"},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
            except stripe.error.APIConnectionError:
                order.delete()
                return Response(
                    {"error": "Failed to connect to Stripe"},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            except stripe.error.StripeError as e:
                order.delete()
                return Response(
                    {"error": f"Stripe error: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        except Exception as e:
            return Response(
                {"error": f"Unexpected error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@method_decorator(cache_api_response(timeout=600), name="dispatch")
class ProductSearchView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        queryset = (
            Product.objects.filter(
                is_active=True,
                approval_status=Product.ApprovalStatus.APPROVED,
            )
            .exclude(seller__is_active=False)
            .prefetch_related("tags", "gallery_images")
            .select_related("category")
        )

        # Text search — name & description
        search = request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(description__icontains=search)
            )

        # Category filter
        category = request.query_params.get("category", "")
        if category and category != "all":
            if category == "uncategorized":
                queryset = queryset.filter(category__isnull=True)
            else:
                if category.isdigit():
                    sort = request.query_params.get("sort", "-created_at")
                    allowed_sorts = ["price", "-price", "-created_at", "name"]
                    if sort in allowed_sorts:
                        queryset = queryset.order_by(sort)
                    queryset = queryset.filter(category__id=int(category))

        # Tags filter (comma-separated IDs: ?tags=1,2,3)
        tags = request.query_params.get("tags", "")
        if tags:
            tag_ids = [t for t in tags.split(",") if t.isdigit()]
            if tag_ids:
                queryset = queryset.filter(tags__id__in=tag_ids).distinct()

        # Price filter
        min_price = request.query_params.get("minPrice", "")
        max_price = request.query_params.get("maxPrice", "")
        if min_price:
            try:
                queryset = queryset.filter(price__gte=Decimal(min_price))
            except:
                pass
        if max_price:
            try:
                queryset = queryset.filter(price__lte=Decimal(max_price))
            except:
                pass
        # Sorting
        sort = request.query_params.get("sort", "-created_at")
        allowed_sorts = ["price", "-price", "-created_at", "name"]
        if sort in allowed_sorts:
            queryset = queryset.order_by(sort)
        # Pagination
        paginator = StandardResultsSetPagination()
        paginated = paginator.paginate_queryset(queryset, request)
        serializer = ProductSerializer(
            paginated, many=True, context={"is_admin": request.user.is_staff}
        )
        return paginator.get_paginated_response(serializer.data)


get_product = ProductSearchView.as_view()


class CreateOrderView(APIView):
    """
    Creates an Order + OrderItems.
    - Stripe card: receives payment_intent_id to link existing Payment.
    - Paymob / Fawry: creates order directly, payment handled separately.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        payment_intent_id = request.data.get("payment_intent_id")
        payment_method = request.data.get("payment_method", "card")
        order_items = request.data.get(
            "order_items", []
        )  # [{id, name, price, quantity}]
        shipping_address = request.data.get("shipping_address", "")
        note = request.data.get("note", "")
        coupon_code = request.data.get("coupon_code")
        discount_amount = request.data.get("discount_amount", 0)
        delivery_fee = Decimal(str(request.data.get("delivery_fee", 0)))

        # Stripe card flow: require payment_intent_id
        if payment_method == "card" and not payment_intent_id:
            return Response({"error": "payment_intent_id required for card"}, status=400)

        # Look up payment if Stripe
        payment = None
        if payment_intent_id:
            try:
                payment = Payment.objects.get(
                    stripe_payment_id=payment_intent_id, owner=request.user
                )
            except Payment.DoesNotExist:
                return Response({"error": "Payment not found"}, status=404)

            if hasattr(payment, "order"):
                return Response(
                    OrderSerializer(payment.order).data, status=status.HTTP_200_OK
                )

            try:
                intent = stripe.PaymentIntent.retrieve(payment_intent_id)
                if intent["status"] != "succeeded":
                    return Response(
                        {"error": f"Payment not completed. Status: {intent['status']}"},
                        status=400,
                    )
            except stripe.error.StripeError as e:
                logger.error(f"Stripe retrieve error: {str(e)}")
                return Response(
                    {"error": "Could not verify payment with Stripe"}, status=400
                )

        # Create the order
        # For Stripe: confirmed (payment already verified). For Paymob/Fawry: pending (webhook confirms).
        order_status = "confirmed" if (payment_intent_id and payment and payment.status == "completed") else "pending"
        order = Order.objects.create(
            owner=request.user,
            status=order_status,
            shipping_address=shipping_address,
            note=note,
            discount_amount=Decimal(str(discount_amount or 0)),
            delivery_fee=delivery_fee,
        )

        # Apply coupon if provided
        if coupon_code and discount_amount:
            try:
                coupon = Coupon.objects.get(code__iexact=coupon_code)
                OrderCoupon.objects.create(
                    order=order,
                    coupon=coupon,
                    discount_amount=Decimal(str(discount_amount)),
                )
                coupon.times_used += 1
                coupon.save(update_fields=["times_used"])
            except Coupon.DoesNotExist:
                pass

        # Create order items
        for item_data in order_items:
            try:
                product = Product.objects.get(pk=item_data["id"])
                OrderItem.objects.create(
                    order=order,
                    product=product,
                    quantity=int(item_data.get("quantity", 1)),
                    unit_price=product.price,
                )
            except Product.DoesNotExist:
                logger.warning(
                    f"Product {item_data.get('id')} not found during order creation"
                )
                continue

        # Calculate commission
        total_commission = Decimal("0")
        for item in order.items.select_related("product__seller").all():
            if item.product and item.product.seller:
                total_commission += item.platform_fee
        order.total_commission = total_commission
        order.subtotal_before_discount = sum(i.subtotal for i in order.items.all())
        order.save(update_fields=["total_commission", "subtotal_before_discount"])

        # Link payment if Stripe
        if payment:
            payment.status = Payment.Status.SUCCESS
            payment.save(update_fields=["status"])
            order.payment = payment
            order.save(update_fields=["payment"])

        # Create notification for buyer
        if order_status == "confirmed":
            create_notification(
                request.user,
                "order_confirmed",
                "Order Confirmed",
                f"Your order #{order.pk} has been confirmed and is being processed.",
                f"/orders/{order.pk}",
            )
            from .email_utils import send_order_confirmation_email
            send_order_confirmation_email(order)

        # Notify sellers
        for item in order.items.select_related("product__seller__user").all():
            if item.product and item.product.seller:
                seller_user = item.product.seller.user
                create_notification(
                    seller_user,
                    "payment_received",
                    "New Order Received",
                    f"You have a new order #{order.pk} for {item.product.name}.",
                    f"/seller/dashboard",
                )

        serializer = OrderSerializer(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class MyOrdersView(ListAPIView):
    """Returns the authenticated user's own orders, newest first."""

    permission_classes = [IsAuthenticated]
    serializer_class = OrderSerializer
    pagination_class = None  # Disable pagination

    def get_queryset(self):
        return (
            Order.objects.filter(owner=self.request.user)
            .select_related("payment")
            .prefetch_related("items__product")
            .order_by("-created_at")
        )


class MyOrderDetailView(APIView):
    """Returns a single order belonging to the authenticated user."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        order = get_object_or_404(
            Order.objects.select_related("payment").prefetch_related("items__product"),
            pk=pk,
            owner=request.user,
        )
        return Response(OrderSerializer(order).data)


class OrderAdminViewSet(viewsets.ModelViewSet):
    """Full CRUD for admins. Status updates go through partial_update (PATCH)."""

    queryset = (
        Order.objects.select_related("owner", "payment")
        .prefetch_related("items__product")
        .order_by("-created_at")
    )
    permission_classes = [IsAdminUser]
    pagination_class = StandardResultsSetPagination

    def get_serializer_class(self):
        if self.action in ("partial_update", "update"):
            return OrderStatusUpdateSerializer
        return AdminOrderSerializer

    def partial_update(self, request, *args, **kwargs):
        order = self.get_object()
        old_status = order.status
        serializer = OrderStatusUpdateSerializer(order, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            new_status = order.status

            # Create notification for status change
            if old_status != new_status and order.owner:
                status_messages = {
                    "confirmed": ("Order Confirmed", f"Your order #{order.pk} has been confirmed."),
                    "shipped": ("Order Shipped", f"Your order #{order.pk} has been shipped."),
                    "delivered": ("Order Delivered", f"Your order #{order.pk} has been delivered."),
                    "cancelled": ("Order Cancelled", f"Your order #{order.pk} has been cancelled."),
                }
                if new_status in status_messages:
                    title, message = status_messages[new_status]
                    create_notification(
                        order.owner,
                        f"order_{new_status}",
                        title,
                        message,
                        f"/orders/{order.pk}",
                    )
                    from .email_utils import send_order_status_email
                    send_order_status_email(order, old_status, new_status)

            return Response(OrderSerializer(order).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name="dispatch")
class StripeWebhookView(APIView):
    """
    Handle Stripe webhook events to update order and payment status.

    Events handled:
    - payment_intent.succeeded: Mark payment as successful, update order status
    - payment_intent.payment_failed: Mark payment as failed
    - payment_intent.canceled: Mark payment as cancelled
    """

    permission_classes = [AllowAny]

    def post(self, request):
        payload = request.body
        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE")

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            return Response(
                {"error": "Invalid payload"}, status=status.HTTP_400_BAD_REQUEST
            )
        except stripe.error.SignatureVerificationError:
            return Response(
                {"error": "Invalid signature"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Handle the event
        if event["type"] == "payment_intent.succeeded":
            self.handle_payment_succeeded(event["data"]["object"])

        elif event["type"] == "payment_intent.payment_failed":
            self.handle_payment_failed(event["data"]["object"])

        elif event["type"] == "payment_intent.canceled":
            self.handle_payment_cancelled(event["data"]["object"])

        return Response({"status": "success"}, status=status.HTTP_200_OK)

    def handle_payment_succeeded(self, payment_intent):
        """
        Update payment and order status when payment succeeds,
        and issue Stripe Transfers to sellers.
        """
        try:
            order_id = payment_intent["metadata"].get("order_id")
            payment_intent_id = payment_intent["id"]

            # Update Payment record
            payment = Payment.objects.get(stripe_payment_id=payment_intent_id)
            payment.status = "success"
            payment.save()

            # Update Order status from pending to confirmed
            order = Order.objects.get(id=order_id)
            if order.status == "pending":
                order.status = "confirmed"
                order.save()
                
            # Issue Transfers to Sellers
            # Group payouts by seller account
            seller_payouts = {}
            for item in order.items.all():
                if item.product and item.product.seller and item.product.seller.stripe_account_id:
                    stripe_account = item.product.seller.stripe_account_id
                    seller_payouts[stripe_account] = seller_payouts.get(stripe_account, Decimal('0.00')) + item.seller_payout
            
            for stripe_account, amount in seller_payouts.items():
                if amount > 0:
                    try:
                        amount_in_cents = int(amount * 100)
                        stripe.Transfer.create(
                            amount=amount_in_cents,
                            currency=payment.currency,
                            destination=stripe_account,
                            transfer_group=str(order.id),
                        )
                        print(f"Issued transfer of {amount} to {stripe_account} for Order #{order.id}")
                    except Exception as e:
                        print(f"Failed to issue transfer to {stripe_account}: {str(e)}")

            print(f"✓ Payment succeeded for Order #{order_id}")

        except Payment.DoesNotExist:
            print(f"✗ Payment not found: {payment_intent_id}")
        except Order.DoesNotExist:
            print(f"✗ Order not found: {order_id}")
        except Exception as e:
            print(f"✗ Error handling payment success: {str(e)}")

    def handle_payment_failed(self, payment_intent):
        """
        Update payment status when payment fails.
        """
        try:
            payment_intent_id = payment_intent["id"]

            # Update Payment record
            payment = Payment.objects.get(stripe_payment_id=payment_intent_id)
            payment.status = "failed"
            payment.save()

            # Update Order status to cancelled if payment fails
            order = payment.order
            if order.status == "pending":
                order.status = "cancelled"
                order.save()

            print(f"✗ Payment failed for Order #{order.id}")

        except Payment.DoesNotExist:
            print(f"✗ Payment not found: {payment_intent_id}")
        except Exception as e:
            print(f"✗ Error handling payment failure: {str(e)}")

    def handle_payment_cancelled(self, payment_intent):
        """
        Update payment status when payment is cancelled.
        """
        try:
            payment_intent_id = payment_intent["id"]

            # Update Payment record
            payment = Payment.objects.get(stripe_payment_id=payment_intent_id)
            payment.status = "cancelled"
            payment.save()

            # Update Order status to cancelled
            order = payment.order
            if order.status == "pending":
                order.status = "cancelled"
                order.save()

            print(f"⊘ Payment cancelled for Order #{order.id}")

        except Payment.DoesNotExist:
            print(f"✗ Payment not found: {payment_intent_id}")
        except Exception as e:
            print(f"✗ Error handling payment cancellation: {str(e)}")


# +++++++++++ ANALYTICS VIEWS ++++++++++
from django.db.models import Count, Sum
from django.utils import timezone


class NewUsersAnalyticsView(APIView):
    """Get new users registered within a timeframe."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        days = int(request.query_params.get("days", 30))
        since_date = timezone.now() - timedelta(days=days)

        new_users = (
            User.objects.filter(date_joined__gte=since_date)
            .order_by("-date_joined")
            .values("id", "username", "email", "first_name", "last_name", "date_joined")
        )

        total_count = new_users.count()
        serializer = NewUserSerializer(new_users, many=True)

        return Response({"total": total_count, "days": days, "users": serializer.data})


from django.db.models import Count, DecimalField, ExpressionWrapper, F, Sum


class TopProductsAnalyticsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        limit = int(request.query_params.get("limit", 10))
        days = int(request.query_params.get("days", 30))
        since_date = timezone.now() - timedelta(days=days)

        top_products = (
            Product.objects.filter(order_items__order__created_at__gte=since_date)
            .annotate(
                total_sold=Count("order_items"),
                # ✅ Compute revenue from DB columns, not the Python property
                total_revenue=Sum("order_items__subtotal"),
            )
            .order_by("-total_revenue")
            .values("id", "name", "price", "total_sold", "total_revenue")[:limit]
        )

        serializer = TopProductSerializer(top_products, many=True)
        return Response({"days": days, "products": serializer.data})


class PurchasesAnalyticsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        user_id = request.query_params.get("user_id")
        product_id = request.query_params.get("product_id")
        days = int(request.query_params.get("days", 30))
        since_date = timezone.now() - timedelta(days=days)

        query = OrderItem.objects.filter(order__created_at__gte=since_date)

        if user_id:
            query = query.filter(order__owner__id=user_id)
        if product_id:
            query = query.filter(product__id=product_id)

        # Use select_related for better performance and debugging
        query = query.select_related("order__owner", "product")

        data = []
        for item in query:
            order = item.order
            owner = order.owner

            # Handle case where order has no owner (NULL)
            if owner:
                username = owner.username
                user_id_val = owner.id
            else:
                username = "Guest User"
                user_id_val = None

            data.append(
                {
                    "order_id": order.id,
                    "user_id": user_id_val,
                    "username": username,  # Will be 'Guest User' if no owner
                    "product_id": item.product.id if item.product else None,
                    "product_name": (
                        item.product.name if item.product else "Deleted Product"
                    ),
                    "quantity": item.quantity,
                    "unit_price": float(item.unit_price),
                    "subtotal": float(item.subtotal),
                    "order_date": order.created_at,
                }
            )

        total = len(data)
        serializer = PurchaseSerializer(data, many=True)
        return Response({"days": days, "total": total, "purchases": serializer.data})


# ─── Unfold Admin Dashboard Callback ───────────────────────────────────────────
from django.db.models import Sum, Count


def dashboard_callback(request, context):
    """
    Populates the Unfold Admin home page with live KPI metrics.
    Configured via UNFOLD["DASHBOARD_CALLBACK"] in settings.py.
    """
    total_products = Product.objects.filter(is_active=True).count()
    total_users = User.objects.count()
    total_orders = Order.objects.count()

    revenue_agg = Order.objects.select_related("payment").aggregate(
        total=Sum("payment__amount")
    )
    revenue = revenue_agg["total"] or 0

    recent_orders = (
        Order.objects.select_related("owner")
        .order_by("-created_at")[:5]
    )

    context.update(
        {
            "kpi": [
                {
                    "title": "Active Products",
                    "metric": str(total_products),
                    "footer": "Products in the store",
                    "icon": "shopping_bag",
                },
                {
                    "title": "Registered Users",
                    "metric": str(total_users),
                    "footer": "Total customer accounts",
                    "icon": "group",
                },
                {
                    "title": "Total Orders",
                    "metric": str(total_orders),
                    "footer": "All-time orders placed",
                    "icon": "receipt_long",
                },
                {
                    "title": "Total Revenue",
                    "metric": f"${revenue:,.2f}",
                    "footer": "Lifetime earnings",
                    "icon": "payments",
                },
            ],
            "recent_orders": [
                {
                    "id": o.id,
                    "owner": o.owner.username if o.owner else "—",
                    "status": o.status,
                    "created_at": o.created_at.strftime("%Y-%m-%d %H:%M"),
                }
                for o in recent_orders
            ],
        }
    )
    return context



class SellerProductViewSet(CacheInvalidateMixin, viewsets.ModelViewSet):
    """
    /api/sellers/products/            GET (list mine), POST (create)
    /api/sellers/products/<pk>/       GET, PUT, PATCH, DELETE (mine only)
    """
 
    serializer_class = ProductSerializer
    permission_classes = [IsApprovedSeller, IsProductOwner]
    pagination_class = StandardResultsSetPagination
 
    def get_queryset(self):
        return (
            Product.objects.filter(seller=self.request.user.seller_profile)
            .select_related("category")
            .prefetch_related("tags", "gallery_images")
            .order_by("-created_at")
        )
 
    def perform_create(self, serializer):
        # seller is forced server-side — a seller can never set it via the
        # request body, since ProductSerializer already marks it read_only.
        # New seller-submitted products always start pending review.
        serializer.save(seller=self.request.user.seller_profile, approval_status=Product.ApprovalStatus.PENDING)
        if getattr(settings, "ENABLE_CACHING", True):
            cache.clear()
 
    def perform_update(self, serializer):
        # Editing a live product sends it back for re-review. Adjust this
        # if you'd rather let minor edits (e.g. price) stay live — in that
        # case only reset to PENDING when specific fields change.
        serializer.save(approval_status=Product.ApprovalStatus.PENDING, rejection_reason="")
        if getattr(settings, "ENABLE_CACHING", True):
            cache.clear()
 
 
 
 
class ProductApprovalView(generics.UpdateAPIView):
    """PATCH /api/admins/products/<pk>/review/  body: {approval_status, rejection_reason?}"""
 
    queryset = Product.objects.all()
    serializer_class = ProductApprovalSerializer
    permission_classes = [IsAdminUser]
 
    def perform_update(self, serializer):
        old_status = serializer.instance.approval_status
        super().perform_update(serializer)
        new_status = serializer.instance.approval_status

        if old_status != new_status and serializer.instance.seller:
            seller_user = serializer.instance.seller.user
            if new_status == "approved":
                create_notification(
                    seller_user,
                    "product_approved",
                    "Product Approved",
                    f"Your product '{serializer.instance.name}' has been approved and is now live.",
                    "/seller/dashboard",
                )
                from .email_utils import send_product_approval_email
                send_product_approval_email(serializer.instance)
            elif new_status == "rejected":
                create_notification(
                    seller_user,
                    "product_rejected",
                    "Product Rejected",
                    f"Your product '{serializer.instance.name}' has been rejected. Reason: {serializer.instance.rejection_reason or 'Not specified'}",
                    "/seller/dashboard",
                )
                from .email_utils import send_product_rejection_email
                send_product_rejection_email(serializer.instance, serializer.instance.rejection_reason)

        if getattr(settings, "ENABLE_CACHING", True):
            cache.clear()
 
 
class PendingProductsAdminView(ListAPIView):
    """GET /api/admins/products/pending/ — queue for the review dashboard."""
 
    serializer_class = ProductSerializer
    permission_classes = [IsAdminUser]
    pagination_class = StandardResultsSetPagination
 
    def get_queryset(self):
        return (
            Product.objects.filter(approval_status=Product.ApprovalStatus.PENDING)
            .select_related("seller__user", "category")
            .order_by("created_at")
        )


class AdminSellerViewSet(viewsets.ModelViewSet):
    """
    GET /api/admins/sellers/ — list all sellers.
    PATCH /api/admins/sellers/<pk>/ — approve / reject / toggle active.
    """

    queryset = SellerProfile.objects.select_related("user").prefetch_related("products").order_by("-created_at")
    serializer_class = AdminSellerSerializer
    permission_classes = [IsAdminUser]
    pagination_class = StandardResultsSetPagination

    def get_serializer_class(self):
        if self.action in ("partial_update", "update"):
            return SellerApprovalSerializer
        return AdminSellerSerializer

    def perform_update(self, serializer):
        old_status = serializer.instance.verification_status
        super().perform_update(serializer)
        new_status = serializer.instance.verification_status

        if old_status != new_status:
            seller_user = serializer.instance.user
            if new_status == "approved":
                create_notification(
                    seller_user,
                    "seller_approved",
                    "Seller Account Approved",
                    "Congratulations! Your seller account has been approved. You can now start listing products.",
                    "/seller/dashboard",
                )
                from .email_utils import send_seller_approval_email
                send_seller_approval_email(serializer.instance)
            elif new_status == "rejected":
                create_notification(
                    seller_user,
                    "seller_rejected",
                    "Seller Account Rejected",
                    f"Your seller account has been rejected. Reason: {serializer.instance.rejection_reason or 'Not specified'}",
                    "/seller/dashboard",
                )
                from .email_utils import send_seller_rejection_email
                send_seller_rejection_email(serializer.instance, serializer.instance.rejection_reason)

        if getattr(settings, "ENABLE_CACHING", True):
            cache.clear()


class SellerStripeOnboardView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not hasattr(request.user, 'seller_profile'):
            return Response({"error": "No seller profile found."}, status=status.HTTP_403_FORBIDDEN)
        try:
            seller = request.user.seller_profile
            if not seller.stripe_account_id:
                account = stripe.Account.create(type='express', email=seller.contact_email)
                seller.stripe_account_id = account.id
                seller.save()
            account_link = stripe.AccountLink.create(account=seller.stripe_account_id, refresh_url=f"{settings.FRONTEND_URL}/seller/dashboard", return_url=f"{settings.FRONTEND_URL}/seller/dashboard", type="account_onboarding")
            return Response({"url": account_link.url})
        except Exception as e:
            return Response({"error": str(e)}, status=500)

class SellerStripeReturnView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        if not hasattr(request.user, 'seller_profile'):
            return Response({"error": "No seller profile found."}, status=status.HTTP_403_FORBIDDEN)
        try:
            seller = request.user.seller_profile
            if seller.stripe_account_id:
                account = stripe.Account.retrieve(seller.stripe_account_id)
                if account.payouts_enabled:
                    seller.stripe_payouts_enabled = True
                    seller.stripe_onboarding_complete = True
                    seller.save()
            return Response({"status": "success"})
        except Exception as e:
            return Response({"error": str(e)}, status=500)


# ===============================================
# COUPON VIEWS
# ===============================================

class CouponValidateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        code = request.data.get("code", "").strip()
        order_total = request.data.get("order_total")

        if not code:
            return Response({"error": "Coupon code is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            coupon = Coupon.objects.get(code__iexact=code)
        except Coupon.DoesNotExist:
            return Response({"error": "Invalid coupon code."}, status=status.HTTP_404_NOT_FOUND)

        order_total_dec = None
        if order_total:
            try:
                order_total_dec = Decimal(str(order_total))
            except Exception:
                return Response({"error": "Invalid order total."}, status=status.HTTP_400_BAD_REQUEST)

        valid, message = coupon.is_valid(user=request.user, order_total=order_total_dec)
        if not valid:
            return Response({"error": message, "valid": False}, status=status.HTTP_400_BAD_REQUEST)

        if order_total_dec:
            discount = coupon.calculate_discount(order_total_dec)
        else:
            discount = None

        return Response({
            "valid": True,
            "code": coupon.code,
            "discount_type": coupon.discount_type,
            "discount_value": str(coupon.discount_value),
            "calculated_discount": str(discount) if discount else None,
            "message": message,
        })


class CouponApplyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = request.data.get("code", "").strip()
        order_id = request.data.get("order_id")

        if not code or not order_id:
            return Response({"error": "Code and order_id required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            coupon = Coupon.objects.get(code__iexact=code)
            order = Order.objects.get(pk=order_id, owner=request.user)
        except (Coupon.DoesNotExist, Order.DoesNotExist):
            return Response({"error": "Invalid coupon or order."}, status=status.HTTP_404_NOT_FOUND)

        valid, message = coupon.is_valid(user=request.user, order_total=order.total_before_discount)
        if not valid:
            return Response({"error": message}, status=status.HTTP_400_BAD_REQUEST)

        discount = coupon.calculate_discount(order.total_before_discount)

        OrderCoupon.objects.create(
            order=order,
            coupon=coupon,
            discount_amount=discount,
        )

        order.discount_amount = sum(
            oc.discount_amount for oc in order.coupons_applied.all()
        )
        order.subtotal_before_discount = order.total_before_discount
        order.save()

        coupon.times_used += 1
        coupon.save(update_fields=["times_used"])

        return Response({
            "success": True,
            "discount_amount": str(discount),
            "new_total": str(order.total_price),
        })


# ===============================================
# SELLER PUBLIC PROFILE (YouTube-style)
# ===============================================

class SellerPublicProfileView(generics.RetrieveAPIView):
    queryset = SellerProfile.objects.select_related("user")
    serializer_class = SellerPublicProfileSerializer
    permission_classes = [AllowAny]
    lookup_field = "pk"

    def retrieve(self, request, *args, **kwargs):
        seller = self.get_object()
        serializer = self.get_serializer(seller)

        products = Product.objects.filter(
            seller=seller, is_active=True, approval_status="approved"
        ).select_related("category").prefetch_related("tags", "gallery_images")

        from django.core.paginator import Paginator
        product_page = request.query_params.get("products_page", 1)
        paginator = Paginator(products, 12)
        product_data = ProductSerializer(
            paginator.get_page(product_page), many=True, context={"is_admin": request.user.is_staff if request.user.is_authenticated else False}
        ).data

        offers = SellerOffer.objects.filter(
            seller=seller, is_active=True
        )
        from django.utils import timezone
        now = timezone.now()
        offers = offers.filter(
            Q(starts_at__isnull=True) | Q(starts_at__lte=now)
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gte=now)
        )

        return Response({
            "seller": serializer.data,
            "products": product_data,
            "products_count": paginator.count,
            "products_pages": paginator.num_pages,
            "offers": SellerOfferSerializer(offers[:20], many=True).data,
        })


# ===============================================
# SELLER OFFERS CRUD
# ===============================================

class SellerOfferListCreateView(generics.ListCreateAPIView):
    serializer_class = SellerOfferSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        seller = getattr(self.request.user, "seller_profile", None)
        if not seller:
            return SellerOffer.objects.none()
        return SellerOffer.objects.filter(seller=seller).order_by("-created_at")

    def perform_create(self, serializer):
        seller = self.request.user.seller_profile
        serializer.save(seller=seller)


class SellerOfferDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SellerOfferSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        seller = getattr(self.request.user, "seller_profile", None)
        if not seller:
            return SellerOffer.objects.none()
        return SellerOffer.objects.filter(seller=seller)


# ===============================================
# SELLER DELIVERY TYPE UPDATE
# ===============================================

class SellerDeliveryUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        seller = getattr(request.user, "seller_profile", None)
        if not seller:
            return Response({"error": "No seller profile found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = SellerDeliveryUpdateSerializer(seller, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ===============================================
# ADMIN COUPON MANAGEMENT
# ===============================================

class AdminCouponViewSet(viewsets.ModelViewSet):
    queryset = Coupon.objects.all().order_by("-created_at")
    serializer_class = CouponSerializer
    permission_classes = [IsAdminUser]
    pagination_class = StandardResultsSetPagination

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


# ===============================================
# ADMIN COMMISSION & EARNINGS
# ===============================================

class PlatformSettingsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        ps = PlatformSettings.get_solo()
        return Response({
            "default_commission_rate": str(ps.default_commission_rate),
            "auto_approve_products": ps.auto_approve_products,
            "auto_approve_sellers": ps.auto_approve_sellers,
        })

    def patch(self, request):
        ps = PlatformSettings.get_solo()
        for field in ["default_commission_rate", "auto_approve_products", "auto_approve_sellers"]:
            if field in request.data:
                setattr(ps, field, request.data[field])
        ps.save()
        return Response({
            "default_commission_rate": str(ps.default_commission_rate),
            "auto_approve_products": ps.auto_approve_products,
            "auto_approve_sellers": ps.auto_approve_sellers,
        })


class AdminSellerEarningsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from django.db.models import Sum
        from django.utils import timezone
        from datetime import timedelta

        now = timezone.now()
        last_30_days = now - timedelta(days=30)
        last_7_days = now - timedelta(days=7)

        sellers = SellerProfile.objects.filter(
            verification_status="approved"
        ).select_related("user")

        earnings = []
        for seller in sellers:
            items = OrderItem.objects.filter(
                product__seller=seller,
                order__created_at__gte=last_30_days,
                order__status__in=["confirmed", "processing", "shipped", "delivered"],
            )
            weekly_items = items.filter(order__created_at__gte=last_7_days)

            total_revenue_30d = items.aggregate(total=Sum("subtotal"))["total"] or 0
            total_commission_30d = items.aggregate(total=Sum("platform_fee"))["total"] or 0
            total_revenue_7d = weekly_items.aggregate(total=Sum("subtotal"))["total"] or 0
            total_orders = items.values("order").distinct().count()

            earnings.append({
                "seller_id": seller.id,
                "business_name": seller.business_name,
                "username": seller.user.username,
                "delivery_type": seller.delivery_type,
                "commission_rate": str(seller.effective_commission_rate()),
                "total_revenue_30d": str(total_revenue_30d),
                "total_commission_30d": str(total_commission_30d),
                "total_revenue_7d": str(total_revenue_7d),
                "total_orders_30d": total_orders,
                "seller_payout_30d": str(total_revenue_30d - total_commission_30d),
            })

        total_platform_commission = sum(
            Decimal(e["total_commission_30d"]) for e in earnings
        )
        total_revenue = sum(
            Decimal(e["total_revenue_30d"]) for e in earnings
        )

        return Response({
            "earnings": earnings,
            "summary": {
                "total_revenue_30d": str(total_revenue),
                "total_commission_30d": str(total_platform_commission),
                "active_sellers": len(earnings),
            },
        })


# ===============================================
# WISHLIST VIEWS
# ===============================================

class WishlistListView(generics.ListAPIView):
    serializer_class = WishlistItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return WishlistItem.objects.filter(
            user=self.request.user
        ).select_related("product", "product__seller")


class WishlistAddView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        product_id = request.data.get("product_id")
        if not product_id:
            return Response({"error": "product_id required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            product = Product.objects.get(pk=product_id, is_active=True)
        except Product.DoesNotExist:
            return Response({"error": "Product not found"}, status=status.HTTP_404_NOT_FOUND)

        item, created = WishlistItem.objects.get_or_create(
            user=request.user,
            product=product,
        )

        if not created:
            return Response({"message": "Already in wishlist", "in_wishlist": True})

        return Response({"message": "Added to wishlist", "in_wishlist": True}, status=status.HTTP_201_CREATED)


class WishlistRemoveView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        product_id = request.data.get("product_id")
        if not product_id:
            return Response({"error": "product_id required"}, status=status.HTTP_400_BAD_REQUEST)

        deleted, _ = WishlistItem.objects.filter(
            user=request.user,
            product_id=product_id,
        ).delete()

        if deleted:
            return Response({"message": "Removed from wishlist", "in_wishlist": False})
        return Response({"error": "Not in wishlist"}, status=status.HTTP_404_NOT_FOUND)


class WishlistCheckView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        product_id = request.query_params.get("product_id")
        if not product_id:
            return Response({"error": "product_id required"}, status=status.HTTP_400_BAD_REQUEST)

        in_wishlist = WishlistItem.objects.filter(
            user=request.user,
            product_id=product_id,
        ).exists()

        return Response({"in_wishlist": in_wishlist})


class WishlistBulkCheckView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        product_ids = request.data.get("product_ids", [])
        if not product_ids:
            return Response({"wishlist_ids": []})

        wishlist_ids = WishlistItem.objects.filter(
            user=request.user,
            product_id__in=product_ids,
        ).values_list("product_id", flat=True)

        return Response({"wishlist_ids": list(wishlist_ids)})


# ===============================================
# PRODUCT REVIEW VIEWS
# ===============================================

class ProductReviewListView(generics.ListAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        product_id = self.kwargs.get("product_id")
        return Review.objects.filter(
            product_id=product_id,
            is_active=True,
        ).select_related("user")


class ProductReviewStatsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, product_id):
        from django.db.models import Avg, Count

        reviews = Review.objects.filter(
            product_id=product_id,
            is_active=True,
        )

        stats = reviews.aggregate(
            average_rating=Avg("rating"),
            total_reviews=Count("id"),
        )

        distribution = {}
        for i in range(1, 6):
            distribution[str(i)] = reviews.filter(rating=i).count()

        return Response({
            "average_rating": round(float(stats["average_rating"] or 0), 1),
            "total_reviews": stats["total_reviews"],
            "rating_distribution": distribution,
        })


class ReviewCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, product_id):
        try:
            product = Product.objects.get(pk=product_id, is_active=True)
        except Product.DoesNotExist:
            return Response({"error": "Product not found"}, status=status.HTTP_404_NOT_FOUND)

        existing = Review.objects.filter(
            user=request.user,
            product=product,
        ).exists()
        if existing:
            return Response({"error": "You already reviewed this product"}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ReviewCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        Review.objects.create(
            user=request.user,
            product=product,
            rating=serializer.validated_data["rating"],
            title=serializer.validated_data.get("title", ""),
            comment=serializer.validated_data.get("comment", ""),
        )

        return Response({"message": "Review created"}, status=status.HTTP_201_CREATED)


class ReviewDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, review_id):
        try:
            review = Review.objects.get(pk=review_id, user=request.user)
        except Review.DoesNotExist:
            return Response({"error": "Review not found"}, status=status.HTTP_404_NOT_FOUND)

        review.delete()
        return Response({"message": "Review deleted"})


# ===============================================
# NOTIFICATION VIEWS
# ===============================================

class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)


class NotificationCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        total = Notification.objects.filter(user=request.user).count()
        unread = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({"total": total, "unread": unread})


class NotificationMarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        notification_id = request.data.get("notification_id")
        if notification_id:
            updated = Notification.objects.filter(
                pk=notification_id,
                user=request.user,
            ).update(is_read=True)
            if updated:
                return Response({"message": "Marked as read"})
            return Response({"error": "Notification not found"}, status=status.HTTP_404_NOT_FOUND)

        Notification.objects.filter(
            user=request.user,
            is_read=False,
        ).update(is_read=True)
        return Response({"message": "All marked as read"})


# ===============================================
# DELIVERY FEE CALCULATION
# ===============================================

class DeliveryFeeView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        from decimal import Decimal

        district = request.data.get("district", "")
        city = request.data.get("city", "")
        delivery_type = request.data.get("delivery_type", "platform")

        if not district and not city:
            return Response(
                {"error": "district or city required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        bosta_enabled = getattr(settings, "BOSTA_ENABLED", False)
        if bosta_enabled:
            try:
                import requests as http_requests
                bosta_api_key = getattr(settings, "BOA_API_KEY", "")
                bosta_url = "https://backend.portal.bosta.co/api/v1/deliveries/fees"
                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {bosta_api_key}",
                }
                payload = {
                    "deliveryAddress": district,
                    "city": city,
                    "deliveryType": 1,
                    "codEnabled": False,
                }
                resp = http_requests.post(bosta_url, json=payload, headers=headers, timeout=10)
                if resp.status_code == 200:
                    data = resp.json()
                    fee = Decimal(str(data.get("fee", 0)))
                    return Response({
                        "fee": str(fee),
                        "provider": "bosta",
                        "estimated_days": "3-5",
                    })
            except Exception as e:
                pass

        fee_map = {
            "Cairo": 40,
            "Giza": 40,
            "Alexandria": 50,
            "Qalyubia": 50,
            "Sharqia": 55,
            "Dakahlia": 55,
            "Gharbia": 55,
            "Monufia": 55,
            "Beheira": 60,
            "Kafr El Sheikh": 60,
            "Damietta": 60,
            "Port Said": 60,
            "Ismailia": 60,
            "Suez": 60,
            "North Sinai": 70,
            "South Sinai": 70,
            "Beni Suef": 65,
            "Fayoum": 65,
            "Minya": 70,
            "Asyut": 75,
            "Sohag": 80,
            "Qena": 85,
            "Luxor": 85,
            "Aswan": 90,
            "Red Sea": 80,
            "New Valley": 90,
        }

        region = city or district
        fee = 40
        for key, val in fee_map.items():
            if key.lower() in region.lower():
                fee = val
                break

        if delivery_type == "seller":
            fee = 0

        return Response({
            "fee": str(fee),
            "provider": "flat_rate",
            "estimated_days": "5-7",
        })
