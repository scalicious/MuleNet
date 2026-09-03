import React from 'react';
import DashboardHeader from './components/DashboardHeader';
import MetricsBar from './components/MetricsBar';

export default function App() {
  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-200">
      {/* Premium Dashboard Header */}
      <DashboardHeader />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-6">
        {/* KPI Metrics Section */}
        <MetricsBar />

        {/* Placeholder Area for Upcoming Modules */}
        <section aria-label="Dashboard Content Area" className="flex-1">
          <div className="w-full min-h-[460px] rounded-lg border border-[#1f293d] bg-[#0d131f]/50 p-6 flex flex-col items-center justify-center text-center">
            <div className="max-w-md space-y-2">
              <p className="text-sm font-semibold tracking-wider uppercase text-slate-300">
                Command Center Workspace
              </p>
              <p className="text-xs text-slate-500 font-mono">
                Ready for subsequent modules (Live Feed, Network Graph Explorer, Case Dossier & Attack Simulator).
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
