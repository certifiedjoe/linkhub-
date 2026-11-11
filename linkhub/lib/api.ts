import { accessToken } from '@/lib/supabase';

export type LinkItem = {
  id?: number | string;
  label: string;
  url: string;
  icon: string;
  position?: number;
  clicks?: number;
};

export type AnalyticsBreakdown = { label: string; count: number };

export type AnalyticsOverview = {
  totalLinks: number;
  activeLinks: number;
  totalClicks: number;
  sampledClicks: number;
  topLinks: Array<{ code: string; title: string; clicks: number; status: 'active' | 'paused' }>;
  devices: AnalyticsBreakdown[];
  referrers: AnalyticsBreakdown[];
  recentClicks: Array<{ code: string; title: string; device: string; referrer: string; createdAt: string }>;
};

export type ShortLink = {
  id: string;
  code: string;
  title: string;
  destinationUrl: string;
  mobileUrl: string | null;
  desktopUrl: string | null;
  fallbackUrl: string | null;
  status: 'active' | 'paused';
  expiresAt: string | null;
  clicks: number;
  createdAt: string;
  updatedAt: string;
};

export type ShortLinkDraft = {
  code?: string;
  title?: string;
  destinationUrl: string;
  mobileUrl?: string;
  desktopUrl?: string;
  fallbackUrl?: string;
  status?: 'active' | 'paused';
  expiresAt?: string | null;
};

export type Profile = {
  id: number;
  username: string;
  displayName: string;
  tagline: string;
  avatar: string;
  theme: string;
  fontFamily?: string;   // ← new
  textColor?: string;    // ← new (hex colour)
  views: number;
  totalClicks: number;
  links: LinkItem[];
  isOwner?: boolean;
};

export type ProfileDraft = {
  username: string;
  displayName: string;
  tagline: string;
  avatar: string;
  theme: string;
  fontFamily?: string;   // ← new
  textColor?: string;    // ← new
  links: LinkItem[];
};

function base(): string {
  const injected = typeof window === 'undefined' ? '' : ((window as unknown as Record<string, string>).__KIUNGO_API__ || '');
  const configured = process.env.NEXT_PUBLIC_KIUNGO_API_URL || injected;
  const value = configured && configured.slice(0, 2) !== '__' ? configured : '';

  if (!value) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('The API URL is not configured. Set NEXT_PUBLIC_KIUNGO_API_URL to your deployed Kiungo API origin.');
    }
    return 'http://localhost:8000';
  }

  const trimmed = value.replace(/\/$/, '');
  if (/^https?:\/\//.test(trimmed)) return trimmed;
  const origin = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '');
  return `${origin.replace(/\/$/, '')}/${trimmed.replace(/^\//, '')}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Attach the Supabase access token when signed in. The API derives ownership
  // from the verified token, never from a client-supplied identity.
  const token = await accessToken().catch(() => null);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20_000);

  try {
    const res = await fetch(`${base()}${path}`, {
      ...init,
      signal: init?.signal || controller.signal,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers || {}),
      },
    });

    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      if (res.status !== 204) throw new Error('The API returned an unreadable response. Please try again.');
    }

    const message = data && typeof data === 'object' && 'error' in data
      ? String((data as { error: unknown }).error)
      : '';
    if (res.status === 401) throw new AuthRequiredError(message || 'Please sign in to continue.');
    if (!res.ok) throw new Error(message || `Request failed (${res.status})`);
    return data as T;
  } catch (error) {
    if (error instanceof AuthRequiredError || error instanceof Error && !['AbortError','TypeError'].includes(error.name)) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('The request took too long. Check your connection and try again.');
    }
    throw new Error('Could not reach Kiungo. Check your connection and try again.');
  } finally {
    window.clearTimeout(timeout);
  }
}

/** Thrown on a 401 so callers can send the user to the sign-in screen. */
export class AuthRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthRequiredError';
  }
}

export const api = {
  checkUsername: (u: string) => request<{ username: string; available: boolean; reason?: string }>(`/api/username-available?u=${encodeURIComponent(u)}`),
  mine: () => request<Profile[]>('/api/me'),
  showcase: () => request<Profile[]>('/api/profiles'),
  get: (username: string) => request<Profile>(`/api/profiles/${encodeURIComponent(username)}`),
  create: (draft: ProfileDraft) => request<Profile>('/api/profiles', { method: 'POST', body: JSON.stringify(draft) }),
  update: (username: string, draft: Partial<ProfileDraft>) =>
    request<Profile>(`/api/profiles/${encodeURIComponent(username)}`, { method: 'PUT', body: JSON.stringify(draft) }),
  remove: (username: string) => request<{ deleted: string }>(`/api/profiles/${encodeURIComponent(username)}`, { method: 'DELETE' }),
  countView: (username: string) => request<{ views: number }>(`/api/profiles/${encodeURIComponent(username)}/view`, { method: 'POST' }),
  countClick: (id: number | string) => request<{ ok: boolean }>(`/api/links/${id}/click`, { method: 'POST' }),
  analyticsOverview: () => request<AnalyticsOverview>('/api/analytics/overview'),
  shortLinks: () => request<ShortLink[]>('/api/short-links'),
  createShortLink: (draft: ShortLinkDraft) => request<ShortLink>('/api/short-links', { method: 'POST', body: JSON.stringify(draft) }),
  updateShortLink: (id: string, draft: Partial<ShortLinkDraft>) => request<ShortLink>(`/api/short-links/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(draft) }),
  deleteShortLink: (id: string) => request<{ deleted: string }>(`/api/short-links/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  shortLinkUrl: (code: string) => `${base()}/api/r/${encodeURIComponent(code)}`,
};

/** Resize an uploaded image to a square 512px data URL so profiles stay light. */
export function fileToAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Please choose an image file.'));
    if (file.size > 12 * 1024 * 1024) return reject(new Error('That image is larger than 12MB.'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That image could not be loaded.'));
      img.onload = () => {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Image processing is unavailable.'));
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.88));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
