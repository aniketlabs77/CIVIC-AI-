import React, { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';

export default function TrackComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [updatingId, setUpdatingId] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/api/complaints');
      setComplaints(response.data);
    } catch (err) {
      setError('Failed to load complaints. Please try again later.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (complaintId, newStatus) => {
    setUpdatingId(complaintId);
    setMessage('');
    try {
      const response = await apiClient.patch(`/api/complaints/${complaintId}/status`, {
        status: newStatus,
      });
      setComplaints(prevComplaints =>
        prevComplaints.map(c =>
          c.id === complaintId ? response.data : c
        )
      );
      setMessage(`✅ Status updated to ${newStatus}`);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Failed to update status');
      console.error('Error:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'OPEN':
        return 'bg-amber-50 text-amber-700 border border-amber-200/60';
      case 'IN_PROGRESS':
        return 'bg-accent-light text-accent border border-accent-subtle';
      case 'RESOLVED':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200/60';
      case 'ESCALATED':
        return 'bg-rose-50 text-rose-700 border border-rose-200/60 font-bold';
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  const getCategoryIcon = (category) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('streetlight') || cat.includes('light')) return '💡';
    if (cat.includes('road') || cat.includes('pothole')) return '🛣️';
    if (cat.includes('drain') || cat.includes('water')) return '🚰';
    if (cat.includes('dump') || cat.includes('garbage') || cat.includes('waste')) return '🗑️';
    if (cat.includes('safe') || cat.includes('crime')) return '🛡️';
    if (cat.includes('encroach')) return '🚧';
    return '📋';
  };

  const filteredComplaints = filterStatus === 'ALL'
    ? complaints
    : complaints.filter(c => c.status === filterStatus);

  const stats = {
    total: complaints.length,
    open: complaints.filter(c => c.status === 'OPEN').length,
    inProgress: complaints.filter(c => c.status === 'IN_PROGRESS').length,
    resolved: complaints.filter(c => c.status === 'RESOLVED').length,
  };

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Track All Complaints
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Real-time public grievance status & departmental routing
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-full shadow-card border border-gray-100 overflow-x-auto">
          {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filterStatus === st
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {st === 'ALL' ? 'All Status' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl text-xs font-semibold shadow-xs ${
          message.includes('✅') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {message}
        </div>
      )}

      {/* Top Stat Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100/60">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total</span>
          <div className="text-3xl font-black text-gray-900 mt-1">{stats.total}</div>
          <p className="text-xs text-gray-400 mt-1">All wards</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100/60">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Open Tickets</span>
          <div className="text-3xl font-black text-amber-600 mt-1">{stats.open}</div>
          <p className="text-xs text-gray-400 mt-1">Awaiting dispatch</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100/60">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">In Progress</span>
          <div className="text-3xl font-black text-accent mt-1">{stats.inProgress}</div>
          <p className="text-xs text-gray-400 mt-1">Under inspection</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100/60">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Resolved</span>
          <div className="text-3xl font-black text-emerald-600 mt-1">{stats.resolved}</div>
          <p className="text-xs text-gray-400 mt-1">Repairs completed</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 text-rose-700 text-xs rounded-2xl border border-rose-200">
          {error}
        </div>
      )}

      {loading && (
        <div className="py-16 text-center text-xs text-gray-400">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Loading complaints feed...
        </div>
      )}

      {/* Complaints List */}
      {!loading && !error && (
        <div>
          {filteredComplaints.length > 0 ? (
            <div className="space-y-4">
              {filteredComplaints.map((complaint) => (
                <div
                  key={complaint.id}
                  className="bg-white rounded-2xl shadow-card border border-gray-100/70 p-5 sm:p-6 transition hover:shadow-card-hover"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-gray-50 flex items-center justify-center text-xl shadow-xs border border-gray-100 shrink-0">
                        {getCategoryIcon(complaint.category)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-extrabold text-gray-900">
                            {complaint.category}
                          </span>
                          <span className="text-xs font-bold text-gray-400">
                            #{complaint.id} • {complaint.ward || 'Ward 1'} • {new Date(complaint.createdAt).toLocaleDateString()}
                          </span>
                          {complaint.imageVerified === true && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                              ✓ AI Verified
                            </span>
                          )}
                          {complaint.escalated && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700">
                              ⚠️ Escalated
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          📍 {complaint.location}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(complaint.status)}`}>
                        {complaint.status}
                      </span>
                    </div>
                  </div>

                  {/* Summary & Description */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Description
                      </p>
                      <p className="text-xs text-gray-700 leading-relaxed bg-gray-50/60 p-3 rounded-xl border border-gray-100">
                        {complaint.description}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Municipal Routing
                      </p>
                      <div className="text-xs text-gray-700 bg-accent-light/40 p-3 rounded-xl border border-accent-subtle/40">
                        <p className="font-semibold text-accent mb-0.5">
                          Assigned: {complaint.routedAuthority || 'Municipal Operations'}
                        </p>
                        <p className="text-gray-600">
                          {complaint.aiSummary || 'Automated smart dispatch.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Grievance Photo Attachment */}
                  {complaint.photoData && (
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-start gap-4">
                      <img
                        src={complaint.photoData}
                        alt="Evidence"
                        className="w-24 h-20 object-cover rounded-xl border border-gray-200 shadow-xs"
                      />
                      <div className="text-xs text-gray-600">
                        <span className="font-bold text-gray-800">Photo Proof</span>
                        {complaint.imageVerificationNote && (
                          <p className="text-[11px] text-gray-500 italic mt-0.5">
                            🤖 AI Vision: {complaint.imageVerificationNote}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Status update selector for demo/staff */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Quick Status Update
                    </span>
                    <div className="flex items-center gap-2">
                      <select
                        value={complaint.status}
                        onChange={(e) => handleStatusUpdate(complaint.id, e.target.value)}
                        disabled={updatingId === complaint.id}
                        className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        <option value="OPEN">OPEN</option>
                        <option value="IN_PROGRESS">IN PROGRESS</option>
                        <option value="RESOLVED">RESOLVED</option>
                      </select>
                      {updatingId === complaint.id && (
                        <span className="text-xs text-accent font-bold">Updating...</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center shadow-card border border-gray-100 text-xs text-gray-400">
              No complaints in this status filter.
            </div>
          )}
        </div>
      )}
    </div>
  );
}