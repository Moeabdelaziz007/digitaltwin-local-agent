"use client";

import { X } from "lucide-react";

interface FactNodeData {
  label: string;
  category: string;
  confidence: number;
  tags: string[];
}

interface NodeDetailPanelProps {
  data: FactNodeData | null;
  onClose: () => void;
}

const categoryColorMap: Record<string, string> = {
  preference: "text-brand-primary bg-brand-primary/10 border-brand-primary/20",
  biographical: "text-brand-success bg-brand-success/10 border-brand-success/20",
  habit: "text-brand-warm bg-brand-warm/10 border-brand-warm/20",
};

export default function NodeDetailPanel({ data, onClose }: NodeDetailPanelProps) {
  const catColors =
    categoryColorMap[data?.category?.toLowerCase() ?? ""] ??
    "text-brand-primary bg-brand-primary/10 border-brand-primary/20";

  return (
    <aside
      aria-label="Fact details"
      className={`w-80 border-l border-border-subtle bg-surface-panel flex flex-col transition-all duration-300 ease-out ${
        data
          ? "translate-x-0 opacity-100"
          : "translate-x-full opacity-0 pointer-events-none"
      }`}
    >
      {data && (
        <div className="flex flex-col gap-6 p-6 overflow-y-auto flex-1">
          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close"
            className="self-end p-1.5 rounded-full hover:bg-white/5 transition-colors text-primitive-text-muted hover:text-[var(--foreground)]"
          >
            <X size={18} />
          </button>

          {/* Title */}
          <div>
            <span className="text-xs uppercase tracking-wider text-primitive-text-muted font-mono block mb-1">
              Reflected Memory
            </span>
            <h3 className="text-lg font-medium leading-tight text-[var(--foreground)]">
              {data.label}
            </h3>
          </div>

          {/* Category + Confidence */}
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded-sm text-xs font-mono uppercase tracking-wider border ${catColors}`}
            >
              {data.category}
            </span>
            <span className="text-xs font-mono text-primitive-text-muted">
              {Math.round(data.confidence * 100)}% Confidence
            </span>
          </div>

          {/* Tags */}
          {data.tags?.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-mono text-primitive-text-muted border-b border-border-subtle pb-1 block uppercase tracking-wider">
                Tags &amp; Taxonomy
              </span>
              <div className="flex flex-wrap gap-1.5">
                {data.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-white/5 text-primitive-text-muted"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Source Provenance */}
          <div className="space-y-2 pt-4">
            <span className="text-xs font-mono text-primitive-text-muted border-b border-border-subtle pb-1 block uppercase tracking-wider">
              Source Provenance
            </span>
            <p className="text-xs text-primitive-text-muted leading-relaxed">
              Derived natively using Local Context Swarm. Linked
              bidirectionally via the Graph Pattern Agent.
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
