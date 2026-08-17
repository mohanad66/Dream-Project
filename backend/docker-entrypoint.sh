#!/bin/bash
set -e

echo "Starting Django application..."

# Run migrations
echo "Running migrations..."
python manage.py migrate --noinput

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput --clear

# Start server
echo "Starting server..."
exec python start.py
