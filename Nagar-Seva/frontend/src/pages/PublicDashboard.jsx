import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function PublicDashboard() {
  const [stats, setStats] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true); setError('');
    try {
      const [sRes, cRes] = await Promise.all([apiClient.get('/api/admin/stats'), apiClient.get('/api/complaints')]);
      setStats(sRes.data);
      setComplaints(Array.isArray(cRes.data) ? cRes.data : []);
    } catch (err) { setError('Failed to load dashboard'); } finally { setLoading(false); }
  };

  const getWardStats = () => {
    const map = {};
    complaints.forEach(c => {
      if (!map[c.ward]) map[c.ward] = { total: 0, resolved: 0, pending: 0, times: [] };
      map[c.ward].total++;
      if (c.status === 'RESOLVED') { map[c.ward].resolved++; if (c.resolvedAt && c.createdAt) map[c.ward].times.push((new Date(c.resolvedAt)-new Date(c.createdAt))/(1000*60*60)); }
      else map[c.ward].pending++;
    });
    return Object.entries(map).map(([ward, data]) => ({
      ward, total: data.total, resolved: data.resolved, pending: data.pending,
      resolutionRate: data.total > 0 ? Math.round((data.resolved/data.total)*100) : 0,
      avgResolutionTime: data.times.length > 0 ? Math.round(data.times.reduce((a,b)=>a+b,0)/data.times.length*10)/10 : 0
    }));
  };

  const wardStats = getWardStats();
  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div></div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">📊 Civic Dashboard</h1>
      <p className="text-gray-600 mb-6">Track government responsiveness across wards</p>
      {error && <div className="p-4 bg-red-100 border border-red-400 rounded-lg text-red-700 mb-6">{error} <button onClick={fetchData} className="ml-4 px-4 py-1 bg-red-600 text-white rounded hover:bg-red-700">Retry</button></div>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 text-center"><p className="text-3xl font-bold text-blue-600">{stats?.totalComplaints || complaints.length}</p><p className="text-sm text-gray-600">Total</p></div>
        <div className="bg-white rounded-lg shadow p-4 text-center"><p className="text-3xl font-bold text-green-600">{stats?.resolvedCount || 0}</p><p className="text-sm text-gray-600">Resolved</p></div>
        <div className="bg-white rounded-lg shadow p-4 text-center"><p className="text-3xl font-bold text-yellow-600">{stats?.pendingCount || 0}</p><p className="text-sm text-gray-600">Pending</p></div>
        <div className="bg-white rounded-lg shadow p-4 text-center"><p className="text-3xl font-bold text-purple-600">{complaints.length > 0 ? Math.round((stats?.resolvedCount || 0)/complaints.length*100) : 0}%</p><p className="text-sm text-gray-600">Resolution Rate</p></div>
      </div>
      <div className="bg-white rounded-lg shadow p-6 mb-6"><h2 className="text-xl font-bold text-gray-800 mb-4">🏢 Ward Performance</h2><div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={wardStats}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="ward" /><YAxis /><Tooltip /><Legend /><Bar dataKey="total" fill="#8884d8" name="Total" /><Bar dataKey="resolved" fill="#82ca9d" name="Resolved" /></BarChart></ResponsiveContainer></div></div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50"><h2 className="text-xl font-semibold text-gray-800">📋 Ward-wise Breakdown</h2></div>
        <div className="overflow-x-auto"><table className="w-full"><thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ward</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resolved</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pending</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Time</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th></tr></thead><tbody className="divide-y divide-gray-200">
          {wardStats.map(w => <tr key={w.ward} className="hover:bg-gray-50"><td className="px-6 py-4 font-medium text-gray-900">{w.ward}</td><td className="px-6 py-4">{w.total}</td><td className="px-6 py-4 text-green-600">{w.resolved}</td><td className="px-6 py-4 text-yellow-600">{w.pending}</td><td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${w.resolutionRate>=70?'bg-green-100 text-green-800':w.resolutionRate>=40?'bg-yellow-100 text-yellow-800':'bg-red-100 text-red-800'}`}>{w.resolutionRate}%</span></td><td className="px-6 py-4">{w.avgResolutionTime > 0 ? `${w.avgResolutionTime}h` : 'N/A'}</td><td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${w.resolutionRate>=70?'bg-green-100 text-green-800':w.resolutionRate>=40?'bg-yellow-100 text-yellow-800':'bg-red-100 text-red-800'}`}>{w.resolutionRate>=70?'✅ Good':w.resolutionRate>=40?'⚠️ Average':'❌ Needs Improvement'}</span></td></tr>)}
        </tbody></table></div>
      </div>
    </div>
  );
}