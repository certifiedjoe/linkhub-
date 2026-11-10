import { accessToken } from '@/lib/supabase';

export type LinkItem = {
  id?: number;
  label: string;
  url: string;
  icon: string;
  position?: number;
  clicks?: number;
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
  if (!injected || injected.slice(0, 2) === '__') return 'http://localhost:8000';
  const trimmed = injected.replace(/\/$/, '');
  if (/^https?:\/\//.test(trimmed)) return trimmed;
  const origin = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '');
  return `${origin.replace(/\/$/, '')}/${trimmed.replace(/^\//, '')}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Attach the Supabase access token when signed in. The API verifies it and derives
  // ownership from the user id inside; it never trusts a client-supplied identity.
  const token = await accessToken().catch(() => null);
  const res = await fetch(`${base()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (res.status === 401) throw new AuthRequiredError((data && data.error) || 'Please sign in to continue.');
  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
  return data as T;
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
