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
    user_username = serializers.CharField(source="user.username", read_only=True)
    effective_commission_rate = serializers.SerializerMethodField()

    def get_effective_commission_rate(self, obj):
        return str(obj.effective_commission_rate())

    class Meta:
        model = SellerProfile
        fields = [
            "id",
            "email",
            "user_username",
            "business_name",
            "business_description",
            "contact_phone",
            "contact_email",
            "verification_status",
            "rejection_reason",
            "avatar",
            "cover_image",
            "bio",
            "delivery_type",
            "commission_rate",
            "effective_commission_rate",
            "paymob_account_id",
            "paymob_wallet_number",
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


class ProductVideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVideo
        fields = ["id", "video"]


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
    gallery_videos = ProductVideoSerializer(many=True, read_only=True)
    uploaded_videos = serializers.ListField(
        child=serializers.FileField(allow_empty_file=False, use_url=False),
        write_only=True,
        required=False
    )
    video = serializers.FileField(allow_empty_file=False, required=False)
    seller_name = serializers.CharField(source="seller.business_name", read_only=True)
    seller_avatar = serializers.ImageField(source="seller.avatar", read_only=True, default="")
    seller_verified = serializers.SerializerMethodField()
    effective_price = serializers.SerializerMethodField()
    like_count = serializers.ReadOnlyField()
    dislike_count = serializers.ReadOnlyField()
    comment_count = serializers.ReadOnlyField()
    average_rating = serializers.ReadOnlyField()
    sold_today = serializers.IntegerField(read_only=True, default=0)
    is_liked = serializers.SerializerMethodField()
    is_disliked = serializers.SerializerMethodField()
    is_bought = serializers.SerializerMethodField()
    is_own_seller = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "description",
            "price",
            "effective_price",
            "image",
            "video",
            "gallery_images",
            "uploaded_images",
            "gallery_videos",
            "uploaded_videos",
            "category",
            "tags",
            "is_active",
            "seller",
            "seller_name",
            "seller_avatar",
            "seller_verified",
            "approval_status",
            "rejection_reason",
            "like_count",
            "dislike_count",
            "comment_count",
            "average_rating",
            "sold_today",
            "is_liked",
            "is_disliked",
            "is_bought",
            "is_own_seller",
        ]
        read_only_fields = ["seller", "seller_name", "seller_avatar", "approval_status", "rejection_reason"]

    def get_seller_verified(self, obj):
        seller = obj.seller
        return bool(seller and seller.verification_status == "approved")

    def get_is_liked(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and user.is_authenticated:
            return ProductLike.objects.filter(user=user, product=obj).exists()
        return False

    def get_is_disliked(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and user.is_authenticated:
            return ProductDislike.objects.filter(user=user, product=obj).exists()
        return False

    def get_is_bought(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and user.is_authenticated:
            return OrderItem.objects.filter(
                order__owner=user,
                product=obj,
                order__status__in=BOUGHT_ORDER_STATUSES,
            ).exists()
        return False

    def get_is_own_seller(self, obj):
        current_seller_id = self.context.get("current_seller_id")
        if current_seller_id is not None:
            return obj.seller_id == current_seller_id
        return False

    def get_effective_price(self, obj):
        from django.utils import timezone
        from django.db.models import Q
        now = timezone.now()
        time_filter = Q(starts_at__isnull=True) | Q(starts_at__lte=now)
        expiry_filter = Q(expires_at__isnull=True) | Q(expires_at__gte=now)
        # 1) Product-specific active offer
        offer = SellerOffer.objects.filter(
            product=obj, is_active=True,
        ).filter(time_filter, expiry_filter).first()
        # 2) Seller-wide offer (no product = applies to ALL seller products)
        if not offer and obj.seller_id:
            offer = SellerOffer.objects.filter(
                seller_id=obj.seller_id,
                product__isnull=True,
                is_active=True,
            ).filter(time_filter, expiry_filter).first()
        if offer and offer.discount_percent:
            discount = offer.discount_percent / 100
            return str(obj.price * (1 - discount))
        return None

    def create(self, validated_data):
        # Extract extra data
        tags = validated_data.pop("tags", [])
        uploaded_images = validated_data.pop("uploaded_images", [])
        uploaded_videos = validated_data.pop("uploaded_videos", [])

        # Create the product
        product = Product.objects.create(**validated_data)

        # Handle tags
        if tags:
            product.tags.set(tags)

        # Handle uploaded gallery images
        for image in uploaded_images:
            ProductImage.objects.create(product=product, image=image)

        # Handle uploaded gallery videos
        for fvideo in uploaded_videos:
            ProductVideo.objects.create(product=product, video=fvideo)

        return product

    def update(self, instance, validated_data):
        tags = validated_data.pop("tags", None)
        uploaded_images = validated_data.pop("uploaded_images", [])
        uploaded_videos = validated_data.pop("uploaded_videos", [])

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

        # Add new uploaded gallery videos
        for fvideo in uploaded_videos:
            ProductVideo.objects.create(product=instance, video=fvideo)

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


class CouponSerializer(serializers.ModelSerializer):
    is_valid_coupon = serializers.SerializerMethodField()

    class Meta:
        model = Coupon
        fields = [
            "id", "code", "discount_type", "discount_value",
            "min_order_amount", "max_discount_amount",
            "max_uses_total", "max_uses_per_user", "times_used",
            "is_active", "starts_at", "expires_at", "created_at",
            "is_valid_coupon",
        ]
        read_only_fields = ["times_used", "created_at"]

    def get_is_valid_coupon(self, obj):
        user = self.context.get("request", None)
        user_obj = user.user if user else None
        valid, _ = obj.is_valid(user=user_obj)
        return valid


class CouponValidateSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=32)
    order_total = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)

    def validate_code(self, value):
        try:
            coupon = Coupon.objects.get(code__iexact=value)
        except Coupon.DoesNotExist:
            raise serializers.ValidationError("Invalid coupon code.")
        return coupon


class SellerOfferSerializer(serializers.ModelSerializer):
    seller_name = serializers.CharField(source="seller.business_name", read_only=True)
    seller_avatar = serializers.ImageField(source="seller.avatar", read_only=True)
    seller_verified = serializers.SerializerMethodField()

    class Meta:
        model = SellerOffer
        fields = [
            "id", "seller", "seller_name", "seller_avatar", "seller_verified",
            "title", "description", "offer_type", "product",
            "discount_percent", "original_price", "image",
            "is_active", "starts_at", "expires_at", "created_at",
        ]
        read_only_fields = ["seller", "created_at"]

    def get_seller_verified(self, obj):
        seller = obj.seller
        return bool(seller and seller.verification_status == "approved")

    def validate(self, attrs):
        offer_type = attrs.get("offer_type", self.instance and self.instance.offer_type)
        if offer_type in ("product", "promotion") and not attrs.get("product") and not (self.instance and self.instance.product):
            pass  # Allow product to be optional for promotions
        return attrs


class AdVideoSerializer(serializers.ModelSerializer):
    seller_name = serializers.CharField(source="seller.business_name", read_only=True)
    seller_avatar = serializers.ImageField(source="seller.avatar", read_only=True, default="")
    seller_verified = serializers.SerializerMethodField()
    is_own_seller = serializers.SerializerMethodField()
    kind = serializers.SerializerMethodField()

    class Meta:
        model = AdVideo
        fields = [
            "id", "seller", "seller_name", "seller_avatar", "seller_verified",
            "title", "description", "video", "poster", "is_active",
            "kind", "is_own_seller", "created_at",
        ]
        read_only_fields = ["seller", "created_at"]

    def get_kind(self, obj):
        return "ad"

    def get_seller_verified(self, obj):
        seller = obj.seller
        return bool(seller and seller.verification_status == "approved")

    def get_is_own_seller(self, obj):
        current_seller_id = self.context.get("current_seller_id")
        if current_seller_id is not None:
            return obj.seller_id == current_seller_id
        return False


class SellerPublicProfileSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source="user.username", read_only=True)
    product_count = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    is_followed = serializers.SerializerMethodField()
    is_self = serializers.SerializerMethodField()

    class Meta:
        model = SellerProfile
        fields = [
            "id", "user_username", "business_name", "business_description",
            "avatar", "cover_image", "bio", "delivery_type",
            "created_at", "product_count", "average_rating",
            "followers_count", "following_count", "is_followed", "is_self",
        ]

    def get_product_count(self, obj):
        return obj.products.filter(is_active=True, approval_status="approved").count()

    def get_average_rating(self, obj):
        return None

    def get_followers_count(self, obj):
        return obj.followers.count()

    def get_following_count(self, obj):
        return SellerFollower.objects.filter(user=obj.user).count()

    def get_is_followed(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and user.is_authenticated:
            return SellerFollower.objects.filter(user=user, seller=obj).exists()
        return False

    def get_is_self(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and user.is_authenticated:
            seller_id = getattr(getattr(user, "seller_profile", None), "id", None)
            return seller_id is not None and obj.id == seller_id
        return False


class SellerDeliveryUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SellerProfile
        fields = ["delivery_type"]

    def validate_delivery_type(self, value):
        if value not in ("platform", "seller"):
            raise serializers.ValidationError("Must be 'platform' or 'seller'.")
        return value


class OrderSerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    owner_name = serializers.CharField(read_only=True)
    coupons_applied = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id", "owner", "status", "shipping_address", "note",
            "delivery_type", "delivery_fee", "subtotal_before_discount", "discount_amount",
            "total_commission", "total_price", "owner_name",
            "items", "coupons_applied", "created_at", "updated_at",
        ]
        read_only_fields = ["owner", "subtotal_before_discount", "discount_amount", "total_commission"]

    def get_items(self, obj):
        from .models import OrderItem
        items = OrderItem.objects.filter(order=obj).select_related("product")
        return OrderItemSerializer(items, many=True).data

    def get_coupons_applied(self, obj):
        from .models import OrderCoupon
        order_coupons = OrderCoupon.objects.filter(order=obj).select_related("coupon")
        return [
            {
                "code": oc.coupon.code,
                "discount_amount": str(oc.discount_amount),
            }
            for oc in order_coupons
        ]


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            "id", "product", "product_name", "quantity",
            "unit_price", "subtotal", "platform_fee", "seller_payout",
        ]


