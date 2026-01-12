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

# Fix database sequences for ALL tables, especially django_migrations
echo "Fixing database sequences..."
python manage.py shell <<EOF
from django.db import connection
tables = ['django_migrations', 'django_content_type', 'auth_permission', 'auth_group', 'auth_user']
with connection.cursor() as cursor:
    for table in tables:
        try:
            # This command resets the ID counter to the current maximum ID in the table
            cursor.execute(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM {table};")
            print(f"Fixed sequence for {table}")
        except Exception as e:
            print(f"Could not fix {table}: {e}")
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
