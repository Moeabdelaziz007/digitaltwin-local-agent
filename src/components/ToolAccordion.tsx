'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, TerminalSquare } from 'lucide-react';

interface ToolAccordionProps {
  toolName: string;
  toolArgs: object;
  status: 'running' | 'success' | 'error';
  result?: string;
}

export function ToolAccordion({ toolName, toolArgs, status, result }: ToolAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full my-2 border border-white/10 rounded-md overflow-hidden bg-bg-surface/50 font-display">
      <div 
        className="flex items-center justify-between p-2 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          {status === 'running' ? (
            <div className="flex items-center gap-1 text-cyan font-bold">
              <span className="animate-spin">[</span>
              <TerminalSquare size={14} className="animate-pulse" />
              <span className="animate-spin">]</span>
            </div>
          ) : status === 'error' ? (
            <span className="text-red-500 font-bold">[!]</span>
          ) : (
            <span className="text-emerald-500 font-bold">[*]</span>
          )}
          <span className="text-xs uppercase tracking-widest text-text-muted">
            {status === 'running' ? 'Executing Tool:' : 'Executed Tool:'} <span className="text-text-primary">{toolName}</span>
          </span>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} className="text-white/30">
          <ChevronDown size={14} />
        </motion.div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}>
            <div className="p-3 bg-black/40 border-t border-white/5 text-[10px] text-text-muted font-display space-y-2">
              <div>
                <span className="text-cyan">Payload:</span>
                <pre className="mt-1 overflow-x-auto">{JSON.stringify(toolArgs, null, 2)}</pre>
              </div>
              {result && (
                <div className="pt-2 border-t border-white/5">
                  <span className={status === 'error' ? 'text-red-400' : 'text-emerald-400'}>Result:</span>
                  <pre className="mt-1 overflow-x-auto text-text-faint">{result}</pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
