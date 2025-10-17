'use client';

import { useEffect, useRef, useState } from 'react';
import { useVoiceStore } from '@/store/voiceStore';
import { VoiceService } from '@/lib/voiceService';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import Waveform from './Waveform';
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';

export default function VoiceChat() {
  const {
    state,
    session,
    transcript,
    response,
    error,
    latency,
    conversationHistory,
    setState,
    setSession,
    setTranscript,
    setResponse,
    setError,
    setLatency,
    addToHistory,
  } = useVoiceStore();

  const voiceServiceRef = useRef<VoiceService | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioData, setAudioData] = useState<Float32Array>();
  const [speechStartTime, setSpeechStartTime] = useState<number>(0);

  useEffect(() => {
    const service = new VoiceService();
    voiceServiceRef.current = service;

    // Setup event handlers
    service.onStateChange = (newState) => {
      setState(newState as any);

      // Announce state changes for screen readers
      announceToScreenReader(`Voice assistant is now ${newState}`);
    };

    service.onTranscript = (text, isFinal) => {
      setTranscript(text);
      if (isFinal) {
        addToHistory('user', text);
      }
    };

    service.onResponse = (text) => {
      setResponse(text);
      addToHistory('assistant', text);

      // Calculate latency
      if (speechStartTime > 0) {
        const responseTime = Date.now();
        const calculatedLatency = responseTime - speechStartTime;
        setLatency(calculatedLatency);
        setSpeechStartTime(0);
      }
    };

    service.onError = (errorMsg) => {
      setError(errorMsg);
      announceToScreenReader(`Error: ${errorMsg}`);
    };

    service.onMetrics = (metrics) => {
      console.log('Metrics:', metrics);
    };

    service.onAudioData = (data) => {
      setAudioData(data);
    };

    return () => {
      service.disconnect();
    };
  }, []);

  const announceToScreenReader = (message: string) => {
    const announcement = document.getElementById('screen-reader-announcement');
    if (announcement) {
      announcement.textContent = message;
    }
  };

  const handleStartChat = async () => {
    try {
      setState('processing');
      announceToScreenReader('Starting voice chat session');

      const newSession = await voiceServiceRef.current!.createSession();
      setSession(newSession);

      await voiceServiceRef.current!.connect(newSession);

      announceToScreenReader('Voice chat connected. Press Space or click microphone to talk.');
    } catch (err) {
      console.error('Failed to start chat:', err);
      setError('Failed to start voice chat. Please try again.');
    }
  };

  const handleEndChat = () => {
    voiceServiceRef.current?.disconnect();
    setSession(null);
    setState('idle');
    setIsRecording(false);
    announceToScreenReader('Voice chat ended');
  };

  const handleStartRecording = async () => {
    if (!session || isRecording) return;

    try {
      setSpeechStartTime(Date.now());
      await voiceServiceRef.current!.startRecording();
      setIsRecording(true);
      announceToScreenReader('Recording started. Speak now.');
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Failed to access microphone. Please check permissions.');
    }
  };

  const handleStopRecording = () => {
    if (!isRecording) return;

    voiceServiceRef.current?.stopRecording();
    setIsRecording(false);
    announceToScreenReader('Recording stopped. Processing your message.');
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSpace: () => {
      if (session && state !== 'processing' && state !== 'speaking') {
        handleToggleRecording();
      }
    },
    onEscape: () => {
      if (session) {
        handleEndChat();
      }
    },
  });

  const getStateColor = () => {
    switch (state) {
      case 'listening':
        return 'bg-blue-500';
      case 'processing':
        return 'bg-yellow-500';
      case 'speaking':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStateLabel = () => {
    return state.charAt(0).toUpperCase() + state.slice(1);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      {/* Screen reader announcements */}
      <div
        id="screen-reader-announcement"
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      />

      <div className="w-full max-w-4xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white">
            Voice AI Support Assistant
          </h1>
          <p className="text-slate-400">
            Create support tickets with voice interaction
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex items-center justify-center gap-3">
          <div className={`w-3 h-3 rounded-full ${getStateColor()} animate-pulse`} />
          <span className="text-white font-medium" role="status">
            {getStateLabel()}
          </span>
          {latency > 0 && (
            <span className="text-slate-400 text-sm">
              ({latency}ms latency)
            </span>
          )}
        </div>

        {/* Waveform Visualization */}
        <div className="bg-slate-800 rounded-xl p-6 shadow-2xl">
          <div className="h-32">
            <Waveform
              audioData={audioData}
              isActive={state === 'listening' || state === 'speaking'}
              type={state === 'listening' ? 'recording' : 'playback'}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4">
          {!session ? (
            <button
              onClick={handleStartChat}
              disabled={state === 'processing'}
              className="flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-semibold rounded-full transition-colors shadow-lg"
              aria-label="Start voice chat"
            >
              <Phone size={24} />
              Start Voice Chat
            </button>
          ) : (
            <>
              <button
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                disabled={state === 'processing' || state === 'speaking'}
                className={`flex items-center gap-2 px-8 py-4 ${
                  isRecording
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                } disabled:bg-slate-600 text-white font-semibold rounded-full transition-colors shadow-lg`}
                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                aria-pressed={isRecording}
              >
                {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
                {isRecording ? 'Release to Send' : 'Push to Talk'}
              </button>

              <button
                onClick={handleEndChat}
                className="flex items-center gap-2 px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-full transition-colors shadow-lg"
                aria-label="End voice chat"
              >
                <PhoneOff size={24} />
                End Chat
              </button>
            </>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div
            className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg"
            role="alert"
          >
            <p className="font-semibold">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Transcript Display */}
        {transcript && (
          <div className="bg-slate-800 rounded-lg p-4 shadow-lg">
            <p className="text-slate-400 text-sm mb-1">You said:</p>
            <p className="text-white">{transcript}</p>
          </div>
        )}

        {/* Response Display */}
        {response && (
          <div className="bg-slate-800 rounded-lg p-4 shadow-lg">
            <p className="text-slate-400 text-sm mb-1">Assistant:</p>
            <p className="text-white">{response}</p>
          </div>
        )}

        {/* Conversation History */}
        {conversationHistory.length > 0 && (
          <div className="bg-slate-800 rounded-lg p-4 shadow-lg max-h-64 overflow-y-auto">
            <p className="text-slate-400 text-sm mb-3 font-semibold">
              Conversation History
            </p>
            <div className="space-y-2">
              {conversationHistory.map((entry, index) => (
                <div
                  key={index}
                  className={`p-2 rounded ${
                    entry.role === 'user'
                      ? 'bg-blue-900/30 text-blue-200'
                      : 'bg-green-900/30 text-green-200'
                  }`}
                >
                  <span className="font-semibold text-xs">
                    {entry.role === 'user' ? 'You' : 'Assistant'}:
                  </span>{' '}
                  {entry.text}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Keyboard Shortcuts Help */}
        <div className="bg-slate-800/50 rounded-lg p-4 text-center">
          <p className="text-slate-400 text-sm">
            <span className="font-semibold">Keyboard Shortcuts:</span> Space -
            Toggle recording | Esc - End chat
          </p>
        </div>
      </div>
    </div>
  );
}
