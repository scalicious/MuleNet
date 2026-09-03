import React, { useState } from 'react';
import DashboardHeader from './components/DashboardHeader';
import MetricsBar from './components/MetricsBar';
import LiveTransactionFeed from './components/LiveTransactionFeed';

export default function App() {
  const [selectedTxn, setSelectedTxn] = useState(null);

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-200">
      {/* Premium Dashboard Header */}
      <DashboardHeader />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-6">
        {/* KPI Metrics Section */}
        <MetricsBar />

        {/* Live Transaction Feed Section */}
        <section aria-label="Pre-Commitment Live Stream">
          <LiveTransactionFeed
            selectedTxn={selectedTxn}
            onSelectTxn={setSelectedTxn}
          />
        </section>

        {/* Selected Transaction Action Bar (Readiness for CaseDossierModal) */}
        {selectedTxn && (
          <div className="p-3.5 rounded-lg border border-cyan-800/40 bg-cyan-950/20 flex items-center justify-between gap-4 text-xs font-mono">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="text-cyan-400 font-semibold">SELECTED:</span>
              <span className="text-slate-100 font-bold">{selectedTxn.id}</span>
              <span className="text-slate-400">({selectedTxn.sender} → {selectedTxn.receiver})</span>
              <span className="text-slate-200 font-bold">${selectedTxn.amount?.toLocaleString()}</span>
            </div>
            <span className="text-slate-400 italic">
              Case dossier ready to inspect
            </span>
          </div>
        )}
      </main>
    </div>
  );
}
