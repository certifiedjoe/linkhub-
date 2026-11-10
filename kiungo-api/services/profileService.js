// services/profileService.js
const { supabase } = require('../db');
const config = require('../config');
const {
  normalizeUsername,
  validUsername,
  sanitizeProfileInput,
  sanitizeLinks,
} = require('../utils/validation');

async function hydrate(profile) {
  if (!profile) return null;

  const { data: links, error } = await supabase
    .from('links')
    .select('id, label, url, icon, position, clicks')
    .eq('profile_id', profile.id)
    .order('position', { ascending: true })
    .order('id', { ascending: true });

  if (error) throw error;

  const totalClicks = (links || []).reduce((sum, l) => sum + (l.clicks || 0), 0);

  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name,
    tagline: profile.tagline,
    avatar: profile.avatar,
    theme: profile.theme,
    fontFamily: profile.font_family,
    textColor: profile.text_color,
    views: profile.views,
    totalClicks,
    links: links || [],
  };
}

async function findByUsername(username) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getMyProfiles(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('owner', userId)
    .order('id', { ascending: false });

  if (error) throw error;
  return Promise.all((data || []).map(hydrate));
}

async function getShowcase(limit = 12) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('views', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return Promise.all((data || []).map(hydrate));
}

async function getPublicProfile(username, requesterId = null) {
  const profile = await findByUsername(normalizeUsername(username));
  if (!profile) return null;

  const hydrated = await hydrate(profile);
  hydrated.isOwner = Boolean(requesterId) && profile.owner === requesterId;
  return hydrated;
}

async function checkUsernameAvailable(rawUsername) {
  const username = normalizeUsername(rawUsername);

  if (!validUsername(username)) {
    return { username, available: false, reason: 'invalid' };
  }

  const existing = await findByUsername(username);
  return { username, available: !existing };
}

async function createProfile(userId, body) {
  const input = sanitizeProfileInput(body);

  if (!validUsername(input.username)) {
    const err = new Error('Pick 3-24 characters: letters, numbers, dot, dash or underscore.');
    err.status = 400;
    throw err;
  }

  const existing = await findByUsername(input.username);
  if (existing) {
    const err = new Error('That link is already taken.');
    err.status = 409;
    throw err;
  }

  const { count, error: countError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('owner', userId);

  if (countError) throw countError;

  if ((count || 0) >= config.maxPagesPerUser) {
    const err = new Error(`You have reached the limit of ${config.maxPagesPerUser} pages.`);
    err.status = 429;
    throw err;
  }

  const displayName = input.displayName || input.username;

  const { data: profile, error } = await supabase
    .from('profiles')
    .insert({
      username: input.username,
      display_name: displayName,
      tagline: input.tagline,
      avatar: input.avatar,
      theme: input.theme,
      font_family: input.fontFamily,
      text_color: input.textColor,
      owner: userId,
    })
    .select()
    .single();

  if (error) throw error;

  await writeLinks(profile.id, input.links);
  return hydrate(profile);
}

async function updateProfile(username, userId, body) {
  const profile = await findByUsername(normalizeUsername(username));
  if (!profile) {
    const err = new Error('Profile not found');
    err.status = 404;
    throw err;
  }

  if (profile.owner !== userId) {
    const err = new Error('This page belongs to someone else.');
    err.status = 403;
    throw err;
  }

  const input = sanitizeProfileInput(body);

  const { data: updated, error } = await supabase
    .from('profiles')
    .update({
      display_name: input.displayName || profile.display_name,
      tagline: input.tagline ?? profile.tagline,
      avatar: input.avatar ?? profile.avatar,
      theme: input.theme || profile.theme,
      font_family: input.fontFamily ?? profile.font_family,
      text_color: input.textColor ?? profile.text_color,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id)
    .select()
    .single();

  if (error) throw error;

  if (Array.isArray(body.links)) {
    await writeLinks(profile.id, body.links);
  }

  return hydrate(updated);
}

async function deleteProfile(username, userId) {
  const profile = await findByUsername(normalizeUsername(username));
  if (!profile) {
    const err = new Error('Profile not found');
    err.status = 404;
    throw err;
  }

  if (profile.owner !== userId) {
    const err = new Error('This page belongs to someone else.');
    err.status = 403;
    throw err;
  }

  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', profile.id);

  if (error) throw error;
  return { deleted: profile.username };
}

async function incrementView(username) {
  const profile = await findByUsername(normalizeUsername(username));
  if (!profile) {
    const err = new Error('Profile not found');
    err.status = 404;
    throw err;
  }

  const { data, error } = await supabase.rpc('linkhub_increment_profile_views', {
    p_profile_id: String(profile.id),
  });

  if (error) throw error;
  return { views: data };
}

async function incrementClick(linkId) {
  const id = String(linkId || '');
  if (!/^\\d+$/.test(id)) {
    const err = new Error('Invalid link id');
    err.status = 400;
    throw err;
  }

  const { data, error } = await supabase.rpc('linkhub_increment_link_clicks', {
    p_link_id: id,
  });

  if (error && error.code === 'P0002') {
    const notFound = new Error('Link not found');
    notFound.status = 404;
    throw notFound;
  }
  if (error) throw error;
  return { ok: true, clicks: data };
}

async function writeLinks(profileId, rawLinks) {
  const links = sanitizeLinks(rawLinks);
  const { error } = await supabase.rpc('linkhub_reconcile_links', {
    p_profile_id: String(profileId),
    p_links: links,
  });
  if (error) throw error;
}

module.exports = {
  getMyProfiles,
  getShowcase,
  getPublicProfile,
  checkUsernameAvailable,
  createProfile,
  updateProfile,
  deleteProfile,
  incrementView,
  incrementClick,
};