import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  Play,
  RotateCcw,
  Zap,
  Users,
  TrendingUp,
  Radio,
  CheckCircle2,
  AlertOctagon,
  Layers,
  KeyRound,
  Workflow,
} from 'lucide-react';
import { SimulationScenario, SimulationStage, RiskTier } from '../types/risk';
import RiskBadge from './RiskBadge';

export interface AttackSimulatorProps {
  onScenarioRun?: (scenario: SimulationScenario, affectedAccounts: string[]) => void;
  onReset?: () => void;
}

interface ScenarioConfig {
  id: SimulationScenario;
  name: string;
  category: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  affectedAccounts: string[];
  transactionsGenerated: number;
  riskIncrease: number;
  detectionScore: number;
  detectionTier: RiskTier;
  mitigationText: string;
}

const SCENARIOS: ScenarioConfig[] = [
  {
    id: 'ACCOUNT_TAKEOVER',
    name: 'Account Takeover (ATO)',
    category: 'Credential Compromise',
    description: 'Simulates credential tampering followed by sub-minute high-value pass-through execution.',
    icon: KeyRound,
    affectedAccounts: ['ACC-1042'],
    transactionsGenerated: 14,
    riskIncrease: 45,
    detectionScore: 94,
    detectionTier: 'CRITICAL',
    mitigationText: 'Immediate pre-settlement hold + biometric step-up 2FA re-verification required.',
  },
  {
    id: 'SMURFING',
    name: 'Smurfing / Structuring Funnel',
    category: 'Velocity Anomaly',
    description: 'High-frequency micro-structured deposits aggregating into a central secondary mule.',
    icon: Workflow,
    affectedAccounts: ['ACC-2931', 'ACC-7734', 'ACC-5419', 'ACC-3820'],
    transactionsGenerated: 38,
    riskIncrease: 52,
    detectionScore: 86,
    detectionTier: 'HIGH',
    mitigationText: 'Aggregated velocity threshold triggered; downstream beneficiary accounts isolated.',
  },
  {
    id: 'MULE_RING',
    name: 'Mule Syndicate Ring',
    category: 'Network Topology',
    description: 'Cyclic layered transaction routing across 4 interconnected accounts spanning institutions.',
    icon: Layers,
    affectedAccounts: ['ACC-1042', 'ACC-8821', 'ACC-6105', 'ACC-2931'],
    transactionsGenerated: 46,
    riskIncrease: 64,
    detectionScore: 96,
    detectionTier: 'CRITICAL',
    mitigationText: 'Multi-hop cycle detected by GAT lens; automatic SAR dossier compiled for investigation.',
  },
];

const STAGES: Array<{ key: SimulationStage; label: string }> = [
  { key: 'INITIALIZING', label: '1. Initializing' },
  { key: 'INJECTING_EVENTS', label: '2. Injecting Events' },
  { key: 'ANALYZING', label: '3. Analyzing Pipeline' },
  { key: 'RISK_DETECTED', label: '4. Risk Detected' },
  { key: 'MITIGATION_RECOMMENDED', label: '5. Mitigation Recommended' },
];

