// frontend/src/services/auth.js
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import api from './api';
import { ACCESS_TOKEN, REFRESH_TOKEN } from './constants';
import { persistentCache } from '../utils/persistentCache';

// ✅ Global cache control - set to false to disable all frontend caching
const ENABLE_CACHE = import.meta.env.VITE_ENABLE_CACHE !== 'false' && true;

const PUBLIC_CACHE_TTL = 3 * 60 * 1000; // 3 minutes
const DATA_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const META_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const INITIAL_DATA = { user: null };

const extractResponseData = (response) => {
  if (!response) return null;
  if (Array.isArray(response)) return response;
  if (response.results && Array.isArray(response.results)) return response.results;
  return response;
};

const cacheGet = async (key, url) => {
  // Skip cache if disabled
  if (ENABLE_CACHE) {
    const cached = await persistentCache.get(key, PUBLIC_CACHE_TTL);
    if (cached) return cached;
  }

  const response = await api.get(url);
  const payload = extractResponseData(response.data);

  // Only set cache if enabled
  if (ENABLE_CACHE) {
    await persistentCache.set(key, payload);
  }

  return payload;
};

export const fetchContacts = () => cacheGet('contacts', '/api/contact/');
export const fetchCarouselImages = () => cacheGet('carousel_images', '/api/carousels/');
export const fetchCategories = () => cacheGet('categories', '/api/categories/');
export const fetchServices = () => cacheGet('services', '/api/services/');
export const fetchTags = () => cacheGet('tags', '/api/tags/');

export const fetchProducts = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = `/api/products/${query ? `?${query}` : ''}`;
  const cacheKey = query ? `products:${query}` : 'products:all';

  if (ENABLE_CACHE) {
    const cached = await persistentCache.get(cacheKey, PUBLIC_CACHE_TTL);
    if (cached) return cached;
  }

  const response = await api.get(url);
  const data = response.data;
  if (ENABLE_CACHE && !query) {
    await persistentCache.set(cacheKey, data);
  }
  return data;
};

const fetchCurrentUser = async () => {
  const response = await api.get('/api/user/myuser/');
  return response.data;
};

const INITIAL_AUTH_STATE = {
  data: INITIAL_DATA,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  isSuperuser: false,
};

export const useAuth = () => {
  const [authState, setAuthState] = useState({
    data: INITIAL_DATA,
    isAuthenticated: false,
    isLoading: true,
    error: null,
    isSuperuser: false
  });

  const hasInitialized = useRef(false);

  // Helper to extract results from paginated or direct responses
  const extractData = useCallback((response) => {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    if (response.results && Array.isArray(response.results)) return response.results;
    return [];
  }, []);

  const setAuthData = useCallback((updates) => {
    setAuthState(prev => {
      // Shallow compare to avoid unnecessary state updates if values are the same
      const nextState = { ...prev, ...updates };
      if (updates.data) {
        nextState.data = { ...prev.data, ...updates.data };
      }
      return nextState;
    });
  }, []);

  const fetchAllData = useCallback(async (isAuth = false) => {
    try {
      const cacheKey = `data-${isAuth ? 'auth' : 'public'}`;

      // 1. Check persistent cache first (only if enabled)
      if (ENABLE_CACHE) {
        const cachedData = await persistentCache.get(cacheKey, DATA_CACHE_TTL);
        if (cachedData) {
          if (import.meta.env.DEV) console.log('✅ [Auth] Using cached data');
          setAuthData({
            data: cachedData,
            isLoading: false,
            isSuperuser: cachedData.user?.is_superuser || false
          });
          return true;
        }
      }

      if (import.meta.env.DEV) console.log('🌐 [Auth] Fetching fresh data...');

      // 2. Fetch data in parallel
      const publicEndpoints = [
        '/api/contact/',
        '/api/carousels/',
        '/api/categories/',
        '/api/products/',
        '/api/services/',
        '/api/tags/'
      ];

      const requests = publicEndpoints.map(url => api.get(url));

      // If authenticated, also fetch user data
      let userPromise = null;
      if (isAuth) {
        userPromise = api.get('/api/user/myuser/').catch(err => {
          console.error('User fetch failed:', err);
          return { data: null };
        });
      }

      const results = await Promise.all([...requests, ...(userPromise ? [userPromise] : [])]);

      const freshData = {
        contacts: extractData(results[0].data),
        imgs: extractData(results[1].data),
        categories: extractData(results[2].data),
        products: extractData(results[3].data),
        services: extractData(results[4].data),
        tags: extractData(results[5].data),
        user: isAuth ? results[6]?.data : null
      };

      // 3. Update cache and state (only if enabled)
      if (ENABLE_CACHE) {
        await persistentCache.set(cacheKey, freshData);
      }

      setAuthData({
        data: freshData,
        isLoading: false,
        isSuperuser: freshData.user?.is_superuser || false
      });
      return true;
    } catch (err) {
      console.error('Data fetch failed:', err);
      setAuthData({
        error: err.message || 'Failed to fetch data',
        isLoading: false
      });
      return false;
    }
  }, [setAuthData, extractData]);

  const login = useCallback(async (credentials) => {
    setAuthData({ isLoading: true, error: null });
    try {
      const response = await api.post('/api/token/', credentials);
      localStorage.setItem(ACCESS_TOKEN, response.data.access);
      localStorage.setItem(REFRESH_TOKEN, response.data.refresh);

      // Set global header for immediate subsequent requests
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;

      // Clear public cache and fetch auth data
      await persistentCache.clear();
      await fetchAllData(true);

      setAuthData({ isAuthenticated: true, isLoading: false });
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

  const logout = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
    delete api.defaults.headers.common['Authorization'];
    persistentCache.clear();

    setAuthData({
      isAuthenticated: false,
      isLoading: false,
      isSuperuser: false,
      data: INITIAL_DATA
    });
  }, [setAuthData]);

  // Auth initialization logic
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initialize = async () => {
      const token = localStorage.getItem(ACCESS_TOKEN);
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        await fetchAllData(true);
        setAuthData({ isAuthenticated: true });
      } else {
        await fetchAllData(false);
        setAuthData({ isAuthenticated: false });
      }
    };

    initialize();
  }, [fetchAllData, setAuthData]);

  // Expose memoized value to prevent re-renders in components consuming this hook
  return useMemo(() => ({
    ...authState,
    login,
    logout,
    fetchAllData,
    sendOTP: async () => (await api.post("/api/otp/send/")).data,
    verifyOTP: async (otp_code) => (await api.post("/api/otp/verify/", { otp_code })).data,
  }), [authState, login, logout, fetchAllData]);
};

/**
 * Optimized helper for fetching paginated data with caching
 * Respects ENABLE_CACHE flag
 */
async function fetchPaginatedData(url, cacheKey) {
  if (ENABLE_CACHE) {
    const cached = await persistentCache.get(cacheKey, META_CACHE_TTL);
    if (cached) return cached;
  }

  let results = [];
  let nextUrl = url;

  try {
    while (nextUrl) {
      const response = await fetch(nextUrl);
      if (!response.ok) break;
      const data = await response.json();
      results = [...results, ...(data.results || [])];
      nextUrl = data.next;
    }
    if (ENABLE_CACHE) {
      await persistentCache.set(cacheKey, results);
    }
    return results;
  } catch (error) {
    console.error(`Error fetching ${cacheKey}:`, error);
    return [];
  }
}

export const fetchAllTags = (url) => fetchPaginatedData(url, `all-tags-${url}`);
export const fetchAllCategories = (url) => fetchPaginatedData(url, `all-categories-${url}`);
