import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { OrchestratorService } from './services/orchestrator.service';
import { TtsService } from './services/tts.service';

interface SocketData {
  sessionId: string;
}

type ExtendedSocket = Socket & {
  data: SocketData;
}

@WebSocketGateway({
  namespace: '/voice',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  maxHttpBufferSize: 1e8, // 100 MB
  pingTimeout: 60000,
})
export class VoiceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(VoiceGateway.name);
  private clients: Map<string, ExtendedSocket> = new Map();

  constructor(
    private orchestratorService: OrchestratorService,
    private ttsService: TtsService,
  ) {
    // Cleanup inactive sessions every 5 minutes
    setInterval(() => {
      this.orchestratorService.cleanupInactiveSessions();
    }, 300000);
  }

  async handleConnection(client: ExtendedSocket) {
    // Get sessionId from query parameters
    const sessionId = client.handshake.query.sessionId as string;

    if (!sessionId) {
      this.logger.error('No session ID provided');
      client.emit('error', { message: 'Session ID required' });
      client.disconnect();
      return;
    }

    const session = this.orchestratorService.getSession(sessionId);
    if (!session) {
      this.logger.error(`Session not found: ${sessionId}`);
      client.emit('error', { message: 'Invalid session' });
      client.disconnect();
      return;
    }

    // Store session ID in socket data
    client.data = { sessionId };
    this.clients.set(sessionId, client);

    this.logger.log(`Client connected to session: ${sessionId}`);

    // Send initial greeting
    try {
      const greeting = await this.orchestratorService.generateInitialGreeting(
        sessionId,
      );
      const audioStream = await this.ttsService.synthesizeSpeechStreaming(
        greeting,
      );

      // Send greeting as text first
      this.sendControlMessage(client, 'response', {
        text: greeting,
        timestamp: Date.now(),
      });

      // Collect all audio chunks first
      const audioChunks: Buffer[] = [];
      for await (const chunk of audioStream) {
        audioChunks.push(Buffer.from(chunk));
      }
      
      // Send complete audio buffer
      if (client.connected && audioChunks.length > 0) {
        const completeAudio = Buffer.concat(audioChunks);
        client.emit('audio', completeAudio);
      }

      // Send audio end marker
      this.sendControlMessage(client, 'audio_end', {
        timestamp: Date.now(),
      });
    } catch (error) {
      this.logger.error('Error sending greeting:', error);
      client.emit('error', { message: 'Failed to send greeting' });
    }
  }

  async handleDisconnect(client: ExtendedSocket) {
    const sessionId = client.data?.sessionId;

    if (sessionId) {
      this.clients.delete(sessionId);
      await this.orchestratorService.closeSession(sessionId);
      this.logger.log(`Client disconnected from session: ${sessionId}`);
    }
  }

  @SubscribeMessage('audio')
  async handleAudioChunk(
    @ConnectedSocket() client: ExtendedSocket,
    @MessageBody() data: any,
  ) {
    const sessionId = client.data?.sessionId;

    if (!sessionId) {
      this.logger.error('No session ID for audio chunk');
      return;
    }

    try {
      // Handle binary audio data
      const audioChunk = Buffer.isBuffer(data) ? data : Buffer.from(data);
      await this.orchestratorService.processAudioChunk(sessionId, audioChunk);
    } catch (error) {
      this.logger.error('Error processing audio chunk:', error);
      this.sendControlMessage(client, 'error', {
        message: 'Failed to process audio',
        timestamp: Date.now(),
      });
    }
  }

  @SubscribeMessage('control')
  async handleControlMessage(
    @ConnectedSocket() client: ExtendedSocket,
    @MessageBody() message: any,
  ) {
    const sessionId = client.data?.sessionId;

    if (!sessionId) {
      return;
    }

    try {
      const { type, data } = message;

      switch (type) {
        case 'interrupt':
          await this.orchestratorService.handleInterruption(sessionId);
          this.sendControlMessage(client, 'interrupted', {
            timestamp: Date.now(),
          });
          break;

        case 'metrics_request':
          const metrics =
            this.orchestratorService.getSessionMetrics(sessionId);
          this.sendControlMessage(client, 'metrics', metrics);
          break;

        default:
          this.logger.warn(`Unknown control message type: ${type}`);
      }
    } catch (error) {
      this.logger.error('Error handling control message:', error);
      this.sendControlMessage(client, 'error', {
        message: 'Failed to process control message',
        timestamp: Date.now(),
      });
    }
  }

  private sendControlMessage(
    client: ExtendedSocket,
    type: string,
    data: any,
  ): void {
    if (client.connected) {
      client.emit('control', {
        type,
        data,
      });
    }
  }

  // Public method for orchestrator to send responses
  async sendResponse(sessionId: string, text: string): Promise<void> {
    const client = this.clients.get(sessionId);

    if (!client || !client.connected) {
      this.logger.warn(`Cannot send response to session ${sessionId}`);
      return;
    }

    try {
      // Send text response
      this.sendControlMessage(client, 'response', {
        text,
        timestamp: Date.now(),
      });

      // Generate and stream audio
      const audioStream = await this.ttsService.synthesizeSpeechStreaming(text);

      // Collect all audio chunks first
      const audioChunks: Buffer[] = [];
      for await (const chunk of audioStream) {
        audioChunks.push(Buffer.from(chunk));
      }
      
      // Send complete audio buffer
      if (client.connected && audioChunks.length > 0) {
        const completeAudio = Buffer.concat(audioChunks);
        client.emit('audio', completeAudio);
      }

      // Send audio end marker
      this.sendControlMessage(client, 'audio_end', {
        timestamp: Date.now(),
      });
    } catch (error) {
      this.logger.error('Error sending response:', error);
      this.sendControlMessage(client, 'error', {
        message: 'Failed to generate response',
        timestamp: Date.now(),
      });
    }
  }
}
