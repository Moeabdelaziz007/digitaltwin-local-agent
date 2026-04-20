'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  BarVisualizer,
  useVoiceAssistant,
  useRoomContext,
  useConnectionState,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Mic, MicOff, Loader2 } from "lucide-react";

interface VoiceBridgeProps {
  onStateChange?: (state: string) => void;
}

export function VoiceBridge({ onStateChange }: VoiceBridgeProps) {
  const [token, setToken] = useState("");
  const [url, setUrl] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);

  const connectToVoice = useCallback(async () => {
    try {
      setConnecting(true);
      const res = await fetch("/api/livekit");
      const data = await res.json();
      
      if (data.token) {
        // The URL is expected to be returned or we use NEXT_PUBLIC_LIVEKIT_URL
        // Let's assume process.env.NEXT_PUBLIC_LIVEKIT_URL for client or the server sends it.
        // Wait, server didn't send url in api/livekit/route.ts. We should fetch it or hardcode if we must, 
        // but it's better to update the API to return the url too.
        setToken(data.token);
        setUrl(data.url || process.env.NEXT_PUBLIC_LIVEKIT_URL || "wss://digital-mini-twin-nwsk93xv.livekit.cloud");
        setConnected(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setConnecting(false);
    }
  }, []);

  if (!connected) {
    return (
      <button 
        onClick={connectToVoice}
        disabled={connecting}
        className="w-10 h-10 rounded-full flex items-center justify-center text-text-muted hover:text-cyan hover:bg-cyan/10 transition-all shrink-0"
      >
        {connecting ? <Loader2 size={16} className="animate-spin text-cyan" /> : <Mic size={20} />}
      </button>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={url}
      connect={true}
      audio={true}
      video={false}
      onDisconnected={() => setConnected(false)}
      className="flex items-center"
    >
      <RoomAudioRenderer />
      <VoiceAssistantActive onStateChange={onStateChange} />
    </LiveKitRoom>
  );
}

function VoiceAssistantActive({ onStateChange }: { onStateChange?: (state: string) => void }) {
  const { state, audioTrack } = useVoiceAssistant();
  const room = useRoomContext();

  useEffect(() => {
    if (onStateChange) onStateChange(state);
  }, [state, onStateChange]);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan/10 border border-cyan/20 cursor-pointer hover:bg-cyan/20 transition-all" onClick={() => room.disconnect()}>
      <div className="flex gap-1 h-3 items-center w-8 justify-center overflow-hidden">
        {audioTrack ? (
           <BarVisualizer trackRef={audioTrack} className="w-full h-full text-cyan" options={{ minHeight: 2 }} />
        ) : (
          <Mic size={14} className="text-cyan animate-pulse" />
        )}
      </div>
      <span className="text-[10px] font-display text-cyan uppercase tracking-widest font-bold">
        {state === 'speaking' ? 'Speaking' : state === 'listening' ? 'Listening' : 'Connected'}
      </span>
    </div>
  );
}
