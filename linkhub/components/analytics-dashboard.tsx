'use client';

import { useCallback, useEffect, useState } from 'react';
import { BarChart3, ExternalLink, Link2, MousePointerClick, Activity } from 'lucide-react';
import { api, type AnalyticsOverview } from '@/lib/api';

function Breakdown({ title, items }: { title: string; items: AnalyticsOverview['devices'] }) {
  const max = Math.max(1, ...items.map(item => item.count));
  return (
    <section className="card p-5">
      <h2 className="font-semibold">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-5 text-sm text-muted">No activity yet.</p>
      ) : (
        <div className="mt-5 space-y-4">
          {items.map(item => (
            <div key={item.label}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{item.label}</span>
                <span className="shrink-0 font-mono text-xs text-muted">{item.count.toLocaleString()}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-line/60">
                <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(4, item.count / max * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      setData(await api.analyticsOverview());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load analytics.');
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  if (error && !data) {
    return <section className="mx-auto max-w-6xl px-5 py-10"><p role="alert" className="text-sm text-red-600">{error}</p></section>;
  }

  const topClickCount = Math.max(1, ...(data?.topLinks || []).map(link => link.clicks));

  return (
    <section className="mx-auto max-w-6xl px-4 py-7 sm:px-5 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-accent">Performance</p>
          <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">Analytics</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">See how your short links are performing across devices and traffic sources.</p>
        </div>
        <button onClick={() => void refresh()} className="btn-quiet px-3 py-2 text-sm"><Activity className="h-4 w-4" /> Refresh</button>
      </div>

      {!data ? (
        <div className="mt-7 grid gap-4 sm:grid-cols-3"><div className="card h-28 animate-pulse" /><div className="card h-28 animate-pulse" /><div className="card h-28 animate-pulse" /></div>
      ) : (
        <>
          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            <div className="card p-5"><div className="flex items-center gap-2 text-sm text-muted"><MousePointerClick className="h-4 w-4" /> Total clicks</div><p className="mt-3 font-display text-3xl font-semibold tabular-nums">{data.totalClicks.toLocaleString()}</p></div>
            <div className="card p-5"><div className="flex items-center gap-2 text-sm text-muted"><Link2 className="h-4 w-4" /> Short links</div><p className="mt-3 font-display text-3xl font-semibold tabular-nums">{data.totalLinks.toLocaleString()}</p><p className="mt-1 text-xs text-muted">{data.activeLinks} active</p></div>
            <div className="card p-5"><div className="flex items-center gap-2 text-sm text-muted"><BarChart3 className="h-4 w-4" /> Events sampled</div><p className="mt-3 font-display text-3xl font-semibold tabular-nums">{data.sampledClicks.toLocaleString()}</p><p className="mt-1 text-xs text-muted">Recent event sample used for breakdowns</p></div>
          </div>

          <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
            <section className="card p-5">
              <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Top performing links</h2><span className="text-xs text-muted">By clicks</span></div>
              {data.topLinks.length === 0 ? <p className="mt-5 text-sm text-muted">Create a short link to start collecting data.</p> : (
                <div className="mt-5 space-y-4">
                  {data.topLinks.map(link => (
                    <div key={link.code}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <a href={api.shortLinkUrl(link.code)} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-2 font-mono hover:text-accent"><span className="truncate">/r/{link.code}</span><ExternalLink className="h-3 w-3 shrink-0" /></a>
                        <span className="shrink-0 font-mono text-xs text-muted">{link.clicks.toLocaleString()}</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-line/60"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(3, link.clicks / topClickCount * 100)}%` }} /></div>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
              <Breakdown title="Devices" items={data.devices} />
              <Breakdown title="Referrers" items={data.referrers} />
            </div>
          </div>

          <section className="card mt-6 overflow-hidden">
            <div className="border-b px-5 py-4"><h2 className="font-semibold">Recent clicks</h2><p className="mt-1 text-xs text-muted">Latest recorded short-link activity</p></div>
            {data.recentClicks.length === 0 ? <p className="px-5 py-8 text-sm text-muted">No clicks recorded yet.</p> : (
              <div className="divide-y">
                {data.recentClicks.map((event, index) => (
                  <div key={`${event.code}-${event.createdAt}-${index}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                    <div className="min-w-0"><p className="font-mono font-medium">/r/{event.code}</p><p className="truncate text-xs text-muted">{event.referrer}</p></div>
                    <div className="flex items-center gap-3 text-xs text-muted"><span className="rounded-full bg-raised px-2 py-1">{event.device}</span><time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString()}</time></div>
                  </div>
                ))}
              </div>
            )}
          </section>
          <p className="mt-3 text-xs text-muted">Click totals are lifetime totals. Device and referrer breakdowns use up to the latest 2,000 recorded events; unique-visitor estimates and date filters are not included yet.</p>
        </>
      )}
    </section>
  );
}
