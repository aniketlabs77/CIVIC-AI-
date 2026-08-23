import React, { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';

export default function AdminPanel() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [resolvingId, setResolvingId] = useState(null);
  const [resolutionForm, setResolutionForm] = useState({
    resolutionPhotoUrl: '',
    resolutionNote: ''
  });

  useEffect(() => {
    fetchAllComplaints();
  }, []);

  const fetchAllComplaints = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/api/admin/complaints');
      setComplaints(response.data);
    } catch (err) {
      setError('Failed to load complaints. Please try again later.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenResolve = (complaint) => {
    setResolvingId(complaint.id);
    setResolutionForm({ resolutionPhotoUrl: '', resolutionNote: '' });
  };

  const handleCloseResolve = () => {
    setResolvingId(null);
    setResolutionForm({ resolutionPhotoUrl: '', resolutionNote: '' });
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!resolutionForm.resolutionPhotoUrl || !resolutionForm.resolutionNote) {
      alert('Please provide both resolution photo and note');
      return;
    }

    try {
      await apiClient.patch(`/api/admin/complaints/${resolvingId}/resolve`, resolutionForm);
      setResolvingId(null);
      setResolutionForm({ resolutionPhotoUrl: '', resolutionNote: '' });
      fetchAllComplaints(); // Refresh
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to resolve complaint');
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

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-rose-50 text-rose-700 border border-rose-100';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-700 border border-amber-100';
      case 'LOW':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-100';
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

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Municipal Admin Operations
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Resolve citizen complaints, review AI vision proof and manage ward tickets
          </p>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-full shadow-card border border-gray-100 overflow-x-auto">
          {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED'].map((st) => (
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
              {st === 'ALL' ? 'All Tickets' : st.replace('_', ' ')}
            </button>
          ))}
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
          Loading administration queue...
        </div>
      )}

      {/* Complaints Feed */}
      {!loading && !error && (
        <div>
          {filteredComplaints.length > 0 ? (
            <div className="space-y-4">
              {filteredComplaints.map((complaint) => (
                <div
                  key={complaint.id}
                  className="bg-white rounded-2xl shadow-card border border-gray-100/70 p-5 sm:p-6 transition hover:shadow-card-hover"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-100">
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
                            #{complaint.id} • {complaint.ward || 'Ward 1'}
                          </span>
                          {complaint.priority && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getPriorityBadge(complaint.priority)}`}>
                              {complaint.priority} Priority
                            </span>
                          )}
                          {complaint.imageVerified === true && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                              ✓ AI Image Verified
                            </span>
                          )}
                          {complaint.escalated && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700">
                              ⚠️ Escalated
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          📍 {complaint.location} • Reported by: <span className="font-semibold text-gray-700">{complaint.citizen?.name || complaint.citizen?.email || 'Citizen'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end lg:self-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(complaint.status)}`}>
                        {complaint.status}
                      </span>
                      {complaint.status !== 'RESOLVED' && (
                        <button
                          onClick={() => handleOpenResolve(complaint)}
                          className="px-4 py-1.5 rounded-full bg-dark hover:bg-dark-hover text-white text-xs font-semibold shadow-sm transition"
                        >
                          Resolve Ticket
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Grievance Description & Summary */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Citizen Description
                      </p>
                      <p className="text-xs text-gray-700 leading-relaxed bg-gray-50/60 p-3 rounded-xl border border-gray-100">
                        {complaint.description}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        AI Routing & Summary
                      </p>
                      <div className="text-xs text-gray-700 bg-accent-light/40 p-3 rounded-xl border border-accent-subtle/40">
                        <p className="font-semibold text-accent mb-0.5">
                          Assigned Authority: {complaint.routedAuthority || 'Municipal Field Operations'}
                        </p>
                        <p className="text-gray-600">
                          {complaint.aiSummary || 'AI automated grievance assessment completed.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Grievance Photo Attachment */}
                  {complaint.photoData && (
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-start gap-4">
                      <img
                        src={complaint.photoData}
                        alt="Grievance Evidence"
                        className="w-24 h-20 object-cover rounded-xl border border-gray-200 shadow-xs"
                      />
                      <div className="text-xs text-gray-600">
                        <span className="font-bold text-gray-800">Photo Proof Attached</span>
                        {complaint.imageVerificationNote && (
                          <p className="text-[11px] text-gray-500 italic mt-0.5">
                            🤖 AI Vision: {complaint.imageVerificationNote}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Resolution Details If Resolved */}
                  {complaint.status === 'RESOLVED' && (complaint.resolutionPhotoUrl || complaint.resolutionNote) && (
                    <div className="mt-4 p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 text-xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-emerald-900 flex items-center gap-1">
                          ✓ Resolution Completed
                        </span>
                        {complaint.resolutionVerified === true && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900">
                            ✓ AI Verified Fix
                          </span>
                        )}
                      </div>
                      {complaint.resolutionNote && (
                        <p className="text-emerald-800">{complaint.resolutionNote}</p>
                      )}
                      {complaint.resolutionPhotoUrl && (
                        <img
                          src={complaint.resolutionPhotoUrl}
                          alt="Resolution Proof"
                          className="mt-2 max-h-36 rounded-lg border border-emerald-200"
                        />
                      )}
                    </div>
                  )}
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

      {/* Resolution Modal */}
      {resolvingId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-lg p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">
                  Resolve Ticket #{resolvingId}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Attach repair completion photo & operational resolution note
                </p>
              </div>
              <button
                onClick={handleCloseResolve}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Resolution Photo URL / Image Link
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com/repair-proof.jpg"
                  value={resolutionForm.resolutionPhotoUrl}
                  onChange={(e) => setResolutionForm(prev => ({ ...prev, resolutionPhotoUrl: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Resolution Description & Action Note
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Details of repair or action taken by municipal department..."
                  value={resolutionForm.resolutionNote}
                  onChange={(e) => setResolutionForm(prev => ({ ...prev, resolutionNote: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCloseResolve}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-gray-600 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-sm transition"
                >
                  Submit Resolution Proof
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}