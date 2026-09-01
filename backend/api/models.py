import uuid
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.urls import reverse
from django.utils.text import slugify
from PIL import Image
from unidecode import unidecode
from django.core.validators import MinValueValidator, MaxValueValidator
from cloudinary_storage.storage import MediaCloudinaryStorage
from utils.image_compression import compress_image

# Cloudinary's default storage uploads everything as resource_type="image".
# Video bytes must be uploaded as resource_type="video" instead, otherwise
# Cloudinary rejects the file with "BadRequest: Invalid image file".
VIDEO_STORAGE = MediaCloudinaryStorage(resource_type="video")

class ApprovalStatus(models.TextChoices):
    PENDING = "pending", "Pending Review"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
    



class Coupon(models.Model):
    class DiscountType(models.TextChoices):
        FIXED = "fixed", "Fixed Amount"
        PERCENTAGE = "percentage", "Percentage"

    code = models.CharField(max_length=32, unique=True, db_index=True)
    discount_type = models.CharField(
        max_length=10,
        choices=DiscountType.choices,
        default=DiscountType.PERCENTAGE,
    )
    discount_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
        help_text="Fixed amount or percentage (max 100 for percentage)",
    )
    min_order_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Minimum order total to apply this coupon. Leave blank for no minimum.",
    )
    max_discount_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Max discount cap for percentage coupons. Leave blank for unlimited.",
    )
    max_uses_total = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Total number of times this coupon can be used. Leave blank for unlimited.",
    )
    max_uses_per_user = models.PositiveIntegerField(
        default=1,
        help_text="Max times a single user can use this coupon.",
    )
    times_used = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    starts_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_coupons",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.code} ({self.get_discount_type_display()} {self.discount_value})"

    def is_valid(self, user=None, order_total=None):
        from django.utils import timezone
        now = timezone.now()

        if not self.is_active:
            return False, "Coupon is inactive."
        if self.starts_at and now < self.starts_at:
            return False, "Coupon is not yet active."
        if self.expires_at and now > self.expires_at:
            return False, "Coupon has expired."
        if self.max_uses_total is not None and self.times_used >= self.max_uses_total:
            return False, "Coupon usage limit reached."
        if user and user.is_authenticated:
            from django.db.models import Count
            uses = OrderCoupon.objects.filter(coupon=self, order__owner=user).count()
            if uses >= self.max_uses_per_user:
                return False, "You have already used this coupon."
        if order_total is not None and self.min_order_amount is not None:
            if order_total < self.min_order_amount:
                return False, f"Minimum order amount is ${self.min_order_amount}."
        return True, "Valid."

    def calculate_discount(self, subtotal):
        if self.discount_type == self.DiscountType.FIXED:
            return min(self.discount_value, subtotal)
        else:
            discount = (subtotal * self.discount_value) / Decimal("100.00")
            if self.max_discount_amount:
                discount = min(discount, self.max_discount_amount)
            return discount.quantize(Decimal("0.01"))


class SellerOffer(models.Model):
    class OfferType(models.TextChoices):
        PRODUCT = "product", "Product Offer"
        ANNOUNCEMENT = "announcement", "Announcement"
        PROMOTION = "promotion", "Promotion"

    seller = models.ForeignKey(
        "SellerProfile",
        on_delete=models.CASCADE,
        related_name="offers",
    )
    title = models.CharField(max_length=150)
    description = models.TextField(max_length=500, blank=True)
    offer_type = models.CharField(
        max_length=16,
        choices=OfferType.choices,
        default=OfferType.PROMOTION,
    )
    product = models.ForeignKey(
        "Product",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="offers",
        help_text="Link to a specific product (optional for announcements).",
    )
    discount_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.01")), MaxValueValidator(Decimal("100"))],
        help_text="Discount percentage (0-100). Optional.",
    )
    original_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Show original price struck-through. Optional.",
    )
    image = models.ImageField(upload_to="offers/", blank=True)
    is_active = models.BooleanField(default=True)
    starts_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.get_offer_type_display()}) - {self.seller}"


