// src/App.js
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './Pages/Home/index.jsx';
import Products from './Pages/Products/index.jsx';
import About from './Pages/About us/index.jsx';
import Navbar from './Components/Navbar/index.jsx';
import "./css/style.scss";
import FavoritesPage from "./Pages/Favourite/index.jsx";
import ProtectedRoute from './Components/ProtectedRoute/ProtectedRoute.jsx';
import Login from './Pages/Login/Login.jsx';
import Register from './Pages/Register/Register.jsx';
import { useAuth } from './services/auth';
import ProfilePage from './Pages/Profile/index.jsx';
import { ACCESS_TOKEN, REFRESH_TOKEN } from './services/constants.js';
import api from './services/api.js';

export default function App() {
  const {
    data,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout
  } = useAuth();

  // This function will be passed to your Form component
  async function handleLogin(userData) {
    // Use the login function from useAuth hook
    await login(userData);
    // Refresh the page after login
      window.location.href = '/'; // Navigate to home page
  }

  const handleLogout = () => {
    logout();
    // Force full page refresh after logout
    window.location.href = '/login';
  }

  if (isLoading) return <div className='loading'>loading...</div>

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
            />
          </ProtectedRoute>
        } />

        <Route path="/products" element={
          <ProtectedRoute>
            <Products
              products={data.products || []}
              categories={data.categories || []}
            />
          </ProtectedRoute>
        } />

        <Route path="/favourite" element={
          <ProtectedRoute>
            <FavoritesPage categories={data.categories || []} />
          </ProtectedRoute>
        } />

        <Route path="/about" element={
          <ProtectedRoute>
            <About />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } />
        <Route path='*' element={<Navigate to="/" replace />} />
      </Routes>
      {localStorage.getItem(ACCESS_TOKEN) !== null ? <Navbar onLogout={handleLogout} /> : null}
    </>
  );
}
