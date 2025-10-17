import { Injectable, Logger } from '@nestjs/common';
import { SttService, TranscriptResult } from './stt.service';
import { LlmService, ConversationContext } from './llm.service';
import { TtsService } from './tts.service';
import { LiveTranscriptionEvents } from '@deepgram/sdk';
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
  private gateway: any; // VoiceGateway reference (set later to avoid circular dependency)

  constructor(
    private sttService: SttService,
    private llmService: LlmService,
    private ttsService: TtsService,
  ) {}

  // Method to set gateway reference (called from gateway after initialization)
  setGateway(gateway: any): void {
    this.gateway = gateway;
  }

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
    const connection = session.sttConnection;
    let lastInterimTranscript = '';
    let interimTimeout: NodeJS.Timeout | null = null;
    
    // Set up listeners directly on the connection, not the service
    connection.on(LiveTranscriptionEvents.Transcript, async (data: any) => {
      const transcript = data.channel?.alternatives?.[0];
      if (transcript && transcript.transcript && session.isActive) {
        this.logger.log(`Transcript received for session ${session.sessionId}: "${transcript.transcript}" (final: ${data.is_final}, confidence: ${transcript.confidence})`);
        
        if (data.is_final) {
          // Clear any pending interim processing
          if (interimTimeout) {
            clearTimeout(interimTimeout);
            interimTimeout = null;
          }
          
          // Send final transcript to client
          if (this.gateway) {
            this.gateway.sendFinalTranscript(session.sessionId, transcript.transcript);
          }
          
          session.lastActivity = Date.now();
          session.metrics.speechEndTime = Date.now();

          // Process the final transcript
          await this.processTranscript(session, transcript.transcript);
          lastInterimTranscript = '';
        } else {
          // Store interim transcript
          lastInterimTranscript = transcript.transcript;
          
          // Send interim transcript to client for real-time feedback
          if (this.gateway && transcript.transcript.length > 0) {
            this.gateway.sendInterimTranscript(session.sessionId, transcript.transcript);
          }
          
          // If we have a substantial interim transcript and high confidence, 
          // set a timeout to process it if no final comes
          if (transcript.transcript.split(' ').length >= 3 && transcript.confidence > 0.8) {
            if (interimTimeout) {
              clearTimeout(interimTimeout);
            }
            
            // Wait 2 seconds, if no final transcript comes, process the interim
            interimTimeout = setTimeout(async () => {
              if (lastInterimTranscript && session.isActive) {
                this.logger.log(`Processing interim transcript after timeout: "${lastInterimTranscript}"`);
                session.lastActivity = Date.now();
                session.metrics.speechEndTime = Date.now();
                await this.processTranscript(session, lastInterimTranscript);
                lastInterimTranscript = '';
              }
            }, 2000);
          }
        }
      }
    });

    connection.on(LiveTranscriptionEvents.Error, (error: any) => {
      this.logger.error(`STT error for session ${session.sessionId}:`, error);
    });
    
    connection.on(LiveTranscriptionEvents.Close, () => {
      this.logger.log(`STT connection closed for session ${session.sessionId}`);
      // If connection closes with an interim transcript, process it
      if (lastInterimTranscript && lastInterimTranscript.split(' ').length >= 2) {
        this.logger.log(`Processing final interim transcript on close: "${lastInterimTranscript}"`);
        this.processTranscript(session, lastInterimTranscript).catch(err => {
          this.logger.error('Error processing transcript on close:', err);
        });
      }
      if (interimTimeout) {
        clearTimeout(interimTimeout);
      }
    });
  }

  private async processTranscript(
    session: VoiceSession,
    transcript: string,
  ): Promise<void> {
    try {
      this.logger.log(`Processing transcript: "${transcript}" for session ${session.sessionId}`);
      this.logger.log(`Current step: ${session.context.step}`);
      
      const llmStartTime = Date.now();

      // Add user message to history
      session.context.conversationHistory.push({
        role: 'user',
        content: transcript,
      });

      // Process intent and extract data FIRST
      const intentResult = await this.llmService.processIntent(
        transcript,
        session.context,
      );

      session.metrics.llmLatency = Date.now() - llmStartTime;

      // Update context with extracted data BEFORE updating step
      if (intentResult.data) {
        Object.assign(session.context, intentResult.data);
        this.logger.log(`Extracted data:`, intentResult.data);
      }

      // Update conversation step BEFORE generating final response
      this.updateConversationStep(session, intentResult);
      this.logger.log(`Updated step to: ${session.context.step}`);

      // Generate response for the NEW step
      const response = await this.generateResponseForCurrentStep(session, intentResult);

      // Add assistant response to history
      session.context.conversationHistory.push({
        role: 'assistant',
        content: response,
      });

      this.logger.log(`Generated response: "${response}" for session ${session.sessionId}`);

      // Send response through gateway
      if (this.gateway) {
        await this.gateway.sendResponse(session.sessionId, response);
        this.logger.log(`Response sent to client for session ${session.sessionId}`);
      } else {
        this.logger.error('Gateway not set, cannot send response to client');
      }

      session.metrics.responseStartTime = Date.now();
      session.lastActivity = Date.now();
    } catch (error) {
      this.logger.error('Error processing transcript:', error);
      this.logger.error('Error stack:', error.stack);
    }
  }

  private async generateResponseForCurrentStep(
    session: VoiceSession,
    intentResult: any,
  ): Promise<string> {
    const { context } = session;

    // If OpenAI is available, use the LLM response
    if (intentResult.response && !intentResult.response.includes('fallback')) {
      return intentResult.response;
    }

    // Generate response based on current step (after step update)
    switch (context.step) {
      case 'collect_issue':
        return `Got it, the ${context.product}. What issue are you experiencing?`;
      
      case 'collect_urgency':
        return `I understand - ${context.issue}. How urgent is this for you - low, medium, or high?`;
      
      case 'confirming':
        return `I've created ticket #${context.ticketId} for the ${context.product} ${context.issue} with ${context.urgency} priority. Should I submit this now?`;
      
      case 'complete':
        if (context.urgency === 'high') {
          return "Perfect! Your ticket has been submitted. Our team will contact you within 2 hours for high priority issues.";
        } else if (context.urgency === 'medium') {
          return "Perfect! Your ticket has been submitted. Our team will contact you within 24 hours for medium priority issues.";
        } else {
          return "Perfect! Your ticket has been submitted. Our team will contact you within 48 hours for low priority issues.";
        }
      
      default:
        return intentResult.response;
    }
  }

  private updateConversationStep(
    session: VoiceSession,
    intentResult: any,
  ): void {
    const { context } = session;

    // Move from greeting to collect_issue when product is provided
    if (context.step === 'greeting' && intentResult.data?.product) {
      context.step = 'collect_issue';
    }
    // Move from collect_issue to collect_urgency when issue is provided
    else if (context.step === 'collect_issue' && intentResult.data?.issue) {
      context.step = 'collect_urgency';
    }
    // Move from collect_urgency to confirming when urgency is provided
    else if (context.step === 'collect_urgency' && intentResult.data?.urgency) {
      context.step = 'confirming';
    }
    // Move from confirming to complete when user confirms
    else if (context.step === 'confirming' && intentResult.intent === 'confirm') {
      context.step = 'complete';
    }
    // If user rejects, start over
    else if (context.step === 'confirming' && intentResult.intent === 'reject') {
      context.step = 'greeting';
      // Clear data
      context.product = undefined;
      context.issue = undefined;
      context.urgency = undefined;
      context.ticketId = undefined;
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
