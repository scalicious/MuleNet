import React from 'react';
import { ArrowRight, ChevronRight, ShieldAlert } from 'lucide-react';
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

  const formattedAmount = typeof transaction.amount === 'number'
    ? `$${transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
    : transaction.amount;

  const statusObj = STATUS_CONFIG[transaction.status] || STATUS_CONFIG.ALLOWED;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(transaction);
    }
  };

  // Border & background classes based on status and selection
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
      aria-label={`Transaction ${transaction.id}, Amount ${formattedAmount}, Risk ${transaction.riskTier} score ${transaction.riskScore}`}
      className={`px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 transition-all duration-150 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f17] ${baseBorderClass} ${arrivalAnimationClass}`}
    >
      {/* Primary: TIME, ID, and SENDER -> RECEIVER */}
      <div className="flex items-center space-x-3 sm:space-x-5 min-w-0">
        {/* Timestamp */}
        <span className="text-xs font-mono text-slate-400 w-16 sm:w-20 shrink-0 tracking-tight">
          {formattedTime}
        </span>

        {/* Transaction ID */}
        <span className="text-xs font-mono font-medium text-slate-400 w-24 shrink-0 hidden sm:inline-block">
          {transaction.id}
        </span>

        {/* Flow Routing: SENDER -> RECEIVER */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm font-mono">
          <span className="text-cyan-300 font-semibold bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
            {transaction.sender}
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="text-slate-200 font-semibold bg-slate-800/50 px-2 py-0.5 rounded border border-slate-700/50">
            {transaction.receiver}
          </span>
        </div>
      </div>

      {/* Primary: AMOUNT, RISK TIER, and STATUS */}
      <div className="flex items-center justify-between md:justify-end space-x-3 sm:space-x-4 shrink-0 pl-16 md:pl-0">
        {/* Amount */}
        <span className="text-xs sm:text-sm font-mono font-bold text-slate-100 min-w-[80px] text-right tracking-tight">
          {formattedAmount}
        </span>

        {/* Risk Score */}
        <div className="hidden lg:flex items-center gap-1 font-mono text-xs text-slate-400">
          <span className="text-[10px] uppercase text-slate-500">Score:</span>
          <span className="font-bold text-slate-200">{transaction.riskScore}</span>
        </div>

        {/* Risk Tier Badge */}
        <RiskBadge
          tier={transaction.riskTier}
          score={transaction.riskScore}
          showIcon={isCritical}
          size="sm"
        />

        {/* Enforcement Decision */}
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wider uppercase border ${statusObj.style} min-w-[78px] text-center justify-center`}
        >
          {statusObj.label}
        </span>

        {/* Selection Indicator Chevron */}
        <div className="hidden sm:flex items-center justify-center w-5 text-slate-600">
          <ChevronRight
            className={`w-4 h-4 transition-transform duration-150 ${
              isSelected ? 'text-cyan-400 translate-x-0.5' : 'opacity-0'
            }`}
          />
        </div>
      </div>
    </div>
  );
}
