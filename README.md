# Voice AI Support Assistant

A real-time voice AI assistant mini-app that demonstrates low-latency voice interactions for support ticket creation.

## Overview

This application enables users to create support tickets entirely via voice, with instant AI voice responses and minimal latency. It features a NestJS backend with WebSocket streaming and a Next.js frontend with real-time voice interaction capabilities.

## Features

### Backend (NestJS)
- **WebSocket Streaming**: Real-time bidirectional audio streaming
- **Voice Pipeline Architecture**:
  - **STT (Speech-to-Text)**: Deepgram integration for streaming transcription
  - **LLM (Intent Processing)**: OpenAI GPT-4 for intent understanding and response generation
  - **TTS (Text-to-Speech)**: ElevenLabs integration for low-latency voice synthesis
  - **Orchestrator**: Manages pipeline flow, handles interruptions, and tracks state
- **REST API Endpoints**:
  - `POST /api/voice/session` - Initialize voice session
  - `WebSocket /ws/voice/:sessionId` - Real-time voice communication
  - `POST /api/voice/metrics` - Log performance metrics
- **Session Management**: JWT-based authentication and session validation
- **Automatic Reconnection**: Handles connection failures gracefully

### Frontend (Next.js)
- **Single-Page Application**: Clean, intuitive voice interaction interface
- **Push-to-Talk**: Voice-activated recording with visual feedback
- **Waveform Visualization**: Real-time audio visualization during recording and playback
- **Visual States**: Idle, Listening, Processing, Speaking, Error
- **Latency Counter**: Displays voice-to-voice latency in milliseconds
- **Conversation History**: Tracks full conversation for context
- **Accessibility**:
  - Keyboard shortcuts (Space: toggle recording, Esc: end chat)
  - Screen reader announcements for all state changes
  - Clear error messages for microphone permissions
  - ARIA labels and semantic HTML

### Performance
- **Voice-to-Voice Latency**: Target < 500ms
- **Real-Time Streaming**: No audio batching
- **Interruption Handling**: Supports mid-response interruptions
- **Auto-Reconnection**: Automatic reconnection on connection loss

## Project Structure

```
.
├── backend/                  # NestJS Backend
│   ├── src/
│   │   ├── config/          # Configuration management
│   │   ├── voice/           # Voice pipeline modules
│   │   │   ├── services/    # STT, LLM, TTS, Orchestrator services
│   │   │   ├── voice.controller.ts
│   │   │   ├── voice.gateway.ts
│   │   │   └── voice.module.ts
│   │   ├── app.module.ts
│   │   └── main.ts
│   └── .env.example
│
└── frontend/                 # Next.js Frontend
    ├── app/
    │   └── page.tsx         # Main page
    ├── components/
    │   ├── VoiceChat.tsx    # Main voice chat component
    │   └── Waveform.tsx     # Waveform visualization
    ├── hooks/
    │   └── useKeyboardShortcuts.ts
    ├── lib/
    │   └── voiceService.ts  # WebSocket and audio handling
    ├── store/
    │   └── voiceStore.ts    # State management (Zustand)
    └── types/
        └── voice.ts         # TypeScript interfaces
```

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- API Keys:
  - OpenAI API key
  - ElevenLabs API key
  - Deepgram API key

## Installation

### 1. Clone the repository

```bash
cd "Upwork Challenge V2"
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the backend directory:

```env
# API Keys
OPENAI_API_KEY=your_openai_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
DEEPGRAM_API_KEY=your_deepgram_api_key_here

# JWT Configuration
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3001
FRONTEND_URL=http://localhost:3000

# Voice Configuration
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
TTS_MODEL=eleven_turbo_v2
STT_MODEL=nova-2
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

## Running the Application

### Start Backend (Terminal 1)

```bash
cd backend
npm run start:dev
```

The backend will start on http://localhost:3001

### Start Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

The frontend will start on http://localhost:3000

## Usage

### Voice Interaction Flow

