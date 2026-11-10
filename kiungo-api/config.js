// config.js
require('dotenv').config();

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0 && process.env.NODE_ENV === 'production') {
  console.error('❌ Missing required environment variables:', missing.join(', '));
  process.exit(1);
}

const config = {
  port: Number(process.env.PORT) || 8000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',

  supabase: {
    url: (process.env.SUPABASE_URL || '').replace(/\/$/, ''),
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    jwtSecret: process.env.SUPABASE_JWT_SECRET || '',
  },

  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',

  maxPagesPerUser: 10,
  maxAvatarLength: 4_000_000,
  maxTaglineLength: 160,
  maxDisplayNameLength: 60,
};

module.exports = config;