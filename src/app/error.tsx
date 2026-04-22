'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <h2 className="text-2xl font-display text-cyan mb-4 uppercase tracking-widest">Neural Link Interrupted</h2>
      <p className="text-text-muted mb-8 max-w-md">An unexpected error occurred in the synaptic pathway.</p>
      <button
        onClick={() => reset()}
        className="neon-button px-6 py-2 bg-cyan/10 hover:bg-cyan/20 border border-cyan/30 text-cyan uppercase tracking-widest text-xs transition-all"
      >
        Re-establish Connection
      </button>
    </div>
  );
}
