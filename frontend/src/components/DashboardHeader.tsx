import React from 'react';
import { Shield } from 'lucide-react';

export default function DashboardHeader() {
  return (
    <header className="w-full bg-[#0d131f] border-b border-[#1f293d] sticky top-0 z-50">
      <div className="max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3.5">
          {/* Brand Identity & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/50 border border-cyan-800/40 flex items-center justify-center text-cyan-400 shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold tracking-wider text-slate-100 uppercase font-sans">
                MuleNet
              </h1>
              <p className="text-[11px] text-slate-400 font-medium tracking-wide uppercase font-mono">
                Real-Time Transaction Surveillance & Topology Analysis
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
