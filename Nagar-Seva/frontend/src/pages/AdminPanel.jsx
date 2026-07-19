import React, { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';

export default function AdminPanel() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [resolvingId, setResolvingId] = useState(null);
  const [resolutionForm, setResolutionForm] = useState({
    resolutionPhotoUrl: '',
    resolutionNote: ''
  });

  useEffect(() => {
    fetchAllComplaints();
  }, []);

  const fetchAllComplaints = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/api/admin/complaints');
      setComplaints(response.data);
    } catch (err) {
      setError('Failed to load complaints. Please try again later.');
      console.error('Error:', err);
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
      alert('Please provide both resolution photo and note');
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <div className="bg-white rounded-lg shadow-md p-4">
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
      </div>

      {error && (
        <div className="bg-red-100 text-red-800 p-4 rounded-lg mb-8">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">Loading complaints...</p>
        </div>
      )}

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
                  <div className="grid md:grid-cols-6 gap-4 mb-3">
                    <div>
                      <p className="text-gray-600 text-xs font-semibold">ID</p>
                      <p className="text-lg font-bold">{complaint.id}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-xs font-semibold">Citizen</p>
                      <p className="font-semibold">{complaint.citizen?.name || complaint.citizen?.email || 'Unknown'}</p>
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
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${priority === 'HIGH' ? 'bg-red-100 text-red-800' : priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
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

                  {/* Resolve Button for OPEN/IN_PROGRESS complaints */}
                  {(complaint.status === 'OPEN' || complaint.status === 'IN_PROGRESS') && (
                    <button
                      onClick={() => handleOpenResolve(complaint)}
                      className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition"
                    >
                      Mark as Resolved
                    </button>
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

      {/* Resolve Modal */}
      {resolvingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Mark Complaint #{resolvingId} as Resolved</h2>
                <button
                  onClick={handleCloseResolve}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleResolveSubmit} className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-2">
                    Resolution Photo (Base64) *
                  </label>
                  <textarea
                    value={resolutionForm.resolutionPhotoUrl}
                    onChange={(e) => setResolutionForm(prev => ({ ...prev, resolutionPhotoUrl: e.target.value }))}
                    required
                    rows={4}
                    placeholder="Paste base64 encoded image here..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Paste a base64 encoded image (data:image/...;base64,...)</p>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-2">
                    Resolution Note *
                  </label>
                  <textarea
                    value={resolutionForm.resolutionNote}
                    onChange={(e) => setResolutionForm(prev => ({ ...prev, resolutionNote: e.target.value }))}
                    required
                    rows={3}
                    placeholder="Describe what was done to resolve this issue..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseResolve}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700"
                  >
                    Mark Resolved
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}