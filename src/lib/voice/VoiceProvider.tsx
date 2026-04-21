'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { VoiceState, VoiceController, VoiceMetrics } from './state-machine';

interface VoiceContextType {
  state: VoiceState;
  metrics: VoiceMetrics;
  startListening: () => void;
  stopListening: () => void;
  interrupt: () => void;
}

const VoiceContext = createContext<VoiceContextType | null>(null);

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<VoiceState>('idle');
  const [metrics, setMetrics] = useState<VoiceMetrics>({});
  const controllerRef = useRef(new VoiceController());

  // Subscribe to controller changes
  controllerRef.current.onStateChange = (newState) => {
    setState(newState);
  };

  const startListening = useCallback(() => {
    controllerRef.current.state = 'listening';
    // Microphone logic will be injected here
  }, []);

  const stopListening = useCallback(() => {
    controllerRef.current.state = 'transcribing';
  }, []);

  const interrupt = useCallback(() => {
    controllerRef.current.interrupt();
  }, []);

  return (
    <VoiceContext.Provider value={{ state, metrics, startListening, stopListening, interrupt }}>
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice() {
  const context = useContext(VoiceContext);
  if (!context) throw new Error('useVoice must be used within a VoiceProvider');
  return context;
}
