// utils/validation.js
const config = require('../config');

const RESERVED = new Set([
  'admin', 'api', 'about', 'login', 'logout', 'signin', 'signup', 'settings',
  'account', 'new', 'edit', 'build', 'dashboard', 'help', 'terms', 'privacy',
  'support', 'kiungo', 'linkhub',
]);

function normalizeUsername(u) {
  return String(u || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, '');
}

function validUsername(u) {
  return /^[a-z0-9_.-]{3,24}$/.test(u) && !RESERVED.has(u);
}

function safeUrl(raw) {
  let u = String(raw || '').trim();
  if (!u) return null;

  if (!/^https?:\/\//i.test(u)) {
    if (/^mailto:|^tel:/i.test(u)) return u;
    u = 'https://' + u;
  }

  try {
    const parsed = new URL(u);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
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
  return links
    .map((link, index) => {
      const url = safeUrl(link.url);
      const label = String(link.label || '').trim().slice(0, 60);
      if (!url || !label) return null;

      return {
        label,
        url,
        icon: String(link.icon || 'link').slice(0, 24),
        position: Number.isFinite(link.position) ? link.position : index,
        clicks: Number(link.clicks) || 0,
      };
    })
    .filter(Boolean);
}

module.exports = {
  normalizeUsername,
  validUsername,
  safeUrl,
  sanitizeProfileInput,
  sanitizeLinks,
};