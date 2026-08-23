import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import apiClient from '../api/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (fbUser) => {
    if (!fbUser) {
      setUser(null);
      return null;
    }

    try {
      // Fetch user profile from backend (backend automatically syncs Firebase user)
      const response = await apiClient.get('/api/auth/me');
      const profile = response.data;
      const combinedUser = {
        ...fbUser,
        id: profile.id,
        role: profile.role || 'CITIZEN',
        name: profile.name || fbUser.displayName || fbUser.email,
        email: profile.email || fbUser.email,
        firebaseUid: fbUser.uid,
      };
      setUser(combinedUser);
      return combinedUser;
    } catch (err) {
      console.warn('Failed to fetch user profile from backend:', err);
      // Fallback with default CITIZEN role if backend endpoint fails
      const fallbackUser = {
        ...fbUser,
        role: 'CITIZEN',
        name: fbUser.displayName || fbUser.email,
        email: fbUser.email,
        firebaseUid: fbUser.uid,
      };
      setUser(fallbackUser);
      return fallbackUser;
    }
  };

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!isMounted) return;
      if (fbUser) {
        // Set initial user synchronously so UI renders immediately
        const initialUser = {
          ...fbUser,
          role: 'CITIZEN',
          name: fbUser.displayName || fbUser.email,
          email: fbUser.email,
          firebaseUid: fbUser.uid,
        };
        setUser(initialUser);
        setLoading(false);
        // Then enrich with backend role asynchronously
        fetchUserProfile(fbUser);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const syncUserProfile = async ({ name, role }) => {
    try {
      const response = await apiClient.post('/api/auth/sync-profile', { name, role });
      const profile = response.data;
      setUser(prev => ({
        ...prev,
        role: profile.role || role || 'CITIZEN',
        name: profile.name || name || prev?.name,
      }));
      return profile;
    } catch (err) {
      console.warn('Failed to sync user profile:', err);
      return null;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, fetchUserProfile, syncUserProfile, auth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
