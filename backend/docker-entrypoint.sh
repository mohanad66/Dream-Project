#!/bin/bash
set -e

echo "Starting entrypoint script..."

# Wait for database
if [ -n "$PGHOST" ]; then
    echo "Waiting for postgres at $PGHOST:$PGPORT..."
    
    counter=0
    until nc -z $PGHOST $PGPORT 2>/dev/null; do
        counter=$((counter+1))
        if [ $counter -gt 30 ]; then
            echo "Could not connect to database after 30 attempts"
            exit 1
        fi
        echo "Attempt $counter: Database not ready, waiting..."
        sleep 2
    done
    
    echo "PostgreSQL is ready!"
fi

# Run migrations
echo "Running makemigrations..."
python manage.py makemigrations --noinput || echo "No migrations to make"

echo "Running migrate..."
python manage.py migrate --noinput

# Create superuser
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
    print(f'Superuser {username} created successfully')
else:
    print(f'Superuser {username} already exists')
END

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Starting Gunicorn..."
exec gunicorn backend.wsgi:application --bind 0.0.0.0:8000 --workers 3 --timeout 120


