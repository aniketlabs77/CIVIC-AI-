import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import apiClient from '../api/apiClient';
import L from 'leaflet';

// Fix for Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const RiskLevelColors = {
  HIGH: '#ef4444',
  MEDIUM: '#f59e0b',
  LOW: '#10b981',
  UNKNOWN: '#6b7280'
};

const TimeOfDayColors = {
  MORNING: '#3b82f6',
  AFTERNOON: '#f59e0b',
  EVENING: '#ef4444',
  NIGHT: '#1e3a8a',
  UNKNOWN: '#6b7280'
};

const DefaultLocation = [28.6139, 77.2090]; // Delhi coordinates
const DefaultZoom = 12;

function SafetyMap() {
  const [safetyData, setSafetyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNightOnly, setShowNightOnly] = useState(false);
  const [routeCheck, setRouteCheck] = useState({
    startLat: '',
    startLng: '',
    endLat: '',
    endLng: '',
    checking: false,
    result: null
  });
  const [mapCenter, setMapCenter] = useState(DefaultLocation);
  const mapRef = useRef(null);

  useEffect(() => {
    fetchSafetyData();
  }, []);

  const fetchSafetyData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/api/safety/heatmap');
      setSafetyData(response.data);
    } catch (err) {
      setError('Failed to load safety data. Please try again later.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = showNightOnly 
    ? safetyData.filter(d => d.timeOfDay === 'NIGHT')
    : safetyData;

  const handleRouteCheck = async (e) => {
    e.preventDefault();
    if (!routeCheck.startLat || !routeCheck.startLng || !routeCheck.endLat || !routeCheck.endLng) {
      return;
    }

    setRouteCheck(prev => ({ ...prev, checking: true, result: null }));
    
    try {
      const response = await apiClient.get('/api/safety/route-check', {
        params: {
          startLat: routeCheck.startLat,
          startLng: routeCheck.startLng,
          endLat: routeCheck.endLat,
          endLng: routeCheck.endLng
        }
      });
      setRouteCheck(prev => ({ ...prev, checking: false, result: response.data }));
    } catch (err) {
      setRouteCheck(prev => ({ ...prev, checking: false, result: { safe: false, message: 'Error checking route', riskyLocations: [] } }));
      console.error('Error:', err);
    }
  };

  const handleMapClick = (e) => {
    const { lat, lng } = e.latlng;
    
    // If we're setting start or end point, fill the inputs
    if (!routeCheck.startLat && !routeCheck.startLng) {
      setRouteCheck(prev => ({ ...prev, startLat: lat.toFixed(6), startLng: lng.toFixed(6) }));
    } else if (!routeCheck.endLat && !routeCheck.endLng) {
      setRouteCheck(prev => ({ ...prev, endLat: lat.toFixed(6), endLng: lng.toFixed(6) }));
    }
  };

  const clearRoute = () => {
    setRouteCheck({
      startLat: '',
      startLng: '',
      endLat: '',
      endLng: '',
      checking: false,
      result: null
    });
  };

  // Custom marker for route points
  const routeStartIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  const routeEndIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Safety Map</h1>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showNightOnly}
                  onChange={(e) => setShowNightOnly(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Night reports only</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Route Check Panel */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Route Safety Check</h2>
          <form onSubmit={handleRouteCheck} className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Start Lat</label>
              <input
                type="number"
                step="0.000001"
                value={routeCheck.startLat}
                onChange={(e) => setRouteCheck(prev => ({ ...prev, startLat: e.target.value }))}
                placeholder="28.6139"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Start Lng</label>
              <input
                type="number"
                step="0.000001"
                value={routeCheck.startLng}
                onChange={(e) => setRouteCheck(prev => ({ ...prev, startLng: e.target.value }))}
                placeholder="77.2090"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">End Lat</label>
              <input
                type="number"
                step="0.000001"
                value={routeCheck.endLat}
                onChange={(e) => setRouteCheck(prev => ({ ...prev, endLat: e.target.value }))}
                placeholder="28.6200"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">End Lng</label>
              <input
                type="number"
                step="0.000001"
                value={routeCheck.endLng}
                onChange={(e) => setRouteCheck(prev => ({ ...prev, endLng: e.target.value }))}
                placeholder="77.2150"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
              />
            </div>
            <button
              type="submit"
              disabled={routeCheck.checking || !routeCheck.startLat || !routeCheck.startLng || !routeCheck.endLat || !routeCheck.endLng}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {routeCheck.checking ? 'Checking...' : 'Check Route Safety'}
            </button>
            {routeCheck.result && (
              <button
                type="button"
                onClick={clearRoute}
                className="px-4 py-2 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700"
              >
                Clear
              </button>
            )}
          </form>
          
          {routeCheck.result && (
            <div className={`mt-4 p-4 rounded-lg ${routeCheck.result.safe ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center gap-2">
                <span className={routeCheck.result.safe ? 'text-green-600' : 'text-red-600'}>
                  {routeCheck.result.safe ? '✓' : '⚠'}
                </span>
                <span className="font-medium">{routeCheck.result.message}</span>
              </div>
              {routeCheck.result.riskyLocations && routeCheck.result.riskyLocations.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-700">Risky locations near route:</p>
                  <ul className="mt-1 space-y-1">
                    {routeCheck.result.riskyLocations.map((loc, idx) => (
                      <li key={idx} className="text-sm text-gray-600">
                        {loc.category} at {loc.location} ({loc.timeOfDay})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="h-[calc(100vh-280px)]">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center text-red-600">
            {error}
          </div>
        ) : (
          <MapContainer
            ref={mapRef}
            center={mapCenter}
            zoom={DefaultZoom}
            scrollWheelZoom={true}
            onClick={handleMapClick}
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Safety markers */}
            {filteredData.map((item) => (
              <CircleMarker
                key={item.id}
                center={[item.latitude, item.longitude]}
                radius={8}
                color={RiskLevelColors[item.riskLevel] || RiskLevelColors.UNKNOWN}
                fillColor={RiskLevelColors[item.riskLevel] || RiskLevelColors.UNKNOWN}
                fillOpacity={0.7}
                weight={2}
              >
                <Popup>
                  <div className="min-w-[200px]">
                    <h3 className="font-bold text-gray-900">{item.category}</h3>
                    <p className="text-sm text-gray-600">{item.description}</p>
                    <p className="text-sm text-gray-600">{item.location}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        item.riskLevel === 'HIGH' ? 'bg-red-100 text-red-800' :
                        item.riskLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                        item.riskLevel === 'LOW' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {item.riskLevel} Risk
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        item.timeOfDay === 'NIGHT' ? 'bg-blue-900 text-blue-100' :
                        item.timeOfDay === 'EVENING' ? 'bg-red-100 text-red-800' :
                        item.timeOfDay === 'AFTERNOON' ? 'bg-yellow-100 text-yellow-800' :
                        item.timeOfDay === 'MORNING' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {item.timeOfDay}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{new Date(item.createdAt).toLocaleString()}</p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
            
            {/* Route start marker */}
            {routeCheck.startLat && routeCheck.startLng && (
              <Marker
                position={[parseFloat(routeCheck.startLat), parseFloat(routeCheck.startLng)]}
                icon={routeStartIcon}
              >
                <Popup>
                  <div className="text-center">
                    <p className="font-bold text-green-700">Route Start</p>
                  </div>
                </Popup>
              </Marker>
            )}
            
            {/* Route end marker */}
            {routeCheck.endLat && routeCheck.endLng && (
              <Marker
                position={[parseFloat(routeCheck.endLat), parseFloat(routeCheck.endLng)]}
                icon={routeEndIcon}
              >
                <Popup>
                  <div className="text-center">
                    <p className="font-bold text-red-700">Route End</p>
                  </div>
                </Popup>
              </Marker>
            )}
            
            {/* Risky locations on route */}
            {routeCheck.result && !routeCheck.result.safe && routeCheck.result.riskyLocations && (
              routeCheck.result.riskyLocations.map((loc, idx) => (
                <Marker
                  key={idx}
                  position={[loc.latitude, loc.longitude]}
                  icon={new L.Icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
                    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                  })}
                >
                  <Popup>
                    <div className="min-w-[200px]">
                      <h3 className="font-bold text-red-900">⚠ Risky Area</h3>
                      <p className="text-sm text-gray-600">{loc.category}</p>
                      <p className="text-sm text-gray-600">{loc.location}</p>
                      <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                        HIGH Risk - {loc.timeOfDay}
                      </span>
                    </div>
                  </Popup>
                </Marker>
              ))
            )}
          </MapContainer>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 right-4 z-10 bg-white rounded-lg shadow-lg p-4 border">
          <h4 className="font-bold text-gray-900 mb-2">Risk Levels</h4>
          <div className="space-y-1">
            {Object.entries(RiskLevelColors).map(([level, color]) => (
              <div key={level} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }}></div>
                <span className="text-sm text-gray-700 capitalize">{level.toLowerCase()}</span>
              </div>
            ))}
          </div>
          <hr className="my-2" />
          <h4 className="font-bold text-gray-900 mb-2">Time of Day</h4>
          <div className="space-y-1">
            {Object.entries(TimeOfDayColors).map(([time, color]) => (
              <div key={time} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }}></div>
                <span className="text-sm text-gray-700 capitalize">{time.toLowerCase()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SafetyMap;