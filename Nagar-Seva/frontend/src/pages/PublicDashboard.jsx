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
  Cell
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'OPEN':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'RESOLVED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'ESCALATED':
        return 'bg-red-200 text-red-900 border-red-300 font-bold';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
          resolutionRate: data.resolutionRate,
          avgResolutionTimeHours: data.avgResolutionTimeHours
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

  // Color palette for chart bars
  const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Public Dashboard</h1>

      {/* Summary Cards */}
      {stats && (
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-600">
            <div className="text-3xl font-bold text-blue-600">{stats.totalComplaints}</div>
            <p className="text-gray-600">Total Complaints</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-600">
            <div className="text-3xl font-bold text-green-600">{stats.resolvedCount}</div>
            <p className="text-gray-600">Resolved</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-600">
            <div className="text-3xl font-bold text-yellow-600">{stats.pendingCount}</div>
            <p className="text-gray-600">Pending</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-600">
            <div className="text-3xl font-bold text-red-600">{stats.escalatedCount}</div>
            <p className="text-gray-600">Escalated</p>
          </div>
        </div>
      )}

      {/* Charts Section */}
      {(stats?.complaintsByWard || stats?.complaintsByCategory) && (
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Bar Chart: Complaints per Ward */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Complaints per Ward</h2>
            {chartData.length > 0 && (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="ward" type="category" width={80} />
                  <Tooltip
                    formatter={(value, name) => [
                      value,
                      name === 'total' ? 'Total Complaints' : 'Resolved'
                    ]}
                  />
                  <Bar dataKey="total" name="Total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
            {chartData.length === 0 && (
              <div className="text-center py-8 text-gray-500">No ward data available</div>
            )}
          </div>

          {/* Bar Chart: Complaints by Category */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Complaints by Category</h2>
            {stats?.complaintsByCategory && Object.keys(stats.complaintsByCategory).length > 0 && (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={Object.entries(stats.complaintsByCategory).map(([category, count], i) => ({
                    category,
                    count,
                    color: CHART_COLORS[i % CHART_COLORS.length]
                  }))}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="category" type="category" width={120} />
                  <Tooltip formatter={(value) => [value, 'Complaints']} />
                  <Bar
                    dataKey="count"
                    name="Count"
                    radius={[0, 4, 4, 0]}
                  >
                    {Object.entries(stats.complaintsByCategory).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            {!stats?.complaintsByCategory && (
              <div className="text-center py-8 text-gray-500">No category data available</div>
            )}
          </div>
        </div>
      )}

      {/* Ward Ranking Table */}
      {wardRanking.length > 0 && (
        <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold">Ward Resolution Rate Ranking</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ward</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resolved</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resolution Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Resolution Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {wardRanking.map((item, index) => (
                  <tr key={item.ward} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">#{index + 1}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.ward}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.total}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.resolved}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              item.resolutionRate >= 80 ? 'bg-green-500' :
                              item.resolutionRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${item.resolutionRate}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {item.resolutionRate.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.avgResolutionTimeHours > 0
                        ? `${item.avgResolutionTimeHours.toFixed(1)} hrs`
                        : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <label className="block text-gray-700 font-bold mb-2">
          Filter by Status
        </label>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full md:w-48 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Complaints</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="ESCALATED">Escalated</option>
        </select>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 text-red-800 p-4 rounded-lg mb-8">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">Loading complaints...</p>
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
                  className={`bg-white rounded-lg shadow-md hover:shadow-lg transition p-4 border-l-4 ${
                    complaint.status === 'OPEN' ? 'border-red-500' :
                    complaint.status === 'IN_PROGRESS' ? 'border-yellow-500' :
                    complaint.status === 'RESOLVED' ? 'border-green-500' : 'border-red-600'
                  }`}
                >
                  <div className="grid md:grid-cols-5 gap-4 mb-3">
                    <div>
                      <p className="text-gray-600 text-xs font-semibold">ID</p>
                      <p className="text-lg font-bold">{complaint.id}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-xs font-semibold">Category</p>
                      <p className="font-semibold">{complaint.category}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-xs font-semibold">Ward</p>
                      <p className="font-semibold">{complaint.ward || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-xs font-semibold">Location</p>
                      <p className="font-semibold text-sm">{complaint.location}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-xs font-semibold">Status</p>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(complaint.status)}`}>
                        {complaint.status}
                      </span>
                    </div>
                  </div>

                  {/* AI Routing Info Row */}
                  <div className="grid md:grid-cols-4 gap-4 mb-3 p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-gray-600 text-xs font-semibold mb-1">Routed Authority</p>
                      <p className="text-sm font-semibold text-blue-700">{complaint.routedAuthority || 'Not assigned'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-xs font-semibold mb-1">Priority</p>
                      {complaint.priority && (
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${getPriorityColor(complaint.priority)}`}>
                          {complaint.priority}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-gray-600 text-xs font-semibold mb-1">Escalated</p>
                      <p className="text-sm">{complaint.escalated ? '⚠️ Yes' : '✅ No'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-xs font-semibold mb-1">Created</p>
                      <p className="text-sm">{new Date(complaint.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* AI Summary */}
                  {complaint.aiSummary && (
                    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-gray-600 text-xs font-semibold mb-1">AI Summary</p>
                      <p className="text-gray-900 text-sm">{complaint.aiSummary}</p>
                    </div>
                  )}

                  <div className="mb-3">
                    <p className="text-gray-600 text-xs font-semibold mb-1">Description</p>
                    <p className="text-gray-900 line-clamp-2">{complaint.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-100 rounded-lg p-8 text-center">
              <p className="text-gray-600">No complaints found for the selected filter.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}