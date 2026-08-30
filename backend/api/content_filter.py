import re

from django.db.models import Q

# Placeholder / dev-junk product names that should never reach shoppers
# (e.g. "wwwww", "wwwweawa", "BUILD A WEB PRODUCT THAT WORKS", tiny names).
JUNK_NAME_RE = re.compile(
    r"(?:wwwweawa|react/django\s+portfolio|build\s+a\s+web\s+product|"
    r"\bdummy\b|\bplaceholder\b|\btest\s+product\b|\bdemo\b)|(.)\1{3,}",
    re.IGNORECASE,
)


def exclude_junk_products(queryset):
    """Drop dev placeholder listings from a public Product queryset."""
    return queryset.exclude(
        Q(name__iregex=r"(.)\1{3,}")
        | Q(
            name__iregex=r"wwwweawa|react/django\s+portfolio|build\s+a\s+web\s+product|\bdummy\b|\bplaceholder\b|\btest\s+product\b|\bdemo\b"
        )
        | Q(name__iregex=r"^\s*\w{1,3}\s*$")
    )


def is_junk_name(name):
    if not name:
        return True
    name = str(name).strip()
    if len(name) < 4:
        return True
    return bool(JUNK_NAME_RE.search(name))