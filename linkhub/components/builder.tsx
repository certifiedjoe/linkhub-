'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Loader2,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { api, fileToAvatar, type LinkItem, type Profile, type ProfileDraft } from '@/lib/api';
import { guessIcon, ICONS, LinkGlyph, THEMES } from '@/components/icons';
import { ProfileStage, ShareBar } from '@/components/profile-view';

const FONT_OPTIONS = [
  { key: 'inter', label: 'Inter', family: 'Inter, system-ui, sans-serif' },
  { key: 'poppins', label: 'Poppins', family: 'Poppins, system-ui, sans-serif' },
  { key: 'dm-sans', label: 'DM Sans', family: '"DM Sans", system-ui, sans-serif' },
  { key: 'space-grotesk', label: 'Space Grotesk', family: '"Space Grotesk", system-ui, sans-serif' },
  { key: 'playfair', label: 'Playfair Display', family: '"Playfair Display", serif' },
  { key: 'lora', label: 'Lora', family: 'Lora, serif' },
  { key: 'roboto', label: 'Roboto', family: 'Roboto, system-ui, sans-serif' },
  { key: 'montserrat', label: 'Montserrat', family: 'Montserrat, system-ui, sans-serif' },
];

const emptyDraft = (username = ''): ProfileDraft => ({
  username,
  displayName: '',
  tagline: '',
  avatar: '',
  theme: 'ember',
  fontFamily: 'inter',      // ← default
  textColor: '',            // ← empty = use theme default
  // Start with one blank row so the link editor is never an empty box.
  links: [{ label: '', url: '', icon: 'link' }],
});

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[320px]">
      <div className="overflow-hidden rounded-[36px] border-[6px] border-ink/85 bg-ink shadow-lift">
        <div className="h-[600px] overflow-y-auto overscroll-contain bg-raised">{children}</div>
      </div>
    </div>
  );
}

