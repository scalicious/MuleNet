import React, { useState } from 'react';
import DashboardHeader from './components/DashboardHeader';
import MetricsBar from './components/MetricsBar';

import LiveTransactionFeed from './components/LiveTransactionFeed';
import GraphExplorer from './components/GraphExplorer';
import CaseDossierModal from './components/CaseDossierModal';
import { FileSearch } from 'lucide-react';

export default function App() {
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);

  const handleSelectTransaction = (tx) => {
    setSelectedTxn(tx);
    setIsDossierOpen(true);
    if (tx?.sender) {
      setSelectedAccountId(tx.sender);
    }
  };

  const handleSelectAccount = (accId) => {
    setSelectedAccountId(accId);
  };

  const handleAttackInjected = (scenarioType, txnId) => {
    console.info(`[App] Adversarial pattern injected: ${scenarioType} [${txnId}]`);
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-200 overflow-x-hidden">
      {/* 1. Dashboard Header */}
      <DashboardHeader />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-[1560px] mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7 flex flex-col gap-6">
        {/* 2. KPI Metrics Bar (Live SQLite Aggregations) */}
        <section aria-label="Key Performance Indicators">
          <MetricsBar />
        </section>



        {/* 4. Main Intelligence Area: Risk Graph (Primary) + Live Feed */}
        <section
          aria-label="Main Intelligence Console"
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
        >
          {/* Left Column: Interactive Risk Graph (Largest Visual Area) */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col min-h-[460px] sm:min-h-[520px] lg:min-h-[600px]">
            <GraphExplorer
              selectedAccountId={selectedAccountId}
              onSelectAccount={handleSelectAccount}
            />
          </div>

          {/* Right Column: Live Pre-Commitment Feed */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col min-h-[460px]">
            <LiveTransactionFeed
              selectedTxn={selectedTxn}
              onSelectTxn={handleSelectTransaction}
            />
          </div>
        </section>

        {/* Selected Transaction Action Bar */}
        {selectedTxn && (
          <div className="p-3 sm:p-4 rounded-lg border border-cyan-800/40 bg-cyan-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2 text-slate-300 flex-wrap">
              <span className="text-cyan-400 font-semibold">SELECTED TRANSACTION:</span>
              <span className="text-slate-100 font-bold">{selectedTxn.id}</span>
              <span className="text-slate-400">({selectedTxn.sender} → {selectedTxn.receiver})</span>
              <span className="text-slate-100 font-bold">${selectedTxn.amount?.toLocaleString()}</span>
              <span className="text-cyan-300 font-semibold">| Focus Graph: {selectedTxn.sender}</span>
            </div>
            <button
              onClick={() => setIsDossierOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-semibold bg-cyan-900/50 hover:bg-cyan-800/60 text-cyan-200 border border-cyan-700/60 transition shrink-0"
            >
              <FileSearch className="w-3.5 h-3.5 text-cyan-400" />
              <span>Inspect Case Dossier</span>
            </button>
          </div>
        )}
      </main>

      {/* 5. Case Dossier Modal (Overlay Dialog) */}
      <CaseDossierModal
        transaction={selectedTxn}
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
      />
    </div>
  );
}
