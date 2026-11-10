'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Check, Copy, Eye, Pencil, Share2, UserRound } from 'lucide-react';
import { api, type Profile, type ProfileDraft } from '@/lib/api';
import { LinkGlyph } from '@/components/icons';
import { Logo } from '@/components/logo';

type Displayable = Profile | (ProfileDraft & { views?: number; totalClicks?: number; isOwner?: boolean });

export function shareUrl(username: string) {
  if (typeof window === 'undefined') return `kiungo.link/${username}`;
  return `${window.location.origin}${window.location.pathname}#/${username}`;
}

/** The share link with the protocol trimmed, so what is shown is exactly what is copied. */
export function prettyUrl(username: string) {
  return shareUrl(username).replace(/^https?:\/\//, '');
}

function Avatar({ src, name, size = 'lg' }: { src: string; name: string; size?: 'lg' | 'sm' }) {
  const dim = size === 'lg' ? 'h-24 w-24' : 'h-12 w-12';
  const initials = (name || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (
    <div
      className={`${dim} shrink-0 overflow-hidden rounded-full ring-2 ring-[hsl(var(--p-ring)/0.55)]`}
      style={{ background: 'hsl(var(--p-btn) / 0.14)' }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={`${name}'s profile photo`} className="h-full w-full object-cover" />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center font-display text-xl font-semibold"
          style={{ color: 'hsl(var(--p-fg))' }}
          aria-hidden
        >
          {initials || <UserRound className="h-8 w-8" />}
        </div>
      )}
    </div>
  );
}

export function ShareBar({ username, compact = false }: { username: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const url = shareUrl(username);
  const text = `Check out my links: ${url}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      el.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const targets = [
    { label: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(text)}` },
    { label: 'X', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}` },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    { label: 'Telegram', href: `https://t.me/share/url?url=${encodeURIComponent(url)}` },
  ];

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <div className="flex items-center gap-2 rounded-xl border bg-raised p-1.5 pl-3">
        <span className="truncate font-mono text-[13px] text-muted" data-testid="text-share-url">
          {prettyUrl(username)}
        </span>
        <button onClick={copy} className="btn-primary ml-auto shrink-0 px-3 py-2" data-testid="button-copy-link">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
          <Share2 className="h-3.5 w-3.5" /> Share to
        </span>
        {targets.map((t) => (
          <a
            key={t.label}
            href={t.href}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border bg-raised px-2.5 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-line/40"
            data-testid={`link-share-${t.label.toLowerCase()}`}
          >
            {t.label}
          </a>
        ))}
      </div>
    </div>
  );
}

