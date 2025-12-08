from rest_framework import serializers
from .models import *
from django.contrib.auth import get_user_model
from rest_framework.validators import UniqueValidator
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


class CarouselImgSerializer(serializers.ModelSerializer):
    class Meta:
        model = CarouselImg
        fields = "__all__"

class UserDisplaySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username']
        
class ProductSerializer(serializers.ModelSerializer):
    owner = UserDisplaySerializer(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id", "owner", "image", "name", "slug", "category", 
            "description", "price", "is_active", "created_at", "updated_at"
        ]

    def create(self, validated_data):
        # Get the owner (which is a User instance) from the context.
        owner = self.context['request'].user
        validated_data['owner'] = owner
        
        product = Product.objects.create(**validated_data)
        return product


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = "__all__"


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = "__all__"


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = "__all__"


class UserSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        required=True,
        validators=[UniqueValidator(queryset=User.objects.all())]
    )
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password]
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "password",
            "first_name",
            "last_name",
            "is_active",
            "is_staff",
            "is_superuser",
            "last_login",
            "date_joined"
        ]
        extra_kwargs = {
            "password": {"write_only": True},
            "last_login": {"read_only": True},
            "date_joined": {"read_only": True},
            "is_active": {"read_only": True},
            "is_staff": {"read_only": True},
            "is_superuser": {"read_only": True}
        }

    def create(self, validated_data):
        try:
            user = User.objects.create_user(
                username=validated_data["username"],
                email=validated_data["email"],
                password=validated_data["password"],
                first_name=validated_data.get("first_name", ""),
                last_name=validated_data.get("last_name", "")
            )
            logger.info(f"New user created: {user.username}")
            return user
        except Exception as e:
            logger.error(f"Error creating user: {str(e)}")
            raise serializers.ValidationError(f"Error creating user: {str(e)}")

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation.pop('password', None)  # Always remove password
        return representation  # Keep all other fields (including is_superuser)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    
    def validate(self, attrs):

        username = attrs.get('username', 'Unknown')
        logger.info(f"Token validation attempt for user: {username}")
        
        try:
            # Call parent validation
            data = super().validate(attrs)
            
            # Check if user is active
            if not self.user.is_active:
                logger.warning(f"Inactive user attempted login: {username}")
                raise serializers.ValidationError(
                    "Account is not active. Please contact support."
                )
            
            # Add custom claims if needed
            data['user_id'] = self.user.id
            data['username'] = self.user.username
            data['is_staff'] = self.user.is_staff
            
            logger.info(f"Token generated successfully for user: {username}")
            return data
            
        except serializers.ValidationError as e:
            logger.error(f"Validation error for user {username}: {str(e)}")
            raise
        except Exception as e:
            print(f"Authentication error: {e}")
            logger.error(f"Unexpected error during token validation for user {username}: {str(e)}")
            raise serializers.ValidationError("Authentication failed. Please check your credentials.")

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        # Add custom claims
        token['user_id'] = user.id
        token['username'] = user.username
        token['email'] = user.email
        token['is_staff'] = user.is_staff
        
        return token

class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    confirm_password = serializers.CharField(required=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError("New passwords do not match.")
        return attrs
    
    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value

class AdminUserSerializer(UserSerializer):
    class Meta(UserSerializer.Meta):
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 
                  'is_active', 'is_staff', 'is_superuser', 'date_joined']
        read_only_fields = ['id', 'date_joined']
        extra_kwargs = {
            **UserSerializer.Meta.extra_kwargs,
            'is_active': {'read_only': False},  # Must be writable
            'is_staff': {'read_only': True , 'required': False},    # Keep staff status read-only
            'is_superuser': {'read_only': True , 'required': False},
            "last_login" : {"read_only": True}
        }
        
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if not self.context.get('is_admin', False):
            # Hide sensitive fields from non-admins
            representation.pop('is_staff', None)
            representation.pop('is_superuser', None)
            representation.pop('last_login', None)
            representation.pop('date_joined', None)
        return representation

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ["id" , 'amount' , 'currency' , 'stripe_payment_id' , 'created_at' , 'user_email']


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['first_name', 'last_name']