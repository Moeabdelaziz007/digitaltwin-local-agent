"use client";

interface LiveCaptionLineProps {
  caption: string;
}

export default function LiveCaptionLine({ caption }: LiveCaptionLineProps) {
  return (
    <div className="w-full max-w-xl mx-auto mb-10 text-center z-10 pointer-events-none">
      <p className="text-lg font-medium text-[var(--foreground)] tracking-wide min-h-[60px] flex items-center justify-center transition-twin-slow opacity-90">
        {caption}
      </p>
    </div>
  );
}
