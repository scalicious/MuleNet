import React, { useMemo } from 'react';
import { Radio, AlertOctagon } from 'lucide-react';
import { Transaction } from '../types/risk';
import TransactionRow from './TransactionRow';
import { useTransactionStream } from '../hooks/useTransactionStream';

export interface LiveTransactionFeedProps {
  selectedTxn?: Transaction | null;
  onSelectTxn?: (transaction: Transaction) => void;
}

export default function LiveTransactionFeed({
  selectedTxn,
  onSelectTxn,
}: LiveTransactionFeedProps) {
  // Use hook layer for stream lifecycle & fallback resilience
  const { transactions, eventCount } = useTransactionStream({ maxItems: 10 });

  const activeSelected = selectedTxn;

  const handleSelect = (tx: Transaction) => {
    if (onSelectTxn) {
      onSelectTxn(tx);
    }
  };

  // Critical alerts count in current visible stream window
  const criticalCount = useMemo(
    () => transactions.filter((t) => t.riskTier === 'CRITICAL').length,
    [transactions]
  );

  return (
    <div className="w-full h-full bg-[#0d131f] border border-[#1f293d] rounded-lg overflow-hidden flex flex-col shadow-sm">
      {/* Header Area */}
      <div className="px-4 sm:px-6 py-4 border-b border-[#1f293d] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0b0f17]/70 shrink-0">
        {/* Title & Live Status */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/50 border border-cyan-800/40 flex items-center justify-center text-cyan-400 shrink-0">
            <Radio className="w-4 h-4 animate-subtle-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold tracking-wider uppercase text-slate-100 font-sans">
                PRE-COMMITMENT STREAM
              </h2>
              {/* LIVE Indicator with Pulsing Beacon */}
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-emerald-900/60 bg-emerald-950/40 text-emerald-400 text-[10px] font-mono font-semibold tracking-wide">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>LIVE</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
              <span>Evaluating transactions before settlement</span>
              <span>•</span>
              <span className="text-cyan-400">Latency: 0.4ms</span>
            </p>
          </div>
        </div>

        {/* Legend, Critical Counter & Event Counter */}
        <div className="flex items-center flex-wrap gap-2.5 sm:gap-3.5 self-start sm:self-center">
          {/* Critical Alerts Badge */}
          {criticalCount > 0 && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-rose-900/60 bg-rose-950/30 text-rose-400 text-[10px] font-mono font-bold">
              <AlertOctagon className="w-3 h-3 text-rose-500" />
              <span>{criticalCount} CRITICAL IN WINDOW</span>
            </div>
          )}

          {/* Compact Risk Legend */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded border border-slate-800 bg-slate-900/60 text-[10px] font-mono font-medium">
            <span className="text-slate-500 uppercase text-[9px] mr-0.5">LEGEND:</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> LOW
            </span>
            <span className="flex items-center gap-1 text-yellow-400">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span> MED
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> HIGH
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span> CRIT
            </span>
          </div>

          {/* Event Count */}
          <div className="px-2.5 py-1 rounded border border-slate-800 bg-slate-900/80 text-slate-300 text-[11px] font-mono">
            <span className="font-semibold text-slate-200">{eventCount}</span>
            <span className="text-slate-500 ml-1">Evaluated</span>
            <span className="text-slate-500 ml-1.5 font-normal">({transactions.length} Stream Buffer)</span>
          </div>
        </div>
      </div>

      {/* Column Headers for High Readability */}
      <div className="hidden md:flex items-center justify-between px-6 py-2 bg-[#090d15] border-b border-[#1f293d]/80 text-[11px] font-mono uppercase tracking-wider text-slate-400 select-none shrink-0">
        <div className="flex items-center space-x-5">
          <span className="w-20">Time (UTC)</span>
          <span className="w-24">Transaction</span>
          <span>Payment Flow (Sender → Receiver)</span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="w-20 text-right">Amount</span>
          <span className="hidden lg:inline-block w-16 text-center">Score</span>
          <span className="w-24 text-center">Risk Tier</span>
          <span className="w-28 text-center">Enforcement</span>
          <span className="w-5"></span>
        </div>
      </div>

      {/* Bounded Transaction Rows List */}
      <div className="divide-y divide-[#1f293d]/70 overflow-x-auto flex-1">
        {transactions.map((tx, idx) => (
          <TransactionRow
            key={tx.id}
            transaction={tx}
            isSelected={activeSelected?.id === tx.id}
            onSelect={handleSelect}
            isNew={idx === 0 && tx.isNew}
          />
        ))}
      </div>
    </div>
  );
}
