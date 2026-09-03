import React from 'react';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { Transaction, EnforcementStatus } from '../types/risk';
import RiskBadge from './RiskBadge';

export interface TransactionRowProps {
  transaction: Transaction;
  isSelected: boolean;
  onSelect: (transaction: Transaction) => void;
  isNew?: boolean;
}

const STATUS_CONFIG: Record<EnforcementStatus, { style: string; label: string }> = {
  BLOCKED: {
    style: 'text-rose-400 bg-rose-950/40 border-rose-800/50',
    label: 'HOLD & BLOCK',
  },
  CHALLENGED: {
    style: 'text-amber-400 bg-amber-950/30 border-amber-800/40',
    label: 'STEP-UP 2FA',
  },
  FLAGGED: {
    style: 'text-yellow-400 bg-yellow-950/30 border-yellow-800/40',
    label: 'SOFT CHALLENGE',
  },
  ALLOWED: {
    style: 'text-emerald-400 bg-emerald-950/30 border-emerald-800/40',
    label: 'ALLOW',
  },
};

export default function TransactionRow({
  transaction,
  isSelected,
  onSelect,
  isNew = false,
}: TransactionRowProps) {
  const isCritical = transaction.riskTier === 'CRITICAL';

  const formattedTime = transaction.timestamp.includes('T')
    ? transaction.timestamp.split('T')[1]?.split('.')[0] || transaction.timestamp
    : transaction.timestamp;

  const formattedAmount =
    typeof transaction.amount === 'number'
      ? `$${transaction.amount.toLocaleString('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })}`
      : transaction.amount;

  const statusObj = STATUS_CONFIG[transaction.status] || STATUS_CONFIG.ALLOWED;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(transaction);
    }
  };

  // Border & background styling
  const baseBorderClass = isSelected
    ? 'border-l-4 border-l-cyan-400 bg-cyan-950/30 ring-1 ring-cyan-500/30'
    : isCritical
    ? 'border-l-4 border-l-rose-500/80 bg-rose-950/10 hover:bg-rose-950/20'
    : 'border-l-4 border-l-transparent hover:bg-[#121929]/70';

  const arrivalAnimationClass = isNew
    ? isCritical
      ? 'animate-critical-arrival'
      : 'animate-row-arrival'
    : '';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(transaction)}
      onKeyDown={handleKeyDown}
      aria-pressed={isSelected}
      aria-label={`Transaction ${transaction.id}, Amount ${formattedAmount}, Risk ${transaction.riskTier}`}
      className={`px-3.5 sm:px-4 py-2.5 transition-all duration-150 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${baseBorderClass} ${arrivalAnimationClass}`}
    >
      {/* Top Line: Time + Transaction ID on left, Amount + Risk Badge on right */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400">
          <span className="text-slate-300 font-semibold">{formattedTime}</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-500">{transaction.id}</span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs sm:text-sm font-mono font-bold text-slate-100 tracking-tight">
            {formattedAmount}
          </span>
          <RiskBadge
            tier={transaction.riskTier}
            score={transaction.riskScore}
            showIcon={isCritical}
            size="sm"
          />
        </div>
      </div>

      {/* Bottom Line: Flow Routing (Sender -> Receiver) on left, Status Badge on right */}
      <div className="flex items-center justify-between gap-2 mt-1.5">
        <div className="flex items-center space-x-1.5 text-xs font-mono min-w-0">
          <span className="text-cyan-300 font-medium bg-cyan-950/50 px-1.5 py-0.5 rounded border border-cyan-800/40 text-[11px] truncate max-w-[110px]">
            {transaction.sender}
          </span>
          <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
          <span className="text-slate-200 font-medium bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-700/50 text-[11px] truncate max-w-[110px]">
            {transaction.receiver}
          </span>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase border ${statusObj.style}`}
          >
            {statusObj.label}
          </span>
          <ChevronRight
            className={`w-3.5 h-3.5 transition-transform duration-150 ${
              isSelected ? 'text-cyan-400 translate-x-0.5' : 'text-slate-600'
            }`}
          />
        </div>
      </div>
    </div>
  );
}
