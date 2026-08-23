import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [selectedRole, setSelectedRole] = useState('CITIZEN'); // 'CITIZEN' | 'ADMIN'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { syncUserProfile, fetchUserProfile, loginLocalDemo } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      
      if (name.trim()) {
        try {
          await updateProfile(userCredential.user, { displayName: name.trim() });
        } catch (nameErr) {
          console.warn('Failed to update display name:', nameErr);
        }
      }

      try {
        await syncUserProfile({
          name: name.trim() || (selectedRole === 'ADMIN' ? 'Admin Officer' : 'Citizen User'),
          role: selectedRole,
        });
      } catch (syncErr) {
        console.warn('Profile sync notice:', syncErr);
      }

      const userProfile = await fetchUserProfile(userCredential.user);
      if (selectedRole === 'ADMIN' || (userProfile && userProfile.role === 'ADMIN')) {
        navigate('/admin');
      } else {
        navigate('/my-complaints');
      }
    } catch (err) {
      console.warn('Firebase register notice:', err);

      // Graceful fallback for local development if Firebase API key is not configured
      if (err.code === 'auth/api-key-not-valid' || err.code === 'auth/invalid-api-key' || err.message?.includes('api-key-not-valid')) {
        loginLocalDemo(selectedRole, email.trim(), name.trim() || (selectedRole === 'ADMIN' ? 'Admin Officer' : 'Citizen User'));
        if (selectedRole === 'ADMIN') {
          navigate('/admin');
        } else {
          navigate('/my-complaints');
        }
        return;
      }

      let msg = 'Registration failed. Please try again.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'This email is already registered. Please sign in instead.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Invalid email address.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password is too weak. Please use at least 6 characters.';
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
            Create NagarSeva Account
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-white rounded-3xl p-7 sm:p-9 shadow-card border border-gray-100/80">
          {/* Role Pill Switcher */}
          <div className="mb-5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 text-center">
              Choose Your Account Role
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-100 rounded-full">
              <button
                type="button"
                onClick={() => setSelectedRole('CITIZEN')}
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
                onClick={() => setSelectedRole('ADMIN')}
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

          {/* Role Description Card */}
          <div className={`mb-5 p-3 rounded-2xl border text-xs font-medium ${
            selectedRole === 'ADMIN'
              ? 'bg-accent-light/50 border-accent-subtle text-accent'
              : 'bg-gray-50 border-gray-200 text-gray-700'
          }`}>
            <p className="font-bold mb-0.5">
              {selectedRole === 'ADMIN' ? '🛡️ Municipal Admin Account:' : '👤 Citizen Account:'}
            </p>
            <p className="text-[11px] text-gray-500">
              {selectedRole === 'ADMIN'
                ? 'Authorized access to review complaints, submit resolution photo proofs, and manage ward operations.'
                : 'Report local grievances, upload photo evidence, track ticket resolution, and explore safety routes.'}
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
              <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Ramesh Kumar"
              />
            </div>

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
                placeholder={selectedRole === 'ADMIN' ? 'officer@nagarseva.com' : 'citizen@example.com'}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Confirm
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="••••••••"
                />
              </div>
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
                    <span>Creating account...</span>
                  </>
                ) : (
                  <span>Create {selectedRole === 'ADMIN' ? 'Admin' : 'Citizen'} Account</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
