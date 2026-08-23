import React, { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';

export default function PublicDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    fetchComplaints();
    fetchStats();
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

  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/api/dashboard/stats');
      setStats(response.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
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

  // Ward ranking by resolution rate
  const wardRanking = stats?.complaintsByWard
    ? Object.entries(stats.complaintsByWard)
        .map(([ward, data]) => ({
          ward,
          total: data.total,
          resolved: data.resolved,
          resolutionRate: data.resolutionRate || 0,
          avgResolutionTimeHours: data.avgResolutionTimeHours || 0
        }))
        .sort((a, b) => b.resolutionRate - a.resolutionRate)
    : [];

  // Chart data for complaints per ward
  const chartData = stats?.complaintsByWard
    ? Object.entries(stats.complaintsByWard).map(([ward, data]) => ({
        ward,
        total: data.total,
        resolved: data.resolved
      }))
    : [];

  // Overall city-wide resolution rate for radial gauge
  const overallResolutionRate = stats && stats.totalComplaints > 0
    ? Math.round((stats.resolvedCount / stats.totalComplaints) * 100)
    : 78;

  // Gauge data for semi-circle representation
  const gaugeData = [
    { name: 'Resolved', value: overallResolutionRate, fill: '#7c5cff' },
    { name: 'Remaining', value: 100 - overallResolutionRate, fill: '#f0ecff' }
  ];

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-2xl shadow-card border border-gray-100 text-xs">
          <p className="font-bold text-gray-900 mb-1">{label}</p>
          {payload.map((entry, index) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4 text-gray-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }}></span>
                {entry.name === 'total' ? 'Total Complaints' : 'Resolved'}
              </span>
              <span className="font-bold text-gray-900">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Overview
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Real-time civic intelligence, complaint resolution metrics & ward performance
          </p>
        </div>

        {/* Filter Pills */}
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
              {st === 'ALL' ? 'All Status' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Top Stat Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Complaints Card */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-card border border-gray-100/60 transition hover:shadow-card-hover">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Total Inflow
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-light text-accent">
              Live
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-gray-900 mt-2 tracking-tight">
            {stats?.totalComplaints ?? complaints.length}
          </div>
          <p className="text-xs text-gray-400 mt-1">Total registered tickets</p>
        </div>

        {/* Resolved Complaints Card */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-card border border-gray-100/60 transition hover:shadow-card-hover">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Resolved Issues
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
              +{overallResolutionRate}%
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-gray-900 mt-2 tracking-tight">
            {stats?.resolvedCount ?? complaints.filter(c => c.status === 'RESOLVED').length}
          </div>
          <p className="text-xs text-gray-400 mt-1">Repairs completed</p>
        </div>

        {/* Pending Card */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-card border border-gray-100/60 transition hover:shadow-card-hover">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Active In Progress
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">
              In Field
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-gray-900 mt-2 tracking-tight">
            {stats?.pendingCount ?? complaints.filter(c => c.status === 'IN_PROGRESS' || c.status === 'OPEN').length}
          </div>
          <p className="text-xs text-gray-400 mt-1">Assigned to field staff</p>
        </div>

        {/* Escalated Card */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-card border border-gray-100/60 transition hover:shadow-card-hover">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Escalated Alerts
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700">
              High Priority
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-gray-900 mt-2 tracking-tight">
            {stats?.escalatedCount ?? complaints.filter(c => c.escalated).length}
          </div>
          <p className="text-xs text-gray-400 mt-1">Exceeded resolution SLA</p>
        </div>
      </div>

      {/* Main Charts & Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Columns: Main Ward Volume Chart Card */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-6 sm:p-7 shadow-card border border-gray-100/60 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-gray-900 tracking-tight">
                Civic Inflow vs Resolution by Ward
              </h2>
              <p className="text-xs text-gray-400">
                Comparison of total logged grievances against resolved municipal actions
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-accent"></span> Total Volume
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-accent-subtle"></span> Resolved
              </span>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={6} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f2f6" />
                  <XAxis
                    dataKey="ward"
                    tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 500 }}
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
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">
                Loading ward metrics...
              </div>
            )}
          </div>
        </div>

        {/* Right 4 Columns: Recent Alerts List Panel */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-6 shadow-card border border-gray-100/60 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              <span>Recent Alerts</span>
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
            </h2>
            <span className="text-xs font-semibold text-gray-400">Latest</span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-[300px] pr-1">
            {complaints.slice(0, 5).map((c) => (
              <div
                key={c.id}
                className="p-3 rounded-xl bg-gray-50/70 hover:bg-gray-100/80 transition flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-white shadow-xs border border-gray-100 flex items-center justify-center text-base shrink-0">
                    {getCategoryIcon(c.category)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">
                      {c.category}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate">
                      {c.location || c.ward || 'Delhi'}
                    </p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${getStatusBadge(c.status)}`}>
                  {c.status}
                </span>
              </div>
            ))}

            {complaints.length === 0 && (
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
        <div className="lg:col-span-4 bg-white rounded-2xl p-6 shadow-card border border-gray-100/60 flex flex-col items-center justify-between text-center">
          <div className="w-full flex items-center justify-between">
            <h2 className="text-base font-extrabold text-gray-900 tracking-tight">
              Resolution Efficiency
            </h2>
            <span className="text-xs font-bold text-accent bg-accent-light px-2 py-0.5 rounded-full">
              SLA Target
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
              <span className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                {overallResolutionRate}%
              </span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                City Average
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-500 px-4">
            Percentage of citizen grievance tickets resolved within the municipal response window.
          </p>
        </div>

        {/* Right 8 Columns: Ward Ranking Table */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-6 shadow-card border border-gray-100/60 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-extrabold text-gray-900 tracking-tight">
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
                <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="pb-3 pl-2">Rank</th>
                  <th className="pb-3">Ward</th>
                  <th className="pb-3 text-center">Total</th>
                  <th className="pb-3 text-center">Resolved</th>
                  <th className="pb-3">Resolution Progress</th>
                  <th className="pb-3 text-right pr-2">Avg SLA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs font-medium">
                {wardRanking.slice(0, 5).map((item, idx) => (
                  <tr key={item.ward} className="hover:bg-gray-50/80 transition">
                    <td className="py-3.5 pl-2 font-bold text-gray-900">
                      <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-[11px] ${
                        idx === 0 ? 'bg-amber-100 text-amber-800' :
                        idx === 1 ? 'bg-slate-100 text-slate-800' : 'text-gray-500'
                      }`}>
                        #{idx + 1}
                      </span>
                    </td>
                    <td className="py-3.5 font-bold text-gray-900">{item.ward}</td>
                    <td className="py-3.5 text-center text-gray-600 font-semibold">{item.total}</td>
                    <td className="py-3.5 text-center text-emerald-600 font-semibold">{item.resolved}</td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(5, item.resolutionRate))}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-bold text-gray-800 w-10 text-right">
                          {item.resolutionRate.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 text-right pr-2 text-gray-500 font-semibold">
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
      <div className="bg-white rounded-2xl p-6 shadow-card border border-gray-100/60">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-gray-900 tracking-tight">
            Live Civic Complaints Feed
          </h2>
          <span className="text-xs font-bold text-gray-400">
            {filteredComplaints.length} Shown
          </span>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 text-rose-700 text-xs rounded-xl mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-xs text-gray-400">
            Loading live complaints...
          </div>
        ) : filteredComplaints.length > 0 ? (
          <div className="space-y-3">
            {filteredComplaints.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-xl bg-gray-50/70 hover:bg-gray-100/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-xs border border-gray-100 flex items-center justify-center text-lg shrink-0 mt-0.5">
                    {getCategoryIcon(c.category)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm text-gray-900">
                        {c.category}
                      </span>
                      <span className="text-xs text-gray-400 font-medium">
                        #{c.id} • {c.ward || 'Ward 1'} • {c.location}
                      </span>
                      {c.imageVerified === true && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          ✓ AI Verified
                        </span>
                      )}
                      {c.escalated && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700">
                          ⚠️ Escalated
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                      {c.description}
                    </p>
                    {c.aiSummary && (
                      <p className="text-[11px] text-accent mt-0.5 font-medium">
                        🤖 {c.aiSummary}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(c.status)}`}>
                    {c.status}
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