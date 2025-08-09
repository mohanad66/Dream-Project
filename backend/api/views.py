from rest_framework.permissions import IsAuthenticated, AllowAny , IsAdminUser
from rest_framework.decorators import api_view, permission_classes
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.exceptions import AuthenticationFailed
from rest_framework import status, generics, viewsets
from rest_framework.generics import ListAPIView
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from rest_framework.response import Response
from rest_framework.views import APIView
from .serializer import *
from .models import *
import logging
import stripe

logger = logging.getLogger(__name__ )
User = get_user_model()
stripe.api_key = settings.STRIPE_SECRET_KEY

# ++++++++++ ADDED ADMIN VIEWSETS ++++++++++

class ProductAdminViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().select_related('owner')
    serializer_class = ProductSerializer
    permission_classes = [IsAdminUser]

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_staff and not user.is_superuser:
            raise serializers.ValidationError("You do not have permission to create products.")
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
class CategoryAdminViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdminUser]

class ServiceAdminViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    permission_classes = [IsAdminUser]

class ContactAdminViewSet(viewsets.ModelViewSet):
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
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
            logger.info(f"Auth attempt: {safe_data}")
        
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
        users = User.objects.all().order_by('-date_joined')
        
        if is_active := request.query_params.get('is_active'):
            users = users.filter(is_active=is_active.lower() == 'true')
            
        if search := request.query_params.get('search'):
            from django.db.models import Q
            users = users.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search)
            )
            
        serializer = UserSerializer(
            users, 
            many=True,
            context={'is_admin': request.user.is_superuser}
        )
        return Response(serializer.data)
        
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
        user = get_object_or_404(User, pk=pk)
        
        if user == request.user:
            return Response(
                {"detail": "You cannot modify your own status"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if 'is_active' not in request.data or len(request.data) > 1:
            return Response(
                {"detail": "Only is_active field can be modified"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.is_active = request.data['is_active']
        user.save()
        
        return Response(
            {"status": f"User {'deactivated' if not user.is_active else 'reactivated'}"},
            status=status.HTTP_200_OK
        )
    
    def delete(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        
        if user == request.user:
            return Response(
                {"detail": "You cannot delete your own account"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    """Get current authenticated user"""
    try:
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
    except Exception as e:
        logger.error(f"User fetch error: {str(e)}")
        return Response(
            {"error": "Failed to retrieve user data"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# Public Content Views
def create_public_list_view(model, serializer, *, order_by=None, filter_active=False):
    @api_view(["GET"])
    @permission_classes([AllowAny])
    def view_func(request):
        try:
            queryset = model.objects.all()
            if filter_active:
                queryset = queryset.filter(is_active=True)
            if order_by:
                queryset = queryset.order_by(order_by)
            return Response(serializer(queryset, many=True).data)
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
    Product, ProductSerializer, order_by="price"
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

class PaymentListView(ListAPIView):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer

class CreatePaymentIntentView(APIView):
    def post(self,request):
        amount = request.data.get('amount')
        currency = request.data.get('currency')
        email = request.data.get('user_email')
        if not email:
            return Response({"error" : "Invalid Email"} , status=400)
        if not amount:
            return Response({"error" : "Invalid Amount"} , status=400)
        if not currency:
            return Response({"error" : "Currency is Required"} , status=400)
        
        supported_currencies = ["usd" , "egp"]
        if currency.lower() not in supported_currencies:
            return Response({"error" : "Unsupported Currency"} ,status=400)
        
        try:
            intent = stripe.PaymentIntent.create(
                amount = int(amount),
                currency=currency
            )
            payment_data = {
                "amount": amount ,
                "currency": currency ,
                "stripe_payment_id" : intent["id"],
                "user_email": email
            }
            serializer = PaymentSerializer(data = payment_data)
            if serializer.is_valid():
                serializer.save()
                return Response({
                    "clientSecret" : intent["client_secret"],
                    "payment" : serializer.data,
                } , status=status.HTTP_201_CREATED)
            return Response(serializer.errors , status=status.HTTP_400_BAD_REQUEST)
        except stripe.error.StripeError as e:
            return Response({"error": str(e)} , status=400)
