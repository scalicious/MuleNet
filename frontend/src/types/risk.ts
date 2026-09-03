/**
 * Core domain types for Pre-Commitment Risk Intelligence platform.
 */

export type RiskTier = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type EnforcementStatus = 'ALLOWED' | 'FLAGGED' | 'CHALLENGED' | 'BLOCKED';

export type SimulationScenario = 'ACCOUNT_TAKEOVER' | 'SMURFING' | 'MULE_RING';

export type SimulationStage = 
  | 'IDLE'
  | 'INITIALIZING'
  | 'INJECTING_EVENTS'
  | 'ANALYZING'
  | 'RISK_DETECTED'
  | 'MITIGATION_RECOMMENDED';

export interface SimulationDetails {
  scenario: SimulationScenario;
  stage: SimulationStage;
  statusText: string;
  affectedAccounts: string[];
  transactionsGenerated: number;
  riskIncrease: number;
  detectionScore: number;
  detectionTier: RiskTier;
  mitigationSummary: string;
}

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

export interface Account {
  id: string;
  name?: string;
  riskTier: RiskTier;
  riskScore: number;
  transactedVolume: number;
  connectedCount: number;
  muleCluster?: string;
  isFocus?: boolean;
}

export interface GraphNode {
  id: string;
  label?: string;
  riskTier: RiskTier;
  riskScore: number;
  transactedVolume: number;
  connectedCount?: number;
  muleCluster?: string;
  isFocus?: boolean;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  amount: number;
  riskScore?: number;
  riskTier?: RiskTier;
  frequency?: number;
  isRisky?: boolean;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface Evidence {
  id: string;
  title: string;
  description: string;
  severity: RiskTier;
  lens?: 'SEQUENCE' | 'NETWORK' | 'CONTEXT' | 'ANOMALY';
}

export interface SHAPFeature {
  feature: string;
  impact: number;
  description?: string;
}

export interface ComplianceAction {
  id: string;
  action: string;
  description: string;
  priority: 'CRITICAL' | 'HIGH' | 'RECOMMENDED' | 'OPTIONAL';
  status?: 'PENDING' | 'EXECUTED' | 'DISMISSED';
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
    status: EnforcementStatus;
    transactionType: string;
    recommendedAction: string;
  };
  lenses: {
    sequenceScore: number;
    networkScore: number;
    contextScore: number;
    anomalyScore: number;
  };
  evidenceList: Evidence[];
  shapFeatures: SHAPFeature[];
  complianceActions: ComplianceAction[];
  typologies?: TypologyEvidence[];
  graphContext?: {
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
