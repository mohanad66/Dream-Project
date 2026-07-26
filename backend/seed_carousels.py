import os
import django
import urllib.request
import tempfile
from django.core.files import File

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import CarouselImg

def seed_carousels():
    print("Clearing existing carousels...")
    CarouselImg.objects.all().delete()
    
    print("Downloading and seeding new professional carousels...")
    
    # High-quality tech/office images from picsum.photos
    carousels_data = [
        {"name": "Autumn Tech Deals", "url": "https://picsum.photos/id/0/1920/1080"},      # Laptop workspace
        {"name": "Developer Essentials", "url": "https://picsum.photos/id/119/1920/1080"},   # Apple tech desk
        {"name": "Creative Studio", "url": "https://picsum.photos/id/250/1920/1080"}         # Camera/Photography
    ]
    
    for i, data in enumerate(carousels_data):
        print(f"Fetching {data['name']}...")
        try:
            # Download to a temporary file
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
            urllib.request.urlretrieve(data["url"], temp_file.name)
            
            c = CarouselImg(name=data["name"], is_active=True)
            with open(temp_file.name, 'rb') as f:
                c.image.save(f"carousel_{i}.jpg", File(f), save=False)
            c.save()
            print(f"Successfully seeded {data['name']}")
            
            # Cleanup temp file
            os.remove(temp_file.name)
        except Exception as e:
            print(f"Error seeding {data['name']}: {e}")

if __name__ == '__main__':
    seed_carousels()
