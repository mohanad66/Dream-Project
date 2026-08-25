"""
=============================================================================
DREAMSTORE — PROFESSIONAL SEED DATA SCRIPT
=============================================================================
Paste this ENTIRE script into Koyeb Django shell console.

Usage:
  1. Go to Koyeb Dashboard → Your Service → Shell tab
  2. Select /bin/bash or /bin/sh
  3. Run: python manage.py shell
  4. Paste this entire script and press Enter
=============================================================================
"""

import os, sys, base64, io
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

import django
django.setup()

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
import random

User = get_user_model()
from api.models import (
    SellerProfile, Category, Tag, Product, ProductImage,
    Coupon, SellerOffer, Payment, Order, OrderItem,
    SellerPayoutRecord, Service, Contact, CarouselImg,
    PlatformSettings, OrderCoupon
)

# ═══════════════════════════════════════════════════════════
# HELPER: Create minimal valid PNG (1x1 gold pixel)
# ═══════════════════════════════════════════════════════════
def make_png(r, g, b, size=4):
    """Create a small colored PNG as an InMemoryUploadedFile."""
    import struct, zlib
    def chunk(ctype, data):
        c = ctype + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    raw = b''
    for _ in range(size):
        raw += b'\x00' + bytes([r, g, b]) * size

    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))
    idat = chunk(b'IDAT', zlib.compress(raw))
    iend = chunk(b'IEND', b'')

    png_bytes = sig + ihdr + idat + iend
    return ContentFile(png_bytes, name=f'img_{r}_{g}_{b}.png')


def gold_png(size=8):
    return make_png(201, 162, 75, size)

def navy_png(size=8):
    return make_png(11, 15, 23, size)

def white_png(size=8):
    return make_png(245, 246, 248, size)


print("\n" + "="*60)
print("  DREAMSTORE SEED DATA — STARTING...")
print("="*60 + "\n")

# ═══════════════════════════════════════════════════════════
# 1. ADMIN USER
# ═══════════════════════════════════════════════════════════
print("[1/12] Creating admin user...")
admin, created = User.objects.get_or_create(
    username='admin',
    defaults={
        'email': 'admin@dreamstore.com',
        'first_name': 'Ahmed',
        'last_name': 'Hassan',
        'is_staff': True,
        'is_superuser': True,
        'is_active': True,
    }
)
if created:
    admin.set_password('admin123')
    admin.save()
    print(f"  ✓ Admin created: admin / admin123")
else:
    print(f"  → Admin already exists")

# ═══════════════════════════════════════════════════════════
# 2. CUSTOMER USERS
# ═══════════════════════════════════════════════════════════
print("[2/12] Creating customer users...")
customers_data = [
    ('sara.mohamed', 'Sara', 'Mohamed', 'sara@example.com'),
    ('omar.ali', 'Omar', 'Ali', 'omar@example.com'),
    ('nour.ibrahim', 'Nour', 'Ibrahim', 'nour@example.com'),
    ('youssef.khaled', 'Youssef', 'Khaled', 'youssef@example.com'),
    ('fatma.hassan', 'Fatma', 'Hassan', 'fatma@example.com'),
    ('mahmoud.said', 'Mahmoud', 'Said', 'mahmoud@example.com'),
    ('layla.adel', 'Layla', 'Adel', 'layla@example.com'),
    ('hassan.yousef', 'Hassan', 'Yousef', 'hassan@example.com'),
]

customers = []
for uname, first, last, email in customers_data:
    user, created = User.objects.get_or_create(
        username=uname,
        defaults={
            'email': email,
            'first_name': first,
            'last_name': last,
            'is_active': True,
        }
    )
    if created:
        user.set_password('pass1234')
        user.save()
    customers.append(user)
print(f"  ✓ {len(customers)} customers created")