class AdVideo(models.Model):
    """
    A standalone brand/page advertisement video uploaded by a seller. These
    are NOT tied to a product — they surface in the Shorts feed as
    "advertisement" slides for the seller's page.
    """

    seller = models.ForeignKey(
        "SellerProfile",
        on_delete=models.CASCADE,
        related_name="ad_videos",
    )
    title = models.CharField(max_length=150, blank=True)
    description = models.TextField(max_length=400, blank=True)
    video = models.FileField(
        storage=VIDEO_STORAGE,
        upload_to="ads/videos/",
        help_text="Promotional/brand advertisement video shown in the Shorts feed (MP4/WebM).",
    )
    poster = models.ImageField(upload_to="ads/posters/", blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Advertisement Video"
        verbose_name_plural = "Advertisement Videos"

    def __str__(self):
        return f"{self.title or 'Ad video'} - {self.seller}"


class OrderCoupon(models.Model):
    order = models.ForeignKey(
        "Order",
        on_delete=models.CASCADE,
        related_name="coupons_applied",
    )
    coupon = models.ForeignKey(
        Coupon,
        on_delete=models.CASCADE,
    )
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2)
    applied_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["order", "coupon"]

    def __str__(self):
        return f"{self.coupon.code} on Order #{self.order_id} (-${self.discount_amount})"


class SellerPayoutRecord(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        FAILED = "failed", "Failed"

    seller = models.ForeignKey(
        "SellerProfile",
        on_delete=models.CASCADE,
        related_name="payout_records",
    )
    order = models.ForeignKey(
        "Order",
        on_delete=models.CASCADE,
        related_name="seller_payouts",
    )
    gross_amount = models.DecimalField(max_digits=10, decimal_places=2)
    commission_amount = models.DecimalField(max_digits=10, decimal_places=2)
    net_amount = models.DecimalField(max_digits=10, decimal_places=2)
    delivery_type = models.CharField(
        max_length=10,
        choices=[("platform", "Platform"), ("seller", "Seller")],
        default="platform",
    )
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Payout for Order #{self.order_id} to {self.seller.business_name}"


class SellerProfile(models.Model):
    """
    One-to-one extension of User for sellers. Chosen over a plain
    `is_seller` boolean because sellers need extra structured fields
    (business name, verification, payout account, commission override)
    that don't belong on the core User model.
    """
 
    class VerificationStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
 
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="seller_profile",
    )
 
    business_name = models.CharField(max_length=255)
    business_description = models.TextField(blank=True)
    contact_phone = models.CharField(max_length=32)
    contact_email = models.EmailField()
 
    # Verification / moderation
    verification_status = models.CharField(
        max_length=16,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING,
    )
    verification_document = models.URLField(
        blank=True,
        help_text="Cloudinary URL to business registration / ID document.",
    )
    rejection_reason = models.TextField(blank=True)
 
    # Commission: per-seller override. Falls back to platform default
    # (see PlatformSettings below) when null.
    commission_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Percentage (0-100). Leave blank to use platform default.",
    )
 
    # Stripe Connect — populated in Phase 3, fields live here so no
    # further migrations are needed on this model later.
    stripe_account_id = models.CharField(max_length=64, blank=True)
    stripe_onboarding_complete = models.BooleanField(default=False)
    stripe_payouts_enabled = models.BooleanField(default=False)

    # Paymob payout fields
    paymob_account_id = models.CharField(
        max_length=128, blank=True,
        help_text="Paymob merchant/sub-merchant account ID for payouts.",
    )
    paymob_wallet_number = models.CharField(
        max_length=32, blank=True,
        help_text="Mobile wallet number registered with Paymob.",
    )
 
    is_active = models.BooleanField(
        default=True,
        help_text="Platform admin can suspend a seller without deleting their account.",
    )
 
    delivery_type = models.CharField(
        max_length=10,
        choices=[("platform", "Platform Delivery"), ("seller", "Self Delivery")],
        default="platform",
        help_text="Platform: platform handles delivery, takes commission per sale. Seller: seller delivers, pays commission upfront.",
    )
    avatar = models.ImageField(upload_to="seller_avatars/", blank=True)
    cover_image = models.ImageField(upload_to="seller_covers/", blank=True)
    bio = models.TextField(max_length=500, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
 
    class Meta:
        ordering = ["-created_at"]
 
    def __str__(self):
        return f"{self.business_name} ({self.user})"
 
    @property
    def is_approved(self):
        return self.verification_status == self.VerificationStatus.APPROVED
 
    def effective_commission_rate(self):
        if self.commission_rate is not None:
            return self.commission_rate
        settings_obj = PlatformSettings.get_solo()
        return settings_obj.default_commission_rate
 
 
class PlatformSettings(models.Model):
    """
    Singleton row holding marketplace-wide defaults. Used instead of
    Django settings.py so admins can change it at runtime via the
    admin panel without a redeploy.
    """
 
    default_commission_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=10.00,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    auto_approve_products = models.BooleanField(
        default=False,
        help_text="If off, new seller products require admin review before going live.",
    )
    auto_approve_sellers = models.BooleanField(default=False)
 
    class Meta:
        verbose_name = "Platform Settings"
        verbose_name_plural = "Platform Settings"
 
    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)
 
    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
 
    def __str__(self):
        return "Platform Settings"
 
 

