import React, { useState, useEffect, useMemo } from 'react';
import { Activity, ShieldAlert, Radio, AlertOctagon } from 'lucide-react';
import { Transaction, RiskTier, EnforcementStatus } from '../types/risk';
import TransactionRow from './TransactionRow';

const MAX_VISIBLE_TRANSACTIONS = 10;

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'TXN-10482',
    timestamp: '12:42:18',
    sender: 'ACC-1042',
    receiver: 'ACC-8821',
    amount: 84920,
    currency: 'USD',
    riskScore: 94,
    riskTier: 'CRITICAL',
    status: 'BLOCKED',
  },
  {
    id: 'TXN-10481',
    timestamp: '12:41:52',
    sender: 'ACC-2931',
    receiver: 'ACC-7734',
    amount: 18200,
    currency: 'USD',
    riskScore: 78,
    riskTier: 'HIGH',
    status: 'CHALLENGED',
  },
  {
    id: 'TXN-10480',
    timestamp: '12:41:20',
    sender: 'ACC-8821',
    receiver: 'ACC-9012',
    amount: 3100,
    currency: 'USD',
    riskScore: 48,
    riskTier: 'MEDIUM',
    status: 'FLAGGED',
  },
  {
    id: 'TXN-10479',
    timestamp: '12:40:58',
    sender: 'ACC-1022',
    receiver: 'ACC-2931',
    amount: 820,
    currency: 'USD',
    riskScore: 12,
    riskTier: 'LOW',
    status: 'ALLOWED',
  },
  {
    id: 'TXN-10478',
    timestamp: '12:40:31',
    sender: 'ACC-5419',
    receiver: 'ACC-3820',
    amount: 42500,
    currency: 'USD',
    riskScore: 82,
    riskTier: 'HIGH',
    status: 'CHALLENGED',
  },
  {
    id: 'TXN-10477',
    timestamp: '12:40:05',
    sender: 'ACC-6105',
    receiver: 'ACC-1042',
    amount: 129400,
    currency: 'USD',
    riskScore: 96,
    riskTier: 'CRITICAL',
    status: 'BLOCKED',
  },
  {
    id: 'TXN-10476',
    timestamp: '12:39:44',
    sender: 'ACC-4491',
    receiver: 'ACC-5419',
    amount: 1450,
    currency: 'USD',
    riskScore: 18,
    riskTier: 'LOW',
    status: 'ALLOWED',
  },
  {
    id: 'TXN-10475',
    timestamp: '12:39:12',
    sender: 'ACC-7734',
    receiver: 'ACC-6105',
    amount: 9800,
    currency: 'USD',
    riskScore: 54,
    riskTier: 'MEDIUM',
    status: 'FLAGGED',
  },
];

const MOCK_ACCOUNTS = [
  'ACC-1042', 'ACC-8821', 'ACC-2931', 'ACC-7734', 'ACC-9012',
  'ACC-1022', 'ACC-5419', 'ACC-3820', 'ACC-6105', 'ACC-4491',
  'ACC-9204', 'ACC-3140', 'ACC-7218', 'ACC-5093'
];

const MOCK_AMOUNTS = [720, 1450, 3100, 8900, 18200, 24600, 42500, 84920, 129400, 245000];

const RISK_PRESETS: Array<{ score: number; tier: RiskTier; status: EnforcementStatus }> = [
  { score: 12, tier: 'LOW', status: 'ALLOWED' },
  { score: 24, tier: 'LOW', status: 'ALLOWED' },
  { score: 48, tier: 'MEDIUM', status: 'FLAGGED' },
  { score: 58, tier: 'MEDIUM', status: 'FLAGGED' },
  { score: 79, tier: 'HIGH', status: 'CHALLENGED' },
  { score: 86, tier: 'HIGH', status: 'CHALLENGED' },
  { score: 96, tier: 'CRITICAL', status: 'BLOCKED' },
];

function generateMockTransaction(): Transaction {
  const now = new Date();
  const time = now.toTimeString().split(' ')[0];

  const senderIdx = Math.floor(Math.random() * MOCK_ACCOUNTS.length);
  let receiverIdx = Math.floor(Math.random() * MOCK_ACCOUNTS.length);
  while (receiverIdx === senderIdx) {
    receiverIdx = Math.floor(Math.random() * MOCK_ACCOUNTS.length);
  }

  const sender = MOCK_ACCOUNTS[senderIdx];
  const receiver = MOCK_ACCOUNTS[receiverIdx];
  const amount = MOCK_AMOUNTS[Math.floor(Math.random() * MOCK_AMOUNTS.length)];
  const preset = RISK_PRESETS[Math.floor(Math.random() * RISK_PRESETS.length)];

  return {
    id: `TXN-${Math.floor(10000 + Math.random() * 90000)}`,
    timestamp: time,
    sender,
    receiver,
    amount,
    currency: 'USD',
    riskScore: preset.score,
    riskTier: preset.tier,
    status: preset.status,
    isNew: true,
  };
}

export interface LiveTransactionFeedProps {
  selectedTxn?: Transaction | null;
  onSelectTxn?: (transaction: Transaction) => void;
}

export default function LiveTransactionFeed({
  selectedTxn,
  onSelectTxn,
}: LiveTransactionFeedProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [internalSelectedTxn, setInternalSelectedTxn] = useState<Transaction | null>(null);
  const [totalEvaluatedCount, setTotalEvaluatedCount] = useState<number>(INITIAL_TRANSACTIONS.length);

  // Active selection either from parent prop or internal state
  const activeSelected = selectedTxn !== undefined ? selectedTxn : internalSelectedTxn;

  const handleSelect = (tx: Transaction) => {
    setInternalSelectedTxn(tx);
    if (onSelectTxn) {
      onSelectTxn(tx);
    }
  };

  // Pre-Commitment Bounded Stream Generator (3.5s cycle)
  useEffect(() => {
    const interval = setInterval(() => {
      const newTx = generateMockTransaction();
      setTransactions((prev) => [newTx, ...prev.slice(0, MAX_VISIBLE_TRANSACTIONS - 1)]);
      setTotalEvaluatedCount((prev) => prev + 1);
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  // Critical alerts count in current window
  const criticalCount = useMemo(
    () => transactions.filter((t) => t.riskTier === 'CRITICAL').length,
    [transactions]
  );

  return (
    <div className="w-full bg-[#0d131f] border border-[#1f293d] rounded-lg overflow-hidden flex flex-col shadow-sm">
      {/* Header Area */}
      <div className="px-4 sm:px-6 py-4 border-b border-[#1f293d] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0b0f17]/70">
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
            <span className="font-semibold text-slate-200">{totalEvaluatedCount}</span>
            <span className="text-slate-500 ml-1">Evaluated</span>
            <span className="text-slate-500 ml-1.5 font-normal">({transactions.length} Stream Buffer)</span>
          </div>
        </div>
      </div>

      {/* Column Headers for High Readability */}
      <div className="hidden md:flex items-center justify-between px-6 py-2 bg-[#090d15] border-b border-[#1f293d]/80 text-[11px] font-mono uppercase tracking-wider text-slate-400 select-none">
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
      <div className="divide-y divide-[#1f293d]/70 overflow-x-auto">
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
