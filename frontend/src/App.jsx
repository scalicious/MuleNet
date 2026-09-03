import React from 'react';
import Header from './components/Header';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navigation / Header */}
      <Header />

      {/* Main Dashboard Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="w-full min-h-[520px] rounded-lg border border-slate-200 bg-white p-8 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="max-w-md space-y-2">
            <h2 className="text-base font-semibold text-slate-800">
              Main Dashboard Area
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-mono">
              Ready for graph, transaction feed, simulator & risk intelligence modules.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