# =============================================== #
class ImageHandlingMixin:
    MIN_IMAGE_WIDTH = 400
    MIN_IMAGE_HEIGHT = 400
    MAX_IMAGE_WIDTH = 1600
    MAX_IMAGE_HEIGHT = 1600
    ENFORCE_LANDSCAPE = True

    def clean_image(self):
        if not hasattr(self, "image") or not self.image:
            return

        try:
            with Image.open(self.image) as img:
                width, height = img.size

                if width < self.MIN_IMAGE_WIDTH or height < self.MIN_IMAGE_HEIGHT:
                    raise ValidationError(
                        f"Image must be at least {self.MIN_IMAGE_WIDTH}x{self.MIN_IMAGE_HEIGHT} pixels. "
                        f"Current size: {width}x{height}"
                    )

                if self.ENFORCE_LANDSCAPE and width < height:
                    raise ValidationError(
                        "Image width must be equal to or greater than its height. "
                        f"Current dimensions: {width}x{height}"
                    )
        except Exception as e:
            raise ValidationError(f"Could not process image: {str(e)}")

    def optimize_image(self):
        if not hasattr(self, "image") or not self.image:
            return

        try:
            with Image.open(self.image.path) as img:
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")

                if (
                    img.width > self.MAX_IMAGE_WIDTH
                    or img.height > self.MAX_IMAGE_HEIGHT
                ):
                    ratio = min(
                        self.MAX_IMAGE_WIDTH / img.width,
                        self.MAX_IMAGE_HEIGHT / img.height,
                    )
                    new_size = (int(img.width * ratio), int(img.height * ratio))
                    img = img.resize(new_size, Image.LANCZOS)

                img.save(self.image.path, quality=85, optimize=True)
        except Exception:
            pass

    def clean(self):
        super().clean()
        self.clean_image()

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
        self.optimize_image()