# ═══════════════════════════════════════════════════════════
# 3. SELLER USERS + PROFILES
# ═══════════════════════════════════════════════════════════
print("[3/12] Creating seller users + profiles...")
sellers_data = [
    {
        'username': 'zenith Electronics',
        'first': 'Zenith', 'last': 'Electronics', 'email': 'zenith@dreamstore.com',
        'business': 'Zenith Electronics',
        'bio': 'Premier destination for cutting-edge electronics and smart home devices in Egypt. Authorized dealer for top global brands.',
        'desc': 'We specialize in premium consumer electronics, smart home solutions, and the latest tech gadgets. All products are imported directly from authorized distributors with full warranty coverage.',
        'phone': '+20 100 234 5678',
        'commission': Decimal('10.00'),
        'delivery': 'platform',
    },
    {
        'username': 'nile artisan co',
        'first': 'Nile', 'last': 'Artisan Co', 'email': 'nile@dreamstore.com',
        'business': 'Nile Artisan Co',
        'bio': 'Handcrafted home decor inspired by Egypt\'s rich heritage. Every piece tells a story of craftsmanship and tradition.',
        'desc': 'Nile Artisan Co is a collective of Egyptian artisans creating handcrafted home decor, furniture and lifestyle products. We combine traditional Egyptian craftsmanship with contemporary design.',
        'phone': '+20 101 345 6789',
        'commission': Decimal('12.00'),
        'delivery': 'platform',
    },
    {
        'username': 'cairothreads',
        'first': 'Cairo', 'last': 'Threads', 'email': 'cairo@dreamstore.com',
        'business': 'Cairo Threads',
        'bio': 'Premium Egyptian fashion — from everyday essentials to statement pieces. Designed in Cairo, loved everywhere.',
        'desc': 'Cairo Threads is a contemporary fashion label rooted in Egyptian culture. We design and produce premium clothing using locally sourced fabrics, combining modern silhouettes with traditional Egyptian textile arts.',
        'phone': '+20 102 456 7890',
        'commission': Decimal('15.00'),
        'delivery': 'seller',
    },
    {
        'username': 'delta organic',
        'first': 'Delta', 'last': 'Organic', 'email': 'delta@dreamstore.com',
        'business': 'Delta Organic',
        'bio': 'Farm-fresh organic produce and natural wellness products from the Nile Delta. Pure, sustainable, Egyptian.',
        'desc': 'Delta Organic sources the finest organic produce and natural wellness products directly from certified farms across the Nile Delta region. Our mission is to bring clean, sustainable living to every Egyptian household.',
        'phone': '+20 103 567 8901',
        'commission': Decimal('8.00'),
        'delivery': 'seller',
    },
    {
        'username': 'alexandria books',
        'first': 'Alexandria', 'last': 'Books', 'email': 'alex@dreamstore.com',
        'business': 'Alexandria Books & Stationery',
        'bio': 'Curated books, journals and premium stationery. Feeding minds since 2020.',
        'desc': 'Alexandria Books is an online bookstore and stationery shop offering curated collections of Arabic and English literature, academic resources, premium journals and artisan stationery.',
        'phone': '+20 104 678 9012',
        'commission': Decimal('10.00'),
        'delivery': 'platform',
    },
    {
        'username': 'pharaoh home',
        'first': 'Pharaoh', 'last': 'Home', 'email': 'pharaoh@dreamstore.com',
        'business': 'Pharaoh Home & Living',
        'bio': 'Transform your living space with luxury furniture and decor inspired by ancient and modern Egyptian aesthetics.',
        'desc': 'Pharaoh Home creates luxury furniture and interior decor pieces that blend ancient Egyptian design motifs with modern minimalism. Each piece is crafted by skilled Egyptian carpenters and upholsterers.',
        'phone': '+20 105 789 0123',
        'commission': Decimal('12.00'),
        'delivery': 'platform',
    },
]

sellers = []
for sd in sellers_data:
    user, created = User.objects.get_or_create(
        username=sd['username'],
        defaults={
            'email': sd['email'],
            'first_name': sd['first'],
            'last_name': sd['last'],
            'is_active': True,
        }
    )
    if created:
        user.set_password('seller123')
        user.save()

    profile, pcreated = SellerProfile.objects.get_or_create(
        user=user,
        defaults={
            'business_name': sd['business'],
            'business_description': sd['desc'],
            'contact_phone': sd['phone'],
            'contact_email': sd['email'],
            'verification_status': 'approved',
            'commission_rate': sd['commission'],
            'is_active': True,
            'delivery_type': sd['delivery'],
            'bio': sd['bio'],
        }
    )
    sellers.append(profile)

print(f"  ✓ {len(sellers)} seller profiles created")

