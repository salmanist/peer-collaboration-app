@echo off
start "backend" cmd /k "cd backend && .venv\Scripts\activate && python manage.py runserver 0.0.0.0:8000"
start "mobile" cmd /k "cd mobile && npm run web"
