# 🛒 Online Market Store

A full-stack e-commerce platform built with React and Django, featuring a modern UI and secure payment processing.

## 🌐 Live Demo

**Website:** [https://dream-project-umber.vercel.app]([https://dream-project-umber.vercel.app](https://frontend-production-d50a.up.railway.app/))

---

## 🚀 Features

- Modern, responsive user interface
- Secure user authentication with JWT
- Shopping cart functionality
- Stripe payment integration
- Product catalog with search and filtering
- Order management system
- Admin dashboard

---

## 🛠️ Tech Stack

### Frontend
- **React.js** - UI framework
- **SASS** - CSS preprocessor for styling
- **React Router** - Client-side routing
- **React Icons** - Icon library
- **Lucide React** - Additional icon set
- **Stripe** - Payment processing
- **Fancy Box** - Lightbox for images

### Backend
- **Django** - Web framework
- **Python** - Programming language
- **Django REST Framework** - API development
- **SimpleJWT** - JWT authentication
- **Django CORS Headers** - Cross-origin resource sharing
- **Django Unfold** - Modern admin interface
- **Stripe** - Payment processing (backend)

### Database
- **PostgreSQL** or **SQLite3** - Relational database

---

## 📦 Installation

### Prerequisites
- Node.js (v14+)
- Python (v3.8+)
- PostgreSQL (optional, SQLite3 by default)

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/mohanad66/Dream-Project.git
cd Dream-Project

# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start development server
python manage.py runserver
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
SECRET_KEY=your-django-secret-key
DEBUG=True
DATABASE_URL=your-database-url
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
```

Create a `.env` file in the frontend directory:

```env
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
```

---

## 📝 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products/` | Get all products |
| POST | `/api/auth/login/` | User login |
| POST | `/api/auth/register/` | User registration |
| GET | `/api/orders/` | Get user orders |
| POST | `/api/checkout/` | Process payment |

---

## 📁 Project Structure

```
Dream-Project/
├── backend/
│   ├── api/
│   ├── manage.py
│   ├── requirements.txt
│   └── settings.py
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── styles/
│   │   └── App.js
│   ├── package.json
│   └── package-lock.json
├── env/
├── .vscode/
├── docker-compose.prod.yml
├── render.yaml
└── README.md
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 👤 Author

**Mohanad**
- GitHub: [@mohanad66](https://github.com/mohanad66)
- Project Link: [https://github.com/mohanad66/Dream-Project](https://github.com/mohanad66/Dream-Project)

---

## 🙏 Acknowledgments

- React community for excellent documentation
- Django REST Framework team
- Stripe for payment integration
- All contributors to the open-source packages used

---

## 📞 Support

For support, email your.email@example.com or open an issue in the repository.
