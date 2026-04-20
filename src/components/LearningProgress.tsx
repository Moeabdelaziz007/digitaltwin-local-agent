'use client';

export function LearningProgress({ value = 0 }: { value?: number }) {
  const circumference = 2 * Math.PI * 35;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  
  return (
    <div className="relative w-20 h-20">
      <svg viewBox="0 0 80 80" className="w-20 h-20">
        <circle
          cx="40" cy="40" r="35"
          fill="none"
          stroke="url(#gradient)"
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          pathLength={1}
          className="origin-center -rotate-90 transition-all duration-1000"
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f0ff" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-display text-cyan font-bold">
          {value}%
        </span>
      </div>
    </div>
  );
}
