import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-4">Report. Track. Resolve.</h1>
        <p className="text-xl text-gray-600 mb-8">NagarSeva empowers citizens to report civic issues with location and photos.</p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/report" className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition">Report an Issue</Link>
          <Link to="/dashboard" className="bg-gray-200 text-gray-800 px-8 py-3 rounded-lg hover:bg-gray-300 transition">View Dashboard</Link>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16">
        <div className="bg-white rounded-lg shadow p-4 text-center"><p className="text-2xl font-bold text-blue-600">1.2K+</p><p className="text-sm text-gray-600">Complaints Resolved</p></div>
        <div className="bg-white rounded-lg shadow p-4 text-center"><p className="text-2xl font-bold text-blue-600">98%</p><p className="text-sm text-gray-600">Citizen Satisfaction</p></div>
        <div className="bg-white rounded-lg shadow p-4 text-center"><p className="text-2xl font-bold text-blue-600">24/7</p><p className="text-sm text-gray-600">AI-Powered Routing</p></div>
        <div className="bg-white rounded-lg shadow p-4 text-center"><p className="text-2xl font-bold text-blue-600">5</p><p className="text-sm text-gray-600">Active Wards</p></div>
      </div>
    </div>
  );
}