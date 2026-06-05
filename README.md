# Dream-Project

## Overview
Dream-Project is a full-stack e-commerce platform designed to provide a seamless shopping experience for users and a robust administration panel for managing products, orders, and analytics. Built with a modern tech stack, it features secure user authentication, a comprehensive product catalog, a shopping cart, and an integrated payment gateway.

## Features

### User Features
*   **Product Catalog**: Browse and search for products across various categories and tags.
*   **Product Details**: View detailed information about each product, including descriptions, prices, and images.
*   **Shopping Cart**: Add products to a persistent shopping cart.
*   **User Authentication**: Secure registration, login, and password management with JWT-based authentication and OTP verification.
*   **User Profile**: Manage personal information and view order history.
*   **Checkout & Payments**: Integrated Stripe payment gateway for secure transactions.
*   **Order Management**: View past orders and their details.

### Admin Features
*   **Dashboard & Analytics**: Comprehensive analytics dashboard for new users, top products, and purchases.
*   **Product Management**: Create, read, update, and delete products, categories, and tags.
*   **Order Management**: View and update customer orders.
*   **User Management**: Manage user accounts and roles.
*   **Content Management**: Manage carousel images and contact information.

## Tech Stack

### Backend
*   **Framework**: Django (5.1.5)
*   **API**: Django REST Framework (DRF)
*   **Authentication**: Simple JWT for token-based authentication, OTP system for verification.
*   **Database**: PostgreSQL (via `dj-database-url`), SQLite for local development.
*   **Caching**: Redis (via `django-redis`) for API response caching.
*   **File Storage**: Cloudinary for media file management.
*   **Payments**: Stripe integration for payment processing.
*   **Deployment**: Gunicorn, Whitenoise for static files, Docker.
*   **Other Libraries**: `psycopg2-binary`, `requests`, `Pillow`, `unidecode`, `django-cors-headers`.

### Frontend
*   **Framework**: React (19.1.0)
*   **Build Tool**: Vite
*   **Routing**: React Router DOM (7.7.1)
*   **State Management**: Context API (ThemeContext).
*   **Styling**: Sass (SCSS modules).
*   **HTTP Client**: Axios.
*   **UI Components**: `lucide-react`, `react-icons`, `@fancyapps/ui`.
*   **Charts**: Recharts for data visualization in admin analytics.
*   **Payments**: `@stripe/react-stripe-js` for Stripe integration.
*   **Deployment**: Docker (Nginx).

## Installation and Setup

To get a local copy up and running, follow these steps.

### Prerequisites
*   Python 3.9+
*   Node.js 18+
*   Docker (optional, for containerized deployment)
*   Git

### Backend Setup
1.  **Clone the repository**:
    ```bash
    git clone https://github.com/mohanad66/Dream-Project.git
    cd Dream-Project/backend
    ```
2.  **Create a virtual environment and install dependencies**:
    ```bash
    python3 -m venv env
    source env/bin/activate
    pip install -r requirements.txt
    ```
3.  **Environment Variables**: Create a `.env` file in the `backend` directory with the following (example values):
    ```env
    SECRET_KEY=your_django_secret_key
    DEBUG=True
    ALLOWED_HOSTS=localhost,127.0.0.1
    DATABASE_URL=sqlite:///db.sqlite3
    STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
    STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
    STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret
    CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
    CLOUDINARY_API_KEY=your_cloudinary_api_key
    CLOUDINARY_API_SECRET=your_cloudinary_api_secret
    EMAIL_HOST_USER=your_email@gmail.com
    EMAIL_HOST_PASSWORD=your_email_app_password
    SITE_NAME=DreamStore
    ENABLE_CACHING=True
    REDIS_URL=redis://localhost:6379/0
    ```
4.  **Run Migrations**:
    ```bash
    python manage.py migrate
    ```
5.  **Create a Superuser** (for admin access):
    ```bash
    python manage.py createsuperuser
    ```
6.  **Run the Backend Server**:
    ```bash
    python manage.py runserver
    ```
    The backend API will be available at `http://127.0.0.1:8000/api/`.

### Frontend Setup
1.  **Navigate to the frontend directory**:
    ```bash
    cd ../frontend
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Environment Variables**: Create a `.env` file in the `frontend` directory with the following (example values):
    ```env
    VITE_API_URL=http://localhost:8000/api/
    VITE_STRIPE_PUBLIC_KEY=pk_test_your_stripe_publishable_key
    ```
4.  **Run the Frontend Development Server**:
    ```bash
    npm run dev
    ```
    The frontend application will be available at `http://localhost:5173/` (or another port as indicated by Vite).

## Usage

### As a User
1.  **Register/Login**: Create an account or log in using your credentials.
2.  **Browse Products**: Explore the product catalog, filter by categories or tags.
3.  **Add to Cart**: Select products and add them to your shopping cart.
4.  **Checkout**: Proceed to checkout, provide shipping details, and complete payment via Stripe.
5.  **View Orders**: Access your profile to view your order history.

### As an Administrator
1.  **Login**: Log in with your superuser credentials.
2.  **Access Admin Panel**: Navigate to the Django admin panel (typically `http://127.0.0.1:8000/admin/`) to manage database entries directly, or use the in-app admin dashboard (e.g., `/profile` page in the frontend) for a more integrated experience.
3.  **Manage Content**: Add/edit products, categories, tags, services, and carousel images.
4.  **Monitor Analytics**: View sales, user growth, and product performance through the analytics dashboard.

## API Endpoints

The backend exposes a comprehensive set of RESTful API endpoints:

*   **Public Data**: `/api/products/`, `/api/categories/`, `/api/carousels/`, `/api/services/`, `/api/contact/`, `/api/tags/`
*   **Authentication**: `/api/token/`, `/api/token/refresh/`, `/api/token/verify/`, `/api/user/register/`, `/api/auth/password/change/`
*   **User Management**: `/api/user/myuser/`, `/api/user/all/`, `/api/user/<int:pk>/`
*   **Order & Payments**: `/api/payments/create-intent/`, `/api/orders/create/`, `/api/orders/mine/`, `/api/orders/<int:pk>/`, `/api/webhooks/stripe/`
*   **Admin Management**: `/api/admins/products/`, `/api/admins/categories/`, `/api/admins/carousels/`, `/api/admins/services/`, `/api/admins/contacts/`, `/api/admins/tags/`, `/api/admins/orders/`
*   **Analytics**: `/api/analytics/new-users/`, `/api/analytics/top-products/`, `/api/analytics/purchases/`

## Deployment
The project includes `Dockerfile` for the backend and `Dockerfile.prod` for the frontend, enabling containerized deployment using Docker. The backend is configured for production with Gunicorn and Whitenoise, and the frontend uses Nginx to serve static files.

## Contributing
Contributions are welcome! Please feel free to fork the repository, create a new branch, and submit a pull request with your improvements.

## License
This project is licensed under the Educational Use Only License. See the LICENSE.md file for details.