export default function AttackSimulator({ onScenarioRun, onReset }: AttackSimulatorProps) {
  const [selectedScenarioId, setSelectedScenarioId] = useState<SimulationScenario>('MULE_RING');
  const [stage, setStage] = useState<SimulationStage>('IDLE');
  const [progress, setProgress] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const activeScenario = SCENARIOS.find((s) => s.id === selectedScenarioId) || SCENARIOS[0];

  const clearTimers = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  const runSimulation = () => {
    clearTimers();
    setStage('INITIALIZING');
    setProgress(10);

    timerRef.current = setTimeout(() => {
      setStage('INJECTING_EVENTS');
      setProgress(35);

      timerRef.current = setTimeout(() => {
        setStage('ANALYZING');
        setProgress(65);

        timerRef.current = setTimeout(() => {
          setStage('RISK_DETECTED');
          setProgress(85);

          timerRef.current = setTimeout(() => {
            setStage('MITIGATION_RECOMMENDED');
            setProgress(100);

            if (onScenarioRun) {
              onScenarioRun(activeScenario.id, activeScenario.affectedAccounts);
            }
          }, 800);
        }, 800);
      }, 900);
    }, 700);
  };

  const handleReset = () => {
    clearTimers();
    setStage('IDLE');
    setProgress(0);
    if (onReset) {
      onReset();
    }
  };

  const isRunning = stage !== 'IDLE' && stage !== 'MITIGATION_RECOMMENDED';
  const isFinished = stage === 'MITIGATION_RECOMMENDED';

  return (
    <div className="w-full bg-[#0d131f] border border-[#1f293d] rounded-lg overflow-hidden flex flex-col shadow-sm">
      {/* Simulation Console Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-[#1f293d] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0b0f17]/80">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-amber-950/40 border border-amber-800/40 flex items-center justify-center text-amber-400 shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold tracking-wider uppercase text-slate-100 font-sans">
                DEMO SIMULATION • RISK INJECTION CONSOLE
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/50 text-amber-300 border border-amber-800/50 uppercase">
                TEST BED ONLY
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Simulates synthetic attack patterns to stress-test pre-commitment detection algorithms
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <button
            onClick={runSimulation}
            disabled={isRunning}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-mono font-bold transition shadow-sm ${
              isRunning
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white border border-amber-500/50'
            }`}
          >
            <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'SIMULATING...' : 'RUN SIMULATION'}</span>
          </button>

          <button
            onClick={handleReset}
            disabled={stage === 'IDLE'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-medium transition border ${
              stage === 'IDLE'
                ? 'border-slate-800 bg-slate-900/40 text-slate-600 cursor-not-allowed'
                : 'border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Scenario Selector Ribbon */}
      <div className="p-4 sm:px-6 bg-[#090d15] border-b border-[#1f293d]/80">
        <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-2 font-semibold">
          Select Simulation Scenario:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {SCENARIOS.map((sc) => {
            const Icon = sc.icon;
            const isSelected = sc.id === selectedScenarioId;

            return (
              <button
                key={sc.id}
                onClick={() => {
                  if (!isRunning) {
                    setSelectedScenarioId(sc.id);
                    if (stage !== 'IDLE') handleReset();
                  }
                }}
                disabled={isRunning}
                className={`p-3 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'border-amber-500/80 bg-amber-950/20 ring-1 ring-amber-500/30 text-slate-100'
                    : 'border-[#1f293d] bg-[#0d131f]/60 hover:bg-[#121929] text-slate-300'
                } ${isRunning ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center space-x-2">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span className="text-xs font-bold font-sans">{sc.name}</span>
                  </div>
                  <RiskBadge tier={sc.detectionTier} size="sm" />
                </div>
                <p className="text-[11px] text-slate-400 font-mono leading-relaxed line-clamp-2">
                  {sc.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Progress Timeline Stepper */}
      <div className="px-4 sm:px-6 py-3.5 bg-[#0b0f17]/50 border-b border-[#1f293d]/80">
        <div className="flex items-center justify-between text-xs font-mono mb-2">
          <span className="text-slate-400 text-[11px] font-semibold uppercase flex items-center gap-1.5">
            <Radio className={`w-3.5 h-3.5 ${isRunning ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
            Pipeline Status: <span className="text-slate-100">{stage.replace(/_/g, ' ')}</span>
          </span>
          <span className="text-amber-400 font-bold">{progress}%</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden mb-3">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-[10px] font-mono text-center">
          {STAGES.map((s, idx) => {
            const stepIndex = idx + 1;
            const currentStep =
              stage === 'IDLE'
                ? 0
                : stage === 'INITIALIZING'
                ? 1
                : stage === 'INJECTING_EVENTS'
                ? 2
                : stage === 'ANALYZING'
                ? 3
                : stage === 'RISK_DETECTED'
                ? 4
                : 5;

            const isDone = currentStep > stepIndex;
            const isCurrent = currentStep === stepIndex;

            return (
              <div
                key={s.key}
                className={`py-1 px-1.5 rounded border transition-colors ${
                  isCurrent
                    ? 'border-amber-500 bg-amber-950/40 text-amber-300 font-bold'
                    : isDone
                    ? 'border-emerald-800/40 bg-emerald-950/20 text-emerald-400 font-medium'
                    : 'border-slate-800 bg-slate-900/40 text-slate-500'
                }`}
              >
                {s.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Telemetry Output Dashboard */}
      <div className="p-4 sm:px-6 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#090d15] text-xs font-mono">
        {/* Affected Accounts */}
        <div className="bg-[#0d131f] p-3 rounded-lg border border-[#1f293d]">
          <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
            <Users className="w-3 h-3 text-slate-400" /> Affected Accounts
          </div>
          <div className="text-sm font-bold text-cyan-300 mt-1 flex items-center gap-1.5 flex-wrap">
            {stage === 'IDLE' ? (
              <span className="text-slate-500 text-xs">Awaiting Run</span>
            ) : (
              activeScenario.affectedAccounts.map((acc) => (
                <span key={acc} className="px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40 text-xs">
                  {acc}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Transactions Generated */}
        <div className="bg-[#0d131f] p-3 rounded-lg border border-[#1f293d]">
          <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-slate-400" /> Txns Generated
          </div>
          <div className="text-sm font-bold text-slate-100 mt-1">
            {stage === 'IDLE' ? '0 Txns' : `${activeScenario.transactionsGenerated} Events`}
          </div>
        </div>

        {/* Risk Increase */}
        <div className="bg-[#0d131f] p-3 rounded-lg border border-[#1f293d]">
          <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
            <AlertOctagon className="w-3 h-3 text-slate-400" /> Risk Increase
          </div>
          <div className="text-sm font-bold text-rose-400 mt-1">
            {stage === 'IDLE' ? '+0%' : `+${activeScenario.riskIncrease}% Spike`}
          </div>
        </div>

        {/* Detection Status */}
        <div className="bg-[#0d131f] p-3 rounded-lg border border-[#1f293d]">
          <div className="text-[10px] text-slate-500 uppercase">Detection Status</div>
          <div className="mt-1 flex items-center gap-1.5">
            {stage === 'IDLE' ? (
              <span className="text-slate-500 text-xs">STANDBY</span>
            ) : isFinished ? (
              <RiskBadge tier={activeScenario.detectionTier} score={activeScenario.detectionScore} size="sm" />
            ) : (
              <span className="text-amber-400 text-xs font-semibold animate-pulse">EVALUATING</span>
            )}
          </div>
        </div>
      </div>

      {/* Mitigation Directives Banner (shown once simulation reaches final stage) */}
      {isFinished && (
        <div className="px-4 sm:px-6 py-3 bg-emerald-950/20 border-t border-emerald-900/40 flex items-start gap-2.5 text-xs font-mono">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="text-emerald-300 font-bold uppercase tracking-wider block text-[10px]">
              Automated Mitigation Directive Triggered:
            </span>
            <p className="text-slate-300 text-xs mt-0.5">
              {activeScenario.mitigationText}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
