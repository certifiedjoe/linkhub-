// middleware/security.js
const helmet = require('helmet');
const cors = require('cors');
const config = require('../config');

function securityMiddleware() {
  return [
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),

    cors({
      origin: (origin, callback) => {
        if (!origin && !config.isProd) {
          return callback(null, true);
        }

        const allowed = config.corsOrigin.split(',').map((o) => o.trim());

        if (allowed.includes(origin) || allowed.includes('*')) {
          return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Visitor-Id'],
    }),
  ];
}

module.exports = { securityMiddleware };