# ═══════════════════════════════════════════════════════════
# 4. CATEGORIES
# ═══════════════════════════════════════════════════════════
print("[4/12] Creating categories...")
categories_data = [
    'Electronics', 'Fashion', 'Home & Living', 'Beauty & Care',
    'Books & Stationery', 'Sports & Fitness', 'Kitchen', 'Garden',
    'Toys & Games', 'Automotive', 'Grocery', 'Health & Wellness',
]
categories = []
for name in categories_data:
    cat, _ = Category.objects.get_or_create(
        name=name,
        defaults={'is_active': True}
    )
    categories.append(cat)
print(f"  ✓ {len(categories)} categories created")

# ═══════════════════════════════════════════════════════════
# 5. TAGS
# ═══════════════════════════════════════════════════════════
print("[5/12] Creating tags...")
tags_data = [
    'Best Seller', 'New Arrival', 'Sale', 'Premium',
    'Handmade', 'Eco-Friendly', 'Limited Edition', 'Organic',
    'Egyptian Made', 'Imported', 'Exclusive', 'Trending',
    'Gift Idea', 'Budget Friendly', 'Luxury', 'Artisan',
]
tags = []
for name in tags_data:
    tag, _ = Tag.objects.get_or_create(
        name=name,
        defaults={'is_active': True}
    )
    tags.append(tag)
print(f"  ✓ {len(tags)} tags created")

# ═══════════════════════════════════════════════════════════
# 6. PRODUCTS (per seller, Egyptian themed)
# ═══════════════════════════════════════════════════════════
print("[6/12] Creating products...")

