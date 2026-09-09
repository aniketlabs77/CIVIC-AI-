import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { MUNICIPAL_DEPARTMENTS } from './Login';

export default function Register() {
  const [selectedRole, setSelectedRole] = useState('CITIZEN'); // 'CITIZEN' | 'ADMIN'
  const [selectedDepartment, setSelectedDepartment] = useState(MUNICIPAL_DEPARTMENTS[0].name);
  const [designation, setDesignation] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { syncUserProfile, fetchUserProfile, loginLocalDemo } = useAuth();

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setError('');
    if (role === 'ADMIN') {
      const dept = MUNICIPAL_DEPARTMENTS.find(d => d.name === selectedDepartment) || MUNICIPAL_DEPARTMENTS[0];
      if (!email || email === 'citizen@example.com') {
        setEmail(dept.email);
      }
    } else {
      if (email.includes('nagarseva.gov.in')) {
        setEmail('');
      }
    }
  };

  const handleDepartmentChange = (deptName) => {
    setSelectedDepartment(deptName);
    const dept = MUNICIPAL_DEPARTMENTS.find(d => d.name === deptName);
    if (dept && (email.includes('nagarseva.gov.in') || !email)) {
      setEmail(dept.email);
    }
  };

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

    const isRoleAdmin = selectedRole === 'ADMIN';
    const finalDepartment = isRoleAdmin ? selectedDepartment : null;
    const finalDisplayName = isRoleAdmin && designation.trim()
      ? `${name.trim()} (${designation.trim()})`
      : name.trim() || (isRoleAdmin ? 'Admin Officer' : 'Citizen User');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      
      if (finalDisplayName) {
        try {
          await updateProfile(userCredential.user, { displayName: finalDisplayName });
        } catch (nameErr) {
          console.warn('Failed to update display name:', nameErr);
        }
      }

      try {
        await syncUserProfile({
          name: finalDisplayName,
          role: selectedRole,
          department: finalDepartment,
        });
      } catch (syncErr) {
        console.warn('Profile sync notice:', syncErr);
      }

      const userProfile = await fetchUserProfile(userCredential.user);
      if (selectedRole === 'ADMIN' || (userProfile && userProfile.role === 'ADMIN')) {
        navigate('/dashboard');
      } else {
        navigate('/my-complaints');
      }
    } catch (err) {
      console.warn('Firebase register notice:', err);

      // Graceful fallback for local development if Firebase API key is not configured
      if (err.code === 'auth/api-key-not-valid' || err.code === 'auth/invalid-api-key' || err.message?.includes('api-key-not-valid') || err.message?.includes('API key')) {
        loginLocalDemo(
          selectedRole,
          email.trim() || (isRoleAdmin ? 'admin@nagarseva.com' : 'citizen@nagarseva.com'),
          finalDisplayName,
          finalDepartment
        );
        if (selectedRole === 'ADMIN') {
          navigate('/dashboard');
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

  const activeDeptInfo = MUNICIPAL_DEPARTMENTS.find(d => d.name === selectedDepartment) || MUNICIPAL_DEPARTMENTS[0];

  return (
    <div className="min-h-[82vh] flex flex-col justify-center items-center py-8 px-4">
      <div className="w-full max-w-lg">
        {/* Branding header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#7c5cff] flex items-center justify-center text-white text-xl font-black shadow-md mx-auto mb-3">
            🏛️
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Create NagarSeva Account
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Citizen Grievance Redressal & Department Administrative Portal
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100/90">
          {/* Role Pill Switcher */}
          <div className="mb-5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 text-center">
              Choose Account Role
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
                <span>👤</span> Citizen Account
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange('ADMIN')}
                className={`py-2 px-3 rounded-full text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  selectedRole === 'ADMIN'
                    ? 'bg-[#7c5cff] text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <span>🛡️</span> Municipal Official
              </button>
            </div>
          </div>

          {/* Role & Department Description */}
          {selectedRole === 'ADMIN' ? (
            <div className="mb-5 p-4 rounded-2xl border border-violet-100 bg-violet-50/60 text-xs">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{activeDeptInfo.icon}</span>
                <span className="font-extrabold text-violet-950">{activeDeptInfo.name}</span>
              </div>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                {activeDeptInfo.description}
              </p>
            </div>
          ) : (
            <div className="mb-5 p-3 rounded-2xl border border-gray-200 bg-gray-50 text-xs text-gray-700">
              <p className="font-bold text-gray-900 mb-0.5">👤 Citizen Registration:</p>
              <p className="text-[11px] text-gray-500">
                Report local civic grievances, upload photo evidence, and receive real-time resolution updates.
              </p>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-start gap-2">
              <span className="text-sm">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Municipal Department Selection */}
            {selectedRole === 'ADMIN' && (
              <>
                <div>
                  <label htmlFor="reg-department" className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1 flex items-center justify-between">
                    <span>🏛️ Municipal Department</span>
                    <span className="text-[10px] text-[#7c5cff] font-semibold">Select jurisdiction</span>
                  </label>
                  <select
                    id="reg-department"
                    value={selectedDepartment}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7c5cff]"
                  >
                    {MUNICIPAL_DEPARTMENTS.map((dept) => (
                      <option key={dept.id} value={dept.name}>
                        {dept.icon} {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="designation" className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                    Official Designation / Badge ID (Optional)
                  </label>
                  <input
                    id="designation"
                    name="designation"
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7c5cff]"
                    placeholder="e.g. Executive Engineer, Food Inspector #402, SI Traffic"
                  />
                </div>
              </>
            )}

            <div>
              <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7c5cff]"
                placeholder={selectedRole === 'ADMIN' ? 'Officer Ramesh Sharma' : 'Ramesh Kumar'}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                {selectedRole === 'ADMIN' ? 'Official Department Email' : 'Email Address'}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7c5cff]"
                placeholder={selectedRole === 'ADMIN' ? activeDeptInfo.email : 'citizen@example.com'}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7c5cff]"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                  Confirm
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7c5cff]"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-full bg-gray-900 hover:bg-black text-white text-xs sm:text-sm font-bold shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Registering Account...</span>
                  </>
                ) : (
                  <span>
                    Create {selectedRole === 'ADMIN' ? `${selectedDepartment.split(' ')[0]} Official` : 'Citizen'} Account
                  </span>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-xs text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-[#7c5cff] hover:underline">
              Sign in to Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