class CarouselImg(models.Model):
    name = models.CharField(max_length=50, unique=True)
    image = models.ImageField(upload_to="carousel/")
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0, editable=False)

    class Meta:
        verbose_name = "Carousel Image"
        verbose_name_plural = "Carousel Images"
        ordering = ["order"]

    def clean(self):
        super().clean()

        if self.image:
            try:
                with Image.open(self.image) as img:
                    width, height = img.size

                    MIN_WIDTH = 800
                    MIN_HEIGHT = 600
                    if width < MIN_WIDTH or height < MIN_HEIGHT:
                        raise ValidationError(
                            f"Image must be at least {MIN_WIDTH}x{MIN_HEIGHT} pixels. "
                            f"Current size: {width}x{height}"
                        )

                    if width < height:
                        raise ValidationError(
                            "Product image width must be equal to or greater than height. "
                            f"Current dimensions: {width}x{height}"
                        )

                    MAX_RATIO = 2.0
                    if height > 0 and width / height > MAX_RATIO:
                        raise ValidationError(
                            "Image is too wide. Width should not exceed twice the height. "
                            f"Current ratio: {round(width/height, 1)}:1"
                        )

            except Exception as e:
                raise ValidationError(f"Could not process image: {str(e)}")

    def save(self, *args, **kwargs):
        # Compress main image before saving
        if self.image:
            self.image = compress_image(
                self.image, quality=85, max_width=1920, max_height=1080
            )

        super().save(*args, **kwargs)

    def optimize_image(self):
        try:
            img_path = self.image.path
            with Image.open(img_path) as img:
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")

                MAX_WIDTH = 1600
                MAX_HEIGHT = 1600

                if img.width > MAX_WIDTH or img.height > MAX_HEIGHT:
                    ratio = min(MAX_WIDTH / img.width, MAX_HEIGHT / img.height)
                    new_size = (int(img.width * ratio), int(img.height * ratio))
                    img = img.resize(new_size, Image.LANCZOS)

                img.save(img_path, quality=85, optimize=True)
        except Exception:
            pass

    def __str__(self):
        return self.name


class Category(models.Model):
    name = models.CharField(max_length=20, unique=True)
    slug = models.SlugField(max_length=21, unique=True, editable=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]  # ✅ Order by name
        verbose_name_plural = "Categories"
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            # Convert Arabic to transliterated text, then slugify
            transliterated = unidecode(self.name)
            self.slug = slugify(transliterated)

            # If slug still exists, add a number
            original_slug = self.slug
            counter = 1
            while Category.objects.filter(slug=self.slug).exists():
                self.slug = f"{original_slug}-{counter}"
                counter += 1

        super().save(*args, **kwargs)

    def get_absolute_url(self):
        return reverse("products_by_category", args=[self.slug])


class Tag(models.Model):
    name = models.CharField(max_length=30, unique=True)
    slug = models.SlugField(max_length=21, unique=True, editable=False)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ["name"] 
        verbose_name_plural = "Tags"
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["is_active"]),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            # Convert Arabic to transliterated text, then slugify
            transliterated = unidecode(self.name)
            self.slug = slugify(transliterated)

            # If slug still exists, add a number
            original_slug = self.slug
            counter = 1
            while Category.objects.filter(slug=self.slug).exists():
                self.slug = f"{original_slug}-{counter}"
                counter += 1

        super().save(*args, **kwargs)

    def get_absolute_url(self):
        return reverse("products_by_category", args=[self.slug])


