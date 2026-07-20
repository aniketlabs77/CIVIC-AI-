import React, { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';

export default function TrackComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');
  const perPage = 5;

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) try { setUser(JSON.parse(stored)); } catch { setUser(null); }
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    setLoading(true); setError('');
    try {
      const res = await apiClient.get('/api/complaints');
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setComplaints(data);
    } catch (err) { setError('Failed to load'); setComplaints([]); } finally { setLoading(false); }
  };

  const statusColor = (s) => ({ OPEN:'bg-yellow-100 text-yellow-800', IN_PROGRESS:'bg-blue-100 text-blue-800', RESOLVED:'bg-green-100 text-green-800', ESCALATED:'bg-red-100 text-red-800' }[s] || 'bg-gray-100 text-gray-800');
  const isAdmin = user?.role === 'ADMIN';

  const filtered = complaints.filter(c =>
    (c.category?.toLowerCase().includes(search.toLowerCase()) ||
     c.description?.toLowerCase().includes(search.toLowerCase()) ||
     c.location?.toLowerCase().includes(search.toLowerCase())) &&
    (filter === 'ALL' || c.status === filter)
  );
  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page-1)*perPage, page*perPage);

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div></div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">{isAdmin ? '📋 All Complaints' : '📋 Your Complaints'}</h1>
      {message && <div className="p-4 bg-green-100 border border-green-400 rounded-lg text-green-700 mb-6">{message}</div>}
      {error && <div className="p-4 bg-red-100 border border-red-400 rounded-lg text-red-700 mb-6">{error} <button onClick={fetchComplaints} className="ml-4 px-4 py-1 bg-red-600 text-white rounded hover:bg-red-700">Retry</button></div>}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input type="text" placeholder="🔍 Search complaints..." value={search} onChange={e=>setSearch(e.target.value)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <div className="flex gap-2 flex-wrap">
          {['ALL','OPEN','IN_PROGRESS','RESOLVED','ESCALATED'].map(s => <button key={s} onClick={()=>setFilter(s)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter===s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>{s}</button>)}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 text-center"><p className="text-2xl font-bold text-blue-600">{complaints.length}</p><p className="text-sm text-gray-600">Total</p></div>
        <div className="bg-white rounded-lg shadow p-4 text-center"><p className="text-2xl font-bold text-yellow-600">{complaints.filter(c=>c.status==='OPEN').length}</p><p className="text-sm text-gray-600">Open</p></div>
        <div className="bg-white rounded-lg shadow p-4 text-center"><p className="text-2xl font-bold text-blue-600">{complaints.filter(c=>c.status==='IN_PROGRESS').length}</p><p className="text-sm text-gray-600">In Progress</p></div>
        <div className="bg-white rounded-lg shadow p-4 text-center"><p className="text-2xl font-bold text-green-600">{complaints.filter(c=>c.status==='RESOLVED').length}</p><p className="text-sm text-gray-600">Resolved</p></div>
      </div>
      {paginated.length === 0 ? <div className="bg-gray-100 rounded-lg p-8 text-center"><p className="text-gray-600">No complaints found.</p></div> : (
        <div className="space-y-4">
          {paginated.map(c => (
            <div key={c.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-wrap justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-800">#{c.id} - {c.category}</h3>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusColor(c.status)}`}>{c.status}</span>
                    {c.escalated && <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">⚠️ Escalated</span>}
                    {c.priority && <span className={`px-3 py-1 text-xs font-medium rounded-full ${c.priority==='HIGH'?'bg-red-100 text-red-800':c.priority==='MEDIUM'?'bg-orange-100 text-orange-800':'bg-green-100 text-green-800'}`}>{c.priority}</span>}
                  </div>
                  <p className="text-gray-700">{c.description}</p>
                  <div className="mt-2 text-sm text-gray-500 space-y-1"><p>📍 {c.location}</p><p>🏢 {c.ward}</p><p>📅 {new Date(c.createdAt).toLocaleString()}</p>{c.routedAuthority && <p>🏛️ Routed to: {c.routedAuthority}</p>}{c.resolvedAt && <p className="text-green-600">✅ Resolved: {new Date(c.resolvedAt).toLocaleString()}</p>}</div>
                  {c.status==='RESOLVED' && c.resolutionNote && <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg"><p className="text-sm font-semibold text-green-800">✅ Resolution</p><p className="text-sm text-gray-700 mt-1">{c.resolutionNote}</p>{c.resolutionPhotoUrl && <img src={c.resolutionPhotoUrl} alt="Proof" className="mt-2 max-h-48 rounded-lg"/>}</div>}
                  {c.aiSummary && <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg"><p className="text-sm font-semibold text-blue-800">🤖 AI Summary</p><p className="text-sm text-gray-900">{c.aiSummary}</p></div>}
                  {c.photoData && <img src={c.photoData} alt="Complaint" className="mt-3 max-h-48 rounded-lg"/>}
                </div>
                {!isAdmin && <div className="min-w-[120px] text-center"><div className={`px-4 py-2 rounded-lg text-sm font-semibold ${statusColor(c.status)}`}>{c.status}</div><p className="text-xs text-gray-500 mt-1">{c.status==='OPEN'?'⏳ Awaiting action':c.status==='IN_PROGRESS'?'🔄 Being worked on':c.status==='RESOLVED'?'✅ Completed':'⚠️ Escalated'}</p></div>}
                {isAdmin && <div className="min-w-[150px]"><select value={c.status} onChange={(e)=>{const ns=e.target.value; if(window.confirm(`Change status from ${c.status} to ${ns}?`)){apiClient.patch(`/api/complaints/${c.id}/status`,{status:ns}).then(()=>{setMessage(`✅ Updated to ${ns}`);fetchComplaints();setTimeout(()=>setMessage(''),3000);}).catch(()=>{setMessage('❌ Failed');setTimeout(()=>setMessage(''),3000);})}}} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="OPEN">OPEN</option><option value="IN_PROGRESS">IN_PROGRESS</option><option value="RESOLVED">RESOLVED</option><option value="ESCALATED">ESCALATED</option></select></div>}
              </div>
            </div>
          ))}
        </div>
      )}
      {totalPages > 1 && <div className="flex justify-center gap-2 mt-6"><button onClick={()=>setPage(p=>Math.max(p-1,1))} disabled={page===1} className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-300">Previous</button><span className="px-4 py-2 text-gray-600">{page} / {totalPages}</span><button onClick={()=>setPage(p=>Math.min(p+1,totalPages))} disabled={page===totalPages} className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-300">Next</button></div>}
    </div>
  );
}