"use client";

interface MemorySparkCardProps {
  fact: string;
  category: string;
  confidence: number;
  tags?: string[];
  timestamp?: string;
}

const categoryColorMap: Record<string, string> = {
  preference: "text-brand-primary border-l-brand-primary",
  biographical: "text-brand-success border-l-brand-success",
  habit: "text-brand-warm border-l-brand-warm",
  new: "text-state-learning border-l-state-learning",
};

function getCategoryStyle(category: string) {
  return categoryColorMap[category.toLowerCase()] || "text-brand-primary border-l-brand-primary";
}

export default function MemorySparkCard({
  fact,
  category,
  confidence,
  tags,
  timestamp,
}: MemorySparkCardProps) {
  const catStyle = getCategoryStyle(category);
  const catColorClass = catStyle.split(" ")[0]; // text-* class for badge

  return (
    <div
      className={`glass-surface p-4 rounded-2xl border-l-2 ${catStyle.split(" ").slice(1).join(" ")} transition-twin hover:shadow-[0_0_20px_-5px_rgba(106,169,255,0.15)]`}
    >
      {/* Fact text */}
      <p className="text-sm leading-relaxed text-[var(--foreground)]">
        &ldquo;{fact}&rdquo;
      </p>

      {/* Badges row */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {/* Category badge — primary colored element */}
        <span
          className={`text-[10px] uppercase font-mono px-2 py-1 rounded-sm bg-black/40 ${catColorClass}`}
        >
          {category}
        </span>

        {/* Confidence badge */}
        <span className="text-[10px] uppercase font-mono px-2 py-1 rounded-sm bg-black/40 text-primitive-text-muted">
          {Math.round(confidence * 100)}% Confidence
        </span>

        {/* Timestamp */}
        {timestamp && (
          <span className="text-xs text-primitive-text-muted ml-auto">
            {timestamp}
          </span>
        )}
      </div>

      {/* Tags */}
      {tags && tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-white/5 text-primitive-text-muted"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