product_specs = [
    # Zenith Electronics (sellers[0]) — Electronics
    {'seller': 0, 'cat': 'Electronics', 'name': 'Zenith Pro Max 15 Laptop', 'price': 42999.00, 'desc': 'Ultra-thin 15.6" OLED laptop with Intel Core i9, 32GB RAM, 1TB SSD. Premium aluminum chassis with backlit keyboard. Perfect for professionals and creatives.'},
    {'seller': 0, 'cat': 'Electronics', 'name': 'Zenith AirPods Ultra', 'price': 3499.00, 'desc': 'Active noise cancelling wireless earbuds with spatial audio, 36-hour battery life, and IPX5 water resistance. Crystal-clear calls with 6 microphones.'},
    {'seller': 0, 'cat': 'Electronics', 'name': 'SmartHome Hub Pro', 'price': 5999.00, 'desc': 'Central smart home controller with 7" touchscreen display. Compatible with Alexa, Google Home and Zigbee devices. Controls lights, locks, cameras and more.'},
    {'seller': 0, 'cat': 'Electronics', 'name': 'Zenith 4K OLED TV 55"', 'price': 34999.00, 'desc': '55-inch 4K OLED smart TV with Dolby Vision IQ, 120Hz refresh rate, and built-in streaming apps. Immerse yourself in stunning visuals with perfect blacks.'},
    {'seller': 0, 'cat': 'Electronics', 'name': 'Wireless Charging Desk Pad', 'price': 1299.00, 'desc': 'Premium leather desk pad with built-in 15W wireless charging, 3 USB-C ports, and cable management. Available in navy and cognac.'},

    # Nile Artisan Co (sellers[1]) — Home & Living / Handmade
    {'seller': 1, 'cat': 'Home & Living', 'name': 'Handwoven Kilim Throw Blanket', 'price': 2499.00, 'desc': 'Authentic Egyptian kilim throw blanket handwoven by Upper Egyptian artisans. Natural cotton with geometric motifs in earthy tones. Each piece is unique.'},
    {'seller': 1, 'cat': 'Home & Living', 'name': 'Nile Valley Ceramic Vase Set', 'price': 1899.00, 'desc': 'Set of 3 hand-thrown ceramic vases glazed in signature Nile blue and sand tones. Made in Fustat, Cairo\'s historic pottery district.'},
    {'seller': 1, 'cat': 'Home & Living', 'name': 'Brass Moroccan Lantern', 'price': 3299.00, 'desc': 'Hand-punched brass lantern with intricate geometric patterns. Creates mesmerizing light patterns. Height: 45cm. Includes LED candle.'},
    {'seller': 1, 'cat': 'Home & Living', 'name': 'Coptic Cross Wall Art', 'price': 1599.00, 'desc': 'Hand-carved wooden Coptic cross with traditional Ethiopian-Egyptian patterns. Finished in antique gold. Size: 30x40cm.'},
    {'seller': 1, 'cat': 'Home & Living', 'name': 'Cotton Macramé Plant Hanger', 'price': 699.00, 'desc': 'Handmade macramé plant hanger using 100% Egyptian cotton cord. Bohemian design fits pots up to 20cm. Length: 90cm.'},

    # Cairo Threads (sellers[2]) — Fashion
    {'seller': 2, 'cat': 'Fashion', 'name': 'Cairo Nights Bomber Jacket', 'price': 4999.00, 'desc': 'Premium satin bomber jacket with hand-embroidered Pharaonic motifs. Fully lined with hidden pockets. Limited edition collection.'},
    {'seller': 2, 'cat': 'Fashion', 'name': 'Nile Blue Linen Shirt', 'price': 1799.00, 'desc': 'Relaxed-fit linen shirt in signature Nile blue. Made from 100% Egyptian cotton linen. Breathable, lightweight, perfect for Egyptian summers.'},
    {'seller': 2, 'cat': 'Fashion', 'name': 'Heritage Embroidered Kaftan', 'price': 3499.00, 'desc': 'Elegant full-length kaftan with hand-stitched Fatimid-inspired embroidery. Luxurious cotton-silk blend. Available in ivory and midnight blue.'},
    {'seller': 2, 'cat': 'Fashion', 'name': 'Desert Rose Silk Scarf', 'price': 899.00, 'desc': 'Hand-printed mulberry silk scarf featuring desert rose patterns. Size: 90x90cm. Comes in a branded gift box.'},
    {'seller': 2, 'cat': 'Fashion', 'name': 'Classic Egyptian Cotton T-Shirt 3-Pack', 'price': 1199.00, 'desc': 'Ultra-soft Egyptian cotton crew-neck t-shirts. 220gsm heavyweight fabric. Pack of 3: white, charcoal, navy. Pre-shrunk and durable.'},

    # Delta Organic (sellers[3]) — Health, Beauty, Grocery
    {'seller': 3, 'cat': 'Health & Wellness', 'name': 'Organic Cold-Pressed Olive Oil 1L', 'price': 449.00, 'desc': 'Extra virgin olive oil cold-pressed from hand-picked Siwa Oasis olives. Unfiltered, rich in antioxidants. Harvested this season.'},
    {'seller': 3, 'cat': 'Beauty & Care', 'name': 'Honey & Shea Butter Body Cream', 'price': 349.00, 'desc': 'Deeply nourishing body cream made with Siwa honey and raw shea butter. No parabens, no sulfates. 250ml glass jar.'},
    {'seller': 3, 'cat': 'Health & Wellness', 'name': 'Nile Valley Dates Box (1kg)', 'price': 279.00, 'desc': 'Premium Medjool dates sourced from Ismailia farms. Hand-selected, jumbo size. Naturally sweet, energy-boosting superfood. Gift box included.'},
    {'seller': 3, 'cat': 'Grocery', 'name': 'Organic Hibiscus Tea (Karkade) 100g', 'price': 159.00, 'desc': 'Sun-dried hibiscus petals from Upper Egypt. Rich in vitamin C and antioxidants. Makes a beautiful crimson tea. 100g resealable pouch.'},
    {'seller': 3, 'cat': 'Beauty & Care', 'name': 'Argan & Jojoba Hair Oil 100ml', 'price': 399.00, 'desc': 'Lightweight hair oil blend with cold-pressed argan and jojoba oils. Tames frizz, adds shine, protects from heat. Suitable for all hair types.'},

    # Alexandria Books (sellers[4]) — Books & Stationery
    {'seller': 4, 'cat': 'Books & Stationery', 'name': 'Leather-Bound Egyptian History Journal', 'price': 599.00, 'desc': 'Hand-stitched genuine leather journal with 200 pages of acid-free paper. Cover embossed with ancient Egyptian motifs. A5 size.'},
    {'seller': 4, 'cat': 'Books & Stationery', 'name': 'Watercolor Art Set — 36 Colors', 'price': 899.00, 'desc': 'Professional-grade watercolor set with 36 vibrant pans, 3 brushes, mixing palette, and carrying case. Perfect for artists and hobbyists.'},
    {'seller': 4, 'cat': 'Books & Stationery', 'name': 'Arabic Calligraphy Starter Kit', 'price': 1299.00, 'desc': 'Complete calligraphy set with reed pens (qalam), ink, practice sheets, and illustrated guide to Thuluth and Naskh scripts.'},
    {'seller': 4, 'cat': 'Books & Stationery', 'name': 'Bibliotheca Alexandrina Collection Notebook', 'price': 349.00, 'desc': 'Limited edition A5 notebook featuring artwork from the Bibliotheca Alexandrina collection. 160 dotted pages, lay-flat binding.'},
    {'seller': 4, 'cat': 'Books & Stationery', 'name': 'The Egyptian Cookbook — Hardcover', 'price': 449.00, 'desc': 'A beautifully photographed collection of 100+ traditional Egyptian recipes. From koshari to om ali, with modern twists and tips.'},

    # Pharaoh Home (sellers[5]) — Home & Living / Furniture
    {'seller': 5, 'cat': 'Home & Living', 'name': 'Pharaoh Accent Chair', 'price': 8999.00, 'desc': 'Mid-century modern accent chair with gold-finished legs and velvet upholstery in emerald green. Solid beechwood frame. Seat height: 45cm.'},
    {'seller': 5, 'cat': 'Home & Living', 'name': 'Gold Leaf Mirror — Arched', 'price': 5499.00, 'desc': 'Full-length arched floor mirror with hand-applied gold leaf frame. Anti-shatter film backing. Size: 160x70cm.'},
    {'seller': 5, 'cat': 'Kitchen', 'name': 'Marble & Brass Serving Board', 'price': 1899.00, 'desc': 'White Carrara marble serving board with solid brass handles. Perfect for cheese, charcuterie or display. Size: 40x25cm.'},
    {'seller': 5, 'cat': 'Home & Living', 'name': 'Linen Duvet Cover Set — King', 'price': 4999.00, 'desc': 'Stonewashed French linen duvet cover with 2 matching pillowcases. Soft, breathable, gets better with every wash. King size.'},
    {'seller': 5, 'cat': 'Garden', 'name': 'Terracotta Planter Set of 4', 'price': 1599.00, 'desc': 'Handmade terracotta planters in graduated sizes (12cm to 25cm). Drainage holes included. Perfect for herbs, succulents or flowers.'},
]

