import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient';

export default function TrackComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterWard, setFilterWard] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  useEffect(() => {
    fetchComplaints(0);
  }, []);

  const fetchComplaints = async (targetPage = page) => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/api/complaints', {
        params: { page: targetPage, size: pageSize }
      });
      let data = response.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          data = {};
        }
      }
      if (data && Array.isArray(data.content)) {
        setComplaints(data.content);
        setTotalPages(data.totalPages || 1);
        setTotalElements(data.totalElements || data.content.length);
        setPage(data.number !== undefined ? data.number : targetPage);
      } else if (Array.isArray(data)) {
        setComplaints(data);
        setTotalPages(1);
        setTotalElements(data.length);
        setPage(0);
      } else {
        setComplaints([]);
      }
    } catch (err) {
      console.error('Error fetching complaints:', err);
      setError('Could not load complaints from the server. Please ensure the backend is running.');
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
      setComplaints(prev =>
        prev.map(c => (c.id === complaintId ? (response.data || { ...c, status: newStatus }) : c))
      );
      setMessage(`✅ Ticket #${complaintId} status updated to ${newStatus}`);
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      console.error('Error updating status:', err);
      setMessage('❌ Failed to update status.');
    } finally {
      setUpdatingId(null);
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
      default:
        return 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border border-red-300 font-bold';
      case 'HIGH':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'LOW':
        return 'bg-slate-50 text-slate-600 border border-slate-200';
      default:
        return 'bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700';
    }
  };

  const getCategoryIcon = (category) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('streetlight') || cat.includes('light') || cat.includes('electric')) return '💡';
    if (cat.includes('road') || cat.includes('pothole')) return '🛣️';
    if (cat.includes('drain') || cat.includes('water') || cat.includes('sewage')) return '🚰';
    if (cat.includes('garbage') || cat.includes('waste') || cat.includes('sanitation')) return '🗑️';
    if (cat.includes('safe') || cat.includes('police') || cat.includes('crime')) return '🛡️';
    if (cat.includes('encroach')) return '🚧';
    return '📋';
  };

  const safeComplaints = Array.isArray(complaints) ? complaints : [];

  const stats = useMemo(() => ({
    total: safeComplaints.length,
    open: safeComplaints.filter(c => c.status === 'OPEN').length,
    inProgress: safeComplaints.filter(c => c.status === 'IN_PROGRESS').length,
    resolved: safeComplaints.filter(c => c.status === 'RESOLVED').length,
  }), [safeComplaints]);

  const filteredComplaints = useMemo(() => {
    return safeComplaints.filter(c => {
      // Status filter
      if (filterStatus !== 'ALL' && c.status !== filterStatus) return false;
      // Ward filter
      if (filterWard !== 'ALL' && (c.ward || 'Ward 1') !== filterWard) return false;
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const categoryMatch = (c.category || '').toLowerCase().includes(query);
        const descMatch = (c.description || '').toLowerCase().includes(query);
        const locMatch = (c.location || '').toLowerCase().includes(query);
        const authMatch = (c.routedAuthority || '').toLowerCase().includes(query);
        const idMatch = String(c.id || '').includes(query);
        return categoryMatch || descMatch || locMatch || authMatch || idMatch;
      }
      return true;
    });
  }, [safeComplaints, filterStatus, filterWard, searchQuery]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-100 dark:border-gray-700">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-50 border border-violet-200 rounded-full text-violet-700 text-xs font-bold mb-1.5">
            <span>🏛️</span>
            <span>Public Civic Grievance Registry</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
            Track All Municipal Complaints
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Real-time public grievance resolution tracking, AI verification logs & department dispatches
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/report"
            className="px-4 py-2 bg-[#7c5cff] hover:bg-[#6949f5] text-white text-xs font-bold rounded-full shadow-sm dark:shadow-none transition inline-flex items-center gap-1.5"
          >
            <span>➕</span>
            <span>Report Grievance</span>
          </Link>
          <button
            onClick={fetchComplaints}
            className="px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900 text-xs font-bold rounded-full transition shadow-xs"
            title="Refresh feed"
          >
            🔄 Refresh
          </button>
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-none border border-gray-100 dark:border-gray-700">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Grievances</span>
          <div className="text-3xl font-black text-gray-900 dark:text-gray-100 mt-1">{stats.total}</div>
          <p className="text-xs text-gray-400 mt-0.5">Across all wards</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-none border border-amber-100">
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Open Tickets</span>
          <div className="text-3xl font-black text-amber-600 mt-1">{stats.open}</div>
          <p className="text-xs text-amber-700/70 mt-0.5">Awaiting municipal action</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-none border border-blue-100">
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">In Progress</span>
          <div className="text-3xl font-black text-blue-600 mt-1">{stats.inProgress}</div>
          <p className="text-xs text-blue-700/70 mt-0.5">Under field inspection</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-none border border-emerald-100">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Resolved</span>
          <div className="text-3xl font-black text-emerald-600 mt-1">{stats.resolved}</div>
          <p className="text-xs text-emerald-700/70 mt-0.5">Repairs verified & closed</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-gray-800 p-3.5 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ticket #, category, landmark, or authority..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7c5cff]"
          />
          <span className="absolute left-3 top-2.5 text-gray-400 text-xs">🔍</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2 text-gray-400 hover:text-gray-600 dark:text-gray-400 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                filterStatus === st
                  ? 'bg-[#7c5cff] text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100 hover:bg-gray-100'
              }`}
            >
              {st === 'ALL' ? 'All Status' : st.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Ward Selector */}
        <select
          value={filterWard}
          onChange={(e) => setFilterWard(e.target.value)}
          className="px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#7c5cff]"
        >
          <option value="ALL">All Wards</option>
          <option value="Ward 1">Ward 1 (Central)</option>
          <option value="Ward 2">Ward 2 (North/Industrial)</option>
          <option value="Ward 3">Ward 3 (South/Tech Park)</option>
        </select>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 text-rose-800 text-xs rounded-2xl border border-rose-200">
          {error}
        </div>
      )}

      {loading && (
        <div className="py-16 text-center text-xs text-gray-400">
          <div className="w-8 h-8 border-2 border-[#7c5cff] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Loading complaints feed...
        </div>
      )}

      {/* Complaints Feed */}
      {!loading && (
        <div>
          {filteredComplaints.length > 0 ? (
            <>
              <div className="space-y-4">
              {filteredComplaints.map((complaint) => (
                <div
                  key={complaint.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-gray-700/90 p-5 sm:p-6 transition hover:shadow-md dark:shadow-none"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-xl shadow-xs border border-gray-100 dark:border-gray-700 shrink-0">
                        {getCategoryIcon(complaint.category)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-extrabold text-gray-900 dark:text-gray-100">
                            {complaint.category || 'Civic Grievance'}
                          </span>
                          <span className="text-xs font-bold text-gray-400">
                            #{complaint.id} • {complaint.ward || 'Ward 1'} • {formatDate(complaint.createdAt)}
                          </span>
                          {complaint.priority && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${getPriorityBadge(complaint.priority)}`}>
                              {complaint.priority}
                            </span>
                          )}
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
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-1">
                          <span>📍</span>
                          <span className="font-medium">{complaint.location || 'Location Not Specified'}</span>
                          {complaint.latitude && complaint.longitude && (
                            <span className="text-gray-400 text-[11px]">
                              ({complaint.latitude.toFixed(4)}, {complaint.longitude.toFixed(4)})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(complaint.status)}`}>
                        {complaint.status || 'OPEN'}
                      </span>
                    </div>
                  </div>

                  {/* Summary & Description */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Citizen Grievance Description
                      </p>
                      <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-700 min-h-[60px]">
                        {complaint.description || 'No description provided.'}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Assigned Authority & AI Routing
                      </p>
                      <div className="text-xs text-gray-700 dark:text-gray-300 bg-violet-50/50 p-3 rounded-xl border border-violet-100/80 min-h-[60px]">
                        <p className="font-semibold text-violet-900 mb-0.5">
                          🏢 {complaint.routedAuthority || 'Municipal Operations Cell'}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400 text-[11px] leading-relaxed">
                          {complaint.aiSummary || 'Automated classification and dispatch dispatched to responsible department.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Photo Evidence & AI Note */}
                  {(complaint.photoData || complaint.imageVerificationNote) && (
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-start gap-4">
                      {complaint.photoData && (
                        <img
                          src={complaint.photoData}
                          alt="Grievance Evidence"
                          className="w-24 h-20 object-cover rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs shrink-0"
                        />
                      )}
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        <span className="font-bold text-gray-800 dark:text-gray-200">Visual Verification Note</span>
                        {complaint.imageVerificationNote ? (
                          <p className="text-[11px] text-gray-600 dark:text-gray-400 italic mt-0.5 bg-gray-50 dark:bg-gray-900 p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                            🤖 {complaint.imageVerificationNote}
                          </p>
                        ) : (
                          <p className="text-[11px] text-gray-400 mt-0.5">Photographic proof attached with grievance submission.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Quick Status Selector */}
                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>📧 Notifications:</span>
                      <span className="text-emerald-700 font-semibold">Active & Monitored</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        Update Status:
                      </span>
                      <select
                        value={complaint.status || 'OPEN'}
                        onChange={(e) => handleStatusUpdate(complaint.id, e.target.value)}
                        disabled={updatingId === complaint.id}
                        className="px-3 py-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#7c5cff]"
                      >
                        <option value="OPEN">OPEN</option>
                        <option value="IN_PROGRESS">IN PROGRESS</option>
                        <option value="RESOLVED">RESOLVED</option>
                      </select>
                      {updatingId === complaint.id && (
                        <span className="text-xs text-[#7c5cff] font-bold animate-pulse">Updating...</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm dark:shadow-none mt-6">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Showing page <span className="font-bold text-gray-800 dark:text-gray-200">{page + 1}</span> of{' '}
                  <span className="font-bold text-gray-800 dark:text-gray-200">{totalPages}</span> ({totalElements} total complaints)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchComplaints(page - 1)}
                    disabled={page === 0 || loading}
                    className="px-3.5 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    ← Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i).map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => fetchComplaints(pageNum)}
                        className={`w-8 h-8 rounded-full text-xs font-bold transition ${
                          page === pageNum
                            ? 'bg-[#7c5cff] text-white shadow-xs'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        {pageNum + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => fetchComplaints(page + 1)}
                    disabled={page >= totalPages - 1 || loading}
                    className="px-3.5 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center shadow-sm dark:shadow-none border border-gray-100 dark:border-gray-700 text-xs text-gray-400 space-y-2">
              <div className="text-3xl">📋</div>
              <p className="font-semibold text-gray-600 dark:text-gray-400">No complaints found matching your filter criteria.</p>
              <p className="text-gray-400">Try adjusting your search query or selecting a different status/ward.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}