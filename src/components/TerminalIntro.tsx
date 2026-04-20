'use client';

import { useState, useEffect } from 'react';

export function TerminalIntro({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState('');
  
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    let index = 0;
    
    const typeNext = () => {
      if (index < text.length) {
        setDisplayed(text.substring(0, index + 1));
        index++;
        timeout = setTimeout(typeNext, 50); // Typing speed
      }
    };
    
    const initialWait = setTimeout(typeNext, delay);
    return () => {
      clearTimeout(timeout);
      clearTimeout(initialWait);
    };
  }, [text, delay]);

  return (
    <div className="font-display text-cyan text-xs tracking-widest uppercase flex items-center gap-2">
      <span className="opacity-50">&gt;</span>
      <span>{displayed}</span>
      <span className="w-2 h-3 bg-cyan animate-pulse inline-block" />
    </div>
  );
}
