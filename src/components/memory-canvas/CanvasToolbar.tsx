"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function CanvasToolbar() {
  return (
    <div className="absolute top-4 left-4 z-10 glass-surface px-4 py-2.5 rounded-xl flex items-center gap-3">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 text-sm text-primitive-text-muted hover:text-[var(--foreground)] transition-colors"
      >
        <ArrowLeft size={16} />
        <span className="hidden sm:inline">Back to Dashboard</span>
      </Link>
      <div className="w-px h-4 bg-border-subtle hidden sm:block" />
      <span className="text-sm font-mono font-medium text-primitive-text-secondary hidden sm:inline">
        Knowledge Graph
      </span>
    </div>
  );
}
