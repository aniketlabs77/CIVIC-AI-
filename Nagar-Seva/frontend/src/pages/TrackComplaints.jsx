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
      // Update complaint in list
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'OPEN':
        return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'RESOLVED':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  const stats = {
    total: complaints.length,
    open: complaints.filter(c => c.status === 'OPEN').length,
    inProgress: complaints.filter(c => c.status === 'IN_PROGRESS').length,
    resolved: complaints.filter(c => c.status === 'RESOLVED').length,
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Track Complaints</h1>

      {message && (
        <div className={`p-4 mb-6 rounded-lg ${message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message}
        </div>
      )}

      {/* Statistics */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
          <p className="text-gray-600">Total</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-3xl font-bold text-yellow-600">{stats.open}</div>
          <p className="text-gray-600">Open</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-3xl font-bold text-blue-500">{stats.inProgress}</div>
          <p className="text-gray-600">In Progress</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-3xl font-bold text-green-600">{stats.resolved}</div>
          <p className="text-gray-600">Resolved</p>
        </div>
      </div>

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
            <div className="space-y-6">
              {filteredComplaints.map((complaint) => (
                <div
                  key={complaint.id}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition p-6 border-l-4 border-blue-600"
                >
                  <div className="grid md:grid-cols-5 gap-4 mb-4">
                    <div>
                      <p className="text-gray-600 text-sm font-semibold">ID</p>
                      <p className="text-xl font-bold">{complaint.id}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm font-semibold">Category</p>
                      <p className="font-semibold">{complaint.category}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm font-semibold">Location</p>
                      <p className="font-semibold text-sm">{complaint.location}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm font-semibold">Created</p>
                      <p className="font-semibold text-sm">
                        {new Date(complaint.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm font-semibold">Status</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${getStatusColor(complaint.status)}`}>
                        {complaint.status}
                      </span>
                    </div>
                  </div>

                  {/* AI Routing Info */}
                  <div className="grid md:grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-gray-600 text-sm font-semibold mb-1">Routed Authority</p>
                      <p className="font-semibold text-blue-700">{complaint.routedAuthority || 'Not assigned'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm font-semibold mb-1">Priority</p>
                      {complaint.priority && (
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${getPriorityColor(complaint.priority)}`}>
                          {complaint.priority}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm font-semibold mb-1">Escalated</p>
                      <p className="font-semibold">{complaint.escalated ? '⚠️ Yes' : '✅ No'}</p>
                    </div>
                  </div>

                  {/* AI Summary */}
                  {complaint.aiSummary && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-gray-600 text-sm font-semibold mb-1">AI Summary</p>
                      <p className="text-gray-900 text-sm">{complaint.aiSummary}</p>
                    </div>
                  )}

                  <div className="mb-4">
                    <p className="text-gray-600 text-sm font-semibold mb-1">Description</p>
                    <p className="text-gray-900 line-clamp-2">{complaint.description}</p>
                  </div>

                  {complaint.photoData && (
                    <div className="mb-4">
                      <p className="text-gray-600 text-sm font-semibold mb-2">Photo</p>
                      <img
                        src={complaint.photoData}
                        alt={`Complaint ${complaint.id}`}
                        className="max-h-48 rounded-lg"
                      />
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <select
                      value={complaint.status}
                      onChange={(e) => handleStatusUpdate(complaint.id, e.target.value)}
                      disabled={updatingId === complaint.id}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-200"
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="RESOLVED">RESOLVED</option>
                    </select>
                    {updatingId === complaint.id && (
                      <span className="text-blue-600 text-sm font-semibold">Updating...</span>
                    )}
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