products = []
for spec in product_specs:
    seller_profile = sellers[spec['seller']]
    cat = next((c for c in categories if c.name == spec['cat']), categories[0])
    product, pcreated = Product.objects.get_or_create(
        name=spec['name'],
        defaults={
            'seller': seller_profile,
            'category': cat,
            'description': spec['desc'],
            'price': Decimal(str(spec['price'])),
            'image': gold_png(),
            'approval_status': 'approved',
            'is_active': True,
        }
    )
    if pcreated:
        product.tags.add(random.sample(tags, k=random.randint(1, 3)))
    products.append(product)

print(f"  ✓ {len(products)} products created")

# ═══════════════════════════════════════════════════════════
# 7. PRODUCT GALLERY IMAGES
# ═══════════════════════════════════════════════════════════
print("[7/12] Creating product gallery images...")
gallery_count = 0
for product in products:
    if random.random() > 0.3:
        for i in range(random.randint(1, 3)):
            ProductImage.objects.create(
                product=product,
                image=gold_png() if i % 2 == 0 else navy_png(),
            )
            gallery_count += 1
print(f"  ✓ {gallery_count} gallery images created")

# ═══════════════════════════════════════════════════════════
# 8. COUPONS
# ═══════════════════════════════════════════════════════════
print("[8/12] Creating coupons...")
coupons_data = [
    ('WELCOME10', 'percentage', Decimal('10.00'), Decimal('500.00'), Decimal('150.00'), 500, 1, 45),
    ('FLAT500', 'fixed', Decimal('500.00'), Decimal('2000.00'), None, 200, 1, 120),
    ('SUMMER25', 'percentage', Decimal('25.00'), Decimal('1000.00'), Decimal('750.00'), 100, 2, 30),
    ('NEWUSER', 'percentage', Decimal('15.00'), Decimal('300.00'), Decimal('200.00'), 1000, 1, 90),
    ('VIP20', 'percentage', Decimal('20.00'), Decimal('3000.00'), Decimal('1000.00'), 50, 1, 180),
    ('FLASH30', 'percentage', Decimal('30.00'), Decimal('500.00'), Decimal('300.00'), 100, 1, 7),
    ('FREESHIP', 'fixed', Decimal('75.00'), Decimal('200.00'), None, 0, 5, 365),
]

