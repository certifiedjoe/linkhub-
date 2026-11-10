// utils/validation.js
const config = require('../config');

const RESERVED = new Set([
  'admin', 'api', 'about', 'login', 'logout', 'signin', 'signup', 'settings',
  'account', 'new', 'edit', 'build', 'dashboard', 'help', 'terms', 'privacy',
  'support', 'kiungo', 'linkhub',
]);
const MAX_BIGINT = 9223372036854775807n;

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

function normalizeUsername(u) {
  return String(u || '').trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
}

function validUsername(u) {
  return /^[a-z0-9_.-]{3,24}$/.test(u) && !RESERVED.has(u);
}

function safeUrl(raw) {
  let u = String(raw || '').trim();
  if (!u) return null;
  if (!/^https?:\\/\\//i.test(u)) {
    if (/^mailto:|^tel:/i.test(u)) return u;
    u = 'https://' + u;
  }
  try {
    const parsed = new URL(u);
    if (!['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function sanitizeProfileInput(body = {}) {
  return {
    username: normalizeUsername(body.username),
    displayName: String(body.displayName || '').trim().slice(0, config.maxDisplayNameLength),
    tagline: String(body.tagline || '').slice(0, config.maxTaglineLength),
    avatar: String(body.avatar || '').slice(0, config.maxAvatarLength),
    theme: String(body.theme || 'ember').slice(0, 40),
    fontFamily: body.fontFamily ? String(body.fontFamily).slice(0, 80) : null,
    textColor: body.textColor ? String(body.textColor).slice(0, 20) : null,
    links: Array.isArray(body.links) ? body.links : [],
  };
}

function sanitizeLinks(links = []) {
  if (!Array.isArray(links)) throw badRequest('Links must be an array.');

  const seenIds = new Set();
  return links.map((link, index) => {
    if (!link || typeof link !== 'object' || Array.isArray(link)) {
      throw badRequest('Each link must be an object.');
    }

    const url = safeUrl(link.url);
    const label = String(link.label || '').trim().slice(0, 60);
    // Empty builder rows are ignored, but a partially completed row is rejected.
    if (!url && !label) return null;
    if (!url || !label) throw badRequest('Each link needs both a label and a valid URL.');

    // Keep BIGINT IDs as canonical decimal strings; never round them through Number.
    let id = null;
    if (link.id != null && link.id !== '') {
      const rawId = String(link.id);
      if (!/^\\d+$/.test(rawId)) throw badRequest('Invalid link id.');
      const numericId = BigInt(rawId);
      if (numericId <= 0n || numericId > MAX_BIGINT) throw badRequest('Invalid link id.');
      id = numericId.toString();
      if (seenIds.has(id)) throw badRequest('Duplicate link id.');
      seenIds.add(id);
    }

    const position = Number.isSafeInteger(link.position)
      && link.position >= 0
      && link.position <= 2147483647
      ? link.position
      : index;

    return {
      id,
      label,
      url,
      icon: String(link.icon || 'link').slice(0, 24),
      position,
    };
  }).filter(Boolean);
}

module.exports = {
  normalizeUsername,
  validUsername,
  safeUrl,
  sanitizeProfileInput,
  sanitizeLinks,
};
