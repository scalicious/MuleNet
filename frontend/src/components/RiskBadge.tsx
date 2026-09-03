import React from 'react';
import { RiskTier } from '../types/risk';
import { ShieldAlert, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

export interface RiskBadgeProps {
  tier: RiskTier;
  score?: number;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

const TIER_CONFIG: Record<RiskTier, { style: string; dot: string; Icon: React.ComponentType<{ className?: string }> }> = {
  CRITICAL: {
    style: 'text-rose-400 bg-rose-950/50 border-rose-800/70 shadow-[0_0_8px_rgba(244,63,94,0.15)] font-bold',
    dot: 'bg-rose-500',
    Icon: ShieldAlert,
  },
  HIGH: {
    style: 'text-amber-400 bg-amber-950/40 border-amber-800/60 font-semibold',
    dot: 'bg-amber-400',
    Icon: AlertTriangle,
  },
  MEDIUM: {
    style: 'text-yellow-300 bg-yellow-950/30 border-yellow-800/50 font-medium',
    dot: 'bg-yellow-400',
    Icon: AlertCircle,
  },
  LOW: {
    style: 'text-emerald-400 bg-emerald-950/30 border-emerald-800/40 font-medium',
    dot: 'bg-emerald-400',
    Icon: CheckCircle,
  },
};

export default function RiskBadge({
  tier,
  score,
  showIcon = false,
  size = 'md',
}: RiskBadgeProps) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.LOW;
  const { Icon } = config;
  const padding = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded font-mono tracking-wider uppercase border transition-colors ${config.style} ${padding} shrink-0`}
    >
      {showIcon ? (
        <Icon className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
      )}
      <span>{tier}</span>
      {typeof score === 'number' && (
        <span className="opacity-75 font-mono text-[10px] sm:text-[11px] ml-0.5">
          {score}
        </span>
      )}
    </span>
  );
}
