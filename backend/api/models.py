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
from utils.image_compression import compress_image

class ApprovalStatus(models.TextChoices):
    PENDING = "pending", "Pending Review"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
    



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
 
    is_active = models.BooleanField(
        default=True,
        help_text="Platform admin can suspend a seller without deleting their account.",
    )
 
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

    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default="usd")
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
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["owner", "-created_at"]),
            models.Index(fields=["status"]),
            models.Index(fields=["stripe_payment_id"]),
        ]

    def __str__(self):
        return f"Payment {self.stripe_payment_id} — {self.get_status_display()} — {self.amount} {self.currency.upper()}"

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
        default=Status.CONFIRMED,  # starts confirmed because payment passed
        db_index=True,
    )
    shipping_address = models.TextField(blank=True)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["owner", "-created_at"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        # Use owner_name property to display string instead of ID
        return f"Order #{self.pk} — {self.owner_name()} — {self.get_status_display()}"

    @property
    def total_price(self):
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
        self.subtotal = self.unit_price * self.quantity  # Keep in sync on save
        
        # Calculate commission if product is associated with a seller
        if self.product and self.product.seller:
            commission_rate = self.product.seller.effective_commission_rate()
            # Calculate fee as (subtotal * commission_rate / 100)
            fee = (self.subtotal * commission_rate) / Decimal('100.00')
            self.platform_fee = fee.quantize(Decimal('0.01'))
            self.seller_payout = self.subtotal - self.platform_fee
        else:
            self.platform_fee = self.subtotal
            self.seller_payout = Decimal('0.00')
            
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.quantity} × {self.product} in Order #{self.order_id}"