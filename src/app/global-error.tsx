'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-[#0F1115]">
          <h2 className="text-2xl font-display text-cyan mb-4 uppercase tracking-widest">Critical System Failure</h2>
          <p className="text-text-muted mb-8 max-w-md">The core neural architecture encountered a fatal exception.</p>
          <button
            onClick={() => reset()}
            className="neon-button px-6 py-2 bg-cyan/10 hover:bg-cyan/20 border border-cyan/30 text-cyan uppercase tracking-widest text-xs transition-all"
          >
            Reset Core Systems
          </button>
        </div>
      </body>
    </html>
  );
}
