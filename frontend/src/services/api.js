import axios from 'axios';
import { ACCESS_TOKEN, REFRESH_TOKEN } from './constants';

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/";

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        console.log(`🚀 REQUEST: ${config.method?.toUpperCase()} ${config.url}`, {
            skipAuthRefresh: config.skipAuthRefresh,
            hasAuth: !!config.headers.Authorization,
            data: config.data
        });

        if (config.skipAuthRefresh) {
            console.log(`⚠️ SKIPPING AUTH for ${config.url}`);
            return config;
        }

        const token = localStorage.getItem(ACCESS_TOKEN);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        console.error('❌ REQUEST ERROR:', error);
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => {
        console.log(`✅ RESPONSE: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
        return response;
    },
    async (error) => {
        console.error(`❌ RESPONSE ERROR: ${error.response?.status} ${error.config?.method?.toUpperCase()} ${error.config?.url}`);

        const originalRequest = error.config;

        if (originalRequest.skipAuthRefresh) {
            console.log(`⚠️ SKIPPING REFRESH for ${originalRequest.url} (skipAuthRefresh flag)`);
            return Promise.reject(error);
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
            console.log(`🔄 ATTEMPTING TOKEN REFRESH for failed request: ${originalRequest.url}`);
            originalRequest._retry = true;

            const refreshToken = localStorage.getItem(REFRESH_TOKEN);
            if (refreshToken) {
                try {
                    console.log('🔑 Making token refresh request...');

                    const response = await axios.post(`${API_URL}/api/token/refresh/`, {
                        refresh: refreshToken
                    });

                    const newAccessToken = response.data.access;
                    localStorage.setItem(ACCESS_TOKEN, newAccessToken);

                    api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;

                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                    console.log(`🔄 RETRYING original request: ${originalRequest.url}`);
                    return api(originalRequest);
                } catch (refreshError) {
                    console.error('💥 TOKEN REFRESH FAILED:', refreshError);
                    console.error('💥 REFRESH ERROR RESPONSE:', refreshError.response?.data);

                    localStorage.removeItem(ACCESS_TOKEN);
                    localStorage.removeItem(REFRESH_TOKEN);
                    delete api.defaults.headers.common['Authorization'];

                    window.location.href = '/login';
                    return Promise.reject(refreshError);
                }
            } else {
                console.log('❌ No refresh token available');
                localStorage.removeItem(ACCESS_TOKEN);
                localStorage.removeItem(REFRESH_TOKEN);
                delete api.defaults.headers.common['Authorization'];
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);
let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => {
    refreshSubscribers.push(cb);
};

const onRefreshed = (token) => {
    refreshSubscribers.forEach(cb => cb(token));
    refreshSubscribers = [];
};

api.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve) => {
                    subscribeTokenRefresh((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        resolve(api(originalRequest));
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const refreshToken = localStorage.getItem(REFRESH_TOKEN);
                const { data } = await axios.post('/api/token/refresh/', { refresh: refreshToken });

                localStorage.setItem(ACCESS_TOKEN, data.access);
                api.defaults.headers.common['Authorization'] = `Bearer ${data.access}`;
                onRefreshed(data.access);

                originalRequest.headers.Authorization = `Bearer ${data.access}`;
                return api(originalRequest);
            } catch (e) {
                localStorage.removeItem(ACCESS_TOKEN);
                localStorage.removeItem(REFRESH_TOKEN);
                window.location.href = '/login';
                return Promise.reject(e);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);
export default api;