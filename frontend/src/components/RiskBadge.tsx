import React from 'react';
import { RiskTier } from '../types/risk';

export interface RiskBadgeProps {
  tier: RiskTier;
  score?: number;
  showDot?: boolean;
  size?: 'sm' | 'md';
}

const TIER_CONFIG: Record<RiskTier, { style: string; dot: string }> = {
  LOW: {
    style: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50',
    dot: 'bg-emerald-400',
  },
  MEDIUM: {
    style: 'text-yellow-400 bg-yellow-950/40 border-yellow-800/50',
    dot: 'bg-yellow-400',
  },
  HIGH: {
    style: 'text-orange-400 bg-orange-950/40 border-orange-800/50',
    dot: 'bg-orange-400',
  },
  CRITICAL: {
    style: 'text-red-400 bg-red-950/40 border-red-800/50',
    dot: 'bg-red-400',
  },
};

export default function RiskBadge({
  tier,
  score,
  showDot = true,
  size = 'md',
}: RiskBadgeProps) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.LOW;
  const padding = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded font-mono font-bold tracking-wider uppercase border ${config.style} ${padding} shrink-0`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />}
      <span>{tier}</span>
      {typeof score === 'number' && (
        <span className="opacity-80 font-normal ml-0.5">({score})</span>
      )}
    </span>
  );
}
