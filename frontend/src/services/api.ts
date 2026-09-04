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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      error.response = {
        data: {
          error: 'Connection timeout. Render server is waking up from idle. Please try again in 5 seconds!',
        },
      };
    }
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('cabmitra_token');
      localStorage.removeItem('cabmitra_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
