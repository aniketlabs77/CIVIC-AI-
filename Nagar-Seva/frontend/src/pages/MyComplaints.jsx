import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient';

export default function MyComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

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
        console.warn('Fallback to /api/complaints:', myErr);
        const fallbackRes = await apiClient.get('/api/complaints');
        data = fallbackRes.data || [];
      }

      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          data = [];
        }
      }
      const complaintList = Array.isArray(data) ? data : (Array.isArray(data?.content) ? data.content : []);
      setComplaints(complaintList);
    } catch (err) {
      console.error('Error loading complaints:', err);
      setError('Unable to load your complaints from the municipal service.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateVal) => {
    if (!dateVal) return 'Recent';
    try {
      if (Array.isArray(dateVal)) {
        return new Date(dateVal[0], (dateVal[1] || 1) - 1, dateVal[2] || 1).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
      }
      const d = new Date(dateVal);
      return isNaN(d.getTime()) ? 'Recent' : d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'Recent';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'OPEN':
        return 'bg-amber-50 text-amber-800 border border-amber-200';
      case 'IN_PROGRESS':
        return 'bg-blue-50 text-blue-800 border border-blue-200';
      case 'RESOLVED':
        return 'bg-emerald-50 text-emerald-800 border border-emerald-200';
      case 'ESCALATED':
        return 'bg-rose-50 text-rose-800 border border-rose-200 font-bold';
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  const getCategoryIcon = (category) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('streetlight') || cat.includes('light') || cat.includes('electric')) return '💡';
    if (cat.includes('road') || cat.includes('pothole')) return '🛣️';
    if (cat.includes('drain') || cat.includes('water') || cat.includes('sewage')) return '🚰';
    if (cat.includes('garbage') || cat.includes('waste') || cat.includes('dump') || cat.includes('sanitation')) return '🗑️';
    if (cat.includes('safe') || cat.includes('police') || cat.includes('crime')) return '🛡️';
    if (cat.includes('encroach')) return '🚧';
    return '📋';
  };

  const safeComplaints = Array.isArray(complaints) ? complaints : [];

  const filteredComplaints = useMemo(() => {
    return safeComplaints.filter((c) => {
      if (filterStatus !== 'ALL' && c.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const catMatch = (c.category || '').toLowerCase().includes(query);
        const descMatch = (c.description || '').toLowerCase().includes(query);
        const locMatch = (c.location || '').toLowerCase().includes(query);
        const idMatch = String(c.id || '').includes(query);
        return catMatch || descMatch || locMatch || idMatch;
      }
      return true;
    });
  }, [safeComplaints, filterStatus, searchQuery]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-100">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-50 border border-violet-200 rounded-full text-violet-700 text-xs font-bold mb-1.5">
            <span>📋</span>
            <span>Citizen Grievance Tracker</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            My Reported Grievances
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Track real-time progress, municipal routing & verified repair proofs for your submissions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/report"
            className="px-4 py-2 bg-[#7c5cff] hover:bg-[#6949f5] text-white text-xs font-bold rounded-full shadow-sm transition inline-flex items-center gap-1.5"
          >
            <span>➕</span>
            <span>File New Grievance</span>
          </Link>
          <button
            onClick={fetchMyComplaints}
            className="px-3.5 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold rounded-full transition shadow-xs"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your complaints by ticket #, category, or landmark..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7c5cff]"
          />
          <span className="absolute left-3 top-2.5 text-gray-400 text-xs">🔍</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2 text-gray-400 hover:text-gray-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                filterStatus === st
                  ? 'bg-[#7c5cff] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {st === 'ALL' ? 'All My Tickets' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 text-rose-800 text-xs rounded-2xl border border-rose-200">
          {error}
        </div>
      )}

      {loading && (
        <div className="py-16 text-center text-xs text-gray-400">
          <div className="w-8 h-8 border-2 border-[#7c5cff] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
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
                  className="bg-white rounded-2xl shadow-sm border border-gray-100/90 p-5 sm:p-6 transition hover:shadow-md"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-gray-50 flex items-center justify-center text-xl shadow-xs border border-gray-100 shrink-0">
                        {getCategoryIcon(complaint.category)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-extrabold text-gray-900">
                            {complaint.category || 'Grievance'}
                          </span>
                          <span className="text-xs font-bold text-gray-400">
                            #{complaint.id} • {complaint.ward || 'Ward 1'} • {formatDate(complaint.createdAt)}
                          </span>
                          {complaint.imageVerified === true && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                              ✓ AI Verified
                            </span>
                          )}
                          {complaint.escalated && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              ⚠️ Escalated
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                          <span>📍</span>
                          <span>{complaint.location || 'Location Not Specified'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(complaint.status)}`}>
                        {complaint.status || 'OPEN'}
                      </span>
                    </div>
                  </div>

                  {/* Summary & Description */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Reported Details
                      </p>
                      <p className="text-xs text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100 min-h-[60px]">
                        {complaint.description || 'No description available.'}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Department & Automated Routing
                      </p>
                      <div className="text-xs text-gray-700 bg-violet-50/50 p-3 rounded-xl border border-violet-100/80 min-h-[60px]">
                        <p className="font-semibold text-violet-900 mb-0.5">
                          🏢 {complaint.routedAuthority || 'Municipal Department Assigned'}
                        </p>
                        <p className="text-gray-600 text-[11px]">
                          {complaint.aiSummary || 'Automated classification dispatched to department field officers.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Photos */}
                  {complaint.photoData && (
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-start gap-4">
                      <img
                        src={complaint.photoData}
                        alt="Citizen Evidence"
                        className="w-24 h-20 object-cover rounded-xl border border-gray-200 shadow-xs shrink-0"
                      />
                      <div className="text-xs text-gray-600">
                        <span className="font-bold text-gray-800">Submitted Photo Evidence</span>
                        {complaint.imageVerificationNote && (
                          <p className="text-[11px] text-gray-500 italic mt-0.5">
                            🤖 AI Vision: {complaint.imageVerificationNote}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Resolution Proof Card */}
                  {complaint.status === 'RESOLVED' && (
                    <div className="mt-4 p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-start gap-3">
                      <div className="text-xl">✅</div>
                      <div className="text-xs space-y-1">
                        <p className="font-bold text-emerald-900">
                          Grievance Remediated & Verified
                        </p>
                        {complaint.resolutionNote && (
                          <p className="text-emerald-800">
                            Officer Note: {complaint.resolutionNote}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100 text-xs text-gray-400 space-y-3">
              <div className="text-3xl">📝</div>
              <p className="font-semibold text-gray-700 text-sm">No grievances reported yet</p>
              <p className="text-gray-400 max-w-sm mx-auto">
                Any civic issue you report with photo evidence or location pin will appear here with live tracking updates.
              </p>
              <Link
                to="/report"
                className="inline-block mt-2 px-4 py-2 bg-[#7c5cff] text-white font-bold text-xs rounded-full shadow-sm hover:bg-[#6949f5] transition"
              >
                Report an Issue Now →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
