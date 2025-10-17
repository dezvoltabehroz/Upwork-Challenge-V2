import { VoiceSession, ControlMessage, VoiceMetrics } from '@/types/voice';

export class VoiceService {
  private ws: WebSocket | null = null;
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
        this.ws = new WebSocket(session.wsUrl);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = async (event) => {
          if (typeof event.data === 'string') {
            // Control message
            const message: ControlMessage = JSON.parse(event.data);
            this.handleControlMessage(message);
          } else {
            // Audio data
            await this.handleAudioData(event.data);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.onError?.('WebSocket connection error');
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket closed');
          this.handleDisconnect(session);
        };
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

  private async handleAudioData(data: ArrayBuffer): Promise<void> {
    if (!this.audioContext) return;

    try {
      const audioBuffer = await this.audioContext.decodeAudioData(data.slice(0));
      this.audioQueue.push(audioBuffer);

      // Extract audio data for visualization
      const channelData = audioBuffer.getChannelData(0);
      this.onAudioData?.(channelData);

      if (!this.isPlaying) {
        this.playNextAudio();
      }
    } catch (error) {
      console.error('Error decoding audio:', error);
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
        if (event.data.size > 0 && this.ws?.readyState === WebSocket.OPEN) {
          event.data.arrayBuffer().then((buffer) => {
            this.ws?.send(buffer);
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
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type,
          data,
        })
      );
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

    if (this.ws) {
      this.ws.close();
      this.ws = null;
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
