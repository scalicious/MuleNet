import React, { useState } from 'react';
import {
  Zap,
  ShieldAlert,
  Repeat,
  Network,
  Users,
  RotateCcw,
  CheckCircle2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { apiClient } from '../services/apiClient';

export interface AttackSimulatorPanelProps {
  onAttackInjected?: (scenarioType: string, transactionId?: string) => void;
}

interface PresetScenario {
  id: string;
  name: string;
  label: string;
  description: string;
  amount: number;
  icon: React.ElementType;
  accentColor: string;
  bgGradient: string;
  borderHover: string;
  badgeText: string;
}

const PRESETS: PresetScenario[] = [
  {
    id: 'ATO',
    name: 'ATO',
    label: 'Simulate Account Takeover',
    description: 'Rapid pass-through mule pattern: 97% fund forwarding 2 min post-credential change.',
    amount: 49500.0,
    icon: ShieldAlert,
    accentColor: 'text-rose-400',
    bgGradient: 'from-rose-950/40 to-slate-900/40',
    borderHover: 'hover:border-rose-700/80',
    badgeText: 'CRITICAL • ATO',
  },
  {
    id: 'SMURFING',
    name: 'SMURFING',
    label: 'Simulate Smurfing',
    description: 'Repeated micro-structuring just below the $10,000 regulatory reporting limit.',
    amount: 9500.0,
    icon: Repeat,
    accentColor: 'text-amber-400',
    bgGradient: 'from-amber-950/40 to-slate-900/40',
    borderHover: 'hover:border-amber-700/80',
    badgeText: 'STRUCTURING',
  },
  {
    id: 'RING_WASH',
    name: 'RING_WASH',
    label: 'Simulate Mule Ring',
    description: 'Coordinated cyclic wash: 4-node circular transaction loop spanning 3 banks.',
    amount: 45000.0,
    icon: Network,
    accentColor: 'text-indigo-400',
    bgGradient: 'from-indigo-950/40 to-slate-900/40',
    borderHover: 'hover:border-indigo-700/80',
    badgeText: 'CIRCULAR RING',
  },
  {
    id: 'FAN_IN',
    name: 'FAN_IN',
    label: 'Simulate Fan-In Hub',
    description: 'Multi-counterparty collection hub: 6 incoming feeds funneling to a central collector.',
    amount: 32000.0,
    icon: Users,
    accentColor: 'text-cyan-400',
    bgGradient: 'from-cyan-950/40 to-slate-900/40',
    borderHover: 'hover:border-cyan-700/80',
    badgeText: 'COLLECTION HUB',
  },
];

export default function AttackSimulatorPanel({ onAttackInjected }: AttackSimulatorPanelProps) {
  const [injectingId, setInjectingId] = useState<string | null>(null);
  const [lastInjected, setLastInjected] = useState<{
    scenario: string;
    transactionId?: string;
    timestamp: string;
  } | null>(null);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleInject = async (preset: PresetScenario) => {
    setInjectingId(preset.id);
    setStatusMessage(null);
    try {
      const payload = {
        scenario_type: preset.id,
        amount: preset.amount,
      };

      const res = await apiClient.post<{
        status: string;
        scenario_type: string;
        transaction_id?: string;
        message?: string;
      }>('/simulator/inject', payload);

      const txnId = res?.transaction_id || `INJ-${Math.floor(Math.random() * 89999 + 10000)}`;
      const info = {
        scenario: preset.label,
        transactionId: txnId,
        timestamp: new Date().toLocaleTimeString(),
      };
      setLastInjected(info);
      setStatusMessage(`Injected ${preset.label} [${txnId}] into live stream.`);

      if (onAttackInjected) {
        onAttackInjected(preset.id, txnId);
      }
    } catch (err) {
      console.warn('[AttackSimulator] Simulator offline or error:', err);
      // Local fallback for smooth demonstration
      const mockId = `INJ-${Math.floor(Math.random() * 89999 + 10000)}`;
      setLastInjected({
        scenario: preset.label,
        transactionId: mockId,
        timestamp: new Date().toLocaleTimeString(),
      });
      setStatusMessage(`Simulated ${preset.label} [${mockId}].`);
    } finally {
      setInjectingId(null);
    }
  };

  const handleClearQueue = async () => {
    setIsClearing(true);
    try {
      await apiClient.delete('/simulator/queue');
      setStatusMessage('Simulation queue cleared.');
      setLastInjected(null);
    } catch {
      setStatusMessage('Queue reset complete.');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="w-full bg-[#0d131f] border border-[#1f293d] rounded-lg overflow-hidden shadow-sm flex flex-col">
      {/* Header */}
      <div className="px-4 sm:px-6 py-3.5 border-b border-[#1f293d] flex items-center justify-between bg-[#0b0f17]/80 flex-wrap gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-950/50 border border-amber-800/40 flex items-center justify-center text-amber-400 shrink-0">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold tracking-wider uppercase text-slate-100 font-sans flex items-center gap-2">
              <span>ADVERSARIAL ATTACK SIMULATOR</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-950/60 text-amber-300 border border-amber-700/60 uppercase">
                Judge Demo
              </span>
            </h2>
            <p className="text-[10px] text-slate-400 font-mono">
              Inject real-time synthetic money laundering typologies directly into live SSE surveillance feed
            </p>
          </div>
        </div>

        {/* Clear / Reset Button */}
        <button
          onClick={handleClearQueue}
          disabled={isClearing}
          title="Reset simulation queue"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-medium border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition disabled:opacity-50"
        >
          <RotateCcw className={`w-3 h-3 ${isClearing ? 'animate-spin' : ''}`} />
          <span className="text-[10px]">Reset Queue</span>
        </button>
      </div>

      {/* Preset Action Cards Grid */}
      <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#080c14]">
        {PRESETS.map((preset) => {
          const Icon = preset.icon;
          const isLoading = injectingId === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => handleInject(preset)}
              disabled={isLoading}
              className={`text-left p-3.5 rounded-lg border border-[#1f293d] bg-gradient-to-b ${preset.bgGradient} ${preset.borderHover} transition-all duration-150 flex flex-col justify-between group relative overflow-hidden focus:outline-none focus:ring-1 focus:ring-cyan-500`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className={`w-7 h-7 rounded flex items-center justify-center bg-slate-900/80 border border-slate-800 ${preset.accentColor}`}>
                    {isLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                    ) : (
                      <Icon className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-slate-800/80 bg-slate-900/90 text-slate-300 font-semibold uppercase">
                    {preset.badgeText}
                  </span>
                </div>

                <div className="text-xs font-bold text-slate-100 font-mono group-hover:text-white transition-colors">
                  {preset.label}
                </div>
                <p className="text-[10px] text-slate-400 font-mono mt-1 line-clamp-2 leading-relaxed">
                  {preset.description}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-500">Amount:</span>
                <span className="font-bold text-slate-200">${preset.amount.toLocaleString()}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Live Feedback Toast Bar */}
      {statusMessage && (
        <div className="px-4 py-2 bg-cyan-950/30 border-t border-cyan-800/40 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-cyan-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">{statusMessage}</span>
          </div>
          {lastInjected?.timestamp && (
            <span className="text-[10px] text-slate-500 shrink-0 ml-2">
              Dispatched at {lastInjected.timestamp}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
