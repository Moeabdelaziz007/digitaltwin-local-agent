"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

interface FactNodeData {
  label: string;
  category: string;
  confidence: number;
  tags: string[];
  [key: string]: unknown;
}

const categoryBorderColor: Record<string, string> = {
  preference: "var(--color-brand-primary)",
  biographical: "var(--color-brand-success)",
  habit: "var(--color-brand-warm)",
};

function FactNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as FactNodeData;
  const borderLeft = categoryBorderColor[nodeData.category?.toLowerCase()] || "var(--color-brand-primary)";
  const confidencePercent = Math.round((nodeData.confidence ?? 0) * 100);

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-brand-primary !w-2 !h-2 !border-0" />

      <div
        className={`glass-surface rounded-xl p-3 min-w-[180px] max-w-[220px] transition-twin ${
          selected ? "shadow-[0_0_20px_-5px_rgba(106,169,255,0.25)]" : ""
        }`}
        style={{ borderLeft: `3px solid ${borderLeft}` }}
      >
        {/* Fact text */}
        <p className="text-xs leading-relaxed text-[var(--foreground)] line-clamp-3 mb-2">
          {nodeData.label}
        </p>

        {/* Metadata row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded-sm bg-black/40"
            style={{ color: borderLeft }}
          >
            {nodeData.category}
          </span>
          <span className="text-[9px] font-mono text-primitive-text-muted">
            {confidencePercent}%
          </span>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-brand-primary !w-2 !h-2 !border-0" />
    </>
  );
}

export default memo(FactNodeComponent);
