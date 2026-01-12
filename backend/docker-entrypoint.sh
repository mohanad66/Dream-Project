echo "Starting Django application..."

# Wait for PostgreSQL
echo "Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}..."
# Added -w 1 for a 1-second timeout to prevent the usage error
while ! nc -z -w 1 "${PGHOST}" "${PGPORT}"; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done

echo "Database is ready!"

# ... rest of your script ...


# Fix django_migrations sequence BEFORE running migrations
echo "Fixing database sequences..."
python manage.py shell <<EOF
from django.db import connection
try:
    with connection.cursor() as cursor:
        cursor.execute("SELECT setval('django_migrations_id_seq', COALESCE((SELECT MAX(id) FROM django_migrations), 0) + 1, false);")
    print("Sequence fixed successfully!")
except Exception as e:
    print(f"Note: {e}")
EOF

# Run migrations
echo "Running migrations..."
python manage.py migrate --noinput

# Collect static files
python manage.py collectstatic --noinput --clear

# Start server
exec "$@"
