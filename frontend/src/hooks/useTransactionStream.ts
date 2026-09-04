import { useState, useEffect, useCallback, useRef } from 'react';
import { Transaction, RiskTier, EnforcementStatus } from '../types/risk';
import { connectTransactionStream, StreamTransaction } from '../services/streamService';

export interface UseTransactionStreamOptions {
  maxItems?: number;
  autoConnect?: boolean;
}

const INITIAL_TRANSACTIONS: Transaction[] = [];

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

      // Use real backend fused score if available, otherwise fallback to tier-based range
      const riskScore =
        typeof streamTx.riskScore === 'number'
          ? streamTx.riskScore
          : (typeof streamTx.fusedScore === 'number'
              ? Math.round(streamTx.fusedScore * 100)
              : (streamTx.riskLevel === 'CRITICAL'
                  ? Math.floor(Math.random() * 8) + 92
                  : streamTx.riskLevel === 'HIGH'
                  ? Math.floor(Math.random() * 15) + 70
                  : streamTx.riskLevel === 'MEDIUM'
                  ? Math.floor(Math.random() * 25) + 40
                  : Math.floor(Math.random() * 25) + 10));

      // Derive status from backend recommendedAction or riskLevel
      let status: EnforcementStatus = 'ALLOWED';
      if (streamTx.recommendedAction === 'HOLD_FOR_REVIEW' || streamTx.riskLevel === 'CRITICAL') {
        status = 'BLOCKED';
      } else if (streamTx.recommendedAction === 'STEP_UP_AUTH' || streamTx.riskLevel === 'HIGH') {
        status = 'CHALLENGED';
      } else if (streamTx.recommendedAction === 'SOFT_CHALLENGE' || streamTx.riskLevel === 'MEDIUM') {
        status = 'FLAGGED';
      }

      const newTx: Transaction = {
        id: streamTx.id || `TXN-${Math.floor(Math.random() * 89999 + 10000)}`,
        timestamp: streamTx.time || new Date().toTimeString().split(' ')[0],
        sender: streamTx.sender || 'ACC-UNKNOWN',
        receiver: streamTx.receiver || 'ACC-UNKNOWN',
        amount: numAmount,
        currency: 'USD',
        riskScore,
        riskTier: (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(streamTx.riskLevel)
          ? streamTx.riskLevel
          : 'LOW') as RiskTier,
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
