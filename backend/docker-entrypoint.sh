#!/bin/bash

echo "Waiting for postgres..."
while ! nc -z $PGHOST $PGPORT; do
  sleep 0.1
done
echo "PostgreSQL started"

echo "Running migrations..."
python manage.py makemigrations --noinput
python manage.py migrate --noinput

echo "Creating superuser..."
python manage.py shell << END
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'adminpassword123')
    print('Superuser created')
else:
    print('Superuser already exists')
END

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Starting server..."
exec gunicorn backend.wsgi:application --bind 0.0.0.0:8000
