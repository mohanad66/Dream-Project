# backend/utils/image_compression.py
from PIL import Image
from io import BytesIO
from django.core.files.uploadedfile import InMemoryUploadedFile
import sys

def compress_image(image, quality=85, max_width=1920, max_height=1080):
    """
    Compress and resize image
    
    Args:
        image: Django UploadedFile object
        quality: JPEG quality (1-100, default 85)
        max_width: Maximum width in pixels (default 1920)
        max_height: Maximum height in pixels (default 1080)
    
    Returns:
        Compressed image as InMemoryUploadedFile
    """
    # Open image
    img = Image.open(image)
    
    # Convert RGBA to RGB if necessary (for PNG with transparency)
    if img.mode in ('RGBA', 'LA', 'P'):
        background = Image.new('RGB', img.size, (255, 255, 255))
        background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
        img = background
    
    # Resize if image is larger than max dimensions
    if img.width > max_width or img.height > max_height:
        img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
    
    # Save to BytesIO object
    output = BytesIO()
    
    # Determine format
    img_format = 'JPEG'
    if image.name.lower().endswith('.png'):
        img_format = 'PNG'
    elif image.name.lower().endswith('.webp'):
        img_format = 'WEBP'
    
    # Save with compression
    if img_format == 'JPEG':
        img.save(output, format='JPEG', quality=quality, optimize=True)
    elif img_format == 'PNG':
        img.save(output, format='PNG', optimize=True)
    elif img_format == 'WEBP':
        img.save(output, format='WEBP', quality=quality)
    
    output.seek(0)
    
    # Create new InMemoryUploadedFile
    compressed_image = InMemoryUploadedFile(
        output,
        'ImageField',
        image.name,
        f'image/{img_format.lower()}',
        sys.getsizeof(output),
        None
    )
    
    return compressed_image


def compress_multiple_sizes(image, sizes=None):
    """
    Create multiple compressed versions of an image
    
    Args:
        image: Django UploadedFile object
        sizes: Dict of size names and (width, height, quality) tuples
               Example: {'thumbnail': (200, 200, 80), 'medium': (800, 600, 85)}
    
    Returns:
        Dict of compressed images
    """
    if sizes is None:
        sizes = {
            'thumbnail': (200, 200, 80),
            'medium': (800, 600, 85),
            'large': (1920, 1080, 90)
        }
    
    compressed_images = {}
    
    for size_name, (width, height, quality) in sizes.items():
        compressed_images[size_name] = compress_image(
            image, 
            quality=quality, 
            max_width=width, 
            max_height=height
        )
    
    return compressed_images