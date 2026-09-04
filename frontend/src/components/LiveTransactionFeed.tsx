import React from 'react';
import { Radio } from 'lucide-react';
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
  const { transactions, eventCount } = useTransactionStream({ maxItems: 20 });

  const activeSelected = selectedTxn;

  const handleSelect = (tx: Transaction) => {
    if (onSelectTxn) {
      onSelectTxn(tx);
    }
  };

  return (
    <div className="w-full h-full bg-[#0d131f] border border-[#1f293d] rounded-lg overflow-hidden flex flex-col shadow-sm">
      {/* Header Area */}
      <div className="px-4 sm:px-5 py-3.5 border-b border-[#1f293d] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-[#0b0f17]/80 shrink-0">
        {/* Title */}
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-cyan-950/50 border border-cyan-800/40 flex items-center justify-center text-cyan-400 shrink-0">
            <Radio className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold tracking-wider uppercase text-slate-100 font-sans">
              PRE-COMMITMENT STREAM
            </h2>
            <p className="text-[10px] text-slate-400 font-mono">
              Evaluated prior to ledger commitment
            </p>
          </div>
        </div>

        {/* Legend & Event Counter */}
        <div className="flex items-center flex-wrap gap-2 self-start sm:self-center">
          {/* Compact Risk Legend */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-slate-800 bg-slate-900/60 text-[9px] font-mono font-medium">
            <span className="text-slate-500 uppercase text-[8px] mr-0.5">LEGEND:</span>
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
          <div className="px-2 py-0.5 rounded border border-slate-800 bg-slate-900/80 text-slate-300 text-[10px] font-mono">
            <span className="font-semibold text-slate-200">{eventCount}</span>
            <span className="text-slate-500 ml-1">Evaluated</span>
          </div>
        </div>
      </div>

      {/* Bounded Transaction Rows List */}
      <div className="divide-y divide-[#1f293d]/70 overflow-y-auto flex-1 max-h-[560px]">
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
