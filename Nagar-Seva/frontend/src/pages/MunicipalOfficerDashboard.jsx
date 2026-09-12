import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
} from 'recharts';
import PublicDashboard from './PublicDashboard';

// -------------------------------------------------------------
// Department Specifications & Telemetry Data
// -------------------------------------------------------------
export const MUNICIPAL_OFFICER_DEPARTMENTS = [
  {
    id: 'PWD_ROADS',
    key: 'roads',
    name: 'Public Works & Road Infrastructure (PWD)',
    shortName: 'PWD & Roads',
    badge: 'Civil Works Division',
    icon: '🛣️',
    accentColor: '#7c5cff',
    secondaryColor: '#6366f1',
    description: 'Pothole patch queue, asphalt plant inventory, bridge structural health & road gang telemetry',
    kpis: [
      { label: 'Potholes / Road Distress', value: '84', change: '-12% this week', trend: 'down', status: 'In Progress', statusColor: 'bg-amber-50 text-amber-700 border-amber-200' },
      { label: 'Avg Repair Turnaround', value: '18.4 hrs', change: '-2.1 hrs vs target', trend: 'good', status: 'Within SLA', statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      { label: 'Active Road Gangs', value: '7 Teams', change: '2 on standby', trend: 'neutral', status: 'Field Active', statusColor: 'bg-blue-50 text-blue-700 border-blue-200' },
      { label: 'Road Quality Index (RQI)', value: '88.4 / 100', change: '+3.6 pts MoM', trend: 'up', status: 'Optimal', statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      { label: 'Hot-Mix Bitumen Stock', value: '420 Tons', change: 'Yard Capacity 70%', trend: 'neutral', status: 'Sufficient', statusColor: 'bg-violet-50 text-violet-700 border-violet-200' },
      { label: 'Overdue Road Work Orders', value: '3', change: 'Requires intervention', trend: 'bad', status: 'Action Needed', statusColor: 'bg-rose-50 text-rose-700 border-rose-200' },
    ],
    chartTitle: 'Weekly Pothole Patching vs Reported Volume',
    chartData: [
      { day: 'Mon', reported: 18, repaired: 15, pending: 3 },
      { day: 'Tue', reported: 14, repaired: 16, pending: 1 },
      { day: 'Wed', reported: 22, repaired: 19, pending: 4 },
      { day: 'Thu', reported: 19, repaired: 21, pending: 2 },
      { day: 'Fri', reported: 25, repaired: 23, pending: 4 },
      { day: 'Sat', reported: 12, repaired: 14, pending: 2 },
      { day: 'Sun', reported: 8, repaired: 10, pending: 0 },
    ],
    chart2Title: 'Road Distress Distribution by Ward Severity',
    chart2Data: [
      { name: 'Ward 1 (Central)', majorCracks: 8, potholes: 14, resurfacingKm: 2.4 },
      { name: 'Ward 2 (Industrial)', majorCracks: 14, potholes: 22, resurfacingKm: 4.1 },
      { name: 'Ward 3 (Residential)', majorCracks: 5, potholes: 11, resurfacingKm: 1.2 },
      { name: 'Ward 4 (Suburbs)', majorCracks: 9, potholes: 18, resurfacingKm: 3.5 },
      { name: 'Ward 5 (Old City)', majorCracks: 12, potholes: 19, resurfacingKm: 2.8 },
    ],
    alerts: [
      {
        id: 'pwd-1',
        time: '12 mins ago',
        severity: 'CRITICAL',
        title: 'Major Road Cavity Detected on MG Road',
        desc: 'Sub-base soil erosion near Metro Pillar 142 (Ward 2). Rapid-cure bitumen gang #3 deployed with barricading.',
        action: 'View Camera',
      },
      {
        id: 'pwd-2',
        time: '45 mins ago',
        severity: 'WARNING',
        title: 'Expansion Joint Wear - Outer Ring Flyover',
        desc: 'Vibration sensors crossed threshold at Span 4. Structural engineer inspection scheduled for 22:00 tonight.',
        action: 'Review Telemetry',
      },
      {
        id: 'pwd-3',
        time: '2 hrs ago',
        severity: 'RESOLVED',
        title: 'Emergency Patching Completed - Vikas Marg',
        desc: 'Catering lane 4 pothole closed. After-repair photo submitted and verified by AI vision pipeline.',
        action: 'Audit Proof',
      },
    ],
    workOrders: [
      { id: 'WO-8821', location: 'MG Road Junction, Ward 2', type: 'Deep Cavity Patch', gang: 'Gang #3 (Rapid)', status: 'EN_ROUTE', sla: '1h 15m left' },
      { id: 'WO-8820', location: 'Ring Road Service Lane, Ward 4', type: 'Asphalt Resurfacing', gang: 'Gang #1 (Heavy)', status: 'IN_PROGRESS', sla: '3h 40m left' },
      { id: 'WO-8819', location: 'Gandhi Nagar Main Rd, Ward 1', type: 'Manhole Rim Leveling', gang: 'Gang #5 (Civil)', status: 'QUALITY_CHECK', sla: 'Completed' },
      { id: 'WO-8818', location: 'Airport Expressway Km 12', type: 'Paver Block Realignment', gang: 'Gang #2 (Highway)', status: 'RESOLVED', sla: 'Closed on time' },
    ],
    quickActions: [
      { id: 'dispatch_gang', label: 'Deploy Rapid Road Gang', icon: '🚜', desc: 'Dispatch hot-mix repair truck to emergency site' },
      { id: 'request_diversion', label: 'Request Traffic Police Diversion', icon: '🚦', desc: 'Coordinate cordon for heavy resurfacing' },
      { id: 'bitumen_dispatch', label: 'Order Yard Bitumen Stock', icon: '📦', desc: 'Replenish hot-mix asphalt batching plant' },
    ],
  },
  {
    id: 'SANITATION_WASTE',
    key: 'sanitation',
    name: 'Solid Waste & Sanitation Department',
    shortName: 'Sanitation & Waste',
    badge: 'Swachh City Operations',
    icon: '🗑️',
    accentColor: '#10b981',
    secondaryColor: '#059669',
    description: 'Live compactor fleet GPS, smart bin IoT level sensors, landfill capacity & waste segregation tracking',
    kpis: [
      { label: 'Daily Waste Collected', value: '142.8 MT', change: '94% of daily target', trend: 'good', status: 'On Track', statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      { label: 'Active Compactor Fleet', value: '38 / 42 Trucks', change: '4 undergoing scheduled service', trend: 'neutral', status: '90.4% Fleet Active', statusColor: 'bg-blue-50 text-blue-700 border-blue-200' },
      { label: 'Smart Bin Overflow Alerts', value: '6 Bins', change: 'Triggered >90% fill sensor', trend: 'bad', status: 'Urgent Action', statusColor: 'bg-rose-50 text-rose-700 border-rose-200' },
      { label: 'Waste Segregation Rate', value: '78.2%', change: '+4.5% vs last month', trend: 'up', status: 'Grade A', statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      { label: 'Sanitary Landfill Capacity', value: '64.1%', change: 'Safe operations zone', trend: 'good', status: 'Moderate', statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      { label: 'Commercial Waste Cleared', value: '38 Bins', change: 'Night shifts complete', trend: 'neutral', status: '100% Cleared', statusColor: 'bg-violet-50 text-violet-700 border-violet-200' },
    ],
    chartTitle: 'Hourly Municipal Waste Collection Inflow (Metric Tons)',
    chartData: [
      { day: '06:00', reported: 8, repaired: 8, tonnage: 8.2 },
      { day: '08:00', reported: 24, repaired: 22, tonnage: 24.5 },
      { day: '10:00', reported: 36, repaired: 34, tonnage: 36.1 },
      { day: '12:00', reported: 28, repaired: 26, tonnage: 28.4 },
      { day: '14:00', reported: 18, repaired: 17, tonnage: 18.2 },
      { day: '16:00', reported: 19, repaired: 18, tonnage: 19.3 },
      { day: '18:00', reported: 8, repaired: 8, tonnage: 8.1 },
    ],
    chart2Title: 'Waste Stream Characterization & Sorting',
    chart2Data: [
      { name: 'Organic Wet Waste', value: 58, fill: '#10b981' },
      { name: 'Dry Recyclables (Plastic/Paper)', value: 27, fill: '#3b82f6' },
      { name: 'Hazardous / Electronic', value: 9, fill: '#f59e0b' },
      { name: 'Construction Debris', value: 6, fill: '#8b5cf6' },
    ],
    alerts: [
      {
        id: 'san-1',
        time: '8 mins ago',
        severity: 'CRITICAL',
        title: 'Smart Bin #42 Exceeded 95% Capacity',
        desc: 'Central Vegetable Market bin sensor triggered high overflow warning. Compactor truck DL-04 re-routed.',
        action: 'Dispatch Truck',
      },
      {
        id: 'san-2',
        time: '30 mins ago',
        severity: 'WARNING',
        title: 'Unauthorized Waste Dumping Alert - Underpass',
        desc: 'AI city camera flagged commercial debris dumping at Railway Underpass (Ward 3). Sanitation Squad #2 on route.',
        action: 'Issue Fine',
      },
      {
        id: 'san-3',
        time: '3 hrs ago',
        severity: 'NORMAL',
        title: 'Bio-Medical Waste Handover Complete',
        desc: 'All 14 city health dispensaries cleared with digital manifest and barcoded waste containers.',
        action: 'View Manifest',
      },
    ],
    workOrders: [
      { id: 'FL-0412', location: 'Sector 14 Central Market', type: 'Bin #42 Overflow Clearance', gang: 'Compactor DL-04', status: 'EN_ROUTE', sla: '25m left' },
      { id: 'FL-0408', location: 'Civic Centre Food Plaza', type: 'Wet Waste Compaction', gang: 'Compactor DL-09', status: 'IN_PROGRESS', sla: '45m left' },
      { id: 'FL-0402', location: 'Industrial Area Phase 2', type: 'Commercial Skip Exchange', gang: 'Dumper DL-14', status: 'QUALITY_CHECK', sla: 'Completed' },
      { id: 'FL-0399', location: 'Model Town Ward 5', type: 'Door-to-Door Route #12', gang: 'Electric Tipper #6', status: 'RESOLVED', sla: 'Completed on time' },
    ],
    quickActions: [
      { id: 'reroute_compactor', label: 'Reroute Nearest Compactor Truck', icon: '🚛', desc: 'Auto-dispatch idle truck to overflowing IoT bin' },
      { id: 'deploy_sanitation_squad', label: 'Deploy Emergency Sanitation Squad', icon: '🧹', desc: 'Immediate ground sanitization & deep cleaning' },
      { id: 'sanitation_notice', label: 'Issue Illegal Dumping Penalty', icon: '⚖️', desc: 'Generate municipal fine from AI video evidence' },
    ],
  },
  {
    id: 'JAL_BOARD',
    key: 'water',
    name: 'Municipal Water & Sewage Board (Jal Sansthan)',
    shortName: 'Water & Sewage',
    badge: 'Potable Network & SCADA Hub',
    icon: '🚰',
    accentColor: '#0ea5e9',
    secondaryColor: '#0284c7',
    description: 'Pipeline water pressure SCADA telemetry, potable purity index, sewer blockage alarms & tanker dispatch',
    kpis: [
      { label: 'Potable Water Distributed', value: '48.2 MLD', change: 'Million Liters / Day', trend: 'good', status: '100% Demand Met', statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      { label: 'Trunk Pipeline Pressure', value: '2.45 Bar', change: 'Target: 2.2 - 2.6 Bar', trend: 'good', status: 'Stable', statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      { label: 'Active Pipe Leaks / Bursts', value: '3 Locations', change: 'Isolation valves engaged', trend: 'bad', status: 'Repair Underway', statusColor: 'bg-rose-50 text-rose-700 border-rose-200' },
      { label: 'Water Potability (TDS)', value: '142 ppm', change: 'WHO threshold < 300 ppm', trend: 'up', status: 'Certified Pure', statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      { label: 'STP Plant Inflow Load', value: '78.4%', change: 'Rated Capacity 60 MLD', trend: 'neutral', status: 'Normal Intake', statusColor: 'bg-blue-50 text-blue-700 border-blue-200' },
      { label: 'Emergency Water Tankers', value: '14 Active', change: '5 available on standby', trend: 'neutral', status: 'Serving Deficit', statusColor: 'bg-violet-50 text-violet-700 border-violet-200' },
    ],
    chartTitle: '24-Hour City-Wide Water Main Pressure Profile (Bar)',
    chartData: [
      { day: '00:00', reported: 2.1, repaired: 2.2, pressure: 2.1 },
      { day: '04:00', reported: 2.6, repaired: 2.5, pressure: 2.6 },
      { day: '08:00', reported: 2.4, repaired: 2.3, pressure: 2.4 },
      { day: '12:00', reported: 2.2, repaired: 2.1, pressure: 2.2 },
      { day: '16:00', reported: 2.5, repaired: 2.4, pressure: 2.5 },
      { day: '20:00', reported: 2.4, repaired: 2.3, pressure: 2.4 },
      { day: '23:59', reported: 2.2, repaired: 2.2, pressure: 2.2 },
    ],
    chart2Title: 'Ward-wise Water Deficit & Tanker Deliveries',
    chart2Data: [
      { name: 'Ward 1', pipedSupplyMLD: 10.5, tankerDeficitMLD: 0.2 },
      { name: 'Ward 2', pipedSupplyMLD: 12.1, tankerDeficitMLD: 0.8 },
      { name: 'Ward 3', pipedSupplyMLD: 8.9, tankerDeficitMLD: 0.1 },
      { name: 'Ward 4', pipedSupplyMLD: 9.4, tankerDeficitMLD: 0.6 },
      { name: 'Ward 5', pipedSupplyMLD: 7.3, tankerDeficitMLD: 1.1 },
    ],
    alerts: [
      {
        id: 'jal-1',
        time: '5 mins ago',
        severity: 'CRITICAL',
        title: 'Telemetry Pressure Drop in Sector 9 Trunk Line',
        desc: 'SCADA detected -0.7 Bar sudden drop at Node B-14. Remote sluice valve #4 closed automatically to prevent flood.',
        action: 'Isolate Sector',
      },
      {
        id: 'jal-2',
        time: '25 mins ago',
        severity: 'WARNING',
        title: 'Manhole Overflow Sensor Triggered - Ward 1',
        desc: 'Stormwater drainage silt buildup near Market Circle. Super-sucker jetting truck J-08 dispatched.',
        action: 'Deploy Jetting',
      },
      {
        id: 'jal-3',
        time: '1 hr ago',
        severity: 'NORMAL',
        title: 'Potability & Chlorine Testing Passed',
        desc: 'Residual free chlorine at WTP #3 measured 0.45 mg/L, exceeding national safety standard.',
        action: 'Download Lab Cert',
      },
    ],
    workOrders: [
      { id: 'TK-1092', location: 'Sector 8 High-Rise Blocks', type: 'Emergency 5000L Potable Supply', gang: 'Tanker TK-05', status: 'EN_ROUTE', sla: '15m left' },
      { id: 'LK-3011', location: 'Main Bypass Pipeline Km 4', type: 'C.I. Pipe Crack Weld', gang: 'Hydraulic Crew #2', status: 'IN_PROGRESS', sla: '2h 10m left' },
      { id: 'JT-0941', location: 'Shastri Nagar Drain #2', type: 'Super-Sucker De-silting', gang: 'Jetting Unit J-08', status: 'QUALITY_CHECK', sla: 'Completed' },
      { id: 'VL-0024', location: 'Booster Pump Station 1B', type: 'Impeller Gasket Replacement', gang: 'Station Maintenance', status: 'RESOLVED', sla: 'Operational' },
    ],
    quickActions: [
      { id: 'dispatch_tanker', label: 'Dispatch Emergency 5000L Tanker', icon: '🚚', desc: 'Deploy GPS-tracked water tanker to deficit locality' },
      { id: 'isolate_pipeline', label: 'Remote SCADA Valve Isolation', icon: '🎛️', desc: 'Shut sluice gates on burst main to stop wastage' },
      { id: 'deploy_jetting', label: 'Deploy Super-Sucker Jetting Machine', icon: '🌊', desc: 'High-pressure sewer and drain unblocking unit' },
    ],
  },
];

export default function MunicipalOfficerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Determine initial department based on logged in user's assigned department
  const initialDeptKey = useMemo(() => {
    const userDept = (user?.department || '').toLowerCase();
    if (userDept.includes('sanitation') || userDept.includes('waste')) return 'sanitation';
    if (userDept.includes('water') || userDept.includes('jal') || userDept.includes('sewage')) return 'water';
    return 'roads'; // Default to PWD & Roads
  }, [user]);

  const [activeDeptKey, setActiveDeptKey] = useState(initialDeptKey);
  const [viewPublicMode, setViewPublicMode] = useState(false);
  const [adminComplaints, setAdminComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);
  const [actionHistory, setActionHistory] = useState([]);

  // Get the active department object
  const activeDept = useMemo(() => {
    return MUNICIPAL_OFFICER_DEPARTMENTS.find((d) => d.key === activeDeptKey) || MUNICIPAL_OFFICER_DEPARTMENTS[0];
  }, [activeDeptKey]);

  // Fetch real complaints from backend to show live integration
  useEffect(() => {
    fetchLiveComplaints();
  }, [activeDeptKey]);

  const fetchLiveComplaints = async () => {
    setLoadingComplaints(true);
    try {
      const res = await apiClient.get('/api/admin/complaints', {
        params: { page: 0, size: 5 },
      });
      let data = res.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          data = {};
        }
      }
      const list = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : [];
      // Filter complaints matching this department's domain
      const relevant = list.filter((c) => {
        const cat = (c.category || '').toLowerCase();
        const auth = (c.routedAuthority || '').toLowerCase();
        if (activeDeptKey === 'roads') return cat.includes('road') || cat.includes('pothole') || auth.includes('pwd');
        if (activeDeptKey === 'sanitation') return cat.includes('garbage') || cat.includes('waste') || cat.includes('dump');
        if (activeDeptKey === 'water') return cat.includes('drain') || cat.includes('water') || cat.includes('sewage');
        return true;
      });
      setAdminComplaints(relevant.length > 0 ? relevant : list.slice(0, 3));
    } catch (err) {
      console.warn('Notice fetching live complaints:', err);
    } finally {
      setLoadingComplaints(false);
    }
  };

  const handleTriggerQuickAction = (action) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const logItem = {
      id: Date.now(),
      title: `${action.label} Triggered`,
      dept: activeDept.shortName,
      time: timestamp,
      status: 'DISPATCHED',
    };
    setActionHistory((prev) => [logItem, ...prev.slice(0, 4)]);
    setActionNotice({
      title: action.label,
      msg: `Dispatch protocol initiated. Field team and telemetry updated for ${activeDept.shortName}.`,
    });
    setTimeout(() => {
      setActionNotice(null);
    }, 4500);
  };

  // If officer clicks "View Public Citizen View" toggle
  if (viewPublicMode) {
    return (
      <div className="space-y-4">
        {/* Banner informing the officer that they are previewing citizen mode */}
        <div className="max-w-6xl mx-auto p-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl flex items-center justify-between shadow-md dark:shadow-none">
          <div className="flex items-center gap-3">
            <span className="text-2xl">👁️</span>
            <div>
              <p className="text-sm font-extrabold tracking-wide">Public Citizen View Preview</p>
              <p className="text-xs text-violet-100">
                Viewing public-facing analytics as seen by general citizens.
              </p>
            </div>
          </div>
          <button
            onClick={() => setViewPublicMode(false)}
            className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-100 text-xs font-bold rounded-full transition shadow-sm dark:shadow-none inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span>🏛️</span>
            <span>Return to Municipal Command Center</span>
          </button>
        </div>
        <PublicDashboard />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-7 pb-16 px-2 sm:px-4">
      {/* ------------------------------------------------------------- */}
      {/* 1. Header & Command Center Identification Banner */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 shadow-card dark:shadow-none border border-gray-100 dark:border-gray-700/90 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-gradient-to-br from-violet-100/40 to-indigo-50/20 blur-2xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-50 border border-violet-200/80 rounded-full text-violet-800 text-xs font-extrabold">
              <span className="animate-pulse w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>LIVE MUNICIPAL OPERATIONS HUB</span>
              <span className="text-gray-300">|</span>
              <span className="text-gray-600 dark:text-gray-400 font-semibold">{user?.department || 'Municipal Officer'}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-3">
              <span>{activeDept.icon}</span>
              <span>{activeDept.name}</span>
            </h1>

            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed">
              {activeDept.description}
            </p>
          </div>

          {/* Action Hub Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setViewPublicMode(true)}
              className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 text-xs font-bold rounded-full transition shadow-xs inline-flex items-center gap-2 cursor-pointer"
              title="Preview what ordinary citizens see on the public dashboard"
            >
              <span>👁️</span>
              <span>Preview Public View</span>
            </button>

            <Link
              to="/admin"
              className="px-4 py-2.5 bg-gradient-to-r from-[#7c5cff] to-[#6366f1] hover:from-[#6949f5] hover:to-[#4f46e5] text-white text-xs font-bold rounded-full transition shadow-md dark:shadow-none inline-flex items-center gap-2 cursor-pointer"
            >
              <span>✅</span>
              <span>Resolve Issue</span>
            </Link>

            <button
              onClick={fetchLiveComplaints}
              className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:bg-gray-900 rounded-full transition shadow-xs cursor-pointer"
              title="Refresh telemetry"
            >
              🔄
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 2. Department Selector Navigation Tabs */}
        {/* ------------------------------------------------------------- */}
        <div className="mt-7 pt-5 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
              Switch Municipal Operations Department:
            </span>
            <span className="text-[11px] text-[#7c5cff] font-bold">
              3 Specialized Department Hubs Available
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {MUNICIPAL_OFFICER_DEPARTMENTS.map((dept) => {
              const isSelected = dept.key === activeDeptKey;
              return (
                <button
                  key={dept.id}
                  onClick={() => setActiveDeptKey(dept.key)}
                  className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex items-start gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-br from-violet-50/90 to-indigo-50/60 border-[#7c5cff] shadow-sm dark:shadow-none ring-2 ring-[#7c5cff]/20'
                      : 'bg-gray-50 dark:bg-gray-900/80 hover:bg-gray-100/90 border-gray-200 dark:border-gray-700/80 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 shadow-xs border border-gray-100 dark:border-gray-700 flex items-center justify-center text-xl shrink-0">
                    {dept.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs font-black truncate ${isSelected ? 'text-violet-900' : 'text-gray-900 dark:text-gray-100'}`}>
                        {dept.shortName}
                      </p>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-[#7c5cff] shrink-0"></span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {dept.badge}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-2xl flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="text-xl">✅</span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Operational Command Executed</p>
              <p className="text-xs text-emerald-700 mt-0.5">{actionNotice.msg}</p>
            </div>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-xs font-bold text-emerald-800 hover:text-emerald-950 px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. Real-Time Operational KPI Grid */}
      {/* ------------------------------------------------------------- */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <span>⚡</span>
            <span>Department KPI Metrics & SLA Vital Signs</span>
          </h2>
          <span className="text-xs text-gray-400 font-medium">Auto-updated via municipal SCADA telemetry</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeDept.kpis.map((kpi, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-none border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:border-gray-700 transition-all hover:shadow-md dark:shadow-none"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 leading-tight">
                  {kpi.label}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${kpi.statusColor}`}>
                  {kpi.status}
                </span>
              </div>

              <div className="mt-2.5 flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
                  {kpi.value}
                </span>
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
                  {kpi.change}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. Interactive Analytical Visualizations */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Time Series / Trend Analysis */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
                {activeDept.chartTitle}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Real-time municipal capacity monitoring</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 rounded-full border border-gray-200 dark:border-gray-700">
              Live Feed
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {activeDeptKey === 'water' ? (
                <AreaChart data={activeDept.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pressureGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[1.5, 3.0]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px', borderColor: '#e2e8f0' }} />
                  <Area type="monotone" dataKey="pressure" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#pressureGrad)" name="Line Pressure (Bar)" />
                </AreaChart>
              ) : activeDeptKey === 'sanitation' ? (
                <AreaChart data={activeDept.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tonnageGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px', borderColor: '#e2e8f0' }} />
                  <Area type="monotone" dataKey="tonnage" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#tonnageGrad)" name="Tons Collected" />
                </AreaChart>
              ) : (
                <BarChart data={activeDept.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px', borderColor: '#e2e8f0' }} />
                  <Bar dataKey="repaired" fill="#7c5cff" radius={[4, 4, 0, 0]} name="Patched & Resolved" />
                  <Bar dataKey="reported" fill="#e4dcff" radius={[4, 4, 0, 0]} name="Reported Volume" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Domain Breakdown / Ward Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
                {activeDept.chart2Title}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Ward-level allocation & division load</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-violet-50 text-violet-700 rounded-full border border-violet-100">
              Departmental
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {activeDeptKey === 'sanitation' ? (
                <PieChart>
                  <Pie
                    data={activeDept.chart2Data}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {activeDept.chart2Data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px', borderColor: '#e2e8f0' }} />
                </PieChart>
              ) : activeDeptKey === 'water' ? (
                <BarChart data={activeDept.chart2Data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px', borderColor: '#e2e8f0' }} />
                  <Bar dataKey="pipedSupplyMLD" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Piped Water (MLD)" />
                  <Bar dataKey="tankerDeficitMLD" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Emergency Tanker (MLD)" />
                </BarChart>
              ) : (
                <BarChart data={activeDept.chart2Data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px', borderColor: '#e2e8f0' }} />
                  <Bar dataKey="potholes" fill="#7c5cff" radius={[4, 4, 0, 0]} name="Potholes" />
                  <Bar dataKey="majorCracks" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Major Cracks" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Legend for pie or categories */}
          {activeDeptKey === 'sanitation' && (
            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 text-[11px]">
              {activeDept.chart2Data.map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.fill }}></span>
                  <span className="truncate">{item.name}: <b>{item.value}%</b></span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. Live Operations Center: Alerts + Work Orders */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Active Field Work Orders & Dispatches */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-gray-700 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-2">
                <span>📋</span>
                <span>Active Work Orders & Crew Dispatches</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Real-time status of assigned field contractors and units</p>
            </div>
            <Link
              to="/admin"
              className="text-xs font-bold text-[#7c5cff] hover:underline"
            >
              Open Full Master Queue →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-3 font-semibold">Order ID</th>
                  <th className="pb-3 font-semibold">Location / Scope</th>
                  <th className="pb-3 font-semibold">Assigned Unit</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">SLA Window</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-medium">
                {activeDept.workOrders.map((wo) => (
                  <tr key={wo.id} className="hover:bg-gray-50 dark:bg-gray-900/80 transition-colors">
                    <td className="py-3 font-bold text-gray-900 dark:text-gray-100">{wo.id}</td>
                    <td className="py-3">
                      <p className="font-semibold text-gray-800 dark:text-gray-200">{wo.type}</p>
                      <p className="text-[11px] text-gray-400">{wo.location}</p>
                    </td>
                    <td className="py-3 text-gray-600 dark:text-gray-400 font-semibold">{wo.gang}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        wo.status === 'EN_ROUTE' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                        wo.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                        wo.status === 'QUALITY_CHECK' ? 'bg-violet-50 text-violet-800 border border-violet-200' :
                        'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}>
                        {wo.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 text-gray-500 dark:text-gray-400 font-bold text-[11px]">{wo.sla}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column (1 Col): Live SCADA / IoT Telemetry Stream */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-gray-700 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-2">
              <span>📡</span>
              <span>SCADA & Sensor Alarms</span>
            </h3>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          </div>

          <div className="space-y-3">
            {activeDept.alerts.map((alert) => (
              <div
                key={alert.id}
                className="p-3.5 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 hover:bg-white dark:bg-gray-800 hover:shadow-xs transition space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    alert.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800' :
                    alert.severity === 'WARNING' ? 'bg-amber-100 text-amber-800' :
                    'bg-emerald-100 text-emerald-800'
                  }`}>
                    {alert.severity}
                  </span>
                  <span className="text-[10px] text-gray-400">{alert.time}</span>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-gray-100 leading-snug">{alert.title}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{alert.desc}</p>
                </div>

                <div className="pt-1 flex justify-end">
                  <button
                    onClick={() => handleTriggerQuickAction({ label: alert.action })}
                    className="text-[11px] font-bold text-[#7c5cff] hover:text-[#6949f5] cursor-pointer"
                  >
                    {alert.action} →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 6. Live Backend Complaints Assigned to this Domain */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-gray-700 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-2">
              <span>⚡</span>
              <span>Real Citizen Complaints Linked to this Department ({activeDept.shortName})</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Live data from NagarSeva municipal database processed via Gemini AI auto-routing
            </p>
          </div>
          <Link
            to="/admin"
            className="px-4 py-2 rounded-full bg-violet-50 text-[#7c5cff] hover:bg-violet-100 text-xs font-bold transition border border-violet-100"
          >
            Resolve Issues →
          </Link>
        </div>

        {loadingComplaints ? (
          <div className="py-8 text-center text-gray-400 text-xs flex items-center justify-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-[#7c5cff] border-t-transparent animate-spin"></div>
            <span>Syncing complaints with municipal database...</span>
          </div>
        ) : adminComplaints.length === 0 ? (
          <div className="py-8 text-center bg-gray-50 dark:bg-gray-900 rounded-2xl text-xs text-gray-500 dark:text-gray-400">
            No active unresolved grievances currently pending in this department's queue.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {adminComplaints.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 hover:bg-white dark:bg-gray-800 hover:shadow-xs transition space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black text-gray-400">#{c.id}</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      c.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      c.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {c.status}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{c.category}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">{c.description}</p>
                  <p className="text-[10px] text-gray-400 mt-1">📍 {c.location} ({c.ward})</p>
                </div>

                <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-rose-600">
                    {c.escalated ? '⚠️ Escalated SLA' : 'Standard SLA'}
                  </span>
                  <Link
                    to="/admin"
                    className="text-[11px] font-extrabold text-[#7c5cff] hover:underline"
                  >
                    Resolve Issue →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 7. Municipal Rapid Action Dispatch Bar */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-3xl p-6 sm:p-7 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white dark:bg-gray-800/10 rounded-full text-xs font-bold mb-2">
              <span>🚨</span>
              <span>Direct Municipal Operational Dispatch</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black tracking-tight">
              Rapid Response Protocol ({activeDept.shortName})
            </h3>
            <p className="text-xs text-gray-300 mt-1 max-w-xl">
              Trigger high-priority emergency equipment, assign contractor gangs, or send automated sensor alerts.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {activeDept.quickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleTriggerQuickAction(action)}
                className="px-4 py-2.5 bg-white dark:bg-gray-800/10 hover:bg-white dark:bg-gray-800 text-white hover:text-gray-900 dark:text-gray-100 text-xs font-bold rounded-2xl transition border border-white/20 shadow-xs inline-flex items-center gap-2 cursor-pointer"
              >
                <span>{action.icon}</span>
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Action Log History */}
        {actionHistory.length > 0 && (
          <div className="mt-5 pt-4 border-t border-white/10">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Recent Dispatch Log:</p>
            <div className="flex flex-wrap gap-2">
              {actionHistory.map((item) => (
                <span
                  key={item.id}
                  className="text-[11px] bg-white dark:bg-gray-800/5 border border-white/10 px-3 py-1 rounded-full text-gray-300 font-medium inline-flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>{item.title}</span>
                  <span className="text-gray-500 dark:text-gray-400">({item.time})</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
