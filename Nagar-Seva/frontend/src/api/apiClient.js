import axios from 'axios';
import { auth } from '../firebase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include Firebase ID token or Local Demo Token in Authorization header
apiClient.interceptors.request.use(async (config) => {
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const token = await currentUser.getIdToken();
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
        return config;
      }
    } catch (e) {
      console.warn('Error getting Firebase ID token:', e);
    }
  }

  // Fallback for local demo mode without Firebase
  try {
    const localUserJson = localStorage.getItem('nagarseva_demo_user');
    if (localUserJson) {
      const localUser = JSON.parse(localUserJson);
      const role = localUser.role || 'CITIZEN';
      const email = localUser.email || (role === 'ADMIN' ? 'admin@nagarseva.com' : 'citizen@nagarseva.com');
      const uid = localUser.uid || ('demo-' + role.toLowerCase() + '-1');
      config.headers['Authorization'] = `Bearer demo-token:${role}:${email}:${uid}`;
    }
  } catch (e) {
    console.warn('Local demo token header notice:', e);
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

export default apiClient;