export function Builder({
  editing,
  onDone,
  onBack,
  initialUsername = '',
}: {
  editing?: string;
  onDone: (username: string) => void;
  onBack: () => void;
  initialUsername?: string;
}) {
  const [draft, setDraft] = useState<ProfileDraft>(() => emptyDraft(initialUsername));
  const [loading, setLoading] = useState(Boolean(editing));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [availability, setAvailability] = useState<'idle' | 'checking' | 'free' | 'taken' | 'invalid'>('idle');
  const fileRef = useRef<HTMLInputElement>(null);

  const set = useCallback(<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setSaved(false);
  }, []);

  useEffect(() => {
    if (!editing) return;
    let alive = true;
    api
      .get(editing)
      .then((p: Profile) => {
        if (!alive) return;
        setDraft({
          username: p.username,
          displayName: p.displayName,
          tagline: p.tagline,
          avatar: p.avatar,
          fontFamily: p.fontFamily || 'inter',
          textColor: p.textColor || '',
          theme: p.theme,
          links: p.links,
        });
        setLoading(false);
      })
      .catch((e: Error) => {
        if (!alive) return;
        setError(e.message);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [editing]);

  useEffect(() => {
    if (editing) return;
    const u = draft.username.trim();
    if (!u) return setAvailability('idle');
    if (!/^[a-zA-Z0-9_.-]{3,24}$/.test(u)) return setAvailability('invalid');
    setAvailability('checking');
    const t = window.setTimeout(() => {
      api
        .checkUsername(u)
        .then((r) => setAvailability(r.available ? 'free' : r.reason === 'invalid' ? 'invalid' : 'taken'))
        .catch(() => setAvailability('idle'));
    }, 400);
    return () => window.clearTimeout(t);
  }, [draft.username, editing]);

  const updateLink = (index: number, patch: Partial<LinkItem>) => {
    setDraft((d) => ({ ...d, links: d.links.map((l, i) => (i === index ? { ...l, ...patch } : l)) }));
    setSaved(false);
  };

  const move = (index: number, dir: -1 | 1) => {
    setDraft((d) => {
      const next = [...d.links];
      const target = index + dir;
      if (target < 0 || target >= next.length) return d;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...d, links: next };
    });
    setSaved(false);
  };

  const onPickFile = async (file?: File) => {
    if (!file) return;
    setError('');
    try {
      set('avatar', await fileToAvatar(file));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const save = async () => {
    setError('');
    setSaving(true);
    try {
      const clean = { ...draft, links: draft.links.filter((l) => l.label.trim() && l.url.trim()) };
      const result = editing ? await api.update(editing, clean) : await api.create(clean);
      setSaved(true);
      onDone(result.username);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const removePage = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await api.remove(editing);
      onBack();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  const canSave =
    draft.username.trim().length >= 3 &&
    (editing ? true : availability === 'free') &&
    draft.displayName.trim().length > 0 &&
    !saving;

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-16">
        <div className="h-8 w-48 rounded-lg skeleton" />
        <div className="mt-6 h-64 w-full rounded-2xl skeleton" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:py-10">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={onBack} className="btn-quiet -ml-3" data-testid="button-back">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="font-display text-xl font-semibold">{editing ? 'Edit your page' : 'Build your page'}</h1>
        <div className="ml-auto flex items-center gap-2">
          {editing ? (
            <button onClick={removePage} className="btn-quiet" data-testid="button-delete-page">
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          ) : null}
          <button onClick={save} disabled={!canSave} className="btn-primary" data-testid="button-save">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
            {editing ? 'Save changes' : 'Publish page'}
          </button>
        </div>
      </div>

      {error ? (
        <div
          className="mt-4 flex items-start gap-2 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-ink"
          role="alert"
          data-testid="text-error"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          {error}
        </div>
      ) : null}

      <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {/* Identity */}
          <section className="card p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Your identity</h2>
            <p className="mt-1 text-sm text-muted">This is what visitors see at the top of your page.</p>

            <div className="mt-5 flex flex-wrap items-center gap-4">
              <div className="relative h-20 w-20 overflow-hidden rounded-full border bg-surface">
                {draft.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={draft.avatar} alt="Your profile photo preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted">
                    <ImagePlus className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => fileRef.current?.click()} className="btn-ghost" data-testid="button-upload-photo">
                  <ImagePlus className="h-4 w-4" /> {draft.avatar ? 'Replace photo' : 'Upload photo'}
                </button>
                {draft.avatar ? (
                  <button onClick={() => set('avatar', '')} className="btn-quiet" data-testid="button-remove-photo">
                    <X className="h-4 w-4" /> Remove
                  </button>
                ) : null}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onPickFile(e.target.files?.[0])}
                  data-testid="input-photo"
                />
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Your link</span>
                <div className="flex items-stretch overflow-hidden rounded-xl border bg-raised focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15">
                  <span className="flex items-center bg-line/30 px-3 font-mono text-[13px] text-muted">kiungo.link/</span>
                  <input
                    value={draft.username}
                    onChange={(e) => set('username', e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                    disabled={Boolean(editing)}
                    placeholder="yourname"
                    className="w-full bg-transparent px-3 py-2.5 text-[15px] outline-none disabled:text-muted"
                    data-testid="input-username"
                  />
                </div>
                <span className="mt-1.5 block text-xs text-muted" data-testid="text-availability">
                  {editing
                    ? 'Your link address cannot be changed.'
                    : availability === 'checking'
                      ? 'Checking availability…'
                      : availability === 'free'
                        ? '✓ Available'
                        : availability === 'taken'
                          ? 'Already taken — try another.'
                          : availability === 'invalid'
                            ? '3–24 characters: letters, numbers, dot, dash, underscore.'
                            : 'Letters, numbers, dot, dash or underscore.'}
                </span>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Display name</span>
                <input
                  value={draft.displayName}
                  onChange={(e) => set('displayName', e.target.value)}
                  placeholder="Amina Juma"
                  className="field"
                  data-testid="input-display-name"
                />
              </label>
            </div>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-medium">Short bio</span>
              <textarea
                value={draft.tagline}
                onChange={(e) => set('tagline', e.target.value.slice(0, 160))}
                rows={2}
                placeholder="Photographer in Dar es Salaam. Bookings open."
                className="field resize-none"
                data-testid="input-tagline"
              />
              <span className="mt-1 block text-xs text-muted">{draft.tagline.length}/160</span>
            </label>
          </section>

          {/* Links */}
          <section className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <h2 className="text-lg font-semibold">Your buttons</h2>
                <p className="mt-1 text-sm text-muted">Every link becomes a tappable button on your page.</p>
              </div>
              <button
                onClick={() => {
                  setDraft((d) => ({ ...d, links: [...d.links, { label: '', url: '', icon: 'link' }] }));
                  setSaved(false);
                }}
                className="btn-ghost ml-auto"
                data-testid="button-add-link"
              >
                <Plus className="h-4 w-4" /> Add button
              </button>
            </div>

            {draft.links.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed px-5 py-10 text-center">
                <p className="text-sm font-medium">No buttons yet</p>
                <p className="mx-auto mt-1 max-w-[42ch] text-sm text-muted">
                  Add your Instagram, WhatsApp, shop, or anything else you want people to reach.
                </p>
              </div>
            ) : (
              <ul className="mt-5 space-y-3">
                {draft.links.map((link, i) => (
                  <li key={i} className="rounded-xl border bg-surface/60 p-3" data-testid={`row-link-${i}`}>
                    <div className="flex items-start gap-2">
                      <div className="flex flex-col gap-1 pt-1">
                        <button
                          onClick={() => move(i, -1)}
                          disabled={i === 0}
                          aria-label="Move link up"
                          className="rounded-md p-1 text-muted hover:bg-line/50 hover:text-ink disabled:opacity-30"
                          data-testid={`button-move-up-${i}`}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => move(i, 1)}
                          disabled={i === draft.links.length - 1}
                          aria-label="Move link down"
                          className="rounded-md p-1 text-muted hover:bg-line/50 hover:text-ink disabled:opacity-30"
                          data-testid={`button-move-down-${i}`}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid flex-1 gap-2 sm:grid-cols-2">
                        <input
                          value={link.label}
                          onChange={(e) => updateLink(i, { label: e.target.value })}
                          placeholder="Button text — e.g. Follow on Instagram"
                          className="field"
                          data-testid={`input-link-label-${i}`}
                        />
                        <input
                          value={link.url}
                          onChange={(e) =>
                            updateLink(i, {
                              url: e.target.value,
                              icon: link.icon === 'link' ? guessIcon(e.target.value) : link.icon,
                            })
                          }
                          placeholder="instagram.com/yourname"
                          inputMode="url"
                          className="field"
                          data-testid={`input-link-url-${i}`}
                        />
                        <div className="relative sm:col-span-2">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                            <LinkGlyph icon={link.icon} className="h-4 w-4" />
                          </span>
                          <select
                            value={link.icon}
                            onChange={(e) => updateLink(i, { icon: e.target.value })}
                            aria-label="Button icon"
                            className="field appearance-none pl-9"
                            data-testid={`select-link-icon-${i}`}
                          >
                            {ICONS.map((opt) => (
                              <option key={opt.key} value={opt.key}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setDraft((d) => ({ ...d, links: d.links.filter((_, x) => x !== i) }));
                          setSaved(false);
                        }}
                        aria-label="Delete link"
                        className="rounded-md p-2 text-muted hover:bg-accent/10 hover:text-accent"
                        data-testid={`button-delete-link-${i}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Theme */}
          <section className="card p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Page style</h2>
            <p className="mt-1 text-sm text-muted">Pick the look of your public page.</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {THEMES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => set('theme', t.key)}
                  className={`rounded-xl border p-2 text-left transition-all ${
                    draft.theme === t.key ? 'border-accent ring-4 ring-accent/15' : 'hover:border-muted/50'
                  }`}
                  data-testid={`button-theme-${t.key}`}
                >
                  <span className="block h-14 w-full rounded-lg" style={{ background: t.swatch }} aria-hidden />
                  <span className="mt-2 block text-sm font-medium">{t.label}</span>
                </button>
              ))}
            </div>
            {/* Typography */}
<section className="card p-5 sm:p-6">
  <h2 className="text-lg font-semibold">Typography</h2>
  <p className="mt-1 text-sm text-muted">
    Choose the font and text colour of your page.
  </p>
  <div className="mt-5 grid gap-4 sm:grid-cols-2">
    {/* Font family */}
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">Font</span>
      <select
        value={draft.fontFamily || 'inter'}
        onChange={(e) => set('fontFamily', e.target.value)}
        className="field"
      >
        {FONT_OPTIONS.map((f) => (
          <option key={f.key} value={f.key}>
            {f.label}
          </option>
        ))}
      </select>
    </label>

    {/* Text colour */}
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">Text colour</span>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={draft.textColor || '#ffffff'}
          onChange={(e) => set('textColor', e.target.value)}
          className="h-10 w-14 cursor-pointer rounded-lg border bg-raised p-1"
        />
        <button
          type="button"
          onClick={() => set('textColor', '')}
          className="btn-quiet text-sm"
        >
          Use theme default
        </button>
      </div>
    </label>
  </div>
</section>
          </section>
        </div>

        {/* Live preview */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <p className="mb-3 text-sm font-medium text-muted">Live preview</p>
          <PhoneFrame>
            <ProfileStage profile={draft} scale headingLevel="p" />
          </PhoneFrame>
          {editing ? (
            <div className="mt-5">
              <ShareBar username={draft.username} compact />
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
