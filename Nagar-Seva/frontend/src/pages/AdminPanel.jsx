import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../api/apiClient';

export default function AdminPanel() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState('');
  const [stats, setStats] = useState({ totalComplaints: 0, resolvedCount: 0, pendingCount: 0, escalatedCount: 0 });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const fileRef = useRef(null);

  useEffect(() => { 
    fetchData(); 
  }, []);

  const fetchData = async () => {
    setLoading(true); 
    setError('');
    try {
      const [cRes, sRes] = await Promise.all([
        apiClient.get('/api/complaints'), 
        apiClient.get('/api/admin/stats')
      ]);
      setComplaints(Array.isArray(cRes.data) ? cRes.data : []);
      setStats(sRes.data);
    } catch (err) { 
      setError('Failed to load'); 
      console.error(err);
    } finally { 
      setLoading(false); 
    }
  };

  const handleResolveClick = (c) => { 
    setSelected(c); 
    setNote(''); 
    setPhoto(null); 
    setPreview(''); 
    setMessage('');
    setShowModal(true); 
  };

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width, height = img.height;
          const MAX_SIZE = 800;
          if (width > height) {
            if (width > MAX_SIZE) { height = Math.round(height * (MAX_SIZE / width)); width = MAX_SIZE; }
          } else {
            if (height > MAX_SIZE) { width = Math.round(width * (MAX_SIZE / height)); height = MAX_SIZE; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { 
      setMessage('⚠️ Select an image'); 
      return; 
    }
    if (file.size > 5 * 1024 * 1024) { 
      setMessage('⚠️ Image must be < 5MB'); 
      return; 
    }
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
    setPhoto(file);
    setMessage('');
  };

  const handleResolveSubmit = async () => {
    if (!note.trim()) { 
      setMessage('⚠️ Please enter a resolution note'); 
      return; 
    }
    if (!photo) { 
      setMessage('⚠️ Please upload a resolution photo'); 
      return; 
    }

    setSubmitting(true);
    setMessage('');
    setProgress('Compressing image...');

    try {
      const compressedBase64 = await compressImage(photo);
      setProgress('Sending to server...');

      const payload = {
        resolutionPhotoUrl: compressedBase64,
        resolutionNote: note.trim()
      };

      console.log('Sending resolve request for complaint:', selected.id);
      
      const response = await apiClient.patch(
        `/api/admin/complaints/${selected.id}/resolve`, 
        payload,
        { timeout: 60000 }
      );

      console.log('Resolve response:', response.data);
      
      setMessage('✅ Complaint resolved successfully with proof!');
      setShowModal(false);
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Resolve error FULL:', err);
      console.error('Error response:', err.response);
      console.error('Error message:', err.message);
      
      let errMsg = '❌ Failed to resolve. ';
      if (err.code === 'ECONNABORTED') {
        errMsg += 'Request timed out. Try a smaller image.';
      } else if (err.response) {
        const serverMsg = err.response.data?.error || err.response.statusText || err.response.status;
        errMsg += `Server error: ${serverMsg}`;
      } else if (err.message) {
        errMsg += err.message;
      } else {
        errMsg += 'Please try again.';
      }
      setMessage(errMsg);
      setTimeout(() => setMessage(''), 8000);
    } finally {
      setSubmitting(false);
      setProgress('');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('⚠️ Delete this complaint? This cannot be undone.')) return;
    try { 
      await apiClient.delete(`/api/admin/complaints/${id}`); 
      setMessage('✅ Deleted'); 
      fetchData(); 
    } catch (err) { 
      setMessage('❌ Delete failed'); 
      console.error(err);
    }
  };

  const statusColor = (s) => ({ 
    OPEN:'bg-yellow-100 text-yellow-800', 
    IN_PROGRESS:'bg-blue-100 text-blue-800', 
    RESOLVED:'bg-green-100 text-green-800', 
    ESCALATED:'bg-red-100 text-red-800' 
  }[s] || 'bg-gray-100 text-gray-800');

  const priorityBadge = (p) => ({ 
    HIGH:'bg-red-100 text-red-800', 
    MEDIUM:'bg-orange-100 text-orange-800', 
    LOW:'bg-green-100 text-green-800' 
  }[p] || 'bg-gray-100 text-gray-800');

  const filtered = complaints.filter(c =>
    (c.category?.toLowerCase().includes(search.toLowerCase()) ||
     c.description?.toLowerCase().includes(search.toLowerCase()) ||
     c.location?.toLowerCase().includes(search.toLowerCase())) &&
    (filter === 'ALL' || c.status === filter)
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">🛡️ Admin Panel</h1>
      
      {message && (
        <div className={`p-4 rounded-lg mb-6 ${
          message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message}
        </div>
      )}
      
      {error && (
        <div className="p-4 bg-red-100 border border-red-400 rounded-lg text-red-700 mb-6">
          {error} 
          <button onClick={fetchData} className="ml-4 px-4 py-1 bg-red-600 text-white rounded hover:bg-red-700">
            Retry
          </button>
        </div>
      )}
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.totalComplaints || complaints.length}</p>
          <p className="text-sm text-gray-600">Total</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.resolvedCount || 0}</p>
          <p className="text-sm text-gray-600">Resolved</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{stats.pendingCount || 0}</p>
          <p className="text-sm text-gray-600">Pending</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{stats.escalatedCount || 0}</p>
          <p className="text-sm text-gray-600">Escalated</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input 
          type="text" 
          placeholder="🔍 Search complaints..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
        />
        <div className="flex gap-2 flex-wrap">
          {['ALL','OPEN','IN_PROGRESS','RESOLVED','ESCALATED'].map(s => (
            <button 
              key={s} 
              onClick={() => setFilter(s)} 
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-800">All Complaints</h2>
        </div>
        
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No complaints found.</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filtered.map(c => (
              <div key={c.id} className="p-6 hover:bg-gray-50">
                <div className="flex flex-wrap justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-800">#{c.id} - {c.category}</h3>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusColor(c.status)}`}>
                        {c.status}
                      </span>
                      {c.priority && (
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${priorityBadge(c.priority)}`}>
                          {c.priority}
                        </span>
                      )}
                      {c.escalated && (
                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          ⚠️ Escalated
                        </span>
                      )}
                    </div>
                    <p className="text-gray-700 mb-2">{c.description}</p>
                    <div className="text-sm text-gray-500 space-y-1">
                      <p>📍 {c.location}</p>
                      <p>🏢 {c.ward}</p>
                      <p>📅 {new Date(c.createdAt).toLocaleString()}</p>
                      {c.routedAuthority && <p>🏛️ Routed to: {c.routedAuthority}</p>}
                    </div>
                    
                    {c.status === 'RESOLVED' && c.resolutionNote && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm font-semibold text-green-800">✅ Resolution</p>
                        <p className="text-sm text-gray-700 mt-1">{c.resolutionNote}</p>
                        {c.resolutionPhotoUrl && (
                          <img src={c.resolutionPhotoUrl} alt="Proof" className="mt-2 max-h-48 rounded-lg"/>
                        )}
                      </div>
                    )}
                    
                    {c.aiSummary && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm font-semibold text-blue-800">🤖 AI Summary</p>
                        <p className="text-sm text-gray-900">{c.aiSummary}</p>
                      </div>
                    )}
                    {c.photoData && (
                      <img src={c.photoData} alt="Complaint" className="mt-2 max-h-48 rounded-lg"/>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2 min-w-[150px]">
                    {c.status !== 'RESOLVED' && (
                      <button 
                        onClick={() => handleResolveClick(c)} 
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                      >
                        Resolve
                      </button>
                    )}
                    {c.status === 'RESOLVED' && (
                      <span className="text-green-600 text-sm font-semibold text-center">✅ Resolved</span>
                    )}
                    <button 
                      onClick={() => handleDelete(c.id)} 
                      className="w-full px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 m-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Resolve Complaint</h2>
            <p className="text-gray-600 mb-4">
              <strong>#{selected.id}</strong> - {selected.category}
            </p>
            
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">Resolution Note *</label>
              <textarea 
                value={note} 
                onChange={e => setNote(e.target.value)} 
                rows="3" 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                placeholder="Describe how the issue was resolved..."
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">Upload Proof Photo *</label>
              <input 
                ref={fileRef} 
                type="file" 
                accept="image/*" 
                onChange={handlePhotoChange} 
                className="w-full"
              />
              {preview && (
                <img src={preview} alt="Proof" className="mt-2 max-h-48 rounded-lg"/>
              )}
            </div>
            
            {progress && (
              <p className="text-sm text-blue-600 mb-2">{progress}</p>
            )}
            
            <div className="flex gap-3">
              <button 
                onClick={handleResolveSubmit} 
                disabled={submitting} 
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                {submitting ? '⏳ Resolving...' : 'Resolve'}
              </button>
              <button 
                onClick={() => setShowModal(false)} 
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}