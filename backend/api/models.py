from django.db import models
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.utils.text import slugify
from django.conf import settings
from django.urls import reverse
from decimal import Decimal
from io import BytesIO
from PIL import Image
import os
# ++++++++++ ADDED THIS IMPORT ++++++++++


# your_app/mixins.py

from django.db import models
from django.core.exceptions import ValidationError
from PIL import Image

class ImageHandlingMixin: 
    """
    An abstract mixin that provides image validation and optimization.
    It is NOT a Django model.
    """
    # Define common validation parameters that can be overridden
    MIN_IMAGE_WIDTH = 400
    MIN_IMAGE_HEIGHT = 400
    MAX_IMAGE_WIDTH = 1600
    MAX_IMAGE_HEIGHT = 1600
    ENFORCE_LANDSCAPE = True

    # This Meta class is no longer needed because it's not a model
    # class Meta:
    #     abstract = True

    def clean_image(self):
        if not hasattr(self, 'image') or not self.image:
            return
        
        try:
            # The rest of your clean_image method is perfect
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
        if not hasattr(self, 'image') or not self.image:
            return
        
        try:
            # The rest of your optimize_image method is perfect
            with Image.open(self.image.path) as img:
                if img.mode in ('RGBA', 'P'):
                    img = img.convert('RGB')

                if img.width > self.MAX_IMAGE_WIDTH or img.height > self.MAX_IMAGE_HEIGHT:
                    ratio = min(self.MAX_IMAGE_WIDTH / img.width, self.MAX_IMAGE_HEIGHT / img.height)
                    new_size = (int(img.width * ratio), int(img.height * ratio))
                    img = img.resize(new_size, Image.LANCZOS)
                
                img.save(self.image.path, quality=85, optimize=True)
        except Exception:
            pass

    def clean(self):
        # The super().clean() call will now correctly refer to the
        # models.Model's clean method from the Product class.
        super().clean()
        self.clean_image()

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
        self.optimize_image()

class CarouselImg(models.Model):
    name = models.CharField(max_length=50, unique=True)
    image = models.ImageField(upload_to='carousel/')
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0, editable=False)
    
    class Meta:
        verbose_name = "Carousel Image"
        verbose_name_plural = "Carousel Images"
        ordering = ['order']
    
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
    
    def optimize_image(self):
        try:
            img_path = self.image.path
            with Image.open(img_path) as img:
                if img.mode in ('RGBA', 'P'):
                    img = img.convert('RGB')
                
                MAX_WIDTH = 1600
                MAX_HEIGHT = 1600
                
                if img.width > MAX_WIDTH or img.height > MAX_HEIGHT:
                    ratio = min(MAX_WIDTH/img.width, MAX_HEIGHT/img.height)
                    new_size = (int(img.width * ratio), int(img.height * ratio))
                    img = img.resize(new_size, Image.LANCZOS)
                
                img.save(img_path, quality=85, optimize=True)
        except Exception:
            pass
    
class Category(models.Model):
    name = models.CharField(max_length=20, unique=True)
    slug = models.SlugField(max_length=21, unique=True , editable=False)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        verbose_name_plural = "Categories"
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)
    
    def get_absolute_url(self):
        return reverse('products_by_category', args=[self.slug])

class Product(models.Model , ImageHandlingMixin):
    MIN_IMAGE_WIDTH = 400
    MIN_IMAGE_HEIGHT = 400
    
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='products'
    )
    image = models.ImageField(
        upload_to='products/',
        blank=False,
        help_text="Upload product image (width must be equal to or greater than height)"
    )
    name = models.CharField(
        max_length=70,
        unique=True,
        help_text="Product name (must be unique)"
    )
    slug = models.SlugField(
        max_length=70,
        unique=True,
        editable=False,
        help_text="URL-friendly version of the name (auto-generated)"
    )
    # ... other fields are fine ...
    category = models.ForeignKey('Category', on_delete=models.SET_NULL, null=True, blank=True, related_name='products', verbose_name="Product Category", help_text="Select product category")
    description = models.TextField(max_length=500, help_text="Detailed product description (max 500 chars)")
    price = models.DecimalField(
            max_digits=10,
            decimal_places=2,
            # +++ 2. USE Decimal('0.01') INSTEAD OF 0.01 +++
            validators=[MinValueValidator(Decimal('0.01'))],
            help_text="Price in USD (min $0.01)"
    )    
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0.01)], help_text="Price in USD (min $0.01)")
    is_active = models.BooleanField(default=True, verbose_name="Active", help_text="Is this product available for sale?")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Creation Date")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Last Updated")
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Product"
        verbose_name_plural = "Products"
    
    def __str__(self):
        return f"{self.name} (${self.price}) {self.is_active}"
    
    
    def save(self, *args, **kwargs):
        # Add your product-specific logic here
        if not self.slug:
            self.slug = slugify(self.name)
        
        # Let the mixin handle the rest (cleaning, saving, optimizing)
        # The super().save() call will now correctly find the mixin's save method.
        super().save(*args, **kwargs)
    
    def get_absolute_url(self):
        return reverse('product_detail', args=[self.slug])
    
    # Your properties are fine
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

class Service(models.Model):
    image = models.ImageField(
        upload_to="services/",
        blank=False,
        help_text="Upload service image (width must be equal to or greater than height)"
    )
    name = models.CharField(
        max_length=50,
        unique=True,
        help_text="Service name (must be unique)"
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Service price in USD (min $0.01)"
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="Active",
        help_text="Is this service currently offered?"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Creation Date"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Last Updated"
    )
    description = models.TextField(
        max_length=500,
        help_text="Detailed service description (max 500 chars)"
    )
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Service"
        verbose_name_plural = "Services"
    
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
                if img.mode in ('RGBA', 'P'):
                    img = img.convert('RGB')
                
                if self.image.size > 10_000_000:  # 10MB
                    max_dimension = 5000
                    if max(img.size) > max_dimension:
                        ratio = max_dimension / max(img.size)
                        new_size = (int(img.width * ratio), int(img.height * ratio))
                        img = img.resize(new_size, Image.LANCZOS)
                
                img.save(img_path, quality=85, optimize=True)
        except Exception:
            pass
    
    def get_absolute_url(self):
        return reverse('service_detail', args=[self.id])
    
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
            return 'square'
        elif width > height:
            return 'landscape'
        return 'unknown'


class Contact(models.Model):
    name = models.CharField(
        max_length=100,
        help_text="Contact name or title"
    )
    value = models.CharField(
        max_length=200,
        help_text="Contact information (phone, email, address, etc.)"
    )
    contact_type = models.CharField(
        max_length=20,
        choices=[
            ('phone', 'Phone'),
            ('email', 'Email'),
            ('address', 'Address'),
            ('social', 'Social Media'),
            ('other', 'Other')
        ],
        default='other',
        help_text="Type of contact information"
    )
    display_order = models.PositiveIntegerField(
        default=0,
        help_text="Order in which contacts should be displayed"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Is this contact information currently active?"
    )

    class Meta:
        ordering = ['display_order', 'name']
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
    amount = models.DecimalField(max_digits=10 , decimal_places=2)
    currency = models.CharField(max_length=10 , default="usd")
    stripe_payment_id = models.CharField(max_length=255 , blank=True ,null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    user_email = models.EmailField()
