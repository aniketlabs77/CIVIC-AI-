import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import apiClient from '../api/apiClient';

export default function ReportIssue() {
  const location = useLocation();
  const [formData, setFormData] = useState({
    category: location.state?.prefillCategory || '',
    description: location.state?.prefillDescription || '',
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

  useEffect(() => {
    if (location.state?.prefillCategory || location.state?.prefillDescription) {
      setFormData(prev => ({
        ...prev,
        category: location.state.prefillCategory || prev.category,
        description: location.state.prefillDescription || prev.description,
      }));
    }
  }, [location.state]);

  const categories = [
    { label: 'Streetlight', icon: '💡' },
    { label: 'Road Damage', icon: '🛣️' },
    { label: 'Drainage', icon: '🚰' },
    { label: 'Illegal Dumping', icon: '🗑️' },
    { label: 'Unsafe Area', icon: '🛡️' },
    { label: 'Encroachment', icon: '🚧' },
  ];

  const wards = [
    'Ward 1', 'Ward 2', 'Ward 3', 'Ward 4', 'Ward 5',
    'Ward 6', 'Ward 7', 'Ward 8', 'Ward 9', 'Ward 10'
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
      if (!file.type.startsWith('image/')) {
        setMessage('❌ Please select a valid image file.');
        return;
      }

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
        setMessage('✅ Coordinates captured via GPS!');
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

      if (formData.photoData) {
        complaintData.photoData = formData.photoData;
      }

      const response = await apiClient.post('/api/complaints', complaintData);
      setMessage(`✅ Complaint registered successfully! Ticket #${response.data.id}`);

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
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
          Report Civic Grievance
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Submit photos & details for automatic Gemini AI routing and prompt municipal action
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl text-xs font-semibold shadow-xs ${
          message.includes('✅') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {message}
        </div>
      )}

      {/* Main Card Form */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-card border border-gray-100/80">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category Select Pills */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              Select Problem Category *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.label}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, category: cat.label }))}
                  className={`p-3 rounded-2xl text-xs font-bold transition flex items-center gap-2 border ${
                    formData.category === cat.label
                      ? 'bg-accent-light border-accent text-accent shadow-xs'
                      : 'bg-gray-50/80 border-gray-100 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-base">{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Issue Description *
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              required
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the issue clearly (e.g. Broken streetlight pole outside building 4A, pitch dark at night)..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs sm:text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Location & Ward Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="location" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Location / Landmark *
              </label>
              <input
                id="location"
                name="location"
                type="text"
                required
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g. Near Metro Pillar 42, Karol Bagh"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label htmlFor="ward" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Municipal Ward *
              </label>
              <select
                id="ward"
                name="ward"
                value={formData.ward}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {wards.map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>
          </div>

          {/* GPS Coordinates Section */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                GPS Geolocation Coordinates *
              </label>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={geoLoading}
                className="px-3 py-1 bg-accent-light text-accent rounded-full text-xs font-bold hover:bg-accent-subtle transition flex items-center gap-1"
              >
                <span>📍</span>
                <span>{geoLoading ? 'Fetching GPS...' : 'Use My GPS Location'}</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                step="0.000001"
                required
                name="latitude"
                value={formData.latitude}
                onChange={handleChange}
                placeholder="Latitude (e.g. 28.6139)"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <input
                type="number"
                step="0.000001"
                required
                name="longitude"
                value={formData.longitude}
                onChange={handleChange}
                placeholder="Longitude (e.g. 77.2090)"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          {/* Grievance Photo Evidence */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Grievance Photo Proof (For AI Verification)
            </label>
            <div className="p-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl text-center hover:bg-gray-100/80 transition cursor-pointer"
                 onClick={() => fileInputRef.current?.click()}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
              {photoPreview ? (
                <div className="flex flex-col items-center">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="max-h-48 rounded-xl object-contain shadow-xs mb-2"
                  />
                  <p className="text-xs font-bold text-accent">Click to choose a different photo</p>
                </div>
              ) : (
                <div className="py-4">
                  <span className="text-2xl mb-1 block">📷</span>
                  <p className="text-xs font-bold text-gray-700">Click to upload photo evidence</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Supports PNG, JPG, JPEG up to 5MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-full bg-dark hover:bg-dark-hover text-white text-sm font-bold shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing AI Verification & Submitting...</span>
                </>
              ) : (
                <span>Submit Grievance to Municipality</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}