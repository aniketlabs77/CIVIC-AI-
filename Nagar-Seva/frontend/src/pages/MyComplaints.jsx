import React, { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';

export default function MyComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    fetchMyComplaints();
  }, []);

  const fetchMyComplaints = async () => {
    setLoading(true);
    setError('');
    try {
      let data = [];
      try {
        const response = await apiClient.get('/api/complaints/my');
        data = response.data || [];
      } catch (myErr) {
        console.warn('Direct /api/complaints/my fallback:', myErr);
        const fallbackRes = await apiClient.get('/api/complaints');
        data = fallbackRes.data || [];
      }
      setComplaints(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading complaints:', err);
      setError('Unable to connect to municipal service. Please ensure the backend server is running on port 8080.');
    } finally {
      setLoading(false);
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

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            My Reported Grievances
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Track resolution progress and verified repair proof for your submissions
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
              {st === 'ALL' ? 'All My Tickets' : st.replace('_', ' ')}
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
          Loading your complaints...
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
                        Your Description
                      </p>
                      <p className="text-xs text-gray-700 leading-relaxed bg-gray-50/60 p-3 rounded-xl border border-gray-100">
                        {complaint.description}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Municipal AI Dispatch
                      </p>
                      <div className="text-xs text-gray-700 bg-accent-light/40 p-3 rounded-xl border border-accent-subtle/40">
                        <p className="font-semibold text-accent mb-0.5">
                          Assigned: {complaint.routedAuthority || 'Municipal Department'}
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

                  {/* Resolution Proof If Resolved */}
                  {complaint.status === 'RESOLVED' && (complaint.resolutionPhotoUrl || complaint.resolutionNote) && (
                    <div className="mt-4 p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/60 text-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                          <span>✓</span>
                          <span>Official Municipal Resolution</span>
                        </span>
                        {complaint.resolutionVerified === true && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900">
                            ✓ AI Verified Fix
                          </span>
                        )}
                      </div>
                      {complaint.resolutionNote && (
                        <p className="text-emerald-800 leading-relaxed">{complaint.resolutionNote}</p>
                      )}
                      {complaint.resolutionPhotoUrl && (
                        <img
                          src={complaint.resolutionPhotoUrl}
                          alt="Resolution Proof"
                          className="mt-2.5 max-h-40 rounded-xl border border-emerald-200 shadow-xs"
                        />
                      )}
                      {complaint.resolvedAt && (
                        <p className="text-[10px] text-emerald-600 mt-2 font-medium">
                          Resolved on: {new Date(complaint.resolvedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center shadow-card border border-gray-100 text-xs text-gray-400">
              You haven't filed any complaints in this status yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
