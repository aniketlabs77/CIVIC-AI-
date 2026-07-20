import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../api/apiClient';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom markers
const startIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const endIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to handle map clicks
function MapClickHandler({ onMapClick, setTempLocation, tempLocation }) {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      setTempLocation({ lat: lat.toFixed(6), lng: lng.toFixed(6) });
      onMapClick({ lat: lat.toFixed(6), lng: lng.toFixed(6) });
    },
  });
  return null;
}

export default function SafetyMap() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedWard, setSelectedWard] = useState('ALL');
  const [timeMode, setTimeMode] = useState('DAY');
  const [startLocation, setStartLocation] = useState({ lat: '', lng: '' });
  const [endLocation, setEndLocation] = useState({ lat: '', lng: '' });
  const [tempLocation, setTempLocation] = useState(null);
  const [routeResult, setRouteResult] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState([28.6139, 77.2090]);
  const [mapZoom, setMapZoom] = useState(13);
  const [activePicker, setActivePicker] = useState(null); // 'start' or 'end'
  const [showPickerModal, setShowPickerModal] = useState(false);
  const mapRef = useRef(null);

  const wards = ['ALL', 'Ward 1', 'Ward 2', 'Ward 3', 'Ward 4', 'Ward 5'];

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/complaints');
      setComplaints(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError('Failed to load complaints');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Option 1: Get Current Location
  const getCurrentLocation = (type) => {
    setGeoLoading(true);
    if (!navigator.geolocation) {
      alert('Geolocation is not supported');
      setGeoLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude.toFixed(6),
          lng: position.coords.longitude.toFixed(6)
        };
        setLocation(type, loc);
        setGeoLoading(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Failed to get location. Please enable location access.');
        setGeoLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  // Option 2: Set location manually
  const setLocation = (type, loc) => {
    if (type === 'start') {
      setStartLocation(loc);
      setMapCenter([parseFloat(loc.lat), parseFloat(loc.lng)]);
      setMapZoom(15);
    } else {
      setEndLocation(loc);
      setMapCenter([parseFloat(loc.lat), parseFloat(loc.lng)]);
      setMapZoom(15);
    }
    setShowPickerModal(false);
    setActivePicker(null);
  };

  // Option 3: Open map picker
  const openMapPicker = (type) => {
    setActivePicker(type);
    setTempLocation(null);
    setShowPickerModal(true);
    // Center map on existing location or default
    if (type === 'start' && startLocation.lat) {
      setMapCenter([parseFloat(startLocation.lat), parseFloat(startLocation.lng)]);
    } else if (type === 'end' && endLocation.lat) {
      setMapCenter([parseFloat(endLocation.lat), parseFloat(endLocation.lng)]);
    } else {
      setMapCenter([28.6139, 77.2090]);
    }
    setMapZoom(14);
  };

  const handleMapClick = (loc) => {
    setTempLocation(loc);
  };

  const confirmMapLocation = () => {
    if (tempLocation && activePicker) {
      setLocation(activePicker, tempLocation);
    }
  };

  const areLocationsDifferent = () => {
    if (!startLocation.lat || !startLocation.lng || !endLocation.lat || !endLocation.lng) {
      return false;
    }
    const startLat = parseFloat(startLocation.lat);
    const startLng = parseFloat(startLocation.lng);
    const endLat = parseFloat(endLocation.lat);
    const endLng = parseFloat(endLocation.lng);
    return !(startLat === endLat && startLng === endLng);
  };

  const checkRouteSafety = async () => {
    if (!startLocation.lat || !startLocation.lng) {
      alert('Please set a START location');
      return;
    }
    if (!endLocation.lat || !endLocation.lng) {
      alert('Please set an END location');
      return;
    }

    if (!areLocationsDifferent()) {
      alert('⚠️ Start and End locations are the same!\n\nPlease set different locations.');
      return;
    }

    setRouteLoading(true);
    try {
      const response = await apiClient.post('/api/safety/check-route', {
        startLat: parseFloat(startLocation.lat),
        startLng: parseFloat(startLocation.lng),
        endLat: parseFloat(endLocation.lat),
        endLng: parseFloat(endLocation.lng)
      });
      setRouteResult(response.data);
      
      const midLat = (parseFloat(startLocation.lat) + parseFloat(endLocation.lat)) / 2;
      const midLng = (parseFloat(startLocation.lng) + parseFloat(endLocation.lng)) / 2;
      setMapCenter([midLat, midLng]);
      setMapZoom(13);
    } catch (err) {
      console.error('Route check error:', err);
      alert('Failed to check route safety. Please try again.');
    } finally {
      setRouteLoading(false);
    }
  };

  const clearRoute = () => {
    setStartLocation({ lat: '', lng: '' });
    setEndLocation({ lat: '', lng: '' });
    setRouteResult(null);
    setMapCenter([28.6139, 77.2090]);
    setMapZoom(13);
    setShowPickerModal(false);
    setActivePicker(null);
    setTempLocation(null);
  };

  // Filter complaints
  const filteredComplaints = selectedWard === 'ALL'
    ? complaints
    : complaints.filter(c => c.ward === selectedWard);

  const safetyComplaints = filteredComplaints.filter(
    c => c.issueType === 'SAFETY' || c.category === 'Unsafe Area'
  );

  const getRiskLevel = (complaint) => {
    const nearby = safetyComplaints.filter(c =>
      c.id !== complaint.id &&
      Math.abs(c.latitude - complaint.latitude) < 0.01 &&
      Math.abs(c.longitude - complaint.longitude) < 0.01
    ).length;
    return nearby >= 3 ? 'HIGH' : nearby >= 1 ? 'MEDIUM' : 'LOW';
  };

  const getRiskColor = (riskLevel, timeMode) => {
    if (timeMode === 'NIGHT') {
      switch (riskLevel) {
        case 'HIGH': return '#ff0000';
        case 'MEDIUM': return '#ff6b00';
        case 'LOW': return '#ffaa00';
        default: return '#888888';
      }
    }
    switch (riskLevel) {
      case 'HIGH': return '#ff4444';
      case 'MEDIUM': return '#ff8800';
      case 'LOW': return '#44bb44';
      default: return '#888888';
    }
  };

  const getRiskRadius = (riskLevel) => {
    switch (riskLevel) {
      case 'HIGH': return 80;
      case 'MEDIUM': return 50;
      case 'LOW': return 30;
      default: return 20;
    }
  };

  const getRiskOpacity = (riskLevel, timeMode) => {
    if (timeMode === 'NIGHT') {
      return riskLevel === 'HIGH' ? 0.9 : riskLevel === 'MEDIUM' ? 0.7 : 0.5;
    }
    return riskLevel === 'HIGH' ? 0.7 : riskLevel === 'MEDIUM' ? 0.5 : 0.3;
  };

  const getRoutePath = () => {
    if (!startLocation.lat || !startLocation.lng || !endLocation.lat || !endLocation.lng) {
      return null;
    }
    return [
      [parseFloat(startLocation.lat), parseFloat(startLocation.lng)],
      [parseFloat(endLocation.lat), parseFloat(endLocation.lng)]
    ];
  };

  const getRiskyLocationsOnRoute = () => {
    if (!routeResult?.riskyLocations) return [];
    return routeResult.riskyLocations;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">🛡️ Safety Heatmap</h1>
          <p className="text-gray-600">Time-aware safety zones and route planner for vulnerable commuters</p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <button
            onClick={() => setTimeMode('DAY')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              timeMode === 'DAY'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            ☀️ Day
          </button>
          <button
            onClick={() => setTimeMode('NIGHT')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              timeMode === 'NIGHT'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            🌙 Night
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-100 border border-red-400 rounded-lg text-red-700 mb-6">
          {error}
          <button onClick={fetchComplaints} className="ml-4 px-4 py-1 bg-red-600 text-white rounded hover:bg-red-700">
            Retry
          </button>
        </div>
      )}

      {/* Map Section */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
        <div className="h-96 md:h-[500px] w-full relative">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%' }}
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Safety Zones */}
            {safetyComplaints.map((complaint) => {
              const riskLevel = getRiskLevel(complaint);
              const color = getRiskColor(riskLevel, timeMode);
              const radius = getRiskRadius(riskLevel);
              const opacity = getRiskOpacity(riskLevel, timeMode);
              
              return (
                <Circle
                  key={`circle-${complaint.id}`}
                  center={[complaint.latitude, complaint.longitude]}
                  radius={radius}
                  pathOptions={{
                    color: color,
                    fillColor: color,
                    fillOpacity: opacity,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold text-gray-800">{complaint.category}</h3>
                      <p className="text-sm text-gray-600">{complaint.description}</p>
                      <p className="text-sm font-semibold mt-1">
                        Risk: <span style={{ color }}>{riskLevel}</span>
                      </p>
                      <p className="text-xs text-gray-500">Ward: {complaint.ward}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(complaint.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </Popup>
                </Circle>
              );
            })}

            {/* Start and End Markers */}
            {startLocation.lat && startLocation.lng && (
              <Marker 
                position={[parseFloat(startLocation.lat), parseFloat(startLocation.lng)]}
                icon={startIcon}
                draggable={true}
                eventHandlers={{
                  dragend: (e) => {
                    const { lat, lng } = e.target.getLatLng();
                    setStartLocation({ lat: lat.toFixed(6), lng: lng.toFixed(6) });
                  }
                }}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold text-green-600">🟢 START</h3>
                    <p className="text-sm text-gray-600">
                      Lat: {startLocation.lat}<br />
                      Lng: {startLocation.lng}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}

            {endLocation.lat && endLocation.lng && (
              <Marker 
                position={[parseFloat(endLocation.lat), parseFloat(endLocation.lng)]}
                icon={endIcon}
                draggable={true}
                eventHandlers={{
                  dragend: (e) => {
                    const { lat, lng } = e.target.getLatLng();
                    setEndLocation({ lat: lat.toFixed(6), lng: lng.toFixed(6) });
                  }
                }}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold text-red-600">🔴 END</h3>
                    <p className="text-sm text-gray-600">
                      Lat: {endLocation.lat}<br />
                      Lng: {endLocation.lng}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Route Path */}
            {getRoutePath() && (
              <Polyline
                positions={getRoutePath()}
                color={routeResult?.safe ? '#22c55e' : '#ef4444'}
                weight={4}
                dashArray={routeResult?.safe ? undefined : '10, 10'}
              />
            )}

            {/* Risky Locations on Route */}
            {getRiskyLocationsOnRoute().map((loc, index) => (
              <Circle
                key={`risk-${index}`}
                center={[loc.latitude, loc.longitude]}
                radius={40}
                pathOptions={{
                  color: '#ff0000',
                  fillColor: '#ff0000',
                  fillOpacity: 0.8,
                  weight: 3,
                }}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold text-red-600">⚠️ Risk Zone</h3>
                    <p className="text-sm">{loc.category}</p>
                    <p className="text-sm">{loc.location}</p>
                  </div>
                </Popup>
              </Circle>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Route Checker Panel with Three Options */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">🚗 Safer Route Planner</h2>
          <button
            onClick={clearRoute}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all text-sm font-medium"
          >
            🗑️ Clear All
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          {timeMode === 'NIGHT'
            ? '🌙 Night mode: Risks are amplified. Choose routes carefully.'
            : '☀️ Day mode: Standard safety assessment.'}
        </p>

        {/* Location selection row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Start Location */}
          <div className="border border-gray-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center">
              🟢 Start Location
              <span className="ml-2 text-xs text-gray-400">(choose one method)</span>
            </label>
            
            {/* Three options for start */}
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                onClick={() => getCurrentLocation('start')}
                disabled={geoLoading}
                className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:bg-gray-400 transition-all"
              >
                📍 Current Location
              </button>
              <button
                onClick={() => openMapPicker('start')}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-all"
              >
                🗺️ Pick on Map
              </button>
            </div>

            {/* Manual input for start */}
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="0.000001"
                value={startLocation.lat}
                onChange={(e) => setStartLocation({ ...startLocation, lat: e.target.value })}
                placeholder="Latitude"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                step="0.000001"
                value={startLocation.lng}
                onChange={(e) => setStartLocation({ ...startLocation, lng: e.target.value })}
                placeholder="Longitude"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {startLocation.lat && startLocation.lng && (
              <p className="text-xs text-green-600 mt-2">✅ Start set</p>
            )}
          </div>

          {/* End Location */}
          <div className="border border-gray-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center">
              🔴 End Location
              <span className="ml-2 text-xs text-gray-400">(choose one method)</span>
            </label>
            
            {/* Three options for end */}
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                onClick={() => getCurrentLocation('end')}
                disabled={geoLoading}
                className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:bg-gray-400 transition-all"
              >
                📍 Current Location
              </button>
              <button
                onClick={() => openMapPicker('end')}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-all"
              >
                🗺️ Pick on Map
              </button>
            </div>

            {/* Manual input for end */}
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="0.000001"
                value={endLocation.lat}
                onChange={(e) => setEndLocation({ ...endLocation, lat: e.target.value })}
                placeholder="Latitude"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                step="0.000001"
                value={endLocation.lng}
                onChange={(e) => setEndLocation({ ...endLocation, lng: e.target.value })}
                placeholder="Longitude"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {endLocation.lat && endLocation.lng && (
              <p className="text-xs text-red-600 mt-2">✅ End set</p>
            )}
          </div>
        </div>

        {/* Warning if locations are same */}
        {startLocation.lat && startLocation.lng && endLocation.lat && endLocation.lng && !areLocationsDifferent() && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-700 font-medium">
              ⚠️ Start and End locations are the same. Please set different locations.
            </p>
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button
            onClick={checkRouteSafety}
            disabled={routeLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-all"
          >
            {routeLoading ? '⏳ Checking Route...' : '🛡️ Check Route Safety'}
          </button>
        </div>

        {/* Route Result */}
        {routeResult && (
          <div className={`mt-4 p-4 rounded-lg border ${
            routeResult.safe
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{routeResult.safe ? '✅' : '🚨'}</span>
              <p className={`font-semibold ${
                routeResult.safe ? 'text-green-700' : 'text-red-700'
              }`}>
                {routeResult.message}
              </p>
            </div>
            {routeResult.riskyLocations && routeResult.riskyLocations.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-semibold text-red-700">⚠️ Risky Locations on Route:</p>
                <ul className="mt-2 space-y-2">
                  {routeResult.riskyLocations.map((loc, index) => (
                    <li key={index} className="text-sm text-gray-700 bg-white p-2 rounded border border-gray-200">
                      <span className="font-medium">{loc.category}</span> - {loc.location}
                      <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                        {loc.riskLevel}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-gray-600 mt-2">
                  💡 Recommended: {timeMode === 'NIGHT' ? 'Avoid this route at night. Consider an alternate path.' : 'Consider an alternate route during peak hours.'}
                </p>
              </div>
            )}
            {routeResult.safe && (
              <p className="text-sm text-green-600 mt-2">
                ✅ This route is safe for {timeMode === 'NIGHT' ? 'night travel' : 'daytime travel'}.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Map Picker Modal */}
      {showPickerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">
                {activePicker === 'start' ? '🟢 Select Start Location' : '🔴 Select End Location'}
              </h3>
              <button
                onClick={() => setShowPickerModal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-3">Click anywhere on the map to set the location.</p>
              <div className="h-80 rounded-lg overflow-hidden border border-gray-200">
                <MapContainer
                  center={mapCenter}
                  zoom={mapZoom}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapClickHandler 
                    onMapClick={handleMapClick} 
                    setTempLocation={setTempLocation}
                    tempLocation={tempLocation}
                  />
                  {tempLocation && (
                    <Marker position={[parseFloat(tempLocation.lat), parseFloat(tempLocation.lng)]}>
                      <Popup>
                        <div className="p-2">
                          <h3 className="font-bold text-blue-600">📍 Selected Location</h3>
                          <p className="text-sm text-gray-600">
                            Lat: {tempLocation.lat}<br />
                            Lng: {tempLocation.lng}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>
              {tempLocation && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700">
                    📍 Selected: {tempLocation.lat}, {tempLocation.lng}
                  </p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={confirmMapLocation}
                disabled={!tempLocation}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-all"
              >
                ✓ Confirm Location
              </button>
              <button
                onClick={() => setShowPickerModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ward Filter & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Ward:</label>
          <select
            value={selectedWard}
            onChange={(e) => setSelectedWard(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {wards.map(w => (
              <option key={w} value={w}>{w === 'ALL' ? 'All Wards' : w}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-red-500 rounded-full"></span>
            <span>High Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-orange-500 rounded-full"></span>
            <span>Medium Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-green-500 rounded-full"></span>
            <span>Low Risk</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{safetyComplaints.length}</p>
          <p className="text-sm text-gray-600">Safety Issues</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-red-600">
            {safetyComplaints.filter(c => getRiskLevel(c) === 'HIGH').length}
          </p>
          <p className="text-sm text-gray-600">High Risk Zones</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">
            {safetyComplaints.filter(c => getRiskLevel(c) === 'MEDIUM').length}
          </p>
          <p className="text-sm text-gray-600">Medium Risk Zones</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-green-600">
            {safetyComplaints.filter(c => getRiskLevel(c) === 'LOW').length}
          </p>
          <p className="text-sm text-gray-600">Low Risk Zones</p>
        </div>
      </div>

      {timeMode === 'NIGHT' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800 font-medium">🌙 Night Mode Active</p>
          <p className="text-sm text-blue-600">
            Risk zones are amplified at night. High-risk areas are highlighted in red with higher opacity.
            Recommended for vulnerable commuters.
          </p>
        </div>
      )}
    </div>
  );
} 