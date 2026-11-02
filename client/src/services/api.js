import axios from 'axios';

const api = axios.create({
  // VITE_API_URL is set only for the native (Capacitor) build or split hosting, e.g. https://my-app.onrender.com
  baseURL: `${(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')}/api`,
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sla_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('sla_token');
      localStorage.removeItem('sla_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);

export default api;
