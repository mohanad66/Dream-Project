// src/services/auth.js
import { useState, useEffect, useCallback } from 'react';
import api from './api';
import { ACCESS_TOKEN, REFRESH_TOKEN } from './constants';

export const useAuth = () => {
  const [authState, setAuthState] = useState({
    data: {
      contacts: [],
      imgs: [],
      categories: [],
      products: [],
      services: [],
      user: null
    },
    isAuthenticated: false,
    isLoading: true,
    error: null
  });

  // Unified state updater
  const setAuthData = useCallback((updates) => {
    setAuthState(prev => ({
      ...prev,
      ...updates,
      data: {
        ...prev.data,
        ...(updates.data || {})
      }
    }));
  }, []);

  const fetchAllData = useCallback(async () => {
    setAuthData({ isLoading: true, error: null });

    try {
      const [
        { data: contacts },
        { data: imgs },
        { data: categories },
        { data: products },
        { data: services },
        { data: user }
      ] = await Promise.all([
        api.get('/api/contact/'),
        api.get('/api/carousels/'),
        api.get('/api/categories/'),
        api.get('/api/products/'),
        api.get('/api/services/'),
        api.get('/api/user/myuser/').catch(() => ({ data: null })) // User endpoint is optional
      ]);

      setAuthData({
        data: { contacts, imgs, categories, products, services, user },
        isLoading: false,
        isSuperuser: user?.is_superuser || false, // Add this line

      });
      return true;
    } catch (err) {
      setAuthData({
        error: err.message || 'Failed to fetch data',
        isLoading: false,
        isSuperuser: false, // Default to false on error

      });
      throw err;
    }
  }, [setAuthData]);

  const login = async (credentials) => {
    setAuthData({ isLoading: true, error: null });

    try {
      const response = await api.post('/api/token/', credentials);

      localStorage.setItem(ACCESS_TOKEN, response.data.access);
      localStorage.setItem(REFRESH_TOKEN, response.data.refresh);
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;

      // Fetch all data including user profile after login
      await fetchAllData();

      setAuthData({
        isAuthenticated: true,
        isLoading: false
      });
      return true;
    } catch (err) {
      setAuthData({
        error: err.response?.data?.detail || 'Login failed',
        isLoading: false,
        isAuthenticated: false
      });
      return false;
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
    delete api.defaults.headers.common['Authorization'];

    setAuthData({
      isAuthenticated: false,
      data: {
        contacts: [],
        imgs: [],
        categories: [],
        products: [],
        services: [],
        user: null
      }
    });
  }, [setAuthData]);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem(ACCESS_TOKEN);

      if (!token) {
        setAuthData({ isLoading: false });
        return;
      }

      try {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        await fetchAllData();
        setAuthData({ isAuthenticated: true });
      } catch (err) {
        console.error('Auth initialization failed:', err);
        logout();
      } finally {
        setAuthData({ isLoading: false });
      }
    };

    initializeAuth();
  }, [fetchAllData, logout, setAuthData]);

  return {
    data: authState.data,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    error: authState.error,
    setAuthData,
    login,
    logout,
    fetchAllData
  };
};