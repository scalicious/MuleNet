import { apiClient } from './apiClient';

export interface SimulationDetection {
  riskScore: number;
  riskTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface SimulationResult {
  simulationId: string;
  scenario: string;
  status: 'INITIALIZED' | 'IN_PROGRESS' | 'DETECTED' | 'MITIGATED';
  affectedAccounts: string[];
  transactionsGenerated: number;
  riskIncrease: number;
  detection: SimulationDetection;
}

export async function simulateAttack(scenario: string): Promise<SimulationResult> {
  try {
    return await apiClient.post<SimulationResult>('/demo/simulate', { scenario });
  } catch (err) {
    console.warn(`[simulationService] Backend unreachable for simulateAttack(${scenario}), using mock fallback:`, err);
    return {
      simulationId: `SIM-${Math.floor(10000 + Math.random() * 90000)}`,
      scenario,
      status: 'DETECTED',
      affectedAccounts: ['ACC-1042', 'ACC-8821', 'ACC-7734', 'ACC-2931'],
      transactionsGenerated: Math.floor(25 + Math.random() * 30),
      riskIncrease: Math.floor(35 + Math.random() * 25),
      detection: {
        riskScore: 96,
        riskTier: 'CRITICAL',
      },
    };
  }
}
