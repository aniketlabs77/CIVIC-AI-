import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Polyline, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import apiClient from '../api/apiClient';
import L from 'leaflet';

// Fix for Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom pin icons
const createCustomIcon = (color) => {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

const startIcon = createCustomIcon('green');
const endIcon = createCustomIcon('red');
const hazardIcon = createCustomIcon('orange');

const RiskLevelColors = {
  HIGH: '#ef4444',
  MEDIUM: '#f59e0b',
  LOW: '#10b981',
  UNKNOWN: '#6b7280'
};

// Popular Delhi/NCR & civic landmarks for instant 1-click test & search
const POPULAR_LANDMARKS = [
  { name: 'G.L. Bajaj Institute of Technology and Management', subtitle: 'Knowledge Park II, Greater Noida', lat: 28.4727, lng: 77.4895, aliases: ['gl bajaj', 'g.l. bajaj', 'gl bajaj institute', 'knowledge park 2'] },
  { name: 'Krishna City', subtitle: 'Lal Kuan, GT Road, Ghaziabad', lat: 28.6322, lng: 77.4642, aliases: ['krishna city', 'krishna city lal kuan', 'krishna city ghaziabad'] },
  { name: 'Sanjay Nagar', subtitle: 'Sector 23, Ghaziabad', lat: 28.6948, lng: 77.4475, aliases: ['sanjay nagar', 'sanjay nagar ghaziabad', 'sector 23 sanjay nagar'] },
  { name: 'Lal Kuan', subtitle: 'GT Road / NH-91, Ghaziabad', lat: 28.6366, lng: 77.4582, aliases: ['lal kuan', 'lalkuan', 'lal kuan ghaziabad', 'lal kuan chauraha'] },
  { name: 'ABES Engineering College', subtitle: 'Lal Kuan, NH-24 Bypass, Ghaziabad', lat: 28.6347, lng: 77.4468, aliases: ['abes', 'abes ec', 'abes it'] },
  { name: 'Crossings Republik', subtitle: 'NH-24, Ghaziabad', lat: 28.6258, lng: 77.4428, aliases: ['crossings', 'crossings republik'] },
  { name: 'Indirapuram', subtitle: 'Shipra Mall, Ghaziabad', lat: 28.6369, lng: 77.3697, aliases: ['indirapuram', 'shipra sun city'] },
  { name: 'Raj Nagar Extension', subtitle: 'Ghaziabad', lat: 28.7041, lng: 77.4328, aliases: ['raj nagar ext', 'raj nagar extension'] },
  { name: 'Connaught Place', subtitle: 'Central Delhi, Rajiv Chowk', lat: 28.6315, lng: 77.2167 },
  { name: 'India Gate', subtitle: 'Rajpath, New Delhi', lat: 28.6129, lng: 77.2295 },
  { name: 'AIIMS Hospital', subtitle: 'Ansari Nagar, New Delhi', lat: 28.5672, lng: 77.2100 },
  { name: 'Karol Bagh Market', subtitle: 'Central Delhi', lat: 28.6517, lng: 77.1906 },
  { name: 'Civil Lines, Ward 1', subtitle: 'North Delhi', lat: 28.6814, lng: 77.2227 },
  { name: 'Lajpat Nagar Central Market', subtitle: 'South Delhi', lat: 28.5677, lng: 77.2433 },
  { name: 'Chandni Chowk', subtitle: 'Old Delhi, Red Fort', lat: 28.6506, lng: 77.2303 },
  { name: 'Hauz Khas Village', subtitle: 'South Delhi', lat: 28.5535, lng: 77.1944 },
  { name: 'Saket Citywalk Mall', subtitle: 'District Centre, Saket', lat: 28.5284, lng: 77.2185 },
  { name: 'Rohini Sector 7', subtitle: 'North West Delhi', lat: 28.7159, lng: 77.1189 },
  { name: 'Dwarka Sector 21', subtitle: 'South West Delhi', lat: 28.5523, lng: 77.0583 },
  { name: 'Noida Sector 18', subtitle: 'Atta Market, Noida', lat: 28.5708, lng: 77.3260 },
  { name: 'Noida Sector 62', subtitle: 'Electronic City, Noida', lat: 28.6280, lng: 77.3649 },
  { name: 'Cyber City Gurugram', subtitle: 'DLF Phase 2, Gurugram', lat: 28.4950, lng: 77.0895 },
  { name: 'Kashmiri Gate ISBT', subtitle: 'North Delhi Transit Hub', lat: 28.6675, lng: 77.2285 },
  { name: 'Nehru Place', subtitle: 'Financial & IT District', lat: 28.5494, lng: 77.2536 }
];

const DefaultLocation = [28.6139, 77.2090]; // Delhi center
const DefaultZoom = 13;

// Map controller to smoothly pan/fit bounds
function MapBoundsController({ routeCoordinates, center }) {
  const map = useMap();
  useEffect(() => {
    if (routeCoordinates && routeCoordinates.length > 1) {
      const bounds = L.latLngBounds(routeCoordinates);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else if (center && center.lat && center.lng) {
      map.flyTo([center.lat, center.lng], 14, { duration: 1 });
    }
  }, [routeCoordinates, center, map]);
  return null;
}

// Map click handler for interactive pin setting
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    }
  });
  return null;
}

