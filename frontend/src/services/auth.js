// src/services/auth.js
import { useState, useEffect, useCallback, useRef } from 'react';
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
      tags: [],
      user: null
    },
    isAuthenticated: false,
    isLoading: true,
    error: null
  });

  // Use ref to track if initialization has run
  const hasInitialized = useRef(false);

  // Unified state updater - stable reference
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

  // ✅ Helper function to extract data from paginated response
  const extractData = (response) => {
    // If response has results property (paginated), return results
    if (response && typeof response === 'object' && Array.isArray(response.results)) {
      return response.results;
    }
    // If response is already an array, return it
    if (Array.isArray(response)) {
      return response;
    }
    // Otherwise return empty array
    return [];
  };

  // Fetch data function - accepts isAuthenticated parameter
  const fetchAllData = useCallback(async (isAuth = false) => {
    try {
      console.log('Fetching all data...'); // Debug log

      // Fetch public data that doesn't require auth
      const publicDataPromises = [
        api.get('/api/contact/'),
        api.get('/api/carousels/'),
        api.get('/api/categories/'),
        api.get('/api/products/'),
        api.get('/api/services/'),
        api.get('/api/tags/')
      ];

      // Only fetch user data if authenticated
      let userData = null;
      if (isAuth) {
        try {
          const { data: user } = await api.get('/api/user/myuser/');
          userData = user;
        } catch (err) {
          console.error('Failed to fetch user data:', err);
        }
      }

      const [
        { data: contactsResponse },
        { data: imgsResponse },
        { data: categoriesResponse },
        { data: productsResponse },
        { data: servicesResponse },
        { data: tagsResponse }
      ] = await Promise.all(publicDataPromises);

      // ✅ Extract arrays from paginated responses
      const contacts = extractData(contactsResponse);
      const imgs = extractData(imgsResponse);
      const categories = extractData(categoriesResponse);
      const products = extractData(productsResponse);
      const services = extractData(servicesResponse);
      const tags = extractData(tagsResponse);

      console.log('Extracted data:', { 
        contacts: contacts.length, 
        imgs: imgs.length, 
        categories: categories.length, 
        products: products.length,
        services: services.length,
        tags: tags.length
      }); // Debug log

      setAuthData({
        data: { contacts, imgs, categories, products, services, tags, user: userData },
        isLoading: false,
        isSuperuser: userData?.is_superuser || false
      });
      return true;
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setAuthData({
        error: err.message || 'Failed to fetch data',
        isLoading: false,
        isSuperuser: false
      });
      throw err;
    }
  }, [setAuthData]);

  // Logout function - stable reference
  const logout = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
    delete api.defaults.headers.common['Authorization'];

    setAuthData({
      isAuthenticated: false,
      isLoading: false,
      data: {
        contacts: [],
        imgs: [],
        categories: [],
        products: [],
        services: [],
        tags: [],
        user: null
      }
    });
  }, [setAuthData]);

  // Login function - stable reference
  const login = useCallback(async (credentials) => {
    setAuthData({ isLoading: true, error: null });

    try {
      const response = await api.post('/api/token/', credentials);

      localStorage.setItem(ACCESS_TOKEN, response.data.access);
      localStorage.setItem(REFRESH_TOKEN, response.data.refresh);
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;

      // Fetch data WITH authentication
      await fetchAllData(true);

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
  }, [setAuthData, fetchAllData]);

  // OTP functions
  const sendOTP = useCallback(async () => {
    try {
      const response = await api.post("/api/otp/send/");
      return response.data;
    } catch (error) {
      console.error("Error sending OTP:", error);
      throw error;
    }
  }, []);

  const verifyOTP = useCallback(async (otp_code) => {
    try {
      const response = await api.post("/api/otp/verify/", { otp_code });
      return response.data;
    } catch (error) {
      console.error("Error verifying OTP:", error);
      throw error;
    }
  }, []);

  // Initialize auth - runs ONCE on mount
  useEffect(() => {
    // Prevent running twice in StrictMode or multiple renders
    if (hasInitialized.current) {
      return;
    }
    hasInitialized.current = true;

    const initializeAuth = async () => {
      const token = localStorage.getItem(ACCESS_TOKEN);

      if (!token) {
        console.log('No token found, fetching public data...');
        // Fetch public data WITHOUT authentication
        try {
          await fetchAllData(false);
        } catch (err) {
          console.error('Failed to fetch public data:', err);
        }
        setAuthData({ isLoading: false });
        return;
      }

      console.log('Token found, authenticating...');
      try {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        // Fetch data WITH authentication
        await fetchAllData(true);
        setAuthData({ isAuthenticated: true });
      } catch (err) {
        console.error('Auth initialization failed:', err);
        logout();
      }
    };

    initializeAuth();
  }, []);

  return {
    data: authState.data,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    error: authState.error,
    setAuthData,
    login,
    logout,
    fetchAllData,
    sendOTP,
    verifyOTP,
  };
};