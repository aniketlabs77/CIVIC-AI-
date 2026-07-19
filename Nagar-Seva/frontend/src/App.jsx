import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import ReportIssue from './pages/ReportIssue';
import TrackComplaints from './pages/TrackComplaints';
import PublicDashboard from './pages/PublicDashboard';
import SafetyMap from './pages/SafetyMap';
import Login from './pages/Login';
import Register from './pages/Register';
import MyComplaints from './pages/MyComplaints';
import AdminPanel from './pages/AdminPanel';
import './styles/index.css';

function PrivateRoute({ children, allowedRoles }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return children;
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes - no auth required */}
        <Route path="/login" element={
          <PrivateRoute allowedRoles={[]}>
            <Login />
          </PrivateRoute>
        } />
        <Route path="/register" element={
          <PrivateRoute allowedRoles={[]}>
            <Register />
          </PrivateRoute>
        } />
        
        {/* Public pages accessible to everyone */}
        <Route path="/dashboard" element={
          <PublicRoute>
            <Layout>
              <PublicDashboard />
            </Layout>
          </PublicRoute>
        } />
        <Route path="/safety" element={
          <PublicRoute>
            <Layout>
              <SafetyMap />
            </Layout>
          </PublicRoute>
        } />

        {/* Protected citizen routes */}
        <Route path="/report" element={
          <PrivateRoute allowedRoles={['CITIZEN', 'ADMIN']}>
            <Layout>
              <ReportIssue />
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/track" element={
          <PrivateRoute allowedRoles={['CITIZEN', 'ADMIN']}>
            <Layout>
              <TrackComplaints />
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/my-complaints" element={
          <PrivateRoute allowedRoles={['CITIZEN']}>
            <Layout>
              <MyComplaints />
            </Layout>
          </PrivateRoute>
        } />

        {/* Admin routes */}
        <Route path="/admin" element={
          <PrivateRoute allowedRoles={['ADMIN']}>
            <Layout>
              <AdminPanel />
            </Layout>
          </PrivateRoute>
        } />

        {/* Home - redirect based on auth */}
        <Route path="/" element={
          <PublicRoute>
            <Layout>
              <Home />
            </Layout>
          </PublicRoute>
        } />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}