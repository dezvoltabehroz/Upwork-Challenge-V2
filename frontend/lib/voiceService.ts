import { VoiceSession, ControlMessage, VoiceMetrics } from '@/types/voice';
import { io, Socket } from 'socket.io-client';

export class VoiceService {
  private socket: Socket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  // Event handlers
  public onStateChange?: (state: string) => void;
  public onTranscript?: (text: string, isFinal: boolean) => void;
  public onResponse?: (text: string) => void;
  public onError?: (error: string) => void;
  public onMetrics?: (metrics: VoiceMetrics) => void;
  public onAudioData?: (data: Float32Array) => void;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  async createSession(): Promise<VoiceSession> {
    const response = await fetch('http://localhost:3002/api/voice/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to create voice session');
    }

    const session: VoiceSession = await response.json();
    return session;
  }

  async connect(session: VoiceSession): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Parse the WebSocket URL to get the base URL and query params
        const wsUrl = session.wsUrl.replace('ws://', 'http://');
        const url = new URL(wsUrl);
        const baseUrl = `${url.protocol}//${url.host}`;
        const namespace = url.pathname;
        const query = Object.fromEntries(url.searchParams);

        console.log('Connecting to Socket.io:', { baseUrl, namespace, query });

        // Create Socket.io connection
        this.socket = io(baseUrl + namespace, {
          query,
          transports: ['websocket', 'polling'],
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectDelay,
          upgrade: true,
          rememberUpgrade: true,
        });

        // Connection event handlers
        this.socket.on('connect', () => {
          console.log('Socket.io connected');
          this.reconnectAttempts = 0;
          resolve();
        });

        // Listen for control messages
        this.socket.on('control', (message: ControlMessage) => {
          this.handleControlMessage(message);
        });

        // Listen for audio data
        this.socket.on('audio', async (data: ArrayBuffer) => {
          await this.handleAudioData(data);
        });

        // Error handling
        this.socket.on('error', (error: any) => {
          console.error('Socket.io error:', error);
          this.onError?.(error.message || 'Socket connection error');
        });

        this.socket.on('connect_error', (error) => {
          console.error('Socket.io connection error:', error);
          this.onError?.('WebSocket connection error');
          reject(error);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('Socket.io disconnected:', reason);
          if (reason === 'io server disconnect') {
            // Server initiated disconnect, try to reconnect
            this.handleDisconnect(session);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleControlMessage(message: ControlMessage): void {
    switch (message.type) {
      case 'transcript':
        this.onTranscript?.(message.data.text, message.data.isFinal);
        break;

      case 'response':
        this.onResponse?.(message.data.text);
        this.onStateChange?.('speaking');
        break;

      case 'audio_end':
        this.onStateChange?.('idle');
        break;

      case 'metrics':
        this.onMetrics?.(message.data);
        break;

      case 'error':
        this.onError?.(message.data.message);
        this.onStateChange?.('error');
        break;

      case 'interrupted':
        this.stopPlayback();
        this.onStateChange?.('idle');
        break;
    }
  }

  private async handleAudioData(data: any): Promise<void> {
    if (!this.audioContext) return;

    try {
      // Convert data to ArrayBuffer if needed
      let arrayBuffer: ArrayBuffer;
      
      if (data instanceof ArrayBuffer) {
        arrayBuffer = data;
      } else if (data instanceof Uint8Array) {
        arrayBuffer = data.buffer;
      } else if (typeof data === 'object' && data.type === 'Buffer' && Array.isArray(data.data)) {
        // Socket.io sends Buffer as { type: 'Buffer', data: [...] }
        arrayBuffer = new Uint8Array(data.data).buffer;
      } else if (ArrayBuffer.isView(data)) {
        arrayBuffer = data.buffer;
      } else {
        console.error('Unknown audio data format:', typeof data, data);
        return;
      }

      console.log('Received audio data:', arrayBuffer.byteLength, 'bytes');

      // Decode audio data (MP3 from ElevenLabs)
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));
      this.audioQueue.push(audioBuffer);

      // Extract audio data for visualization
      const channelData = audioBuffer.getChannelData(0);
      this.onAudioData?.(channelData);

      if (!this.isPlaying) {
        this.playNextAudio();
      }
    } catch (error) {
      console.error('Error decoding audio:', error);
      console.error('Audio data type:', typeof data);
      console.error('Audio data:', data);
      
      // Try alternative playback method using HTML5 Audio
      this.playAudioFallback(data);
    }
  }

  private playAudioFallback(data: any): void {
    try {
      // Convert to Blob and play with HTML5 Audio
      let blob: Blob;
      
      if (data instanceof ArrayBuffer) {
        blob = new Blob([data], { type: 'audio/mpeg' });
      } else if (typeof data === 'object' && data.type === 'Buffer' && Array.isArray(data.data)) {
        const uint8Array = new Uint8Array(data.data);
        blob = new Blob([uint8Array], { type: 'audio/mpeg' });
      } else {
        console.error('Cannot create audio blob from data');
        return;
      }

      const audio = new Audio(URL.createObjectURL(blob));
      audio.play().then(() => {
        console.log('Fallback audio playback started');
      }).catch(err => {
        console.error('Fallback audio playback failed:', err);
        this.onError?.('Failed to play audio');
      });

      // Cleanup blob URL after playing
      audio.onended = () => {
        URL.revokeObjectURL(audio.src);
      };
    } catch (error) {
      console.error('Fallback audio playback error:', error);
    }
  }

  private playNextAudio(): void {
    if (this.audioQueue.length === 0 || !this.audioContext) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioBuffer = this.audioQueue.shift()!;
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    source.onended = () => {
      this.playNextAudio();
    };

    source.start();
  }

  private stopPlayback(): void {
    this.audioQueue = [];
    this.isPlaying = false;
  }

  async startRecording(): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType: 'audio/webm',
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && this.socket?.connected) {
          event.data.arrayBuffer().then((buffer) => {
            this.socket?.emit('audio', buffer);
          });
        }
      };

      this.mediaRecorder.start(100); // Send chunks every 100ms
      this.onStateChange?.('listening');
    } catch (error) {
      console.error('Error starting recording:', error);
      this.onError?.('Microphone access denied');
      this.onStateChange?.('error');
      throw error;
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    this.onStateChange?.('processing');
  }

  sendControlMessage(type: string, data: any): void {
    if (this.socket?.connected) {
      this.socket.emit('control', {
        type,
        data,
      });
    }
  }

  interrupt(): void {
    this.stopPlayback();
    this.sendControlMessage('interrupt', {});
  }

  requestMetrics(): void {
    this.sendControlMessage('metrics_request', {});
  }

  async logMetrics(metrics: VoiceMetrics): Promise<void> {
    try {
      await fetch('http://localhost:3002/api/voice/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metrics),
      });
    } catch (error) {
      console.error('Error logging metrics:', error);
    }
  }

  private handleDisconnect(session: VoiceSession): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);

      setTimeout(() => {
        this.connect(session).catch((error) => {
          console.error('Reconnection failed:', error);
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      this.onError?.('Connection lost. Please refresh the page.');
      this.onStateChange?.('error');
    }
  }

  disconnect(): void {
    this.stopRecording();
    this.stopPlayback();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }
}
