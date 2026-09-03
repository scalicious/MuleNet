import React, { useState, useEffect } from 'react';
import { ArrowRight, Activity } from 'lucide-react';

interface Transaction {
  id: string;
  time: string;
  sender: string;
  receiver: string;
  amount: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isNew?: boolean;
}

const RISK_BADGE_STYLES: Record<Transaction['riskLevel'], string> = {
  LOW: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50',
  MEDIUM: 'text-yellow-400 bg-yellow-950/40 border-yellow-800/50',
  HIGH: 'text-orange-400 bg-orange-950/40 border-orange-800/50',
  CRITICAL: 'text-red-400 bg-red-950/40 border-red-800/50',
};

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: 'tx-1', time: '12:42:18', sender: 'ACC-1042', receiver: 'ACC-8821', amount: '$84,920', riskLevel: 'CRITICAL' },
  { id: 'tx-2', time: '12:41:52', sender: 'ACC-2931', receiver: 'ACC-7734', amount: '$18,200', riskLevel: 'HIGH' },
  { id: 'tx-3', time: '12:41:20', sender: 'ACC-8821', receiver: 'ACC-9012', amount: '$3,100', riskLevel: 'MEDIUM' },
  { id: 'tx-4', time: '12:40:58', sender: 'ACC-1022', receiver: 'ACC-2931', amount: '$820', riskLevel: 'LOW' },
  { id: 'tx-5', time: '12:40:31', sender: 'ACC-5419', receiver: 'ACC-3820', amount: '$42,500', riskLevel: 'HIGH' },
  { id: 'tx-6', time: '12:40:05', sender: 'ACC-6105', receiver: 'ACC-1042', amount: '$129,400', riskLevel: 'CRITICAL' },
  { id: 'tx-7', time: '12:39:44', sender: 'ACC-4491', receiver: 'ACC-5419', amount: '$1,450', riskLevel: 'LOW' },
  { id: 'tx-8', time: '12:39:12', sender: 'ACC-7734', receiver: 'ACC-6105', amount: '$9,800', riskLevel: 'MEDIUM' },
];

const MOCK_ACCOUNTS = [
  'ACC-1042', 'ACC-8821', 'ACC-2931', 'ACC-7734', 'ACC-9012',
  'ACC-1022', 'ACC-5419', 'ACC-3820', 'ACC-6105', 'ACC-4491',
  'ACC-9204', 'ACC-3140', 'ACC-7218', 'ACC-5093'
];

const MOCK_AMOUNTS = [
  '$650', '$1,200', '$3,850', '$7,400', '$12,900', '$18,500',
  '$24,600', '$47,300', '$89,200', '$142,000', '$210,500'
];

const RISK_TIERS: Transaction['riskLevel'][] = [
  'LOW', 'LOW', 'MEDIUM', 'LOW', 'HIGH', 'CRITICAL', 'MEDIUM', 'HIGH'
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
  const riskLevel = RISK_TIERS[Math.floor(Math.random() * RISK_TIERS.length)];

  return {
    id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    time,
    sender,
    receiver,
    amount,
    riskLevel,
    isNew: true,
  };
}

export default function LiveTransactionFeed() {
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);

  useEffect(() => {
    const interval = setInterval(() => {
      const newTx = generateMockTransaction();
      setTransactions((prev) => [newTx, ...prev.slice(0, 8)]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-[#0d131f] border border-[#1f293d] rounded-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 sm:px-6 py-3.5 border-b border-[#1f293d] flex items-center justify-between bg-[#0b0f17]/40">
        <div className="flex items-center space-x-2.5">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-slate-200 font-sans">
            LIVE PRE-COMMITMENT STREAM
          </h2>
        </div>

        {/* Live Indicator */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border border-emerald-900/60 bg-emerald-950/30 text-emerald-400 text-[11px] font-mono font-medium tracking-wide">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span>LIVE</span>
        </div>
      </div>

      {/* Transaction List */}
      <div className="divide-y divide-[#1f293d]/80 overflow-x-auto">
        {transactions.map((tx, idx) => {
          const badgeStyle = RISK_BADGE_STYLES[tx.riskLevel];
          const isFirst = idx === 0 && tx.isNew;

          return (
            <div
              key={tx.id}
              className={`px-4 sm:px-6 py-3 flex items-center justify-between gap-4 hover:bg-[#111827]/50 transition-colors ${
                isFirst ? 'animate-row-appear' : ''
              }`}
            >
              {/* Left: Time & Account routing */}
              <div className="flex items-center space-x-3 sm:space-x-6 min-w-0">
                <span className="text-xs font-mono text-slate-400 shrink-0">
                  {tx.time}
                </span>

                <div className="flex items-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm font-mono font-medium text-slate-200">
                  <span className="text-cyan-300">{tx.sender}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-slate-300">{tx.receiver}</span>
                </div>
              </div>

              {/* Right: Amount & Risk Badge */}
              <div className="flex items-center space-x-3 sm:space-x-5 shrink-0">
                <span className="text-xs sm:text-sm font-mono font-bold text-slate-100">
                  {tx.amount}
                </span>

                <span
                  className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded text-[10px] sm:text-[11px] font-mono font-bold tracking-wider uppercase border ${badgeStyle} min-w-[70px] text-center`}
                >
                  {tx.riskLevel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
