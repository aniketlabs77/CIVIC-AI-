import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import apiClient from '../api/apiClient';

// Fix for Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const reportPinIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [28, 46],
  iconAnchor: [14, 46],
  popupAnchor: [1, -40],
  shadowSize: [41, 41]
});

// Common landmarks for instant offline lookup
const COMMON_LANDMARKS = [
  { name: 'G.L. Bajaj Institute of Technology and Management', subtitle: 'Knowledge Park II, Greater Noida', lat: 28.4727, lng: 77.4895, ward: 'Ward 3', aliases: ['gl bajaj', 'g.l. bajaj', 'knowledge park'] },
  { name: 'Krishna City', subtitle: 'Lal Kuan, GT Road, Ghaziabad', lat: 28.6322, lng: 77.4642, ward: 'Ward 2', aliases: ['krishna city', 'krishna city lal kuan'] },
  { name: 'Sanjay Nagar', subtitle: 'Sector 23, Ghaziabad', lat: 28.6948, lng: 77.4475, ward: 'Ward 1', aliases: ['sanjay nagar', 'sector 23'] },
  { name: 'Lal Kuan Chauraha', subtitle: 'GT Road / NH-91, Ghaziabad', lat: 28.6366, lng: 77.4582, ward: 'Ward 2', aliases: ['lal kuan', 'lalkuan'] },
  { name: 'ABES Engineering College', subtitle: 'NH-24 Bypass, Ghaziabad', lat: 28.6347, lng: 77.4468, ward: 'Ward 2', aliases: ['abes', 'abes ec'] },
  { name: 'Crossings Republik', subtitle: 'NH-24, Ghaziabad', lat: 28.6258, lng: 77.4428, ward: 'Ward 2', aliases: ['crossings'] },
  { name: 'Indirapuram', subtitle: 'Shipra Mall, Ghaziabad', lat: 28.6369, lng: 77.3697, ward: 'Ward 1', aliases: ['indirapuram'] },
  { name: 'Connaught Place', subtitle: 'Rajiv Chowk, Central Delhi', lat: 28.6315, lng: 77.2167, ward: 'Ward 2' },
  { name: 'Civil Lines', subtitle: 'North Delhi Zone', lat: 28.6814, lng: 77.2228, ward: 'Ward 1' },
  { name: 'Lajpat Nagar', subtitle: 'South Delhi Zone', lat: 28.5677, lng: 77.2433, ward: 'Ward 3' },
  { name: 'Karol Bagh', subtitle: 'Central-West Delhi', lat: 28.6514, lng: 77.1907, ward: 'Ward 2' },
  { name: 'Sector 62 Noida', subtitle: 'Electronic City, Noida', lat: 28.6280, lng: 77.3649, ward: 'Ward 2' }
];

// Helper to determine ward from latitude
function deduceWard(lat, lng) {
  if (!lat) return 'Ward 1';
  if (lat > 28.66) return 'Ward 1'; // North
  if (lat < 28.58) return 'Ward 3'; // South
  return 'Ward 2'; // Central
}

// Sub-component: Click listener on Map to place/move pin
function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Sub-component: Map View Updater when coordinates change
function MapCenterUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, 15, { duration: 1.2 });
    }
  }, [center, map]);
  return null;
}