class Product(models.Model, ImageHandlingMixin):

    MIN_IMAGE_WIDTH = 400
    MIN_IMAGE_HEIGHT = 400
    approval_status = models.CharField(
        max_length=16,
        choices=ApprovalStatus.choices,
        default=ApprovalStatus.APPROVED,  # existing products stay live — see note below
        db_index=True,
    )
    rejection_reason = models.TextField(blank=True)
    seller = models.ForeignKey(
        "SellerProfile",
        on_delete=models.SET_NULL,
        null=True,
        related_name="products",
        help_text="The seller who owns this listing.",
    )
    tags = models.ManyToManyField(
        "Tag", related_name="products", blank=True, help_text="Select product tags"
    )
    image = models.ImageField(
        upload_to="products/",
        blank=False,
        help_text="Upload product image (width must be equal to or greater than height)",
    )
    video = models.FileField(
        storage=VIDEO_STORAGE,
        upload_to="products/videos/",
        blank=True,
        help_text="Optional promotional video (MP4/WebM) shown in the Shorts feed.",
    )
    name = models.CharField(
        max_length=70, unique=True, help_text="Product name (must be unique)"
    )
    slug = models.SlugField(
        max_length=70,
        unique=True,
        editable=False,
        help_text="URL-friendly version of the name (auto-generated)",
    )
    category = models.ForeignKey(
        "Category",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
        verbose_name="Product Category",
        help_text="Select product category",
    )
    description = models.TextField(
        max_length=500, help_text="Detailed product description (max 500 chars)"
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
        help_text="Price in USD (min $0.01)",
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="Active",
        help_text="Is this product available for sale?",
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Creation Date")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Last Updated")

    indexes = [
        models.Index(fields=["slug"]),
        models.Index(fields=["category"]),
        models.Index(fields=["seller"]),
        models.Index(fields=["is_active", "-created_at"]),
        models.Index(fields=["name"]),
    ]

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Product"
        verbose_name_plural = "Products"

    def __str__(self):
        return f"{self.name} (${self.price}) {self.is_active}"

    def save(self, *args, **kwargs):
        if not self.slug or self.slug == "":
            # Create base slug from name
            if self.name:
                # Convert Arabic to ASCII
                ascii_name = unidecode(str(self.name))
                base_slug = slugify(ascii_name)

                # If slug is empty after processing, use a fallback
                if not base_slug or base_slug == "":
                    base_slug = "product"

                # Make slug unique
                self.slug = base_slug
                counter = 1
                original_slug = self.slug

                while (
                    Product.objects.filter(slug=self.slug).exclude(pk=self.pk).exists()
                ):
                    self.slug = f"{original_slug}-{counter}"
                    counter += 1
                    # Prevent infinite loop
                    if counter > 100:
                        self.slug = f"{original_slug}-{uuid.uuid4().hex[:8]}"
                        break
            else:
                # If no name, generate unique slug
                self.slug = f"product-{uuid.uuid4().hex[:8]}"
        else:
            # If slug already exists but belongs to another product
            if Product.objects.filter(slug=self.slug).exclude(pk=self.pk).exists():
                base_slug = (
                    slugify(unidecode(str(self.name))) if self.name else "product"
                )
                self.slug = f"{base_slug}-{uuid.uuid4().hex[:8]}"

        super().save(*args, **kwargs)
    ApprovalStatus = ApprovalStatus 

    def get_absolute_url(self):
        return reverse("product_detail", args=[self.slug])

    @property
    def dimensions(self):
        try:
            with Image.open(self.image.path) as img:
                return img.size
        except:
            return (0, 0)

    @property
    def aspect_ratio(self):
        width, height = self.dimensions
        return round(width / height, 2) if height else 0

    @property
    def like_count(self):
        return self.likes.count()

    @property
    def dislike_count(self):
        return self.dislikes.count()

    @property
    def comment_count(self):
        return self.comments.count()

    @property
    def average_rating(self):
        ratings = self.reviews.values_list("rating", flat=True)
        if not ratings:
            return 0
        return round(sum(ratings) / len(ratings), 1)


class ProductImage(models.Model, ImageHandlingMixin):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="gallery_images")
    image = models.ImageField(upload_to="products/gallery/", help_text="Upload gallery image")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        verbose_name = "Product Image"
        verbose_name_plural = "Product Images"

    def __str__(self):
        return f"Image for {self.product.name}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.image:
            self.optimize_image()


