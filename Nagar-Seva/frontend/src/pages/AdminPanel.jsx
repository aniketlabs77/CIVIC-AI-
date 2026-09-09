import React, { useEffect, useState, useMemo } from 'react';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { MUNICIPAL_DEPARTMENTS } from './Login';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function AdminPanel() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'queue'
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('AUTO'); // 'AUTO' (user dept) | 'ALL' | specific department name
  const [searchQuery, setSearchQuery] = useState('');
  const [resolvingId, setResolvingId] = useState(null);
  const [resolutionForm, setResolutionForm] = useState({
    resolutionPhotoUrl: '',
    resolutionNote: '',
  });
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Sorting state for Ward Performance table
  const [wardSortField, setWardSortField] = useState('resolutionRate');
  const [wardSortDirection, setWardSortDirection] = useState('asc'); // 'asc' | 'desc' - worst performing first by default

  const userDepartment = user?.department || 'Public Works & Road Safety (PWD)';
  const effectiveDeptName = departmentFilter === 'AUTO' ? userDepartment : departmentFilter;
  const activeDeptObj = MUNICIPAL_DEPARTMENTS.find(d => d.name === userDepartment) || MUNICIPAL_DEPARTMENTS[0];

  useEffect(() => {
    fetchAllComplaints(0);
    fetchAdminStats();
  }, []);

  const fetchAllComplaints = async (targetPage = page) => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/api/admin/complaints', {
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
      console.error('Error fetching admin complaints:', err);
      setError('Failed to load complaints from municipal database. Please verify backend service.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminStats = async () => {
    setStatsLoading(true);
    setStatsError('');
    try {
      const response = await apiClient.get('/api/admin/stats');
      let data = response.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          data = null;
        }
      }
      setStats(data || null);
    } catch (err) {
      console.error('Error fetching admin stats:', err);
      setStatsError('Failed to load administrative analytics from municipal database.');
    } finally {
      setStatsLoading(false);
    }
  };

  const handleRefreshAll = () => {
    fetchAllComplaints(page);
    fetchAdminStats();
  };

  const handleOpenResolve = (complaint) => {
    setResolvingId(complaint.id);
    setResolutionForm({ resolutionPhotoUrl: '', resolutionNote: '' });
  };

  const handleCloseResolve = () => {
    setResolvingId(null);
    setResolutionForm({ resolutionPhotoUrl: '', resolutionNote: '' });
  };

  const handleJumpToResolve = (complaint) => {
    setActiveTab('queue');
    handleOpenResolve(complaint);
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
      handleRefreshAll();
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

  // Scoped complaints for the active department
  const scopedComplaints = useMemo(() => {
    if (departmentFilter === 'ALL') return safeComplaints;
    return safeComplaints.filter(c => doesComplaintMatchDept(c, effectiveDeptName));
  }, [safeComplaints, departmentFilter, effectiveDeptName]);

  // Filtered complaints for Ticket Queue tab (accounting for status and search query)
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

  // 1. KPI row calculations: Scoped to selected department
  const kpis = useMemo(() => {
    if (departmentFilter === 'ALL' && stats) {
      return {
        total: stats.totalComplaints ?? scopedComplaints.length,
        resolved: stats.resolvedCount ?? scopedComplaints.filter(c => c.status === 'RESOLVED').length,
        pending: stats.pendingCount ?? scopedComplaints.filter(c => c.status === 'OPEN' || c.status === 'IN_PROGRESS').length,
        escalated: stats.escalatedCount ?? scopedComplaints.filter(c => c.escalated).length,
      };
    }
    return {
      total: scopedComplaints.length,
      resolved: scopedComplaints.filter(c => c.status === 'RESOLVED').length,
      pending: scopedComplaints.filter(c => c.status === 'OPEN' || c.status === 'IN_PROGRESS').length,
      escalated: scopedComplaints.filter(c => c.escalated).length,
    };
  }, [stats, departmentFilter, scopedComplaints]);

  // 2. Side-by-side charts data:
  // Bar chart: complaints per ward, total vs resolved (from complaintsByWard)
  const wardChartData = useMemo(() => {
    if (!stats?.complaintsByWard) return [];
    return Object.entries(stats.complaintsByWard)
      .map(([ward, data]) => ({
        ward,
        total: Number(data.total) || 0,
        resolved: Number(data.resolved) || 0,
      }))
      .sort((a, b) => a.ward.localeCompare(b.ward, undefined, { numeric: true }));
  }, [stats]);

  // Bar chart: complaints by category, scoped to active department
  const categoryChartData = useMemo(() => {
    if (!stats?.complaintsByCategory) return [];
    return Object.entries(stats.complaintsByCategory)
      .filter(([category]) => {
        if (departmentFilter === 'ALL') return true;
        return doesComplaintMatchDept({ category, routedAuthority: category }, effectiveDeptName);
      })
      .map(([category, count]) => ({
        category,
        count: Number(count) || 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [stats, departmentFilter, effectiveDeptName]);

  // 3. Ward performance table data with sorting
  const handleWardSort = (field) => {
    if (wardSortField === field) {
      setWardSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setWardSortField(field);
      setWardSortDirection(field === 'resolutionRate' ? 'asc' : 'desc');
    }
  };

  const sortedWardPerformance = useMemo(() => {
    if (!stats?.complaintsByWard) return [];
    const rows = Object.entries(stats.complaintsByWard).map(([ward, data]) => ({
      ward,
      total: Number(data.total) || 0,
      resolved: Number(data.resolved) || 0,
      resolutionRate: Number(data.resolutionRate) || 0,
      avgResolutionTimeHours: Number(data.avgResolutionTimeHours) || 0,
    }));

    rows.sort((a, b) => {
      let valA = a[wardSortField];
      let valB = b[wardSortField];
      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(valB, undefined, { numeric: true });
        return wardSortDirection === 'asc' ? cmp : -cmp;
      }
      return wardSortDirection === 'asc' ? valA - valB : valB - valA;
    });

    return rows;
  }, [stats, wardSortField, wardSortDirection]);

  // 4. Compact list of escalated tickets scoped to department
  const escalatedTickets = useMemo(() => {
    return safeComplaints.filter(c => c.escalated && (departmentFilter === 'ALL' || doesComplaintMatchDept(c, effectiveDeptName)));
  }, [safeComplaints, departmentFilter, effectiveDeptName]);

  const resolvingComplaint = useMemo(() => {
    if (!resolvingId) return null;
    return safeComplaints.find(c => c.id === resolvingId) || null;
  }, [resolvingId, safeComplaints]);

  return (

    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* ------------------------------------------------------------- */}
      {/* Official Header Banner & Top Controls */}
      {/* ------------------------------------------------------------- */}
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

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {filteredComplaints.some(c => c.status !== 'RESOLVED') && (
            <button
              onClick={() => {
                const firstPending = filteredComplaints.find(c => c.status !== 'RESOLVED');
                if (firstPending) handleOpenResolve(firstPending);
              }}
              className="px-4 py-2 bg-gradient-to-r from-[#7c5cff] to-[#6366f1] hover:from-[#6949f5] hover:to-[#4f46e5] text-white text-xs font-bold rounded-full shadow-sm transition inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>✅</span>
              <span>Resolve Issue</span>
            </button>
          )}

          <button
            onClick={handleRefreshAll}
            className="px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-bold text-gray-700 rounded-full shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Top Department Scope Selector (Filters BOTH Tabs) */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🏛️</span>
          <div>
            <p className="text-xs font-bold text-gray-800 uppercase tracking-wider">Department Jurisdiction Scope</p>
            <p className="text-[11px] text-gray-400">Filters KPIs, charts, escalated tickets, and queue</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7c5cff] cursor-pointer"
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
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Tab Switcher: Overview vs Ticket Queue */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-[#7c5cff] text-white shadow-sm'
              : 'bg-white hover:bg-gray-50 text-gray-600 border border-gray-200'
          }`}
        >
          <span>📊</span>
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('queue')}
          className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 ${
            activeTab === 'queue'
              ? 'bg-[#7c5cff] text-white shadow-sm'
              : 'bg-white hover:bg-gray-50 text-gray-600 border border-gray-200'
          }`}
        >
          <span>📋</span>
          <span>Ticket Queue</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'queue' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {filteredComplaints.length}
          </span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* VIEW 1: OVERVIEW TAB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {statsLoading && !stats && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-10 h-10 border-4 border-[#7c5cff] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-semibold text-gray-500">Loading municipal analytics & statistics...</p>
            </div>
          )}

          {statsError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between shadow-xs">
              <span className="font-semibold">⚠️ {statsError}</span>
              <button
                onClick={fetchAdminStats}
                className="px-3 py-1 bg-white border border-rose-200 rounded-full font-bold text-rose-700 hover:bg-rose-50 transition cursor-pointer"
              >
                Try Again
              </button>
            </div>
          )}

          {/* 1. KPI Row: 4 cards (Total, Resolved, Pending, Escalated) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:border-gray-200 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Complaints</span>
                <span className="w-8 h-8 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center text-sm font-black">
                  📋
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-3xl font-black text-gray-900 tracking-tight">{kpis.total}</span>
                <span className="text-[11px] font-bold text-gray-400">
                  {departmentFilter === 'ALL' ? 'All Depts' : 'In Scope'}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:border-gray-200 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Resolved</span>
                <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-sm font-black">
                  ✅
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-3xl font-black text-emerald-600 tracking-tight">{kpis.resolved}</span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  {kpis.total > 0 ? Math.round((kpis.resolved / kpis.total) * 100) : 0}% Rate
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:border-gray-200 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending</span>
                <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-sm font-black">
                  ⏳
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-3xl font-black text-amber-600 tracking-tight">{kpis.pending}</span>
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                  Open / In Prog
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:border-gray-200 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Escalated</span>
                <span className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center text-sm font-black">
                  ⚠️
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-3xl font-black text-rose-600 tracking-tight">{kpis.escalated}</span>
                <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                  Overdue SLA
                </span>
              </div>
            </div>
          </div>

          {/* 4. Escalated & Overdue Panel (Above the fold, compact list) */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                <h3 className="text-sm font-extrabold text-gray-900 tracking-tight uppercase">
                  Escalated & Overdue Tickets
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800">
                  {escalatedTickets.length} Critical
                </span>
              </div>
              <span className="text-xs text-gray-400 font-medium hidden sm:inline">
                Click any ticket to immediately launch the resolution modal
              </span>
            </div>

            {escalatedTickets.length === 0 ? (
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center gap-2.5">
                <span className="text-base">✅</span>
                <span className="font-semibold">
                  All grievances within SLA. No overdue or escalated tickets in the current department scope.
                </span>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
                {escalatedTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => handleJumpToResolve(ticket)}
                    className="p-3.5 sm:p-4 hover:bg-violet-50/50 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-sm shrink-0">
                        {getCategoryIcon(ticket.category)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-gray-900">#{ticket.id}</span>
                          <span className="text-xs font-bold text-gray-700 truncate">{ticket.category}</span>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            ⚠️ Overdue SLA
                          </span>
                          {ticket.priority && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getPriorityBadge(ticket.priority)}`}>
                              {ticket.priority}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5 max-w-xl">
                          {ticket.description}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          📍 {ticket.location || 'Location Not Specified'} • {ticket.ward || 'Ward 1'}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJumpToResolve(ticket);
                        }}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-full shadow-xs transition group-hover:scale-105 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Resolve Now</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Side-by-side charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Complaints per Ward (Total vs Resolved) */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900 tracking-tight">
                    Complaints per Ward
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Total reported volume vs resolved</p>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-bold">
                  <span className="flex items-center gap-1 text-gray-500">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#e4dcff]"></span> Total
                  </span>
                  <span className="flex items-center gap-1 text-gray-800">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#7c5cff]"></span> Resolved
                  </span>
                </div>
              </div>

              <div className="h-64 w-full">
                {wardChartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-gray-400">
                    No ward data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={wardChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="ward" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px', borderColor: '#e2e8f0' }} />
                      <Bar dataKey="total" fill="#e4dcff" radius={[4, 4, 0, 0]} name="Total Complaints" />
                      <Bar dataKey="resolved" fill="#7c5cff" radius={[4, 4, 0, 0]} name="Resolved Complaints" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Chart 2: Complaints by Category (Scoped to Active Department) */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900 tracking-tight">
                    Complaints by Category
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {departmentFilter === 'ALL' ? 'All municipal categories' : `Scoped to ${activeDeptObj.category}`}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-violet-50 text-[#7c5cff] border border-violet-100">
                  {categoryChartData.length} Categories
                </span>
              </div>

              <div className="h-64 w-full">
                {categoryChartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-gray-400">
                    No complaints registered under this department scope
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px', borderColor: '#e2e8f0' }} />
                      <Bar dataKey="count" fill="#7c5cff" radius={[4, 4, 0, 0]} name="Complaints" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* 3. Ward Performance Table (Sorted by resolution rate ascending by default) */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                  <span>🏆</span>
                  <span>Ward Performance & SLA Accountability</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Surfacing lowest-performing wards first for proactive administrative intervention
                </p>
              </div>
              <span className="text-[11px] text-gray-400 font-medium">
                Click column header to reverse sort order
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 text-[11px] uppercase tracking-wider font-bold">
                    <th
                      onClick={() => handleWardSort('ward')}
                      className="pb-3 pr-4 font-bold cursor-pointer hover:text-gray-800 select-none"
                    >
                      Ward Name {wardSortField === 'ward' ? (wardSortDirection === 'asc' ? '↑' : '↓') : '↕'}
                    </th>
                    <th
                      onClick={() => handleWardSort('total')}
                      className="pb-3 px-4 font-bold text-center cursor-pointer hover:text-gray-800 select-none"
                    >
                      Total {wardSortField === 'total' ? (wardSortDirection === 'asc' ? '↑' : '↓') : '↕'}
                    </th>
                    <th
                      onClick={() => handleWardSort('resolved')}
                      className="pb-3 px-4 font-bold text-center cursor-pointer hover:text-gray-800 select-none"
                    >
                      Resolved {wardSortField === 'resolved' ? (wardSortDirection === 'asc' ? '↑' : '↓') : '↕'}
                    </th>
                    <th
                      onClick={() => handleWardSort('resolutionRate')}
                      className="pb-3 px-4 font-bold text-center cursor-pointer hover:text-gray-800 select-none"
                    >
                      Resolution Rate % {wardSortField === 'resolutionRate' ? (wardSortDirection === 'asc' ? '↑' : '↓') : '↕'}
                    </th>
                    <th
                      onClick={() => handleWardSort('avgResolutionTimeHours')}
                      className="pb-3 pl-4 font-bold text-right cursor-pointer hover:text-gray-800 select-none"
                    >
                      Avg Time (Hours) {wardSortField === 'avgResolutionTimeHours' ? (wardSortDirection === 'asc' ? '↑' : '↓') : '↕'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                  {sortedWardPerformance.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400 text-xs">
                        No ward statistics available
                      </td>
                    </tr>
                  ) : (
                    sortedWardPerformance.map((row) => (
                      <tr key={row.ward} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3.5 pr-4 font-bold text-gray-900 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] text-gray-600 font-bold">
                            {row.ward.replace('Ward ', 'W')}
                          </span>
                          <span>{row.ward}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-gray-800">{row.total}</td>
                        <td className="py-3.5 px-4 text-center font-semibold text-emerald-700">{row.resolved}</td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span
                              className={`font-bold ${
                                row.resolutionRate < 35
                                  ? 'text-rose-600'
                                  : row.resolutionRate < 70
                                  ? 'text-amber-600'
                                  : 'text-emerald-600'
                              }`}
                            >
                              {row.resolutionRate}%
                            </span>
                            <div className="w-14 h-1.5 rounded-full bg-gray-100 overflow-hidden hidden sm:block">
                              <div
                                className={`h-full rounded-full ${
                                  row.resolutionRate < 35
                                  ? 'bg-rose-500'
                                  : row.resolutionRate < 70
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(0, row.resolutionRate))}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 pl-4 text-right font-bold text-gray-800">
                          {row.avgResolutionTimeHours > 0 ? `${row.avgResolutionTimeHours} hrs` : 'N/A'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW 2: TICKET QUEUE TAB (Existing Queue View Unchanged) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'queue' && (
        <div className="space-y-6">
          {/* Search & Status Filter Bar */}
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
                  className="absolute right-3 top-2 text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Status Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0">
              {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
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
              <span>Refreshing municipal ticket queue...</span>
            </div>
          )}

          {/* Ticket Cards List */}
          {!loading && filteredComplaints.length > 0 ? (
            <>
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
                            className="px-4 py-1.5 rounded-full bg-gray-900 hover:bg-black text-white text-xs font-semibold shadow-sm transition inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>✅</span>
                            <span>Resolve Issue →</span>
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

                    {/* Visual Evidence: Area Reference (Baseline) + Grievance (Report) + Resolution Proof */}
                    {(complaint.areaReferencePhotoUrl || complaint.photoData || complaint.photoUrl || complaint.resolutionPhotoUrl) && (
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                            Visual Evidence & AI Verification
                          </p>
                          {complaint.status === 'RESOLVED' && complaint.resolutionVerified === true && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              ✓ AI Verified Fix
                            </span>
                          )}
                          {complaint.status === 'RESOLVED' && complaint.resolutionVerified === false && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              ⚠️ Manual Review Required
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {/* 1. Area Reference Baseline (Only render if present) */}
                          {complaint.areaReferencePhotoUrl && (
                            <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/90 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between gap-1 mb-1.5">
                                  <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tight flex items-center gap-1">
                                    🏛️ Baseline Area
                                  </span>
                                  {complaint.areaReferenceCapturedAt && (
                                    <span className="text-[9px] font-medium text-slate-400">
                                      {complaint.areaReferenceCapturedAt}
                                    </span>
                                  )}
                                </div>
                                <img
                                  src={complaint.areaReferencePhotoUrl}
                                  alt="Area reference baseline"
                                  className="w-full h-24 object-cover rounded-xl border border-slate-200 shadow-2xs"
                                  onError={(e) => {
                                    // Hide element gracefully if image asset is unavailable
                                    e.currentTarget.parentElement.parentElement.style.display = 'none';
                                  }}
                                />
                              </div>
                              <p className="text-[10px] text-slate-500 italic mt-2 leading-tight">
                                Area reference (context only, may not show exact defect)
                              </p>
                            </div>
                          )}

                          {/* 2. Citizen Grievance Photo (Only render if present) */}
                          {(complaint.photoData || complaint.photoUrl) && (
                            <div className="bg-amber-50/50 p-2.5 rounded-2xl border border-amber-200/80 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between gap-1 mb-1.5">
                                  <span className="text-[10px] font-bold text-amber-900 uppercase tracking-tight flex items-center gap-1">
                                    📸 Citizen Grievance
                                  </span>
                                  <span className="text-[9px] font-medium text-amber-700 bg-amber-200/60 px-1.5 py-0.5 rounded">
                                    Defect
                                  </span>
                                </div>
                                <img
                                  src={complaint.photoData || complaint.photoUrl}
                                  alt="Citizen Grievance Evidence"
                                  className="w-full h-24 object-cover rounded-xl border border-amber-200 shadow-2xs"
                                />
                              </div>
                              {complaint.imageVerificationNote && (
                                <p className="text-[10px] text-amber-800 italic mt-2 leading-tight">
                                  🤖 {complaint.imageVerificationNote}
                                </p>
                              )}
                            </div>
                          )}

                          {/* 3. Resolution Photo (Only render if present) */}
                          {complaint.resolutionPhotoUrl && (
                            <div className="bg-emerald-50/60 p-2.5 rounded-2xl border border-emerald-200/90 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between gap-1 mb-1.5">
                                  <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-tight flex items-center gap-1">
                                    ✅ Remediated Proof
                                  </span>
                                  <span className="text-[9px] font-medium text-emerald-700 bg-emerald-200/60 px-1.5 py-0.5 rounded">
                                    Fix
                                  </span>
                                </div>
                                <img
                                  src={complaint.resolutionPhotoUrl}
                                  alt="Remediated Proof"
                                  className="w-full h-24 object-cover rounded-xl border border-emerald-200 shadow-2xs"
                                />
                              </div>
                              {complaint.resolutionVerificationNote ? (
                                <p className="text-[10px] text-emerald-800 italic mt-2 leading-tight">
                                  🤖 {complaint.resolutionVerificationNote}
                                </p>
                              ) : complaint.resolutionNote ? (
                                <p className="text-[10px] text-emerald-800 mt-2 leading-tight">
                                  {complaint.resolutionNote}
                                </p>
                              ) : null}
                            </div>
                          )}
                        </div>

                        {/* Standalone Resolution Note if resolved without photo */}
                        {complaint.status === 'RESOLVED' && complaint.resolutionNote && !complaint.resolutionPhotoUrl && (
                          <div className="mt-2.5 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs">
                            <span className="font-bold text-emerald-900">Remediation Note:</span>{' '}
                            <span className="text-emerald-800">{complaint.resolutionNote}</span>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mt-6">
                  <div className="text-xs text-gray-500">
                    Showing page <span className="font-bold text-gray-800">{page + 1}</span> of{' '}
                    <span className="font-bold text-gray-800">{totalPages}</span> ({totalElements} total complaints)
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchAllComplaints(page - 1)}
                      disabled={page === 0 || loading}
                      className="px-3.5 py-1.5 rounded-full border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                    >
                      ← Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i).map((pageNum) => (
                        <button
                          key={pageNum}
                          onClick={() => fetchAllComplaints(pageNum)}
                          className={`w-8 h-8 rounded-full text-xs font-bold transition cursor-pointer ${
                            page === pageNum
                              ? 'bg-[#7c5cff] text-white shadow-xs'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {pageNum + 1}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => fetchAllComplaints(page + 1)}
                      disabled={page >= totalPages - 1 || loading}
                      className="px-3.5 py-1.5 rounded-full border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            !loading && (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100 text-xs text-gray-400 space-y-2">
                <div className="text-3xl">📭</div>
                <p className="font-semibold text-gray-700 text-sm">No complaints found for this department scope</p>
                <p className="text-gray-400 max-w-sm mx-auto">
                  Try switching the Department selector above to "All Municipal Departments" or changing the status filter.
                </p>
              </div>
            )
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Universal Resolution Modal (Callable from both tabs) */}
      {/* ------------------------------------------------------------- */}
      {resolvingId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-lg p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">
                  Resolve Issue #{resolvingId}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Attach repair completion photo & operational resolution note
                </p>
              </div>
              <button
                onClick={handleCloseResolve}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Visual Context for Resolution Comparison */}
            {resolvingComplaint && (resolvingComplaint.areaReferencePhotoUrl || resolvingComplaint.photoData || resolvingComplaint.photoUrl) && (
              <div className="bg-gray-50/80 p-3 rounded-2xl border border-gray-100 my-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Verification Baseline & Grievance Context
                </p>
                <div className="flex items-start gap-3">
                  {resolvingComplaint.areaReferencePhotoUrl && (
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-slate-700 mb-1 truncate">
                        🏛️ Area Reference
                      </p>
                      <img
                        src={resolvingComplaint.areaReferencePhotoUrl}
                        alt="Area reference"
                        className="w-full h-20 object-cover rounded-xl border border-slate-200"
                        onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }}
                      />
                      <p className="text-[9px] text-slate-400 italic mt-1 leading-tight">
                        Area reference (context only, may not show exact defect)
                      </p>
                    </div>
                  )}
                  {(resolvingComplaint.photoData || resolvingComplaint.photoUrl) && (
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-amber-900 mb-1 truncate">
                        📸 Reported Grievance
                      </p>
                      <img
                        src={resolvingComplaint.photoData || resolvingComplaint.photoUrl}
                        alt="Reported Grievance"
                        className="w-full h-20 object-cover rounded-xl border border-amber-200"
                      />
                      <p className="text-[9px] text-amber-700 italic mt-1 leading-tight truncate">
                        Citizen Evidence
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

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
                  className="px-4 py-2 rounded-full text-xs font-semibold text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#7c5cff] hover:bg-[#6949f5] text-white text-xs font-semibold shadow-sm transition cursor-pointer"
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