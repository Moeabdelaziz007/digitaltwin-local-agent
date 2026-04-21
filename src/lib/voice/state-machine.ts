/**
 * Voice State Types
 */
export type VoiceState = 
  | 'idle' 
  | 'listening' 
  | 'speech_detected' 
  | 'transcribing' 
  | 'thinking' 
  | 'speaking' 
  | 'interrupted' 
  | 'error';

export interface VoiceMetrics {
  timeToFirstTranscript?: number;
  timeToFirstToken?: number;
  timeToFirstAudio?: number;
  sttConfidence?: number;
}

/**
 * Voice State Machine interface
 */
export interface VoiceSM {
  state: VoiceState;
  metrics: VoiceMetrics;
  onStateChange?: (state: VoiceState) => void;
  interrupt: () => void;
}

/**
 * Voice State Machine Controller
 */
export class VoiceController implements VoiceSM {
  private _state: VoiceState = 'idle';
  public metrics: VoiceMetrics = {};
  public onStateChange?: (state: VoiceState) => void;

  get state() { return this._state; }

  set state(newState: VoiceState) {
    if (this._state === newState) return;
    this._state = newState;
    this.onStateChange?.(newState);
    console.log(`[Voice SM] Transition -> ${newState}`);
  }

  public interrupt() {
    if (this._state === 'speaking') {
      this.state = 'interrupted';
      // Logic to stop audio playback would go here
    }
  }

  public reset() {
    this.state = 'idle';
    this.metrics = {};
  }
}
