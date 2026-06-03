import axios from 'axios';
import { ACCESS_TOKEN, REFRESH_TOKEN } from './constants';

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/";

// State for handling concurrent token refreshes
let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => {
    refreshSubscribers.push(cb);
};

const onRefreshed = (token) => {
    refreshSubscribers.forEach((cb) => cb(token));
    refreshSubscribers = [];
};

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor
api.interceptors.request.use(
    (config) => {
        // Only log in development environment to improve production performance
        if (import.meta.env.DEV) {
            console.log(`🚀 [API] REQUEST: ${config.method?.toUpperCase()} ${config.url}`);
        }

        if (config.skipAuthRefresh) return config;

        const token = localStorage.getItem(ACCESS_TOKEN);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        if (import.meta.env.DEV) console.error('❌ [API] REQUEST ERROR:', error);
        return Promise.reject(error);
    }
);

// Unified Response Interceptor
api.interceptors.response.use(
    (response) => {
        if (import.meta.env.DEV) {
            console.log(`✅ [API] RESPONSE: ${response.status} ${response.config.url}`);
        }
        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        
        // Handle network errors or missing config
        if (!originalRequest) return Promise.reject(error);

        const status = error.response ? error.response.status : null;

        // Skip refresh logic if explicitly requested
        if (originalRequest.skipAuthRefresh) {
            return Promise.reject(error);
        }

        // Handle 401 Unauthorized errors
        if (status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // Queue the request if a refresh is already in progress
                return new Promise((resolve) => {
                    subscribeTokenRefresh((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        resolve(api(originalRequest));
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = localStorage.getItem(REFRESH_TOKEN);
            
            if (!refreshToken) {
                handleAuthFailure();
                return Promise.reject(error);
            }

            try {
                if (import.meta.env.DEV) console.log('🔑 [API] Refreshing token...');
                
                // Use a clean axios instance for the refresh call to avoid interceptor loops
                const { data } = await axios.post(`${API_URL}/api/token/refresh/`, {
                    refresh: refreshToken
                });

                const newAccessToken = data.access;
                localStorage.setItem(ACCESS_TOKEN, newAccessToken);
                
                // Update global headers and notify subscribers
                api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
                onRefreshed(newAccessToken);

                // Retry the original request
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                if (import.meta.env.DEV) console.error('💥 [API] Refresh failed:', refreshError);
                handleAuthFailure();
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

/**
 * Helper to handle authentication failures consistently
 */
function handleAuthFailure() {
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
    delete api.defaults.headers.common['Authorization'];
    
    // Avoid redirect loop if already on login page
    if (window.location.pathname !== '/login') {
        window.location.href = '/login';
    }
}

export default api;
