// services/shortLinksService.js
const { randomBytes } = require('node:crypto');
const { supabase } = require('../db');
const { sanitizeShortLinkInput } = require('../utils/shortLinks');

const FIELDS = 'id, owner, code, title, destination_url, ios_url, android_url, fallback_url, status, expires_at, clicks, created_at, updated_at';

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function present(row) {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    destinationUrl: row.destination_url,
    iosUrl: row.ios_url,
    androidUrl: row.android_url,
    fallbackUrl: row.fallback_url,
    status: row.status,
    expiresAt: row.expires_at,
    clicks: Number(row.clicks || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getMyShortLinks(ownerId) {
  const { data, error } = await supabase
    .from('short_links')
    .select(FIELDS)
    .eq('owner', ownerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(present);
}

async function createShortLink(ownerId, body) {
  const input = sanitizeShortLinkInput(body);
  const customCode = input.code;
  delete input.code;

  for (let attempt = 0; attempt < (customCode ? 1 : 5); attempt += 1) {
    const code = customCode || randomBytes(6).toString('hex');
    const { data, error } = await supabase
      .from('short_links')
      .insert({ ...input, owner: ownerId, code })
      .select(FIELDS)
      .single();

    if (!error) return present(data);
    if (error.code === '23505') {
      if (customCode) throw httpError(409, 'That short link is already in use.');
      continue;
    }
    throw error;
  }

  throw httpError(503, 'Could not generate a unique short code. Please try again.');
}

async function updateShortLink(ownerId, id, body) {
  const input = sanitizeShortLinkInput(body, { partial: true });
  if (Object.keys(input).length === 0) throw httpError(400, 'There are no changes to save.');

  const { data, error } = await supabase
    .from('short_links')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('owner', ownerId)
    .select(FIELDS)
    .maybeSingle();

  if (error) {
    if (error.code === '23505') throw httpError(409, 'That short code is already in use.');
    throw error;
  }
  if (!data) throw httpError(404, 'Short link not found.');
  return present(data);
}

async function deleteShortLink(ownerId, id) {
  const { data, error } = await supabase
    .from('short_links')
    .delete()
    .eq('id', id)
    .eq('owner', ownerId)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw httpError(404, 'Short link not found.');
  return { deleted: data.id };
}

async function resolveShortLink(code, { referrer = '', userAgent = '' } = {}) {
  const { data, error } = await supabase
    .from('short_links')
    .select('id, destination_url, ios_url, android_url, fallback_url, status, expires_at')
    .eq('code', String(code || '').toLowerCase())
    .maybeSingle();

  if (error) throw error;
  if (!data || data.status !== 'active') return null;
  if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) return null;

  const agent = String(userAgent).slice(0, 500);
  const isIOS = /iPhone|iPad|iPod/i.test(agent);
  const isAndroid = /Android/i.test(agent);
  const destination = isIOS && data.ios_url
    ? data.ios_url
    : isAndroid && data.android_url
      ? data.android_url
      : data.fallback_url || data.destination_url;

  const safeReferrer = String(referrer || '').slice(0, 500) || null;
  const device = isIOS ? 'ios' : isAndroid ? 'android' : /Mobile/i.test(agent) ? 'mobile' : 'desktop';

  // Analytics must never hold up a redirect. The database trigger increments
  // the aggregate click counter atomically when this event insert succeeds.
  const { error: eventError } = await supabase
    .from('short_link_clicks')
    .insert({ short_link_id: data.id, referrer: safeReferrer, device });
  if (eventError) {
    console.error('[Short link analytics]', eventError.message || eventError);
  }

  return destination;
}

module.exports = {
  getMyShortLinks,
  createShortLink,
  updateShortLink,
  deleteShortLink,
  resolveShortLink,
};
