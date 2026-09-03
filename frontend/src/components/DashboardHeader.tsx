import React, { useState, useEffect } from 'react';
import { Shield, Activity, Clock, Radio } from 'lucide-react';

export default function DashboardHeader() {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(now.toISOString().split('T')[1].split('.')[0] + ' UTC');
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="w-full bg-[#0d131f] border-b border-[#1f293d] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between py-4 gap-4">
          {/* Brand Identity & Title */}
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-lg bg-cyan-950/40 border border-cyan-800/40 flex items-center justify-center text-cyan-400 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-wider text-slate-100 uppercase font-sans">
                PRE-COMMITMENT RISK INTELLIGENCE
              </h1>
              <p className="text-xs sm:text-sm text-cyan-400/90 font-medium tracking-wide uppercase font-mono">
                REAL-TIME FINANCIAL RISK COMMAND CENTER
              </p>
            </div>
          </div>

          {/* Status, Monitoring & Time Indicators */}
          <div className="flex items-center flex-wrap gap-2.5 self-end md:self-center">
            {/* Live Clock */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-slate-800 bg-slate-900/60 text-slate-400 text-xs font-mono">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{time || '00:00:00 UTC'}</span>
            </div>

            {/* Monitoring Status Indicator */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-cyan-900/50 bg-cyan-950/20 text-cyan-300 text-xs font-mono">
              <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>SHIELD ACTIVE • 1,420 TPS</span>
            </div>

            {/* Live Status Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-emerald-900/60 bg-emerald-950/30 text-emerald-400 text-xs font-mono font-medium tracking-wide">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>SYSTEM LIVE</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
