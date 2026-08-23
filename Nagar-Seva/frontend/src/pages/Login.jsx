import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [selectedRole, setSelectedRole] = useState('CITIZEN'); // 'CITIZEN' | 'ADMIN'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { fetchUserProfile, loginLocalDemo } = useAuth();

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setError('');
  };

  const handleFillDemo = (role) => {
    setSelectedRole(role);
    setError('');
    if (role === 'ADMIN') {
      setEmail('admin@nagarseva.com');
      setPassword('admin123');
    } else {
      setEmail('citizen@nagarseva.com');
      setPassword('citizen123');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const userProfile = await fetchUserProfile(userCredential.user);

      if (userProfile && userProfile.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/my-complaints');
      }
    } catch (err) {
      console.warn('Firebase login notice:', err);

      // Graceful fallback for local development if Firebase API key is not configured
      if (err.code === 'auth/api-key-not-valid' || err.code === 'auth/invalid-api-key' || err.message?.includes('api-key-not-valid')) {
        loginLocalDemo(selectedRole, email.trim(), selectedRole === 'ADMIN' ? 'Admin Officer' : 'Citizen User');
        if (selectedRole === 'ADMIN') {
          navigate('/admin');
        } else {
          navigate('/my-complaints');
        }
        return;
      }

      let msg = 'Login failed. Please check your credentials.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Invalid email or password. If you do not have an account yet, please register below.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Too many failed attempts. Please try again later.';
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[78vh] flex flex-col justify-center items-center py-6 px-4">
      <div className="w-full max-w-md">
        {/* Branding header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center text-white text-xl font-black shadow-md mx-auto mb-3">
            🏛️
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            Sign In to NagarSeva
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-accent hover:underline">
              Create an account
            </Link>
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-white rounded-3xl p-7 sm:p-9 shadow-card border border-gray-100/80">
          {/* Role Pill Switcher */}
          <div className="mb-5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 text-center">
              Select Sign In Portal
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-100 rounded-full">
              <button
                type="button"
                onClick={() => handleRoleChange('CITIZEN')}
                className={`py-2 px-3 rounded-full text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  selectedRole === 'CITIZEN'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <span>👤</span> Citizen
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange('ADMIN')}
                className={`py-2 px-3 rounded-full text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  selectedRole === 'ADMIN'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <span>🛡️</span> Municipal Admin
              </button>
            </div>
          </div>

          {/* Role Context Indicator Banner */}
          <div className={`mb-5 p-3 rounded-2xl border text-xs font-medium ${
            selectedRole === 'ADMIN'
              ? 'bg-accent-light/50 border-accent-subtle text-accent'
              : 'bg-gray-50 border-gray-200 text-gray-700'
          }`}>
            <p className="font-bold mb-0.5">
              {selectedRole === 'ADMIN' ? '🛡️ Municipal Authority Access' : '👤 Citizen Grievance Portal'}
            </p>
            <p className="text-[11px] text-gray-500">
              {selectedRole === 'ADMIN'
                ? 'Authorized access to resolve tickets, review vision photo proofs, and monitor ward metrics.'
                : 'Report civic issues, track ticket progress, and verify municipal action.'}
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-start gap-2">
              <span className="text-sm">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder={selectedRole === 'ADMIN' ? 'admin@nagarseva.com' : 'citizen@nagarseva.com'}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="••••••••"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-full bg-dark hover:bg-dark-hover text-white text-xs sm:text-sm font-bold shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign In as {selectedRole === 'ADMIN' ? 'Admin' : 'Citizen'}</span>
                )}
              </button>
            </div>
          </form>

          {/* 1-Click Demo Fill */}
          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              1-Click Demo Login Credentials
            </p>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => handleFillDemo('CITIZEN')}
                className="px-3 py-1.5 bg-gray-50 hover:bg-accent-light hover:text-accent border border-gray-200 rounded-full text-xs font-semibold text-gray-700 transition"
              >
                👤 Demo Citizen
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('ADMIN')}
                className="px-3 py-1.5 bg-gray-50 hover:bg-accent-light hover:text-accent border border-gray-200 rounded-full text-xs font-semibold text-gray-700 transition"
              >
                🛡️ Demo Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
