export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

export interface VoiceSession {
  sessionId: string;
  wsUrl: string;
  token: string;
}

export interface VoiceMetrics {
  sessionId: string;
  speechEndTime?: number;
  responseStartTime?: number;
  latencyMs: number;
  processingSteps: {
    stt: number;
    llm: number;
    tts: number;
  };
}

export interface ControlMessage {
  type: 'transcript' | 'intent' | 'response' | 'metrics' | 'error' | 'audio_end' | 'interrupted';
  data: any;
}

export interface TranscriptData {
  text: string;
  isFinal: boolean;
  confidence: number;
  timestamp: number;
}

export interface ResponseData {
  text: string;
  timestamp: number;
}

export interface ErrorData {
  message: string;
  timestamp: number;
}
