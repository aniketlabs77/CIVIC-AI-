import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import ReportIssue from './pages/ReportIssue';
import TrackComplaints from './pages/TrackComplaints';
import PublicDashboard from './pages/PublicDashboard';
import SafetyMap from './pages/SafetyMap';
import Login from './pages/Login';
import Register from './pages/Register';
import MyComplaints from './pages/MyComplaints';
import MunicipalOfficerDashboard from './pages/MunicipalOfficerDashboard';
import AdminPanel from './pages/AdminPanel';
import './styles/index.css';

function DashboardRoute() {
  const { user } = useAuth();
  const isAdmin = user && (user.role || '').toUpperCase() === 'ADMIN';
  return isAdmin ? <MunicipalOfficerDashboard /> : <PublicDashboard />;
}

function PrivateRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#7c5cff] border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-500">Loading NagarSeva...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = (user?.role || 'CITIZEN').toUpperCase();
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.map(r => r.toUpperCase()).includes(userRole)) {
    return <Navigate to={userRole === 'ADMIN' ? '/dashboard' : '/my-complaints'} replace />;
  }

  return children;
}

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#7c5cff] border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-500">Checking session...</p>
        </div>
      </div>
    );
  }

  if (user) {
    const userRole = (user?.role || 'CITIZEN').toUpperCase();
    return <Navigate to={userRole === 'ADMIN' ? '/dashboard' : '/my-complaints'} replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Auth routes - only accessible when NOT signed in */}
          <Route path="/login" element={
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          } />
          <Route path="/register" element={
            <PublicOnlyRoute>
              <Register />
            </PublicOnlyRoute>
          } />

          {/* Primary Dashboard Route - Adapts to Officer vs Citizen */}
          <Route path="/" element={
            <Layout>
              <DashboardRoute />
            </Layout>
          } />

          <Route path="/dashboard" element={
            <Layout>
              <DashboardRoute />
            </Layout>
          } />

          {/* Explicit Officer Command Center Route */}
          <Route path="/officer-dashboard" element={
            <PrivateRoute allowedRoles={['ADMIN']}>
              <Layout>
                <MunicipalOfficerDashboard />
              </Layout>
            </PrivateRoute>
          } />
          
          <Route path="/safety" element={
            <Layout>
              <SafetyMap />
            </Layout>
          } />

          <Route path="/report" element={
            <Layout>
              <ReportIssue />
            </Layout>
          } />

          <Route path="/track" element={
            <Layout>
              <TrackComplaints />
            </Layout>
          } />

          {/* Protected User Pages */}
          <Route path="/my-complaints" element={
            <PrivateRoute allowedRoles={['CITIZEN', 'ADMIN']}>
              <Layout>
                <MyComplaints />
              </Layout>
            </PrivateRoute>
          } />

          {/* Admin-only Routes */}
          <Route path="/admin" element={
            <PrivateRoute allowedRoles={['ADMIN']}>
              <Layout>
                <AdminPanel />
              </Layout>
            </PrivateRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}