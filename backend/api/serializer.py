import logging

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.db import transaction

from .models import *

logger = logging.getLogger(__name__)
User = get_user_model()



class SellerRegistrationSerializer(serializers.Serializer):
    """
    Registers a new User AND creates their SellerProfile in one call.
    If you'd rather let existing customers "upgrade" to seller status,
    add a separate SellerUpgradeSerializer that just takes the business
    fields and attaches to request.user.
    """
 
    # User account fields — align these with whatever your existing
    # /api/user/register/ endpoint already expects (email vs username, etc).
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
 
    # Seller-specific fields
    business_name = serializers.CharField(max_length=255)
    business_description = serializers.CharField(required=False, allow_blank=True)
    contact_phone = serializers.CharField(max_length=32)
    contact_email = serializers.EmailField()
    verification_document = serializers.URLField(required=False, allow_blank=True)
 
    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value
 
    @transaction.atomic
    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data["email"],
            username=validated_data["email"],  # drop if your User has no username field
            password=validated_data["password"],
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            is_active=True,  # keep your existing OTP verification flow if you have one
        )
 
        seller_profile = SellerProfile.objects.create(
            user=user,
            business_name=validated_data["business_name"],
            business_description=validated_data.get("business_description", ""),
            contact_phone=validated_data["contact_phone"],
            contact_email=validated_data["contact_email"],
            verification_document=validated_data.get("verification_document", ""),
        )
        return seller_profile
 
 
class SellerUpgradeSerializer(serializers.ModelSerializer):
    class Meta:
        model = SellerProfile
        fields = [
            "business_name",
            "business_description",
            "contact_phone",
            "contact_email",
        ]


class SellerProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
 
    class Meta:
        model = SellerProfile
        fields = [
            "id",
            "email",
            "business_name",
            "business_description",
            "contact_phone",
            "contact_email",
            "verification_status",
            "rejection_reason",
            "stripe_onboarding_complete",
            "stripe_payouts_enabled",
            "is_active",
            "created_at",
        ]
        read_only_fields = [
            "verification_status",
            "rejection_reason",
            "stripe_onboarding_complete",
            "stripe_payouts_enabled",
            "is_active",
            "created_at",
        ]
 



class CarouselImgSerializer(serializers.ModelSerializer):
    class Meta:
        model = CarouselImg
        fields = ["id", "name", "image", "is_active", "order"]
        read_only_fields = ["order"]

    def create(self, validated_data):
        if "image" in validated_data:
            validated_data["image"] = compress_image(
                validated_data["image"], quality=85, max_width=1920, max_height=1080
            )
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "image" in validated_data:
            validated_data["image"] = compress_image(
                validated_data["image"], quality=85, max_width=1920, max_height=1080
            )
        return super().update(instance, validated_data)


class UserDisplaySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username"]


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ["id", "image"]


class ProductSerializer(serializers.ModelSerializer):
    tags = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Tag.objects.all(), required=False
    )
    gallery_images = ProductImageSerializer(many=True, read_only=True)
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(allow_empty_file=False, use_url=False),
        write_only=True,
        required=False
    )
    seller_name = serializers.CharField(source="seller.business_name", read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "description",
            "price",
            "image",
            "gallery_images",
            "uploaded_images",
            "category",
            "tags",
            "is_active",
            "seller",
            "seller_name",
            "approval_status",   # <-- add
            "rejection_reason"
        ]
        read_only_fields = ["seller", "seller_name", "approval_status", "rejection_reason"]  # <-- add the last two

    def create(self, validated_data):
        # Extract extra data
        tags = validated_data.pop("tags", [])
        uploaded_images = validated_data.pop("uploaded_images", [])

        # Create the product
        product = Product.objects.create(**validated_data)

        # Handle tags
        if tags:
            product.tags.set(tags)

        # Handle uploaded gallery images
        for image in uploaded_images:
            ProductImage.objects.create(product=product, image=image)

        return product

    def update(self, instance, validated_data):
        tags = validated_data.pop("tags", None)
        uploaded_images = validated_data.pop("uploaded_images", [])

        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update tags
        if tags is not None:
            instance.tags.set(tags)

        # Add new uploaded gallery images
        for image in uploaded_images:
            ProductImage.objects.create(product=instance, image=image)

        return instance


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = "__all__"


class TagsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
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
        required=True, validators=[UniqueValidator(queryset=User.objects.all())]
    )
    password = serializers.CharField(
        write_only=True, required=True, validators=[validate_password]
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
            "date_joined",
        ]
        extra_kwargs = {
            "password": {"write_only": True},
            "last_login": {"read_only": True},
            "date_joined": {"read_only": True},
            "is_active": {"read_only": True},
            "is_staff": {"read_only": True},
            "is_superuser": {"read_only": True},
        }

    def create(self, validated_data):
        try:
            user = User.objects.create_user(
                username=validated_data["username"],
                email=validated_data["email"],
                password=validated_data["password"],
                first_name=validated_data.get("first_name", ""),
                last_name=validated_data.get("last_name", ""),
            )
            logger.info(f"New user created: {user.username}")
            return user
        except Exception as e:
            logger.error(f"Error creating user: {str(e)}")
            raise serializers.ValidationError(f"Error creating user: {str(e)}")

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation.pop("password", None)  # Always remove password
        return representation  # Keep all other fields (including is_superuser)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):

    def validate(self, attrs):

        username = attrs.get("username", "Unknown")
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
            data["user_id"] = self.user.id
            data["username"] = self.user.username
            data["is_staff"] = self.user.is_staff

            logger.info(f"Token generated successfully for user: {username}")
            return data

        except serializers.ValidationError as e:
            logger.error(f"Validation error for user {username}: {str(e)}")
            raise
        except Exception as e:
            print(f"Authentication error: {e}")
            logger.error(
                f"Unexpected error during token validation for user {username}: {str(e)}"
            )
            raise serializers.ValidationError(
                "Authentication failed. Please check your credentials."
            )

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Add custom claims
        token["user_id"] = user.id
        token["username"] = user.username
        token["email"] = user.email
        token["is_staff"] = user.is_staff

        return token


class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    confirm_password = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError("New passwords do not match.")
        return attrs


class AdminSellerSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    product_count = serializers.IntegerField(source="products.count", read_only=True)

    class Meta:
        model = SellerProfile
        fields = [
            "id",
            "username",
            "email",
            "business_name",
            "business_description",
            "contact_phone",
            "contact_email",
            "verification_status",
            "verification_document",
            "rejection_reason",
            "commission_rate",
            "stripe_onboarding_complete",
            "is_active",
            "product_count",
            "created_at",
        ]
        read_only_fields = fields


class SellerApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = SellerProfile
        fields = ["verification_status", "rejection_reason"]

    def validate(self, attrs):
        if attrs.get("verification_status") == SellerProfile.VerificationStatus.REJECTED and not attrs.get(
            "rejection_reason"
        ):
            raise serializers.ValidationError(
                {"rejection_reason": "Required when rejecting a seller."}
            )
        return attrs

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value


class AdminUserSerializer(UserSerializer):
    class Meta(UserSerializer.Meta):
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_active",
            "is_staff",
            "is_superuser",
            "date_joined",
        ]
        read_only_fields = ["id", "date_joined"]
        extra_kwargs = {
            **UserSerializer.Meta.extra_kwargs,
            "is_active": {"read_only": False},  # Must be writable
            "is_staff": {
                "read_only": True,
                "required": False,
            },  # Keep staff status read-only
            "is_superuser": {"read_only": True, "required": False},
            "last_login": {"read_only": True},
        }

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if not self.context.get("is_admin", False):
            # Hide sensitive fields from non-admins
            representation.pop("is_staff", None)
            representation.pop("is_superuser", None)
            representation.pop("last_login", None)
            representation.pop("date_joined", None)
        return representation


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "id",
            "amount",
            "currency",
            "stripe_payment_id",
            "user_email",
            "status",
            "created_at",
        ]


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["first_name", "last_name"]


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = ["id", "product", "product_name", "quantity", "unit_price", "subtotal"]
        read_only_fields = ["unit_price", "subtotal", "product_name"]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    total_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )
    payment_status = serializers.CharField(source="payment.status", read_only=True)
    payment_id = serializers.CharField(
        source="payment.stripe_payment_id", read_only=True
    )
    owner_detail = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "owner",
            "payment",
            "payment_id",
            "payment_status",
            "status",
            "shipping_address",
            "note",
            "items",
            "total_price",
            "created_at",
            "updated_at",
            "owner_detail",
        ]
        read_only_fields = [
            "owner",
            "payment",
            "payment_id",
            "payment_status",
            "total_price",
            "created_at",
            "updated_at",
        ]

    def get_owner_detail(self, obj):
        if obj.owner:
            return {
                "id": obj.owner.id,
                "username": obj.owner.username,
                "email": obj.owner.email,
                "full_name": f"{obj.owner.first_name} {obj.owner.last_name}".strip(),
            }
        return None


class OrderStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ["status"]


class NewUserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    email = serializers.EmailField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    date_joined = serializers.DateTimeField()


class TopProductSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_sold = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=15, decimal_places=2)


class PurchaseSerializer(serializers.Serializer):
    order_id = serializers.IntegerField()
    user_id = serializers.IntegerField()
    username = serializers.CharField()
    product_id = serializers.IntegerField()
    product_name = serializers.CharField()
    quantity = serializers.IntegerField()
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2)
    order_date = serializers.DateTimeField()



class ProductApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ["approval_status", "rejection_reason"]
 
    def validate(self, attrs):
        if attrs.get("approval_status") == Product.ApprovalStatus.REJECTED and not attrs.get(
            "rejection_reason"
        ):
            raise serializers.ValidationError(
                {"rejection_reason": "Required when rejecting a product."}
            )
        return attrs