coupons = []
for code, dtype, val, min_amt, max_amt, max_total, max_user, days in coupons_data:
    coupon, created = Coupon.objects.get_or_create(
        code=code,
        defaults={
            'discount_type': dtype,
            'discount_value': val,
            'min_order_amount': min_amt,
            'max_discount_amount': max_amt,
            'max_uses_total': max_total if max_total > 0 else None,
            'max_uses_per_user': max_user,
            'times_used': random.randint(0, 20),
            'is_active': True,
            'starts_at': timezone.now() - timedelta(days=30),
            'expires_at': timezone.now() + timedelta(days=days),
            'created_by': admin,
        }
    )
    coupons.append(coupon)
print(f"  ✓ {len(coupons)} coupons created")

# ═══════════════════════════════════════════════════════════
# 9. SELLER OFFERS
# ═══════════════════════════════════════════════════════════
print("[9/12] Creating seller offers...")
offer_count = 0
offer_titles = [
    ('Summer Flash Sale', 'promotion'),
    ('Clearance — Up to 40% Off', 'promotion'),
    ('New Collection Launch', 'announcement'),
    ('Bundle Deal — Buy 2 Get 10% Off', 'product'),
    ('Limited Time Offer', 'promotion'),
    ('Back to School Special', 'promotion'),
    ('Weekend Exclusive', 'promotion'),
]

for seller in sellers:
    seller_products = [p for p in products if p.seller == seller]
    num_offers = random.randint(2, 4)
    for i in range(num_offers):
        title, otype = random.choice(offer_titles)
        discount = random.choice([Decimal('10'), Decimal('15'), Decimal('20'), Decimal('25'), Decimal('30')])
        product_ref = random.choice(seller_products) if otype == 'product' and seller_products else None

        SellerOffer.objects.create(
            seller=seller,
            title=f"{title} — {seller.business_name}",
            description=f"Special {discount}% off! Limited time only.",
            offer_type=otype,
            product=product_ref,
            discount_percent=discount,
            original_price=product_ref.price if product_ref else None,
            image=gold_png(),
            is_active=random.choice([True, True, True, False]),
            starts_at=timezone.now() - timedelta(days=random.randint(1, 14)),
            expires_at=timezone.now() + timedelta(days=random.randint(5, 60)),
        )
        offer_count += 1
print(f"  ✓ {offer_count} seller offers created")

# ═══════════════════════════════════════════════════════════
# 10. ORDERS + PAYMENTS + ORDER ITEMS
# ═══════════════════════════════════════════════════════════
print("[10/12] Creating orders, payments and order items...")
statuses = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'PENDING']
payment_methods = ['PAYMOB', 'FAWRY']

addresses = [
    '15 Mohamed Ali Street, Downtown Cairo, Cairo Governorate',
    '23 Nile Corniche, Zamalek, Cairo Governorate',
    '87 El-Thawra Street, Heliopolis, Cairo Governorate',
    '12 Smouha Road, Smouha, Alexandria Governorate',
    '45 El-Mohandesen, Giza Governorate',
    '100 Mansoura Street, Mansoura, Dakahlia Governorate',
    '7 El-Salam Street, Nasr City, Cairo Governorate',
    '33 Maadi Street, Maadi, Cairo Governorate',
]

order_count = 0
for i, customer in enumerate(customers):
    num_orders = random.randint(1, 4)
    for j in range(num_orders):
        order_products = random.sample(products, k=min(random.randint(1, 4), len(products)))
        subtotal = sum(p.price for p in order_products)
        commission_rate = Decimal('0.10')
        total_commission = subtotal * commission_rate
        discount = Decimal('0')
        status = random.choice(statuses)

        # Create payment
        pay_status = 'SUCCESS' if status != 'PENDING' else 'PENDING'
        payment = Payment.objects.create(
            method=random.choice(payment_methods),
            provider_payment_id=f'pay_{random.randint(100000, 999999)}',
            amount=subtotal - discount,
            currency='EGP',
            user_email=customer.email,
            owner=customer,
            status=pay_status,
        )

        # Create order
        order = Order.objects.create(
            owner=customer,
            payment=payment,
            status=status,
            shipping_address=random.choice(addresses),
            note=random.choice(['', '', 'Please deliver before 5 PM', 'Ring the bell twice', 'Leave at reception']),
            delivery_type='platform',
            subtotal_before_discount=subtotal,
            discount_amount=discount,
            total_commission=total_commission,
        )

        # Create order items
        for p in order_products:
            qty = random.randint(1, 3)
            item_subtotal = p.price * qty
            OrderItem.objects.create(
                order=order,
                product=p,
                quantity=qty,
                unit_price=p.price,
                subtotal=item_subtotal,
                platform_fee=item_subtotal * commission_rate,
                seller_payout=item_subtotal * (1 - commission_rate),
            )

        order_count += 1

