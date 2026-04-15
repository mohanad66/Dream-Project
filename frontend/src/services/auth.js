// frontend/src/services/auth.js
import { useState, useEffect, useCallback, useRef } from 'react';
import api from './api';
import { ACCESS_TOKEN, REFRESH_TOKEN } from './constants';
import { appCache } from '../utils/dataCache';
import { persistentCache } from '../utils/persistentCache'; // ← Change this

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

  const hasInitialized = useRef(false);

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

  const extractData = (response) => {
    if (response && typeof response === 'object' && Array.isArray(response.results)) {
      return response.results;
    }
    if (Array.isArray(response)) {
      return response;
    }
    return [];
  };

  // ✅ FIXED: Check cache FIRST, before any API calls
  const fetchAllData = useCallback(async (isAuth = false) => {
    try {
      const cacheKey = `public-data-${isAuth ? 'auth' : 'public'}`;

      // 🔥 CHECK CACHE FIRST (before logging or making requests)
      const cachedData = await persistentCache.get(cacheKey, 3 * 60 * 1000);
      if (cachedData) {
        console.log('✅ Using cached data (from disk) - NO API calls needed');
        setAuthData({
          data: cachedData,
          isLoading: false,
          isSuperuser: cachedData.user?.is_superuser || false
        });
        return true;
      }

      console.log('🌐 Fetching fresh data from API...');

      // Fetch public data
      const publicDataPromises = [
        api.get('/api/contact/'),
        api.get('/api/carousels/'),
        api.get('/api/categories/'),
        api.get('/api/products/'),
        api.get('/api/services/'),
        api.get('/api/tags/')
      ];

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

      const contacts = extractData(contactsResponse);
      const imgs = extractData(imgsResponse);
      const categories = extractData(categoriesResponse);
      const products = extractData(productsResponse);
      const services = extractData(servicesResponse);
      const tags = extractData(tagsResponse);

      const freshData = {
        contacts,
        imgs,
        categories,
        products,
        services,
        tags,
        user: userData
      };

      console.log('💾 Caching fresh data');

      // Store in cache
      await persistentCache.set(cacheKey, freshData);

      setAuthData({
        data: freshData,
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

  const logout = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
    delete api.defaults.headers.common['Authorization'];

    persistentCache.clear();

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

  const login = useCallback(async (credentials) => {
    setAuthData({ isLoading: true, error: null });

    try {
      const response = await api.post('/api/token/', credentials);

      localStorage.setItem(ACCESS_TOKEN, response.data.access);
      localStorage.setItem(REFRESH_TOKEN, response.data.refresh);
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;

      // Clear cache before fetching authenticated data
      appCache.clear();

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

  useEffect(() => {
    if (hasInitialized.current) {
      return;
    }
    hasInitialized.current = true;

    const initializeAuth = async () => {
      const token = localStorage.getItem(ACCESS_TOKEN);

      if (!token) {
        console.log('No token found, fetching public data...');
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
        await fetchAllData(true);
        setAuthData({ isAuthenticated: true });
      } catch (err) {
        console.error('Auth initialization failed:', err);
        setAuthData({ isAuthenticated: true, isLoading: false });

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
    fetchAllData,
    sendOTP,
    verifyOTP,
  };
};

// ✅ Cache pagination functions too
export const fetchAllTags = async (url) => {
  const cacheKey = `all-tags-${url}`;
  const cached = await persistentCache.get(cacheKey, 5 * 60 * 1000);

  if (cached) {
    console.log('✅ Using cached tags - NO API calls');
    return cached;
  }

  console.log('🌐 Fetching all tags from API...');
  let allTags = [];
  let nextUrl = url;

  try {
    while (nextUrl) {
      const response = await fetch(nextUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      allTags = [...allTags, ...data.results];
      nextUrl = data.next;
    }

    console.log(`💾 Cached ${allTags.length} tags`);
    await persistentCache.set(cacheKey, allTags);
    return allTags;
  } catch (error) {
    console.error('Error fetching tags:', error);
    return [];
  }
};

export const fetchAllCategories = async (url) => {
  const cacheKey = `all-categories-${url}`;
  const cached = await persistentCache.get(cacheKey, 5 * 60 * 1000);

  if (cached) {
    console.log('✅ Using cached categories - NO API calls');
    return cached;
  }

  console.log('🌐 Fetching all categories from API...');
  let allCategories = [];
  let nextUrl = url;

  try {
    while (nextUrl) {
      const response = await fetch(nextUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      allCategories = [...allCategories, ...data.results];
      nextUrl = data.next;
    }

    console.log(`💾 Cached ${allCategories.length} categories`);
    appCache.set(cacheKey, allCategories);
    await persistentCache.set(cacheKey, allCategories);

    return allCategories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};