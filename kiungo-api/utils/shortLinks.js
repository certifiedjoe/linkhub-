// utils/shortLinks.js
const RESERVED_CODES = new Set([
  'admin', 'api', 'about', 'login', 'logout', 'signin', 'signup',
  'settings', 'account', 'new', 'edit', 'build', 'dashboard', 'help',
  'terms', 'privacy', 'support', 'kiungo', 'linkhub', 'r', 's',
]);

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function httpUrl(value, label) {
  if (value == null || value === '') return null;
  const raw = String(value).trim();
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw badRequest(`${label} must be a valid URL.`);
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
    throw badRequest(`${label} must use HTTP or HTTPS.`);
  }
  return parsed.toString();
}

function appUrl(value, label) {
  if (value == null || value === '') return null;
  const raw = String(value).trim();
  if (/^https?:\/\//i.test(raw)) return httpUrl(raw, label);
  // Allow custom application schemes (e.g. myapp://open/item), but never
  // browser-executable or local-file schemes.
  const match = /^([a-z][a-z0-9+.-]*):\/\/([^\s]+)$/i.exec(raw);
  if (!match || ['javascript', 'data', 'file', 'vbscript', 'blob'].includes(match[1].toLowerCase())) {
    throw badRequest(`${label} must be a valid app deep link or HTTP(S) URL.`);
  }
  return raw;
}

function sanitizeShortLinkInput(body = {}, { partial = false } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw badRequest('Short link details must be an object.');
  }

  const output = {};
  if (!partial || Object.hasOwn(body, 'destinationUrl') || Object.hasOwn(body, 'destination_url')) {
    const raw = body.destinationUrl ?? body.destination_url;
    output.destination_url = httpUrl(raw, 'Destination URL');
    if (!output.destination_url && !partial) throw badRequest('A destination URL is required.');
  }

  if (!partial || Object.hasOwn(body, 'code')) {
    const code = String(body.code || '').trim().toLowerCase();
    if (code) {
      if (!/^[a-z0-9_-]{3,32}$/.test(code)) {
        throw badRequest('Custom short codes must be 3–32 characters and use letters, numbers, hyphens or underscores.');
      }
      if (RESERVED_CODES.has(code)) throw badRequest('That short code is reserved.');
      output.code = code;
    } else if (!partial) {
      output.code = null;
    }
  }

  if (!partial || Object.hasOwn(body, 'title')) {
    output.title = String(body.title || '').trim().slice(0, 80);
  }

  for (const [inputKey, column, label] of [
    ['iosUrl', 'ios_url', 'iOS destination'],
    ['androidUrl', 'android_url', 'Android destination'],
    ['fallbackUrl', 'fallback_url', 'Web fallback'],
  ]) {
    if (!partial || Object.hasOwn(body, inputKey) || Object.hasOwn(body, column)) {
      const raw = body[inputKey] ?? body[column];
      output[column] = inputKey === 'fallbackUrl'
        ? httpUrl(raw, label)
        : appUrl(raw, label);
    }
  }

  if (!partial || Object.hasOwn(body, 'status')) {
    const status = String(body.status || 'active').toLowerCase();
    if (!['active', 'paused'].includes(status)) throw badRequest('Status must be active or paused.');
    output.status = status;
  }

  if (!partial || Object.hasOwn(body, 'expiresAt') || Object.hasOwn(body, 'expires_at')) {
    const raw = body.expiresAt ?? body.expires_at;
    if (raw == null || raw === '') {
      output.expires_at = null;
    } else {
      const date = new Date(raw);
      if (!Number.isFinite(date.getTime())) throw badRequest('Expiry date is invalid.');
      output.expires_at = date.toISOString();
    }
  }

  return output;
}

module.exports = { sanitizeShortLinkInput };
