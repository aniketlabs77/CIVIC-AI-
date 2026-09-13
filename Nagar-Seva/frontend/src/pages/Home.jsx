import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Home() {
  const { t } = useTranslation();

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Hero Section Card */}
      <section className="bg-white dark:bg-gray-800 rounded-3xl p-8 sm:p-14 shadow-card dark:shadow-none border border-gray-100 dark:border-gray-700/80 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="max-w-xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-accent-light text-accent border border-accent-subtle">
            <span>✨ {t('geminiPowered', 'Gemini 1.5 Powered Civic Intelligence')}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-gray-900 dark:text-gray-100 tracking-tight leading-tight">
            {t('heroTitle', 'Transparent Municipal Action & Civic Trust')}
          </h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 leading-relaxed">
            {t('heroSubtitle', 'Report civic grievances, automatically route tickets with Google Gemini AI, inspect real-time streetlight & safety road maps, and track verified resolution proof.')}
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to="/report"
              className="px-6 py-3 rounded-full bg-dark hover:bg-dark-hover text-white text-xs sm:text-sm font-bold shadow-md dark:shadow-none transition"
            >
              Report an Issue
            </Link>
            <Link
              to="/dashboard"
              className="px-6 py-3 rounded-full bg-white dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 text-xs sm:text-sm font-bold shadow-xs transition"
            >
              View Public Dashboard
            </Link>
          </div>
        </div>

        <div className="w-full max-w-sm bg-gradient-to-br from-accent-light/60 to-accent-subtle/30 rounded-3xl p-6 border border-accent-subtle/40 flex flex-col gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center text-white text-3xl shadow-float mx-auto">
            🏛️
          </div>
          <div>
            <h3 className="font-extrabold text-base text-gray-900 dark:text-gray-100">City Operations Hub</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Real-time synchronization between citizens and municipal authorities.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-accent-subtle/50 text-left">
            <div className="bg-white dark:bg-gray-800/80 p-2.5 rounded-xl">
              <span className="text-[10px] font-bold text-gray-400 uppercase">AI Vision</span>
              <p className="text-xs font-bold text-gray-900 dark:text-gray-100 mt-0.5">Auto-Verified</p>
            </div>
            <div className="bg-white dark:bg-gray-800/80 p-2.5 rounded-xl">
              <span className="text-[10px] font-bold text-gray-400 uppercase">SLA Window</span>
              <p className="text-xs font-bold text-accent mt-0.5">5m Escalation</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="grid md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-7 shadow-card dark:shadow-none border border-gray-100 dark:border-gray-700/60 transition hover:shadow-card dark:shadow-none-hover flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-accent-light flex items-center justify-center text-2xl mb-4 border border-accent-subtle/40">
              📋
            </div>
            <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100 tracking-tight mb-2">
              Instant AI Grievance Filing
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Upload photos of potholes, dark streetlights, or waste. Gemini AI categorizes, summarizes, and dispatches to the correct ward department.
            </p>
          </div>
          <Link to="/report" className="mt-6 text-xs font-bold text-accent hover:underline inline-flex items-center gap-1">
            File Grievance →
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-3xl p-7 shadow-card dark:shadow-none border border-gray-100 dark:border-gray-700/60 transition hover:shadow-card dark:shadow-none-hover flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-2xl mb-4 border border-emerald-100">
              🛡️
            </div>
            <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100 tracking-tight mb-2">
              Safe Route Navigator
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Navigate city streets with real road geometry that dynamically highlights and avoids unlit streetlight corridors and reported night hazards.
            </p>
          </div>
          <Link to="/safety" className="mt-6 text-xs font-bold text-emerald-700 hover:underline inline-flex items-center gap-1">
            Explore Safety Map →
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-3xl p-7 shadow-card dark:shadow-none border border-gray-100 dark:border-gray-700/60 transition hover:shadow-card dark:shadow-none-hover flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-2xl mb-4 border border-amber-100">
              📊
            </div>
            <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100 tracking-tight mb-2">
              Transparent Ward Metrics
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Inspect live resolution rates, average repair times, and ward efficiency rankings on the city-wide public overview dashboard.
            </p>
          </div>
          <Link to="/dashboard" className="mt-6 text-xs font-bold text-amber-700 hover:underline inline-flex items-center gap-1">
            View Analytics →
          </Link>
        </div>
      </section>
    </div>
  );
}
