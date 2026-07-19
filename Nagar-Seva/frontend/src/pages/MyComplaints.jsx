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
      const response = await apiClient.get('/api/complaints/my');
      setComplaints(response.data);
    } catch (err) {
      setError('Failed to load your complaints. Please try again later.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
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

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">My Complaints</h1>

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
          <p className="text-gray-600 text-lg">Loading your complaints...</p>
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

                  {/* Resolution Details */}
                  {complaint.status === 'RESOLVED' && (complaint.resolutionPhotoUrl || complaint.resolutionNote) && (
                    <div className="mb-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-gray-600 text-xs font-semibold mb-2 flex items-center gap-1">
                        <span className="text-green-600">✓</span> Resolution Details
                      </p>
                      
                      {complaint.resolutionPhotoUrl && (
                        <div className="mb-2">
                          <p className="text-gray-600 text-xs font-semibold mb-1">Resolution Photo</p>
                          <img
                            src={complaint.resolutionPhotoUrl}
                            alt="Resolution"
                            className="max-h-48 rounded-lg border"
                          />
                        </div>
                      )}
                      
                      {complaint.resolutionNote && (
                        <div>
                          <p className="text-gray-600 text-xs font-semibold mb-1">Resolution Note</p>
                          <p className="text-gray-900 text-sm">{complaint.resolutionNote}</p>
                        </div>
                      )}
                      
                      {complaint.resolvedAt && (
                        <p className="text-xs text-gray-500 mt-2">
                          Resolved on: {new Date(complaint.resolvedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
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

