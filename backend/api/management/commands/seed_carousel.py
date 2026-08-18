"""
Seed the store with carousel hero images.

Usage:
    python manage.py seed_carousel

Downloads landscape photos and uploads them as carousel slides.
The command is idempotent: carousel names that already exist are skipped.
"""

import io
import random
import tempfile

import requests
from django.core.files import File
from django.core.management.base import BaseCommand
from PIL import Image

from api.models import CarouselImg

IMAGE_SIZE = (1200, 600)

CAROUSEL_ITEMS = [
    {
        "name": "Summer Collection",
        "query": "summer+beach+fashion",
        "alt_query": "beach+ocean+vacation",
    },
    {
        "name": "New Arrivals",
        "query": "shopping+store+modern",
        "alt_query": "fashion+boutique+display",
    },
    {
        "name": "Electronics Sale",
        "query": "technology+gadgets+modern",
        "alt_query": "laptop+phone+desk",
    },
    {
        "name": "Home & Living",
        "query": "interior+design+modern",
        "alt_query": "cozy+living+room+decor",
    },
    {
        "name": "Premium Quality",
        "query": "luxury+product+gold",
        "alt_query": "premium+elegant+quality",
    },
]


def fetch_image(query, alt_query):
    """Try loremflickr with fallback to picsum."""
    urls = [
        f"https://loremflickr.com/{IMAGE_SIZE[0]}/{IMAGE_SIZE[1]}/{query}",
        f"https://loremflickr.com/{IMAGE_SIZE[0]}/{IMAGE_SIZE[1]}/{alt_query}",
        f"https://picsum.photos/{IMAGE_SIZE[0]}/{IMAGE_SIZE[1]}?random={random.randint(1, 9999)}",
    ]

    for url in urls:
        try:
            resp = requests.get(url, timeout=15, allow_redirects=True)
            if resp.status_code == 200:
                img = Image.open(io.BytesIO(resp.content))
                w, h = img.size
                if w >= IMAGE_SIZE[0] and h >= int(IMAGE_SIZE[0] * 0.4):
                    if w < h:
                        img = img.crop((0, 0, h, h))
                        img = img.resize(IMAGE_SIZE, Image.LANCZOS)
                    else:
                        img = img.resize(IMAGE_SIZE, Image.LANCZOS)

                    buf = io.BytesIO()
                    img.convert("RGB").save(buf, format="JPEG", quality=85)
                    buf.seek(0)
                    return buf
        except Exception:
            continue

    img = Image.new("RGB", IMAGE_SIZE, color=(random.randint(20, 80), random.randint(20, 80), random.randint(80, 160)))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    buf.seek(0)
    return buf


class Command(BaseCommand):
    help = "Seed the database with carousel images"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete all existing carousel images before seeding",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            CarouselImg.objects.all().delete()
            self.stdout.write(self.style.WARNING("Cleared all carousel images."))

        created = 0
        skipped = 0

        for idx, item in enumerate(CAROUSEL_ITEMS):
            if CarouselImg.objects.filter(name=item["name"]).exists():
                self.stdout.write(f"  Skipped (exists): {item['name']}")
                skipped += 1
                continue

            self.stdout.write(f"  Downloading image for: {item['name']}...")
            buf = fetch_image(item["query"], item["alt_query"])

            carousel = CarouselImg(name=item["name"], is_active=True, order=idx)
            carousel.image.save(
                f"carousel_{idx}.jpg",
                File(buf),
                save=True,
            )
            created += 1
            self.stdout.write(self.style.SUCCESS(f"  Created: {item['name']}"))

        self.stdout.write(
            self.style.SUCCESS(
                f"\nCarousel seeding complete: {created} created, {skipped} skipped."
            )
        )
