import React from 'react';

export default function MetricCard({
  label,
  value,
  subtext,
  icon: Icon,
  iconColor = 'text-cyan-400',
  iconBg = 'bg-cyan-950/40 border-cyan-800/40',
}) {
  return (
    <div className="bg-[#0d131f] border border-[#1f293d] rounded-lg p-4 sm:p-5 flex flex-col justify-between hover:border-slate-700/80 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </span>
        {Icon && (
          <div className={`w-8 h-8 rounded-md border flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-slate-100">
          {value}
        </div>
        {subtext && (
          <p className="text-xs text-slate-400 mt-1">
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
}
