// src/App.js
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import React, { Suspense, lazy } from "react";
import Navbar from './Components/Navbar/index.jsx';
import ProtectedRoute from './Components/ProtectedRoute/ProtectedRoute.jsx';
import "./css/style.scss";
import { useAuth } from './services/auth';
import { useLocation } from 'react-router-dom';
import OrdersPage from './Pages/Orders/index.jsx';
import OrderDetailsPage from './Pages/OrderDetails/index.jsx';

const Home = lazy(() => import('./Pages/Home/index.jsx'));
const Products = lazy(() => import('./Pages/Products/index.jsx'));
const Cart = lazy(() => import('./Pages/Cart/index.jsx'));
const Login = lazy(() => import('./Pages/Login/Login.jsx'));
const Register = lazy(() => import('./Pages/Register/Register.jsx'));
const ProfilePage = lazy(() => import('./Pages/Profile/index.jsx'));
const CheckoutPage = lazy(() => import('./Pages/Checkout/index.jsx'));
const VerifyOtp = lazy(() => import('./Pages/OTP/OTPVerify.jsx'));

const LoadingFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
    <div>Loading...</div>
  </div>
);

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
  const location = useLocation();

  async function handleLogin(userData) {
    const success = await login(userData);
    if (success) {
      navigate('/');
    }
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  }

  const hideNavbarRoutes = ["/checkout", "/login", "/register", "/verify-otp"];
  const shouldShowNavbar = !hideNavbarRoutes.includes(location.pathname);

  return (
    <>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          
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
          
          {/* ✅ Fixed: Wrap orders routes with ProtectedRoute */}
          <Route path="/orders" element={
            <ProtectedRoute>
              <OrdersPage />
            </ProtectedRoute>
          } />
          
          <Route path="/orders/:id" element={
            <ProtectedRoute>
              <OrderDetailsPage />
            </ProtectedRoute>
          } />
          
          <Route path='*' element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      
      {shouldShowNavbar && <Navbar onLogout={handleLogout} />}
    </>
  );
}