import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try { setUser(JSON.parse(storedUser)); } catch { setUser(null); }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold hover:text-blue-100">NagarSeva</Link>
          <div className="flex items-center space-x-6">
            <Link to="/dashboard" className="hover:text-blue-100 transition hidden sm:inline-block">Dashboard</Link>
            <Link to="/safety" className="hover:text-blue-100 transition hidden sm:inline-block">Safety Map</Link>
            {user ? (
              <>
                <Link to="/report" className="hover:text-blue-100 transition">Report Issue</Link>
                {user.role === 'CITIZEN' && <Link to="/my-complaints" className="hover:text-blue-100 transition">My Complaints</Link>}
                {user.role === 'ADMIN' && <Link to="/admin" className="hover:text-blue-100 transition">Admin Panel</Link>}
                <Link to="/track" className="hover:text-blue-100 transition">{user.role === 'ADMIN' ? 'All Complaints' : 'Track'}</Link>
                <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-700 hover:bg-blue-800">
                  <span className="font-medium">{user.name}</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${user.role === 'ADMIN' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>{user.role}</span>
                </div>
                <button onClick={handleLogout} className="px-3 py-1 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-medium transition">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="px-3 py-1 bg-white text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium transition">Sign In</Link>
                <Link to="/register" className="px-3 py-1 bg-blue-500 hover:bg-blue-400 rounded-lg text-sm font-medium transition">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}