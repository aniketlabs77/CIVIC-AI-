import React, { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';

export default function MyComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { fetchMyComplaints(); }, []);

  const fetchMyComplaints = async () => {
    setLoading(true); setError('');
    try {
      const res = await apiClient.get('/api/complaints/my');
      setComplaints(Array.isArray(res.data) ? res.data : []);
    } catch (err) { setError('Failed to load'); } finally { setLoading(false); }
  };

  const statusColor = (s) => ({ OPEN:'bg-yellow-100 text-yellow-800', IN_PROGRESS:'bg-blue-100 text-blue-800', RESOLVED:'bg-green-100 text-green-800', ESCALATED:'bg-red-100 text-red-800' }[s] || 'bg-gray-100 text-gray-800');

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">📋 My Complaints</h1>
      <p className="text-gray-600 mb-6">Track all complaints you have reported</p>
      {error && <div className="p-4 bg-red-100 border border-red-400 rounded-lg text-red-700 mb-6">{error} <button onClick={fetchMyComplaints} className="ml-4 px-4 py-1 bg-red-600 text-white rounded hover:bg-red-700">Retry</button></div>}
      {complaints.length === 0 ? <div className="bg-gray-100 rounded-lg p-12 text-center"><p className="text-2xl text-gray-400 mb-2">📭</p><p className="text-gray-600">You haven't reported any complaints yet.</p><a href="/report" className="mt-4 inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Report an Issue</a></div> : (
        <div className="space-y-4">
          {complaints.map(c => (
            <div key={c.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition">
              <div className="flex flex-wrap justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-800">#{c.id} - {c.category}</h3>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusColor(c.status)}`}>{c.status}</span>
                    {c.escalated && <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">⚠️ Escalated</span>}
                  </div>
                  <p className="text-gray-700">{c.description}</p>
                  <div className="mt-2 text-sm text-gray-500"><p>📍 {c.location}</p><p>🏢 {c.ward}</p><p>📅 {new Date(c.createdAt).toLocaleString()}</p>{c.routedAuthority && <p className="text-blue-600">🏛️ Routed to: {c.routedAuthority}</p>}{c.resolvedAt && <p className="text-green-600">✅ Resolved: {new Date(c.resolvedAt).toLocaleString()}</p>}</div>
                  {c.status==='RESOLVED' && c.resolutionNote && <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg"><p className="text-sm font-semibold text-green-800">✅ Resolution</p><p className="text-sm text-gray-700 mt-1">{c.resolutionNote}</p>{c.resolutionPhotoUrl && <img src={c.resolutionPhotoUrl} alt="Proof" className="mt-2 max-h-48 rounded-lg"/>}</div>}
                  {c.aiSummary && <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg"><p className="text-sm font-semibold text-blue-800">🤖 AI Summary</p><p className="text-sm text-gray-900">{c.aiSummary}</p></div>}
                  {c.photoData && <img src={c.photoData} alt="Complaint" className="mt-3 max-h-48 rounded-lg"/>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}