import React, { useEffect, useRef } from 'react';
import {
  X,
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  TrendingUp,
  Cpu,
  Clock,
  DollarSign,
  AlertOctagon,
  ShieldCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { Transaction, TransactionDossier } from '../types/risk';
import { createMockDossier } from '../api/mockDossier';
import RiskBadge from './RiskBadge';

export interface CaseDossierModalProps {
  transaction: Transaction | null;
  dossier?: TransactionDossier | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function CaseDossierModal({
  transaction,
  dossier: customDossier,
  isOpen,
  onClose,
}: CaseDossierModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Derive dossier from transaction if not directly provided
  const dossier = customDossier || (transaction ? createMockDossier(transaction) : null);

  // Escape key & scroll lock handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Auto-focus the close button for accessibility
    setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 50);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !dossier) return null;

  const { summary, evidenceList, shapFeatures, complianceActions, lenses } = dossier;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="case-dossier-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-4xl bg-[#0d131f] border border-[#1f293d] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] font-sans selection:bg-cyan-500/20 selection:text-cyan-200"
      >
        {/* MODAL HEADER */}
        <div className="px-5 sm:px-7 py-4 border-b border-[#1f293d] bg-[#0b0f17] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-lg bg-rose-950/40 border border-rose-800/40 flex items-center justify-center text-rose-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 id="case-dossier-title" className="text-sm sm:text-base font-bold tracking-wider uppercase text-slate-100 font-mono">
                  CASE DOSSIER • {dossier.transactionId}
                </h2>
                <RiskBadge tier={summary.riskTier} score={summary.riskScore} />
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Evaluated: {dossier.evaluatedAt}
              </p>
            </div>
          </div>

          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Close Case Dossier"
            className="w-8 h-8 rounded-md border border-slate-700/80 bg-slate-800/60 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center transition outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODAL SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {/* SECTION 1: TRANSACTION SUMMARY */}
          <section aria-labelledby="section-summary-title">
            <div className="flex items-center space-x-2 mb-3">
              <FileText className="w-4 h-4 text-cyan-400" />
              <h3 id="section-summary-title" className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                1. Transaction Summary
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 bg-[#090d15] p-4 rounded-lg border border-[#1f293d]/80 text-xs font-mono">
              <div>
                <span className="text-slate-500 uppercase text-[10px] block">Sender Account</span>
                <span className="font-semibold text-cyan-300 text-sm">{summary.sender}</span>
              </div>
              <div>
                <span className="text-slate-500 uppercase text-[10px] block">Receiver Account</span>
                <span className="font-semibold text-slate-200 text-sm">{summary.receiver}</span>
              </div>
              <div>
                <span className="text-slate-500 uppercase text-[10px] block">Amount & Currency</span>
                <span className="font-bold text-slate-100 text-sm">
                  ${summary.amount.toLocaleString()} {summary.currency}
                </span>
              </div>
              <div>
                <span className="text-slate-500 uppercase text-[10px] block">Transaction Type</span>
                <span className="text-slate-300 font-medium">{summary.transactionType}</span>
              </div>
              <div>
                <span className="text-slate-500 uppercase text-[10px] block">Risk Score</span>
                <span className="font-bold text-rose-400 text-sm">{summary.riskScore} / 100</span>
              </div>
              <div>
                <span className="text-slate-500 uppercase text-[10px] block">Risk Tier</span>
                <span className="font-semibold text-slate-200">{summary.riskTier}</span>
              </div>
              <div>
                <span className="text-slate-500 uppercase text-[10px] block">Enforcement Status</span>
                <span className="font-semibold text-amber-300">{summary.status}</span>
              </div>
              <div>
                <span className="text-slate-500 uppercase text-[10px] block">Recommended Action</span>
                <span className="font-semibold text-cyan-400">{summary.recommendedAction}</span>
              </div>
            </div>
          </section>

          {/* SECTION 2: WHY THIS WAS FLAGGED (PLAIN LANGUAGE EVIDENCE) */}
          <section aria-labelledby="section-evidence-title">
            <div className="flex items-center space-x-2 mb-3">
              <AlertOctagon className="w-4 h-4 text-amber-400" />
              <h3 id="section-evidence-title" className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                2. Why This Was Flagged (Forensic Evidence)
              </h3>
            </div>

            <div className="space-y-2.5">
              {evidenceList.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3.5 rounded-lg border border-[#1f293d] bg-[#090d15] flex items-start gap-3 hover:border-slate-700/80 transition-colors"
                >
                  <div className="mt-0.5 shrink-0">
                    {ev.severity === 'CRITICAL' ? (
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                    ) : ev.severity === 'HIGH' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    ) : (
                      <AlertOctagon className="w-4 h-4 text-yellow-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h4 className="text-xs sm:text-sm font-semibold text-slate-200">
                        {ev.title}
                      </h4>
                      <RiskBadge tier={ev.severity} size="sm" />
                    </div>
                    <p className="text-xs text-slate-400 mt-1 font-mono leading-relaxed">
                      {ev.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 3: SHAP IMPACT (HORIZONTAL BAR CHART VIA RECHARTS) */}
          <section aria-labelledby="section-shap-title">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <h3 id="section-shap-title" className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                  3. Explainability — SHAP Feature Impact
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                Normalized Marginal Contribution (+SHAP)
              </span>
            </div>

            <div className="bg-[#090d15] p-4 rounded-lg border border-[#1f293d] h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={shapFeatures}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                >
                  <XAxis
                    type="number"
                    domain={[0, 0.4]}
                    tickFormatter={(val) => `+${val.toFixed(2)}`}
                    stroke="#475569"
                    tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="feature"
                    stroke="#475569"
                    tick={{ fill: '#cbd5e1', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                    width={115}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-[#0d131f] border border-cyan-800/80 p-2.5 rounded shadow-xl font-mono text-xs text-slate-100">
                            <div className="font-bold text-cyan-300">{data.feature}</div>
                            <div className="text-slate-300 mt-0.5">
                              Impact: <span className="text-rose-400 font-bold">+{data.impact}</span>
                            </div>
                            {data.description && (
                              <div className="text-slate-500 text-[10px] mt-1">{data.description}</div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="impact" radius={[0, 4, 4, 0]}>
                    {shapFeatures.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.impact >= 0.3 ? '#ef4444' : entry.impact >= 0.2 ? '#f97316' : '#06b6d4'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* SECTION 4: RECOMMENDED COMPLIANCE ACTIONS */}
          <section aria-labelledby="section-actions-title">
            <div className="flex items-center space-x-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 id="section-actions-title" className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                4. Recommended Compliance Actions
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {complianceActions.map((action) => (
                <div
                  key={action.id}
                  className="p-3.5 rounded-lg border border-[#1f293d] bg-[#090d15] flex flex-col justify-between gap-2.5 hover:border-slate-700/80 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-200">
                      {action.action}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                        action.priority === 'CRITICAL'
                          ? 'text-rose-400 bg-rose-950/40 border-rose-800/50'
                          : action.priority === 'HIGH'
                            ? 'text-amber-400 bg-amber-950/40 border-amber-800/50'
                            : 'text-cyan-300 bg-cyan-950/40 border-cyan-800/50'
                      }`}
                    >
                      {action.priority}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono leading-relaxed">
                    {action.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 sm:px-7 py-3.5 border-t border-[#1f293d] bg-[#0b0f17] flex items-center justify-between shrink-0 font-mono text-xs">
          <span className="text-slate-500">
            Automated AML Pre-Commitment Risk Assessment
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition font-medium"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
}
