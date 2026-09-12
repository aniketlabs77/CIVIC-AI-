import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language.startsWith('en') ? 'hi' : 'en';
    i18n.changeLanguage(newLang);
  };
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
        : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-gray-800 font-medium'
    }`;
  };

  return (
    <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 mb-2">
      <nav className="bg-white dark:bg-gray-900 rounded-full p-2 sm:p-2.5 shadow-card border border-gray-100/80 dark:border-gray-800 flex items-center justify-between gap-2">
        {/* Brand / Logo */}
        <Link to="/" className="flex items-center gap-2.5 pl-3 pr-2 py-1 group">
          <div className="w-8 h-8 rounded-xl bg-[#7c5cff] flex items-center justify-center text-white text-base font-black shadow-sm group-hover:scale-105 transition-transform">
            🏛️
          </div>
          <span className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">
            Nagar<span className="text-[#7c5cff]">Seva</span>
          </span>
        </Link>

        {/* Center Pill Nav Links */}
        <div className="hidden md:flex items-center gap-1 bg-gray-50/80 dark:bg-gray-800 p-1 rounded-full border border-gray-100 dark:border-gray-700">
          <Link to="/dashboard" className={navPillClass('/dashboard')}>
            {user?.role === 'ADMIN' ? t('navCommand') : t('navDashboard')}
          </Link>
          <Link to="/safety" className={navPillClass('/safety')}>
            {t('navSafety')}
          </Link>

          {user && (
            <>
              {user.role === 'ADMIN' ? (
                <Link to="/admin" className={navPillClass('/admin')}>
                  {t('navResolve')}
                </Link>
              ) : (
                <>
                  <Link to="/report" className={navPillClass('/report')}>
                    {t('navReport')}
                  </Link>
                  <Link to="/my-complaints" className={navPillClass('/my-complaints')}>
                    {t('navMyIssues')}
                  </Link>
                </>
              )}
              <Link to="/track" className={navPillClass('/track')}>
                {t('navTrack')}
              </Link>
            </>
          )}
        </div>

        {/* Right Section: Auth, Theme & Profile */}
        <div className="flex items-center gap-2 pr-1">
          <button
            onClick={toggleLanguage}
            aria-label="Toggle Language"
            className="p-1.5 px-3 rounded-full text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700"
          >
            {i18n.language.startsWith('en') ? 'A/अ' : 'अ/A'}
          </button>
          <button
            onClick={toggleTheme}
            aria-label="Toggle Dark Mode"
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-200"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {user ? (
            <div className="flex items-center gap-2">
              {/* User Profile Pill */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[130px]">
                  {user?.name || user?.email || 'User'}
                </span>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                  user?.role === 'ADMIN'
                    ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-800/50'
                    : 'bg-[#f0ecff] dark:bg-[#7c5cff]/20 text-[#7c5cff] dark:text-[#a78bfa] border border-[#e4dcff] dark:border-[#7c5cff]/30'
                }`}>
                  {user?.role === 'ADMIN' && user?.department
                    ? user.department.split(' ')[0]
                    : user?.role || 'CITIZEN'}
                </span>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition border border-transparent hover:border-red-100 dark:hover:border-red-800/30"
              >
                {t('navLogout')}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-dark dark:bg-white hover:bg-dark-hover dark:hover:bg-gray-100 text-white dark:text-gray-900 transition shadow-sm"
              >
                {t('navSignIn')}
              </Link>
              <Link
                to="/register"
                className="hidden sm:inline-block px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600 transition shadow-xs"
              >
                {t('navSignUp')}
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Secondary Navigation Row (Visible on small screens) */}
      <div className="flex md:hidden items-center justify-center gap-1 mt-3 bg-white dark:bg-gray-900 p-1.5 rounded-full shadow-xs border border-gray-100 dark:border-gray-800 overflow-x-auto">
        <Link to="/dashboard" className={navPillClass('/dashboard')}>
          {user?.role === 'ADMIN' ? t('navCommand') : t('navDashboard')}
        </Link>
        <Link to="/safety" className={navPillClass('/safety')}>
          {t('navSafety')}
        </Link>
        {user && (
          <>
            {user.role === 'ADMIN' ? (
              <Link to="/admin" className={navPillClass('/admin')}>
                {t('navResolve')}
              </Link>
            ) : (
              <>
                <Link to="/report" className={navPillClass('/report')}>
                  {t('navReport')}
                </Link>
                <Link to="/my-complaints" className={navPillClass('/my-complaints')}>
                  {t('navMyIssues')}
                </Link>
              </>
            )}
          </>
        )}
      </div>
    </header>
  );
}
