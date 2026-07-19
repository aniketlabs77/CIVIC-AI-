import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg shadow-lg p-12">
        <h1 className="text-4xl font-bold mb-4">Welcome to NagarSeva</h1>
        <p className="text-xl mb-6">
          A platform to report civic grievances and track their resolution
        </p>
        <Link
          to="/report"
          className="inline-block bg-white text-blue-600 font-bold py-3 px-8 rounded-lg hover:bg-blue-50 transition"
        >
          Report an Issue
        </Link>
      </section>

      {/* Features Section */}
      <section className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
          <div className="text-4xl mb-4">📋</div>
          <h2 className="text-xl font-bold mb-2">Report Issues</h2>
          <p className="text-gray-600">
            Easily report civic problems like road damage, water issues, and more.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
          <div className="text-4xl mb-4">🔍</div>
          <h2 className="text-xl font-bold mb-2">Track Status</h2>
          <p className="text-gray-600">
            Monitor the status of your complaints in real-time.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
          <div className="text-4xl mb-4">📊</div>
          <h2 className="text-xl font-bold mb-2">View Dashboard</h2>
          <p className="text-gray-600">
            See all public complaints and their resolution status.
          </p>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-gray-100 rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Get Started</h2>
        <p className="text-gray-600 mb-6">
          Help improve your city by reporting issues you encounter
        </p>
        <div className="flex justify-center gap-4">
          <Link
            to="/report"
            className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition"
          >
            Report Now
          </Link>
          <Link
            to="/dashboard"
            className="bg-gray-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-700 transition"
          >
            View Dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}
