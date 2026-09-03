import { Transaction, TransactionDossier } from '../types/risk';

export function createMockDossier(tx: Transaction): TransactionDossier {
  const isCrit = tx.riskTier === 'CRITICAL';
  const isHigh = tx.riskTier === 'HIGH';

  return {
    transactionId: tx.id,
    evaluatedAt: tx.timestamp.includes('T') ? tx.timestamp : `2026-09-03T${tx.timestamp}Z`,
    summary: {
      sender: tx.sender,
      receiver: tx.receiver,
      amount: tx.amount,
      currency: tx.currency || 'USD',
      timestamp: tx.timestamp,
      transactionType: 'Pre-Commitment Wire Transfer',
      riskScore: tx.riskScore,
      riskTier: tx.riskTier,
      status: tx.status,
      recommendedAction: isCrit ? 'HOLD_FOR_REVIEW' : isHigh ? 'STEP_UP_AUTH' : 'FLAG_FOR_MONITORING',
    },
    lenses: {
      sequenceScore: isCrit ? 96 : isHigh ? 82 : 45,
      networkScore: isCrit ? 94 : isHigh ? 78 : 38,
      contextScore: isCrit ? 88 : isHigh ? 72 : 28,
      anomalyScore: isCrit ? 92 : isHigh ? 84 : 32,
    },
    evidenceList: [
      {
        id: 'ev-1',
        title: 'Transaction exceeds normal account baseline',
        description: `Current transfer of $${tx.amount.toLocaleString()} is ${isCrit ? '6.4x' : '3.8x'} above the sender's 90-day historical mean transaction value.`,
        severity: tx.riskTier,
        lens: 'SEQUENCE',
      },
      {
        id: 'ev-2',
        title: 'Receiver is a newly observed counterparty',
        description: `Destination account ${tx.receiver} has zero historical interaction with sender within the prior 180 days.`,
        severity: isCrit ? 'HIGH' : 'MEDIUM',
        lens: 'CONTEXT',
      },
      {
        id: 'ev-3',
        title: 'Multiple connected accounts show coordinated activity',
        description: '4 synchronized structured transfers dispatched to downstream hops within a 6-minute window.',
        severity: isCrit ? 'CRITICAL' : 'HIGH',
        lens: 'ANOMALY',
      },
      {
        id: 'ev-4',
        title: 'Account is associated with a suspected transaction ring',
        description: `Graph topology reveals cyclic routing connecting ${tx.sender} to known mule cluster #SYNDICATE-ALPHA.`,
        severity: isCrit ? 'CRITICAL' : 'HIGH',
        lens: 'NETWORK',
      },
    ],
    shapFeatures: [
      { feature: 'Transaction Amount', impact: 0.34, description: 'High deviation from baseline' },
      { feature: 'New Counterparty', impact: 0.27, description: 'First observed counterparty interaction' },
      { feature: 'Velocity Spike', impact: 0.22, description: '8 transfers executed in 1 hour' },
      { feature: 'Ring Connectivity', impact: 0.18, description: 'Connected to cyclic mule graph' },
      { feature: 'Account Age / State', impact: 0.08, description: 'Recent credential modification' },
    ],
    complianceActions: [
      {
        id: 'act-1',
        action: 'Hold transaction for review',
        description: 'Immediately place a pre-settlement hold on payment execution pending SAR review.',
        priority: isCrit ? 'CRITICAL' : 'HIGH',
      },
      {
        id: 'act-2',
        action: 'Step-up authentication',
        description: 'Trigger mandatory hardware token or biometric challenge before release.',
        priority: 'HIGH',
      },
      {
        id: 'act-3',
        action: 'Request additional verification',
        description: 'Prompt sender for invoice or verified contractual documentation.',
        priority: 'RECOMMENDED',
      },
      {
        id: 'act-4',
        action: 'Monitor connected accounts',
        description: `Place destination ${tx.receiver} on real-time graph observation watch-list.`,
        priority: 'RECOMMENDED',
      },
      {
        id: 'act-5',
        action: 'Escalate to AML analyst',
        description: 'Generate audit trail dossier and assign to Tier-2 financial crimes investigation unit.',
        priority: isCrit ? 'CRITICAL' : 'HIGH',
      },
    ],
  };
}
