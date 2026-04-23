export enum AgentType {
  CLAUDE = 'claude',
  AIDER = 'aider',
  OLLAMA = 'ollama',
  GROQ = 'groq',
  BROWSER = 'browser',
  SIDE_CAR = 'sidecar'
}

export interface AgentManifest {
  type: AgentType;
  id: string;
  capabilities: string[];
  status: 'active' | 'idle' | 'failed';
}
