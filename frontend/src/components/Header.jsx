import React from 'react';
import { Shield } from 'lucide-react';

export default function Header() {
  return (
    <header className="w-full bg-[#0d131f] border-b border-[#1f293d] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 gap-3">
          {/* Brand Identity */}
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-lg bg-cyan-950/40 border border-cyan-800/40 flex items-center justify-center text-cyan-400 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-wider text-slate-100 uppercase font-sans">
                PRE-COMMITMENT RISK INTELLIGENCE
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-normal">
                Real-time transaction risk monitoring
              </p>
            </div>
          </div>

          {/* Status Indicator */}
          <div className="flex items-center self-end sm:self-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-emerald-900/60 bg-emerald-950/30 text-emerald-400 text-xs font-mono font-medium tracking-wide">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>SYSTEM LIVE</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
