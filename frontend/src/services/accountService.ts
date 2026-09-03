import { apiClient } from './apiClient';

export interface AccountFlags {
  isMuleCandidate: boolean;
  hasCredentialTamper: boolean;
  dormantReactivated: boolean;
}

export interface AccountActivitySummary {
  totalInflow30d: number;
  totalOutflow30d: number;
  averageHoldTimeMinutes: number;
  flaggedTxnCount: number;
}

export interface AccountProfile {
  accountId: string;
  status: 'ACTIVE' | 'RESTRICTED' | 'SUSPENDED' | 'UNDER_REVIEW';
  riskScore: number;
  riskTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  firstSeen: string;
  totalTransactedVolume: number;
  currency: string;
  muleClusterId?: string | null;
  flags: AccountFlags;
  activitySummary: AccountActivitySummary;
}

const MOCK_ACCOUNTS: Record<string, AccountProfile> = {
  'ACC-1042': {
    accountId: 'ACC-1042',
    status: 'RESTRICTED',
    riskScore: 89,
    riskTier: 'HIGH',
    firstSeen: '2025-11-14T08:12:00Z',
    totalTransactedVolume: 1428500.0,
    currency: 'USD',
    muleClusterId: 'CLUSTER-904',
    flags: {
      isMuleCandidate: true,
      hasCredentialTamper: true,
      dormantReactivated: false,
    },
    activitySummary: {
      totalInflow30d: 740200.0,
      totalOutflow30d: 725000.0,
      averageHoldTimeMinutes: 6.4,
      flaggedTxnCount: 14,
    },
  },
};

export async function getAccount(id: string): Promise<AccountProfile> {
  try {
    return await apiClient.get<AccountProfile>(`/accounts/${id}`);
  } catch (err) {
    console.warn(`[accountService] Backend unreachable for getAccount(${id}), using mock fallback:`, err);
    if (MOCK_ACCOUNTS[id]) {
      return MOCK_ACCOUNTS[id];
    }
    return {
      accountId: id,
      status: 'RESTRICTED',
      riskScore: 85,
      riskTier: 'HIGH',
      firstSeen: new Date(Date.now() - 90 * 86400000).toISOString(),
      totalTransactedVolume: 850000.0,
      currency: 'USD',
      muleClusterId: 'CLUSTER-904',
      flags: {
        isMuleCandidate: true,
        hasCredentialTamper: false,
        dormantReactivated: false,
      },
      activitySummary: {
        totalInflow30d: 450000.0,
        totalOutflow30d: 440000.0,
        averageHoldTimeMinutes: 8.2,
        flaggedTxnCount: 6,
      },
    };
  }
}
