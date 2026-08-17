"""
Seed the store with a curated catalog of products so the shop feels filled.

Usage:
    python manage.py seed_products

Downloads a product-appropriate placeholder image for each listing
(relevant keyword photo from loremflickr with a picsum fallback), uploads
it through the configured storage (Cloudinary in production), and links the
product to existing / newly-created categories and tags.

The command is idempotent: products whose names already exist are skipped.
"""

import io
import tempfile
from decimal import Decimal

import requests
from django.core.cache import cache
from django.core.files import File
from django.core.management.base import BaseCommand
from django.db import transaction
from PIL import Image

from api.models import Category, Product, Tag

IMAGE_SIZE = (800, 600)  # landscape: width >= height (ImageHandlingMixin requirement)


PRODUCTS = [
    # (name, category, price, tags, image_keywords)
    ("NovaView 27\" 4K Monitor", "Monitors", "429.99", ["Premium"], ["monitor", "screen"]),
    ("Vortex Mechanical Keyboard", "Gaming", "129.99", ["Best Seller"], ["keyboard"]),
    ("StormRush Gaming Mouse", "Gaming", "79.99", ["Best Seller"], ["mouse", "gaming"]),
    ("ShadowStrike Gaming Headset", "Gaming", "159.99", ["New Arrival"], ["headset", "gaming"]),
    ("PixelNova Smartphone Pro", "Phones", "1099.00", ["Premium"], ["smartphone", "phone"]),
    ("HorizonPad Tablet 11", "Tablets", "549.99", ["New Arrival"], ["tablet"]),
    ("LumenGlow Smart Bulb Kit", "Smart Home", "49.99", ["New Arrival"], ["lamp", "bulb"]),
    ("NestCore Smart Thermostat", "Smart Home", "219.99", ["Sale"], ["thermostat", "heating"]),
    ("EaseGuard Security Camera", "Smart Home", "189.99", ["Premium"], ["camera", "security"]),
    ("CapturePro DSLR Camera", "Photography", "799.99", ["Premium"], ["camera", "dslr"]),
    ("Aperture Prime 50mm Lens", "Photography", "299.99", ["Sale"], ["lens", "camera"]),
    ("SwiftFit Running Shoes", "Sports & Fitness", "119.99", ["Best Seller"], ["sneakers", "running"]),
    ("FlexCore Yoga Mat", "Sports & Fitness", "34.99", ["New Arrival"], ["yoga"]),
    ("PulseTrack Fitness Band", "Wearables", "89.99", ["Wireless"], ["fitness", "wristband"]),
    ("VisionDesk Standing Desk", "Office", "429.99", ["Premium"], ["desk", "office"]),
    ("ErgoLite Office Chair", "Office", "349.99", ["Sale"], ["chair", "office"]),
]

DESCRIPTIONS = {
    "Monitors": "Immersive 4K UHD display with ultra-slim bezels, factory-calibrated colors, and ergonomic tilt-and-swivel stand. Built for crisp productivity and cinematic entertainment.",
    "Gaming": "Precision-tuned esports hardware featuring responsive switches, customizable RGB lighting, and tournament-grade durability. Dominate every match with pro-level control.",
    "Phones": "Flagship smartphone with a stunning AMOLED display, all-day battery, and a versatile pro-grade camera system. Sleek unibody design in an elegant finish.",
    "Tablets": "Lightweight and powerful tablet with a vivid high-res display, all-day battery, and fluid multitasking. Perfect for creativity, streaming, and on-the-go productivity.",
    "Smart Home": "Intelligent home device that automates your space with app control, voice assistant support, and energy-saving smart routines. Effortless convenience, beautifully integrated.",
    "Photography": "Professional-grade imaging gear delivering outstanding low-light performance, razor-sharp detail, and intuitive controls. Capture every moment in stunning clarity.",
    "Sports & Fitness": "Engineered for performance with breathable materials, ergonomic support, and durable construction. Train harder and recover faster in total comfort.",
    "Office": "Premium workspace furniture and essentials designed for comfort and productivity. Supportive, adjustable, and built to last through long workdays.",
    "Wearables": "Smart wearable that tracks activity, heart rate, and sleep with accuracy. Stay connected with notifications and enjoy multi-day battery life.",
}

TAGS_TO_ENSURE = ["Best Seller", "New Arrival", "Premium", "Sale", "Wireless"]


class Command(BaseCommand):
    help = "Seed the store with a curated product catalog (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force-images",
            action="store_true",
            help="Re-download images even if the product already exists.",
        )

    def _ensure_category(self, name):
        category, _ = Category.objects.get_or_create(
            name=name, defaults={"is_active": True}
        )
        return category

    def _ensure_tag(self, name):
        tag, _ = Tag.objects.get_or_create(name=name, defaults={"is_active": True})
        return tag

    def _fetch_image(self, keywords):
        """Download a landscape placeholder image, returning a (file, size) tuple."""
        candidates = [
            f"https://loremflickr.com/{IMAGE_SIZE[0]}/{IMAGE_SIZE[1]}/{','.join(keywords)}",
            f"https://picsum.photos/seed/dreamstore-{'-'.join(keywords)}/{IMAGE_SIZE[0]}/{IMAGE_SIZE[1]}",
        ]
        for url in candidates:
            try:
                response = requests.get(url, timeout=60)
                response.raise_for_status()
                data = response.content
                with Image.open(io.BytesIO(data)) as img:
                    width, height = img.size
                if width < 400 or height < 400 or width < height:
                    continue
                tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
                tmp.write(data)
                tmp.flush()
                tmp.close()
                return tmp.name
            except Exception:
                continue
        return None

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO("Seeding product catalog…"))

        categories = {name: self._ensure_category(name) for name in set(p[1] for p in PRODUCTS)}
        tags = {name: self._ensure_tag(name) for name in TAGS_TO_ENSURE}

        created, skipped = 0, 0
        for name, category_name, price, tag_names, keywords in PRODUCTS:
            if Product.objects.filter(name=name).exists() and not options["force_images"]:
                skipped += 1
                continue

            image_path = self._fetch_image(keywords)
            if not image_path:
                self.stdout.write(
                    self.style.WARNING(f"  ! Could not download image for '{name}' — skipped")
                )
                continue

            product = Product(
                name=name,
                category=categories[category_name],
                price=Decimal(price),
                description=DESCRIPTIONS[category_name],
                is_active=True,
                approval_status=Product.ApprovalStatus.APPROVED,
            )
            with open(image_path, "rb") as handle:
                product.image.save(f"{name.lower().replace(' ', '_')}.jpg", File(handle), save=False)
                product.save()

            for tag_name in tag_names:
                product.tags.add(tags[tag_name])

            created += 1
            self.stdout.write(self.style.SUCCESS(f"  + {name} (${price})"))

        cache.clear()
        self.stdout.write(
            self.style.SUCCESS(f"Done. {created} added, {skipped} already existed.")
        )
