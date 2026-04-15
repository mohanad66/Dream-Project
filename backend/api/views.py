from rest_framework.permissions import IsAuthenticated, AllowAny , IsAdminUser
from rest_framework.decorators import api_view, permission_classes
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.pagination import PageNumberPagination
from rest_framework import status, generics, viewsets
from rest_framework.generics import ListAPIView
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.contrib.auth import get_user_model
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import JsonResponse
from django.conf import settings
from django.core.cache import cache
from django.views.decorators.cache import cache_page
from .serializer import *
from .models import *
from .cache_utils import cache_api_response
import logging
import stripe
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

logger = logging.getLogger(__name__ )
User = get_user_model()
stripe.api_key = settings.STRIPE_SECRET_KEY

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 9  # Increased from 10 to reduce API calls
    page_size_query_param = 'page_size'
    max_page_size = 1000

# ++++++++++ ADDED ADMIN VIEWSETS ++++++++++
class ProductAdminViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().select_related('owner').prefetch_related('tags')
    serializer_class = ProductSerializer
    permission_classes = [IsAdminUser]
    pagination_class = StandardResultsSetPagination  # ✅ Add this line
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

class CategoryAdminViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    pagination_class = StandardResultsSetPagination  # ✅ Add this line
    serializer_class = CategorySerializer
    permission_classes = [IsAdminUser]

class ServiceAdminViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.all()
    pagination_class = StandardResultsSetPagination  # ✅ Add this line
    serializer_class = ServiceSerializer
    permission_classes = [IsAdminUser]

class ContactAdminViewSet(viewsets.ModelViewSet):
    queryset = Contact.objects.all()
    pagination_class = StandardResultsSetPagination  # ✅ Add this line
    serializer_class = ContactSerializer
    permission_classes = [IsAdminUser]

class TagsAdminViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all()
    pagination_class = StandardResultsSetPagination  # ✅ Add this line
    serializer_class = TagsSerializer
    permission_classes = [IsAdminUser]

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    
    def post(self, request, *args, **kwargs):
        logger.info(f"Token request from IP: {request.META.get('REMOTE_ADDR')}")
        
        if isinstance(request.data, list):
            return Response({
                'error': 'Expected JSON object, got array',
                'hint': 'Send credentials as {"username":"...","password":"..."}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if isinstance(request.data, dict):
            safe_data = {k: '***' if 'password' in k.lower() else v 
                         for k, v in request.data.items()}

        
        required = {'username', 'password'}
        missing = required - set(request.data.keys())
        if missing:
            return Response({
                'error': f'Missing fields: {", ".join(missing)}',
                'required_fields': list(required)
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            response = super().post(request, *args, **kwargs)
            logger.info(f"Successful auth for {request.data.get('username')}")
            return response
        except AuthenticationFailed:
            logger.warning(f"Failed auth attempt for {request.data.get('username')}")
            return Response({
                'error': 'Invalid credentials'
            }, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            logger.error(f"Auth error: {str(e)}", exc_info=True)
            return Response({
                'error': 'Authentication failed'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]


@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_all_users(request):
    try:
        users = User.objects.all().order_by('-date_joined').only('id', 'username', 'email', 'is_active', 'is_staff', 'date_joined')
        
        if is_active := request.query_params.get('is_active'):
            users = users.filter(is_active=is_active.lower() == 'true')
            
        if search := request.query_params.get('search'):
            from django.db.models import Q
            users = users.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search)
            )
        
        # +++ ADD PAGINATION LOGIC +++
        paginator = StandardResultsSetPagination()
        paginated_users = paginator.paginate_queryset(users, request)
        
        serializer = UserSerializer(
            paginated_users, # Use the paginated queryset
            many=True,
            context={'is_admin': request.user.is_superuser}
        )
        
        # Return the paginated response
        return paginator.get_paginated_response(serializer.data)
        
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
class UserDetailView(APIView):
    def get_permissions(self):
        if self.request.method in ['PATCH', 'DELETE']:
            return [IsAdminUser()]
        return [IsAuthenticated()]
    
    def get(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        if user != request.user and not request.user.is_staff:
            return Response(
                {"detail": "You can only view your own profile"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer_class = AdminUserSerializer if request.user.is_staff else UserSerializer
        return Response(serializer_class(user).data)
    
    def patch(self, request, pk):
        print(f"Received PATCH request for user {pk}")
        print(f"Request data: {request.data}")
        print(f"Request user: {request.user} (superuser: {request.user.is_superuser})")
        
        if not request.user.is_superuser:
            return Response(
                {"detail": "You do not have permission to modify user roles."},
                status=status.HTTP_403_FORBIDDEN
            )

        user_to_modify = get_object_or_404(User, pk=pk)
        
        # Prevent modifying other superusers
        if user_to_modify.is_superuser:
            return Response(
                {"detail": "Cannot modify superuser roles."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Prevent self-modification
        if user_to_modify == request.user:
            return Response(
                {"detail": "You cannot modify your own role."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = AdminUserSerializer(
            instance=user_to_modify, 
            data=request.data, 
            partial=True
        )
        
        if serializer.is_valid():
            print("Serializer valid - saving changes")
            serializer.save()
            return Response(AdminUserSerializer(user_to_modify).data, status=status.HTTP_200_OK)
        
        print(f"Serializer errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        
        if user == request.user:
            return Response(
                {"detail": "You cannot delete your own account"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CurrentUserView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method == 'PATCH':
            return UserProfileUpdateSerializer
        return UserSerializer

# Public Content Views
def create_public_list_view(model, serializer_class, order_by=None, filter_active=False):
    @api_view(["GET"])
    @permission_classes([AllowAny])
    @cache_api_response(timeout=600)  # Cache for 10 minutes
    def view_func(request):
        try:
            queryset = model.objects.all()
            
            # Optimize queries
            if model == Product:
                queryset = queryset.select_related('owner').prefetch_related('tags')
            
            if filter_active:
                queryset = queryset.filter(is_active=True)
            if order_by:
                queryset = queryset.order_by(order_by)
            
            # Pagination
            paginator = StandardResultsSetPagination()
            paginated_queryset = paginator.paginate_queryset(queryset, request)
            
            # Serialize paginated data
            serializer = serializer_class(
                paginated_queryset,
                many=True,
                context={'is_admin': request.user.is_staff}
            )
            
            response = paginator.get_paginated_response(serializer.data)
            
            # Add HTTP cache headers for browser caching
            if not request.user.is_authenticated:
                response['Cache-Control'] = 'public, max-age=600'  # 10 minutes
            
            return response
            
        except Exception as e:
            logger.error(f"Error fetching {model.__name__}: {str(e)}")
            return Response(
                {"error": f"Failed to retrieve {model.__name__.lower()}s"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    return view_func
class PasswordChangeView(generics.GenericAPIView):
    serializer_class = PasswordChangeSerializer
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        pagination_class = StandardResultsSetPagination  # ✅ Add this line
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        from django.contrib.auth import update_session_auth_hash
        update_session_auth_hash(request, user)
        
        return Response(
            {"detail": "Password updated successfully."},
            status=status.HTTP_200_OK
        )

# Instantiate public views
get_carouselImg = create_public_list_view(
    CarouselImg, CarouselImgSerializer, filter_active=True
)
get_product = create_public_list_view(
    Product, ProductSerializer, filter_active=True # Keep filtering for active products
)
get_category = create_public_list_view(
    Category, CategorySerializer, filter_active=True
)
get_services = create_public_list_view(
    Service, ServiceSerializer, order_by="price"
)
get_contact = create_public_list_view(
    Contact, ContactSerializer
)

get_tags = create_public_list_view(
    Tag , TagsSerializer 
)
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
            amount = request.data.get('amount')  # in cents
            currency = request.data.get('currency', 'egp').lower()
            order_items = request.data.get('order_items', [])
            shipping_address = request.data.get('shipping_address', '')
            note = request.data.get('note', '')

            # Validate amount
            if not amount or amount <= 0:
                return Response(
                    {'error': 'Invalid amount'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not order_items or len(order_items) == 0:
                return Response(
                    {'error': 'Order must contain at least one item'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # ===== STEP 1: CREATE ORDER FIRST =====
            order = Order.objects.create(
                owner=request.user,
                status='pending',  # Order starts as pending
                shipping_address=shipping_address,
                note=note
            )

            # ===== STEP 2: CREATE ORDER ITEMS =====
            total_price = 0
            for item_data in order_items:
                try:
                    product = Product.objects.get(id=item_data.get('id'))
                    quantity = item_data.get('quantity', 1)
                    price = float(item_data.get('price', product.price))
                    
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
                        {'error': f'Product {item_data.get("id")} not found'},
                        status=status.HTTP_404_NOT_FOUND
                    )

            # ===== STEP 3: CREATE PAYMENT INTENT =====
            try:
                # Convert amount to proper format (Stripe expects smallest currency unit)
                amount_in_cents = int(amount)
                
                payment_intent = stripe.PaymentIntent.create(
                    amount=amount_in_cents,
                    currency=currency,
                    metadata={
                        'order_id': order.id,
                        'user_id': request.user.id,
                        'user_email': request.user.email
                    }
                )

                # ===== STEP 4: CREATE PAYMENT RECORD =====
                payment = Payment.objects.create(
                    stripe_payment_id=payment_intent.id,
                    amount=amount_in_cents / 100,  # Convert back to EGP
                    currency=currency,
                    status='pending'  # Payment starts as pending
                )

                return Response({
                    'clientSecret': payment_intent.client_secret,
                    'orderId': order.id,
                    'paymentId': payment.id,
                    'amount': amount_in_cents / 100,
                    'currency': currency
                }, status=status.HTTP_201_CREATED)

            except stripe.error.CardError as e:
                order.delete()  # Rollback order if payment intent fails
                return Response(
                    {'error': f'Card error: {e.user_message}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            except stripe.error.RateLimitError:
                order.delete()
                return Response(
                    {'error': 'Too many requests to Stripe'},
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )
            except stripe.error.InvalidRequestError as e:
                order.delete()
                return Response(
                    {'error': f'Invalid request: {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            except stripe.error.AuthenticationError:
                order.delete()
                return Response(
                    {'error': 'Stripe authentication failed'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            except stripe.error.APIConnectionError:
                order.delete()
                return Response(
                    {'error': 'Failed to connect to Stripe'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )
            except stripe.error.StripeError as e:
                order.delete()
                return Response(
                    {'error': f'Stripe error: {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        except Exception as e:
            return Response(
                {'error': f'Unexpected error: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ProductSearchView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        queryset = Product.objects.filter(is_active=True).prefetch_related('tags').select_related('category')

        # Text search — name & description
        search = request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(description__icontains=search)
            )

        # Category filter
        category = request.query_params.get('category', '')
        if category and category != 'all':
            if category == 'uncategorized':
                queryset = queryset.filter(category__isnull=True)
            else:
                if category.isdigit():
                    sort = request.query_params.get('sort', '-created_at')
                    allowed_sorts = ['price', '-price', '-created_at', 'name']
                    if sort in allowed_sorts:
                        queryset = queryset.order_by(sort)
                    queryset = queryset.filter(category__id=int(category))

        # Tags filter (comma-separated IDs: ?tags=1,2,3)
        tags = request.query_params.get('tags', '')
        if tags:
            tag_ids = [t for t in tags.split(',') if t.isdigit()]
            if tag_ids:
                queryset = queryset.filter(tags__id__in=tag_ids).distinct()

        # Price filter
        min_price = request.query_params.get('minPrice', '')
        max_price = request.query_params.get('maxPrice', '')
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
        sort = request.query_params.get('sort', '-created_at')
        allowed_sorts = ['price', '-price', '-created_at', 'name']
        if sort in allowed_sorts:
            queryset = queryset.order_by(sort)
        # Pagination
        paginator = StandardResultsSetPagination()
        paginated = paginator.paginate_queryset(queryset, request)
        serializer = ProductSerializer(paginated, many=True, context={'is_admin': request.user.is_staff})
        return paginator.get_paginated_response(serializer.data)

get_product = ProductSearchView.as_view()




class CreateOrderView(APIView):
    """
    Called by frontend after stripe.confirmCardPayment succeeds.
    Receives the stripe payment_intent_id, looks up the Payment record,
    and creates the Order + OrderItems.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        payment_intent_id = request.data.get('payment_intent_id')
        order_items = request.data.get('order_items', [])  # [{id, name, price, quantity}]
        shipping_address = request.data.get('shipping_address', '')
        note = request.data.get('note', '')

        if not payment_intent_id:
            return Response({"error": "payment_intent_id is required"}, status=400)

        # Look up the payment
        try:
            payment = Payment.objects.get(
                stripe_payment_id=payment_intent_id,
                owner=request.user
            )
        except Payment.DoesNotExist:
            return Response({"error": "Payment not found"}, status=404)

        # Prevent duplicate orders
        if hasattr(payment, 'order'):
            return Response(
                OrderSerializer(payment.order).data,
                status=status.HTTP_200_OK
            )

        # Verify payment succeeded with Stripe before creating order
        try:
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            if intent['status'] != 'succeeded':
                return Response(
                    {"error": f"Payment not completed. Status: {intent['status']}"},
                    status=400
                )
        except stripe.error.StripeError as e:
            logger.error(f"Stripe retrieve error: {str(e)}")
            return Response({"error": "Could not verify payment with Stripe"}, status=400)

        # Update payment status
        payment.status = Payment.Status.SUCCESS
        payment.save(update_fields=['status'])

        # Create order
        order = Order.objects.create(
            owner=request.user,
            payment=payment,
            shipping_address=shipping_address,
            note=note,
            status=Order.Status.CONFIRMED,
        )

        # Create order items — snapshot price at time of purchase
        for item_data in order_items:
            try:
                product = Product.objects.get(pk=item_data['id'])
                OrderItem.objects.create(
                    order=order,
                    product=product,
                    quantity=int(item_data.get('quantity', 1)),
                    unit_price=product.price,  # Always use DB price, never trust frontend
                )
            except Product.DoesNotExist:
                logger.warning(f"Product {item_data.get('id')} not found during order creation")
                continue

        serializer = OrderSerializer(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class MyOrdersView(ListAPIView):
    """Returns the authenticated user's own orders, newest first."""
    permission_classes = [IsAuthenticated]
    serializer_class = OrderSerializer
    pagination_class = None  # Disable pagination

    def get_queryset(self):
        return (
            Order.objects
            .filter(owner=self.request.user)
            .select_related('payment')
            .prefetch_related('items__product')
            .order_by('-created_at')
        )


class MyOrderDetailView(APIView):
    """Returns a single order belonging to the authenticated user."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        order = get_object_or_404(
            Order.objects.select_related('payment').prefetch_related('items__product'),
            pk=pk,
            owner=request.user
        )
        return Response(OrderSerializer(order).data)


class OrderAdminViewSet(viewsets.ModelViewSet):
    """Full CRUD for admins. Status updates go through partial_update (PATCH)."""
    queryset = (
        Order.objects
        .select_related('owner', 'payment')
        .prefetch_related('items__product')
        .order_by('-created_at')
    )
    permission_classes = [IsAdminUser]
    pagination_class = StandardResultsSetPagination

    def get_serializer_class(self):
        if self.action == 'partial_update':
            return OrderStatusUpdateSerializer
        return OrderSerializer

    def partial_update(self, request, *args, **kwargs):
        order = self.get_object()
        serializer = OrderStatusUpdateSerializer(order, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(OrderSerializer(order).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    

@method_decorator(csrf_exempt, name='dispatch')
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
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')

        try:
            event = stripe.Webhook.construct_event(
                payload,
                sig_header,
                settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            return Response(
                {'error': 'Invalid payload'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except stripe.error.SignatureVerificationError:
            return Response(
                {'error': 'Invalid signature'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Handle the event
        if event['type'] == 'payment_intent.succeeded':
            self.handle_payment_succeeded(event['data']['object'])

        elif event['type'] == 'payment_intent.payment_failed':
            self.handle_payment_failed(event['data']['object'])

        elif event['type'] == 'payment_intent.canceled':
            self.handle_payment_cancelled(event['data']['object'])

        return Response({'status': 'success'}, status=status.HTTP_200_OK)

    def handle_payment_succeeded(self, payment_intent):
        """
        Update payment and order status when payment succeeds.
        """
        try:
            order_id = payment_intent['metadata'].get('order_id')
            payment_intent_id = payment_intent['id']

            # Update Payment record
            payment = Payment.objects.get(stripe_payment_id=payment_intent_id)
            payment.status = 'success'
            payment.save()

            # Update Order status from pending to confirmed
            order = Order.objects.get(id=order_id)
            if order.status == 'pending':
                order.status = 'confirmed'
                order.save()

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
            payment_intent_id = payment_intent['id']

            # Update Payment record
            payment = Payment.objects.get(stripe_payment_id=payment_intent_id)
            payment.status = 'failed'
            payment.save()

            # Update Order status to cancelled if payment fails
            order = payment.order
            if order.status == 'pending':
                order.status = 'cancelled'
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
            payment_intent_id = payment_intent['id']

            # Update Payment record
            payment = Payment.objects.get(stripe_payment_id=payment_intent_id)
            payment.status = 'cancelled'
            payment.save()

            # Update Order status to cancelled
            order = payment.order
            if order.status == 'pending':
                order.status = 'cancelled'
                order.save()

            print(f"⊘ Payment cancelled for Order #{order.id}")

        except Payment.DoesNotExist:
            print(f"✗ Payment not found: {payment_intent_id}")
        except Exception as e:
            print(f"✗ Error handling payment cancellation: {str(e)}")