import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface MetricCardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  subtext?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  iconBg?: string;
}

export default function MetricCard({
  label,
  value,
  change,
  changeType = 'positive',
  subtext,
  icon: Icon,
  iconColor = 'text-cyan-400',
  iconBg = 'bg-cyan-950/40 border-cyan-800/40',
}: MetricCardProps) {
  const isPositive = changeType === 'positive';
  const isNegative = changeType === 'negative';

  const trendColor = isPositive 
    ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40' 
    : isNegative 
      ? 'text-rose-400 bg-rose-950/40 border-rose-800/40' 
      : 'text-slate-400 bg-slate-900/40 border-slate-800/40';

  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  return (
    <div className="bg-[#0d131f] border border-[#1f293d] rounded-lg p-4 sm:p-5 flex flex-col justify-between hover:border-slate-700/80 transition-all duration-200">
      {/* Top Header: Label & Icon */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-sans">
          {label}
        </span>
        {Icon && (
          <div className={`w-8 h-8 rounded-md border flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Main KPI Value */}
      <div className="mt-3">
        <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-slate-100">
          {value}
        </div>

        {/* Bottom Details: Trend Change & Subtext */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {change && (
            <span className={`inline-flex items-center gap-1 text-[11px] font-mono font-medium px-1.5 py-0.5 rounded border ${trendColor}`}>
              <TrendIcon className="w-3 h-3" />
              <span>{change}</span>
            </span>
          )}
          {subtext && (
            <span className="text-xs text-slate-400 truncate">
              {subtext}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
