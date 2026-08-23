import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const cleanEnv = (val, fallback) => {
  if (!val) return fallback;
  return String(val).trim().replace(/^["']|["']$/g, '');
};

const firebaseConfig = {
  apiKey: cleanEnv(import.meta.env.VITE_FIREBASE_API_KEY, 'AIzaSyDummyKeyForLocalDevelopmentOnly123'),
  authDomain: cleanEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, 'nagarseva-app.firebaseapp.com'),
  projectId: cleanEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID, 'nagarseva-app'),
  storageBucket: cleanEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, 'nagarseva-app.appspot.com'),
  messagingSenderId: cleanEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, '1234567890'),
  appId: cleanEnv(import.meta.env.VITE_FIREBASE_APP_ID, '1:1234567890:web:abcdef123456'),
};

// Initialize Firebase once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export default app;
