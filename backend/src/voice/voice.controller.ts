import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { OrchestratorService } from './services/orchestrator.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Controller('api/voice')
export class VoiceController {
  private readonly logger = new Logger(VoiceController.name);

  constructor(
    private orchestratorService: OrchestratorService,
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {}

  @Post('session')
  @HttpCode(HttpStatus.CREATED)
  async createSession() {
    try {
      const session = await this.orchestratorService.createSession();
      const port = this.configService.get<number>('port');

      // Generate JWT token for session authentication
      const token = this.jwtService.sign({
        sessionId: session.sessionId,
        timestamp: Date.now(),
      });

      return {
        sessionId: session.sessionId,
        wsUrl: `ws://localhost:${port}/voice?sessionId=${session.sessionId}`,
        token,
      };
    } catch (error) {
      this.logger.error('Error creating session:', error);
      throw error;
    }
  }

  @Post('metrics')
  @HttpCode(HttpStatus.OK)
  async logMetrics(
    @Body()
    metricsData: {
      sessionId: string;
      speechEndTime: number;
      responseStartTime: number;
      latencyMs: number;
      processingSteps: {
        stt: number;
        llm: number;
        tts: number;
      };
    },
  ) {
    this.logger.log(
      `Metrics logged for session ${metricsData.sessionId}:`,
      metricsData,
    );

    // Store metrics (could be persisted to database)
    const sessionMetrics =
      this.orchestratorService.getSessionMetrics(metricsData.sessionId);

    return {
      success: true,
      metrics: sessionMetrics || metricsData,
    };
  }
}
