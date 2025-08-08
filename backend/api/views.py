from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny , IsAdminUser
from rest_framework.response import Response
# ++++++++++ ADDED 'viewsets' ++++++++++
from rest_framework import status, generics, viewsets
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.contrib.auth import get_user_model
from .serializer import *
from .models import *
import logging
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.views import TokenObtainPairView
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes, force_str
from django.conf import settings

logger = logging.getLogger(__name__ )
User = get_user_model()

# ++++++++++ ADDED ADMIN VIEWSETS ++++++++++
class ProductAdminViewSet(viewsets.ModelViewSet):
    """Admin viewset for managing Products (CRUD)."""
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAdminUser]

class CategoryAdminViewSet(viewsets.ModelViewSet):
    """Admin viewset for managing Categories (CRUD)."""
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdminUser]

class ServiceAdminViewSet(viewsets.ModelViewSet):
    """Admin viewset for managing Services (CRUD)."""
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    permission_classes = [IsAdminUser]

class ContactAdminViewSet(viewsets.ModelViewSet):
    """Admin viewset for managing Contacts (CRUD)."""
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
    permission_classes = [IsAdminUser]
# ++++++++++++++++++++++++++++++++++++++++++


# Auth Views
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
    """User Registration endpoint"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_all_users(request):
    """
    Admin-only endpoint to list all users
    """
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

class UserListView(APIView):
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        users = User.objects.all()
        serializer = AdminUserSerializer(users, many=True, context={'is_admin': True})
        return Response(serializer.data)

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

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def verify_token(request):
    """Verify JWT token validity"""
    return Response({
        "valid": True,
        "user": request.user.username,
        "message": "Token is valid"
    })

# Public Content Views
def create_public_list_view(model, serializer, *, order_by=None, filter_active=False):
    """Factory function for public list endpoints"""
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

class PasswordResetRequestView(generics.GenericAPIView):
    serializer_class = PasswordResetRequestSerializer
    
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        
        user = User.objects.get(email=email)
        
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        reset_url = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}/"
        
        subject = "Password Reset Request"
        message = render_to_string('password_reset_email.html', {
            'user': user,
            'reset_url': reset_url,
        })
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=False,
        )
        
        return Response(
            {"detail": "Password reset email has been sent."},
            status=status.HTTP_200_OK
        )

class PasswordResetConfirmView(generics.GenericAPIView):
    serializer_class = PasswordResetConfirmSerializer
    
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            uid = force_str(urlsafe_base64_decode(serializer.validated_data['uid']))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None
            
        if user is not None and default_token_generator.check_token(user, serializer.validated_data['token']):
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response(
                {"detail": "Password has been reset successfully."},
                status=status.HTTP_200_OK
            )
            
        return Response(
            {"error": "Invalid reset link."},
            status=status.HTTP_400_BAD_REQUEST
        )

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
