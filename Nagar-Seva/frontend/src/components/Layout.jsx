import React from 'react';
import Navbar from './Navbar';
import AiAssistant from './AiAssistant';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-canvas dark:bg-dark text-gray-900 dark:text-gray-100 flex flex-col selection:bg-accent-light dark:selection:bg-accent-dark selection:text-accent dark:selection:text-white transition-colors duration-200">
      <Navbar />
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
      <AiAssistant />
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 text-center text-xs text-gray-400 dark:text-gray-500 border-t border-gray-200/60 dark:border-gray-800/60 mt-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-medium text-gray-500 dark:text-gray-400">
            © 2026 NagarSeva. Smart Municipal Grievance & Civic Intelligence Platform.
          </p>
          <div className="flex items-center gap-4 text-gray-400 dark:text-gray-600">
            <span>Powered by Gemini 1.5 Flash</span>
            <span>•</span>
            <span>Civic Trust Protocol</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
