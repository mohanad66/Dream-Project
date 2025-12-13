#!/usr/bin/env python
import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'your_project.settings')
django.setup()

from django.core import serializers
from django.db import connections

# Get SQLite data
sqlite_data = serializers.deserialize(
    "json", 
    serializers.serialize("json", 
        *list(serializers.get_model("auth.User").objects.all()), 
        use_natural_foreign_keys=True, 
        use_natural_primary_keys=True
    )
)

# Switch to Postgres and load
with connections['default'].cursor() as cursor:
    cursor.execute("SELECT 1")  # Test connection

# Simplified: just print counts for now
print("SQLite Users:", serializers.get_model("auth.User").objects.count())
# print("Postgres Users:", serializers.get_model("auth.User").objects.count())