print(f"  ✓ {order_count} orders with items created")

# ═══════════════════════════════════════════════════════════
# 11. SERVICES, CONTACTS, CAROUSEL
# ═══════════════════════════════════════════════════════════
print("[11/12] Creating services, contacts, carousel...")

# Services
services_data = [
    ('Express Delivery', Decimal('99.00'), 'Same-day delivery in Cairo and Giza. Order before 2 PM for delivery by 8 PM.'),
    ('Gift Wrapping', Decimal('49.00'), 'Premium gift wrapping with handwritten card. Available for all products.'),
    ('Installation Service', Decimal('199.00'), 'Professional installation for electronics and furniture. Includes 30-day warranty.'),
    ('Extended Warranty', Decimal('299.00'), 'Add 2 years extended warranty to any electronics purchase.'),
    ('Corporate Orders', Decimal('0.00'), 'Bulk ordering for businesses. Minimum 10 units. Contact for custom pricing.'),
]
for name, price, desc in services_data:
    Service.objects.get_or_create(
        name=name,
        defaults={'price': price, 'description': desc, 'image': gold_png(), 'is_active': True}
    )
print(f"  ✓ {len(services_data)} services created")

# Contacts
contacts_data = [
    ('Customer Support', '+20 2 1234 5678', 'phone', 1),
    ('Email Us', 'support@dreamstore.com', 'email', 2),
    ('Cairo Office', '42 Tahrir Street, Downtown Cairo', 'address', 3),
    ('WhatsApp', '+20 100 123 4567', 'social', 4),
    ('Instagram', '@dreamstore.eg', 'social', 5),
    ('Facebook', 'facebook.com/dreamstore', 'social', 6),
]
for name, value, ctype, order in contacts_data:
    Contact.objects.get_or_create(
        name=name,
        defaults={'value': value, 'contact_type': ctype, 'display_order': order, 'is_active': True}
    )
print(f"  ✓ {len(contacts_data)} contacts created")

# Carousel images
carousel_data = [
    'Summer Collection', 'Tech Deals', 'Handmade specials', 'New Arrivals',
    'Flash Sale', 'Home Makeover', 'Gift Guide', 'Organic Living',
]
carousel_count = 0
for i, name in enumerate(carousel_data):
    obj, created = CarouselImg.objects.get_or_create(
        name=name,
        defaults={'image': gold_png(16), 'is_active': True, 'order': i}
    )
    if created:
        carousel_count += 1
print(f"  ✓ {carousel_count} carousel images created")

# ═══════════════════════════════════════════════════════════
# 12. PLATFORM SETTINGS
# ═══════════════════════════════════════════════════════════
print("[12/12] Updating platform settings...")
settings, _ = PlatformSettings.objects.get_or_create(pk=1)
settings.default_commission_rate = Decimal('10.00')
settings.auto_approve_products = False
settings.auto_approve_sellers = False
settings.save()
print(f"  ✓ Platform settings updated")

# ═══════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════
print("\n" + "="*60)
print("  DREAMSTORE SEED DATA — COMPLETE!")
print("="*60)
print(f"""
  Admin:         admin / admin123
  Customers:     {len(customers)} users (pass1234)
  Sellers:       {len(sellers)} stores (seller123)
  Categories:    {len(categories)}
  Tags:          {len(tags)}
  Products:      {len(products)}
  Gallery imgs:  {gallery_count}
  Coupons:       {len(coupons)}
  Offers:        {offer_count}
  Orders:        {order_count}
  Services:      {len(services_data)}
  Contacts:      {len(contacts_data)}
  Carousel:      {carousel_count} images
""")
print("="*60)
