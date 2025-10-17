import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { EventEmitter } from 'events';

export interface TranscriptResult {
  text: string;
  isFinal: boolean;
  confidence: number;
  timestamp: number;
}

@Injectable()
export class SttService extends EventEmitter {
  private readonly logger = new Logger(SttService.name);
  private deepgram;

  constructor(private configService: ConfigService) {
    super();
    const apiKey = this.configService.get<string>('voice.deepgram.apiKey');
    if (apiKey) {
      this.deepgram = createClient(apiKey);
    }
  }

  async createStreamingSession(): Promise<any> {
    if (!this.deepgram) {
      this.logger.warn('Deepgram client not initialized. Check API key. Running in mock mode.');
      // Return a mock connection for testing
      return {
        send: () => {},
        finish: () => {},
        readyState: 1,
      };
    }

    const model = this.configService.get<string>('voice.deepgram.model') || 'nova-2';
    
    this.logger.log(`Creating Deepgram connection with model: ${model}`);
    
    const connection = this.deepgram.listen.live({
      model,
      language: 'en',
      smart_format: true,
      interim_results: true,
      punctuate: true,
      endpointing: 500,  // Wait 500ms of silence before finalizing (increased from 300)
      utterance_end_ms: 1500,  // Consider utterance ended after 1.5s of silence
      vad_events: true,  // Enable voice activity detection events
      // Let Deepgram auto-detect encoding from webm format
    });

    connection.on(LiveTranscriptionEvents.Open, () => {
      this.logger.log('Deepgram connection opened');
    });

    connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      const transcript = data.channel?.alternatives?.[0];
      if (transcript && transcript.transcript) {
        const result: TranscriptResult = {
          text: transcript.transcript,
          isFinal: data.is_final,
          confidence: transcript.confidence,
          timestamp: Date.now(),
        };
        this.emit('transcript', result);
      }
    });

    connection.on(LiveTranscriptionEvents.Error, (error) => {
      this.logger.error('Deepgram error:', error);
      this.emit('error', error);
    });

    connection.on(LiveTranscriptionEvents.Close, () => {
      this.logger.log('Deepgram connection closed');
      this.emit('close');
    });

    return connection;
  }

  processAudioChunk(connection: any, audioChunk: Buffer): void {
    if (connection && audioChunk) {
      connection.send(audioChunk);
    }
  }

  closeConnection(connection: any): void {
    if (connection) {
      connection.finish();
    }
  }
}
