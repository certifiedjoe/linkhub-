// index.js
const app = require('./app');
const config = require('./config');
const { authEnabled } = require('./middleware/auth');

app.listen(config.port, '0.0.0.0', () => {
  console.log(`🚀 Kiungo API listening on port ${config.port}`);
  console.log(`   Environment: ${config.nodeEnv}`);

  if (authEnabled) {
    console.log('   Auth: Supabase JWT verification enabled');
  } else {
    console.warn('   Auth: DEMO MODE — no SUPABASE_URL or SUPABASE_JWT_SECRET set');
    console.warn('         Do NOT use this in production');
  }
});