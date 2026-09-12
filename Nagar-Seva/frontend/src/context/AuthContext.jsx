import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import apiClient from '../api/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('nagarseva_demo_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (fbUser) => {
    if (!fbUser) {
      setUser(null);
      return null;
    }

    try {
      const response = await apiClient.get('/api/auth/me');
      const profile = response.data;
      const combinedUser = {
        ...fbUser,
        id: profile.id,
        role: profile.role || 'CITIZEN',
        name: profile.name || fbUser.displayName || fbUser.email,
        email: profile.email || fbUser.email,
        department: profile.department || null,
        firebaseUid: fbUser.uid,
        notificationsEnabled: profile.notificationsEnabled ?? true,
      };
      setUser(combinedUser);
      return combinedUser;
    } catch (err) {
      console.warn('Failed to fetch user profile from backend:', err);
      const fallbackUser = {
        ...fbUser,
        role: 'CITIZEN',
        name: fbUser.displayName || fbUser.email,
        email: fbUser.email,
        department: null,
        firebaseUid: fbUser.uid,
        notificationsEnabled: true,
      };
      setUser(fallbackUser);
      return fallbackUser;
    }
  };

  const loginLocalDemo = (role, emailInput, nameInput, departmentInput) => {
    const isRoleAdmin = role === 'ADMIN';
    const dept = isRoleAdmin ? (departmentInput || 'Public Works & Road Safety (PWD)') : null;
    const demoUser = {
      uid: isRoleAdmin ? `demo-admin-${(dept || 'officer').toLowerCase().replace(/[^a-z0-9]/g, '-')}` : 'demo-citizen-1',
      email: emailInput || (isRoleAdmin ? 'admin@nagarseva.com' : 'citizen@nagarseva.com'),
      displayName: nameInput || (isRoleAdmin ? `${dept || 'Municipal'} Admin Officer` : 'Citizen User'),
      role: isRoleAdmin ? 'ADMIN' : 'CITIZEN',
      department: dept,
      id: isRoleAdmin ? 1 : 2,
      notificationsEnabled: true,
    };
    try {
      localStorage.setItem('nagarseva_demo_user', JSON.stringify(demoUser));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
    setUser(demoUser);
    return demoUser;
  };

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!isMounted) return;
      if (fbUser) {
        const initialUser = {
          ...fbUser,
          role: 'CITIZEN',
          name: fbUser.displayName || fbUser.email,
          email: fbUser.email,
          firebaseUid: fbUser.uid,
        };
        setUser(initialUser);
        setLoading(false);
        fetchUserProfile(fbUser);
      } else {
        const localUser = localStorage.getItem('nagarseva_demo_user');
        if (!localUser) {
          setUser(null);
        }
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const syncUserProfile = async ({ name, role, department }) => {
    try {
      const response = await apiClient.post('/api/auth/sync-profile', { name, role, department });
      const profile = response.data;
      setUser(prev => ({
        ...prev,
        role: profile.role || role || 'CITIZEN',
        name: profile.name || name || prev?.name,
        department: profile.department || department || prev?.department,
      }));
      return profile;
    } catch (err) {
      console.warn('Failed to sync user profile:', err);
      return null;
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('nagarseva_demo_user');
      await signOut(auth).catch(() => {});
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, fetchUserProfile, syncUserProfile, loginLocalDemo, auth }}>
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
