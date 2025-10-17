export default () => {
  const config = {
    port: parseInt(process.env.PORT || '3002', 10),
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
  };

  // Log configuration status (without exposing full API keys)
  console.log('\n[Configuration] Loading environment variables...');
  console.log('[Configuration] Port:', config.port);
  console.log('[Configuration] Frontend URL:', config.frontendUrl);
  console.log('[Configuration] OpenAI API Key:', config.voice.openai.apiKey ? `${config.voice.openai.apiKey.substring(0, 10)}...` : '❌ NOT SET');
  console.log('[Configuration] ElevenLabs API Key:', config.voice.elevenlabs.apiKey ? `${config.voice.elevenlabs.apiKey.substring(0, 10)}...` : '❌ NOT SET');
  console.log('[Configuration] Deepgram API Key:', config.voice.deepgram.apiKey ? `${config.voice.deepgram.apiKey.substring(0, 10)}...` : '❌ NOT SET');

  // Validate required API keys
  const missingKeys: string[] = [];
  if (!config.voice.openai.apiKey) missingKeys.push('OPENAI_API_KEY');
  if (!config.voice.elevenlabs.apiKey) missingKeys.push('ELEVENLABS_API_KEY');
  if (!config.voice.deepgram.apiKey) missingKeys.push('DEEPGRAM_API_KEY');

  if (missingKeys.length > 0) {
    console.error('\n❌ ERROR: Missing required environment variables:');
    missingKeys.forEach(key => console.error(`   - ${key}`));
    console.error('\n📝 Please check your .env file in the backend directory.');
    console.error('📚 See ENV_SETUP.md for detailed setup instructions.\n');
  } else {
    console.log('✅ All required API keys are configured!\n');
  }

  return config;
};
