import os
import django
import shutil
from decimal import Decimal
from django.core.files import File
from django.contrib.auth import get_user_model

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import Category, Tag, Product, CarouselImg, Service, Contact, ProductImage

def seed_data():
    print("Clearing old media files...")
    # Just to ensure we're fresh
    
    print("Creating superuser...")
    User = get_user_model()
    if not User.objects.filter(username='admin').exists():
        User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    admin_user = User.objects.get(username='admin')

    print("Creating Categories and Tags...")
    cat_audio, _ = Category.objects.get_or_create(name="Audio & Headphones")
    cat_wearables, _ = Category.objects.get_or_create(name="Wearable Tech")
    cat_computers, _ = Category.objects.get_or_create(name="Laptops & Computers")
    
    tag_premium, _ = Tag.objects.get_or_create(name="Premium")
    tag_new, _ = Tag.objects.get_or_create(name="New Arrival")
    tag_wireless, _ = Tag.objects.get_or_create(name="Wireless")

    print("Seeding Products...")
    
    # Paths to the AI generated images in the brain folder
    brain_dir = r"C:\Users\TW\.gemini\antigravity\brain\515e5200-9615-452f-ad55-52de4f868de9"
    
    def get_latest_image(prefix):
        import glob
        files = glob.glob(os.path.join(brain_dir, f"{prefix}_*.png"))
        if files:
            return sorted(files)[-1]
        return None

    # Headphones
    hp_img = get_latest_image("product_headphones")
    if hp_img:
        with open(hp_img, 'rb') as f:
            p1, _ = Product.objects.get_or_create(
                name="AuraSound Pro Wireless Headphones",
                defaults={
                    'owner': admin_user,
                    'category': cat_audio,
                    'description': "Experience pure auditory bliss with the AuraSound Pro. Featuring active noise cancellation, 40-hour battery life, and ultra-plush ear cushions for all-day comfort. Designed for audiophiles who demand the best.",
                    'price': Decimal('299.99'),
                    'is_active': True,
                }
            )
            p1.image.save("headphones.png", File(f), save=True)
            p1.tags.set([tag_premium, tag_wireless])
            
            # Seed gallery images
            if p1.gallery_images.count() == 0:
                side_img = get_latest_image("headphones_side")
                if side_img:
                    with open(side_img, 'rb') as f_side:
                        pi1 = ProductImage(product=p1)
                        pi1.image.save("hp_side.png", File(f_side), save=True)
                for i in range(2):
                    with open(hp_img, 'rb') as f_dup:
                        pi = ProductImage(product=p1)
                        pi.image.save(f"hp_gal_{i}.png", File(f_dup), save=True)

    # Smartwatch
    sw_img = get_latest_image("product_smartwatch")
    if sw_img:
        with open(sw_img, 'rb') as f:
            p2, _ = Product.objects.get_or_create(
                name="ChronoSync Titanium Smartwatch",
                defaults={
                    'owner': admin_user,
                    'category': cat_wearables,
                    'description': "The ultimate daily companion. Tracks your fitness, sleep, and heart rate with medical-grade precision. Crafted from aerospace-grade titanium with an always-on OLED display.",
                    'price': Decimal('349.50'),
                    'is_active': True,
                }
            )
            p2.image.save("smartwatch.png", File(f), save=True)
            p2.tags.set([tag_premium, tag_new])
            
            if p2.gallery_images.count() == 0:
                for i in range(3):
                    with open(sw_img, 'rb') as f_dup:
                        pi = ProductImage(product=p2)
                        pi.image.save(f"sw_gal_{i}.png", File(f_dup), save=True)
            
    # Laptop
    lp_img = get_latest_image("product_laptop")
    if lp_img:
        with open(lp_img, 'rb') as f:
            p3, _ = Product.objects.get_or_create(
                name="Zenith Book 15 Ultra",
                defaults={
                    'owner': admin_user,
                    'category': cat_computers,
                    'description': "Power meets portability. The Zenith Book 15 features the latest neural processing unit, 32GB of unified memory, and a stunning 4K micro-LED display in a chassis less than half an inch thick.",
                    'price': Decimal('1899.00'),
                    'is_active': True,
                }
            )
            p3.image.save("laptop.png", File(f), save=True)
            p3.tags.set([tag_premium, tag_new])
            
            if p3.gallery_images.count() == 0:
                for i in range(3):
                    with open(lp_img, 'rb') as f_dup:
                        pi = ProductImage(product=p3)
                        pi.image.save(f"lp_gal_{i}.png", File(f_dup), save=True)

    print("Seeding Carousel Banners...")
    banner_img = get_latest_image("carousel_banner")
    if banner_img:
        with open(banner_img, 'rb') as f:
            c1, _ = CarouselImg.objects.get_or_create(name="Summer Tech Sale", is_active=True)
            c1.image.save("banner1.png", File(f), save=True)

    print("Seeding Services...")
    repair_img = get_latest_image("service_repair")
    if repair_img:
        with open(repair_img, 'rb') as f:
            name = "Premium Device Repair & Diagnostics"
            if not Service.objects.filter(name=name).exists():
                s1 = Service(
                    name=name,
                    price=Decimal('49.99'),
                    description="Got a cracked screen or a failing battery? Our certified technicians provide rapid, reliable repairs for all major laptop and smartphone brands. Includes a full 90-day warranty.",
                    is_active=True
                )
                s1.image.save("repair.png", File(f), save=False)
                s1.save()

    print("Seeding Contacts...")
    Contact.objects.get_or_create(name="Support Email", value="support@dreamproject.tech", contact_type="email", display_order=1)
    Contact.objects.get_or_create(name="Sales Hotline", value="1-800-555-0199", contact_type="phone", display_order=2)
    Contact.objects.get_or_create(name="Headquarters", value="123 Innovation Drive, Silicon Valley, CA 94025", contact_type="address", display_order=3)

    print("Database successfully seeded with presentation data!")

if __name__ == '__main__':
    seed_data()