class ProductVideo(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="gallery_videos",
        help_text="Product gallery video (shown alongside gallery images).",
    )
    video = models.FileField(
        storage=VIDEO_STORAGE,
        upload_to="products/gallery/videos/",
        help_text="Optional gallery video for this product (MP4/WebM).",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        verbose_name = "Product Video"
        verbose_name_plural = "Product Videos"

    def __str__(self):
        return f"Video for {self.product.name}"


class Service(models.Model):
    image = models.ImageField(
        upload_to="services/",
        blank=False,
        help_text="Upload service image (width must be equal to or greater than height)",
    )
    name = models.CharField(
        max_length=50, unique=True, help_text="Service name (must be unique)"
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
        help_text="Service price in USD (min $0.01)",
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="Active",
        help_text="Is this service currently offered?",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Creation Date")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Last Updated")
    description = models.TextField(
        max_length=500, help_text="Detailed service description (max 500 chars)"
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Service"
        verbose_name_plural = "Services"
        indexes = [
            models.Index(fields=["is_active"]),
            models.Index(fields=["price"]),
        ]

    def __str__(self):
        return f"{self.name} (${self.price})"

    def clean(self):
        super().clean()

        if self.image:
            try:
                with Image.open(self.image) as img:
                    width, height = img.size

                    if width < height:
                        raise ValidationError(
                            "Service image width must be equal to or greater than height. "
                            f"Current dimensions: {width}x{height} (ratio: {round(width/height, 2) if height else 0}:1)"
                        )

            except Exception as e:
                raise ValidationError(f"Could not process image: {str(e)}")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

        if self.image:
            self.optimize_image()

    def optimize_image(self):
        try:
            img_path = self.image.path
            with Image.open(img_path) as img:
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")

                if self.image.size > 10_000_000:
                    max_dimension = 5000
                    if max(img.size) > max_dimension:
                        ratio = max_dimension / max(img.size)
                        new_size = (int(img.width * ratio), int(img.height * ratio))
                        img = img.resize(new_size, Image.LANCZOS)

                img.save(img_path, quality=85, optimize=True)
        except Exception:
            pass

    def get_absolute_url(self):
        return reverse("service_detail", args=[self.id])

    @property
    def dimensions(self):
        try:
            with Image.open(self.image.path) as img:
                return img.size
        except:
            return (0, 0)

    @property
    def aspect_ratio(self):
        width, height = self.dimensions
        return round(width / height, 2) if height else 0

    @property
    def orientation(self):
        width, height = self.dimensions
        if width == height:
            return "square"
        elif width > height:
            return "landscape"
        return "unknown"


class Contact(models.Model):
    name = models.CharField(max_length=100, help_text="Contact name or title")
    value = models.CharField(
        max_length=200, help_text="Contact information (phone, email, address, etc.)"
    )
    contact_type = models.CharField(
        max_length=20,
        choices=[
            ("phone", "Phone"),
            ("email", "Email"),
            ("address", "Address"),
            ("social", "Social Media"),
            ("other", "Other"),
        ],
        default="other",
        help_text="Type of contact information",
    )
    display_order = models.PositiveIntegerField(
        default=0, help_text="Order in which contacts should be displayed"
    )
    is_active = models.BooleanField(
        default=True, help_text="Is this contact information currently active?"
    )

    class Meta:
        ordering = ["display_order", "name"]
        verbose_name = "Contact"
        verbose_name_plural = "Contacts"

    def __str__(self):
        return f"{self.name}: {self.value}"

    def clean(self):
        super().clean()

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class Payment(models.Model):

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"

    class Method(models.TextChoices):
        STRIPE = "stripe", "Stripe"
        PAYMOB = "paymob", "Paymob"
        FAWRY = "fawry", "Fawry"

    method = models.CharField(max_length=16, choices=Method.choices, default=Method.STRIPE)
    provider_payment_id = models.CharField(max_length=255, blank=True, db_index=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default="EGP")
    stripe_payment_id = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    user_email = models.EmailField()
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="payments",
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    stripe_client_secret = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="PaymentIntent client_secret — sent to frontend only, never logged",
    )
    raw_response = models.JSONField(
        blank=True, null=True, help_text="Raw response from payment provider"
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["owner", "-created_at"]),
            models.Index(fields=["status"]),
            models.Index(fields=["stripe_payment_id"]),
            models.Index(fields=["provider_payment_id"]),
        ]

    def __str__(self):
        return f"Payment {self.provider_payment_id or self.stripe_payment_id} — {self.get_status_display()} — {self.amount} {self.currency.upper()}"

    @property
    def is_successful(self):
        return self.status == self.Status.SUCCESS


