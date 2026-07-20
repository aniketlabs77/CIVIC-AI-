import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import ReportIssue from "./pages/ReportIssue";
import TrackComplaints from "./pages/TrackComplaints";
import PublicDashboard from "./pages/PublicDashboard";
import SafetyMap from "./pages/SafetyMap";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MyComplaints from "./pages/MyComplaints";
import AdminPanel from "./pages/AdminPanel";
import "./styles/index.css";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
            <p className="text-gray-600 mb-4">Please refresh the page.</p>
            <button onClick={() => window.location.reload()} className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700">
              Refresh
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function PrivateRoute({ children, allowedRoles }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) try { setUser(JSON.parse(stored)); } catch { setUser(null); }
    setLoading(false);
  }, []);
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function PublicRoute({ children }) { return children; }

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<PublicRoute><Layout><PublicDashboard /></Layout></PublicRoute>} />
          <Route path="/safety" element={<PublicRoute><Layout><SafetyMap /></Layout></PublicRoute>} />
          <Route path="/report" element={<PrivateRoute allowedRoles={["CITIZEN","ADMIN"]}><Layout><ReportIssue /></Layout></PrivateRoute>} />
          <Route path="/track" element={<PrivateRoute allowedRoles={["CITIZEN","ADMIN"]}><Layout><TrackComplaints /></Layout></PrivateRoute>} />
          <Route path="/my-complaints" element={<PrivateRoute allowedRoles={["CITIZEN"]}><Layout><MyComplaints /></Layout></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute allowedRoles={["ADMIN"]}><Layout><AdminPanel /></Layout></PrivateRoute>} />
          <Route path="/" element={<PublicRoute><Layout><Home /></Layout></PublicRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}