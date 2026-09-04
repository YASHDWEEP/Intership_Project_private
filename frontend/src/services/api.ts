import axios from 'axios';

const api = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_BASE_URL || 'https://cabmitra-backend.onrender.com/api',
  timeout: 120000, // 120s timeout for Render free tier cold starts & DB transactions
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cabmitra_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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

    const MAX_RETRIES = 4;
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
      const delayMs = config._retryCount * 2000; // 2s, 4s, 6s, 8s
      console.warn(`⏳ Server warming up / network retry ${config._retryCount}/${MAX_RETRIES} in ${delayMs}ms...`);
      
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return api(config);
    }

    // Standard 401 Unauthorized handling
    if (error.response && error.response.status === 401) {
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
          error: 'CabMitra backend server is reconnecting. Please try your request again in a few seconds.',
        },
      };
    }

    return Promise.reject(error);
  }
);

export default api;
