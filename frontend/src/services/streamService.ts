import { API_V1_URL } from './apiClient';

export interface StreamTransaction {
  id: string;
  time: string;
  sender: string;
  receiver: string;
  amount: string | number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  fusedScore?: number;
  riskScore?: number;
  recommendedAction?: string;
  typologies?: Array<{ name: string; evidence: string }>;
  shapFactors?: Array<{ feature: string; impact: number; explanation?: string }>;
  lenses?: { sequence_score?: number; network_score?: number; context_score?: number; anomaly_score?: number };
  isNew?: boolean;
}

const MOCK_ACCOUNTS = [
  'ACC-1042', 'ACC-8821', 'ACC-2931', 'ACC-7734', 'ACC-9012',
  'ACC-1022', 'ACC-5419', 'ACC-3820', 'ACC-6105', 'ACC-4491',
  'ACC-9204', 'ACC-3140', 'ACC-7218', 'ACC-5093'
];

const MOCK_AMOUNTS = [
  '$650', '$1,200', '$3,850', '$7,400', '$12,900', '$18,500',
  '$24,600', '$47,300', '$89,200', '$142,000', '$210,500'
];

const RISK_TIERS: StreamTransaction['riskLevel'][] = [
  'LOW', 'LOW', 'MEDIUM', 'LOW', 'HIGH', 'CRITICAL', 'MEDIUM', 'HIGH'
];

export function generateMockStreamTransaction(): StreamTransaction {
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
    id: `TXN-${Date.now().toString().slice(-5)}`,
    time,
    sender,
    receiver,
    amount,
    riskLevel,
    isNew: true,
  };
}

/**
 * Connects to the real-time SSE stream with automatic mock fallback if backend is offline.
 * Returns a cleanup unsubscribe function.
 */
export function connectTransactionStream(
  onTransaction: (tx: StreamTransaction) => void,
  onError?: (err: unknown) => void
): () => void {
  let eventSource: EventSource | null = null;
  let fallbackInterval: NodeJS.Timeout | null = null;
  let isClosed = false;

  const startFallback = () => {
    if (fallbackInterval || isClosed) return;
    fallbackInterval = setInterval(() => {
      if (!isClosed) {
        onTransaction(generateMockStreamTransaction());
      }
    }, 3000);
  };

  try {
    const streamUrl = `${API_V1_URL}/demo/stream`;
    eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      if (isClosed) return;
      try {
        const raw = JSON.parse(event.data);
        const txId = raw.transaction_id || raw.id || `TXN-${Date.now().toString().slice(-5)}`;
        const fusedScore = typeof raw.fused_score === 'number' ? raw.fused_score : (typeof raw.fusedScore === 'number' ? raw.fusedScore : undefined);
        const riskScore = fusedScore !== undefined ? Math.round(fusedScore * 100) : undefined;
        
        const tx: StreamTransaction = {
          id: txId,
          time: raw.timestamp
            ? (raw.timestamp.includes('T') ? raw.timestamp.split('T')[1]?.split('.')[0] : raw.timestamp)
            : new Date().toTimeString().split(' ')[0],
          sender: raw.sender || raw.sender_id || 'ACC-UNKNOWN',
          receiver: raw.receiver || raw.receiver_id || 'ACC-UNKNOWN',
          amount: typeof raw.amount === 'number' ? `$${raw.amount.toLocaleString()}` : (raw.amount || '$0'),
          riskLevel: raw.riskTier || raw.risk_tier || 'LOW',
          fusedScore,
          riskScore,
          recommendedAction: raw.recommended_action || raw.recommendedAction,
          typologies: raw.typologies || [],
          shapFactors: raw.shap_factors || raw.shapFactors || [],
          lenses: raw.lenses,
          isNew: true,
        };
        onTransaction(tx);
      } catch (err) {
        console.error('[streamService] Error parsing SSE payload:', err);
      }
    };

    eventSource.onerror = (err) => {
      if (onError) onError(err);
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      // Graceful fallback to mock stream
      startFallback();
    };
  } catch (err) {
    if (onError) onError(err);
    startFallback();
  }

  // Return cleanup function
  return () => {
    isClosed = true;
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    if (fallbackInterval) {
      clearInterval(fallbackInterval);
      fallbackInterval = null;
    }
  };
}
