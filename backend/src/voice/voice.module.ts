import { Module } from '@nestjs/common';
import { SttService } from './services/stt.service';
import { LlmService } from './services/llm.service';
import { TtsService } from './services/tts.service';
import { OrchestratorService } from './services/orchestrator.service';
import { VoiceController } from './voice.controller';
import { VoiceGateway } from './voice.gateway';

@Module({
  controllers: [VoiceController],
  providers: [
    SttService,
    LlmService,
    TtsService,
    OrchestratorService,
    VoiceGateway,
  ],
  exports: [OrchestratorService],
})
export class VoiceModule {}
