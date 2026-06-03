// src/App.js - CLS Optimized Version
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import React, { Suspense, lazy, useCallback, useMemo } from "react";
import "./css/style.scss";
import { useAuth } from './services/auth';

// 1. EAGER LOADING CORE UI COMPONENTS
// To prevent CLS, the Navbar and main layout containers should never be lazy-loaded.
import Navbar from './Components/Navbar/index.jsx';
import ProtectedRoute from './Components/ProtectedRoute/ProtectedRoute.jsx';

// Lazy load page-level components
const Home = lazy(() => import('./Pages/Home/index.jsx'));
const Products = lazy(() => import('./Pages/Products/index.jsx'));
const Cart = lazy(() => import('./Pages/Cart/index.jsx'));
const Login = lazy(() => import('./Pages/Login/Login.jsx'));
const Register = lazy(() => import('./Pages/Register/Register.jsx'));
const ProfilePage = lazy(() => import('./Pages/Profile/index.jsx'));
const CheckoutPage = lazy(() => import('./Pages/Checkout/index.jsx'));
const VerifyOtp = lazy(() => import('./Pages/OTP/OTPVerify.jsx'));
const AdminAnalytics = lazy(() => import('./Pages/AdminAnalytics.jsx'));
const ForgotPassword = lazy(() => import('./Components/Form/ForgotPassword.jsx'));
const VerifyEmail = lazy(() => import('./Components/Form/VerifyEmail.jsx'));
const OrderDetailsPage = lazy(() => import('./Pages/OrderDetails/index.jsx'));
const OrdersPage = lazy(() => import('./Pages/Orders/index.jsx'));

const LoadingFallback = () => (
    <div className="loading-container">
<div style={{display: "flex", textAlign: "center", justifyContent: "center", alignItems: "center", flexDirection: "column"}}>
        <div style={{
          width: 48, height: 48, border: `3px solid var(--border-color)`,
          borderTop: `3px solid #3b82f6`, borderRadius: '50%',
          animation: 'spin 0.8s linear infinite', margin: 'auto 16px',
        }} />
        <p style={{ color: '#fff', fontSize: 14 }}>Loading…</p>
      </div>
    </div>
);

const HIDE_NAVBAR_ROUTES = ["/checkout", "/login", "/register", "/verify-otp"];

export default function App() {
  const { data, login, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = useCallback(async (userData) => {
    const success = await login(userData);
    if (success) navigate('/');
  }, [login, navigate]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const shouldShowNavbar = useMemo(() => 
    !HIDE_NAVBAR_ROUTES.includes(location.pathname), 
  [location.pathname]);

  const commonData = data || {};
  if (isLoading) {
    return <LoadingFallback />;
  }

  return (
    <div className="app-wrapper" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {shouldShowNavbar && <Navbar onLogout={handleLogout} />}

      <main style={{ flex: 1 }}>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-otp" element={<VerifyOtp />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            <Route path="/" element={
              <Home
                contacts={commonData.contacts || []}
                img={commonData.imgs || []}
                services={commonData.services || []}
                categories={commonData.categories || []}
                products={commonData.products || []}
                tags={commonData.tags || []}
              />
            } />

            <Route path="/products" element={
              <Products
                products={commonData.products || []}
                categories={commonData.categories || []}
                tags={commonData.tags || []}
              />
            } />

            <Route path="/cart" element={<Cart categories={commonData.categories || []} />} />

            <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage categories={commonData.categories} tags={commonData.tags} /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
            <Route path="/orders/:id" element={<ProtectedRoute><OrderDetailsPage /></ProtectedRoute>} />
            <Route path="/admin/analytics" element={<ProtectedRoute><AdminAnalytics /></ProtectedRoute>} />

            <Route path='*' element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
