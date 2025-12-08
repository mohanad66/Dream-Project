// src/App.js
import { Routes, Route, Navigate } from 'react-router-dom';
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
import api from './services/api.js';
import CheckoutPage from "./Pages/Checkout/index.jsx"
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';

export default function App() {
  const {
    data,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout
  } = useAuth();

  async function handleLogin(userData) {
    await login(userData);
    window.location.href = '/';
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
          <ProtectedRoute>
            <Home
              contacts={data.contacts || []}
              img={data.imgs || []}
              services={data.services || []}
              categories={data.categories || []}
              products={data.products || []}
              tags={data.tags || []}
            />
          </ProtectedRoute>
        } />

        <Route path="/products" element={
          <ProtectedRoute>
            <Products
              products={data.products || []}
              categories={data.categories || []}
              tags={data.tags || []}
            />
          </ProtectedRoute>
        } />

        <Route path="/cart" element={
          <ProtectedRoute>
            <Cart categories={data.categories || []} />
          </ProtectedRoute>
        } />

        <Route path="/about" element={
          <ProtectedRoute>
            <About />
          </ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute>
            <ProfilePage categories={data.categories} tags={data.tags} />
          </ProtectedRoute>
        } />

        <Route path="/checkout" element={
          <ProtectedRoute>
            <CheckoutPage />
          </ProtectedRoute>
        } />

        <Route path='*' element={<Navigate to="/" replace />} />
      </Routes>
      {(localStorage.getItem(ACCESS_TOKEN) !== null && location.pathname !== "/checkout") ? <Navbar onLogout={handleLogout} /> : null}
    </>
  );
}
