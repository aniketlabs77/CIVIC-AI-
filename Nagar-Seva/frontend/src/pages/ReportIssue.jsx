import React, { useState, useRef } from 'react';
import apiClient from '../api/apiClient';

export default function ReportIssue() {
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    location: '',
    ward: 'Ward 1',
    latitude: '',
    longitude: '',
    photoData: '',
  });
  const [photoPreview, setPhotoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef(null);

  const categories = [
    'Streetlight',
    'Drainage',
    'Road Damage',
    'Illegal Dumping',
    'Unsafe Area',
    'Encroachment',
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file is an image
      if (!file.type.startsWith('image/')) {
        setMessage('❌ Please select a valid image file.');
        return;
      }

      // Read file as base64
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target.result;
        setPhotoPreview(base64String);
        setFormData(prev => ({
          ...prev,
          photoData: base64String,
        }));
        setMessage('');
      };
      reader.onerror = () => {
        setMessage('❌ Error reading photo file.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage('❌ Geolocation is not supported by your browser.');
      return;
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setFormData(prev => ({
          ...prev,
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6),
        }));
        setMessage('✅ Location fetched successfully!');
        setGeoLoading(false);
      },
      (error) => {
        setMessage(`❌ Error fetching location: ${error.message}`);
        setGeoLoading(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Validate required fields
      if (!formData.category || !formData.description || !formData.location || !formData.ward || !formData.latitude || !formData.longitude) {
        setMessage('❌ Please fill in all required fields.');
        setLoading(false);
        return;
      }

      const complaintData = {
        category: formData.category,
        description: formData.description,
        location: formData.location,
        ward: formData.ward,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
      };

      // Add photoData if provided
      if (formData.photoData) {
        complaintData.photoData = formData.photoData;
      }

      const response = await apiClient.post('/api/complaints', complaintData);
      setMessage(`✅ Complaint submitted successfully! ID: ${response.data.id}`);

      // Reset form
      setFormData({
        category: '',
        description: '',
        location: '',
        ward: 'Ward 1',
        latitude: '',
        longitude: '',
        photoData: '',
      });
      setPhotoPreview('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      if (error.response && error.response.data) {
        // Show validation errors from backend
        const errors = error.response.data;
        if (typeof errors === 'object') {
          const errorMessages = Object.values(errors).join(', ');
          setMessage(`❌ ${errorMessages}`);
        } else {
          setMessage('❌ Error submitting complaint. Please try again.');
        }
      } else {
        setMessage('❌ Error submitting complaint. Please try again.');
      }
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Report an Issue</h1>

      {message && (
        <div className={`p-4 mb-6 rounded-lg ${message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8">
        <div className="mb-6">
          <label className="block text-gray-700 font-bold mb-2">
            Category *
          </label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a category</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 font-bold mb-2">
            Description *
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            rows="5"
            placeholder="Describe the issue in detail..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 font-bold mb-2">
            Location *
          </label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            required
            placeholder="e.g., Main Street, City Center"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 font-bold mb-2">
            Ward *
          </label>
          <input
            type="text"
            name="ward"
            value={formData.ward}
            onChange={handleChange}
            required
            placeholder="e.g., Ward 1"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-gray-700 font-bold mb-2">
              Latitude *
            </label>
            <input
              type="number"
              name="latitude"
              value={formData.latitude}
              onChange={handleChange}
              required
              step="0.0001"
              placeholder="e.g., 28.6139"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">
              Longitude *
            </label>
            <input
              type="number"
              name="longitude"
              value={formData.longitude}
              onChange={handleChange}
              required
              step="0.0001"
              placeholder="e.g., 77.2090"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mb-6">
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={geoLoading || loading}
            className="w-full bg-green-600 text-white font-bold py-2 rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 mb-4"
          >
            {geoLoading ? 'Fetching Location...' : '📍 Use My Current Location'}
          </button>
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 font-bold mb-2">
            Upload Photo (Optional)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {photoPreview && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">Photo Preview:</p>
              <img
                src={photoPreview}
                alt="Preview"
                className="max-w-full h-auto max-h-64 rounded-lg"
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
        >
          {loading ? 'Submitting...' : 'Submit Complaint'}
        </button>
      </form>
    </div>
  );
}