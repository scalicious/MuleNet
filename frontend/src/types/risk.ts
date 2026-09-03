/**
 * Core domain types for Pre-Commitment Risk Intelligence platform.
 */

export type RiskTier = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type EnforcementStatus = 'ALLOWED' | 'FLAGGED' | 'CHALLENGED' | 'BLOCKED';

export interface Transaction {
  id: string;
  timestamp: string;
  sender: string;
  receiver: string;
  amount: number;
  currency: string;
  riskScore: number;
  riskTier: RiskTier;
  status: EnforcementStatus;
  isNew?: boolean;
}

export interface TypologyEvidence {
  code: string;
  name: string;
  severity: RiskTier;
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
    riskTier: RiskTier;
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

export interface AccountProfile {
  accountId: string;
  status: 'ACTIVE' | 'RESTRICTED' | 'SUSPENDED' | 'UNDER_REVIEW';
  riskScore: number;
  riskTier: RiskTier;
  firstSeen: string;
  totalTransactedVolume: number;
  currency: string;
  muleClusterId?: string | null;
  flags: {
    isMuleCandidate: boolean;
    hasCredentialTamper: boolean;
    dormantReactivated: boolean;
  };
  activitySummary: {
    totalInflow30d: number;
    totalOutflow30d: number;
    averageHoldTimeMinutes: number;
    flaggedTxnCount: number;
  };
}