1. **Start Conversation**
   - Click "Start Voice Chat" button
   - AI greets: *"Hi, I'm your support assistant. What product are you calling about today?"*

2. **Collect Information**
   - Click "Push to Talk" or press Space to start recording
   - Provide product name, issue description, and urgency level
   - Release button or press Space again to send

3. **Clarification**
   - AI asks follow-up questions if information is unclear

4. **Confirm Ticket**
   - AI confirms: *"I've created ticket #[ID] for [product] with [urgency] priority. Should I submit this now?"*
   - Respond with "Yes" or "No"

5. **Complete**
   - AI provides final confirmation
   - Click "End Chat" or press Esc to finish

### Keyboard Shortcuts

- **Space**: Toggle recording (start/stop)
- **Esc**: End voice chat session

### Accessibility Features

- Full keyboard navigation support
- Screen reader announcements for all state changes
- ARIA labels on all interactive elements
- Clear visual state indicators
- Error message announcements

## API Documentation

### REST Endpoints

#### Create Voice Session
```http
POST /api/voice/session
```

Response:
```json
{
  "sessionId": "uuid",
  "wsUrl": "ws://localhost:3001/ws/voice/[sessionId]",
  "token": "jwt-token"
}
```

#### Log Metrics
```http
POST /api/voice/metrics
Content-Type: application/json
```

Request Body:
```json
{
  "sessionId": "uuid",
  "speechEndTime": 1234567890,
  "responseStartTime": 1234567891,
  "latencyMs": 450,
  "processingSteps": {
    "stt": 120,
    "llm": 200,
    "tts": 130
  }
}
```

### WebSocket Protocol

#### Connection
```
ws://localhost:3001/ws/voice/:sessionId
```

#### Message Types

**Control Messages (JSON)**:
```json
{
  "type": "transcript" | "response" | "metrics" | "error" | "audio_end" | "interrupted",
  "data": { ... }
}
```

**Audio Frames**: Binary chunks (16kHz, 16-bit PCM or WebM)

## Architecture

### Backend Voice Pipeline

```
User Audio → WebSocket → STT Service → LLM Service → TTS Service → WebSocket → User
                          (Deepgram)    (OpenAI)    (ElevenLabs)
                              ↓            ↓            ↓
                          Orchestrator (State Management & Flow Control)
```

### Frontend Data Flow

```
User Input → VoiceService → WebSocket → Backend
                ↓
          Zustand Store
                ↓
          VoiceChat Component → Waveform Component
```

## Performance Optimization

- **Streaming Audio**: Audio is processed and transmitted in real-time chunks
- **Low Latency TTS**: ElevenLabs Turbo v2 model for fastest synthesis
- **Partial Transcripts**: Real-time transcription feedback
- **Connection Pooling**: Reuses WebSocket connections
- **Automatic Cleanup**: Inactive sessions are automatically closed after 5 minutes

## Troubleshooting

### Microphone Access Denied
- Check browser permissions for microphone access
- Ensure you're running on HTTPS (or localhost)

### High Latency
- Check network connection
- Verify API keys are valid
- Monitor processing steps in metrics

### WebSocket Connection Failed
- Ensure backend is running on port 3001
- Check CORS configuration
- Verify JWT token is valid

### Audio Not Playing
- Check browser audio permissions
- Ensure speakers/headphones are connected
- Verify AudioContext is initialized

## Technology Stack

### Backend
- **NestJS**: Progressive Node.js framework
- **WebSocket (ws)**: Real-time communication
- **Deepgram SDK**: Speech-to-text
- **OpenAI API**: Intent processing and LLM
- **ElevenLabs**: Text-to-speech synthesis
- **JWT**: Session authentication

### Frontend
- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Zustand**: Lightweight state management
- **Lucide React**: Icon components
- **Web Audio API**: Audio processing
- **MediaRecorder API**: Audio capture

## License

MIT

## Support

For issues or questions, please open an issue in the repository.
"# Upwork-Challenge-V2" 
