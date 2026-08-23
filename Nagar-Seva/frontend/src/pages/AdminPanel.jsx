import React, { useEffect, useState, useMemo } from 'react';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { MUNICIPAL_DEPARTMENTS } from './Login';

export default function AdminPanel() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('AUTO'); // 'AUTO' (user dept) | 'ALL' | specific department name
  const [searchQuery, setSearchQuery] = useState('');
  const [resolvingId, setResolvingId] = useState(null);
  const [resolutionForm, setResolutionForm] = useState({
    resolutionPhotoUrl: '',
    resolutionNote: '',
  });

  const userDepartment = user?.department || 'Public Works & Road Safety (PWD)';

  useEffect(() => {
    fetchAllComplaints();
  }, []);

  const fetchAllComplaints = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/api/admin/complaints');
      let data = response.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          data = [];
        }
      }
      setComplaints(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching admin complaints:', err);
      setError('Failed to load complaints from municipal database. Please verify backend service.');
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
      alert('Please provide both resolution photo URL and an action note');
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
    if (cat.includes('streetlight') || cat.includes('light') || cat.includes('electric')) return '💡';
    if (cat.includes('road') || cat.includes('pothole')) return '🛣️';
    if (cat.includes('drain') || cat.includes('water') || cat.includes('sewage')) return '🚰';
    if (cat.includes('food') || cat.includes('hygiene')) return '🥗';
    if (cat.includes('dump') || cat.includes('garbage') || cat.includes('waste')) return '🗑️';
    if (cat.includes('safe') || cat.includes('crime') || cat.includes('police')) return '🛡️';
    if (cat.includes('encroach')) return '🚧';
    return '📋';
  };

  const doesComplaintMatchDept = (complaint, deptName) => {
    if (!deptName || deptName === 'ALL') return true;
    const cat = (complaint.category || '').toLowerCase();
    const routed = (complaint.routedAuthority || '').toLowerCase();
    const dLower = deptName.toLowerCase();

    if (dLower.includes('road') || dLower.includes('pwd')) {
      return cat.includes('road') || cat.includes('pothole') || routed.includes('pwd') || routed.includes('road');
    }
    if (dLower.includes('food')) {
      return cat.includes('food') || cat.includes('hygiene') || routed.includes('food');
    }
    if (dLower.includes('police') || dLower.includes('patrol')) {
      return cat.includes('safe') || cat.includes('crime') || cat.includes('police') || routed.includes('police');
    }
    if (dLower.includes('water') || dLower.includes('jal') || dLower.includes('sewage')) {
      return cat.includes('drain') || cat.includes('water') || cat.includes('sewage') || routed.includes('jal');
    }
    if (dLower.includes('sanitation') || dLower.includes('waste')) {
      return cat.includes('garbage') || cat.includes('dump') || cat.includes('waste') || routed.includes('sanitation');
    }
    if (dLower.includes('electricity') || dLower.includes('light')) {
      return cat.includes('light') || cat.includes('electric') || routed.includes('electricity');
    }
    if (dLower.includes('encroach')) {
      return cat.includes('encroach') || routed.includes('encroach');
    }
    return true;
  };

  const safeComplaints = Array.isArray(complaints) ? complaints : [];

  const filteredComplaints = useMemo(() => {
    return safeComplaints.filter((c) => {
      // Status filter
      if (filterStatus !== 'ALL' && c.status !== filterStatus) return false;

      // Department filter
      if (departmentFilter === 'AUTO') {
        if (!doesComplaintMatchDept(c, userDepartment)) return false;
      } else if (departmentFilter !== 'ALL') {
        if (!doesComplaintMatchDept(c, departmentFilter)) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const catMatch = (c.category || '').toLowerCase().includes(query);
        const descMatch = (c.description || '').toLowerCase().includes(query);
        const locMatch = (c.location || '').toLowerCase().includes(query);
        const authMatch = (c.routedAuthority || '').toLowerCase().includes(query);
        const idMatch = String(c.id || '').includes(query);
        return catMatch || descMatch || locMatch || authMatch || idMatch;
      }
      return true;
    });
  }, [safeComplaints, filterStatus, departmentFilter, userDepartment, searchQuery]);

  const activeDeptObj = MUNICIPAL_DEPARTMENTS.find(d => d.name === userDepartment) || MUNICIPAL_DEPARTMENTS[0];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Official Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100/90 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-50 border border-violet-200 rounded-full text-xs font-bold text-violet-800 mb-2">
            <span>{activeDeptObj.icon}</span>
            <span>{activeDeptObj.name}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Municipal Department Operations
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Logged in as <span className="font-bold text-gray-800">{user?.name || user?.email}</span> ({user?.email})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAllComplaints}
            className="px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-bold text-gray-700 rounded-full shadow-xs transition inline-flex items-center gap-1.5"
          >
            <span>🔄</span>
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {/* Filter and Control Center */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tickets by ID, ward, description, or citizen..."
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

        {/* Department Scope Selector */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <span className="text-xs font-bold text-gray-400 whitespace-nowrap">Department:</span>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7c5cff]"
          >
            <option value="AUTO">🎯 My Department ({activeDeptObj.category})</option>
            <option value="ALL">🌐 All Municipal Departments ({safeComplaints.length})</option>
            {MUNICIPAL_DEPARTMENTS.map((dept) => (
              <option key={dept.id} value={dept.name}>
                {dept.icon} {dept.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0">
          {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED'].map((st) => (
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
              {st === 'ALL' ? 'All Statuses' : st.replace('_', ' ')}
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
                  className="bg-white rounded-2xl shadow-sm border border-gray-100/90 p-5 sm:p-6 transition hover:shadow-md"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-100">
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
                            #{complaint.id} • {complaint.ward || 'Ward 1'}
                          </span>
                          {complaint.priority && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getPriorityBadge(complaint.priority)}`}>
                              {complaint.priority} Priority
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
                        <p className="text-xs text-gray-500 mt-1">
                          📍 {complaint.location || 'Location Not Provided'} • Citizen: <span className="font-semibold text-gray-700">{complaint.citizen?.name || complaint.citizen?.email || 'Guest Citizen'}</span>
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
                          className="px-4 py-1.5 rounded-full bg-gray-900 hover:bg-black text-white text-xs font-semibold shadow-sm transition"
                        >
                          Resolve Ticket →
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Grievance Description & Routing */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Reported Details
                      </p>
                      <p className="text-xs text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100 min-h-[60px]">
                        {complaint.description || 'No description provided.'}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Assigned Municipal Jurisdiction
                      </p>
                      <div className="text-xs text-gray-700 bg-violet-50/50 p-3 rounded-xl border border-violet-100/80 min-h-[60px]">
                        <p className="font-semibold text-violet-900 mb-0.5">
                          🏢 {complaint.routedAuthority || 'Municipal Department Assigned'}
                        </p>
                        <p className="text-gray-600 text-[11px]">
                          {complaint.aiSummary || 'Automated AI classification dispatched to department officers.'}
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
                        className="w-24 h-20 object-cover rounded-xl border border-gray-200 shadow-xs shrink-0"
                      />
                      <div className="text-xs text-gray-600">
                        <span className="font-bold text-gray-800">Citizen Evidence Photo</span>
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
                    <div className="mt-4 p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-emerald-900 flex items-center gap-1">
                          ✓ Remediated & Verified
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
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100 text-xs text-gray-400 space-y-2">
              <div className="text-3xl">📭</div>
              <p className="font-semibold text-gray-700 text-sm">No complaints found for this department scope</p>
              <p className="text-gray-400 max-w-sm mx-auto">
                Try switching the Department selector above to "All Municipal Departments" or changing the status filter.
              </p>
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
                  placeholder="https://images.unsplash.com/photo-1541888946425-d0fbb180c5f5"
                  value={resolutionForm.resolutionPhotoUrl}
                  onChange={(e) => setResolutionForm(prev => ({ ...prev, resolutionPhotoUrl: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7c5cff]"
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
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7c5cff]"
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
                  className="px-5 py-2 rounded-full bg-[#7c5cff] hover:bg-[#6949f5] text-white text-xs font-semibold shadow-sm transition"
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