class SellerPayoutSerializer(serializers.ModelSerializer):
    seller_name = serializers.CharField(source="seller.business_name", read_only=True)

    class Meta:
        model = SellerPayoutRecord
        fields = [
            "id", "seller", "seller_name", "order",
            "gross_amount", "commission_amount", "net_amount",
            "delivery_type", "status", "created_at", "paid_at",
        ]
        read_only_fields = ["created_at"]


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
    commission_rate = serializers.DecimalField(max_digits=5, decimal_places=2, required=False)

    class Meta:
        model = SellerProfile
        fields = ["verification_status", "rejection_reason", "commission_rate"]

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


class AdminOrderSerializer(serializers.ModelSerializer):
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
            "delivery_type",
            "delivery_fee",
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


# ===============================================
# WISHLIST SERIALIZERS
# ===============================================

class WishlistItemSerializer(serializers.ModelSerializer):
    product_detail = ProductSerializer(source="product", read_only=True)

    class Meta:
        model = WishlistItem
        fields = ["id", "product", "product_detail", "created_at"]
        read_only_fields = ["created_at"]


class WishlistAddSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()


# ===============================================
# REVIEW SERIALIZERS
# ===============================================

class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.username", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = Review
        fields = [
            "id", "user", "user_name", "product", "product_name",
            "rating", "title", "comment", "is_active",
            "created_at", "updated_at",
        ]
        read_only_fields = ["user", "is_active", "created_at", "updated_at"]

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value


class ReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ["rating", "title", "comment"]

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value


class ProductReviewStatsSerializer(serializers.Serializer):
    average_rating = serializers.FloatField()
    total_reviews = serializers.IntegerField()
    rating_distribution = serializers.DictField()


# ===============================================
# NOTIFICATION SERIALIZERS
# ===============================================

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id", "notification_type", "title", "message",
            "link", "is_read", "icon", "created_at",
        ]
        read_only_fields = ["created_at"]


class NotificationCountSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    unread = serializers.IntegerField()


# ===============================================
# PRODUCT LIKES / COMMENTS / SELLER FOLLOW SERIALIZERS
# ===============================================

class ProductCommentSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(read_only=True)
    user_name = serializers.SerializerMethodField()
    user_avatar = serializers.SerializerMethodField()

    class Meta:
        model = ProductComment
        fields = ["id", "product", "content", "user_id", "user_name", "user_avatar", "created_at"]
        read_only_fields = ["created_at"]

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def get_user_avatar(self, obj):
        try:
            avatar = getattr(obj.user, "profile", None)
            if avatar and avatar.avatar:
                return self.context.get("request").build_absolute_uri(avatar.avatar.url)
        except Exception:
            pass
        return ""


class ProductCommentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductComment
        fields = ["product", "content"]

    def validate_content(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Comment cannot be empty.")
        return value


# ===============================================
# SELLER SEARCH SERIALIZER
# ===============================================

class SellerSearchSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source="user.username", read_only=True)
    product_count = serializers.SerializerMethodField()
    followers_count = serializers.SerializerMethodField()
    is_followed = serializers.SerializerMethodField()
    is_self = serializers.SerializerMethodField()
    verified = serializers.SerializerMethodField()

    class Meta:
        model = SellerProfile
        fields = [
            "id", "user_username", "business_name", "bio",
            "avatar", "cover_image", "verified", "product_count", "followers_count",
            "is_followed", "is_self",
        ]

    def get_product_count(self, obj):
        return obj.products.filter(is_active=True, approval_status="approved").count()

    def get_followers_count(self, obj):
        return obj.followers.count()

    def get_is_followed(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and user.is_authenticated:
            return SellerFollower.objects.filter(user=user, seller=obj).exists()
        return False

    def get_is_self(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and user.is_authenticated:
            seller_id = getattr(getattr(user, "seller_profile", None), "id", None)
            return seller_id is not None and obj.id == seller_id
        return False

    def get_verified(self, obj):
        return obj.verification_status == "approved"