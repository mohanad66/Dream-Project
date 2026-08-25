import os, struct, zlib, random
from decimal import Decimal
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.utils import timezone

User = get_user_model()


def make_png(r, g, b, w=500, h=400):
    import uuid
    def chunk(ctype, data):
        c = ctype + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    raw = b''
    for _ in range(h):
        raw += b'\x00' + bytes([r, g, b]) * w
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
    idat = chunk(b'IDAT', zlib.compress(raw))
    iend = chunk(b'IEND', b'')
    name = f'img_{r}_{g}_{b}_{uuid.uuid4().hex[:8]}.png'
    f = ContentFile(sig + ihdr + idat + iend, name=name)
    f.seek(0)
    return f


class Command(BaseCommand):
    help = 'Seed database with professional demo data for DreamStore'

    def handle(self, *args, **options):
        from api.models import (
            SellerProfile, Category, Tag, Product, ProductImage,
            Coupon, SellerOffer, Payment, Order, OrderItem,
            SellerPayoutRecord, Service, Contact, CarouselImg,
            PlatformSettings
        )

        gold = lambda: make_png(201, 162, 75)
        navy = lambda: make_png(11, 15, 23)

        CAT_COLORS = {
            'Electronics': (41, 98, 255),
            'Fashion': (180, 60, 120),
            'Home & Living': (60, 140, 90),
            'Beauty & Care': (190, 100, 160),
            'Books & Stationery': (120, 80, 50),
            'Sports & Fitness': (220, 80, 40),
            'Kitchen': (60, 120, 140),
            'Garden': (80, 160, 60),
            'Toys & Games': (230, 170, 30),
            'Automotive': (80, 80, 100),
            'Grocery': (140, 170, 50),
            'Health & Wellness': (100, 180, 160),
        }

        self.stdout.write(self.style.WARNING('\n  DREAMSTORE SEED — STARTING...\n'))

        # 1. ADMIN
        self.stdout.write('[1/12] Admin user...')
        admin, created = User.objects.get_or_create(
            username='admin',
            defaults={'email': 'admin@dreamstore.com', 'first_name': 'Ahmed', 'last_name': 'Hassan',
                      'is_staff': True, 'is_superuser': True, 'is_active': True}
        )
        if created:
            admin.set_password('admin123')
            admin.save()
        self.stdout.write(self.style.SUCCESS(f'  ✓ admin / admin123'))

        # 2. CUSTOMERS
        self.stdout.write('[2/12] Customers...')
        custs = []
        for uname, f, l, e in [
            ('sara.mohamed', 'Sara', 'Mohamed', 'sara@example.com'),
            ('omar.ali', 'Omar', 'Ali', 'omar@example.com'),
            ('nour.ibrahim', 'Nour', 'Ibrahim', 'nour@example.com'),
            ('youssef.khaled', 'Youssef', 'Khaled', 'youssef@example.com'),
            ('fatma.hassan', 'Fatma', 'Hassan', 'fatma@example.com'),
            ('mahmoud.said', 'Mahmoud', 'Said', 'mahmoud@example.com'),
            ('layla.adel', 'Layla', 'Adel', 'layla@example.com'),
            ('hassan.yousef', 'Hassan', 'Yousef', 'hassan@example.com'),
        ]:
            u, cr = User.objects.get_or_create(username=uname, defaults={'email': e, 'first_name': f, 'last_name': l, 'is_active': True})
            if cr:
                u.set_password('pass1234')
                u.save()
            custs.append(u)
        self.stdout.write(self.style.SUCCESS(f'  ✓ {len(custs)} customers (pass1234)'))

        # 3. SELLERS
        self.stdout.write('[3/12] Sellers...')
        sellers_raw = [
            ('zenith Electronics', 'Zenith', 'Electronics', 'zenith@dreamstore.com', 'Zenith Electronics',
             'Premier destination for cutting-edge electronics and smart home devices.', '+20 100 234 5678', '10', 'platform'),
            ('nile artisan co', 'Nile', 'Artisan Co', 'nile@dreamstore.com', 'Nile Artisan Co',
             'Handcrafted home decor inspired by Egypt\'s rich heritage.', '+20 101 345 6789', '12', 'platform'),
            ('cairothreads', 'Cairo', 'Threads', 'cairo@dreamstore.com', 'Cairo Threads',
             'Premium Egyptian fashion designed in Cairo.', '+20 102 456 7890', '15', 'seller'),
            ('delta organic', 'Delta', 'Organic', 'delta@dreamstore.com', 'Delta Organic',
             'Farm-fresh organic produce from the Nile Delta.', '+20 103 567 8901', '8', 'seller'),
            ('alexandria books', 'Alexandria', 'Books', 'alex@dreamstore.com', 'Alexandria Books',
             'Curated books and premium stationery.', '+20 104 678 9012', '10', 'platform'),
            ('pharaoh home', 'Pharaoh', 'Home', 'pharaoh@dreamstore.com', 'Pharaoh Home & Living',
             'Luxury furniture blending ancient and modern Egyptian aesthetics.', '+20 105 789 0123', '12', 'platform'),
        ]
        sellers = []
        for uname, f, l, e, biz, bio, phone, comm, dlv in sellers_raw:
            u, cr = User.objects.get_or_create(username=uname, defaults={'email': e, 'first_name': f, 'last_name': l, 'is_active': True})
            if cr:
                u.set_password('seller123')
                u.save()
            sp, _ = SellerProfile.objects.get_or_create(user=u, defaults={
                'business_name': biz, 'business_description': bio, 'contact_phone': phone,
                'contact_email': e, 'verification_status': 'approved', 'commission_rate': Decimal(comm),
                'is_active': True, 'delivery_type': dlv, 'bio': bio,
            })
            sellers.append(sp)
        self.stdout.write(self.style.SUCCESS(f'  ✓ {len(sellers)} sellers (seller123)'))

        # 4. CATEGORIES
        self.stdout.write('[4/12] Categories...')
        cats = []
        for n in ['Electronics', 'Fashion', 'Home & Living', 'Beauty & Care', 'Books & Stationery',
                   'Sports & Fitness', 'Kitchen', 'Garden', 'Toys & Games', 'Automotive', 'Grocery', 'Health & Wellness']:
            c, _ = Category.objects.get_or_create(name=n, defaults={'is_active': True})
            cats.append(c)
        self.stdout.write(self.style.SUCCESS(f'  ✓ {len(cats)} categories'))

        # 5. TAGS
        self.stdout.write('[5/12] Tags...')
        tgs = []
        for n in ['Best Seller', 'New Arrival', 'Sale', 'Premium', 'Handmade', 'Eco-Friendly',
                   'Limited Edition', 'Organic', 'Egyptian Made', 'Imported', 'Exclusive', 'Trending',
                   'Gift Idea', 'Budget Friendly', 'Luxury', 'Artisan']:
            t, _ = Tag.objects.get_or_create(name=n, defaults={'is_active': True})
            tgs.append(t)
        self.stdout.write(self.style.SUCCESS(f'  ✓ {len(tgs)} tags'))

        # 6. PRODUCTS
        self.stdout.write('[6/12] Products...')
        specs = [
            (0, 'Electronics', 'Zenith Pro Max 15 Laptop', 42999, 'Ultra-thin 15.6" OLED laptop with Intel Core i9, 32GB RAM, 1TB SSD.'),
            (0, 'Electronics', 'Zenith AirPods Ultra', 3499, 'ANC wireless earbuds with spatial audio, 36-hour battery, IPX5.'),
            (0, 'Electronics', 'SmartHome Hub Pro', 5999, 'Central smart home controller with 7" touchscreen. Zigbee, Alexa, Google Home.'),
            (0, 'Electronics', 'Zenith 4K OLED TV 55"', 34999, '55-inch 4K OLED with Dolby Vision IQ, 120Hz, streaming apps built-in.'),
            (0, 'Electronics', 'Wireless Charging Desk Pad', 1299, 'Leather desk pad with 15W wireless charging, 3 USB-C ports, cable management.'),
            (1, 'Home & Living', 'Handwoven Kilim Throw Blanket', 2499, 'Authentic Egyptian kilim, handwoven by Upper Egyptian artisans. Natural cotton.'),
            (1, 'Home & Living', 'Nile Valley Ceramic Vase Set', 1899, 'Set of 3 hand-thrown ceramic vases glazed in Nile blue and sand tones.'),
            (1, 'Home & Living', 'Brass Moroccan Lantern', 3299, 'Hand-punched brass lantern with geometric patterns. Includes LED candle.'),
            (1, 'Home & Living', 'Coptic Cross Wall Art', 1599, 'Hand-carved wooden Coptic cross with traditional patterns. Antique gold finish.'),
            (1, 'Home & Living', 'Cotton Macramé Plant Hanger', 699, 'Handmade macramé using 100% Egyptian cotton cord. Fits pots up to 20cm.'),
            (2, 'Fashion', 'Cairo Nights Bomber Jacket', 4999, 'Satin bomber with hand-embroidered Pharaonic motifs. Limited edition.'),
            (2, 'Fashion', 'Nile Blue Linen Shirt', 1799, 'Relaxed-fit linen shirt in 100% Egyptian cotton linen. Perfect for summer.'),
            (2, 'Fashion', 'Heritage Embroidered Kaftan', 3499, 'Full-length kaftan with Fatimid-inspired embroidery. Cotton-silk blend.'),
            (2, 'Fashion', 'Desert Rose Silk Scarf', 899, 'Hand-printed mulberry silk scarf, 90x90cm. Gift box included.'),
            (2, 'Fashion', 'Egyptian Cotton T-Shirt 3-Pack', 1199, 'Ultra-soft 220gsm Egyptian cotton crew-neck. Pack of 3 colors.'),
            (3, 'Health & Wellness', 'Organic Cold-Pressed Olive Oil 1L', 449, 'Extra virgin from Siwa Oasis olives. Unfiltered, rich in antioxidants.'),
            (3, 'Beauty & Care', 'Honey & Shea Butter Body Cream', 349, 'Siwa honey and raw shea butter. No parabens. 250ml glass jar.'),
            (3, 'Health & Wellness', 'Nile Valley Dates Box 1kg', 279, 'Premium Medjool dates from Ismailia. Hand-selected jumbo size.'),
            (3, 'Grocery', 'Organic Hibiscus Tea 100g', 159, 'Sun-dried hibiscus petals from Upper Egypt. Rich in vitamin C.'),
            (3, 'Beauty & Care', 'Argan & Jojoba Hair Oil 100ml', 399, 'Lightweight blend with cold-pressed argan and jojoba oils.'),
            (4, 'Books & Stationery', 'Leather Journal', 599, 'Hand-stitched genuine leather with 200 pages of acid-free paper. A5.'),
            (4, 'Books & Stationery', 'Watercolor Art Set 36 Colors', 899, 'Professional watercolor set with brushes, palette and carrying case.'),
            (4, 'Books & Stationery', 'Arabic Calligraphy Starter Kit', 1299, 'Reed pens, ink, practice sheets and illustrated Thuluth/Naskh guide.'),
            (4, 'Books & Stationery', 'Bibliotheca Alexandrina Notebook', 349, 'Limited edition A5 notebook, 160 dotted pages, lay-flat binding.'),
            (4, 'Books & Stationery', 'The Egyptian Cookbook', 449, '100+ traditional Egyptian recipes. Hardcover, beautifully photographed.'),
            (5, 'Home & Living', 'Pharaoh Accent Chair', 8999, 'Mid-century accent chair, gold legs, emerald velvet. Beechwood frame.'),
            (5, 'Home & Living', 'Gold Leaf Arched Mirror', 5499, 'Full-length arched mirror with hand-applied gold leaf frame. 160x70cm.'),
            (5, 'Kitchen', 'Marble & Brass Serving Board', 1899, 'Carrara marble with brass handles. 40x25cm.'),
            (5, 'Home & Living', 'Linen Duvet Cover Set King', 4999, 'Stonewashed French linen with 2 pillowcases. Breathable, durable.'),
            (5, 'Garden', 'Terracotta Planter Set of 4', 1599, 'Handmade terracotta in graduated sizes 12-25cm. Drainage holes included.'),
        ]
        prods = []
        for si, cn, nm, pr, desc in specs:
            seller = sellers[si]
            cat = next((c for c in cats if c.name == cn), cats[0])
            rgb = CAT_COLORS.get(cn, (201, 162, 75))
            cat_img = lambda rgb=rgb: make_png(*rgb)
            p, cr = Product.objects.get_or_create(name=nm, defaults={
                'seller': seller, 'category': cat, 'description': desc,
                'price': Decimal(str(pr)), 'image': cat_img(), 'approval_status': 'approved', 'is_active': True,
            })
            if cr:
                p.tags.add(*random.sample(tgs, k=min(3, len(tgs))))
            prods.append(p)
        self.stdout.write(self.style.SUCCESS(f'  ✓ {len(prods)} products'))

        # 7. GALLERY IMAGES
        self.stdout.write('[7/12] Gallery images...')
        gc = 0
        for p in prods:
            rgb = CAT_COLORS.get(p.category.name, (201, 162, 75)) if p.category else (201, 162, 75)
            dark = tuple(max(c - 60, 0) for c in rgb)
            if random.random() > 0.3:
                for i in range(random.randint(1, 3)):
                    ProductImage.objects.create(product=p, image=make_png(*rgb) if i % 2 == 0 else make_png(*dark))
                    gc += 1
        self.stdout.write(self.style.SUCCESS(f'  ✓ {gc} gallery images'))

        # 8. COUPONS
        self.stdout.write('[8/12] Coupons...')
        coupons = []
        for code, dt, val, mm, mx, mt, mu, days in [
            ('WELCOME10', 'percentage', 10, 500, 150, 500, 1, 90),
            ('FLAT500', 'fixed', 500, 2000, None, 200, 1, 180),
            ('SUMMER25', 'percentage', 25, 1000, 750, 100, 2, 30),
            ('NEWUSER', 'percentage', 15, 300, 200, 1000, 1, 90),
            ('VIP20', 'percentage', 20, 3000, 1000, 50, 1, 180),
            ('FLASH30', 'percentage', 30, 500, 300, 100, 1, 7),
            ('FREESHIP', 'fixed', 75, 200, None, 0, 5, 365),
        ]:
            c, _ = Coupon.objects.get_or_create(code=code, defaults={
                'discount_type': dt, 'discount_value': Decimal(str(val)),
                'min_order_amount': Decimal(str(mm)) if mm else None,
                'max_discount_amount': Decimal(str(mx)) if mx else None,
                'max_uses_total': mt if mt > 0 else None, 'max_uses_per_user': mu,
                'times_used': random.randint(0, 20), 'is_active': True,
                'starts_at': timezone.now() - timedelta(days=30),
                'expires_at': timezone.now() + timedelta(days=days), 'created_by': admin,
            })
            coupons.append(c)
        self.stdout.write(self.style.SUCCESS(f'  ✓ {len(coupons)} coupons'))

        # 9. SELLER OFFERS
        self.stdout.write('[9/12] Seller offers...')
        oc = 0
        titles = [('Summer Flash Sale', 'promotion'), ('Clearance — 40% Off', 'promotion'),
                  ('New Collection', 'announcement'), ('Bundle Deal', 'product'), ('Weekend Exclusive', 'promotion')]
        for seller in sellers:
            sp = [p for p in prods if p.seller == seller]
            for _ in range(random.randint(2, 4)):
                tt, ot = random.choice(titles)
                disc = random.choice([10, 15, 20, 25, 30])
                pref = random.choice(sp) if ot == 'product' and sp else None
                SellerOffer.objects.create(
                    seller=seller, title=f"{tt} — {seller.business_name}",
                    description=f"{disc}% off for a limited time!", offer_type=ot,
                    product=pref, discount_percent=Decimal(str(disc)),
                    original_price=pref.price if pref else None, image=gold(),
                    is_active=random.choice([True, True, True, False]),
                    starts_at=timezone.now() - timedelta(days=random.randint(1, 14)),
                    expires_at=timezone.now() + timedelta(days=random.randint(5, 60)),
                )
                oc += 1
        self.stdout.write(self.style.SUCCESS(f'  ✓ {oc} offers'))

        # 10. ORDERS
        self.stdout.write('[10/12] Orders...')
        addrs = [
            '15 Mohamed Ali St, Downtown Cairo', '23 Nile Corniche, Zamalek',
            '87 El-Thawra St, Heliopolis', '12 Smouha Rd, Alexandria',
            '45 El-Mohandesen, Giza', '100 Mansoura St, Mansoura',
            '7 El-Salam St, Nasr City', '33 Maadi St, Maadi',
        ]
        ordc = 0
        for cust in custs:
            for _ in range(random.randint(1, 4)):
                ops = random.sample(prods, k=min(random.randint(1, 4), len(prods)))
                sub = sum(p.price for p in ops)
                cm = sub * Decimal('0.10')
                st = random.choice(['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'PENDING'])
                pay = Payment.objects.create(
                    method=random.choice(['PAYMOB', 'FAWRY']),
                    provider_payment_id=f'pay_{random.randint(100000, 999999)}',
                    amount=sub, currency='EGP', user_email=cust.email, owner=cust,
                    status='SUCCESS' if st != 'PENDING' else 'PENDING',
                )
                order = Order.objects.create(
                    owner=cust, payment=pay, status=st,
                    shipping_address=random.choice(addrs),
                    note=random.choice(['', '', 'Deliver before 5 PM', 'Ring bell twice', 'Leave at reception']),
                    delivery_type='platform', subtotal_before_discount=sub,
                    discount_amount=Decimal('0'), total_commission=cm,
                )
                for p in ops:
                    q = random.randint(1, 3)
                    it = p.price * q
                    OrderItem.objects.create(
                        order=order, product=p, quantity=q, unit_price=p.price,
                        subtotal=it, platform_fee=it * Decimal('0.10'),
                        seller_payout=it * Decimal('0.90'),
                    )
                ordc += 1
        self.stdout.write(self.style.SUCCESS(f'  ✓ {ordc} orders'))

        # 11. SERVICES, CONTACTS, CAROUSEL
        self.stdout.write('[11/12] Services, contacts, carousel...')
        for nm, pr, desc in [
            ('Express Delivery', 99, 'Same-day in Cairo & Giza.'),
            ('Gift Wrapping', 49, 'Premium wrapping with handwritten card.'),
            ('Installation Service', 199, 'Professional install for electronics & furniture.'),
            ('Extended Warranty', 299, '2-year extended warranty on electronics.'),
            ('Corporate Orders', 0, 'Bulk ordering for businesses. Min 10 units.'),
        ]:
            Service.objects.get_or_create(name=nm, defaults={'price': Decimal(str(pr)), 'description': desc, 'image': gold(), 'is_active': True})

        for nm, val, ct, o in [
            ('Customer Support', '+20 2 1234 5678', 'phone', 1),
            ('Email Us', 'support@dreamstore.com', 'email', 2),
            ('Cairo Office', '42 Tahrir St, Downtown Cairo', 'address', 3),
            ('WhatsApp', '+20 100 123 4567', 'social', 4),
            ('Instagram', '@dreamstore.eg', 'social', 5),
        ]:
            Contact.objects.get_or_create(name=nm, defaults={'value': val, 'contact_type': ct, 'display_order': o, 'is_active': True})

        ccc = 0
        for i, nm in enumerate(['Summer Collection', 'Tech Deals', 'Handmade Specials', 'New Arrivals', 'Flash Sale', 'Home Makeover']):
            _, cr = CarouselImg.objects.get_or_create(name=nm, defaults={'image': make_png(201, 162, 75, 800, 400), 'is_active': True, 'order': i})
            if cr:
                ccc += 1
        self.stdout.write(self.style.SUCCESS(f'  ✓ Services, contacts, {ccc} carousel images'))

        # 12. PLATFORM SETTINGS
        self.stdout.write('[12/12] Platform settings...')
        ps, _ = PlatformSettings.objects.get_or_create(pk=1)
        ps.default_commission_rate = Decimal('10.00')
        ps.auto_approve_products = False
        ps.auto_approve_sellers = False
        ps.save()
        self.stdout.write(self.style.SUCCESS(f'  ✓ Done'))

        self.stdout.write(self.style.SUCCESS(f'\n{"="*50}\n  SEED COMPLETE!\n{"="*50}'))
        self.stdout.write(f'  Admin:     admin / admin123')
        self.stdout.write(f'  Customers: {len(custs)} users (pass1234)')
        self.stdout.write(f'  Sellers:   {len(sellers)} stores (seller123)')
        self.stdout.write(f'  Products:  {len(prods)}')
        self.stdout.write(f'  Orders:    {ordc}')
        self.stdout.write(f'  Coupons:   {len(coupons)}')
        self.stdout.write(f'  Offers:    {oc}')
        self.stdout.write(f'  Gallery:   {gc} images\n')
