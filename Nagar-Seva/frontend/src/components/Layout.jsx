import React from 'react';
import Navbar from './Navbar';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="bg-gray-800 text-white text-center py-4 mt-8">
        <p>&copy; 2024 NagarSeva. All rights reserved.</p>
      </footer>
    </div>
  );
}
