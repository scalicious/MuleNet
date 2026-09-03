import { useState, useEffect, useCallback } from 'react';
import { Transaction, TransactionDossier } from '../types/risk';
import { getTransaction, getTransactionDossier } from '../services/transactionService';
import { createMockDossier } from '../api/mockDossier';

export function useTransaction(initialTransaction: Transaction | null = null) {
  const [transaction, setTransaction] = useState<Transaction | null>(initialTransaction);
  const [dossier, setDossier] = useState<TransactionDossier | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state if initial transaction changes
  useEffect(() => {
    if (initialTransaction) {
      setTransaction(initialTransaction);
      // Immediately populate with dynamic local dossier for zero latency
      setDossier(createMockDossier(initialTransaction));
    }
  }, [initialTransaction]);

  // Fetch full transaction & dossier through service layer
  const loadTransaction = useCallback(async (transactionId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const [tx, backendDossier] = await Promise.all([
        getTransaction(transactionId),
        getTransactionDossier(transactionId),
      ]);
      setTransaction(tx);
      setDossier(backendDossier as unknown as TransactionDossier);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch transaction';
      setError(msg);
      console.warn(`[useTransaction] Fallback used for ${transactionId}:`, err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearTransaction = useCallback(() => {
    setTransaction(null);
    setDossier(null);
    setError(null);
  }, []);

  return {
    transaction,
    dossier,
    isLoading,
    error,
    setTransaction,
    loadTransaction,
    clearTransaction,
  };
}
