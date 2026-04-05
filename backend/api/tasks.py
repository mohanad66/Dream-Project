"""
Background task processing using Celery.
This module  handles asynchronous image compression and other long-running operations.

Setup Instructions:
1. Install Celery and Redis:
   pip install celery redis celery[redis]

2. Set CELERY_BROKER_URL in settings.py:
   CELERY_BROKER_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379')
   CELERY_RESULT_BACKEND = os.environ.get('REDIS_URL', 'redis://localhost:6379')
   CELERY_ACCEPT_CONTENT = ['json']
   CELERY_TASK_SERIALIZER = 'json'
   CELERY_RESULT_SERIALIZER = 'json'

3. Create celery.py in backend/ folder with:
   from celery import Celery
   import os
   os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
   app = Celery('backend')
   app.config_from_object('django.conf:settings', namespace='CELERY')
   app.autodiscover_tasks()

4. Import celery in backend/__init__.py:
   from .celery import app as celery_app
   __all__ = ('celery_app',)

5. Run Celery worker:
   celery -A backend worker -l info
"""

from celery import shared_task
from django.core.files.base import ContentFile
from PIL import Image
from io import BytesIO
import logging

logger = logging.getLogger(__name__)


@shared_task
def compress_image_async(image_path, quality=85, max_width=1920, max_height=1080):
    """
    Asynchronously compress and optimize image file.
    
    Args:
        image_path: Path to the image file
        quality: JPEG quality (1-100)
        max_width: Maximum width in pixels
        max_height: Maximum height in pixels
    
    Returns:
        Path to the compressed image
    """
    try:
        with Image.open(image_path) as img:
            # Convert RGBA/P to RGB
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            
            # Resize if needed
            if img.width > max_width or img.height > max_height:
                ratio = min(max_width / img.width, max_height / img.height)
                new_size = (int(img.width * ratio), int(img.height * ratio))
                img = img.resize(new_size, Image.LANCZOS)
            
            # Save with optimization
            img.save(image_path, quality=quality, optimize=True)
            logger.info(f"Compressed image: {image_path}")
            
    except Exception as e:
        logger.error(f"Failed to compress image {image_path}: {str(e)}")
        raise


@shared_task
def cleanup_old_images():
    """
    Delete temporary or unused image files older than 30 days.
    """
    import os
    from datetime import datetime, timedelta
    
    media_root = '/media/'
    cutoff_date = datetime.now() - timedelta(days=30)
    
    try:
        for root, dirs, files in os.walk(media_root):
            for file in files:
                file_path = os.path.join(root, file)
                file_mtime = os.path.getmtime(file_path)
                if datetime.fromtimestamp(file_mtime) < cutoff_date:
                    os.remove(file_path)
                    logger.info(f"Deleted old file: {file_path}")
    except Exception as e:
        logger.error(f"Error cleaning up old images: {str(e)}")
