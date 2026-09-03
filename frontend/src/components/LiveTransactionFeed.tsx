import React, { useState, useEffect } from 'react';
import { Activity, ShieldAlert, Filter } from 'lucide-react';
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

const MOCK_AMOUNTS = [650, 1200, 3100, 8400, 18200, 24600, 42500, 84920, 129400, 210000];

const RISK_PRESETS: Array<{ score: number; tier: RiskTier; status: EnforcementStatus }> = [
  { score: 14, tier: 'LOW', status: 'ALLOWED' },
  { score: 22, tier: 'LOW', status: 'ALLOWED' },
  { score: 48, tier: 'MEDIUM', status: 'FLAGGED' },
  { score: 56, tier: 'MEDIUM', status: 'FLAGGED' },
  { score: 79, tier: 'HIGH', status: 'CHALLENGED' },
  { score: 84, tier: 'HIGH', status: 'CHALLENGED' },
  { score: 95, tier: 'CRITICAL', status: 'BLOCKED' },
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

  // Active selection either from prop or internal state
  const activeSelected = selectedTxn !== undefined ? selectedTxn : internalSelectedTxn;

  const handleSelect = (tx: Transaction) => {
    setInternalSelectedTxn(tx);
    if (onSelectTxn) {
      onSelectTxn(tx);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const newTx = generateMockTransaction();
      setTransactions((prev) => [newTx, ...prev.slice(0, MAX_VISIBLE_TRANSACTIONS - 1)]);
      setTotalEvaluatedCount((prev) => prev + 1);
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-[#0d131f] border border-[#1f293d] rounded-lg overflow-hidden flex flex-col shadow-sm">
      {/* Header Area */}
      <div className="px-4 sm:px-6 py-4 border-b border-[#1f293d] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0b0f17]/60">
        {/* Title & Live Status */}
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 rounded-md bg-cyan-950/50 border border-cyan-800/40 flex items-center justify-center text-cyan-400 shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold tracking-wider uppercase text-slate-100 font-sans">
                PRE-COMMITMENT STREAM
              </h2>
              {/* LIVE Indicator */}
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-emerald-900/60 bg-emerald-950/30 text-emerald-400 text-[10px] font-mono font-medium tracking-wide">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span>LIVE</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Real-time pre-execution transaction risk scoring pipeline
            </p>
          </div>
        </div>

        {/* Legend & Event Counter */}
        <div className="flex items-center flex-wrap gap-3 sm:gap-4 self-start sm:self-center">
          {/* Risk Legend */}
          <div className="flex items-center gap-2 text-[10px] font-mono font-semibold">
            <span className="text-slate-400 text-[10px] uppercase mr-0.5">Legend:</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> LOW
            </span>
            <span className="flex items-center gap-1 text-yellow-400">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span> MED
            </span>
            <span className="flex items-center gap-1 text-orange-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span> HIGH
            </span>
            <span className="flex items-center gap-1 text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span> CRIT
            </span>
          </div>

          {/* Event Count Badge */}
          <div className="px-2.5 py-1 rounded border border-slate-800 bg-slate-900/80 text-slate-300 text-[11px] font-mono">
            <span>{totalEvaluatedCount} Evaluated</span>
            <span className="text-slate-400 ml-1.5">({transactions.length} Visible)</span>
          </div>
        </div>
      </div>

      {/* Column Headers */}
      <div className="hidden md:flex items-center justify-between px-6 py-2 bg-[#090d15] border-b border-[#1f293d]/60 text-[11px] font-mono uppercase tracking-wider text-slate-400">
        <div className="flex items-center space-x-5">
          <span className="w-20">Timestamp</span>
          <span className="w-24">Txn ID</span>
          <span>Flow Routing</span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="w-20 text-right">Amount</span>
          <span className="hidden lg:inline-block w-16 text-center">Score</span>
          <span className="w-24 text-center">Risk Tier</span>
          <span className="w-24 text-center">Decision</span>
        </div>
      </div>

      {/* Bounded Transaction Rows List */}
      <div className="divide-y divide-[#1f293d]/80 overflow-x-auto">
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
