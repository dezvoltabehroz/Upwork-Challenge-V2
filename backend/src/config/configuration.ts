export default () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  voice: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
    },
    elevenlabs: {
      apiKey: process.env.ELEVENLABS_API_KEY,
      voiceId: process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM',
      model: process.env.TTS_MODEL || 'eleven_turbo_v2',
    },
    deepgram: {
      apiKey: process.env.DEEPGRAM_API_KEY,
      model: process.env.STT_MODEL || 'nova-2',
    },
  },
});