// Multi-engine geocoding function (Photon + Nominatim + Local Presets)
async function geocodeQuery(query) {
  if (!query || query.trim().length < 2) return [];

  const cleanQuery = query.trim();
  const lowerQuery = cleanQuery.toLowerCase();

  // 1. Search local curated landmarks with normalized string & alias matching
  const normalizedQuery = lowerQuery.replace(/[^a-z0-9]/g, '');
  const localMatches = POPULAR_LANDMARKS.filter(lm => {
    const nameNorm = lm.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const subNorm = (lm.subtitle || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const aliasMatch = (lm.aliases || []).some(a => {
      const aNorm = a.toLowerCase().replace(/[^a-z0-9]/g, '');
      return aNorm.includes(normalizedQuery) || normalizedQuery.includes(aNorm);
    });
    return nameNorm.includes(normalizedQuery) || subNorm.includes(normalizedQuery) || aliasMatch;
  }).map(lm => ({
    name: lm.name,
    subtitle: lm.subtitle,
    lat: lm.lat,
    lng: lm.lng
  }));

  // 2. Query Photon API (Fast, typo-tolerant, biased to coordinates)
  let photonMatches = [];
  try {
    const photonRes = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery)}&lat=28.6139&lon=77.2090&limit=8`
    );
    if (photonRes.ok) {
      const pData = await photonRes.json();
      if (pData.features && pData.features.length > 0) {
        photonMatches = pData.features.map(f => {
          const props = f.properties || {};
          const mainName = props.name || props.street || props.district || cleanQuery;
          const subParts = [props.street, props.suburb, props.district, props.city || props.county, props.state]
            .filter(Boolean)
            .filter((v, i, a) => a.indexOf(v) === i && v !== mainName);
          return {
            name: mainName,
            subtitle: subParts.length > 0 ? subParts.join(', ') : (props.country || 'India'),
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0]
          };
        });
      }
    }
  } catch (err) {
    console.warn('Photon geocode lookup notice:', err);
  }

  // 3. Query Nominatim OpenStreetMap API
  let nominatimMatches = [];
  try {
    const nomRes = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&addressdetails=1&limit=6`
    );
    if (nomRes.ok) {
      const nData = await nomRes.json();
      nominatimMatches = nData.map(item => {
        const parts = item.display_name.split(',');
        const main = parts[0] ? parts[0].trim() : cleanQuery;
        const sub = parts.slice(1, 4).join(', ').trim();
        return {
          name: main,
          subtitle: sub || 'India',
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon)
        };
      });
    }
  } catch (err) {
    console.warn('Nominatim lookup notice:', err);
  }

  // Merge and deduplicate results
  const allResults = [...localMatches, ...photonMatches, ...nominatimMatches];
  const uniqueResults = [];
  const seen = new Set();

  for (const item of allResults) {
    const key = `${item.lat.toFixed(3)},${item.lng.toFixed(3)}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueResults.push(item);
    }
  }

  return uniqueResults.slice(0, 7);
}

function SafetyMap() {
  const [safetyData, setSafetyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNightOnly, setShowNightOnly] = useState(false);
  const [mapTheme, setMapTheme] = useState('standard'); // 'standard' | 'night' | 'satellite'

  // Route points
  const [startPlace, setStartPlace] = useState({ name: 'Connaught Place', subtitle: 'Central Delhi', lat: 28.6315, lng: 77.2167 });
  const [endPlace, setEndPlace] = useState({ name: 'Civil Lines, Ward 1', subtitle: 'North Delhi', lat: 28.6814, lng: 77.2227 });
  const [startInputText, setStartInputText] = useState('Connaught Place');
  const [endInputText, setEndInputText] = useState('Civil Lines, Ward 1');

  // Search suggestions dropdown state
  const [startSuggestions, setStartSuggestions] = useState([]);
  const [endSuggestions, setEndSuggestions] = useState([]);
  const [startSearching, setStartSearching] = useState(false);
  const [endSearching, setEndSearching] = useState(false);
  const [activePinSelection, setActivePinSelection] = useState(null); // 'start' | 'end' | null
  const [mapCenter, setMapCenter] = useState(null);

  // Route execution state
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [checkingRoute, setCheckingRoute] = useState(false);
  const [locatingUser, setLocatingUser] = useState(false);

  const startDebounceRef = useRef(null);
  const endDebounceRef = useRef(null);
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
      setError('Failed to load safety incidents. Please ensure backend is running.');
      console.error('Safety heatmap error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = showNightOnly 
    ? safetyData.filter(d => d.timeOfDay === 'NIGHT')
    : safetyData;

  // Handle start input change with debounced geocoding
  const handleStartInputChange = (val) => {
    setStartInputText(val);
    if (startDebounceRef.current) clearTimeout(startDebounceRef.current);

    if (!val || val.trim().length < 2) {
      setStartSuggestions([]);
      setStartSearching(false);
      return;
    }

    setStartSearching(true);
    startDebounceRef.current = setTimeout(async () => {
      const results = await geocodeQuery(val);
      setStartSuggestions(results);
      setStartSearching(false);
    }, 280);
  };

  // Handle end input change with debounced geocoding
  const handleEndInputChange = (val) => {
    setEndInputText(val);
    if (endDebounceRef.current) clearTimeout(endDebounceRef.current);

    if (!val || val.trim().length < 2) {
      setEndSuggestions([]);
      setEndSearching(false);
      return;
    }

    setEndSearching(true);
    endDebounceRef.current = setTimeout(async () => {
      const results = await geocodeQuery(val);
      setEndSuggestions(results);
      setEndSearching(false);
    }, 280);
  };

  // User selects start suggestion
  const handleSelectStart = (sug) => {
    setStartPlace(sug);
    setStartInputText(sug.name);
    setStartSuggestions([]);
    setMapCenter({ lat: sug.lat, lng: sug.lng });
  };

  // User selects end suggestion
  const handleSelectEnd = (sug) => {
    setEndPlace(sug);
    setEndInputText(sug.name);
    setEndSuggestions([]);
    setMapCenter({ lat: sug.lat, lng: sug.lng });
  };

  const handleUseCurrentLocation = (target) => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingUser(false);
        const userLoc = {
          name: 'My Current Location',
          subtitle: `GPS: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        if (target === 'start') {
          setStartPlace(userLoc);
          setStartInputText('My Current Location');
        } else {
          setEndPlace(userLoc);
          setEndInputText('My Current Location');
        }
        setMapCenter({ lat: userLoc.lat, lng: userLoc.lng });
      },
      (err) => {
        setLocatingUser(false);
        console.warn('Geolocation failed:', err);
        alert('Could not retrieve current GPS location.');
      },
      { timeout: 8000 }
    );
  };

  const handleMapClick = (latlng) => {
    const coords = {
      name: `Pin (${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)})`,
      subtitle: 'Dropped Map Marker',
      lat: latlng.lat,
      lng: latlng.lng
    };

    if (activePinSelection === 'start' || (!startPlace && !activePinSelection)) {
      setStartPlace(coords);
      setStartInputText(coords.name);
      setActivePinSelection(null);
    } else if (activePinSelection === 'end' || (!endPlace && !activePinSelection)) {
      setEndPlace(coords);
      setEndInputText(coords.name);
      setActivePinSelection(null);
    } else {
      setEndPlace(coords);
      setEndInputText(coords.name);
    }
    setMapCenter({ lat: coords.lat, lng: coords.lng });
  };

  const handleCalculateSafeRoute = async (e) => {
    if (e) e.preventDefault();

    setCheckingRoute(true);
    setRouteInfo(null);
    setStartSuggestions([]);
    setEndSuggestions([]);

    try {
      // Auto-geocode start if user typed something and didn't click dropdown
      let effectiveStart = startPlace;
      if (!effectiveStart || (effectiveStart.name !== startInputText && startInputText.trim().length >= 2)) {
        const startResults = await geocodeQuery(startInputText);
        if (startResults.length > 0) {
          effectiveStart = startResults[0];
          setStartPlace(effectiveStart);
        }
      }

      // Auto-geocode end if user typed something and didn't click dropdown
      let effectiveEnd = endPlace;
      if (!effectiveEnd || (effectiveEnd.name !== endInputText && endInputText.trim().length >= 2)) {
        const endResults = await geocodeQuery(endInputText);
        if (endResults.length > 0) {
          effectiveEnd = endResults[0];
          setEndPlace(effectiveEnd);
        }
      }

      if (!effectiveStart || !effectiveEnd) {
        alert('Please enter both a valid Start Location and Destination.');
        setCheckingRoute(false);
        return;
      }

      // Call OSRM Road Routing API
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${effectiveStart.lng},${effectiveStart.lat};${effectiveEnd.lng},${effectiveEnd.lat}?overview=full&geometries=geojson`;
      const routeRes = await fetch(osrmUrl);
      const routeJson = await routeRes.json();

      let realRoadCoords = [];
      let distanceKm = 0;
      let durationMin = 0;

      if (routeJson.routes && routeJson.routes.length > 0) {
        const route = routeJson.routes[0];
        distanceKm = (route.distance / 1000).toFixed(1);
        durationMin = Math.round(route.duration / 60);
        realRoadCoords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      } else {
        const steps = 15;
        for (let i = 0; i <= steps; i++) {
          const lat = effectiveStart.lat + (effectiveEnd.lat - effectiveStart.lat) * (i / steps);
          const lng = effectiveStart.lng + (effectiveEnd.lng - effectiveStart.lng) * (i / steps);
          realRoadCoords.push([lat, lng]);
        }
      }

      setRouteCoordinates(realRoadCoords);

      let safetyCheckResult;
      try {
        const checkRes = await apiClient.post('/api/safety/route-check-geometry', realRoadCoords);
        safetyCheckResult = checkRes.data;
      } catch {
        const fallbackRes = await apiClient.get('/api/safety/route-check', {
          params: {
            startLat: effectiveStart.lat,
            startLng: effectiveStart.lng,
            endLat: effectiveEnd.lat,
            endLng: effectiveEnd.lng
          }
        });
        safetyCheckResult = fallbackRes.data;
      }

      setRouteInfo({
        distanceKm: distanceKm || '3.5',
        durationMin: durationMin || '12',
        safe: safetyCheckResult.safe,
        message: safetyCheckResult.message,
        riskyLocations: safetyCheckResult.riskyLocations || []
      });

    } catch (err) {
      console.error('Error calculating real road route:', err);
      setRouteInfo({
        distanceKm: 'N/A',
        durationMin: 'N/A',
        safe: false,
        message: 'Could not connect to route navigation service.',
        riskyLocations: []
      });
    } finally {
      setCheckingRoute(false);
    }
  };

  const clearRoute = () => {
    setRouteCoordinates([]);
    setRouteInfo(null);
  };

  const getTileLayerUrl = () => {
    switch (mapTheme) {
      case 'night':
        return 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      default:
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-2">
            <span>🛡️</span> Safe Route Navigator
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Real road routing that automatically inspects and highlights reported dark streetlight hazards
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Map Theme Toggle */}
          <div className="flex bg-white dark:bg-gray-800 p-1 rounded-full shadow-card dark:shadow-none border border-gray-100 dark:border-gray-700 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMapTheme('standard')}
              className={`px-3 py-1 rounded-full transition ${mapTheme === 'standard' ? 'bg-accent text-white shadow-xs' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100'}`}
            >
              🗺️ Street
            </button>
            <button
              type="button"
              onClick={() => setMapTheme('night')}
              className={`px-3 py-1 rounded-full transition ${mapTheme === 'night' ? 'bg-dark text-amber-300 shadow-xs' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100'}`}
            >
              🌙 Night
            </button>
            <button
              type="button"
              onClick={() => setMapTheme('satellite')}
              className={`px-3 py-1 rounded-full transition ${mapTheme === 'satellite' ? 'bg-accent text-white shadow-xs' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100'}`}
            >
              🛰️ Satellite
            </button>
          </div>

          {/* Night Filter Checkbox */}
          <label className="flex items-center gap-2 px-3.5 py-1.5 bg-white dark:bg-gray-800 rounded-full text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer shadow-card dark:shadow-none border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:bg-gray-900 transition">
            <input
              type="checkbox"
              checked={showNightOnly}
              onChange={(e) => setShowNightOnly(e.target.checked)}
              className="w-3.5 h-3.5 text-accent rounded"
            />
            Night Hazards
          </label>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Route Controls & Intelligence Panel */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          
          {/* Route Planning Card */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-card dark:shadow-none border border-gray-100 dark:border-gray-700/80">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-1.5">
              <span>📍</span> Plan Safe City Journey
            </h2>

            <form onSubmit={handleCalculateSafeRoute} className="space-y-4">
              {/* Start Point Search */}
              <div className="relative">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Start Origin
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={startInputText}
                      onChange={(e) => handleStartInputChange(e.target.value)}
                      placeholder="Search landmark, hospital, street..."
                      className="w-full pl-8 pr-7 py-2.5 text-xs sm:text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <span className="absolute left-2.5 top-2.5 text-xs">🟢</span>
                    {startInputText && (
                      <button
                        type="button"
                        onClick={() => {
                          setStartInputText('');
                          setStartSuggestions([]);
                        }}
                        className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 dark:text-gray-400 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    title="Use my GPS location"
                    onClick={() => handleUseCurrentLocation('start')}
                    disabled={locatingUser}
                    className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-xl transition text-xs"
                  >
                    📍
                  </button>
                  <button
                    type="button"
                    title="Click on map to place Start Pin"
                    onClick={() => setActivePinSelection('start')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition ${activePinSelection === 'start' ? 'bg-accent text-white shadow-xs' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:text-gray-300'}`}
                  >
                    📌 Pin
                  </button>
                </div>

                {/* Suggestions Dropdown */}
                {startSearching && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-3 text-xs text-gray-400 flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                    <span>Searching locations...</span>
                  </div>
                )}
                {!startSearching && startSuggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden max-h-60 overflow-y-auto divide-y divide-gray-50">
                    {startSuggestions.map((sug, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectStart(sug)}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-accent-light/50 transition flex items-start gap-2.5 group"
                      >
                        <span className="text-base mt-0.5">📍</span>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs text-gray-900 dark:text-gray-100 group-hover:text-accent truncate">
                            {sug.name}
                          </p>
                          <p className="text-[11px] text-gray-400 truncate">
                            {sug.subtitle}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Destination Point Search */}
              <div className="relative">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Destination
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={endInputText}
                      onChange={(e) => handleEndInputChange(e.target.value)}
                      placeholder="Search destination, mall, metro..."
                      className="w-full pl-8 pr-7 py-2.5 text-xs sm:text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <span className="absolute left-2.5 top-2.5 text-xs">🔴</span>
                    {endInputText && (
                      <button
                        type="button"
                        onClick={() => {
                          setEndInputText('');
                          setEndSuggestions([]);
                        }}
                        className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 dark:text-gray-400 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    title="Click on map to place Destination Pin"
                    onClick={() => setActivePinSelection('end')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition ${activePinSelection === 'end' ? 'bg-accent text-white shadow-xs' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:text-gray-300'}`}
                  >
                    📌 Pin
                  </button>
                </div>

                {/* Suggestions Dropdown */}
                {endSearching && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-3 text-xs text-gray-400 flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                    <span>Searching locations...</span>
                  </div>
                )}
                {!endSearching && endSuggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden max-h-60 overflow-y-auto divide-y divide-gray-50">
                    {endSuggestions.map((sug, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectEnd(sug)}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-accent-light/50 transition flex items-start gap-2.5 group"
                      >
                        <span className="text-base mt-0.5">📍</span>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs text-gray-900 dark:text-gray-100 group-hover:text-accent truncate">
                            {sug.name}
                          </p>
                          <p className="text-[11px] text-gray-400 truncate">
                            {sug.subtitle}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={checkingRoute}
                  style={{ backgroundColor: '#7c5cff', color: '#ffffff' }}
                  className="flex-1 py-3.5 px-6 rounded-full bg-[#7c5cff] hover:bg-[#6d4df5] text-white text-sm font-extrabold shadow-[0_4px_14px_rgba(124,92,255,0.4)] transition disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {checkingRoute ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Searching Safe Route...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-base">🔍</span>
                      <span>Search</span>
                    </>
                  )}
                </button>

                {routeCoordinates.length > 0 && (
                  <button
                    type="button"
                    onClick={clearRoute}
                    className="px-5 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-full transition border border-gray-200 dark:border-gray-700"
                  >
                    Clear
                  </button>
                )}
              </div>
            </form>

            {/* Quick Landmark Chips */}
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Popular Quick Presets
              </p>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_LANDMARKS.slice(0, 8).map((lm, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (!startPlace || startPlace.name === lm.name) {
                        setStartPlace(lm);
                        setStartInputText(lm.name);
                      } else {
                        setEndPlace(lm);
                        setEndInputText(lm.name);
                      }
                      setMapCenter({ lat: lm.lat, lng: lm.lng });
                    }}
                    className="px-3 py-1 bg-gray-50 dark:bg-gray-900 hover:bg-accent-light hover:text-accent text-gray-600 dark:text-gray-400 text-[11px] font-semibold rounded-full transition border border-gray-100 dark:border-gray-700"
                  >
                    {lm.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Route Safety Intelligence Card */}
          {routeInfo && (
            <div className={`rounded-3xl p-5 shadow-card dark:shadow-none border transition-all ${
              routeInfo.safe ? 'bg-emerald-50/70 border-emerald-200/70' : 'bg-amber-50/70 border-amber-200/70'
            }`}>
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">
                  {routeInfo.safe ? '🛡️' : '⚠️'}
                </span>
                <div className="flex-1">
                  <h3 className={`text-sm font-bold ${routeInfo.safe ? 'text-emerald-900' : 'text-amber-900'}`}>
                    {routeInfo.safe ? 'Safe Road Corridor' : 'Safety Advisory on Real Route'}
                  </h3>
                  <p className={`text-xs mt-1 ${routeInfo.safe ? 'text-emerald-700' : 'text-amber-800'}`}>
                    {routeInfo.message}
                  </p>

                  {/* Route Navigation Metrics */}
                  <div className="flex gap-4 mt-3 pt-3 border-t border-black/5">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400">Road Distance</span>
                      <p className="text-sm font-black text-gray-900 dark:text-gray-100">{routeInfo.distanceKm} km</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400">Est. Time</span>
                      <p className="text-sm font-black text-gray-900 dark:text-gray-100">~{routeInfo.durationMin} mins</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400">Status</span>
                      <p className={`text-sm font-black ${routeInfo.safe ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {routeInfo.safe ? 'Verified Safe' : `${routeInfo.riskyLocations.length} Incident(s)`}
                      </p>
                    </div>
                  </div>

                  {/* Risky Areas Details */}
                  {routeInfo.riskyLocations && routeInfo.riskyLocations.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-amber-200/60 space-y-1.5">
                      <p className="text-[11px] font-bold text-amber-900">
                        Nearby Incidents along Road:
                      </p>
                      {routeInfo.riskyLocations.map((loc, idx) => (
                        <div key={idx} className="bg-white dark:bg-gray-800/80 p-2 rounded-xl border border-amber-200 text-xs text-gray-700 dark:text-gray-300 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-gray-900 dark:text-gray-100">{loc.category}</span>
                            <span className="text-gray-500 dark:text-gray-400"> • {loc.location}</span>
                          </div>
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full">
                            {loc.timeOfDay}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Incident Legend */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-card dark:shadow-none border border-gray-100 dark:border-gray-700/80">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Civic Risk Legend
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400 font-medium">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                <span>High Risk (3+ Incidents)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>Medium Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Low Risk Area</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-900"></span>
                <span>Night Hazard</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Map Card */}
        <div className="lg:col-span-8 bg-white dark:bg-gray-800 rounded-3xl shadow-card dark:shadow-none border border-gray-100 dark:border-gray-700/80 overflow-hidden relative min-h-[560px] flex flex-col p-2">
          {activePinSelection && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] bg-dark/95 text-white text-xs px-5 py-2.5 rounded-full shadow-2xl backdrop-blur flex items-center gap-2 animate-bounce font-medium">
              <span>📍</span>
              <span>Click on the map to set {activePinSelection === 'start' ? 'Start Point' : 'Destination'}</span>
              <button
                type="button"
                onClick={() => setActivePinSelection(null)}
                className="ml-2 underline text-gray-300 hover:text-white"
              >
                Cancel
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="w-9 h-9 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Loading civic safety map...</p>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <span className="text-3xl mb-2">⚠️</span>
              <p className="text-xs font-bold text-rose-600">{error}</p>
              <button
                type="button"
                onClick={fetchSafetyData}
                className="mt-3 px-4 py-2 bg-dark hover:bg-dark-hover text-white text-xs font-bold rounded-full shadow transition"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="flex-1 w-full rounded-2xl overflow-hidden min-h-[520px]">
              <MapContainer
                ref={mapRef}
                center={DefaultLocation}
                zoom={DefaultZoom}
                scrollWheelZoom={true}
                className="h-full w-full"
              >
                <MapClickHandler onMapClick={handleMapClick} />
                <MapBoundsController routeCoordinates={routeCoordinates} center={mapCenter} />

                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url={getTileLayerUrl()}
                />

                {/* Safety incidents markers */}
                {filteredData.map((item) => (
                  <CircleMarker
                    key={item.id}
                    center={[item.latitude, item.longitude]}
                    radius={item.riskLevel === 'HIGH' ? 10 : 7}
                    color={RiskLevelColors[item.riskLevel] || '#6b7280'}
                    fillColor={RiskLevelColors[item.riskLevel] || '#6b7280'}
                    fillOpacity={0.75}
                    weight={2}
                  >
                    <Popup>
                      <div className="min-w-[210px] p-1 text-xs">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="font-bold text-gray-900 dark:text-gray-100">{item.category}</h4>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            item.riskLevel === 'HIGH' ? 'bg-rose-100 text-rose-800' :
                            item.riskLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {item.riskLevel}
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-1">{item.description}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold">📍 {item.location} (Ward {item.ward})</p>
                        <div className="flex items-center justify-between text-[10px] text-gray-400 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                          <span>Time: {item.timeOfDay}</span>
                          <span>{item.status}</span>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}

                {/* Start Point Pin */}
                {startPlace && (
                  <Marker position={[startPlace.lat, startPlace.lng]} icon={startIcon}>
                    <Popup>
                      <div className="text-center p-1 text-xs">
                        <span className="font-bold text-emerald-700">🟢 Start Point</span>
                        <p className="font-medium text-gray-800 dark:text-gray-200 mt-0.5">{startPlace.name}</p>
                        {startPlace.subtitle && (
                          <p className="text-[10px] text-gray-400">{startPlace.subtitle}</p>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Destination Point Pin */}
                {endPlace && (
                  <Marker position={[endPlace.lat, endPlace.lng]} icon={endIcon}>
                    <Popup>
                      <div className="text-center p-1 text-xs">
                        <span className="font-bold text-rose-700">🔴 Destination</span>
                        <p className="font-medium text-gray-800 dark:text-gray-200 mt-0.5">{endPlace.name}</p>
                        {endPlace.subtitle && (
                          <p className="text-[10px] text-gray-400">{endPlace.subtitle}</p>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Real Road Navigation Polyline */}
                {routeCoordinates && routeCoordinates.length > 1 && (
                  <>
                    <Polyline
                      positions={routeCoordinates}
                      pathOptions={{
                        color: routeInfo?.safe ? '#7c5cff' : '#dc2626',
                        weight: 8,
                        opacity: 0.3,
                        lineCap: 'round',
                        lineJoin: 'round'
                      }}
                    />
                    <Polyline
                      positions={routeCoordinates}
                      pathOptions={{
                        color: routeInfo?.safe ? '#7c5cff' : '#ea580c',
                        weight: 5,
                        opacity: 0.95,
                        dashArray: routeInfo?.safe ? null : '10, 8',
                        lineCap: 'round',
                        lineJoin: 'round'
                      }}
                    />
                  </>
                )}

                {/* Risky Areas along real road */}
                {routeInfo && !routeInfo.safe && routeInfo.riskyLocations && (
                  routeInfo.riskyLocations.map((loc, idx) => (
                    <Marker
                      key={`risk-${idx}`}
                      position={[loc.latitude, loc.longitude]}
                      icon={hazardIcon}
                    >
                      <Popup>
                        <div className="min-w-[190px] p-1 text-xs">
                          <div className="flex items-center gap-1 text-amber-700 font-bold mb-1">
                            <span>⚠️</span>
                            <span>Reported Hazard</span>
                          </div>
                          <h4 className="font-bold text-gray-900 dark:text-gray-100">{loc.category}</h4>
                          <p className="text-gray-600 dark:text-gray-400 mt-0.5">{loc.location}</p>
                          <p className="text-[10px] text-amber-800 font-bold mt-1">Risk at {loc.timeOfDay}</p>
                        </div>
                      </Popup>
                    </Marker>
                  ))
                )}
              </MapContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SafetyMap;