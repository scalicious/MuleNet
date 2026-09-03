import React from 'react';
import MetricCard, { MetricCardProps } from './MetricCard';
import { ShieldCheck, Clock, Target, Network } from 'lucide-react';

interface MetricItem extends MetricCardProps {
  id: string;
}

const KPI_METRICS: MetricItem[] = [
  {
    id: 'prevented-loss',
    label: 'Prevented Loss',
    value: '$2.84M',
    change: '+18.4%',
    changeType: 'positive',
    subtext: 'vs previous 30d baseline',
    icon: ShieldCheck,
    iconColor: 'text-cyan-400',
    iconBg: 'bg-cyan-950/40 border-cyan-800/40',
  },
  {
    id: 'lead-time',
    label: 'Lead Time',
    value: '42 min',
    change: '+12 min',
    changeType: 'positive',
    subtext: 'Pre-execution detection window',
    icon: Clock,
    iconColor: 'text-sky-400',
    iconBg: 'bg-sky-950/40 border-sky-800/40',
  },
  {
    id: 'false-challenge-rate',
    label: 'False Challenge Rate',
    value: '2.7%',
    change: '-0.8%',
    changeType: 'positive', // Lower false challenge rate is a positive improvement
    subtext: 'Minimal customer friction',
    icon: Target,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-950/40 border-emerald-800/40',
  },
  {
    id: 'ring-coverage',
    label: 'Ring Coverage',
    value: '91.6%',
    change: '+6.2%',
    changeType: 'positive',
    subtext: 'Syndicate mule graphs mapped',
    icon: Network,
    iconColor: 'text-indigo-400',
    iconBg: 'bg-indigo-950/40 border-indigo-800/40',
  },
];

export default function MetricsBar() {
  return (
    <section aria-label="Key Performance Indicators" className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_METRICS.map((metric) => (
          <MetricCard
            key={metric.id}
            label={metric.label}
            value={metric.value}
            change={metric.change}
            changeType={metric.changeType}
            subtext={metric.subtext}
            icon={metric.icon}
            iconColor={metric.iconColor}
            iconBg={metric.iconBg}
          />
        ))}
      </div>
    </section>
  );
}
