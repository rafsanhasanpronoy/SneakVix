# SneakVix

SneakVix is a sneaker e-commerce platform built with:

- Django + Django REST Framework
- PostgreSQL (Supabase)
- Static HTML, CSS and JavaScript frontend
- Netlify (frontend hosting)
- Render (backend hosting)

## Live Architecture

Frontend:
- Netlify

Backend:
- Django API on Render

Database:
- Supabase PostgreSQL

## Environment Variables

### Backend (Render)

Required:

```env
SECRET_KEY=your_secret_key
DEBUG=False
ALLOWED_HOSTS=sneakvix.onrender.com
DATABASE_URL=postgresql://...
CORS_ALLOWED_ORIGINS=https://sneakvix.netlify.app
```

Optional Email (Resend):

```env
RESEND_API_KEY=re_xxxxxxxxx
DEFAULT_FROM_EMAIL=orders@sneakvix.com
```

## Deployment

### Frontend

Deploy the frontend folder to Netlify.

Set the API base URL in the frontend configuration:

```js
https://sneakvix.onrender.com/api
```

### Backend

Deploy the Django backend to Render.

Build Command:

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
```

Start Command:

```bash
gunicorn config.wsgi:application
```

## Features

- Product catalog
- Product details
- Shopping cart
- Checkout system
- Order management
- Admin dashboard
- Responsive frontend

## Current Status

Completed:
- Product browsing
- Cart management
- Checkout workflow
- Supabase database integration
- Netlify frontend deployment
- Render backend deployment

Planned Improvements:
- Enhanced admin product management
- Order analytics dashboard
- Inventory tracking
- Coupon system
- Advanced search and filtering

## Repository Structure

```text
backend/
frontend/
assets/
```

## License

Private project for SneakVix.
