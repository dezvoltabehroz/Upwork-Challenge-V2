# Voice AI Support Assistant

A production-ready, real-time voice AI assistant application that demonstrates ultra-low-latency voice interactions for automated support ticket creation. Built with NestJS, Next.js, and integrated with Deepgram, OpenAI, and ElevenLabs APIs.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=flat&logo=socket.io&logoColor=white)](https://socket.io/)

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Usage Guide](#usage-guide)
- [API Documentation](#api-documentation)
- [WebSocket Protocol](#websocket-protocol)
- [Voice Pipeline Details](#voice-pipeline-details)
- [State Management](#state-management)
- [Performance Optimization](#performance-optimization)
- [Security](#security)
- [Accessibility](#accessibility)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

This application enables users to create support tickets entirely via voice interaction, with instant AI voice responses and minimal latency. It showcases a complete voice AI pipeline implementation with:

- **Real-time bidirectional streaming** via WebSocket/Socket.io
- **Multi-stage conversation flow** for ticket creation
- **Sub-500ms voice-to-voice latency** target
- **Production-ready architecture** with error handling and reconnection logic
- **Full accessibility support** including keyboard shortcuts and screen reader compatibility

## ✨ Key Features

### Backend (NestJS)

#### 🔌 WebSocket Gateway
- **Namespace-based routing**: `/voice` namespace for voice interactions
- **Binary support**: Direct audio buffer transmission
- **Session management**: UUID-based session identification
- **Auto-cleanup**: Inactive sessions removed after 5 minutes (configurable)
- **Connection resilience**: Automatic reconnection handling
- **CORS configuration**: Supports cross-origin requests

#### 🎙️ Voice Pipeline Architecture

##### STT (Speech-to-Text) - Deepgram Integration
- **Model**: Nova-2 (configurable)
- **Streaming transcription**: Real-time audio processing
- **Interim results**: Provides partial transcripts during speech
- **Voice Activity Detection (VAD)**: Automatic speech endpoint detection
- **Smart formatting**: Automatic punctuation and capitalization
- **Endpointing**: 500ms silence threshold for finalization
- **Utterance detection**: 1.5s silence for utterance completion

##### LLM (Intent Processing) - OpenAI Integration
- **Model**: GPT-3.5-turbo (configurable to GPT-4)
- **Conversation context**: Maintains full conversation history
- **Intent extraction**: Identifies user intentions
- **Data extraction**: Parses product, issue, and urgency information
- **Fallback responses**: Template-based responses when API unavailable
- **Multi-step flow management**: Handles 5-stage conversation flow:
  1. **Greeting**: Initial contact
  2. **Collect Product**: Extract product information
  3. **Collect Issue**: Gather issue description
  4. **Collect Urgency**: Determine priority (low/medium/high)
  5. **Confirmation**: Review and confirm ticket details
  6. **Complete**: Final submission with SLA information

##### TTS (Text-to-Speech) - ElevenLabs Integration
- **Model**: Eleven Turbo v2 (ultra-low latency)
- **Voice**: Configurable voice ID (default: 21m00Tcm4TlvDq8ikWAM)
- **Streaming synthesis**: Real-time audio generation
- **Voice settings**:
  - Stability: 0.5
  - Similarity boost: 0.75
  - Style: 0.0
  - Speaker boost: enabled
- **Format**: MP3 streaming for optimal quality/size ratio

##### Orchestrator Service
- **Pipeline coordination**: Manages STT → LLM → TTS flow
- **State tracking**: Monitors conversation progress
- **Session lifecycle**: Create, maintain, and cleanup sessions
- **Interruption handling**: Supports mid-response interruptions
- **Metrics collection**: Tracks latency for each pipeline stage
- **Event routing**: Connects services with WebSocket gateway
- **Transcript management**: Handles interim and final transcripts
- **Automatic processing**: Timeout-based interim transcript processing

#### 🛡️ REST API Endpoints

##### `POST /api/voice/session`
Creates a new voice session with JWT authentication.

**Response**:
```json
{
  "sessionId": "uuid-v4",
  "wsUrl": "ws://localhost:3002/voice?sessionId=uuid-v4",
  "token": "jwt-token-here"
}
```

##### `POST /api/voice/metrics`
Logs performance metrics for monitoring and analysis.

**Request Body**:
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

### Frontend (Next.js)

#### 🎨 User Interface Components

##### VoiceChat Component
- **Main interface**: Central voice interaction hub
- **State visualization**: Real-time status indicators
- **Recording controls**: Push-to-talk functionality
- **Conversation display**: Shows transcripts and responses
- **History tracking**: Maintains full conversation log
- **Error handling**: User-friendly error messages
- **Latency display**: Shows voice-to-voice latency in milliseconds

##### Waveform Component
- **Audio visualization**: Real-time waveform display
- **Dual mode**: Recording (input) and playback (output) visualization
- **Color coding**: Different colors for different states
- **Smooth animation**: 60fps canvas-based rendering

#### 🎮 Interactive Features

##### Push-to-Talk
- **Click-based**: Click and hold microphone button
- **Keyboard shortcut**: Space bar to toggle recording
- **Visual feedback**: Button color change during recording
- **State-aware**: Disabled during processing/speaking states

##### Real-time Feedback
- **Interim transcripts**: See transcription as you speak
- **Processing indicators**: Visual cues for each state
- **Response streaming**: AI responses displayed immediately
- **Audio playback**: Automatic audio playback with queue management

#### 📊 State Management (Zustand)

##### Voice States
- **idle**: No active interaction
- **listening**: Recording user audio
- **processing**: Transcribing and generating response
- **speaking**: Playing AI response audio
- **error**: Error state with message display

##### Store Features
- **Session tracking**: Current session information
- **Transcript management**: User input transcription
- **Response handling**: AI-generated responses
- **Error tracking**: Error messages and states
- **Metrics storage**: Performance metrics
- **History management**: Conversation log
- **Reset capability**: Clean state reset

#### ♿ Accessibility Features

- **Keyboard navigation**: Full app control via keyboard
- **Screen reader support**: ARIA labels and live regions
- **Semantic HTML**: Proper heading structure and landmarks
- **Visual state indicators**: Clear status communication
- **Error announcements**: Screen reader error notifications
- **Focus management**: Proper focus order and visibility
- **High contrast**: Readable color combinations

##### Keyboard Shortcuts
- **Space**: Toggle recording (start/stop)
- **Escape**: End voice chat session

#### 🎯 Performance Features

- **Voice-to-Voice Latency**: Target < 500ms
- **Real-time streaming**: No audio batching
- **Connection pooling**: Reuses WebSocket connections
- **Automatic reconnection**: Up to 5 retry attempts with exponential backoff
- **Audio queue**: Prevents audio overlap and stuttering
- **Resource cleanup**: Proper disposal of audio contexts and media streams

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  VoiceChat   │  │   Waveform   │  │ KeyboardShortcuts│     │
│  │  Component   │──│   Component  │  │      Hook        │     │
│  └──────┬───────┘  └──────────────┘  └────────┬─────────┘     │
│         │                                      │                │
│         └──────────────┬───────────────────────┘                │
│                        │                                        │
│                 ┌──────▼────────┐                               │
│                 │ VoiceService  │                               │
│                 │  (WebSocket)  │                               │
│                 └──────┬────────┘                               │
│                        │                                        │
│                 ┌──────▼────────┐                               │
│                 │ Zustand Store │                               │
│                 └───────────────┘                               │
└──────────────────────┬──────────────────────────────────────────┘
                       │ Socket.io (WebSocket + HTTP)
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                      Backend (NestJS)                            │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    VoiceGateway                           │ │
│  │              (WebSocket Handler)                          │ │
│  └────────┬─────────────────────┬──────────────────┬─────────┘ │
│           │                     │                  │            │
│  ┌────────▼─────────┐  ┌───────▼────────┐ ┌──────▼──────────┐ │
│  │  VoiceController │  │  Orchestrator  │ │  Session Store  │ │
│  │   (REST API)     │  │    Service     │ │   (In-Memory)   │ │
│  └──────────────────┘  └───────┬────────┘ └─────────────────┘ │
│                                 │                               │
│           ┌─────────────────────┼──────────────────┐           │
│           │                     │                  │            │
│  ┌────────▼────────┐  ┌────────▼────────┐ ┌──────▼──────────┐ │
│  │   STT Service   │  │   LLM Service   │ │   TTS Service   │ │
│  │   (Deepgram)    │  │    (OpenAI)     │ │  (ElevenLabs)   │ │
│  └─────────────────┘  └─────────────────┘ └─────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
    ┌──────────┐         ┌──────────┐        ┌──────────┐
    │ Deepgram │         │  OpenAI  │        │ElevenLabs│
    │   API    │         │   API    │        │   API    │
    └──────────┘         └──────────┘        └──────────┘
```

### Voice Pipeline Flow

```
User Speech
    │
    ▼
┌─────────────────┐
│ MediaRecorder   │ (Browser)
│ (Audio Capture) │
└────────┬────────┘
         │ WebM chunks (100ms intervals)
         ▼
┌─────────────────┐
│  Socket.io      │
│  (WebSocket)    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│        STT Service (Deepgram)           │
│  - Streaming transcription              │
│  - Interim results                      │
│  - Final transcript with punctuation    │
└────────┬────────────────────────────────┘
         │ Transcript text
         ▼
┌─────────────────────────────────────────┐
│      Orchestrator Service               │
│  - Receive transcript                   │
│  - Track conversation state             │
│  - Forward to LLM                       │
└────────┬────────────────────────────────┘
         │ Text + Context
         ▼
┌─────────────────────────────────────────┐
│        LLM Service (OpenAI)             │
│  - Intent classification                │
│  - Data extraction                      │
│  - Response generation                  │
│  - Context management                   │
└────────┬────────────────────────────────┘
         │ Response text
         ▼
┌─────────────────────────────────────────┐
│      Orchestrator Service               │
│  - Update conversation state            │
│  - Forward to TTS                       │
└────────┬────────────────────────────────┘
         │ Text to speak
         ▼
┌─────────────────────────────────────────┐
│      TTS Service (ElevenLabs)           │
│  - Streaming synthesis                  │
│  - High-quality voice                   │
│  - Low latency model                    │
└────────┬────────────────────────────────┘
         │ Audio stream (MP3)
         ▼
┌─────────────────┐
│  VoiceGateway   │
│  (Socket.io)    │
└────────┬────────┘
         │ Binary audio data
         ▼
┌─────────────────┐
│  VoiceService   │ (Browser)
│  (Audio Player) │
└────────┬────────┘
         │
         ▼
    Audio Output
```

### Conversation Flow State Machine

```
┌─────────┐
│ INITIAL │
└────┬────┘
     │ User starts chat
     ▼
┌─────────────┐
│  GREETING   │ ──────────────────────────┐
└──────┬──────┘                           │
       │ Product provided                 │
       ▼                                  │
┌──────────────────┐                      │
│ COLLECT_ISSUE    │ ─────────┐           │
└──────┬───────────┘          │           │
       │ Issue provided       │           │
       ▼                      │           │
┌──────────────────┐          │           │
│ COLLECT_URGENCY  │ ──┐      │ Need      │
└──────┬───────────┘   │      │ Clarity   │
       │ Urgency set   │      │           │
       ▼               │      │           │
┌──────────────┐       │      │           │
│ CONFIRMING   │ ◄─────┴──────┴───────────┘
└──────┬───────┘       (Loop back for clarification)
       │
       ├─── Yes ──────► COMPLETE
       │
       └─── No ───────► GREETING (Start over)
```

## 🛠️ Tech Stack

### Backend Technologies

| Technology | Version | Purpose |
|-----------|---------|---------|
| **NestJS** | ^11.0.1 | Progressive Node.js framework |
| **TypeScript** | ^5.7.3 | Type-safe programming |
| **Socket.io** | ^4.8.1 | Real-time bidirectional communication |
| **@nestjs/websockets** | ^11.1.6 | WebSocket gateway support |
| **@nestjs/config** | ^4.0.2 | Environment configuration |
| **@nestjs/jwt** | ^11.0.1 | JWT authentication |
| **Deepgram SDK** | ^4.11.2 | Speech-to-text API |
| **OpenAI** | ^6.4.0 | LLM API for intent processing |
| **ElevenLabs** | ^1.59.0 | Text-to-speech API |
| **uuid** | ^13.0.0 | Session ID generation |
| **class-validator** | ^0.14.2 | DTO validation |
| **class-transformer** | ^0.5.1 | Object transformation |

### Frontend Technologies

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 15.5.6 | React framework with App Router |
| **React** | 19.1.0 | UI library |
| **TypeScript** | ^5 | Type-safe programming |
| **Socket.io-client** | ^4.8.1 | WebSocket client |
| **Zustand** | ^5.0.8 | State management |
| **Tailwind CSS** | ^4 | Utility-first styling |
| **Lucide React** | ^0.468.0 | Icon components |
| **WaveSurfer.js** | ^7.11.0 | Audio visualization |
| **@uidotdev/usehooks** | ^2.4.1 | React hooks utilities |

### Development Tools

- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Jest**: Testing framework
- **ts-jest**: TypeScript support for Jest
- **Supertest**: HTTP testing
- **Concurrently**: Run multiple commands

## 📁 Project Structure

```
d:\Behroz\Upwork Challenge V2\
│
├── backend/                      # NestJS Backend Application
│   ├── src/
│   │   ├── config/
│   │   │   └── configuration.ts  # Environment configuration loader
│   │   │
│   │   ├── voice/                # Voice module (main feature)
│   │   │   ├── services/
│   │   │   │   ├── stt.service.ts         # Speech-to-Text (Deepgram)
│   │   │   │   ├── llm.service.ts         # LLM Intent Processing (OpenAI)
│   │   │   │   ├── tts.service.ts         # Text-to-Speech (ElevenLabs)
│   │   │   │   └── orchestrator.service.ts # Pipeline orchestration
│   │   │   │
│   │   │   ├── voice.controller.ts        # REST API endpoints
│   │   │   ├── voice.gateway.ts           # WebSocket gateway
│   │   │   └── voice.module.ts            # Module definition
│   │   │
│   │   ├── app.controller.ts     # Root controller
│   │   ├── app.module.ts         # Root module
│   │   ├── app.service.ts        # Root service
│   │   └── main.ts               # Application entry point
│   │
│   ├── dist/                     # Compiled JavaScript output
│   ├── test/                     # E2E tests
│   │   ├── app.e2e-spec.ts
│   │   └── jest-e2e.json
│   │
│   ├── .env                      # Environment variables (not in repo)
│   ├── nest-cli.json             # NestJS CLI configuration
│   ├── package.json              # Backend dependencies
│   ├── tsconfig.json             # TypeScript configuration
│   ├── tsconfig.build.json       # Build-specific TypeScript config
│   ├── eslint.config.mjs         # ESLint configuration
│   └── README.md                 # Backend documentation
│
├── frontend/                     # Next.js Frontend Application
│   ├── app/
│   │   ├── page.tsx              # Main page (Voice Chat UI)
│   │   ├── layout.tsx            # Root layout
│   │   ├── globals.css           # Global styles
│   │   └── favicon.ico           # Favicon
│   │
│   ├── components/
│   │   ├── VoiceChat.tsx         # Main voice chat component
│   │   └── Waveform.tsx          # Waveform visualization component
│   │
│   ├── hooks/
│   │   └── useKeyboardShortcuts.ts # Keyboard shortcut hook
│   │
│   ├── lib/
│   │   └── voiceService.ts       # WebSocket & audio handling service
│   │
│   ├── store/
│   │   └── voiceStore.ts         # Zustand state management
│   │
│   ├── types/
│   │   └── voice.ts              # TypeScript type definitions
│   │
│   ├── public/                   # Static assets
│   │   ├── file.svg
│   │   ├── globe.svg
│   │   ├── next.svg
│   │   ├── vercel.svg
│   │   └── window.svg
│   │
│   ├── next.config.ts            # Next.js configuration
│   ├── package.json              # Frontend dependencies
│   ├── tsconfig.json             # TypeScript configuration
│   ├── postcss.config.mjs        # PostCSS configuration
│   ├── eslint.config.mjs         # ESLint configuration
│   └── README.md                 # Frontend documentation
│
├── package.json                  # Root package.json (scripts for both)
└── README.md                     # This file
```

## 📋 Prerequisites

### Required Software

- **Node.js**: v18.0.0 or higher ([Download](https://nodejs.org/))
- **npm**: v9.0.0 or higher (comes with Node.js) or **yarn** v1.22.0+
- **Git**: For version control

### Required API Keys

You will need accounts and API keys from the following services:

1. **OpenAI** ([Sign up](https://platform.openai.com/signup))
   - Required for: Intent processing and response generation
   - Pricing: Pay-as-you-go (GPT-3.5-turbo recommended for cost)
   - Free tier: $5 credit for new accounts

2. **ElevenLabs** ([Sign up](https://elevenlabs.io/))
   - Required for: Text-to-speech synthesis
   - Pricing: Free tier includes 10,000 characters/month
   - Recommended: Starter plan for production use

3. **Deepgram** ([Sign up](https://console.deepgram.com/signup))
   - Required for: Speech-to-text transcription
   - Pricing: Free tier includes $200 credit (45,000 minutes)
   - Recommended: Pay-as-you-go for production

### Browser Requirements

- **Chrome**: Version 90+ (recommended)
- **Firefox**: Version 88+
- **Safari**: Version 14+
- **Edge**: Version 90+

**Required Browser Features**:
- WebSocket support
- MediaRecorder API
- Web Audio API
- getUserMedia API (for microphone access)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd "Upwork Challenge V2"
```

### 2. Install All Dependencies (Quick Method)

Use the convenience script from the root directory:

```bash
npm run install:all
```

This will install dependencies for both backend and frontend.

### 3. Backend Setup (Manual Method)

```bash
cd backend
npm install
```

**Create `.env` file** in the `backend/` directory:

```env
# API Keys (REQUIRED)
OPENAI_API_KEY=sk-...your-key-here...
ELEVENLABS_API_KEY=...your-key-here...
DEEPGRAM_API_KEY=...your-key-here...

# JWT Configuration
JWT_SECRET=your-secure-random-secret-min-32-chars
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3002
FRONTEND_URL=http://localhost:3000

# Voice Service Configuration
# ElevenLabs Voice ID (default: Rachel)
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
# TTS Model (eleven_turbo_v2 for lowest latency)
TTS_MODEL=eleven_turbo_v2
# Deepgram STT Model (nova-2 for best accuracy)
STT_MODEL=nova-2
```

**Generate JWT Secret** (recommended):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Frontend Setup (Manual Method)

```bash
cd frontend
npm install
```

**Optional**: Create `.env.local` file in the `frontend/` directory if you need to customize API URLs:

```env
NEXT_PUBLIC_API_URL=http://localhost:3002
```

### 5. Verify Installation

Check that all dependencies are installed correctly:

```bash
# Backend
cd backend
npm run build

# Frontend
cd ../frontend
npm run build
```

If builds succeed, installation is complete!

## ⚙️ Configuration

### Backend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | ✅ Yes | - | OpenAI API key for GPT models |
| `ELEVENLABS_API_KEY` | ✅ Yes | - | ElevenLabs API key for TTS |
| `DEEPGRAM_API_KEY` | ✅ Yes | - | Deepgram API key for STT |
| `JWT_SECRET` | ✅ Yes | - | Secret for JWT token signing (min 32 chars) |
| `JWT_EXPIRES_IN` | ❌ No | `24h` | JWT token expiration time |
| `PORT` | ❌ No | `3002` | Backend server port |
| `FRONTEND_URL` | ❌ No | `http://localhost:3000` | Frontend URL for CORS |
| `ELEVENLABS_VOICE_ID` | ❌ No | `21m00Tcm4TlvDq8ikWAM` | ElevenLabs voice model ID |
| `TTS_MODEL` | ❌ No | `eleven_turbo_v2` | ElevenLabs TTS model |
| `STT_MODEL` | ❌ No | `nova-2` | Deepgram STT model |

### Voice Model Configuration

#### ElevenLabs Voice IDs

Popular voice options:

- `21m00Tcm4TlvDq8ikWAM` - Rachel (default, female, friendly)
- `AZnzlk1XvdvUeBnXmlld` - Domi (female, professional)
- `EXAVITQu4vr4xnSDxMaL` - Bella (female, soft)
- `ErXwobaYiN019PkySvjV` - Antoni (male, articulate)
- `MF3mGyEYCl7XYWbV9V6O` - Elli (female, conversational)

Find more voices: https://elevenlabs.io/voice-library

#### Deepgram Models

- `nova-2` (default) - Best accuracy, recommended for production
- `nova` - Good balance of speed and accuracy
- `base` - Fastest, lower accuracy
- `enhanced` - Higher accuracy, slower

#### OpenAI Models

- `gpt-3.5-turbo` (default) - Fast, cost-effective
- `gpt-4` - Higher quality, more expensive
- `gpt-4-turbo` - Latest, best performance

### Frontend Configuration

The frontend automatically connects to `http://localhost:3002` by default. To customize:

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3002
NEXT_PUBLIC_WS_URL=ws://localhost:3002
```

## 🏃 Running the Application

### Development Mode

#### Option 1: Run Both Services Together (Recommended)

From the root directory:

```bash
npm run dev
```

This starts both backend and frontend concurrently.

#### Option 2: Run Services Separately

**Terminal 1 - Backend**:

```bash
cd backend
npm run start:dev
```

Backend will run on: http://localhost:3002

**Terminal 2 - Frontend**:

```bash
cd frontend
npm run dev
```

Frontend will run on: http://localhost:3000

### Production Mode

#### Build and Start

```bash
# Build both services
npm run build

# Start both services
npm start
```

Or separately:

```bash
# Backend
cd backend
npm run build
npm run start:prod

# Frontend
cd frontend
npm run build
npm start
```

### Verify Services

1. **Backend Health Check**:
   ```bash
   curl http://localhost:3002
   ```
   Should return: `Hello World!`

2. **Frontend**:
   Open browser to http://localhost:3000
   You should see the Voice AI Support Assistant interface

3. **WebSocket Connection**:
   Check browser console for connection logs after clicking "Start Voice Chat"

## 📖 Usage Guide

### Getting Started

1. **Open the Application**
   - Navigate to http://localhost:3000 in your browser
   - Ensure microphone permissions are enabled

2. **Start Voice Chat**
   - Click the "Start Voice Chat" button
   - The AI will greet you: *"Hi, I'm your support assistant. What product are you calling about today?"*

3. **Provide Information**
   - Press **Space** or click **"Push to Talk"**
   - Speak clearly into your microphone
   - Release **Space** or click again to send

### Conversation Flow

#### Step 1: Product Information
```
AI: "Hi, I'm your support assistant. What product are you calling about today?"
You: "Laptop" or "Mobile app" or any product name
```

#### Step 2: Issue Description
```
AI: "Got it, the [product]. What issue are you experiencing?"
You: "It's not turning on" or "I can't log in" or describe your issue
```

#### Step 3: Urgency Level
```
AI: "I understand - [issue]. How urgent is this for you - low, medium, or high?"
You: "High" or "Medium" or "Low"
```

#### Step 4: Confirmation
```
AI: "I've created ticket #T-1234 for the [product] [issue] with [urgency] priority. Should I submit this now?"
You: "Yes" or "No"
```

#### Step 5: Completion
```
AI: "Perfect! Your ticket has been submitted. Our team will contact you within [timeframe]."
```

**SLA Response Times**:
- **High Priority**: 2 hours
- **Medium Priority**: 24 hours
- **Low Priority**: 48 hours

### User Interface Elements

#### Status Indicator
- 🔵 **Blue Dot**: Listening (recording)
- 🟡 **Yellow Dot**: Processing (transcribing/thinking)
- 🟢 **Green Dot**: Speaking (AI response)
- 🔴 **Red Dot**: Error state
- ⚪ **Gray Dot**: Idle

#### Waveform Visualization
- **Blue waves**: Your voice (recording)
- **Green waves**: AI voice (playback)
- **Flat line**: Silent/idle

#### Transcript Display
- **"You said:"**: Shows your transcribed speech
- **"Assistant:"**: Shows AI's text response

#### Conversation History
- Scrollable log of entire conversation
- Blue background: Your messages
- Green background: AI messages

### Controls

#### Button Controls
- **Start Voice Chat**: Initializes the session
- **Push to Talk**: Hold to record, release to send
- **End Chat**: Terminates the session

#### Keyboard Shortcuts
- **Space**: Toggle recording (works when session is active)
- **Escape**: End chat session

### Tips for Best Results

1. **Audio Quality**
   - Use a good quality microphone
   - Minimize background noise
   - Speak clearly and at normal pace

2. **Phrasing**
   - Keep responses concise and direct
   - One topic per message
   - Natural conversational tone

3. **Handling Errors**
   - If not understood, rephrase your response
   - Check microphone permissions if recording fails
   - Refresh page if connection is lost

## 📡 API Documentation

### REST API Endpoints

#### Create Voice Session

**Endpoint**: `POST /api/voice/session`

**Description**: Creates a new voice interaction session with JWT authentication.

**Request**:
```http
POST /api/voice/session HTTP/1.1
Host: localhost:3002
Content-Type: application/json
```

**Response**:
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "wsUrl": "ws://localhost:3002/voice?sessionId=550e8400-e29b-41d4-a716-446655440000",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response Fields**:
- `sessionId`: Unique session identifier (UUID v4)
- `wsUrl`: WebSocket connection URL with session ID
- `token`: JWT token for authentication (expires in 24h)

**Status Codes**:
- `201 Created`: Session created successfully
- `500 Internal Server Error`: Failed to create session

**Example (cURL)**:
```bash
curl -X POST http://localhost:3002/api/voice/session \
  -H "Content-Type: application/json"
```

**Example (JavaScript)**:
```javascript
const response = await fetch('http://localhost:3002/api/voice/session', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
});
const session = await response.json();
console.log('Session created:', session.sessionId);
```

---

#### Log Metrics

**Endpoint**: `POST /api/voice/metrics`

**Description**: Logs performance metrics for a voice session.

**Request**:
```http
POST /api/voice/metrics HTTP/1.1
Host: localhost:3002
Content-Type: application/json

{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "speechEndTime": 1699564800000,
  "responseStartTime": 1699564800450,
  "latencyMs": 450,
  "processingSteps": {
    "stt": 120,
    "llm": 200,
    "tts": 130
  }
}
```

**Request Fields**:
- `sessionId`: Session UUID
- `speechEndTime`: Timestamp when speech ended (ms)
- `responseStartTime`: Timestamp when response started (ms)
- `latencyMs`: Total voice-to-voice latency (ms)
- `processingSteps`: Breakdown of latency by stage
  - `stt`: Speech-to-text latency (ms)
  - `llm`: LLM processing latency (ms)
  - `tts`: Text-to-speech latency (ms)

**Response**:
```json
{
  "success": true,
  "metrics": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "speechEndTime": 1699564800000,
    "responseStartTime": 1699564800450,
    "latencyMs": 450,
    "processingSteps": {
      "stt": 120,
      "llm": 200,
      "tts": 130
    }
  }
}
```

**Status Codes**:
- `200 OK`: Metrics logged successfully
- `400 Bad Request`: Invalid metrics data
- `500 Internal Server Error`: Failed to log metrics

## 🔌 WebSocket Protocol

### Connection

**URL Format**: `ws://localhost:3002/voice?sessionId={sessionId}`

**Protocol**: Socket.io over WebSocket

**Transports**: WebSocket (primary), HTTP long-polling (fallback)

**Example Connection (JavaScript)**:
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3002/voice', {
  query: { sessionId: 'your-session-id-here' },
  transports: ['websocket', 'polling'],
});
```

### Events

#### Client → Server Events

##### 1. `audio` - Send Audio Data

**Type**: Binary

**Description**: Streams audio chunks to the server for transcription.

**Data Format**: ArrayBuffer (WebM audio format)

**Frequency**: Every 100ms during recording

**Example**:
```javascript
const mediaRecorder = new MediaRecorder(stream, {
  mimeType: 'audio/webm',
});

mediaRecorder.ondataavailable = (event) => {
  if (event.data.size > 0) {
    event.data.arrayBuffer().then((buffer) => {
      socket.emit('audio', buffer);
    });
  }
};

mediaRecorder.start(100); // 100ms chunks
```

##### 2. `control` - Send Control Messages

**Type**: JSON

**Description**: Sends control commands to the server.

**Message Format**:
```typescript
{
  type: 'interrupt' | 'metrics_request',
  data: any
}
```

**Example - Interrupt**:
```javascript
socket.emit('control', {
  type: 'interrupt',
  data: {}
});
```

**Example - Request Metrics**:
```javascript
socket.emit('control', {
  type: 'metrics_request',
  data: {}
});
```

#### Server → Client Events

##### 1. `control` - Receive Control Messages

**Type**: JSON

**Description**: Receives various control messages from the server.

**Message Types**:

###### Transcript Message
```typescript
{
  type: 'transcript',
  data: {
    text: string,
    isFinal: boolean,
    timestamp: number
  }
}
```

**Example**:
```json
{
  "type": "transcript",
  "data": {
    "text": "I need help with my laptop",
    "isFinal": true,
    "timestamp": 1699564800000
  }
}
```

###### Response Message
```typescript
{
  type: 'response',
  data: {
    text: string,
    timestamp: number
  }
}
```

**Example**:
```json
{
  "type": "response",
  "data": {
    "text": "Got it, the laptop. What issue are you experiencing?",
    "timestamp": 1699564800450
  }
}
```

###### Audio End Message
```typescript
{
  type: 'audio_end',
  data: {
    timestamp: number
  }
}
```

###### Metrics Message
```typescript
{
  type: 'metrics',
  data: {
    sessionId: string,
    speechEndTime: number,
    responseStartTime: number,
    latencyMs: number,
    processingSteps: {
      stt: number,
      llm: number,
      tts: number
    }
  }
}
```

###### Error Message
```typescript
{
  type: 'error',
  data: {
    message: string,
    timestamp: number
  }
}
```

###### Interrupted Message
```typescript
{
  type: 'interrupted',
  data: {
    timestamp: number
  }
}
```

##### 2. `audio` - Receive Audio Data

**Type**: Binary

**Description**: Receives synthesized audio from the server.

**Data Format**: ArrayBuffer (MP3 audio format)

**Example Handler**:
```javascript
socket.on('audio', async (data) => {
  // Convert to audio buffer
  const arrayBuffer = data instanceof ArrayBuffer 
    ? data 
    : new Uint8Array(data.data).buffer;
  
  // Decode and play
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  source.start();
});
```

### Connection Lifecycle

#### 1. Connect

```javascript
socket.on('connect', () => {
  console.log('Connected to voice service');
});
```

#### 2. Greeting

Server automatically sends a greeting message upon connection:

```json
{
  "type": "response",
  "data": {
    "text": "Hi, I'm your support assistant. What product are you calling about today?",
    "timestamp": 1699564800000
  }
}
```

#### 3. Audio Exchange

Client sends audio → Server processes → Server sends response audio

#### 4. Disconnect

```javascript
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
```

### Error Handling

#### Connection Errors

```javascript
socket.on('connect_error', (error) => {
  console.error('Connection failed:', error);
});
```

#### Session Errors

Server will send error control message and disconnect:

```json
{
  "type": "error",
  "data": {
    "message": "Session not found",
    "timestamp": 1699564800000
  }
}
```

### Reconnection

Socket.io handles automatic reconnection:

```javascript
const socket = io(url, {
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
});

socket.on('reconnect_failed', () => {
  console.error('Reconnection failed after all attempts');
});
```

## 🎙️ Voice Pipeline Details

### Speech-to-Text (STT) Service

**Provider**: Deepgram

#### Configuration
- **Model**: Nova-2 (state-of-the-art accuracy)
- **Language**: English (en)
- **Sample Rate**: Auto-detected from WebM
- **Channels**: Mono (1 channel)
- **Format**: WebM (from browser MediaRecorder)

#### Features
- **Smart Formatting**: Automatic punctuation and capitalization
- **Interim Results**: Partial transcripts during speech
- **Endpointing**: 500ms silence threshold
- **Utterance Detection**: 1.5s silence for completion
- **Voice Activity Detection (VAD)**: Automatic speech detection

#### Transcript Processing

**Interim Transcripts**:
- Sent to client in real-time
- Not processed by LLM until finalized
- Used for user feedback

**Final Transcripts**:
- Triggered after silence threshold
- Sent to LLM for processing
- Added to conversation history

**Timeout Processing**:
- If no final transcript after 2 seconds
- Substantial interim (3+ words, 0.8+ confidence)
- Automatically processed as final

#### Error Handling
- Connection errors: Auto-reconnect
- Transcription errors: Logged and skipped
- Audio format errors: Fallback to mock mode

### LLM Service

**Provider**: OpenAI

#### Configuration
- **Model**: GPT-3.5-turbo
- **Temperature**: 0.7 (balanced creativity)
- **Max Tokens**: 150 (concise responses)

#### System Prompt

The LLM uses a structured system prompt:

```
You are a support assistant helping users create support tickets via voice conversation.

Current context:
- Product: {product or 'not provided'}
- Issue: {issue or 'not provided'}
- Urgency: {urgency or 'not provided'}
- Ticket ID: {ticketId or 'not generated'}
- Current step: {step}

Conversation flow:
1. greeting: Ask "What product are you calling about today?"
2. collect_issue: Acknowledge product, then ask "What issue are you experiencing?"
3. collect_urgency: Acknowledge issue, then ask "How urgent is this for you - low, medium, or high?"
4. confirming: Create ticket, provide ticket number, ask for confirmation
5. complete: Confirm submission and provide SLA

Rules:
- Keep responses natural and conversational for voice
- Acknowledge what the user said before asking the next question
- Be concise - aim for 1-2 sentences per response
- Use exact phrasing from the flow above when possible
```

#### Intent Classification

**Intent Types**:
- `provide_product`: User provides product name
- `provide_issue`: User describes the issue
- `urgency`: User specifies urgency level
- `confirm`: User confirms ticket submission
- `reject`: User rejects ticket submission
- `unknown`: Intent unclear

#### Data Extraction

**Product Extraction**:
```typescript
// Clean up filler words
let product = userInput.trim()
  .replace(/^(um|uh|the|a|an)\s+/i, '')
  .replace(/\s+(um|uh)$/i, '')
  .trim();
```

**Issue Extraction**:
```typescript
// Clean up pronouns
let issue = userInput.trim()
  .replace(/^(it|the app|it's)\s+/i, '')
  .trim();
```

**Urgency Extraction**:
- Keywords: `high`, `urgent`, `very` → `'high'`
- Keywords: `medium`, `moderate` → `'medium'`
- Keywords: `low`, `not urgent` → `'low'`
- Default: `'medium'`

#### Ticket ID Generation

Format: `T-XXXX` (e.g., `T-1234`)

```typescript
const randomNum = Math.floor(1000 + Math.random() * 9000);
return `T-${randomNum}`;
```

#### Fallback Responses

If OpenAI API is unavailable, the service uses template-based responses:

```typescript
switch (context.step) {
  case 'greeting':
    return "Hi, I'm your support assistant. What product are you calling about today?";
  
  case 'collect_issue':
    return `Got it, the ${context.product}. What issue are you experiencing?`;
  
  case 'collect_urgency':
    return `I understand - ${context.issue}. How urgent is this for you - low, medium, or high?`;
  
  // ... etc
}
```

### Text-to-Speech (TTS) Service

**Provider**: ElevenLabs

#### Configuration
- **Model**: Eleven Turbo v2 (ultra-low latency)
- **Voice ID**: 21m00Tcm4TlvDq8ikWAM (Rachel)
- **Output Format**: MP3 (streaming)

#### Voice Settings
```typescript
{
  stability: 0.5,           // Voice consistency
  similarity_boost: 0.75,   // Voice similarity to original
  style: 0.0,               // Style exaggeration (natural)
  use_speaker_boost: true   // Audio enhancement
}
```

#### Streaming Synthesis

**Process**:
1. Receive text from LLM
2. Send to ElevenLabs API
3. Stream audio chunks as they're generated
4. Collect chunks into complete buffer
5. Send complete audio to client

**Benefits**:
- Lower latency (start playing sooner)
- Reduced memory usage
- Better user experience

#### Audio Format

- **Codec**: MP3
- **Bitrate**: Variable (optimized by ElevenLabs)
- **Channels**: Mono or Stereo (auto)
- **Sample Rate**: 44100 Hz (standard)

### Orchestrator Service

The orchestrator coordinates the entire pipeline.

#### Session Management

**Session Structure**:
```typescript
{
  sessionId: string,              // UUID
  context: ConversationContext,   // Conversation state
  sttConnection: any,             // Deepgram connection
  isActive: boolean,              // Session status
  lastActivity: number,           // Timestamp (ms)
  metrics: {
    speechEndTime?: number,
    responseStartTime?: number,
    sttLatency?: number,
    llm Latency?: number,
    ttsLatency?: number,
  }
}
```

**Session Lifecycle**:
1. **Create**: Initialize session with UUID
2. **Connect STT**: Open Deepgram connection
3. **Setup Listeners**: Configure event handlers
4. **Process Audio**: Handle incoming audio chunks
5. **Cleanup**: Close connections and remove from store

#### Conversation Context

```typescript
{
  product?: string,
  issue?: string,
  urgency?: 'low' | 'medium' | 'high',
  ticketId?: string,
  step: 'greeting' | 'collect_issue' | 'collect_urgency' | 'confirming' | 'complete',
  conversationHistory: Array<{ role: string; content: string }>
}
```

#### Event Flow

1. **Audio Received** → Send to STT Service
2. **Transcript Received** → Process intent with LLM
3. **Response Generated** → Synthesize with TTS
4. **Audio Synthesized** → Send to client

#### Metrics Tracking

**Latency Calculation**:
```typescript
speechEndTime = Date.now();        // When user stops speaking
responseStartTime = Date.now();    // When AI starts responding
latencyMs = responseStartTime - speechEndTime;
```

**Component Latencies**:
- `sttLatency`: Time for transcription
- `llmLatency`: Time for LLM processing
- `ttsLatency`: Time for audio synthesis

#### Interruption Handling

**Process**:
1. Stop current TTS playback
2. Close STT connection
3. Create new STT connection
4. Reset audio queue
5. Continue conversation

**Trigger**: Client sends `interrupt` control message

#### Automatic Cleanup

**Inactive Session Cleanup**:
- Runs every 5 minutes
- Removes sessions inactive > 5 minutes
- Closes all connections
- Frees resources

```typescript
setInterval(() => {
  this.orchestratorService.cleanupInactiveSessions();
}, 300000); // 5 minutes
```

## 🗂️ State Management

### Frontend State (Zustand)

#### Store Structure

```typescript
interface VoiceStore {
  // State
  state: VoiceState;
  session: VoiceSession | null;
  transcript: string;
  response: string;
  error: string | null;
  metrics: VoiceMetrics | null;
  latency: number;
  conversationHistory: Array<{ role: 'user' | 'assistant'; text: string }>;

  // Actions
  setState: (state: VoiceState) => void;
  setSession: (session: VoiceSession | null) => void;
  setTranscript: (transcript: string) => void;
  setResponse: (response: string) => void;
  setError: (error: string | null) => void;
  setMetrics: (metrics: VoiceMetrics) => void;
  setLatency: (latency: number) => void;
  addToHistory: (role: 'user' | 'assistant', text: string) => void;
  reset: () => void;
}
```

#### Voice States

```typescript
type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';
```

**State Transitions**:
```
idle → listening        (user starts recording)
listening → processing  (user stops recording)
processing → speaking   (AI response ready)
speaking → idle         (audio playback complete)
any → error            (error occurs)
error → idle           (error cleared)
```

#### Usage in Components

```typescript
import { useVoiceStore } from '@/store/voiceStore';

function MyComponent() {
  const { state, transcript, setState } = useVoiceStore();
  
  return (
    <div>
      <p>State: {state}</p>
      <p>Transcript: {transcript}</p>
    </div>
  );
}
```

### Backend State (In-Memory)

#### Session Store

```typescript
private sessions: Map<string, VoiceSession> = new Map();
```

**Operations**:
- `createSession()`: Add new session
- `getSession(sessionId)`: Retrieve session
- `closeSession(sessionId)`: Remove session
- `cleanupInactiveSessions()`: Remove old sessions

#### Client Tracking

```typescript
private clients: Map<string, ExtendedSocket> = new Map();
```

Tracks active WebSocket connections by session ID.

## ⚡ Performance Optimization

### Latency Optimization

**Target**: < 500ms voice-to-voice latency

**Breakdown**:
- STT (Deepgram): ~100-150ms
- LLM (OpenAI): ~150-250ms
- TTS (ElevenLabs Turbo): ~100-150ms
- Network overhead: ~50-100ms

**Optimization Strategies**:

1. **Streaming Audio**
   - Send audio chunks every 100ms
   - No batching or buffering
   - Immediate processing

2. **Low-Latency Models**
   - ElevenLabs Turbo v2 (fastest TTS)
   - GPT-3.5-turbo (faster than GPT-4)
   - Deepgram Nova-2 (optimized for speed)

3. **Connection Pooling**
   - Reuse WebSocket connections
   - Keep STT connections alive
   - Persistent sessions

4. **Parallel Processing**
   - STT transcription while speaking
   - TTS synthesis while LLM processes
   - Overlapping operations

### Memory Optimization

1. **Audio Buffer Management**
   - Queue system for audio playback
   - Automatic cleanup after playback
   - Limit queue size

2. **Session Cleanup**
   - Remove inactive sessions (5 min)
   - Close unused connections
   - Clear conversation history

3. **Stream Processing**
   - Process audio chunks immediately
   - Don't accumulate large buffers
   - Release memory after use

### Network Optimization

1. **Binary Protocol**
   - Use binary for audio (not base64)
   - Reduce payload size
   - Faster transmission

2. **WebSocket Transports**
   - Prefer WebSocket over polling
   - Upgrade connection automatically
   - Remember upgrade preference

3. **Compression**
   - WebM for audio input (compressed)
   - MP3 for audio output (compressed)
   - JSON for control messages (small)

### Code Optimization

1. **Async/Await**
   - Non-blocking operations
   - Parallel execution
   - Error handling

2. **Event-Driven**
   - Reactive architecture
   - No polling
   - Immediate responses

3. **Caching**
   - Cache API clients
   - Reuse connections
   - Store session data

## 🔐 Security

### Authentication

**JWT-Based Session Auth**:
- Issued on session creation
- Signed with secure secret
- Expires in 24 hours
- Contains session ID and timestamp

**Token Verification**:
```typescript
const token = this.jwtService.sign({
  sessionId: session.sessionId,
  timestamp: Date.now(),
});
```

### API Key Protection

**Environment Variables**:
- Never commit `.env` files
- Use `.env.example` as template
- Load keys at runtime only
- Log only partial keys (first 10 chars)

**Key Validation**:
```typescript
if (!config.voice.openai.apiKey) {
  console.error('❌ OPENAI_API_KEY not set');
}
```

### CORS Configuration

```typescript
app.enableCors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
});
```

**Production**: Set `FRONTEND_URL` to your domain

### WebSocket Security

**Session Validation**:
- Require session ID in query params
- Verify session exists
- Disconnect invalid sessions

**Connection Limits**:
- Max HTTP buffer: 100 MB
- Ping timeout: 60 seconds
- Auto-disconnect inactive clients

### Input Validation

**DTO Validation**:
```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
  }),
);
```

**Transcript Sanitization**:
- Remove excessive whitespace
- Trim filler words
- Limit length

### Rate Limiting

**Recommendations** (not implemented):
- Limit session creation: 10/hour per IP
- Limit audio upload: 1 MB/s
- Limit messages: 100/minute per session

## ♿ Accessibility

### Keyboard Navigation

**Full Keyboard Support**:
- Tab through all interactive elements
- Space to toggle recording
- Escape to end chat
- Enter to activate buttons

**Focus Management**:
- Visible focus indicators
- Logical tab order
- Focus trapping in modals

### Screen Reader Support

**ARIA Labels**:
```tsx
<button
  aria-label="Start voice chat"
  aria-pressed={isRecording}
  role="button"
>
  Start Chat
</button>
```

**Live Regions**:
```tsx
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
>
  {announcement}
</div>
```

**State Announcements**:
- "Voice assistant is now listening"
- "Recording started. Speak now."
- "Recording stopped. Processing your message."
- "Error: [error message]"

### Visual Design

**High Contrast**:
- White text on dark backgrounds
- Colorful state indicators
- Clear button boundaries

**Text Sizing**:
- Responsive font sizes
- Readable at 200% zoom
- No horizontal scrolling

**Color Independence**:
- Don't rely solely on color
- Use icons + color
- Text labels for states

### Semantic HTML

```tsx
<main>
  <h1>Voice AI Support Assistant</h1>
  <section aria-labelledby="controls">
    <h2 id="controls">Controls</h2>
    <!-- buttons -->
  </section>
  <section aria-labelledby="transcript">
    <h2 id="transcript">Transcript</h2>
    <!-- transcript -->
  </section>
</main>
```

### Error Messages

**Clear and Actionable**:
- "Microphone access denied. Please check permissions."
- "Connection lost. Please refresh the page."
- "Failed to start voice chat. Please try again."

## 🔧 Troubleshooting

### Common Issues

#### 1. Microphone Not Working

**Symptoms**:
- "Microphone access denied" error
- Recording button doesn't work
- No audio being sent

**Solutions**:
1. **Check Browser Permissions**:
   - Chrome: Settings → Privacy → Site Settings → Microphone
   - Firefox: Preferences → Privacy → Permissions → Microphone
   - Safari: Settings → Websites → Microphone

2. **Use HTTPS or Localhost**:
   - `getUserMedia` requires secure context
   - Use `https://` or `localhost` (not IP address)

3. **Test Microphone**:
   ```javascript
   navigator.mediaDevices.getUserMedia({ audio: true })
     .then(stream => console.log('Microphone OK'))
     .catch(err => console.error('Microphone error:', err));
   ```

#### 2. High Latency

**Symptoms**:
- Latency > 1000ms
- Slow responses
- Audio delay

**Solutions**:
1. **Check Network**:
   ```bash
   ping google.com
   ```
   Should be < 100ms

2. **Verify API Keys**:
   - Check `.env` file
   - Test APIs individually
   - Look for rate limiting

3. **Monitor Metrics**:
   ```javascript
   voiceService.onMetrics = (metrics) => {
     console.log('STT:', metrics.processingSteps.stt, 'ms');
     console.log('LLM:', metrics.processingSteps.llm, 'ms');
     console.log('TTS:', metrics.processingSteps.tts, 'ms');
   };
   ```

4. **Optimize Settings**:
   - Use `gpt-3.5-turbo` (not GPT-4)
   - Use `eleven_turbo_v2` (not eleven_multilingual)
   - Use `nova-2` model

#### 3. WebSocket Connection Failed

**Symptoms**:
- "WebSocket connection error"
- Can't connect to backend
- Session creation fails

**Solutions**:
1. **Verify Backend Running**:
   ```bash
   curl http://localhost:3002
   ```
   Should return: "Hello World!"

2. **Check Port**:
   - Backend: `PORT=3002` in `.env`
   - Frontend: `http://localhost:3002` in code
   - No port conflicts

3. **Check CORS**:
   - `FRONTEND_URL=http://localhost:3000` in backend `.env`
   - Matching protocol (http vs https)

4. **Check Firewall**:
   - Allow port 3002
   - Disable VPN temporarily
   - Check antivirus settings

#### 4. Audio Not Playing

**Symptoms**:
- No sound from AI responses
- Audio downloads but doesn't play
- Silent playback

**Solutions**:
1. **Check Browser Audio**:
   - Unmute browser tab
   - Check system volume
   - Test with other audio

2. **Check AudioContext**:
   ```javascript
   const audioContext = new AudioContext();
   console.log('Audio context state:', audioContext.state);
   // Should be 'running', not 'suspended'
   ```

3. **Resume AudioContext**:
   ```javascript
   if (audioContext.state === 'suspended') {
     audioContext.resume();
   }
   ```

4. **Check Audio Format**:
   - Browser should support MP3
   - Try fallback playback method
   - Check console for decode errors

#### 5. API Key Errors

**Symptoms**:
- "API key not set" warnings
- Fallback responses being used
- Authentication errors

**Solutions**:
1. **Verify .env File**:
   - File location: `backend/.env`
   - No spaces around `=`
   - No quotes around values (usually)
   - File name exactly `.env` (not `.env.txt`)

2. **Check API Keys**:
   - OpenAI: https://platform.openai.com/api-keys
   - ElevenLabs: https://elevenlabs.io/app/settings/api-keys
   - Deepgram: https://console.deepgram.com/project/*/keys

3. **Restart Backend**:
   ```bash
   # Ctrl+C to stop
   npm run start:dev
   ```

4. **Check Console Output**:
   ```
   [Configuration] OpenAI API Key: sk-proj-1...
   [Configuration] ElevenLabs API Key: 8a9b7c...
   [Configuration] Deepgram API Key: 4f5e6d...
   ✅ All required API keys are configured!
   ```

#### 6. Session Not Found

**Symptoms**:
- "Session not found" error
- Immediate disconnection
- Can't establish session

**Solutions**:
1. **Create Session First**:
   - Click "Start Voice Chat"
   - Wait for session creation
   - Don't manually open WebSocket

2. **Check Session ID**:
   - Verify session ID in URL
   - No typos or truncation
   - Valid UUID format

3. **Backend Logs**:
   - Check for session creation logs
   - Look for cleanup logs
   - Verify session stored

#### 7. Build Errors

**Symptoms**:
- `npm run build` fails
- Type errors
- Module not found

**Solutions**:
1. **Clean Install**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check Node Version**:
   ```bash
   node --version  # Should be v18+
   npm --version   # Should be v9+
   ```

3. **Update Dependencies**:
   ```bash
   npm update
   ```

4. **Check TypeScript**:
   ```bash
   npx tsc --noEmit
   ```

### Debug Mode

**Enable Verbose Logging**:

Backend:
```typescript
// In main.ts
app.setGlobalPrefix('api', { exclude: [''] });
Logger.log('Debug mode enabled');
```

Frontend:
```typescript
// In voiceService.ts
console.log('WebSocket event:', event, data);
```

### Getting Help

If issues persist:

1. **Check Logs**:
   - Backend console output
   - Frontend browser console
   - Network tab in DevTools

2. **Minimal Reproduction**:
   - Fresh install
   - Default configuration
   - Test with example data

3. **Environment Info**:
   - Node version
   - Browser version
   - OS version
   - API service status

4. **Open Issue**:
   - Include logs
   - Steps to reproduce
   - Expected vs actual behavior

## 💻 Development

### Development Setup

1. **Install Dependencies**:
   ```bash
   npm run install:all
   ```

2. **Start Development Servers**:
   ```bash
   npm run dev
   ```

3. **Open in Browser**:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3002

### Hot Reload

**Backend**: Automatically restarts on file changes (via `nest start --watch`)

**Frontend**: Automatically refreshes on file changes (via Next.js Fast Refresh)

### Code Formatting

**Prettier**:
```bash
# Backend
cd backend
npm run format

# Frontend
cd frontend
npx prettier --write .
```

**ESLint**:
```bash
# Backend
cd backend
npm run lint

# Frontend
cd frontend
npm run lint
```

### Adding Features

#### Backend - New Service

1. Create service file:
   ```bash
   cd backend/src/voice/services
   nest g service myService
   ```

2. Implement service logic

3. Add to module:
   ```typescript
   @Module({
     providers: [MyService, ...],
   })
   ```

4. Inject in gateway/controller:
   ```typescript
   constructor(private myService: MyService) {}
   ```

#### Frontend - New Component

1. Create component file:
   ```bash
   cd frontend/components
   touch MyComponent.tsx
   ```

2. Implement component:
   ```tsx
   export default function MyComponent() {
     return <div>My Component</div>;
   }
   ```

3. Import in parent:
   ```tsx
   import MyComponent from '@/components/MyComponent';
   ```

### Environment Switching

**Development**:
```bash
NODE_ENV=development npm run dev
```

**Production**:
```bash
NODE_ENV=production npm run build
npm start
```

### Database Integration

**Not Implemented** - To add database:

1. Install Prisma/TypeORM:
   ```bash
   npm install @nestjs/typeorm typeorm pg
   ```

2. Configure database:
   ```typescript
   TypeOrmModule.forRoot({
     type: 'postgres',
     host: process.env.DB_HOST,
     // ...
   })
   ```

3. Create entities and repositories

4. Store sessions/metrics in database

## 🧪 Testing

### Unit Tests

**Backend**:
```bash
cd backend
npm test
```

**Test Files**: `*.spec.ts`

**Example Test**:
```typescript
describe('VoiceController', () => {
  it('should create session', async () => {
    const result = await controller.createSession();
    expect(result).toHaveProperty('sessionId');
  });
});
```

**Run with Coverage**:
```bash
npm run test:cov
```

### E2E Tests

**Backend**:
```bash
cd backend
npm run test:e2e
```

**Test Files**: `test/*.e2e-spec.ts`

### Frontend Testing

**Setup Testing Library** (not included):
```bash
cd frontend
npm install --save-dev @testing-library/react @testing-library/jest-dom
```

**Example Test**:
```typescript
import { render, screen } from '@testing-library/react';
import VoiceChat from '@/components/VoiceChat';

test('renders voice chat', () => {
  render(<VoiceChat />);
  expect(screen.getByText('Voice AI Support Assistant')).toBeInTheDocument();
});
```

### Manual Testing

**Test Checklist**:
- [ ] Session creation
- [ ] Microphone access
- [ ] Audio recording
- [ ] Speech transcription
- [ ] AI response generation
- [ ] Audio playback
- [ ] Conversation flow (all 5 steps)
- [ ] Error handling
- [ ] Interruption handling
- [ ] Session cleanup
- [ ] Keyboard shortcuts
- [ ] Accessibility features

### API Testing

**Test with cURL**:
```bash
# Create session
curl -X POST http://localhost:3002/api/voice/session

# Log metrics
curl -X POST http://localhost:3002/api/voice/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session",
    "latencyMs": 450,
    "processingSteps": {"stt": 120, "llm": 200, "tts": 130}
  }'
```

**Test with Postman**:
1. Import collection
2. Set environment variables
3. Run requests

### Load Testing

**Not Implemented** - To add:

```bash
npm install -g artillery

# Create artillery.yml
artillery quick --count 10 --num 50 http://localhost:3002
```

## 🚀 Deployment

### Prerequisites

- **Server**: Linux (Ubuntu recommended)
- **Node.js**: v18+ installed
- **PM2**: Process manager (recommended)
- **Nginx**: Reverse proxy (recommended)
- **SSL Certificate**: For HTTPS (required for microphone)

### Backend Deployment

#### 1. Build

```bash
cd backend
npm install --production
npm run build
```

#### 2. Environment Variables

Create `.env` file with production values:
```env
OPENAI_API_KEY=sk-prod-...
ELEVENLABS_API_KEY=prod-...
DEEPGRAM_API_KEY=prod-...
JWT_SECRET=long-random-production-secret
PORT=3002
FRONTEND_URL=https://yourdomain.com
NODE_ENV=production
```

#### 3. Start with PM2

```bash
npm install -g pm2

pm2 start dist/main.js --name voice-backend
pm2 save
pm2 startup
```

#### 4. Configure Nginx

`/etc/nginx/sites-available/voice-backend`:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /voice {
        proxy_pass http://localhost:3002/voice;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}
```

#### 5. Enable SSL

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

### Frontend Deployment

#### 1. Build

```bash
cd frontend
npm install --production
npm run build
```

#### 2. Start

**Option A: Next.js Server**
```bash
pm2 start npm --name voice-frontend -- start
```

**Option B: Static Export** (if no server features needed)
```bash
# In next.config.ts
export default {
  output: 'export',
}

npm run build
# Deploy .next/out to static host
```

#### 3. Configure Nginx

`/etc/nginx/sites-available/voice-frontend`:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 4. Enable SSL

```bash
sudo certbot --nginx -d yourdomain.com
```

### Docker Deployment

#### Backend Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3002

CMD ["node", "dist/main"]
```

#### Frontend Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

#### Docker Compose

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
    env_file:
      - ./backend/.env
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - backend
    restart: unless-stopped
```

**Run**:
```bash
docker-compose up -d
```

### Cloud Deployment

#### Vercel (Frontend Only)

```bash
cd frontend
npm install -g vercel
vercel
```

#### Heroku (Backend)

```bash
cd backend
heroku create voice-backend
heroku config:set OPENAI_API_KEY=...
git push heroku master
```

#### AWS (Full Stack)

- **Frontend**: S3 + CloudFront or EC2
- **Backend**: EC2 or ECS
- **Load Balancer**: ALB for WebSocket support

#### DigitalOcean (Full Stack)

- **Droplet**: Ubuntu 22.04
- **App Platform**: Managed deployment
- **Spaces**: Static file storage

### Monitoring

#### PM2 Monitoring

```bash
pm2 monit
pm2 logs
pm2 status
```

#### Logging

**Winston Logger** (not included):
```bash
npm install winston
```

Configure structured logging for production.

#### Health Checks

Add health endpoint:
```typescript
@Get('health')
health() {
  return { status: 'ok', timestamp: Date.now() };
}
```

Monitor with UptimeRobot or similar service.

### Scaling

**Horizontal Scaling**:
- Load balancer (Nginx/HAProxy)
- Multiple backend instances
- Session affinity (sticky sessions)
- Redis for shared session store

**Vertical Scaling**:
- Increase server resources
- Optimize code
- Caching layer

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Workflow

1. **Fork the Repository**
   ```bash
   git clone https://github.com/yourusername/voice-ai-assistant.git
   cd voice-ai-assistant
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make Changes**
   - Write code
   - Add tests
   - Update documentation

4. **Test Changes**
   ```bash
   npm run test
   npm run lint
   ```

5. **Commit Changes**
   ```bash
   git add .
   git commit -m "Add amazing feature"
   ```

6. **Push to GitHub**
   ```bash
   git push origin feature/amazing-feature
   ```

7. **Create Pull Request**
   - Go to GitHub
   - Click "New Pull Request"
   - Describe your changes

### Code Style

- **TypeScript**: Use strict mode
- **Formatting**: Run Prettier before commit
- **Linting**: Fix all ESLint errors
- **Comments**: Document complex logic
- **Types**: Prefer interfaces over types

### Commit Messages

Follow Conventional Commits:
```
feat: add user authentication
fix: resolve audio playback issue
docs: update API documentation
chore: upgrade dependencies
```

### Testing Guidelines

- Write unit tests for services
- Write E2E tests for critical paths
- Maintain > 80% code coverage
- Test edge cases and errors

### Documentation

- Update README for new features
- Add JSDoc comments to functions
- Document API changes
- Update architecture diagrams

## 📄 License

MIT License

Copyright (c) 2024 [Your Name]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## 📞 Support & Contact

### Getting Help

- **Documentation**: Read this README thoroughly
- **Issues**: Open an issue on GitHub
- **Discussions**: Use GitHub Discussions for questions

### Known Issues

- Safari may have WebSocket connection issues - use Chrome/Firefox
- High latency on slow connections - requires stable internet
- Microphone permissions vary by browser - check settings

### Roadmap

**Planned Features**:
- [ ] Database integration for session persistence
- [ ] User authentication and accounts
- [ ] Multi-language support
- [ ] Custom voice selection
- [ ] Ticket status tracking
- [ ] Email notifications
- [ ] Admin dashboard
- [ ] Analytics and reporting
- [ ] Rate limiting
- [ ] Redis session store

### Changelog

**v1.0.0** (2024-01-XX)
- Initial release
- Voice-to-voice interaction
- Support ticket creation
- 5-step conversation flow
- Real-time audio streaming
- Accessibility features

---

**Built with ❤️ using NestJS, Next.js, and cutting-edge AI APIs**

**Star ⭐ this repo if you find it useful!**
