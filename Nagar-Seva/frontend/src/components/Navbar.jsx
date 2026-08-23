import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const navPillClass = (path) => {
    const active = isActive(path);
    return `px-4 py-2 rounded-full text-xs sm:text-sm transition-all duration-200 ${
      active
        ? 'bg-[#7c5cff] text-white font-bold shadow-sm'
        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100/80 font-medium'
    }`;
  };

  return (
    <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 mb-2">
      <nav className="bg-white rounded-full p-2 sm:p-2.5 shadow-card border border-gray-100/80 flex items-center justify-between gap-2">
        {/* Brand / Logo */}
        <Link to="/" className="flex items-center gap-2.5 pl-3 pr-2 py-1 group">
          <div className="w-8 h-8 rounded-xl bg-[#7c5cff] flex items-center justify-center text-white text-base font-black shadow-sm group-hover:scale-105 transition-transform">
            🏛️
          </div>
          <span className="text-base sm:text-lg font-extrabold text-gray-900 tracking-tight">
            Nagar<span className="text-[#7c5cff]">Seva</span>
          </span>
        </Link>

        {/* Center Pill Nav Links */}
        <div className="hidden md:flex items-center gap-1 bg-gray-50/80 p-1 rounded-full border border-gray-100">
          <Link to="/dashboard" className={navPillClass('/dashboard')}>
            Dashboard
          </Link>
          <Link to="/safety" className={navPillClass('/safety')}>
            Safety Map
          </Link>

          {user && (
            <>
              <Link to="/report" className={navPillClass('/report')}>
                Report Issue
              </Link>
              {user.role === 'CITIZEN' && (
                <Link to="/my-complaints" className={navPillClass('/my-complaints')}>
                  My Complaints
                </Link>
              )}
              {user.role === 'ADMIN' && (
                <Link to="/admin" className={navPillClass('/admin')}>
                  Admin Panel
                </Link>
              )}
              <Link to="/track" className={navPillClass('/track')}>
                Track All
              </Link>
            </>
          )}
        </div>

        {/* Right Section: Auth & Profile */}
        <div className="flex items-center gap-2 pr-1">
          {user ? (
            <div className="flex items-center gap-2">
              {/* User Profile Pill */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100">
                <span className="text-xs font-semibold text-gray-800 truncate max-w-[120px]">
                  {user?.name || user?.email || 'User'}
                </span>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                  user?.role === 'ADMIN'
                    ? 'bg-red-50 text-red-700 border border-red-100'
                    : 'bg-[#f0ecff] text-[#7c5cff] border border-[#e4dcff]'
                }`}>
                  {user?.role || 'CITIZEN'}
                </span>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-gray-600 hover:text-red-600 hover:bg-red-50 transition border border-transparent hover:border-red-100"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-dark hover:bg-dark-hover text-white transition shadow-sm"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="hidden sm:inline-block px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 transition shadow-xs"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Secondary Navigation Row (Visible on small screens) */}
      <div className="flex md:hidden items-center justify-center gap-1 mt-3 bg-white p-1.5 rounded-full shadow-xs border border-gray-100 overflow-x-auto">
        <Link to="/dashboard" className={navPillClass('/dashboard')}>
          Dashboard
        </Link>
        <Link to="/safety" className={navPillClass('/safety')}>
          Safety
        </Link>
        {user && (
          <>
            <Link to="/report" className={navPillClass('/report')}>
              Report
            </Link>
            {user.role === 'CITIZEN' && (
              <Link to="/my-complaints" className={navPillClass('/my-complaints')}>
                My Issues
              </Link>
            )}
            {user.role === 'ADMIN' && (
              <Link to="/admin" className={navPillClass('/admin')}>
                Admin
              </Link>
            )}
          </>
        )}
      </div>
    </header>
  );
}