class Order(models.Model):

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        PROCESSING = "processing", "Processing"
        SHIPPED = "shipped", "Shipped"
        DELIVERED = "delivered", "Delivered"
        CANCELLED = "cancelled", "Cancelled"
        REFUNDED = "refunded", "Refunded"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="orders",  # user.orders.all()
    )
    payment = models.OneToOneField(
        Payment,
        on_delete=models.SET_NULL,  # or models.CASCADE
        null=True,  # Allow orders without payment initially
        blank=True,
        related_name="order",  # This is the reverse accessor from Payment to Order
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,  # confirmed only after payment webhook/callback
        db_index=True,
    )
    shipping_address = models.TextField(blank=True)
    note = models.TextField(blank=True)
    delivery_type = models.CharField(
        max_length=10,
        choices=[("platform", "Platform"), ("seller", "Seller")],
        default="platform",
    )
    delivery_fee = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text="Shipping fee calculated via delivery provider.",
    )
    subtotal_before_discount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text="Total before coupon discount.",
    )
    discount_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text="Total coupon discount applied.",
    )
    total_commission = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text="Platform commission earned from this order.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["owner", "-created_at"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"Order #{self.pk} — {self.owner_name()} — {self.get_status_display()}"

    @property
    def total_price(self):
        items_total = sum(item.subtotal for item in self.items.all())
        return items_total - self.discount_amount + self.delivery_fee

    @property
    def total_before_discount(self):
        return sum(item.subtotal for item in self.items.all())

    def owner_name(self):
        """Return owner's username or full name as string"""
        if self.owner:
            return self.owner.username  # or self.owner.get_full_name()
        return "No owner assigned"

    def owner_username(self):
        """Return owner's username or 'Guest' if no owner"""
        return self.owner.username if self.owner else "Guest"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(
        "Product", on_delete=models.SET_NULL, null=True, related_name="order_items"
    )
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(
        max_digits=10, decimal_places=2, default=0
    )  # ✅ Real DB column
    platform_fee = models.DecimalField(
        max_digits=10, decimal_places=2, default=0
    )
    seller_payout = models.DecimalField(
        max_digits=10, decimal_places=2, default=0
    )

    def save(self, *args, **kwargs):
        self.subtotal = self.unit_price * self.quantity
        
        if self.product and self.product.seller:
            seller = self.product.seller
            commission_rate = seller.effective_commission_rate()
            if seller.delivery_type == "seller":
                commission_rate = commission_rate * Decimal("0.5")
            fee = (self.subtotal * commission_rate) / Decimal("100.00")
            self.platform_fee = fee.quantize(Decimal("0.01"))
            self.seller_payout = self.subtotal - self.platform_fee
        else:
            self.platform_fee = self.subtotal
            self.seller_payout = Decimal('0.00')
            
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.quantity} × {self.product} in Order #{self.order_id}"


# ===============================================
# WISHLIST
# ===============================================

class WishlistItem(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="wishlist_items",
    )
    product = models.ForeignKey(
        "Product",
        on_delete=models.CASCADE,
        related_name="wishlisted_by",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "product")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} → {self.product}"


# ===============================================
# PRODUCT REVIEWS
# ===============================================

