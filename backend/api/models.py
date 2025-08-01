from django.db import models
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from django.utils.text import slugify
from django.urls import reverse
from django.db.models import Max
from PIL import Image
from io import BytesIO
from django.core.files.base import ContentFile
import os
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
        """Validate image dimensions and aspect ratio"""
        super().clean()
        
        if self.image:
            try:
                with Image.open(self.image) as img:
                    width, height = img.size
                    
                    # Minimum dimensions
                    MIN_WIDTH = 800
                    MIN_HEIGHT = 600
                    if width < MIN_WIDTH or height < MIN_HEIGHT:
                        raise ValidationError(
                            f"Image must be at least {MIN_WIDTH}x{MIN_HEIGHT} pixels. "
                            f"Current size: {width}x{height}"
                        )
                    
                    # Width must be equal to or greater than height
                    if width < height:
                        raise ValidationError(
                            "Product image width must be equal to or greater than height. "
                            f"Current dimensions: {width}x{height}"
                        )
                    
                    # Optional: Check if ratio is reasonable (width not more than 2x height)
                    MAX_RATIO = 2.0
                    if width / height > MAX_RATIO:
                        raise ValidationError(
                            "Image is too wide. Width should not exceed twice the height. "
                            f"Current ratio: {round(width/height, 1)}:1"
                        )
                        
            except Exception as e:
                raise ValidationError(f"Could not process image: {str(e)}")
    
    def optimize_image(self):
        """Optimize the product image while maintaining width ≥ height"""
        try:
            img_path = self.image.path
            with Image.open(img_path) as img:
                # Convert to RGB if needed
                if img.mode in ('RGBA', 'P'):
                    img = img.convert('RGB')
                
                # Target maximum dimensions
                MAX_WIDTH = 1600
                MAX_HEIGHT = 1600
                
                # Resize if needed while maintaining aspect ratio
                if img.width > MAX_WIDTH or img.height > MAX_HEIGHT:
                    ratio = min(MAX_WIDTH/img.width, MAX_HEIGHT/img.height)
                    new_size = (int(img.width * ratio), int(img.height * ratio))
                    img = img.resize(new_size, Image.LANCZOS)
                
                # Save optimized image
                img.save(img_path, quality=85, optimize=True)
        except Exception as e:
            # Silently fail if optimization fails
            pass
    
class Category(models.Model):
    name = models.CharField(max_length=20, unique=True)
    slug = models.SlugField(max_length=21, unique=True , editable=False)  # Changed to SlugField
    is_active = models.BooleanField(default=True)
    
    class Meta:
        verbose_name_plural = "Categories"
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = (self.name).lower()
        super().save(*args, **kwargs)
    
    def get_absolute_url(self):
        return reverse('products_by_category', args=[self.slug])

