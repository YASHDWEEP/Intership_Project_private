import axios from 'axios';

const getBaseUrl = () => {
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl) return envUrl;
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:5000/api';
  }
  return 'https://cabmitra-backend.onrender.com/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Short-lived memory cache for GET lookup requests to speed up UI tab switching
const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 15000; // 15s cache TTL for repeated GET navigation

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('cabmitra_token') || localStorage.getItem('cabmitra_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Clear cache on mutating operations (POST, PUT, DELETE, PATCH)
  if (config.method && config.method.toUpperCase() !== 'GET') {
    apiCache.clear();
  }

  return config;
});

// Automatic Silent Retry Interceptor for Render Cold Starts & Network Drops
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // Initialize retry counter
    if (config) {
      config._retryCount = config._retryCount || 0;
    }

    const MAX_RETRIES = 5;
    const responseStatus = error.response?.status;
    const isRetryableError =
      !error.response || // Network connection drop / Server sleeping
      responseStatus === 502 ||
      responseStatus === 503 ||
      responseStatus === 504 ||
      responseStatus === 500 ||
      error.code === 'ECONNABORTED' ||
      error.code === 'ERR_NETWORK' ||
      error.message?.includes('timeout');

    if (config && isRetryableError && config._retryCount < MAX_RETRIES) {
      config._retryCount += 1;
      const delayMs = config._retryCount * 2500; // 2.5s, 5s, 7.5s, 10s, 12.5s
      console.warn(`⏳ Server warming up / network retry ${config._retryCount}/${MAX_RETRIES} in ${delayMs}ms...`);
      
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return api(config);
    }

    // Standard 401 Unauthorized handling
    if (error.response && error.response.status === 401) {
      sessionStorage.removeItem('cabmitra_token');
      sessionStorage.removeItem('cabmitra_user');
      localStorage.removeItem('cabmitra_token');
      localStorage.removeItem('cabmitra_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // Standardize friendly error message if retries were exhausted
    if (!error.response) {
      error.response = {
        data: {
          error: 'CabMitra cloud backend server is warming up. Please click Sign In again in a few seconds.',
        },
      };
    }

    return Promise.reject(error);
  }
);

export default api;
