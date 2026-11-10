'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, Link2, Pause, Pencil, Play, Plus, Trash2, X } from 'lucide-react';
import { api, type ShortLink, type ShortLinkDraft } from '@/lib/api';

export function ShortLinksDashboard() {
  const [items, setItems] = useState<ShortLink[] | null>(null);
  const [destinationUrl, setDestinationUrl] = useState('');
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [iosUrl, setIosUrl] = useState('');
  const [androidUrl, setAndroidUrl] = useState('');
  const [fallbackUrl, setFallbackUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [advanced, setAdvanced] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDestination, setEditDestination] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    try {
      setItems(await api.shortLinks());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your short links.');
      setItems([]);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    const draft: ShortLinkDraft = {
      destinationUrl,
      ...(title.trim() ? { title: title.trim() } : {}),
      ...(code.trim() ? { code: code.trim() } : {}),
      ...(iosUrl.trim() ? { iosUrl: iosUrl.trim() } : {}),
      ...(androidUrl.trim() ? { androidUrl: androidUrl.trim() } : {}),
      ...(fallbackUrl.trim() ? { fallbackUrl: fallbackUrl.trim() } : {}),
      ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
    };
    try {
      await api.createShortLink(draft);
      setDestinationUrl('');
      setTitle('');
      setCode('');
      setIosUrl('');
      setAndroidUrl('');
      setFallbackUrl('');
      setExpiresAt('');
      setAdvanced(false);
      setNotice('Your short link is ready.');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the short link.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(item: ShortLink) {
    setError('');
    try {
      await api.updateShortLink(item.id, { status: item.status === 'active' ? 'paused' : 'active' });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update this link.');
    }
  }

  async function saveDestination(item: ShortLink) {
    setError('');
    try {
      await api.updateShortLink(item.id, { destinationUrl: editDestination });
      setEditingId(null);
      setEditDestination('');
      await refresh();
      setNotice('Destination updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the destination.');
    }
  }

  async function remove(item: ShortLink) {
    if (!window.confirm('Delete the short link /' + item.code + '? This cannot be undone.')) return;
    setError('');
    try {
      await api.deleteShortLink(item.id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete this link.');
    }
  }

  async function copy(item: ShortLink) {
    try {
      await navigator.clipboard.writeText(api.shortLinkUrl(item.code));
      setNotice('Short link copied.');
      setError('');
    } catch {
      setError('Clipboard access is unavailable in this browser.');
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-7 sm:px-5 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-accent">Link management</p>
          <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">Short links</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">Create memorable links, manage destinations and track every click.</p>
        </div>
        <div className="rounded-xl border bg-raised px-4 py-3 text-sm">
          <span className="text-muted">Total links</span>
          <span className="ml-3 font-semibold tabular-nums">{items?.length ?? '—'}</span>
        </div>
      </div>

      <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,.8fr)]">
        <form onSubmit={create} className="card space-y-4 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/12 text-accent"><Plus className="h-5 w-5" /></span>
            <div><h2 className="font-semibold">Create a short link</h2><p className="text-xs text-muted">Paste a long destination URL to get started.</p></div>
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Destination URL</span>
            <input required type="url" value={destinationUrl} onChange={e => setDestinationUrl(e.target.value)} placeholder="https://example.com/your-page" className="w-full rounded-xl border bg-surface px-3 py-3 text-sm outline-none focus:border-accent" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Link title <span className="font-normal text-muted">· optional</span></span>
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={80} placeholder="My website" className="w-full rounded-xl border bg-surface px-3 py-3 text-sm outline-none focus:border-accent" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Custom ending <span className="font-normal text-muted">· optional</span></span>
            <div className="flex overflow-hidden rounded-xl border bg-surface focus-within:border-accent">
              <span className="flex items-center border-r bg-raised px-3 font-mono text-xs text-muted">/r/</span>
              <input value={code} onChange={e => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 32))} placeholder="my-link" maxLength={32} className="min-w-0 flex-1 bg-transparent px-3 py-3 font-mono text-sm outline-none" />
            </div>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Expiry date <span className="font-normal text-muted">· optional</span></span>
            <input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="w-full rounded-xl border bg-surface px-3 py-3 text-sm outline-none focus:border-accent" />
          </label>
          <button type="button" onClick={() => setAdvanced(v => !v)} className="text-sm font-medium text-accent hover:underline">
            {advanced ? 'Hide' : 'Add'} smart-link destinations
          </button>
          {advanced ? (
            <div className="space-y-3 rounded-xl border bg-raised/50 p-4">
              <p className="text-xs text-muted">Optional app destinations. Use an app URL scheme or an HTTPS universal link; keep the web destination as the fallback.</p>
              <label className="block space-y-1"><span className="text-xs font-medium">iOS app link</span><input value={iosUrl} onChange={e => setIosUrl(e.target.value)} placeholder="myapp://open/page" className="w-full rounded-lg border bg-surface px-3 py-2.5 text-sm" /></label>
              <label className="block space-y-1"><span className="text-xs font-medium">Android app link</span><input value={androidUrl} onChange={e => setAndroidUrl(e.target.value)} placeholder="myapp://open/page" className="w-full rounded-lg border bg-surface px-3 py-2.5 text-sm" /></label>
              <label className="block space-y-1"><span className="text-xs font-medium">Web fallback</span><input type="url" value={fallbackUrl} onChange={e => setFallbackUrl(e.target.value)} placeholder="https://example.com" className="w-full rounded-lg border bg-surface px-3 py-2.5 text-sm" /></label>
            </div>
          ) : null}
          {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
          {notice ? <p role="status" className="text-sm text-emerald-700">{notice}</p> : null}
          <button type="submit" disabled={saving || !destinationUrl.trim()} className="btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-60">
            <Link2 className="h-4 w-4" /> {saving ? 'Creating…' : 'Create short link'}
          </button>
        </form>

        <div className="space-y-4">
          <div className="flex items-center justify-between"><h2 className="font-semibold">Your links</h2><span className="text-xs text-muted">Newest first</span></div>
          {items === null ? (
            <div className="card h-36 animate-pulse p-5" />
          ) : items.length === 0 ? (
            <div className="card border-dashed p-8 text-center">
              <Link2 className="mx-auto h-8 w-8 text-muted" />
              <p className="mt-3 font-medium">No short links yet</p>
              <p className="mt-1 text-sm text-muted">Create your first one using the form.</p>
            </div>
          ) : items.map(item => (
            <article key={item.id} className="card p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent"><Link2 className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-sm font-semibold">/r/{item.code}</p>
                    <span className={item.status === 'active' ? 'rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700' : 'rounded-full bg-line px-2 py-0.5 text-[11px] font-medium text-muted'}>{item.status}</span>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted">{item.title || item.destinationUrl}</p>
                  {editingId === item.id ? (
                    <div className="mt-2 flex gap-2"><input type="url" value={editDestination} onChange={e => setEditDestination(e.target.value)} className="min-w-0 flex-1 rounded-lg border bg-surface px-2 py-2 text-xs" aria-label="New destination URL" /><button onClick={() => void saveDestination(item)} className="btn-quiet px-2 py-1 text-xs" aria-label="Save destination"><Check className="h-3.5 w-3.5" /></button><button onClick={() => setEditingId(null)} className="btn-quiet px-2 py-1 text-xs" aria-label="Cancel edit"><X className="h-3.5 w-3.5" /></button></div>
                  ) : <p className="mt-1 truncate text-xs text-muted">{item.destinationUrl}</p>}
                  {item.expiresAt ? <p className="mt-1 text-[11px] text-muted">Expires {new Date(item.expiresAt).toLocaleString()}</p> : null}
                  <p className="mt-2 text-xs text-muted"><span className="font-semibold tabular-nums">{item.clicks.toLocaleString()}</span> clicks</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
                <button onClick={() => void copy(item)} className="btn-quiet px-3 py-2 text-xs"><Copy className="h-3.5 w-3.5" /> Copy</button>
                <a href={api.shortLinkUrl(item.code)} target="_blank" rel="noopener noreferrer" className="btn-quiet px-3 py-2 text-xs"><ExternalLink className="h-3.5 w-3.5" /> Open</a>
                <button onClick={() => { setEditingId(item.id); setEditDestination(item.destinationUrl); }} className="btn-quiet px-3 py-2 text-xs"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                <button onClick={() => void toggleStatus(item)} className="btn-quiet px-3 py-2 text-xs">{item.status === 'active' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}{item.status === 'active' ? 'Pause' : 'Activate'}</button>
                <button onClick={() => void remove(item)} className="btn-quiet ml-auto px-3 py-2 text-xs text-red-600"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
