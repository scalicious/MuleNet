import { useState, useEffect, useCallback, useRef } from 'react';
import { Transaction, RiskTier, EnforcementStatus } from '../types/risk';
import { connectTransactionStream, StreamTransaction } from '../services/streamService';

export interface UseTransactionStreamOptions {
  maxItems?: number;
  autoConnect?: boolean;
}

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
    riskScore: 14,
    riskTier: 'LOW',
    status: 'ALLOWED',
  },
  {
    id: 'TXN-10478',
    timestamp: '12:40:22',
    sender: 'ACC-5419',
    receiver: 'ACC-3820',
    amount: 12500,
    currency: 'USD',
    riskScore: 68,
    riskTier: 'HIGH',
    status: 'CHALLENGED',
  },
  {
    id: 'TXN-10477',
    timestamp: '12:39:45',
    sender: 'ACC-6105',
    receiver: 'ACC-1042',
    amount: 92400,
    currency: 'USD',
    riskScore: 96,
    riskTier: 'CRITICAL',
    status: 'BLOCKED',
  },
  {
    id: 'TXN-10476',
    timestamp: '12:38:12',
    sender: 'ACC-4491',
    receiver: 'ACC-9204',
    amount: 2450,
    currency: 'USD',
    riskScore: 32,
    riskTier: 'LOW',
    status: 'ALLOWED',
  },
  {
    id: 'TXN-10475',
    timestamp: '12:37:30',
    sender: 'ACC-3140',
    receiver: 'ACC-7218',
    amount: 6800,
    currency: 'USD',
    riskScore: 54,
    riskTier: 'MEDIUM',
    status: 'FLAGGED',
  },
];

export function useTransactionStream({
  maxItems = 10,
  autoConnect = true,
}: UseTransactionStreamOptions = {}) {
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [eventCount, setEventCount] = useState<number>(INITIAL_TRANSACTIONS.length);
  const [isLive, setIsLive] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const handleIncomingTransaction = useCallback(
    (streamTx: StreamTransaction) => {
      if (!isLive) return;

      const numAmount =
        typeof streamTx.amount === 'number'
          ? streamTx.amount
          : parseFloat(String(streamTx.amount).replace(/[^0-9.]/g, '')) || 5000;

      const riskScore =
        streamTx.riskLevel === 'CRITICAL'
          ? Math.floor(Math.random() * 8) + 92
          : streamTx.riskLevel === 'HIGH'
          ? Math.floor(Math.random() * 15) + 70
          : streamTx.riskLevel === 'MEDIUM'
          ? Math.floor(Math.random() * 25) + 40
          : Math.floor(Math.random() * 25) + 10;

      const status: EnforcementStatus =
        streamTx.riskLevel === 'CRITICAL'
          ? 'BLOCKED'
          : streamTx.riskLevel === 'HIGH'
          ? 'CHALLENGED'
          : streamTx.riskLevel === 'MEDIUM'
          ? 'FLAGGED'
          : 'ALLOWED';

      const newTx: Transaction = {
        id: streamTx.id.startsWith('TXN-')
          ? streamTx.id
          : `TXN-${Math.floor(Math.random() * 89999 + 10000)}`,
        timestamp: streamTx.time,
        sender: streamTx.sender,
        receiver: streamTx.receiver,
        amount: numAmount,
        currency: 'USD',
        riskScore,
        riskTier: streamTx.riskLevel as RiskTier,
        status,
        isNew: true,
      };

      setTransactions((prev) => [newTx, ...prev.slice(0, maxItems - 1)]);
      setEventCount((prev) => prev + 1);
    },
    [isLive, maxItems]
  );

  useEffect(() => {
    if (!autoConnect) return;

    setIsConnected(true);
    unsubscribeRef.current = connectTransactionStream(
      handleIncomingTransaction,
      (err) => {
        console.warn('[useTransactionStream] Stream fallback active:', err);
      }
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      setIsConnected(false);
    };
  }, [autoConnect, handleIncomingTransaction]);

  const pauseStream = useCallback(() => setIsLive(false), []);
  const resumeStream = useCallback(() => setIsLive(true), []);
  const clearTransactions = useCallback(() => {
    setTransactions([]);
    setEventCount(0);
  }, []);

  return {
    transactions,
    eventCount,
    isLive,
    isConnected,
    pauseStream,
    resumeStream,
    clearTransactions,
  };
}
