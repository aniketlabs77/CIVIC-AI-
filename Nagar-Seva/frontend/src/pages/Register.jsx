import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (!name || !email || !password || !confirm) { setError('All fields are required'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await apiClient.post('/api/auth/register', { name, email, password });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#07080a] relative">
      <div className="aurora-bg"><div className="aurora-blade-1"></div><div className="aurora-blade-2"></div><div className="aurora-blade-3"></div><div className="aurora-grain"></div><div className="aurora-vignette"></div></div>
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <svg className="w-8 h-8 text-[#ff2f3a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            <span className="text-2xl font-bold font-manrope text-white">NagarSeva</span>
          </div>
          <h2 className="text-3xl font-bold text-white font-manrope">Create Account</h2>
          <p className="text-[#9c9c9d] mt-2">Join the civic grievance platform</p>
        </div>
        <div className="glass-dark rounded-2xl p-8 border border-white/10 shadow-2xl">
          {error && <div className="mb-4 p-4 bg-[#ff2f3a]/20 border border-[#ff2f3a]/30 rounded-xl text-[#ff2f3a] text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div><label className="block text-sm font-medium text-[#9c9c9d] mb-2">Full Name</label><input type="text" value={name} onChange={e=>setName(e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#ff2f3a] transition-all" placeholder="Your name" required /></div>
            <div><label className="block text-sm font-medium text-[#9c9c9d] mb-2">Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#ff2f3a] transition-all" placeholder="your@email.com" required /></div>
            <div><label className="block text-sm font-medium text-[#9c9c9d] mb-2">Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#ff2f3a] transition-all" placeholder="Min 6 characters" required /></div>
            <div><label className="block text-sm font-medium text-[#9c9c9d] mb-2">Confirm Password</label><input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#ff2f3a] transition-all" placeholder="Confirm password" required /></div>
            <button type="submit" disabled={loading} className="w-full py-3 bg-[#ff2f3a] hover:bg-[#e02a34] text-white font-bold rounded-full transition-all disabled:opacity-50">{loading ? 'Creating...' : 'Create Account'}</button>
          </form>
          <div className="mt-6 text-center"><p className="text-sm text-[#9c9c9d]">Already have an account? <Link to="/login" className="text-[#ff2f3a] hover:text-[#ff6b4a] transition-colors">Sign In</Link></p></div>
        </div>
      </div>
    </div>
  );
}