export default function ReportIssue() {
  const location = useLocation();
  const [formData, setFormData] = useState({
    category: location.state?.prefillCategory || '',
    description: location.state?.prefillDescription || '',
    location: '',
    ward: 'Ward 1',
    latitude: 28.6139,
    longitude: 77.2090,
    photoData: '',
  });

  const [mapCenter, setMapCenter] = useState([28.6139, 77.2090]);
  const [photoPreview, setPhotoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [aiRefining, setAiRefining] = useState(false);
  const [aiRefinedSuccess, setAiRefinedSuccess] = useState(false);
  const [message, setMessage] = useState('');
  const [submittedTicket, setSubmittedTicket] = useState(null);

  // Search & Autocomplete
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef(null);
  const debounceTimerRef = useRef(null);
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

  // Click outside to close landmark suggestions
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Reverse geocoding via OpenStreetMap Nominatim
  const reverseGeocode = async (lat, lng) => {
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        { headers: { 'User-Agent': 'NagarSeva-App/1.0' } }
      );
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.display_name) {
          const parts = data.display_name.split(',');
          const conciseName = parts.slice(0, 3).join(',').trim();
          return conciseName;
        }
      }
    } catch (e) {
      console.warn('Reverse geocoding error:', e);
    }
    return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  };

  // Handle map click or pin relocation
  const handleLocationPick = async (lat, lng) => {
    const ward = deduceWard(lat, lng);
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      ward: ward
    }));
    setMapCenter([lat, lng]);

    // Reverse geocode to fill human address
    const placeName = await reverseGeocode(lat, lng);
    setFormData(prev => ({
      ...prev,
      location: placeName
    }));
    setSearchQuery(placeName);
  };

  // Handle landmark autocomplete typing + live geocoding search
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    setFormData(prev => ({ ...prev, location: val }));

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (val.trim().length > 0) {
      const q = val.toLowerCase();
      const localMatches = COMMON_LANDMARKS.filter(lm => 
        lm.name.toLowerCase().includes(q) ||
        (lm.subtitle && lm.subtitle.toLowerCase().includes(q)) ||
        (lm.aliases && lm.aliases.some(a => a.includes(q)))
      );
      setSuggestions(localMatches);
      setShowSuggestions(true);

      // Debounced live geocoding fetch for any address/city
      debounceTimerRef.current = setTimeout(async () => {
        try {
          setSearchLoading(true);
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=6&addressdetails=1&countrycodes=in`,
            { headers: { 'User-Agent': 'NagarSeva-App/1.0' } }
          );
          if (resp.ok) {
            const data = await resp.json();
            if (data && data.length > 0) {
              const remoteMatches = data.map(item => {
                const parts = item.display_name.split(',');
                const title = parts[0];
                const subtitle = parts.slice(1, 4).join(',').trim();
                const lat = parseFloat(item.lat);
                const lng = parseFloat(item.lon);
                return {
                  name: title,
                  subtitle: subtitle || item.display_name,
                  lat: lat,
                  lng: lng,
                  ward: deduceWard(lat, lng)
                };
              });

              // Combine unique matches
              setSuggestions(prev => {
                const combined = [...localMatches];
                remoteMatches.forEach(rm => {
                  if (!combined.some(c => Math.abs(c.lat - rm.lat) < 0.001 && Math.abs(c.lng - rm.lng) < 0.001)) {
                    combined.push(rm);
                  }
                });
                return combined.slice(0, 8);
              });
              setShowSuggestions(true);
            }
          }
        } catch (e) {
          console.warn('Geocoding search error:', e);
        } finally {
          setSearchLoading(false);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectLandmark = (lm) => {
    const fullLoc = lm.name + (lm.subtitle ? `, ${lm.subtitle}` : '');
    setFormData(prev => ({
      ...prev,
      location: fullLoc,
      ward: lm.ward || deduceWard(lm.lat, lm.lng),
      latitude: lm.lat,
      longitude: lm.lng
    }));
    setSearchQuery(lm.name);
    setMapCenter([lm.lat, lm.lng]);
    setShowSuggestions(false);
  };

  // GPS Current Location button
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage('❌ Geolocation is not supported by your browser.');
      return;
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        await handleLocationPick(latitude, longitude);
        setMessage('✅ Pin placed at your current location!');
        setGeoLoading(false);
      },
      (error) => {
        setMessage(`❌ Error fetching GPS location: ${error.message}`);
        setGeoLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Gemini AI Refine Grievance Assistant
  const handleAiRefine = async () => {
    const currentText = formData.description.trim();
    if (!currentText) {
      setMessage('💡 Please type a few words about the issue first, then click AI Assist!');
      return;
    }

    setAiRefining(true);
    setMessage('');

    try {
      const response = await apiClient.post('/api/ai/refine-grievance', {
        input: currentText,
        category: formData.category
      });

      if (response.data) {
        const { category, refinedDescription, suggestedWard } = response.data;
        setFormData(prev => ({
          ...prev,
          description: refinedDescription || prev.description,
          category: category || prev.category,
          ward: prev.ward || suggestedWard || 'Ward 1'
        }));
        setAiRefinedSuccess(true);
        setTimeout(() => setAiRefinedSuccess(false), 5000);
      }
    } catch (err) {
      console.error('AI refinement error:', err);
      setMessage('⚠️ Gemini AI is currently busy. You can continue writing manually.');
    } finally {
      setAiRefining(false);
    }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setSubmittedTicket(null);

    try {
      if (!formData.category || !formData.description || !formData.location || !formData.ward) {
        setMessage('❌ Please fill in all required fields and select a location on the map.');
        setLoading(false);
        return;
      }

      const complaintData = {
        category: formData.category,
        description: formData.description,
        location: formData.location,
        ward: formData.ward,
        latitude: parseFloat(formData.latitude) || 28.6139,
        longitude: parseFloat(formData.longitude) || 77.2090,
      };

      if (formData.photoData) {
        complaintData.photoData = formData.photoData;
      }

      const response = await apiClient.post('/api/complaints', complaintData);
      setSubmittedTicket(response.data);
      setMessage(`✅ Grievance registered successfully! Ticket #${response.data.id}`);

      // Reset form
      setFormData({
        category: '',
        description: '',
        location: '',
        ward: 'Ward 1',
        latitude: 28.6139,
        longitude: 77.2090,
        photoData: '',
      });
      setSearchQuery('');
      setPhotoPreview('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Submission error:', error);
      if (error.response && error.response.data) {
        const errors = error.response.data;
        if (typeof errors === 'object') {
          const errorMessages = Object.values(errors).join(', ');
          setMessage(`❌ ${errorMessages}`);
        } else {
          setMessage('❌ Error submitting complaint. Please check the fields and try again.');
        }
      } else {
        setMessage('❌ Could not connect to backend. Please ensure the backend server is running on port 8080.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-50 border border-violet-200 rounded-full text-violet-700 text-xs font-bold mb-2">
          <span>✨</span>
          <span>Powered by Gemini AI Vision & Smart Geocoding</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
          Report Civic Grievance
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-xl mx-auto">
          Pin the exact issue location on the map, use Gemini AI to polish your complaint, and get prompt municipal action.
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl text-xs font-semibold shadow-xs ${
          message.includes('✅') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {message}
        </div>
      )}

      {/* Success Ticket Card */}
      {submittedTicket && (
        <div className="bg-emerald-50/90 border-2 border-emerald-200 rounded-3xl p-6 shadow-sm animate-fade-in text-emerald-950">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="px-2.5 py-0.5 bg-emerald-200 text-emerald-900 rounded-full text-[11px] font-extrabold uppercase tracking-wide">
                Ticket Registered #{submittedTicket.id}
              </span>
              <h3 className="text-base font-bold text-emerald-900 pt-1">
                {submittedTicket.category} Grievance Assigned
              </h3>
              <p className="text-xs text-emerald-800">
                Routed to: <strong>{submittedTicket.routedAuthority || 'Municipal Department'}</strong> • {submittedTicket.ward}
              </p>
            </div>
            <div className="text-2xl">🎉</div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-emerald-200/80 flex flex-wrap items-center gap-3">
            <Link
              to="/my-complaints"
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              View in My Complaints 📋
            </Link>
            <Link
              to="/track"
              className="px-4 py-2 bg-white hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-300 transition"
            >
              Track on Public Registry 🔍
            </Link>
          </div>
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
                      ? 'bg-violet-50 border-violet-500 text-violet-700 shadow-xs'
                      : 'bg-gray-50/80 border-gray-100 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-base">{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Description + Gemini AI Assistant Button */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="description" className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                Issue Description *
              </label>

              <button
                type="button"
                onClick={handleAiRefine}
                disabled={aiRefining}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-full text-[11px] font-bold shadow-xs transition disabled:opacity-50"
              >
                {aiRefining ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Gemini AI Refining...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>AI Assist / Refine Draft</span>
                  </>
                )}
              </button>
            </div>

            <textarea
              id="description"
              name="description"
              rows={4}
              required
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the issue in your own words (or write a quick summary and click 'AI Assist' to automatically format it for municipal officers)..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs sm:text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
            />

            {aiRefinedSuccess && (
              <p className="text-[11px] font-bold text-violet-700 mt-1 flex items-center gap-1 animate-fade-in">
                <span>✨</span>
                <span>Gemini AI refined your complaint and updated the category for maximum municipal clarity!</span>
              </p>
            )}
          </div>

          {/* Location & Map Pin Picker Section (No Raw Lat/Long inputs) */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Pin Grievance Location on Map *
                </label>
                <p className="text-[11px] text-gray-400">
                  Click anywhere on the map or type an address below to drop the pin
                </p>
              </div>

              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={geoLoading}
                className="self-start sm:self-auto px-3.5 py-1.5 bg-violet-100 text-violet-800 hover:bg-violet-200 rounded-full text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <span>📍</span>
                <span>{geoLoading ? 'Acquiring GPS...' : 'Use My GPS Location'}</span>
              </button>
            </div>

            {/* Address Search & Autocomplete */}
            <div className="relative" ref={searchContainerRef}>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    {searchLoading ? '⏳' : '🔍'}
                  </span>
                  <input
                    type="text"
                    required
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                    placeholder="Search place, landmark, or street (e.g., G.L. Bajaj, Krishna City, Connaught Place, Sector 15)..."
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => { setSearchQuery(''); setFormData(p => ({ ...p, location: '' })); setSuggestions([]); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="w-36">
                  <select
                    name="ward"
                    value={formData.ward}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    {wards.map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Autocomplete Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-[1000] left-0 right-0 mt-1 bg-white rounded-2xl shadow-xl border border-gray-100 max-h-56 overflow-y-auto divide-y divide-gray-50">
                  {suggestions.map((lm, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectLandmark(lm)}
                      className="w-full text-left px-4 py-2.5 hover:bg-violet-50/80 transition flex items-start gap-2.5"
                    >
                      <span className="text-base text-violet-600 mt-0.5">📍</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-gray-900 truncate">{lm.name}</div>
                        {lm.subtitle && (
                          <div className="text-[11px] text-gray-500 truncate">{lm.subtitle}</div>
                        )}
                      </div>
                      <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-md font-bold shrink-0">
                        {lm.ward}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Interactive Leaflet Pin Map */}
            <div className="h-64 sm:h-72 w-full rounded-2xl overflow-hidden border border-gray-200 shadow-inner relative z-10">
              <MapContainer
                center={mapCenter}
                zoom={14}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                <MapClickHandler onLocationSelect={handleLocationPick} />
                <MapCenterUpdater center={mapCenter} />

                <Marker
                  position={[formData.latitude, formData.longitude]}
                  icon={reportPinIcon}
                  draggable={true}
                  eventHandlers={{
                    dragend: (e) => {
                      const latlng = e.target.getLatLng();
                      handleLocationPick(latlng.lat, latlng.lng);
                    },
                  }}
                >
                  <Popup>
                    <div className="text-xs">
                      <strong>📍 Grievance Spot</strong>
                      <p className="mt-1">{formData.location || 'Click or drag pin to adjust location'}</p>
                      <span className="text-[10px] text-gray-500 font-bold block mt-1">{formData.ward}</span>
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>

              <div className="absolute bottom-3 left-3 right-3 z-[400] bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-gray-200/80 text-[11px] font-semibold text-gray-700 flex items-center justify-between shadow-xs">
                <span>📍 <strong>Pinned:</strong> {formData.location ? formData.location.slice(0, 45) + (formData.location.length > 45 ? '...' : '') : 'Click on map to choose spot'}</span>
                <span className="text-violet-700 font-extrabold uppercase">{formData.ward}</span>
              </div>
            </div>
          </div>

          {/* Grievance Photo Evidence */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Grievance Photo Proof (For AI Verification)
            </label>
            <div
              className="p-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl text-center hover:bg-gray-100/80 transition cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
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
                  <p className="text-xs font-bold text-violet-600">Click to choose a different photo</p>
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
              className="w-full py-3.5 px-6 rounded-full bg-gray-900 hover:bg-black text-white text-sm font-bold shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
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