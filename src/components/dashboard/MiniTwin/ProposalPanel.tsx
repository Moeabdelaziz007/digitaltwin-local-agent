"use client";

import { m, AnimatePresence } from "framer-motion";
import { Check, X, Info } from "lucide-react";

export interface Proposal {
  id: string;
  summary: string;
  confidence: number;
  category: string;
}

interface ProposalPanelProps {
  proposal: Proposal | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export default function ProposalPanel({ proposal, onApprove, onReject }: ProposalPanelProps) {
  return (
    <AnimatePresence>
      {proposal && (
        <m.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
          className="fixed bottom-32 right-8 w-72 z-[101] glass-surface p-4 rounded-2xl shadow-2xl border border-white/10"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1 rounded bg-brand-warm/20 text-brand-warm">
              <Info size={14} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-primitive-text-muted">
              AI Suggestion • {Math.round(proposal.confidence * 100)}%
            </span>
          </div>

          <p className="text-sm font-medium mb-4 leading-relaxed tracking-tight">
            {proposal.summary}
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => onReject(proposal.id)}
              className="flex-1 py-2 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-primitive-text-muted"
            >
              <X size={18} />
            </button>
            <button
              onClick={() => onApprove(proposal.id)}
              className="flex-[2] py-2 flex items-center justify-center gap-2 rounded-xl bg-brand-primary text-white font-medium text-sm transition-twin hover:shadow-[0_0_15px_rgba(106,169,255,0.4)]"
            >
              <Check size={18} />
              Approve
            </button>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
