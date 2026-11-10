import { createClient, type SupabaseClient } from '@supabase/supabase-js';
console.log('SUPABASE URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('SUPABASE KEY exists:', Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * True when Supabase credentials are present at build time.
 * When false the app runs in "demo mode": no sign-in, and the API falls back to
 * identifying you by a browser header. Useful for a first `npm run dev`, never for production.
 */
export const authEnabled = Boolean(url && anonKey);

/**
 * Session storage that degrades instead of throwing.
 * `localStorage` is unavailable in sandboxed iframes and in Safari private mode, where
 * touching it raises a SecurityError and would take the whole app down. Fall back to
 * memory: the user stays signed in for the tab, and is asked again on reload.
 */
function safeStorage() {
  const memory = new Map<string, string>();
  let usable = false;
  try {
    const probe = '__kiungo_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    usable = true;
  } catch {
    usable = false;
  }
  if (usable) return window.localStorage;
  return {
    getItem: (k: string) => (memory.has(k) ? (memory.get(k) as string) : null),
    setItem: (k: string, v: string) => void memory.set(k, v),
    removeItem: (k: string) => void memory.delete(k),
  };
}
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!authEnabled || typeof window === 'undefined') return null;

  if (client) return client;   // ← reuse the existing client

  client = createClient(url, anonKey, {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
      storage: safeStorage(),
    },
  });

  return client;
}

/** Current access token, or null when signed out / auth disabled. */
export async function accessToken(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Where Supabase should send the user back to after Google sign-in or an email
 * confirmation.
 *
 * The hash route is carried in a `next` query param rather than left in the fragment:
 * Supabase appends `?code=...` to this URL, and a URL that already had a fragment would
 * end up malformed. `consumeNextRoute` puts the user back where they were.
 */
export function redirectTarget(): string {
  const base = window.location.origin + window.location.pathname;
  const hash = window.location.hash.replace(/^#/, '');
  return hash && hash !== '/' ? `${base}?next=${encodeURIComponent(hash)}` : base;
}

/**
 * After returning from Supabase, restore the route the user was heading to and strip
 * the auth params out of the address bar. Call once on mount.
 */
export function consumeNextRoute() {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next');
  if (!next && !params.has('code') && !params.has('error')) return;
  params.delete('next');
  params.delete('code');
  params.delete('error');
  params.delete('error_description');
  const query = params.toString();
  const hash = next ? `#${next.startsWith('/') ? next : `/${next}`}` : window.location.hash;
  window.history.replaceState(null, '', window.location.pathname + (query ? `?${query}` : '') + hash);
}
