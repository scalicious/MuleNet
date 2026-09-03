import { GraphData } from '../types/risk';

export const MOCK_GRAPH_DATA: GraphData = {
  nodes: [
    // Mule Ring Cluster A (Critical Core)
    { id: 'ACC-1042', label: 'Primary Mule Hub', riskTier: 'CRITICAL', riskScore: 94, transactedVolume: 1420500, muleCluster: 'SYNDICATE_ALPHA' },
    { id: 'ACC-8821', label: 'High Velocity Aggregator', riskTier: 'CRITICAL', riskScore: 96, transactedVolume: 2180000, muleCluster: 'SYNDICATE_ALPHA' },
    { id: 'ACC-6105', label: 'Rapid Pass-Through', riskTier: 'CRITICAL', riskScore: 92, transactedVolume: 940000, muleCluster: 'SYNDICATE_ALPHA' },
    
    // Smurfing Layer Cluster B (High Risk)
    { id: 'ACC-2931', label: 'Layering Dispatcher', riskTier: 'HIGH', riskScore: 82, transactedVolume: 480000, muleCluster: 'SMURF_CLUSTER_B' },
    { id: 'ACC-7734', label: 'Cross-Bank Relay', riskTier: 'HIGH', riskScore: 78, transactedVolume: 620000, muleCluster: 'SMURF_CLUSTER_B' },
    { id: 'ACC-5419', label: 'Secondary Funnel', riskTier: 'HIGH', riskScore: 74, transactedVolume: 830000, muleCluster: 'SMURF_CLUSTER_B' },
    
    // Intermediate Suspicious (Medium Risk)
    { id: 'ACC-9012', label: 'Merchant Gateway Proxy', riskTier: 'MEDIUM', riskScore: 54, transactedVolume: 210000 },
    { id: 'ACC-3820', label: 'High Inflow Account', riskTier: 'MEDIUM', riskScore: 48, transactedVolume: 185000 },
    { id: 'ACC-7218', label: 'Retail Transfer Intermediary', riskTier: 'MEDIUM', riskScore: 52, transactedVolume: 195000 },

    // Legitimate Flow Accounts (Low Risk)
    { id: 'ACC-1022', label: 'Verified Payroll Sender', riskTier: 'LOW', riskScore: 12, transactedVolume: 45000 },
    { id: 'ACC-4491', label: 'Consumer Checking', riskTier: 'LOW', riskScore: 18, transactedVolume: 62000 },
    { id: 'ACC-9204', label: 'Corporate Vendor Escrow', riskTier: 'LOW', riskScore: 22, transactedVolume: 78000 },
    { id: 'ACC-3140', label: 'Retail P2P User', riskTier: 'LOW', riskScore: 14, transactedVolume: 34000 },
    { id: 'ACC-5093', label: 'Standard Savings', riskTier: 'LOW', riskScore: 16, transactedVolume: 51000 },
  ],
  links: [
    // High-risk cyclic syndicate transfers
    { source: 'ACC-1042', target: 'ACC-8821', amount: 84920, riskScore: 94, riskTier: 'CRITICAL', isRisky: true, frequency: 14 },
    { source: 'ACC-8821', target: 'ACC-6105', amount: 129400, riskScore: 96, riskTier: 'CRITICAL', isRisky: true, frequency: 18 },
    { source: 'ACC-6105', target: 'ACC-1042', amount: 92000, riskScore: 92, riskTier: 'CRITICAL', isRisky: true, frequency: 12 },
    { source: 'ACC-8821', target: 'ACC-2931', amount: 48500, riskScore: 84, riskTier: 'HIGH', isRisky: true, frequency: 9 },

    // Smurfing & Layering chains
    { source: 'ACC-2931', target: 'ACC-7734', amount: 18200, riskScore: 78, riskTier: 'HIGH', isRisky: true, frequency: 8 },
    { source: 'ACC-7734', target: 'ACC-5419', amount: 42500, riskScore: 76, riskTier: 'HIGH', isRisky: true, frequency: 7 },
    { source: 'ACC-5419', target: 'ACC-3820', amount: 24600, riskScore: 68, riskTier: 'MEDIUM', isRisky: false, frequency: 5 },
    { source: 'ACC-3820', target: 'ACC-7218', amount: 14500, riskScore: 52, riskTier: 'MEDIUM', isRisky: false, frequency: 4 },

    // Inflow from legitimate & gateway nodes
    { source: 'ACC-1022', target: 'ACC-2931', amount: 820, riskScore: 12, riskTier: 'LOW', isRisky: false, frequency: 2 },
    { source: 'ACC-4491', target: 'ACC-5419', amount: 1450, riskScore: 18, riskTier: 'LOW', isRisky: false, frequency: 2 },
    { source: 'ACC-9012', target: 'ACC-8821', amount: 3100, riskScore: 48, riskTier: 'MEDIUM', isRisky: false, frequency: 3 },
    { source: 'ACC-9204', target: 'ACC-1042', amount: 6500, riskScore: 24, riskTier: 'LOW', isRisky: false, frequency: 2 },
    { source: 'ACC-3140', target: 'ACC-7734', amount: 1200, riskScore: 14, riskTier: 'LOW', isRisky: false, frequency: 1 },
    { source: 'ACC-5093', target: 'ACC-9012', amount: 2800, riskScore: 16, riskTier: 'LOW', isRisky: false, frequency: 2 },
    { source: 'ACC-7218', target: 'ACC-6105', amount: 9800, riskScore: 54, riskTier: 'MEDIUM', isRisky: false, frequency: 4 },
  ],
};
