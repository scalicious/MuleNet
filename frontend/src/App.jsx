import React, { useState } from 'react';
import DashboardHeader from './components/DashboardHeader';
import MetricsBar from './components/MetricsBar';
import LiveTransactionFeed from './components/LiveTransactionFeed';
import GraphExplorer from './components/GraphExplorer';

export default function App() {
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [selectedAccountId, setSelectedAccountId] = useState(null);

  const handleSelectTransaction = (tx) => {
    setSelectedTxn(tx);
    if (tx?.sender) {
      setSelectedAccountId(tx.sender);
    }
  };

  const handleSelectAccount = (accId) => {
    setSelectedAccountId(accId);
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-200">
      {/* Premium Dashboard Header */}
      <DashboardHeader />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-6">
        {/* KPI Metrics Section */}
        <MetricsBar />

        {/* Intelligence Grid: Live Feed & Graph Explorer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Live Pre-Commitment Stream */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <LiveTransactionFeed
              selectedTxn={selectedTxn}
              onSelectTxn={handleSelectTransaction}
            />
          </div>

          {/* Right Column: 2-Hop Network Graph Explorer */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <GraphExplorer
              selectedAccountId={selectedAccountId}
              onSelectAccount={handleSelectAccount}
            />
          </div>
        </div>

        {/* Selected Transaction Action Bar (Readiness for CaseDossierModal) */}
        {selectedTxn && (
          <div className="p-3.5 rounded-lg border border-cyan-800/40 bg-cyan-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2 text-slate-300 flex-wrap">
              <span className="text-cyan-400 font-semibold">SELECTED TRANSACTION:</span>
              <span className="text-slate-100 font-bold">{selectedTxn.id}</span>
              <span className="text-slate-400">({selectedTxn.sender} → {selectedTxn.receiver})</span>
              <span className="text-slate-100 font-bold">${selectedTxn.amount?.toLocaleString()}</span>
              <span className="text-cyan-300 font-semibold">| Focus Graph: {selectedTxn.sender}</span>
            </div>
            <span className="text-slate-400 italic shrink-0">
              Case dossier ready to inspect
            </span>
          </div>
        )}
      </main>
    </div>
  );
}
