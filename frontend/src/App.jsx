// src/App.js
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Home from './Pages/Home/index.jsx';
import Products from './Pages/Products/index.jsx';
import Cart from "./Pages/Cart/index.jsx";
import Login from './Pages/Login/Login.jsx';
import ProfilePage from './Pages/Profile/index.jsx';
import CheckoutPage from "./Pages/Checkout/index.jsx"
// import About from './Pages/About us/index.jsx';
import Navbar from './Components/Navbar/index.jsx';
import "./css/style.scss";
import ProtectedRoute from './Components/ProtectedRoute/ProtectedRoute.jsx';
import Register from './Pages/Register/Register.jsx';
import { useAuth } from './services/auth';
import { useLocation } from 'react-router-dom';
import VerifyOtp from './Pages/OTP/OTPVerify.jsx';
import React, { Suspense } from "react";


// const Home = React.lazy(() => import("./Pages/Home/index.jsx"));


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
  const location = useLocation();

  return (
    <>
      <Suspense fallback={<div>Loading...</div>}>
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
      </Suspense>
      {(location.pathname !== "/checkout" && location.pathname !== "/login" && location.pathname !== "/register") ? <Navbar onLogout={handleLogout} /> : null}
    </>
  );
}
