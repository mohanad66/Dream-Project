// src/App.js
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Home from './Pages/Home/index.jsx';
import Products from './Pages/Products/index.jsx';
import About from './Pages/About us/index.jsx';
import Navbar from './Components/Navbar/index.jsx';
import "./css/style.scss";
import Cart from "./Pages/Cart/index.jsx";
import ProtectedRoute from './Components/ProtectedRoute/ProtectedRoute.jsx';
import Login from './Pages/Login/Login.jsx';
import Register from './Pages/Register/Register.jsx';
import { useAuth } from './services/auth';
import ProfilePage from './Pages/Profile/index.jsx';
import { ACCESS_TOKEN, REFRESH_TOKEN } from './services/constants.js';
import CheckoutPage from "./Pages/Checkout/index.jsx"
import { useLocation } from 'react-router-dom';
import VerifyOtp from './Pages/OTP/OTPVerify.jsx';

export default function App() {
  const {
    data,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout
  } = useAuth();

  const navigate = useNavigate();

  async function handleLogin(userData) {
    const success = await login(userData);
    if (success) {
      navigate('/');  // Use React Router navigation instead
    }
  }

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  }

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  const location = useLocation();

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        
        <Route path="/register" element={<Register />} />

        <Route path="/" element={
          <Home
            contacts={data.contacts || []}
            img={data.imgs || []}
            services={data.services || []}
            categories={data.categories || []}
            products={data.products || []}
            tags={data.tags || []}
          />
        } />

        <Route path="/products" element={
          <Products
            products={data.products || []}
            categories={data.categories || []}
            tags={data.tags || []}
          />
        } />

        <Route path="/cart" element={
          <Cart categories={data.categories || []} />
        } />

        <Route path="/checkout" element={
          <ProtectedRoute>
            <CheckoutPage />
          </ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute>
            <ProfilePage categories={data.categories} tags={data.tags} />
          </ProtectedRoute>
        } />
        {/* <Route path="/about" element={
          <ProtectedRoute>
            <About />
          </ProtectedRoute>
        } /> */}

        {/* <Route path="/verify-otp" element={<VerifyOtp />} /> */}

        <Route path='*' element={<Navigate to="/" replace />} />
      </Routes>
      {(location.pathname !== "/checkout" && location.pathname !== "/login" && location.pathname !== "/register") ? <Navbar onLogout={handleLogout} /> : null}
    </>
  );
}
