import { create } from 'zustand';
import { VoiceState, VoiceSession, VoiceMetrics } from '@/types/voice';

interface VoiceStore {
  // State
  state: VoiceState;
  session: VoiceSession | null;
  transcript: string;
  response: string;
  error: string | null;
  metrics: VoiceMetrics | null;
  latency: number;
  conversationHistory: Array<{ role: 'user' | 'assistant'; text: string }>;

  // Actions
  setState: (state: VoiceState) => void;
  setSession: (session: VoiceSession | null) => void;
  setTranscript: (transcript: string) => void;
  setResponse: (response: string) => void;
  setError: (error: string | null) => void;
  setMetrics: (metrics: VoiceMetrics) => void;
  setLatency: (latency: number) => void;
  addToHistory: (role: 'user' | 'assistant', text: string) => void;
  reset: () => void;
}

export const useVoiceStore = create<VoiceStore>((set) => ({
  // Initial state
  state: 'idle',
  session: null,
  transcript: '',
  response: '',
  error: null,
  metrics: null,
  latency: 0,
  conversationHistory: [],

  // Actions
  setState: (state) => set({ state }),
  setSession: (session) => set({ session }),
  setTranscript: (transcript) => set({ transcript }),
  setResponse: (response) => set({ response }),
  setError: (error) => set({ error, state: error ? 'error' : 'idle' }),
  setMetrics: (metrics) => set({ metrics }),
  setLatency: (latency) => set({ latency }),
  addToHistory: (role, text) =>
    set((state) => ({
      conversationHistory: [...state.conversationHistory, { role, text }],
    })),
  reset: () =>
    set({
      state: 'idle',
      session: null,
      transcript: '',
      response: '',
      error: null,
      metrics: null,
      latency: 0,
      conversationHistory: [],
    }),
}));
