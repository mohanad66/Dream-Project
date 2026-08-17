<div align="center">

# DreamStore

**A premium full-stack e-commerce platform** connecting discerning shoppers with local brands, artisans, and independent creators.

Built with Django REST Framework + React 19 · Dark elegant UI · Stripe payments · Cloud storage

[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Django](https://img.shields.io/badge/Django-5.1-092E20?style=flat-square&logo=django&logoColor=white)](https://djangoproject.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev)
[![License](https://img.shields.io/badge/License-Educational%20Use%20Only-red?style=flat-square)](LICENSE)

</div>

---

## Overview

DreamStore is a production-ready e-commerce platform featuring a **premium dark-elegant UI** (deep navy + champagne gold), full product management, Stripe payment processing, seller onboarding, and a comprehensive admin dashboard with analytics.

The platform supports two seller roles:
- **Admin** — full access to all products, orders, users, analytics, and site content
- **Seller** — manages own products, tracks orders, and views personal analytics

## Features

### Customer Experience
- **Product Catalog** — browse by categories and tags with search, filtering, and pagination
- **Product Details** — image zoom (Fancybox), related products, tag system
- **Shopping Cart** — persistent cart with quantity management
- **Checkout** — Stripe integration with Apple Pay / Google Pay support
- **Order Tracking** — real-time order status with timeline visualization
- **User Auth** — JWT authentication with OTP email verification
- **User Profile** — edit account, change password, view order history
- **Dark / Light Mode** — toggle with persistent preference

### Seller Dashboard
- **Product Management** — add, edit, delete products with image uploads (Cloudinary)
- **Product Approval** — submit products for admin approval before they go live
- **Order Management** — view and update status of orders for own products
- **Analytics** — revenue, order volume, and top product performance

### Admin Panel (Django + Frontend)
- **Analytics Dashboard** — sales, new users, top products, purchase trends (Chart.js in Django admin, Recharts in frontend)
- **Product Management** — approve/reject products with rejection reasons
- **Seller Management** — approve/reject seller applications
- **Content Management** — carousel images, contact info, services, categories, tags
- **Order Management** — view and update all orders
- **User Management** — manage user accounts and roles

### UI / Design
- **Premium Dark Theme** — deep navy (`#0b0f17`) + champagne gold (`#c9a24b`) color palette
- **Playfair Display** serif headings, Inter body text
- **Animated Hero** — gradient orbs, gold particle shimmer, floating badge
- **Responsive** — mobile-first, works on all screen sizes
- **Toast Notifications** — success, error, warning feedback system
- **Confirm Dialogs** — replaces browser `window.confirm` for clean UX

## Tech Stack

### Backend

| Component | Technology |
|---|---|
| Framework | Django 5.1 + Django REST Framework |
| Auth | Simple JWT + OTP email verification |
| Database | PostgreSQL (prod) / SQLite (dev) |
| Caching | Redis via django-redis |
| File Storage | Cloudinary |
| Payments | Stripe (Payments API + Webhooks) |
| Admin Theme | Unfold |
| ASGI | Daphne + Channels |
| Deployment | Gunicorn + Whitenoise / Docker |

### Frontend

| Component | Technology |
|---|---|
| Framework | React 19 + Vite |
| Routing | React Router DOM 7 |
| Styling | Sass (SCSS) |
| HTTP Client | Axios |
| Charts | Recharts (analytics) |
| Icons | Lucide React, React Icons |
| Image Zoom | Fancybox |
| Payments | Stripe React SDK |
| PWA | vite-plugin-pwa |

## Project Structure

```
Dream-Project/
├── backend/
│   ├── api/                    # Core app — models, views, serializers, URLs
│   ├── backend/                # Django project settings
│   ├── otp_system/             # OTP verification system
│   ├── utils/                  # Shared utilities
│   ├── manage.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── Components/         # Reusable UI (Navbar, Footer, Carousel, Toast, etc.)
│   │   ├── Pages/              # Route pages (Home, Products, Cart, Profile, etc.)
│   │   ├── contexts/           # React Context providers (Theme, Auth)
│   │   ├── services/           # API service layer (auth.js)
│   │   ├── css/                # Global styles & variables
│   │   └── utils/              # Helpers
│   ├── package.json
│   └── Dockerfile.prod
├── docker-compose.prod.yml
├── render.yaml                 # Render.com deployment config
└── LICENSE
```

## Installation & Setup

### Prerequisites
- Python 3.9+
- Node.js 18+
- Git

### Backend

```bash
# Clone
git clone https://github.com/mohanad66/Dream-Project.git
cd Dream-Project/backend

# Virtual environment
python -m venv env
source env/bin/activate        # Windows: env\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

**Create `.env` file** in `backend/`:

```env
SECRET_KEY=your_django_secret_key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (SQLite by default, set DATABASE_URL for PostgreSQL)
# DATABASE_URL=postgresql://user:pass@localhost:5432/dbname

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret

# Email (for OTP)
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_app_password

# Optional
ENABLE_CACHING=True
REDIS_URL=redis://localhost:6379/0
SITE_NAME=DreamStore
```

```bash
# Migrate & seed
python manage.py migrate
python manage.py createsuperuser
python manage.py seed_products    # Optional: populate sample products

# Run
python manage.py runserver
```

Backend runs at `http://127.0.0.1:8000/api/`

### Frontend

```bash
cd ../frontend
npm install
```

**Create `.env` file** in `frontend/`:

```env
VITE_API_URL=http://localhost:8000/api/
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```

```bash
npm run dev
```

Frontend runs at `http://localhost:5173/`

## API Endpoints

| Category | Endpoint | Method | Auth |
|---|---|---|---|
| **Public** | `/api/products/` | GET | No |
| | `/api/categories/` | GET | No |
| | `/api/tags/` | GET | No |
| | `/api/carousels/` | GET | No |
| | `/api/services/` | GET | No |
| | `/api/contact/` | GET | No |
| **Auth** | `/api/token/` | POST | No |
| | `/api/token/refresh/` | POST | No |
| | `/api/user/register/` | POST | No |
| | `/api/user/verify-otp/` | POST | No |
| | `/api/auth/password/change/` | POST | Yes |
| **User** | `/api/user/myuser/` | GET/PUT/PATCH | Yes |
| **Cart** | `/api/cart/` | GET | Yes |
| | `/api/cart/items/` | POST/DELETE | Yes |
| **Orders** | `/api/orders/create/` | POST | Yes |
| | `/api/orders/mine/` | GET | Yes |
| | `/api/orders/<id>/` | GET | Yes |
| **Payments** | `/api/payments/create-intent/` | POST | Yes |
| | `/api/webhooks/stripe/` | POST | No |
| **Seller** | `/api/sellers/me/` | GET/PUT/PATCH | Yes (seller) |
| | `/api/sellers/products/` | GET/POST | Yes (seller) |
| **Admin** | `/api/admins/products/` | GET | Yes (admin) |
| | `/api/admins/products/<id>/review/` | PATCH | Yes (admin) |
| | `/api/admins/sellers/` | GET/PATCH | Yes (admin) |
| | `/api/admins/orders/` | GET | Yes (admin) |
| | `/api/admins/users/` | GET | Yes (admin) |
| **Analytics** | `/api/analytics/new-users/` | GET | Yes (admin) |
| | `/api/analytics/top-products/` | GET | Yes (admin) |
| | `/api/analytics/purchases/` | GET | Yes (admin) |

## Deployment

### Docker (Production)

```bash
docker-compose -f docker-compose.prod.yml up --build
```

- Backend: Gunicorn on port 8000
- Frontend: Nginx serving built assets on port 80

### Render.com

The project includes `render.yaml` for one-click deployment:
- Backend service (Docker)
- Frontend service (Docker)
- Managed PostgreSQL database

Update the `repo` URL in `render.yaml` to your fork before deploying.

## Contributing

Contributions are welcome! Fork the repository, create a feature branch, and submit a pull request.

## License

This project is licensed under a custom **Educational Use Only License**. See [LICENSE](LICENSE) for details.

You may study, modify, and learn from the code. Commercial use, redistribution, and use as a template for other projects are **not permitted**.
