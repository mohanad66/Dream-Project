@echo off
echo Starting DreamProject...

echo Starting Backend Server...
start cmd /k "cd backend && python manage.py runserver"

echo Starting Frontend Server...
start cmd /k "cd frontend && npm run dev"

echo Project services are starting in separate windows.
