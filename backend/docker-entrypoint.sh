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

# Force fixing django_migrations ID column auto-increment
echo "Force fixing django_migrations auto-increment..."
python manage.py shell <<EOF
from django.db import connection
with connection.cursor() as cursor:
    try:
        # 1. Create the sequence if it doesn't exist
        cursor.execute("CREATE SEQUENCE IF NOT EXISTS django_migrations_id_seq;")
        # 2. Set the sequence to the current max ID
        cursor.execute("SELECT setval(\'django_migrations_id_seq\', COALESCE((SELECT MAX(id) FROM django_migrations), 1), false);")
        # 3. Force the column to use the sequence as its default value
        cursor.execute("ALTER TABLE django_migrations ALTER COLUMN id SET DEFAULT nextval(\'django_migrations_id_seq\');")
        # 4. Ensure the column is linked to the sequence
        cursor.execute("ALTER SEQUENCE django_migrations_id_seq OWNED BY django_migrations.id;")
        print("Successfully force-fixed django_migrations auto-increment!")
    except Exception as e:
        print(f"Force fix failed: {e}")
EOF

# Force fixing django_content_type and auth_permission ID columns auto-increment
echo "Force fixing django_content_type and auth_permission auto-increment..."
python manage.py shell <<EOF
from django.db import connection
with connection.cursor() as cursor:
    try:
        # Create sequences if they don't exist
        cursor.execute("CREATE SEQUENCE IF NOT EXISTS django_content_type_id_seq;")
        cursor.execute("CREATE SEQUENCE IF NOT EXISTS auth_permission_id_seq;")

        cursor.execute("SELECT setval(\'django_content_type_id_seq\', COALESCE((SELECT MAX(id) FROM django_content_type), 1), false);")
        cursor.execute("ALTER TABLE django_content_type ALTER COLUMN id SET DEFAULT nextval(\'django_content_type_id_seq\');")
        cursor.execute("ALTER SEQUENCE django_content_type_id_seq OWNED BY django_content_type.id;")

        cursor.execute("SELECT setval(\'auth_permission_id_seq\', COALESCE((SELECT MAX(id) FROM auth_permission), 1), false);")
        cursor.execute("ALTER TABLE auth_permission ALTER COLUMN id SET DEFAULT nextval(\'auth_permission_id_seq\');")
        cursor.execute("ALTER SEQUENCE auth_permission_id_seq OWNED BY auth_permission.id;")
        print("Successfully force-fixed django_content_type and auth_permission auto-increment!")
    except Exception as e:
        print(f"Force fix for content_type/permission failed: {e}")
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
