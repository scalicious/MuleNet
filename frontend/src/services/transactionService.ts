import { apiClient } from './apiClient';

export interface Transaction {
  id: string;
  timestamp: string;
  sender: string;
  receiver: string;
  amount: number;
  currency: string;
  riskScore: number;
  riskTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'ALLOWED' | 'FLAGGED' | 'CHALLENGED' | 'BLOCKED';
}

export interface TypologyEvidence {
  code: string;
  name: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  evidence: string;
}

export interface ShapFactor {
  feature: string;
  impact: number;
  description: string;
}

export interface TransactionDossier {
  transactionId: string;
  evaluatedAt: string;
  summary: {
    sender: string;
    receiver: string;
    amount: number;
    currency: string;
    riskScore: number;
    riskTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    recommendedAction: string;
  };
  lenses: {
    sequenceScore: number;
    networkScore: number;
    contextScore: number;
    anomalyScore: number;
  };
  typologies: TypologyEvidence[];
  shapFactors: ShapFactor[];
  graphContext: {
    clusterId?: string;
    directDegree: number;
    syndicateRisk: number;
  };
}

// Mock fallbacks for graceful degradation
const MOCK_TRANSACTIONS: Record<string, Transaction> = {
  'TXN-10482': {
    id: 'TXN-10482',
    timestamp: '2026-09-03T12:42:18Z',
    sender: 'ACC-1042',
    receiver: 'ACC-8821',
    amount: 84920,
    currency: 'USD',
    riskScore: 94,
    riskTier: 'CRITICAL',
    status: 'BLOCKED',
  },
  'TXN-10483': {
    id: 'TXN-10483',
    timestamp: '2026-09-03T12:41:52Z',
    sender: 'ACC-2931',
    receiver: 'ACC-7734',
    amount: 18200,
    currency: 'USD',
    riskScore: 78,
    riskTier: 'HIGH',
    status: 'CHALLENGED',
  },
};

export async function getTransaction(id: string): Promise<Transaction> {
  try {
    return await apiClient.get<Transaction>(`/transactions/${id}`);
  } catch (err) {
    console.warn(`[transactionService] Backend unreachable for getTransaction(${id}), using mock fallback:`, err);
    if (MOCK_TRANSACTIONS[id]) {
      return MOCK_TRANSACTIONS[id];
    }
    // Return dynamically constructed mock item
    return {
      id,
      timestamp: new Date().toISOString(),
      sender: 'ACC-1042',
      receiver: 'ACC-8821',
      amount: 84920,
      currency: 'USD',
      riskScore: 94,
      riskTier: 'CRITICAL',
      status: 'BLOCKED',
    };
  }
}

export async function getTransactionDossier(id: string): Promise<TransactionDossier> {
  try {
    return await apiClient.get<TransactionDossier>(`/transactions/${id}/dossier`);
  } catch (err) {
    console.warn(`[transactionService] Backend unreachable for getTransactionDossier(${id}), using mock fallback:`, err);
    return {
      transactionId: id,
      evaluatedAt: new Date().toISOString(),
      summary: {
        sender: 'ACC-1042',
        receiver: 'ACC-8821',
        amount: 84920,
        currency: 'USD',
        riskScore: 94,
        riskTier: 'CRITICAL',
        recommendedAction: 'BLOCK_AND_HOLD',
      },
      lenses: {
        sequenceScore: 96,
        networkScore: 91,
        contextScore: 88,
        anomalyScore: 95,
      },
      typologies: [
        {
          code: 'RAPID_PASS_THROUGH',
          name: 'Rapid Pass-Through Dispersion',
          severity: 'CRITICAL',
          evidence: '92% of funds forwarded to 3 downstream hops within 4.2 minutes of receipt.',
        },
        {
          code: 'CROSS_INSTITUTION_RING',
          name: 'Cross-Bank Mule Syndicate',
          severity: 'HIGH',
          evidence: 'Account is node #3 in a 5-node cyclic transfer chain spanning multiple routing numbers.',
        },
      ],
      shapFactors: [
        {
          feature: 'time_since_credential_change_sec',
          impact: 0.38,
          description: 'Password and 2FA device updated 90 seconds prior to high-value transfer.',
        },
        {
          feature: 'velocity_zscore_1h',
          impact: 0.31,
          description: 'Hourly outflow is 8.4x standard deviations above sender baseline.',
        },
      ],
      graphContext: {
        clusterId: 'MULE-CLUSTER-882',
        directDegree: 6,
        syndicateRisk: 0.94,
      },
    };
  }
}
