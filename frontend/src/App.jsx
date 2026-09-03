import React from 'react';
import Header from './components/Header';
import MetricCard from './components/MetricCard';
import { ShieldCheck, Clock, Target, Network } from 'lucide-react';

const METRICS_DATA = [
  {
    id: 'prevented-loss',
    label: 'Prevented Loss',
    value: '$2.84M',
    subtext: 'Pre-commitment intercepts (30d)',
    icon: ShieldCheck,
    iconColor: 'text-cyan-400',
    iconBg: 'bg-cyan-950/40 border-cyan-800/40',
  },
  {
    id: 'lead-time',
    label: 'Lead Time',
    value: '42 min',
    subtext: 'Avg. pre-execution window',
    icon: Clock,
    iconColor: 'text-sky-400',
    iconBg: 'bg-sky-950/40 border-sky-800/40',
  },
  {
    id: 'false-challenge-rate',
    label: 'False Challenge Rate',
    value: '2.7%',
    subtext: 'Low customer friction benchmark',
    icon: Target,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-950/40 border-emerald-800/40',
  },
  {
    id: 'ring-coverage',
    label: 'Ring Coverage',
    value: '91.6%',
    subtext: 'Syndicate graphs identified',
    icon: Network,
    iconColor: 'text-indigo-400',
    iconBg: 'bg-indigo-950/40 border-indigo-800/40',
  },
];

export default function App() {
  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-200">
      {/* Top Navigation / Header */}
      <Header />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-6">
        {/* Metrics Grid Section */}
        <section aria-label="Key Risk Metrics">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {METRICS_DATA.map((metric) => (
              <MetricCard
                key={metric.id}
                label={metric.label}
                value={metric.value}
                subtext={metric.subtext}
                icon={metric.icon}
                iconColor={metric.iconColor}
                iconBg={metric.iconBg}
              />
            ))}
          </div>
        </section>

        {/* Empty Main Dashboard Area */}
        <section aria-label="Dashboard Content Area" className="flex-1">
          <div className="w-full min-h-[460px] rounded-lg border border-[#1f293d] bg-[#0d131f]/50 p-6 flex flex-col items-center justify-center text-center">
            <div className="max-w-md space-y-2">
              <p className="text-sm font-medium text-slate-400">
                Main Dashboard Area
              </p>
              <p className="text-xs text-slate-500 font-mono">
                Ready for graph, transaction feed, simulator & risk intelligence modules.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
