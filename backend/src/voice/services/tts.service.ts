import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ElevenLabsClient } from 'elevenlabs';
import { Readable } from 'stream';

@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);
  private elevenLabs: ElevenLabsClient;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('voice.elevenlabs.apiKey');
    if (apiKey) {
      this.elevenLabs = new ElevenLabsClient({ apiKey });
    }
  }

  async synthesizeSpeech(text: string): Promise<Readable> {
    if (!this.elevenLabs) {
      throw new Error('ElevenLabs client not initialized. Check API key.');
    }

    try {
      const voiceId = this.configService.get<string>(
        'voice.elevenlabs.voiceId',
      ) || '21m00Tcm4TlvDq8ikWAM';
      const model = this.configService.get<string>('voice.elevenlabs.model') || 'eleven_turbo_v2';

      const audioStream = await this.elevenLabs.textToSpeech.convert(voiceId, {
        text,
        model_id: model,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      });

      return Readable.from(audioStream);
    } catch (error) {
      this.logger.error('TTS synthesis error:', error);
      throw error;
    }
  }

  async synthesizeSpeechStreaming(text: string): Promise<AsyncIterable<Buffer>> {
    if (!this.elevenLabs) {
      throw new Error('ElevenLabs client not initialized. Check API key.');
    }

    try {
      const voiceId = this.configService.get<string>(
        'voice.elevenlabs.voiceId',
      ) || '21m00Tcm4TlvDq8ikWAM';
      const model = this.configService.get<string>('voice.elevenlabs.model') || 'eleven_turbo_v2';

      const audioStream = await this.elevenLabs.textToSpeech.convertAsStream(
        voiceId,
        {
          text,
          model_id: model,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        },
      );

      return audioStream;
    } catch (error) {
      this.logger.error('TTS streaming synthesis error:', error);
      throw error;
    }
  }
}
