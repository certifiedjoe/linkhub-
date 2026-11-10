// services/shortLinksService.js
const { randomBytes } = require('node:crypto');
const { supabase } = require('../db');
const { sanitizeShortLinkInput } = require('../utils/shortLinks');

const FIELDS = 'id, owner, code, title, destination_url, mobile_url, desktop_url, fallback_url, status, expires_at, clicks, created_at, updated_at';

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
    mobileUrl: row.mobile_url || null,
    desktopUrl: row.desktop_url || null,
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

async function getAnalyticsOverview(ownerId) {
  const { data: links, error: linksError } = await supabase
    .from('short_links')
    .select('id, code, title, clicks, status, created_at')
    .eq('owner', ownerId)
    .order('clicks', { ascending: false });
  if (linksError) throw linksError;

  const ownedLinks = links || [];
  const linkIds = ownedLinks.map((link) => link.id);
  const totalClicks = ownedLinks.reduce((sum, link) => sum + Number(link.clicks || 0), 0);

  let events = [];
  if (linkIds.length) {
    const { data, error } = await supabase
      .from('short_link_clicks')
      .select('short_link_id, referrer, device, created_at')
      .in('short_link_id', linkIds)
      .order('created_at', { ascending: false })
      .limit(2000);
    if (error) throw error;
    events = data || [];
  }

  const linkById = new Map(ownedLinks.map((link) => [link.id, link]));
  const devices = new Map();
  const referrers = new Map();
  const recentClicks = events.slice(0, 12).map((event) => {
    const link = linkById.get(event.short_link_id);
    return {
      code: link?.code || '',
      title: link?.title || '',
      device: event.device || 'unknown',
      referrer: event.referrer || 'Direct / unknown',
      createdAt: event.created_at,
    };
  });

  for (const event of events) {
    const device = event.device || 'unknown';
    devices.set(device, (devices.get(device) || 0) + 1);
    let source = 'Direct / unknown';
    if (event.referrer) {
      try { source = new URL(event.referrer).hostname || source; } catch { source = 'Other'; }
    }
    referrers.set(source, (referrers.get(source) || 0) + 1);
  }

  const toBreakdown = (map) => Array.from(map, ([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return {
    totalLinks: ownedLinks.length,
    activeLinks: ownedLinks.filter((link) => link.status === 'active').length,
    totalClicks,
    sampledClicks: events.length,
    topLinks: ownedLinks.slice(0, 8).map((link) => ({
      code: link.code,
      title: link.title,
      clicks: Number(link.clicks || 0),
      status: link.status,
    })),
    devices: toBreakdown(devices),
    referrers: toBreakdown(referrers),
    recentClicks,
  };
}

async function resolveShortLink(code, { referrer = '', userAgent = '' } = {}) {
  const { data, error } = await supabase
    .from('short_links')
    .select('id, destination_url, mobile_url, desktop_url, fallback_url, status, expires_at')
    .eq('code', String(code || '').toLowerCase())
    .maybeSingle();

  if (error) throw error;
  if (!data || data.status !== 'active') return null;
  if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) return null;

  const agent = String(userAgent).slice(0, 500);
  const isMobile = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(agent);
  const isKnownAgent = Boolean(agent.trim());
  const destination = isKnownAgent
    ? (isMobile ? data.mobile_url : data.desktop_url) || data.destination_url
    : data.fallback_url || data.destination_url;

  let safeReferrer = null;
  if (referrer) {
    try { safeReferrer = new URL(String(referrer)).origin.slice(0, 200); } catch { safeReferrer = null; }
  }
  const device = isMobile ? 'mobile' : isKnownAgent ? 'desktop' : 'unknown';

  // Analytics must never hold up a redirect. The database trigger increments
  // the aggregate click counter atomically when this event insert succeeds.
  const { error: eventError } = await supabase
    .from('short_link_clicks')
    .insert({ short_link_id: data.id, referrer: safeReferrer, device });
  if (eventError) {
    console.error('[Short link analytics]', eventError.message || eventError);
  }

  return { destination };
}

module.exports = {
  getMyShortLinks,
  createShortLink,
  updateShortLink,
  deleteShortLink,
  getAnalyticsOverview,
  resolveShortLink,
};