class Review(models.Model):
    class Rating(models.IntegerChoices):
        ONE = 1, "1"
        TWO = 2, "2"
        THREE = 3, "3"
        FOUR = 4, "4"
        FIVE = 5, "5"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    product = models.ForeignKey(
        "Product",
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    rating = models.PositiveSmallIntegerField(
        choices=Rating.choices,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    title = models.CharField(max_length=255, blank=True)
    comment = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "product")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} → {self.product} ({self.rating}★)"

    @property
    def star_display(self):
        return self.rating


# ===============================================
# SELLER EARNINGS
# ===============================================

class SellerEarning(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        WITHDRAWN = "withdrawn", "Withdrawn"

    seller = models.ForeignKey(
        "SellerProfile",
        on_delete=models.CASCADE,
        related_name="earnings",
    )
    order = models.ForeignKey(
        "Order",
        on_delete=models.CASCADE,
        related_name="earnings",
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    platform_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.seller} earned {self.amount} from Order #{self.order_id}"


# ===============================================
# NOTIFICATIONS
# ===============================================

class Notification(models.Model):
    class Type(models.TextChoices):
        ORDER_CONFIRMED = "order_confirmed", "Order Confirmed"
        ORDER_SHIPPED = "order_shipped", "Order Shipped"
        ORDER_DELIVERED = "order_delivered", "Order Delivered"
        ORDER_CANCELLED = "order_cancelled", "Order Cancelled"
        PAYMENT_RECEIVED = "payment_received", "Payment Received"
        SELLER_APPROVED = "seller_approved", "Seller Approved"
        SELLER_REJECTED = "seller_rejected", "Seller Rejected"
        PRODUCT_APPROVED = "product_approved", "Product Approved"
        PRODUCT_REJECTED = "product_rejected", "Product Rejected"
        PAYOUT_PROCESSED = "payout_processed", "Payout Processed"
        SYSTEM = "system", "System"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    notification_type = models.CharField(
        max_length=30,
        choices=Type.choices,
        default=Type.SYSTEM,
        db_index=True,
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    link = models.CharField(max_length=500, blank=True, help_text="Frontend URL to navigate to")
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} — {self.notification_type} — {self.title}"

    @property
    def icon(self):
        icons = {
            "order_confirmed": "check-circle",
            "order_shipped": "truck",
            "order_delivered": "package",
            "order_cancelled": "x-circle",
            "payment_received": "banknote",
            "seller_approved": "party-popper",
            "seller_rejected": "alert-triangle",
            "product_approved": "check-circle",
            "product_rejected": "alert-triangle",
            "payout_processed": "arrow-down-circle",
            "system": "bell",
        }
        return icons.get(self.notification_type, "bell")


# ===============================================
# PRODUCT LIKES  (love / heart a product)
# ===============================================

# Order statuses that count as "the user bought this product".
BOUGHT_ORDER_STATUSES = ("confirmed", "processing", "shipped", "delivered")

class ProductLike(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="product_likes",
    )
    product = models.ForeignKey(
        "Product",
        on_delete=models.CASCADE,
        related_name="likes",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "product")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} ♥ {self.product}"


# ===============================================
# PRODUCT DISLIKES  (thumbs-down, buyers only)
# ===============================================

class ProductDislike(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="product_dislikes",
    )
    product = models.ForeignKey(
        "Product",
        on_delete=models.CASCADE,
        related_name="dislikes",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "product")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} 👎 {self.product}"


# ===============================================
# PRODUCT COMMENTS
# ===============================================

class ProductComment(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="product_comments",
    )
    product = models.ForeignKey(
        "Product",
        on_delete=models.CASCADE,
        related_name="comments",
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.user} — {self.product}: {self.content[:40]}"


# ===============================================
# SELLER FOLLOWERS  (follow a seller to see newest offers)
# ===============================================

class SellerFollower(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="following_sellers",
    )
    seller = models.ForeignKey(
        "SellerProfile",
        on_delete=models.CASCADE,
        related_name="followers",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "seller")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} follows {self.seller}"