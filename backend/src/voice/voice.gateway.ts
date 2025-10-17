import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, WebSocket as WsWebSocket } from 'ws';
import { Logger } from '@nestjs/common';
import { OrchestratorService } from './services/orchestrator.service';
import { TtsService } from './services/tts.service';

type ExtendedWebSocket = WsWebSocket & {
  sessionId?: string;
  isAlive?: boolean;
}

@WebSocketGateway({
  path: '/ws/voice',
  transports: ['websocket'],
})
export class VoiceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(VoiceGateway.name);
  private clients: Map<string, ExtendedWebSocket> = new Map();

  constructor(
    private orchestratorService: OrchestratorService,
    private ttsService: TtsService,
  ) {
    // Cleanup inactive sessions every 5 minutes
    setInterval(() => {
      this.orchestratorService.cleanupInactiveSessions();
    }, 300000);
  }

  async handleConnection(client: ExtendedWebSocket, request: any) {
    const url = new URL(request.url, `ws://${request.headers.host}`);
    const pathParts = url.pathname.split('/');
    const sessionId = pathParts[pathParts.length - 1];

    if (!sessionId) {
      this.logger.error('No session ID provided');
      client.close(1008, 'Session ID required');
      return;
    }

    const session = this.orchestratorService.getSession(sessionId);
    if (!session) {
      this.logger.error(`Session not found: ${sessionId}`);
      client.close(1008, 'Invalid session');
      return;
    }

    client.sessionId = sessionId;
    client.isAlive = true;
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

      // Stream audio
      for await (const chunk of audioStream) {
        if (client.readyState === 1) {
          client.send(chunk);
        }
      }

      // Send audio end marker
      this.sendControlMessage(client, 'audio_end', {
        timestamp: Date.now(),
      });
    } catch (error) {
      this.logger.error('Error sending greeting:', error);
    }

    // Setup heartbeat
    const heartbeatInterval = setInterval(() => {
      if (client.isAlive === false) {
        clearInterval(heartbeatInterval);
        return client.terminate();
      }

      client.isAlive = false;
      if (client.readyState === 1) {
        client.ping();
      }
    }, 30000);

    client.on('pong', () => {
      client.isAlive = true;
    });

    client.on('close', () => {
      clearInterval(heartbeatInterval);
    });
  }

  async handleDisconnect(client: ExtendedWebSocket) {
    const sessionId = client.sessionId;

    if (sessionId) {
      this.clients.delete(sessionId);
      await this.orchestratorService.closeSession(sessionId);
      this.logger.log(`Client disconnected from session: ${sessionId}`);
    }
  }

  @SubscribeMessage('audio')
  async handleAudioChunk(
    @ConnectedSocket() client: ExtendedWebSocket,
    @MessageBody() data: any,
  ) {
    const sessionId = client.sessionId;

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
    @ConnectedSocket() client: ExtendedWebSocket,
    @MessageBody() message: any,
  ) {
    const sessionId = client.sessionId;

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
    client: ExtendedWebSocket,
    type: string,
    data: any,
  ): void {
    if (client.readyState === 1) {
      const message = JSON.stringify({
        type,
        data,
      });
      client.send(message);
    }
  }

  // Public method for orchestrator to send responses
  async sendResponse(sessionId: string, text: string): Promise<void> {
    const client = this.clients.get(sessionId);

    if (!client || client.readyState !== 1) {
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

      for await (const chunk of audioStream) {
        if (client.readyState === 1) {
          client.send(chunk);
        }
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
