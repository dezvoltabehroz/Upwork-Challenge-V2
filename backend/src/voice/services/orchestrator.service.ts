import { Injectable, Logger } from '@nestjs/common';
import { SttService, TranscriptResult } from './stt.service';
import { LlmService, ConversationContext } from './llm.service';
import { TtsService } from './tts.service';
import { v4 as uuidv4 } from 'uuid';

export interface VoiceSession {
  sessionId: string;
  context: ConversationContext;
  sttConnection: any;
  isActive: boolean;
  lastActivity: number;
  metrics: {
    speechEndTime?: number;
    responseStartTime?: number;
    sttLatency?: number;
    llmLatency?: number;
    ttsLatency?: number;
  };
}

export interface PipelineResult {
  type: 'transcript' | 'response' | 'audio' | 'metrics' | 'error';
  data: any;
  timestamp: number;
}

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);
  private sessions: Map<string, VoiceSession> = new Map();

  constructor(
    private sttService: SttService,
    private llmService: LlmService,
    private ttsService: TtsService,
  ) {}

  async createSession(): Promise<VoiceSession> {
    const sessionId = uuidv4();
    const sttConnection = await this.sttService.createStreamingSession();

    const session: VoiceSession = {
      sessionId,
      context: {
        step: 'greeting',
        conversationHistory: [],
      },
      sttConnection,
      isActive: true,
      lastActivity: Date.now(),
      metrics: {},
    };

    this.sessions.set(sessionId, session);
    this.logger.log(`Session created: ${sessionId}`);

    // Set up STT event listeners
    this.setupSttListeners(session);

    return session;
  }

  private setupSttListeners(session: VoiceSession): void {
    this.sttService.on('transcript', async (result: TranscriptResult) => {
      if (result.isFinal && session.isActive) {
        session.lastActivity = Date.now();
        session.metrics.speechEndTime = Date.now();

        // Process through LLM
        await this.processTranscript(session, result.text);
      }
    });

    this.sttService.on('error', (error) => {
      this.logger.error(`STT error for session ${session.sessionId}:`, error);
    });
  }

  private async processTranscript(
    session: VoiceSession,
    transcript: string,
  ): Promise<void> {
    try {
      const llmStartTime = Date.now();

      // Add user message to history
      session.context.conversationHistory.push({
        role: 'user',
        content: transcript,
      });

      // Process intent
      const intentResult = await this.llmService.processIntent(
        transcript,
        session.context,
      );

      session.metrics.llmLatency = Date.now() - llmStartTime;

      // Update context with extracted data
      if (intentResult.data) {
        Object.assign(session.context, intentResult.data);
      }

      // Update conversation step
      this.updateConversationStep(session, intentResult);

      // Add assistant response to history
      session.context.conversationHistory.push({
        role: 'assistant',
        content: intentResult.response,
      });

      // Generate audio response
      const ttsStartTime = Date.now();
      const audioStream = await this.ttsService.synthesizeSpeechStreaming(
        intentResult.response,
      );
      session.metrics.ttsLatency = Date.now() - ttsStartTime;
      session.metrics.responseStartTime = Date.now();

      // Stream audio to client (handled by gateway)
      session.lastActivity = Date.now();

      this.logger.log(
        `Processed transcript for session ${session.sessionId}: ${transcript}`,
      );
    } catch (error) {
      this.logger.error('Error processing transcript:', error);
    }
  }

  private updateConversationStep(
    session: VoiceSession,
    intentResult: any,
  ): void {
    const { context } = session;

    if (context.step === 'greeting' && intentResult.data?.product) {
      context.step = 'collecting';
    } else if (
      context.step === 'collecting' &&
      context.product &&
      context.issue &&
      context.urgency
    ) {
      context.step = 'confirming';
    } else if (
      context.step === 'confirming' &&
      intentResult.intent === 'confirm'
    ) {
      context.step = 'complete';
    } else if (intentResult.needsClarification) {
      context.step = 'clarifying';
    }
  }

  async processAudioChunk(sessionId: string, audioChunk: Buffer): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      throw new Error('Session not found or inactive');
    }

    session.lastActivity = Date.now();
    this.sttService.processAudioChunk(session.sttConnection, audioChunk);
  }

  async generateInitialGreeting(sessionId: string): Promise<string> {
    const greeting = this.llmService.generateGreeting();
    const session = this.sessions.get(sessionId);

    if (session) {
      session.context.conversationHistory.push({
        role: 'assistant',
        content: greeting,
      });
    }

    return greeting;
  }

  async handleInterruption(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Reset STT connection to handle interruption
    this.sttService.closeConnection(session.sttConnection);
    session.sttConnection = await this.sttService.createStreamingSession();
    this.setupSttListeners(session);

    this.logger.log(`Interruption handled for session ${sessionId}`);
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.isActive = false;
    this.sttService.closeConnection(session.sttConnection);
    this.sessions.delete(sessionId);

    this.logger.log(`Session closed: ${sessionId}`);
  }

  getSession(sessionId: string): VoiceSession | undefined {
    return this.sessions.get(sessionId);
  }

  getSessionMetrics(sessionId: string): any {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    const { metrics } = session;
    let latencyMs = 0;

    if (metrics.speechEndTime && metrics.responseStartTime) {
      latencyMs = metrics.responseStartTime - metrics.speechEndTime;
    }

    return {
      sessionId,
      speechEndTime: metrics.speechEndTime,
      responseStartTime: metrics.responseStartTime,
      latencyMs,
      processingSteps: {
        stt: metrics.sttLatency || 0,
        llm: metrics.llmLatency || 0,
        tts: metrics.ttsLatency || 0,
      },
    };
  }

  // Cleanup inactive sessions periodically
  cleanupInactiveSessions(maxInactiveTime: number = 300000): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > maxInactiveTime) {
        this.closeSession(sessionId);
        this.logger.log(`Cleaned up inactive session: ${sessionId}`);
      }
    }
  }
}
