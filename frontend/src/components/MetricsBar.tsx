import React, { useState, useEffect } from 'react';
import MetricCard, { MetricCardProps } from './MetricCard';
import { ShieldCheck, Clock, Target, Network } from 'lucide-react';
import { apiClient } from '../services/apiClient';

interface MetricItem extends MetricCardProps {
  id: string;
}

interface BackendMetrics {
  prevented_loss_value: number;
  detection_lead_time_minutes: number;
  false_challenge_rate_percent: number;
  mule_ring_coverage_percent: number;
  total_scored_actions: number;
  flagged_critical_count: number;
}

export default function MetricsBar() {
  const [metrics, setMetrics] = useState<BackendMetrics>({
    prevented_loss_value: 0,
    detection_lead_time_minutes: 0,
    false_challenge_rate_percent: 0,
    mule_ring_coverage_percent: 0,
    total_scored_actions: 0,
    flagged_critical_count: 0,
  });
  const [isLiveActive, setIsLiveActive] = useState<boolean>(false);

  // Poll live metrics from backend GET /api/v1/metrics
  useEffect(() => {
    let isMounted = true;

    const fetchMetrics = async () => {
      try {
        const data = await apiClient.get<BackendMetrics>('/metrics');
        if (isMounted && data && typeof data.prevented_loss_value === 'number') {
          setMetrics(data);
          setIsLiveActive(true);
        }
      } catch {
        // Keep existing metrics state on network hiccups
        if (isMounted) setIsLiveActive(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Format currency value cleanly
  const formattedLoss =
    metrics.prevented_loss_value >= 1_000_000
      ? `$${(metrics.prevented_loss_value / 1_000_000).toFixed(2)}M`
      : metrics.prevented_loss_value >= 10_000
      ? `$${Math.round(metrics.prevented_loss_value).toLocaleString()}`
      : `$${metrics.prevented_loss_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const kpiItems: MetricItem[] = [
    {
      id: 'prevented-loss',
      label: 'Prevented Loss',
      value: formattedLoss,
      change: `+${metrics.flagged_critical_count}`,
      changeType: 'positive',
      subtext: `${metrics.flagged_critical_count} threats intercepted`,
      icon: ShieldCheck,
      iconColor: 'text-cyan-400',
      iconBg: 'bg-cyan-950/40 border-cyan-800/40',
    },
    {
      id: 'lead-time',
      label: 'Lead Time',
      value: `${metrics.detection_lead_time_minutes.toFixed(1)} min`,
      change: `+${metrics.detection_lead_time_minutes.toFixed(1)} min`,
      changeType: 'positive',
      subtext: 'Pre-execution detection window',
      icon: Clock,
      iconColor: 'text-sky-400',
      iconBg: 'bg-sky-950/40 border-sky-800/40',
    },
    {
      id: 'false-challenge-rate',
      label: 'False Challenge Rate',
      value: `${metrics.false_challenge_rate_percent.toFixed(1)}%`,
      change: isLiveActive ? 'Live' : 'Synced',
      changeType: 'positive',
      subtext: `${metrics.total_scored_actions} scored transactions`,
      icon: Target,
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-950/40 border-emerald-800/40',
    },
    {
      id: 'ring-coverage',
      label: 'Ring Coverage',
      value: `${metrics.mule_ring_coverage_percent.toFixed(1)}%`,
      change: `+${metrics.mule_ring_coverage_percent.toFixed(0)}%`,
      changeType: 'positive',
      subtext: 'Syndicate mule graphs mapped',
      icon: Network,
      iconColor: 'text-indigo-400',
      iconBg: 'bg-indigo-950/40 border-indigo-800/40',
    },
  ];

  return (
    <section aria-label="Key Performance Indicators" className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiItems.map((metric) => (
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

