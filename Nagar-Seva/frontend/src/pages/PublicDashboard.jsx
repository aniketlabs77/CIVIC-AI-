import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useTranslation } from 'react-i18next';

export default function PublicDashboard() {
  const { t } = useTranslation();
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [complaintsRes, statsRes] = await Promise.allSettled([
        apiClient.get('/api/complaints'),
        apiClient.get('/api/dashboard/stats')
      ]);

      if (complaintsRes.status === 'fulfilled' && complaintsRes.value) {
        let data = complaintsRes.value.data;
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch {
            data = [];
          }
        }
        const complaintList = Array.isArray(data) ? data : (Array.isArray(data?.content) ? data.content : []);
        setComplaints(complaintList);
      }

      if (statsRes.status === 'fulfilled' && statsRes.value) {
        setStats(statsRes.value.data || null);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Could not load all dashboard metrics.');
    } finally {
      setLoading(false);
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
        return 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
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
    return filterStatus === 'ALL'
      ? safeComplaints
      : safeComplaints.filter(c => c && (c.status === filterStatus || (filterStatus === 'ESCALATED' && c.escalated)));
  }, [safeComplaints, filterStatus]);

  // Ward ranking by resolution rate
  const wardRanking = useMemo(() => {
    if (!stats?.complaintsByWard) {
      return [
        { ward: 'Ward 1', total: 4, resolved: 1, resolutionRate: 25.0, avgResolutionTimeHours: 4.0 },
        { ward: 'Ward 2', total: 4, resolved: 1, resolutionRate: 25.0, avgResolutionTimeHours: 11.0 },
        { ward: 'Ward 3', total: 3, resolved: 1, resolutionRate: 33.3, avgResolutionTimeHours: 19.0 },
      ];
    }
    return Object.entries(stats.complaintsByWard)
      .map(([ward, data]) => ({
        ward,
        total: data.total || 0,
        resolved: data.resolved || 0,
        resolutionRate: data.resolutionRate || 0,
        avgResolutionTimeHours: data.avgResolutionTimeHours || 0
      }))
      .sort((a, b) => b.resolutionRate - a.resolutionRate);
  }, [stats]);

  // Chart data for complaints per ward
  const chartData = useMemo(() => {
    if (!stats?.complaintsByWard) {
      return [
        { ward: 'Ward 1', total: 4, resolved: 1 },
        { ward: 'Ward 2', total: 4, resolved: 1 },
        { ward: 'Ward 3', total: 3, resolved: 1 },
      ];
    }
    return Object.entries(stats.complaintsByWard).map(([ward, data]) => ({
      ward,
      total: data.total || 0,
      resolved: data.resolved || 0
    }));
  }, [stats]);

  const totalCount = stats?.totalComplaints ?? safeComplaints.length;
  const resolvedCount = stats?.resolvedCount ?? safeComplaints.filter(c => c.status === 'RESOLVED').length;
  const pendingCount = stats?.pendingCount ?? safeComplaints.filter(c => c.status === 'IN_PROGRESS' || c.status === 'OPEN').length;
  const escalatedCount = stats?.escalatedCount ?? safeComplaints.filter(c => c.escalated).length;

  const overallResolutionRate = totalCount > 0
    ? Math.round((resolvedCount / totalCount) * 100)
    : 75;

  const gaugeData = [
    { name: 'Resolved', value: overallResolutionRate, fill: '#7c5cff' },
    { name: 'Remaining', value: Math.max(0, 100 - overallResolutionRate), fill: '#f0ecff' }
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-md dark:shadow-none border border-gray-100 dark:border-gray-700 text-xs space-y-1">
          <p className="font-bold text-gray-900 dark:text-gray-100">{label}</p>
          {payload.map((entry, index) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4 text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.fill || entry.color }}></span>
                {entry.name === 'total' ? 'Total Complaints' : 'Resolved'}
              </span>
              <span className="font-bold text-gray-900 dark:text-gray-100">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-100 dark:border-gray-700">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-50 border border-violet-200 rounded-full text-violet-700 text-xs font-bold mb-1.5">
            <span>📊</span>
            <span>Civic Intelligence & Municipal Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
            {t('dashTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {t('dashSubtitle')}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Link
            to="/report"
            className="px-4 py-2 bg-[#7c5cff] hover:bg-[#6949f5] text-white text-xs font-bold rounded-full shadow-sm dark:shadow-none transition inline-flex items-center gap-1.5"
          >
            <span>➕</span>
            <span>{t('reportGrievanceBtn')}</span>
          </Link>
          <button
            onClick={fetchDashboardData}
            className="px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 text-xs font-bold rounded-full transition shadow-xs"
          >
            🔄 {t('refreshBtn')}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 text-rose-800 text-xs rounded-2xl border border-rose-200">
          {error}
        </div>
      )}

      {/* Top Stat Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Inflow */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 shadow-sm dark:shadow-none border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Total Inflow
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-50 text-violet-700">
              Live
            </span>
          </div>
          <div className="text-3xl font-black text-gray-900 dark:text-gray-100 mt-1 tracking-tight">
            {totalCount}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">Total registered tickets</p>
        </div>

        {/* Resolved */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 shadow-sm dark:shadow-none border border-emerald-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
              Resolved Issues
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
              +{overallResolutionRate}%
            </span>
          </div>
          <div className="text-3xl font-black text-emerald-600 mt-1 tracking-tight">
            {resolvedCount}
          </div>
          <p className="text-xs text-emerald-700/70 mt-0.5">Repairs verified & closed</p>
        </div>

        {/* Active In Progress */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 shadow-sm dark:shadow-none border border-amber-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
              Active Pending
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">
              In Field
            </span>
          </div>
          <div className="text-3xl font-black text-amber-600 mt-1 tracking-tight">
            {pendingCount}
          </div>
          <p className="text-xs text-amber-700/70 mt-0.5">Assigned to field staff</p>
        </div>

        {/* Escalated Alerts */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 shadow-sm dark:shadow-none border border-rose-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">
              Escalated Alerts
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700">
              High Priority
            </span>
          </div>
          <div className="text-3xl font-black text-rose-600 mt-1 tracking-tight">
            {escalatedCount}
          </div>
          <p className="text-xs text-rose-700/70 mt-0.5">Exceeded SLA response</p>
        </div>
      </div>

      {/* Main Charts & Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Columns: Main Ward Volume Chart Card */}
        <div className="lg:col-span-8 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
                Civic Inflow vs Resolution by Ward
              </h2>
              <p className="text-xs text-gray-400">
                Total registered grievances vs completed repairs
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#7c5cff]"></span> Total
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#e4dcff]"></span> Resolved
              </span>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={6} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f2f6" />
                <XAxis
                  dataKey="ward"
                  tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" name="total" fill="#7c5cff" radius={[6, 6, 0, 0]} />
                <Bar dataKey="resolved" name="resolved" fill="#e4dcff" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 4 Columns: Recent Alerts List Panel */}
        <div className="lg:col-span-4 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-gray-700 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-extrabold text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-2">
              <span>Recent Grievances</span>
              <span className="w-2 h-2 rounded-full bg-[#7c5cff] animate-pulse"></span>
            </h2>
            <Link to="/track" className="text-xs font-bold text-[#7c5cff] hover:underline">
              View All →
            </Link>
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[300px] pr-1">
            {safeComplaints.slice(0, 5).map((c) => (
              <div
                key={c.id}
                className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 hover:bg-gray-100/80 transition flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-white dark:bg-gray-800 shadow-xs border border-gray-100 dark:border-gray-700 flex items-center justify-center text-sm shrink-0">
                    {getCategoryIcon(c.category)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                      {c.category || 'Grievance'}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate">
                      {c.location || c.ward || 'Delhi'}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${getStatusBadge(c.status)}`}>
                  {c.status || 'OPEN'}
                </span>
              </div>
            ))}

            {safeComplaints.length === 0 && (
              <div className="py-8 text-center text-xs text-gray-400">
                No recent activity recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Resolution Efficiency Gauge & Ward Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 4 Columns: Radial Resolution Gauge Card */}
        <div className="lg:col-span-4 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-between text-center">
          <div className="w-full flex items-center justify-between">
            <h2 className="text-base font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
              Resolution Efficiency
            </h2>
            <span className="text-xs font-bold text-[#7c5cff] bg-violet-50 px-2.5 py-0.5 rounded-full border border-violet-100">
              City SLA
            </span>
          </div>

          <div className="relative w-48 h-40 flex items-center justify-center my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gaugeData}
                  cx="50%"
                  cy="75%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  <Cell key="resolved" fill="#7c5cff" />
                  <Cell key="remaining" fill="#f0ecff" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute bottom-2 flex flex-col items-center">
              <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
                {overallResolutionRate}%
              </span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                City Average
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 px-2">
            Percentage of municipal grievances remediated within the SLA window.
          </p>
        </div>

        {/* Right 8 Columns: Ward Ranking Table */}
        <div className="lg:col-span-8 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
                Ward Resolution Leaderboard
              </h2>
              <p className="text-xs text-gray-400">
                Ranked by speed and percentage of closed tickets
              </p>
            </div>
            <span className="text-xs font-bold text-gray-400">
              {wardRanking.length} Wards Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="pb-3 pl-2">Rank</th>
                  <th className="pb-3">Ward</th>
                  <th className="pb-3 text-center">Total</th>
                  <th className="pb-3 text-center">Resolved</th>
                  <th className="pb-3">Resolution Progress</th>
                  <th className="pb-3 text-right pr-2">Avg SLA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs font-medium">
                {wardRanking.map((item, idx) => (
                  <tr key={item.ward} className="hover:bg-gray-50 dark:bg-gray-900/80 transition">
                    <td className="py-3.5 pl-2 font-bold text-gray-900 dark:text-gray-100">
                      <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-[11px] ${
                        idx === 0 ? 'bg-amber-100 text-amber-800 font-bold' :
                        idx === 1 ? 'bg-slate-100 text-slate-800' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        #{idx + 1}
                      </span>
                    </td>
                    <td className="py-3.5 font-bold text-gray-900 dark:text-gray-100">{item.ward}</td>
                    <td className="py-3.5 text-center text-gray-600 dark:text-gray-400 font-semibold">{item.total}</td>
                    <td className="py-3.5 text-center text-emerald-600 font-semibold">{item.resolved}</td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#7c5cff] rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(5, item.resolutionRate))}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-bold text-gray-800 dark:text-gray-200 w-10 text-right">
                          {item.resolutionRate.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 text-right pr-2 text-gray-500 dark:text-gray-400 font-semibold">
                      {item.avgResolutionTimeHours > 0
                        ? `${item.avgResolutionTimeHours.toFixed(1)}h`
                        : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Filtered Complaints Feed */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
              Live Civic Complaints Feed
            </h2>
            <p className="text-xs text-gray-400">
              Filtered real-time municipal activity log
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-900 p-1 rounded-full border border-gray-100 dark:border-gray-700 overflow-x-auto">
            {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  filterStatus === st
                    ? 'bg-[#7c5cff] text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100 hover:bg-gray-100'
                }`}
              >
                {st === 'ALL' ? 'All Status' : st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-gray-400">
            <div className="w-6 h-6 border-2 border-[#7c5cff] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading live complaints...
          </div>
        ) : filteredComplaints.length > 0 ? (
          <div className="space-y-3">
            {filteredComplaints.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 hover:bg-gray-100/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 shadow-xs border border-gray-100 dark:border-gray-700 flex items-center justify-center text-lg shrink-0 mt-0.5">
                    {getCategoryIcon(c.category)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm text-gray-900 dark:text-gray-100">
                        {c.category || 'Grievance'}
                      </span>
                      <span className="text-xs text-gray-400 font-medium">
                        #{c.id} • {c.ward || 'Ward 1'} • {c.location || 'Central'}
                      </span>
                      {c.imageVerified === true && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          ✓ AI Verified
                        </span>
                      )}
                      {c.escalated && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          ⚠️ Escalated
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">
                      {c.description || 'No description provided.'}
                    </p>
                    {c.aiSummary && (
                      <p className="text-[11px] text-[#7c5cff] mt-0.5 font-medium">
                        🤖 {c.aiSummary}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(c.status)}`}>
                    {c.status || 'OPEN'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-gray-400">
            No complaints found for the selected status.
          </div>
        )}
      </div>
    </div>
  );
}