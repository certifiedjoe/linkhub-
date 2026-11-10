// middleware/auth.js
const { createRemoteJWKSet, jwtVerify, decodeProtectedHeader } = require('jose');
const config = require('../config');

const SUPABASE_URL = config.supabase.url;
const JWT_SECRET = config.supabase.jwtSecret;

const authEnabled = Boolean(SUPABASE_URL || JWT_SECRET);

const jwks = SUPABASE_URL
  ? createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`), {
      cacheMaxAge: 10 * 60 * 1000,
      cooldownDuration: 30 * 1000,
    })
  : null;

const secretKey = JWT_SECRET ? new TextEncoder().encode(JWT_SECRET) : null;

function bearer(req) {
  const header = req.get('authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

async function verify(token) {
  if (!token) return null;

  const options = { audience: 'authenticated' };
  if (SUPABASE_URL) options.issuer = `${SUPABASE_URL}/auth/v1`;

  try {
    const alg = decodeProtectedHeader(token).alg;
    let result;

    if (alg === 'HS256') {
      if (!secretKey) return null;
      result = await jwtVerify(token, secretKey, options);
    } else {
      if (!jwks) return null;
      result = await jwtVerify(token, jwks, options);
    }

    const sub = result.payload.sub;
    return typeof sub === 'string' && sub ? sub : null;
  } catch {
    return null;
  }
}

function attachUser() {
  return async (req, _res, next) => {
    if (!authEnabled) {
      req.userId = req.get('x-visitor-id') || 'local-visitor';
      req.signedIn = true;
      req.demoMode = true;
      return next();
    }

    req.userId = await verify(bearer(req));
    req.signedIn = Boolean(req.userId);
    req.demoMode = false;
    next();
  };
}

function requireUser(req, res, next) {
  if (!req.signedIn) {
    return res.status(401).json({ error: 'Please sign in to continue.' });
  }
  next();
}

module.exports = { authEnabled, attachUser, requireUser };