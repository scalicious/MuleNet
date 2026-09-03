import { Transaction, TransactionDossier, Evidence, SHAPFeature, ComplianceAction, RiskTier } from '../types/risk';

export function createMockDossier(tx: Transaction): TransactionDossier {
  const amountVal = typeof tx.amount === 'number' ? tx.amount : parseFloat(String(tx.amount).replace(/[^0-9.]/g, '')) || 50000;
  const tier = tx.riskTier;
  const isCrit = tier === 'CRITICAL';
  const isHigh = tier === 'HIGH';
  const isMed = tier === 'MEDIUM';
  const isLow = tier === 'LOW';

  // Transaction-specific multiplier & baseline
  const baselineAvg = Math.max(1200, Math.round(amountVal / (isCrit ? 6.4 : isHigh ? 3.8 : isMed ? 1.9 : 0.95)));
  const deviationFactor = (amountVal / baselineAvg).toFixed(1);

  // Dynamic Evidence tailored to the transaction properties
  let evidenceList: Evidence[] = [];
  let shapFeatures: SHAPFeature[] = [];
  let complianceActions: ComplianceAction[] = [];
  let recommendedAction = 'ALLOW_STP';

  if (isCrit) {
    recommendedAction = 'IMMEDIATE_HOLD_AND_FREEZE';
    evidenceList = [
      {
        id: `ev-${tx.id}-1`,
        title: 'Severe Transaction Baseline Deviation',
        description: `Transfer of $${amountVal.toLocaleString()} is ${deviationFactor}x higher than sender ${tx.sender}'s 90-day historical mean ($${baselineAvg.toLocaleString()}).`,
        severity: 'CRITICAL',
        lens: 'SEQUENCE',
      },
      {
        id: `ev-${tx.id}-2`,
        title: 'High-Velocity Syndicate Mule Ring Membership',
        description: `Graph topology identifies ${tx.sender} and ${tx.receiver} as central hubs in a 4-node circular cycle crossing 3 financial institutions (#SYNDICATE-ALPHA).`,
        severity: 'CRITICAL',
        lens: 'NETWORK',
      },
      {
        id: `ev-${tx.id}-3`,
        title: 'Rapid Pass-Through Dispersion Detected',
        description: `94% of funds received by ${tx.sender} over the preceding 48 hours were forwarded to counterparty ${tx.receiver} in under 4.2 minutes.`,
        severity: 'HIGH',
        lens: 'ANOMALY',
      },
      {
        id: `ev-${tx.id}-4`,
        title: 'Critical Security Credential Change',
        description: `2FA authentication device and phone number for ${tx.sender} were updated 75 seconds prior to transfer dispatch.`,
        severity: 'CRITICAL',
        lens: 'CONTEXT',
      },
    ];

    shapFeatures = [
      { feature: 'Transaction Amount', impact: 0.38, description: `${deviationFactor}x above historical baseline` },
      { feature: 'Ring Topology Score', impact: 0.29, description: 'Direct participation in cyclic mule cluster' },
      { feature: 'Velocity Spike (1h)', impact: 0.24, description: 'Rapid dispersion in sub-minute window' },
      { feature: 'Credential Tamper Delta', impact: 0.19, description: 'Password/2FA modified immediately prior' },
      { feature: 'Counterparty Risk', impact: 0.12, description: `Receiver ${tx.receiver} has 6 active SAR flags` },
    ];

    complianceActions = [
      {
        id: `act-${tx.id}-1`,
        action: 'Hold transaction for review',
        description: 'Immediate pre-settlement freeze placed on outgoing payment execution.',
        priority: 'CRITICAL',
      },
      {
        id: `act-${tx.id}-2`,
        action: 'Escalate to Senior AML Analyst',
        description: `Compile forensic audit trail for ${tx.sender} and dispatch prioritized SAR filing package.`,
        priority: 'CRITICAL',
      },
      {
        id: `act-${tx.id}-3`,
        action: 'Restrict Outbound Capabilities',
        description: `Temporarily lock electronic transfer capabilities on ${tx.sender} pending identity re-verification.`,
        priority: 'HIGH',
      },
      {
        id: `act-${tx.id}-4`,
        action: 'Isolate Connected Mule Accounts',
        description: `Propagate risk score bump to counterparty ${tx.receiver} and downstream beneficiaries.`,
        priority: 'HIGH',
      },
    ];
  } else if (isHigh) {
    recommendedAction = 'STEP_UP_AUTHENTICATION';
    evidenceList = [
      {
        id: `ev-${tx.id}-1`,
        title: 'Elevated Transaction Velocity',
        description: `Current transfer of $${amountVal.toLocaleString()} exceeds average volume by ${deviationFactor}x for account ${tx.sender}.`,
        severity: 'HIGH',
        lens: 'SEQUENCE',
      },
      {
        id: `ev-${tx.id}-2`,
        title: 'Newly Observed High-Risk Counterparty',
        description: `Destination account ${tx.receiver} has zero historical interaction with ${tx.sender} and has been active for <14 days.`,
        severity: 'HIGH',
        lens: 'CONTEXT',
      },
      {
        id: `ev-${tx.id}-3`,
        title: 'Smurfing Pattern / Structured Amount',
        description: `Transfer amount ($${amountVal.toLocaleString()}) sits just below the $20,000 regulatory reporting threshold.`,
        severity: 'MEDIUM',
        lens: 'ANOMALY',
      },
      {
        id: `ev-${tx.id}-4`,
        title: 'Graph Layering Funnel Link',
        description: `Account is connected to secondary layer aggregator nodes in cluster #SMURF_CLUSTER_B.`,
        severity: 'HIGH',
        lens: 'NETWORK',
      },
    ];

    shapFeatures = [
      { feature: 'New Counterparty', impact: 0.32, description: 'Zero transaction history between accounts' },
      { feature: 'Threshold Proximity', impact: 0.26, description: 'Structured payment near compliance limits' },
      { feature: 'Transaction Amount', impact: 0.21, description: `${deviationFactor}x above 30-day mean` },
      { feature: 'Device Fingerprint Variance', impact: 0.15, description: 'New IP subnet / unverified device' },
      { feature: 'Graph Closeness Centrality', impact: 0.09, description: 'Proximity to flagged smurfing node' },
    ];

    complianceActions = [
      {
        id: `act-${tx.id}-1`,
        action: 'Step-up authentication',
        description: 'Prompt user with biometric verification and out-of-band push confirmation.',
        priority: 'HIGH',
      },
      {
        id: `act-${tx.id}-2`,
        action: 'Request additional verification',
        description: 'Require purpose of payment confirmation before settlement clearance.',
        priority: 'HIGH',
      },
      {
        id: `act-${tx.id}-3`,
        action: 'Monitor connected accounts',
        description: `Place destination ${tx.receiver} on automated 72-hour transaction observation.`,
        priority: 'RECOMMENDED',
      },
      {
        id: `act-${tx.id}-4`,
        action: 'Automated Risk Logging',
        description: 'Log transaction anomaly to compliance audit trail for quarterly review.',
        priority: 'OPTIONAL',
      },
    ];
  } else if (isMed) {
    recommendedAction = 'SOFT_CHALLENGE_AND_LOG';
    evidenceList = [
      {
        id: `ev-${tx.id}-1`,
        title: 'Moderate Off-Hour Timing Variance',
        description: `Transfer executed outside of sender ${tx.sender}'s typical active operating window (02:00-05:00 local time).`,
        severity: 'MEDIUM',
        lens: 'CONTEXT',
      },
      {
        id: `ev-${tx.id}-2`,
        title: 'Infrequent Counterparty Interaction',
        description: `Counterparty ${tx.receiver} has had only 1 prior transfer in the preceding 120 days.`,
        severity: 'MEDIUM',
        lens: 'NETWORK',
      },
      {
        id: `ev-${tx.id}-3`,
        title: 'Slight Flow Acceleration',
        description: `Account has transacted 3 times in the last 24 hours compared to baseline of 0.8 tx/day.`,
        severity: 'LOW',
        lens: 'SEQUENCE',
      },
    ];

    shapFeatures = [
      { feature: 'Time of Day Anomaly', impact: 0.22, description: 'Outside primary active user schedule' },
      { feature: 'Counterparty Recency', impact: 0.17, description: 'Infrequently transacted receiver' },
      { feature: '24h Velocity Delta', impact: 0.13, description: 'Mild acceleration in transfer count' },
      { feature: 'Geographic Distance', impact: 0.08, description: 'Originating IP outside primary state' },
    ];

    complianceActions = [
      {
        id: `act-${tx.id}-1`,
        action: 'Soft In-App Challenge',
        description: 'Display payment confirmation warning with verified receiver name display.',
        priority: 'RECOMMENDED',
      },
      {
        id: `act-${tx.id}-2`,
        action: 'Enhanced Telemetry Logging',
        description: 'Capture detailed session device signals and latency metrics for downstream models.',
        priority: 'RECOMMENDED',
      },
      {
        id: `act-${tx.id}-3`,
        action: 'Allow with Post-Execution Review',
        description: 'Permit transaction execution while queueing for overnight batch risk scoring.',
        priority: 'OPTIONAL',
      },
    ];
  } else {
    // LOW RISK
    recommendedAction = 'ALLOW_STRAIGHT_THROUGH_PROCESSING';
    evidenceList = [
      {
        id: `ev-${tx.id}-1`,
        title: 'Transaction Fully Aligns with Historical Baseline',
        description: `Amount of $${amountVal.toLocaleString()} matches regular monthly payment pattern ($${baselineAvg.toLocaleString()} avg) for ${tx.sender}.`,
        severity: 'LOW',
        lens: 'SEQUENCE',
      },
      {
        id: `ev-${tx.id}-2`,
        title: 'Known and Whitelisted Counterparty',
        description: `Receiver ${tx.receiver} is a verified counterparty with 12+ successful historical transfers.`,
        severity: 'LOW',
        lens: 'NETWORK',
      },
      {
        id: `ev-${tx.id}-3`,
        title: 'Consistent Device & Network Signals',
        description: 'Session origin matches primary enrolled device with clean biometric authentication.',
        severity: 'LOW',
        lens: 'CONTEXT',
      },
    ];

    shapFeatures = [
      { feature: 'Verified Historical Counterparty', impact: 0.05, description: 'Frequent legitimate interaction' },
      { feature: 'Consistent Baseline Amount', impact: 0.04, description: 'Matches standard payment interval' },
      { feature: 'Clean Device Fingerprint', impact: 0.02, description: 'Trusted hardware certificate match' },
      { feature: 'KYC Verification Status', impact: 0.01, description: 'Fully documented individual account' },
    ];

    complianceActions = [
      {
        id: `act-${tx.id}-1`,
        action: 'Allow Straight-Through Processing (STP)',
        description: 'Authorize immediate pre-commitment execution with zero user friction.',
        priority: 'OPTIONAL',
      },
      {
        id: `act-${tx.id}-2`,
        action: 'Standard Compliance Audit Log',
        description: 'Record normal transaction telemetry to system audit stream.',
        priority: 'OPTIONAL',
      },
    ];
  }

  return {
    transactionId: tx.id,
    evaluatedAt: tx.timestamp.includes('T') ? tx.timestamp : `2026-09-03T${tx.timestamp}Z`,
    summary: {
      sender: tx.sender,
      receiver: tx.receiver,
      amount: amountVal,
      currency: tx.currency || 'USD',
      timestamp: tx.timestamp,
      transactionType: 'Pre-Commitment Electronic Transfer',
      riskScore: tx.riskScore,
      riskTier: tx.riskTier,
      status: tx.status,
      recommendedAction,
    },
    lenses: {
      sequenceScore: isCrit ? 96 : isHigh ? 82 : isMed ? 48 : 12,
      networkScore: isCrit ? 94 : isHigh ? 78 : isMed ? 44 : 15,
      contextScore: isCrit ? 88 : isHigh ? 72 : isMed ? 38 : 10,
      anomalyScore: isCrit ? 92 : isHigh ? 84 : isMed ? 52 : 14,
    },
    evidenceList,
    shapFeatures,
    complianceActions,
    typologies: isCrit
      ? [
          {
            code: 'RAPID_PASS_THROUGH',
            name: 'Rapid Pass-Through Dispersion',
            severity: 'CRITICAL',
            evidence: `94% of funds forwarded to ${tx.receiver} in under 4.2 minutes of receipt.`,
          },
        ]
      : undefined,
    graphContext: {
      clusterId: isCrit ? 'SYNDICATE_ALPHA' : isHigh ? 'SMURF_CLUSTER_B' : undefined,
      directDegree: isCrit ? 8 : isHigh ? 5 : 2,
      syndicateRisk: isCrit ? 0.96 : isHigh ? 0.78 : 0.15,
    },
  };
}
