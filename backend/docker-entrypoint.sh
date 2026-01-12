#!/bin/bash
set -e

echo "Starting Django application..."

# Wait for database to be ready
if [ -n "$PGHOST" ]; then
    echo "Waiting for PostgreSQL at $PGHOST:$PGPORT..."
    
    timeout=60
    while ! nc -z $PGHOST $PGPORT 2>/dev/null; do
        timeout=$((timeout - 1))
        if [ $timeout -le 0 ]; then
            echo "Failed to connect to database"
            exit 1
        fi
        echo "Waiting for database... ($timeout seconds remaining)"
        sleep 1
    done
    
    echo "Database is ready!"
fi

# Run database migrations
echo "Running migrations..."
python manage.py makemigrations --noinput
python manage.py migrate --noinput

# Create superuser if it doesn't exist
echo "Creating superuser..."
python manage.py shell << END
from django.contrib.auth import get_user_model
import os

User = get_user_model()
username = os.getenv('DJANGO_SUPERUSER_USERNAME', 'admin')
email = os.getenv('DJANGO_SUPERUSER_EMAIL', 'admin@example.com')
password = os.getenv('DJANGO_SUPERUSER_PASSWORD', 'admin123')

if not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username, email, password)
    print(f'Superuser created: {username}')
else:
    print(f'Superuser already exists: {username}')
END

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Starting Gunicorn server..."
exec gunicorn backend.wsgi:application --bind 0.0.0.0:8000 --workers 3 --timeout 120 --access-logfile - --error-logfile -