export function ProfileStage({
  profile,
  live = false,
  scale = false,
  headingLevel = 'h1',
}: {
  profile: Displayable;
  live?: boolean;
  scale?: boolean;
  headingLevel?: 'h1' | 'p';
}) {
  const Heading = headingLevel;
  const links = useMemo(
    () => profile.links.filter((l) => l.label.trim() && l.url.trim()),
    [profile.links]
  );

  // Record click when user clicks a button
  const onLinkClick = (id?: number | string) => {
    if (live && id) {
      api.countClick(id).catch(() => {});
    }
  };

  // Resolve font family
  const fontMap: Record<string, string> = {
    inter: 'Inter, system-ui, sans-serif',
    poppins: 'Poppins, system-ui, sans-serif',
    'dm-sans': '"DM Sans", system-ui, sans-serif',
    'space-grotesk': '"Space Grotesk", system-ui, sans-serif',
    playfair: '"Playfair Display", serif',
    lora: 'Lora, serif',
    roboto: 'Roboto, system-ui, sans-serif',
    montserrat: 'Montserrat, system-ui, sans-serif',
  };

  const fontFamily = fontMap[profile.fontFamily || 'inter'] || fontMap.inter;
  const customColor = profile.textColor || undefined;

  return (
    <div
      className={`profile-stage theme-${profile.theme || 'ember'} flex w-full flex-1 flex-col items-center px-5 ${
        scale ? 'min-h-full py-8' : 'min-h-dvh py-12'
      }`}
      style={{ fontFamily, color: customColor }}
    >
      <div className="w-full max-w-[420px]">
        <div className="flex flex-col items-center text-center">
          <Avatar src={profile.avatar} name={profile.displayName || profile.username} />
          <Heading
            className="mt-4 font-display text-xl font-semibold"
            data-testid="text-profile-name"
          >
            {profile.displayName || profile.username || 'Your name'}
          </Heading>
          <p
            className="mt-1 text-sm"
            style={{ color: customColor ? undefined : 'hsl(var(--p-muted))' }}
            data-testid="text-profile-handle"
          >
            @{profile.username || 'yourname'}
          </p>
          {profile.tagline ? (
            <p
              className="mt-3 max-w-[34ch] text-[15px] leading-relaxed"
              style={{ color: customColor ? undefined : 'hsl(var(--p-muted))' }}
            >
              {profile.tagline}
            </p>
          ) : null}
        </div>

        <div className="mt-8 space-y-3">
          {links.length === 0 ? (
            <div
              className="rounded-2xl border border-dashed px-5 py-8 text-center text-sm"
              style={{
                borderColor: 'hsl(var(--p-fg) / 0.25)',
                color: customColor ? undefined : 'hsl(var(--p-muted))',
              }}
            >
              Your buttons will appear here. Add your first link to get started.
            </div>
          ) : (
            links.map((link, i) => (
              <a
                key={link.id ?? i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="profile-btn rise"
                style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
                onClick={() => onLinkClick(link.id)}
                data-testid={`link-button-${i}`}
              >
                <LinkGlyph icon={link.icon} />
                <span className="truncate">{link.label}</span>
                {live && profile.isOwner && typeof link.clicks === 'number' ? (
                  <span className="ml-auto shrink-0 text-xs font-medium opacity-60">
                    {link.clicks}
                  </span>
                ) : null}
              </a>
            ))
          )}
        </div>

        <div className="mt-10 flex justify-center">
          <a
            href="#/"
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs transition-opacity hover:opacity-100"
            style={{
              color: customColor ? undefined : 'hsl(var(--p-muted))',
              background: 'hsl(var(--p-fg) / 0.08)',
            }}
            data-testid="link-made-with"
          >
            <Logo className="h-4 w-4" />
            <span>Made with Kiungo</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export function PublicProfile({ username, onEdit }: { username: string; onEdit: (u: string) => void }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setProfile(null);
    setError('');

    api
      .get(username)
      .then((p) => {
        if (!alive) return;
        setProfile(p);

        // Record page view
        api.countView(username).catch(() => {});
      })
      .catch((e: Error) => {
        if (alive) setError(e.message);
      });

    return () => {
      alive = false;
    };
  }, [username]);

  if (error) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <span className="text-accent">
          <Logo className="h-10 w-10" />
        </span>
        <h1 className="mt-5 font-display text-xl font-semibold">Nothing here yet</h1>
        <p className="mt-2 text-sm text-muted">
          The page <span className="font-mono text-ink">/{username}</span> hasn&apos;t been claimed.
        </p>
        <a href="#/build" className="btn-primary mt-6">
          Claim this link
        </a>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-[420px] px-5 py-14">
        <div className="mx-auto h-24 w-24 rounded-full skeleton" />
        <div className="mx-auto mt-5 h-6 w-40 rounded-lg skeleton" />
        <div className="mx-auto mt-3 h-4 w-24 rounded-lg skeleton" />
        <div className="mt-8 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 w-full rounded-2xl skeleton" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {profile.isOwner ? (
        <div className="border-b bg-raised/90 backdrop-blur">
          <div className="mx-auto max-w-3xl space-y-3 px-5 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <a href="#/" className="text-accent" aria-label="Kiungo home">
                <Logo className="h-5 w-5" />
              </a>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink">
                <BarChart3 className="h-4 w-4 text-accent" /> Your live page
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm text-muted" data-testid="text-view-count">
                <Eye className="h-4 w-4" /> {profile.views} views
              </span>
              <span className="text-sm text-muted">{profile.totalClicks} clicks</span>
              <button
                onClick={() => onEdit(profile.username)}
                className="btn-ghost ml-auto px-3 py-2"
                data-testid="button-edit-page"
              >
                <Pencil className="h-4 w-4" /> Edit
              </button>
            </div>
            <ShareBar username={profile.username} compact />
          </div>
        </div>
      ) : null}

      <ProfileStage profile={profile} live />
    </div>
  );
}