class Product(models.Model):
    image = models.ImageField(
        upload_to='products/',
        blank=False,
        help_text="Upload product image (recommended ratio: 4:3, width > height, min 800x600px)"
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
    category = models.ForeignKey(
        'Category',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products',
        verbose_name="Product Category",
        help_text="Select product category"
    )
    description = models.TextField(
        max_length=500,
        help_text="Detailed product description (max 500 chars)"
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0.01)],
        help_text="Price in USD (min $0.01)"
    )
    is_active = models.BooleanField(
        default=False,
        verbose_name="Active",
        help_text="Is this product available for sale?"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Creation Date"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Last Updated"
    )
    best_products = models.BooleanField(
        default=False,
        verbose_name="Featured Product",
        help_text="Display in featured products section"
    )
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Product"
        verbose_name_plural = "Products"
    
    def __str__(self):
        return f"{self.name} (${self.price}) {self.is_active}"
    
    def clean(self):
        """Additional model validation"""
        super().clean()
        
        # Validate image dimensions and aspect ratio
        if self.image:
            try:
                with Image.open(self.image) as img:
                    width, height = img.size
                    # Minimum size check
                    if width < 800 or height < 600:
                        raise ValidationError(
                            "Image should be at least 800x600 pixels. "
                            f"Current size: {width}x{height}"
                        )
                    # Aspect ratio check (width > height)
                    if width <= height:
                        raise ValidationError(
                            "Product image must be rectangular (width > height). "
                            f"Current dimensions: {width}x{height}"
                        )
                    # Optional: Check if ratio is roughly 4:3 (within 10% tolerance)
                    target_ratio = 4/3
                    actual_ratio = width/height
                    if not (0.9 * target_ratio <= actual_ratio <= 1.1 * target_ratio):
                        raise ValidationError(
                            "Recommended aspect ratio is 4:3 (width:height). "
                            f"Current ratio: {round(actual_ratio, 2)}:1"
                        )
            except Exception as e:
                raise ValidationError(f"Could not process image: {str(e)}")
    
    
    def save(self, *args, **kwargs):
        # Generate slug if it's empty or needs to be updated
        if not self.slug:  # or some condition to regenerate
            self.slug = slugify(self.name)  # or whatever field you're basing the slug on
        
        # Ensure the slug is valid
        self.slug = self.slug.lower()  # convert to lowercase
        self.slug = ''.join(c for c in self.slug if c.isalnum() or c in ['-', '_'])
        
        super().save(*args, **kwargs)
    def optimize_image(self):
        """Optimize the product image with rectangular aspect ratio"""
        try:
            img_path = self.image.path
            with Image.open(img_path) as img:
                # Convert to RGB if necessary
                if img.mode in ('RGBA', 'P'):
                    img = img.convert('RGB')
                
                # Resize if too large while maintaining aspect ratio
                max_width = 1600  # Max width for product images
                max_height = 1200  # Max height for product images
                
                if img.width > max_width or img.height > max_height:
                    img.thumbnail((max_width, max_height), Image.LANCZOS)
                
                # Save optimized image
                img.save(img_path, quality=85, optimize=True)
        except Exception as e:
            # Fail silently - we don't want to break the save if optimization fails
            pass
    
    def get_absolute_url(self):
        return reverse('product_detail', args=[self.slug])
    
    @property
    def dimensions(self):
        """Returns (width, height) of the image"""
        try:
            with Image.open(self.image.path) as img:
                return img.size
        except:
            return (0, 0)
    
    @property
    def aspect_ratio(self):
        """Returns the aspect ratio as a float (width/height)"""
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
        validators=[MinValueValidator(0.01)],
        help_text="Service price in USD (min $0.01)"
    )
    is_active = models.BooleanField(
        default=False,
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
        """Validate image aspect ratio (width ≥ height)"""
        super().clean()
        
        if self.image:
            try:
                with Image.open(self.image) as img:
                    width, height = img.size
                    
                    # Enforce width ≥ height rule
                    if width < height:
                        raise ValidationError(
                            "Service image width must be equal to or greater than height. "
                            f"Current dimensions: {width}x{height} (ratio: {round(width/height, 2) if height else 0}:1)"
                        )
                        
            except Exception as e:
                raise ValidationError(f"Could not process image: {str(e)}")
    
    def save(self, *args, **kwargs):
        # Run full validation before saving
        self.full_clean()
        super().save(*args, **kwargs)
        
        # Optimize image after save
        if self.image:
            self.optimize_image()
    
    def optimize_image(self):
        """Optimize the service image while maintaining width ≥ height"""
        try:
            img_path = self.image.path
            with Image.open(img_path) as img:
                # Convert to RGB if needed
                if img.mode in ('RGBA', 'P'):
                    img = img.convert('RGB')
                
                # Only resize if image is extremely large (>10MB)
                if self.image.size > 10_000_000:  # 10MB
                    # Maintain aspect ratio while constraining size
                    max_dimension = 5000  # Absolute maximum dimension
                    if max(img.size) > max_dimension:
                        ratio = max_dimension / max(img.size)
                        new_size = (int(img.width * ratio), int(img.height * ratio))
                        img = img.resize(new_size, Image.LANCZOS)
                
                # Save optimized image
                img.save(img_path, quality=85, optimize=True)
        except Exception as e:
            # Fail silently if optimization fails
            pass
    
    def get_absolute_url(self):
        return reverse('service_detail', args=[self.id])
    
    @property
    def dimensions(self):
        """Returns (width, height) tuple of the image"""
        try:
            with Image.open(self.image.path) as img:
                return img.size
        except:
            return (0, 0)
    
    @property
    def aspect_ratio(self):
        """Returns the aspect ratio as a float (width/height)"""
        width, height = self.dimensions
        return round(width / height, 2) if height else 0
    
    @property
    def orientation(self):
        """Returns 'square', 'landscape', or 'unknown'"""
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
        """Validate the icon image"""
        super().clean()

    def save(self, *args, **kwargs):
        # Run validation before saving
        self.full_clean()
        
        # Optimize icon before saving
        super().save(*args, **kwargs)

