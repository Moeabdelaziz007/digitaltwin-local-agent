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
  
  // PHASE 4 HARDENING: Active Stream Control
  const audioContextRef = useRef<AudioContext | null>(null);
  const ttsAbortControllerRef = useRef<AbortController | null>(null);
  const ttsSocketRef = useRef<WebSocket | null>(null);

  // Subscribe to controller changes
  controllerRef.current.onStateChange = (newState) => {
    setState(newState);
  };

  const startListening = useCallback(() => {
    // Ensure AudioContext is resumed if suspended
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
    controllerRef.current.state = 'listening';
  }, []);

  const stopListening = useCallback(() => {
    controllerRef.current.state = 'transcribing';
  }, []);

  const interrupt = useCallback(() => {
    console.log('[Voice Provider] Active Interruption Triggered');
    
    // PHASE 4 FIX: Stricter Active Stream Cancellation
    if (audioContextRef.current && audioContextRef.current.state === 'running') {
      audioContextRef.current.suspend();
    }

    if (ttsAbortControllerRef.current) {
      ttsAbortControllerRef.current.abort();
    }
    // Prepare for next stream
    ttsAbortControllerRef.current = new AbortController();

    // 2. Close active WebSocket TTS streams
    if (ttsSocketRef.current && ttsSocketRef.current.readyState === WebSocket.OPEN) {
      ttsSocketRef.current.close();
      ttsSocketRef.current = null;
    }

    controllerRef.current.interrupt();
  }, []);

  return (
    <VoiceContext.Provider value={{ 
      state, 
      metrics, 
      startListening, 
      stopListening, 
      interrupt,
      // References for advanced skill manipulation
      audioContext: audioContextRef.current,
      ttsAbortController: ttsAbortControllerRef.current
    } as any}>
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice() {
  const context = useContext(VoiceContext);
  if (!context) throw new Error('useVoice must be used within a VoiceProvider');
  return context;
}
