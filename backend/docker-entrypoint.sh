#!/bin/bash

set -e

echo "Starting Django application..."

# Wait for PostgreSQL
echo "Waiting for PostgreSQL at ${PGHOST}:${PGPORT}..."
until nc -z -w 1 "$PGHOST" "$PGPORT"; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done

echo "Database is ready!"

# FORCE FIX for django_migrations ID column
echo "Force fixing django_migrations auto-increment..."
python manage.py shell <<EOF
from django.db import connection
with connection.cursor() as cursor:
    try:
        # 1. Create the sequence if it doesn't exist
        cursor.execute("CREATE SEQUENCE IF NOT EXISTS django_migrations_id_seq;")
        # 2. Set the sequence to the current max ID
        cursor.execute("SELECT setval('django_migrations_id_seq', COALESCE((SELECT MAX(id) FROM django_migrations), 1));")
        # 3. Force the column to use the sequence as its default value
        cursor.execute("ALTER TABLE django_migrations ALTER COLUMN id SET DEFAULT nextval('django_migrations_id_seq');")
        # 4. Ensure the column is linked to the sequence
        cursor.execute("ALTER SEQUENCE django_migrations_id_seq OWNED BY django_migrations.id;")
        print("Successfully force-fixed django_migrations auto-increment!")
    except Exception as e:
        print(f"Force fix failed: {e}")
EOF

# Run migrations
echo "Running migrations..."
python manage.py migrate --noinput

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput --clear

# Start server
echo "Starting server..."
exec python start.py
