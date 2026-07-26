import os
import django
import random
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from django.core.files import File

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import Category, Tag, Product, CarouselImg, Service, Contact, ProductImage, Payment, Order, OrderItem
from django.contrib.auth import get_user_model

def seed_data():
    print("Starting professional data seeding...")
    
    User = get_user_model()
    
    # 1. Create Superuser and Mock Users
    print("Creating users...")
    if not User.objects.filter(username='admin').exists():
        User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    admin_user = User.objects.get(username='admin')
    
    mock_users = []
    for i in range(1, 6):
        username = f"user{i}"
        user, _ = User.objects.get_or_create(username=username, email=f"{username}@example.com")
        if not user.check_password("password123"):
            user.set_password("password123")
            user.save()
        mock_users.append(user)

    # 2. Categories & Tags
    print("Creating Categories and Tags...")
    cats = {
        "Audio": Category.objects.get_or_create(name="Audio & Sound")[0],
        "Wearables": Category.objects.get_or_create(name="Wearables")[0],
        "Laptops": Category.objects.get_or_create(name="Laptops")[0],
        "Accessories": Category.objects.get_or_create(name="Accessories")[0],
    }
    
    tags = {
        "Premium": Tag.objects.get_or_create(name="Premium")[0],
        "New": Tag.objects.get_or_create(name="New Arrival")[0],
        "Sale": Tag.objects.get_or_create(name="Sale")[0],
        "Best": Tag.objects.get_or_create(name="Best Seller")[0],
    }

    # Helper to find latest image
    brain_dir = r"C:\Users\TW\.gemini\antigravity\brain\6f67abba-8ac8-4d74-9457-1e5082816431"
    
    def get_latest_image(prefix):
        import glob
        files = glob.glob(os.path.join(brain_dir, f"{prefix}_*.png"))
        if files:
            return sorted(files)[-1]
        return None

    # Image mapping
    imgs = {
        "headphones": get_latest_image("product_headphones"),
        "smartwatch": get_latest_image("product_smartwatch"),
        "laptop": get_latest_image("product_laptop"),
        "speaker": get_latest_image("product_speaker"),
        "mouse": get_latest_image("product_mouse"),
        "banner": get_latest_image("carousel_banner"),
    }
    
    # 3. Products
    print("Seeding Products...")
    
    product_data = [
        ("AuraSound Pro Wireless Headphones", "Audio", ["Premium", "Best"], "Experience pure auditory bliss with active noise cancellation and 40-hour battery life.", "299.99", "headphones"),
        ("ChronoSync Titanium Smartwatch", "Wearables", ["Premium", "New"], "The ultimate daily companion. Tracks fitness and heart rate with an OLED display.", "349.50", "smartwatch"),
        ("Zenith Book 15 Ultra", "Laptops", ["Premium"], "Power meets portability. 32GB memory and 4K micro-LED display.", "1899.00", "laptop"),
        ("Zenith Book 13 Lite", "Laptops", ["Sale"], "Ultra-lightweight laptop perfect for travel and business on the go.", "1299.00", "laptop"),
        ("EchoBass Portable Speaker", "Audio", ["New"], "Take your party anywhere. 360-degree sound, waterproof, and long-lasting battery.", "149.99", "speaker"),
        ("Precision Master Mouse", "Accessories", ["Best"], "Ergonomic wireless mouse designed for productivity and comfort.", "89.99", "mouse"),
    ]
    
    created_products = []
    
    for name, cat_key, tag_keys, desc, price, img_key in product_data:
        img_path = imgs.get(img_key)
        if img_path:
            p = Product.objects.filter(name=name).first()
            if not p:
                p = Product(
                    name=name,
                    owner=admin_user,
                    category=cats[cat_key],
                    description=desc,
                    price=Decimal(price),
                    is_active=True
                )
                with open(img_path, 'rb') as f:
                    p.image.save(f"{img_key}.png", File(f), save=False)
                p.save()
                p.tags.set([tags[tk] for tk in tag_keys])
                
                # Create 2 gallery images
                for i in range(2):
                    with open(img_path, 'rb') as f_dup:
                        pi = ProductImage(product=p)
                        pi.image.save(f"{img_key}_gal_{i}.png", File(f_dup), save=False)
                        pi.save()
            created_products.append(p)

    # 4. Carousel Banners
    print("Seeding Carousel Banners...")
    if imgs["banner"]:
        name = "Summer Tech Sale"
        if not CarouselImg.objects.filter(name=name).exists():
            c1 = CarouselImg(name=name, is_active=True)
            with open(imgs["banner"], 'rb') as f:
                c1.image.save("banner1.png", File(f), save=False)
            c1.save()

    # 5. Services
    print("Seeding Services...")
    if imgs["laptop"]: # using laptop image as a placeholder for repair
        name = "Premium Device Repair"
        if not Service.objects.filter(name=name).exists():
            s1 = Service(
                name=name,
                price=Decimal('49.99'),
                description="Rapid, reliable repairs for laptops and smartphones.",
                is_active=True
            )
            with open(imgs["laptop"], 'rb') as f:
                s1.image.save("repair.png", File(f), save=False)
            s1.save()

    # 6. Contacts
    print("Seeding Contacts...")
    Contact.objects.get_or_create(name="Support Email", value="support@dreamproject.tech", contact_type="email", display_order=1)
    Contact.objects.get_or_create(name="Sales Hotline", value="1-800-555-0199", contact_type="phone", display_order=2)
    Contact.objects.get_or_create(name="Headquarters", value="123 Innovation Drive, Silicon Valley", contact_type="address", display_order=3)

    # 7. Orders and Payments (for Analytics)
    print("Seeding Orders and Payments for Analytics...")
    if len(created_products) > 0:
        now = timezone.now()
        for i in range(25):
            # Create a payment
            random_user = random.choice(mock_users)
            status = random.choice(['success', 'success', 'success', 'pending', 'refunded'])
            amount = Decimal(random.randint(50, 2000))
            
            # Random date in the last 30 days
            days_ago = random.randint(0, 30)
            created_time = now - timedelta(days=days_ago)
            
            payment = Payment.objects.create(
                amount=amount,
                user_email=random_user.email,
                owner=random_user,
                status=status,
                stripe_payment_id=f"pi_mock_{i}{random.randint(1000,9999)}"
            )
            # Override created_at for analytics spread
            Payment.objects.filter(pk=payment.pk).update(created_at=created_time)
            
            # Create order
            order_status = 'confirmed' if status == 'success' else 'pending'
            order = Order.objects.create(
                owner=random_user,
                payment=payment,
                status=order_status,
                shipping_address="123 Fake Street"
            )
            Order.objects.filter(pk=order.pk).update(created_at=created_time)
            
            # Create order items
            num_items = random.randint(1, 3)
            for _ in range(num_items):
                p = random.choice(created_products)
                qty = random.randint(1, 2)
                OrderItem.objects.create(
                    order=order,
                    product=p,
                    quantity=qty,
                    unit_price=p.price
                )

    print("Professional data seeding completed successfully!")

if __name__ == '__main__':
    seed_data()
