<div align="center">

# DreamStore

**A premium full-stack e-commerce marketplace** connecting discerning shoppers with local brands, artisans, and independent creators.

Built with Django REST Framework + React 19 · Dark elegant UI · Paymob + Fawry payments · Free cloud deployment

**[Live Demo](https://dream-project-roan.vercel.app)**

[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Django](https://img.shields.io/badge/Django-5.1-092E20?style=flat-square&logo=django&logoColor=white)](https://djangoproject.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev)
[![License](https://img.shields.io/badge/License-Educational%20Use%20Only-red?style=flat-square)](LICENSE)

</div>

---

## Live Demo

| Service | URL |
|---|---|
| **Frontend** | [dream-project-roan.vercel.app](https://dream-project-roan.vercel.app) |
| **Backend API** | [legislative-lynelle-idk1321-fdbb6c71.koyeb.app](https://legislative-lynelle-idk1321-fdbb6c71.koyeb.app) |

## Overview

DreamStore is a production-ready e-commerce marketplace featuring a **premium dark-elegant UI** (deep navy + champagne gold), full product management, multi-gateway Egyptian payment processing (Paymob + Fawry), seller onboarding with customizable commissions, and a comprehensive admin dashboard with analytics.

The platform supports three user roles:
- **Admin** — full access to all products, orders, users, analytics, and site content
- **Seller** — manages own products, tracks orders, creates offers/coupons, and views personal analytics
- **Customer** — browses products, shops with secure payment, tracks orders

## Features

### Customer Experience
- **Product Catalog** — browse by categories and tags with search, filtering, price range, and pagination
- **Product Details** — image carousel with gallery, zoom (Fancybox), related products, tag system
- **Shopping Cart** — persistent cart with quantity management
- **Checkout** — multi-gateway payment selection (Paymob card iframe, Fawry, or Cash on Delivery)
- **Order Tracking** — real-time order status with timeline visualization
- **User Auth** — JWT authentication with OTP email verification
- **User Profile** — edit account, change password, view order history
- **Dark / Light Mode** — toggle with persistent preference
- **Scroll Reveal Animations** — smooth fade-in-up transitions on scroll

### Seller Dashboard
- **Product Management** — add, edit, delete products with image uploads (Cloudinary)
- **Product Approval** — submit products for admin approval before they go live
- **Order Management** — view and update status of orders for own products
- **Offers & Coupons** — create percentage-based discounts on individual products or entire store
- **Delivery Type** — choose between platform delivery (standard) or self-delivery (50% reduced commission)
- **Analytics** — revenue, order volume, and top product performance
- **Paymob Account** — linked Paymob account ID and wallet number for payouts

### Payment System
- **Paymob Card Checkout** — PCI-compliant iframe integration for Visa/Mastercard with 3DS authentication
- **Fawry** — mobile wallet and cash payment for Egyptian customers
- **Webhook Handling** — automatic payment status updates via Paymob webhooks
- **Payment Callbacks** — server-side order status mapping on payment completion

### Commission System
- **Global Default Rate** — configurable platform-wide commission percentage via `PlatformSettings`
- **Per-Seller Override** — individual sellers can have custom commission rates
- **Delivery Type Modifier** — sellers choosing self-delivery pay 50% reduced commission
- **Effective Rate Calculation** — `effective_commission_rate()` method on `SellerProfile`

### Admin Panel (Django + Frontend)
- **Analytics Dashboard** — sales, new users, top products, purchase trends (Recharts in frontend)
- **Product Management** — approve/reject products with rejection reasons
- **Seller Management** — approve/reject seller applications
- **Commission Settings** — configure global commission rate
- **Content Management** — carousel images, contact info, services, categories, tags
- **Order Management** — view and update all orders
- **User Management** — manage user accounts and roles

### UI / Design
- **Premium Dark Theme** — deep navy (`#0b0f17`) + champagne gold (`#c9a24b`) color palette
- **Playfair Display** serif headings, Inter body text
- **Animated Hero** — gradient orbs, gold particle shimmer, floating badge
- **Floating Bottom Navbar** — glass-morphism pill navigation with active indicator
- **Skeleton Loading** — shimmer placeholders for card images
- **Responsive** — mobile-first, horizontal-scroll navbar, works on all screen sizes
- **Toast Notifications** — success, error, warning feedback system
- **Confirm Dialogs** — replaces browser `window.confirm` for clean UX
- **Page Transitions** — smooth route transitions with React.lazy code splitting

## Tech Stack

### Backend

| Component | Technology |
|---|---|
| Framework | Django 5.1 + Django REST Framework |
| Auth | Simple JWT + OTP email verification |
| Database | PostgreSQL (prod) / SQLite (dev) |
| Caching | Redis via django-redis |
| File Storage | Cloudinary |
| Payments | Paymob (Card iframe + Webhooks) + Fawry |
| Admin Theme | Unfold |
| ASGI | Daphne + Channels |
| Deployment | Koyeb (free tier) |

### Frontend

| Component | Technology |
|---|---|
| Framework | React 19 + Vite 7 |
| Routing | React Router DOM 7 |
| Styling | Sass (SCSS) |
| HTTP Client | Axios |
| Charts | Recharts (analytics) |
| Icons | Lucide React, React Icons |
| Image Zoom | Fancybox |
| Payments | Paymob iframe SDK |
| SEO | react-helmet-async |
| PWA | vite-plugin-pwa |
| Deployment | Vercel (free tier) |

## Project Structure

```
Dream-Project/
├── backend/
│   ├── api/                    # Core app — models, views, serializers, URLs
│   │   ├── payment_gateways.py # Paymob iframe + Fawry integration
│   │   ├── models.py           # Product, Order, SellerProfile, PlatformSettings, SellerOffer
│   │   ├── views.py            # REST API views
│   │   └── serializer.py       # DRF serializers
│   ├── backend/                # Django project settings
│   ├── otp_system/             # OTP verification system
│   ├── utils/                  # Shared utilities
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── Components/         # Reusable UI (Navbar, Footer, Carousel, Card, CheckoutForm, Toast)
│   │   ├── Pages/              # Route pages (Home, Products, Cart, Profile, Seller, Admin)
│   │   ├── contexts/           # React Context providers (Theme, Auth)
│   │   ├── services/           # API service layer (api.js, auth.js)
│   │   ├── hooks/              # Custom hooks (useReveal)
│   │   ├── css/                # Global styles & variables
│   │   └── utils/              # Helpers
│   ├── package.json
│   └── vite.config.js
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

# Paymob
PAYMOB_SECRET_KEY=your_paymob_api_key
PAYMOB_INTEGRATION_ID=your_integration_id
PAYMOB_HMAC_SECRET=your_hmac_secret
PAYMOB_WALLET_INTEGRATION_ID=your_wallet_integration_id
PAYMOB_IFRAME_ID=your_iframe_id
PAYMOB_BASE_URL=https://accept.paymob.com/api
PAYMOB_PROFILE_ID=your_profile_id

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret

# Email (for OTP)
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_app_password

# URLs
BACKEND_URL=http://127.0.0.1:8000
FRONTEND_URL=http://localhost:5173

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

The frontend API URL is hardcoded in `src/services/api.js` to point to the deployed backend. For local development, change it to `http://127.0.0.1:8000`.

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
| | `/api/contact/` | GET | No |
| | `/api/sellers/<id>/` | GET | No |
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
| **Payments** | `/api/payments/paymob/init/` | POST | Yes |
| | `/api/payments/paymob/callback/` | GET | No |
| | `/api/payments/paymob/webhook/` | POST | No |
| | `/api/payments/fawry/` | POST | Yes |
| **Seller** | `/api/sellers/me/` | GET/PUT/PATCH | Yes (seller) |
| | `/api/sellers/products/` | GET/POST | Yes (seller) |
| | `/api/sellers/offers/` | GET/POST | Yes (seller) |
| **Admin** | `/api/admins/products/` | GET | Yes (admin) |
| | `/api/admins/products/<id>/review/` | PATCH | Yes (admin) |
| | `/api/admins/sellers/` | GET/PATCH | Yes (admin) |
| | `/api/admins/orders/` | GET | Yes (admin) |
| | `/api/admins/users/` | GET | Yes (admin) |
| **Analytics** | `/api/analytics/new-users/` | GET | Yes (admin) |
| | `/api/analytics/top-products/` | GET | Yes (admin) |
| | `/api/analytics/purchases/` | GET | Yes (admin) |
| **Platform** | `/api/platform-settings/` | GET/PUT/PATCH | Yes (admin) |

## Deployment

This project is deployed for free using:

- **Backend** — [Koyeb](https://www.koyeb.com/) (free tier)
- **Frontend** — [Vercel](https://vercel.com/) (free tier)

### Deploy Yourself

**Backend (Koyeb):**
1. Push to GitHub
2. Create a Koyeb account
3. Create a new service from your GitHub repo
4. Set build command: `pip install -r requirements.txt`
5. Set run command: `gunicorn backend.wsgi:application --bind 0.0.0.0:$PORT`
6. Add environment variables (Paymob keys, secret key, etc.)

**Frontend (Vercel):**
1. Push to GitHub
2. Import project on Vercel
3. Set framework preset to Vite
4. Deploy — Vercel auto-detects the build config

## Contributing

Contributions are welcome! Fork the repository, create a feature branch, and submit a pull request.

## License

This project is licensed under a custom **Educational Use Only License**. See [LICENSE](LICENSE) for details.

You may study, modify, and learn from the code. Commercial use, redistribution, and use as a template for other projects are **not permitted**.
