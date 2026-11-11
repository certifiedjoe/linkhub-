'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, BarChart3, Eye, ImagePlus, LayoutGrid, Moon, MousePointerClick, Pencil, Plus, Sun, Mail, MessageCircle, Link2, QrCode } from 'lucide-react';
import { api, type Profile, type ProfileDraft } from '@/lib/api';
import { Logo, Wordmark } from '@/components/logo';
import { Builder } from '@/components/builder';
import { ShortLinksDashboard } from '@/components/short-links-dashboard';
import { AnalyticsDashboard } from '@/components/analytics-dashboard';
import { QrCodesDashboard } from '@/components/qr-codes-dashboard';
import { ProfileStage, PublicProfile, ShareBar, prettyUrl } from '@/components/profile-view';
import { AuthGate, AuthProvider, DemoModeNotice, SignInPanel, UserMenu, useAuth, ResetPasswordPanel } from '@/components/auth';

type Route =
  | { view: 'home' }
  | { view: 'build'; username?: string }
  | { view: 'edit'; username: string }
  | { view: 'dashboard' }
  | { view: 'links' }
  | { view: 'analytics' }
  | { view: 'qr-codes' }
  | { view: 'signin' }
  | { view: 'reset-password' }
  | { view: 'profile'; username: string };

function parseHash(hash: string): Route {
  const clean = hash.replace(/^#\/?/, '').replace(/\/$/, '');
  if (!clean) return { view: 'home' };
  const [head, tail] = clean.split('/');
  if (head === 'dashboard') return { view: 'dashboard' };
  if (head === 'links') return { view: 'links' };
  if (head === 'analytics') return { view: 'analytics' };
  if (head === 'qr-codes') return { view: 'qr-codes' };
  if (head === 'build') return { view: 'build', username: tail };
  if (head === 'edit' && tail) return { view: 'edit', username: tail };
  if (head === 'signin' || head === 'login') return { view: 'signin' };
  if (head === 'reset-password') return { view: 'reset-password' };
  return { view: 'profile', username: head };
}

const DEMO: ProfileDraft = {
  username: 'Emmery.studio',
  displayName: 'Emmery lucas',
  tagline: 'Portrait photographer in Dar es Salaam. Bookings open for August.',
  avatar: './demo-avatar.jpg',
  theme: 'ember',
  links: [
    { label: 'Follow on Instagram', url: 'https://instagram.com', icon: 'instagram' },
    { label: 'Book a session', url: 'https://example.com', icon: 'booking' },
    { label: 'Chat on WhatsApp', url: 'https://wa.me', icon: 'whatsapp' },
    { label: 'Print shop', url: 'https://example.com', icon: 'shop' },
  ],
};

function useHashRoute() {
  // Render the public homepage immediately on the server. The hash route is
  // applied after hydration, avoiding a full-screen loading gate on first visit.
  const [route, setRoute] = useState<Route>({ view: 'home' });

  useEffect(() => {
    const read = () => setRoute(parseHash(window.location.hash));
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);

  const go = useCallback((to: string) => {
    window.location.hash = to;
    window.scrollTo({ top: 0 });
  }, []);

  return { route, go };
}

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains('dark')), []);
  return (
    <button
      onClick={() => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle('dark', next);
      }}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="btn-quiet"
      data-testid="button-theme-toggle"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

function Header({ go }: { go: (to: string) => void }) {
  const { user, enabled } = useAuth();
  const showMine = !enabled || Boolean(user);
  return (
    <header className="sticky top-0 z-30 border-b bg-surface/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3">
        <a href="#/" aria-label="Kiungo home">
          <Wordmark />
        </a>
        <nav className="ml-auto flex items-center gap-1">
          {showMine ? (
            <>
              <button onClick={() => go('/dashboard')} className="btn-quiet whitespace-nowrap" aria-label="My pages" data-testid="link-dashboard">
                <LayoutGrid className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:inline">My pages</span>
              </button>
              <button onClick={() => go('/links')} className="btn-quiet whitespace-nowrap" aria-label="Short links" data-testid="link-short-links">
                <Link2 className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:inline">Short links</span>
              </button>
              <button onClick={() => go('/qr-codes')} className="btn-quiet whitespace-nowrap" aria-label="QR codes" data-testid="link-qr-codes">
                <QrCode className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:inline">QR codes</span>
              </button>
              <button onClick={() => go('/analytics')} className="btn-quiet whitespace-nowrap" aria-label="Analytics" data-testid="link-analytics">
                <BarChart3 className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:inline">Analytics</span>
              </button>
            </>
          ) : null}
          <ThemeToggle />
          <UserMenu onSignIn={() => go('/signin')} />
          <button onClick={() => go('/build')} className="btn-primary ml-1 whitespace-nowrap" data-testid="button-create-header">
            <span className="sm:hidden">Create</span>
            <span className="hidden sm:inline">Create page</span>
          </button>
        </nav>
      </div>
    </header>
  );
}

function WorkspaceFrame({ go, active, children }: { go: (to: string) => void; active: string; children: React.ReactNode }) {
 const { user } = useAuth();
 const items = [{id:'dashboard',label:'Overview',Icon:LayoutGrid,path:'/dashboard'},{id:'links',label:'Short links',Icon:Link2,path:'/links'},{id:'qr-codes',label:'QR codes',Icon:QrCode,path:'/qr-codes'},{id:'analytics',label:'Analytics',Icon:BarChart3,path:'/analytics'}];
 return <div className="workspace-frame min-h-[calc(100dvh-64px)]"><aside className="workspace-sidebar"><a href="#/" className="workspace-brand"><Wordmark /></a><p className="workspace-label">WORKSPACE</p><nav className="workspace-nav" aria-label="Workspace navigation">{items.map(({id,label,Icon,path})=><button key={id} onClick={()=>go(path)} className={active===id?'workspace-nav-item is-active':'workspace-nav-item'} aria-current={active===id?'page':undefined}><Icon className="h-[18px] w-[18px]" /><span>{label}</span></button>)}</nav><div className="workspace-sidebar-bottom"><button onClick={()=>go('/build')} className="btn-primary w-full"><Plus className="h-4 w-4" /> Create a page</button><div className="workspace-user"><span className="workspace-avatar">{(user?.email?.[0]||'K').toUpperCase()}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold">{user?.email?.split('@')[0]||'Your account'}</span><span className="block truncate text-xs text-muted">{user?.email||'Kiungo workspace'}</span></span></div></div></aside><div className="workspace-main min-w-0"><header className="workspace-topbar"><p className="text-xs text-muted">Kiungo workspace <span className="mx-2 text-line">/</span><span className="font-medium text-ink">{items.find(item=>item.id===active)?.label||'Page builder'}</span></p><div className="flex items-center gap-2"><ThemeToggle /><UserMenu onSignIn={()=>go('/signin')} /></div></header><div className="workspace-content">{children}</div></div></div>;
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[300px]">
      <div className="overflow-hidden rounded-[34px] border-[6px] border-ink/85 bg-ink shadow-lift">
        <div className="h-[560px] overflow-hidden bg-raised">{children}</div>
      </div>
    </div>
  );
}

function Home({ go }: { go: (to: string) => void }) {
  const [claim, setClaim] = useState('');
  const [showcase, setShowcase] = useState<Profile[] | null>(null);

  useEffect(() => {
    api
      .showcase()
      .then(setShowcase)
      .catch(() => setShowcase([]));
  }, []);

  const steps = [
    { Icon: Link2, title: 'Shorten any URL', body: 'Turn long destinations into clean, shareable links with a custom ending.' },
    { Icon: MousePointerClick, title: 'Route every visitor', body: 'Send iOS and Android visitors to the right app destination, with a web fallback.' },
    { Icon: BarChart3, title: 'Measure performance', body: 'Track clicks and see which links bring people to your content.' },
  ];

  return (
    <div className="home-page">
      {/* Hero */}
      <section className="home-hero mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:py-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border bg-raised px-3 py-1 text-xs font-medium text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Free while in beta
          </span>
          <p className="home-kicker">SHORT LINKS, SMART ROUTING, ONE WORKSPACE</p>
          <h1 className="home-title mt-5 font-display text-[clamp(2.7rem,6.5vw,5.2rem)] font-semibold">
            Shorten. Route.<br /><span>Grow smarter.</span>
          </h1>
          <p className="mt-5 max-w-[48ch] text-lg leading-relaxed text-muted">
            Create memorable short links, route people to the right app or web destination, and understand what gets clicked. Keep your bio page and all your links in one simple workspace.
          </p>

          <form
            className="mt-8 flex max-w-md items-stretch gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              go(`/build/${claim.trim()}`);
            }}
          >
            <div className="flex flex-1 items-stretch overflow-hidden rounded-xl border bg-raised focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15">
              <span className="flex items-center bg-line/30 px-3 font-mono text-[13px] text-muted">kiungo.link/</span>
              <input
                value={claim}
                onChange={(e) => setClaim(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                placeholder="yourname"
                aria-label="Choose your link name"
                className="w-full bg-transparent px-3 py-3 text-[15px] outline-none"
                data-testid="input-claim"
              />
            </div>
            <button type="submit" className="btn-primary shrink-0" data-testid="button-claim">
              Claim it <ArrowRight className="h-4 w-4" />
            </button>
          </form>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-muted">
            <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> Free to get started</span>
            <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> No code required</span>
            <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> Made for mobile</span>
          </div>
        </div>

        <div className="home-preview relative">
          <div
            className="pointer-events-none absolute -inset-8 -z-10 rounded-full opacity-50 blur-3xl"
            style={{ background: 'radial-gradient(circle at 60% 30%, hsl(var(--accent) / 0.5), transparent 65%)' }}
            aria-hidden
          />
          <PhoneFrame>
            <ProfileStage profile={DEMO} scale headingLevel="p" />
          </PhoneFrame>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y bg-raised/50">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="font-display text-xl font-semibold">One workspace. Three simple steps.</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {steps.map(({ Icon, title, body }, i) => (
              <div key={title} className="card p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/12 text-accent">
                    <Icon className="h-5 w-5" strokeWidth={1.9} />
                  </span>
                  <span className="font-mono text-xs text-muted">0{i + 1}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Traffic */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="font-display text-xl font-semibold">Understand what happens after every tap</h2>
            <p className="mt-3 max-w-[54ch] text-muted">
              Kiungo brings your short-link activity and bio-page engagement together, so you can understand what people open and where they go.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                'Short-link clicks and bio-page button activity',
                'Smart destinations for iOS and Android visitors',
                'QR codes and scan analytics as the next build phase',
                'Clear performance data in one workspace',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-6">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">Page views</p>
                <p className="mt-1 font-display text-xl font-semibold tabular-nums">1,284</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">Button clicks</p>
                <p className="mt-1 font-display text-xl font-semibold tabular-nums">742</p>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {[
                { label: 'Follow on Instagram', pct: 100, n: 318 },
                { label: 'Chat on WhatsApp', pct: 72, n: 229 },
                { label: 'Book a session', pct: 41, n: 131 },
                { label: 'Print shop', pct: 20, n: 64 },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span>{row.label}</span>
                    <span className="tabular-nums text-muted">{row.n}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line/60">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${row.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Showcase */}
      <section className="border-t bg-raised/50">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="font-display text-xl font-semibold">Pages built with Kiungo</h2>
          {showcase === null ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-28 rounded-2xl skeleton" />
              ))}
            </div>
          ) : showcase.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed px-6 py-12 text-center">
              <p className="text-sm font-medium">No pages yet — be the first</p>
              <button onClick={() => go('/build')} className="btn-primary mt-4">
                Create your page
              </button>
            </div>
          ) : (
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {showcase.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => go(`/${p.username}`)}
                    className="card flex w-full items-center gap-3 p-4 text-left transition-transform hover:-translate-y-0.5"
                    data-testid={`card-profile-${p.username}`}
                  >
                    <span className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-line/50">
                      {p.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.avatar} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{p.displayName}</span>
                      <span className="block truncate font-mono text-xs text-muted">/{p.username}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-gradient-to-b from-black/40 to-black/70">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center gap-2 md:justify-start">
                <Logo className="h-6 w-6 text-accent" />
                <span className="font-display text-lg font-semibold">Kiungo</span>
              </div>
              <p className="mt-2 max-w-xs text-sm text-muted">
                One link for everything you share. Built with love in Dar es Salaam.
                created by pablo himself joe sylvester
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href="https://wa.me/255XXXXXXXXX"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted transition hover:border-accent/50 hover:bg-accent/10 hover:text-white"
                title="WhatsApp"
              >
                <MessageCircle className="h-4.5 w-4.5" />
              </a>

              <a
                href="https://instagram.com/yourusername"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted transition hover:border-accent/50 hover:bg-accent/10 hover:text-white"
                title="Instagram"
              >
                <span className="text-sm">📸</span>
              </a>

              <a
                href="https://x.com/yourusername"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted transition hover:border-accent/50 hover:bg-accent/10 hover:text-white"
                title="X"
              >
                <span className="text-sm font-bold">𝕏</span>
              </a>

              <a
                href="mailto:hello@kiungo.link"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted transition hover:border-accent/50 hover:bg-accent/10 hover:text-white"
                title="Email"
              >
                <Mail className="h-4.5 w-4.5" />
              </a>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-muted sm:flex-row">
            <p>© {new Date().getFullYear()} Kiungo. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#/" className="transition hover:text-white">Privacy</a>
              <a href="#/" className="transition hover:text-white">Terms</a>
              <a href="#/" className="transition hover:text-white">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Dashboard({ go }: { go: (to: string) => void }) {
 const [pages,setPages]=useState<Profile[]|null>(null);
 useEffect(()=>{api.mine().then(setPages).catch(()=>setPages([]));},[]);
 const views=pages?.reduce((n,p)=>n+p.views,0)||0, clicks=pages?.reduce((n,p)=>n+p.totalClicks,0)||0;
 return <div className="dashboard-shell mx-auto max-w-[1440px] px-4 py-7 sm:px-7 sm:py-9">
 <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-accent">YOUR WORKSPACE</p><h1 className="mt-2 font-display text-3xl font-semibold sm:text-[2.15rem]">Good to see you.</h1><p className="mt-2 text-sm text-muted">Here’s what’s happening across your Kiungo links and pages.</p></div><button onClick={()=>go('/build')} className="btn-primary"><Plus className="h-4 w-4"/> Create new page</button></div>
 <div className="mt-7 grid gap-4 sm:grid-cols-3"><div className="workspace-stat"><span className="workspace-stat-icon"><LayoutGrid className="h-5 w-5"/></span><span className="text-sm text-muted">Your pages</span><strong>{pages?.length??'—'}</strong><span className="text-xs text-muted">Published profiles</span></div><div className="workspace-stat"><span className="workspace-stat-icon"><Eye className="h-5 w-5"/></span><span className="text-sm text-muted">Page views</span><strong>{pages===null?'—':views.toLocaleString()}</strong><span className="text-xs text-muted">Across your pages</span></div><div className="workspace-stat"><span className="workspace-stat-icon"><MousePointerClick className="h-5 w-5"/></span><span className="text-sm text-muted">Link clicks</span><strong>{pages===null?'—':clicks.toLocaleString()}</strong><span className="text-xs text-muted">Total recorded clicks</span></div></div>
 <div className="mt-8 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]"><section className="min-w-0"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-display text-xl font-semibold">Your pages</h2><p className="mt-1 text-sm text-muted">Manage and share your published pages.</p></div><button onClick={()=>go('/analytics')} className="btn-quiet text-xs">View analytics <ArrowRight className="h-3.5 w-3.5"/></button></div>
 {pages===null?<div className="grid gap-4 md:grid-cols-2"><div className="h-48 rounded-2xl skeleton"/><div className="h-48 rounded-2xl skeleton"/></div>:pages.length===0?<div className="card border-dashed px-6 py-14 text-center"><Logo className="mx-auto h-9 w-9 text-accent"/><p className="mt-4 font-display text-lg font-semibold">Your workspace is ready</p><p className="mx-auto mt-2 max-w-[44ch] text-sm text-muted">Create your first bio page, add your important links, and share one simple address.</p><button onClick={()=>go('/build')} className="btn-primary mt-6"><Plus className="h-4 w-4"/> Create your first page</button></div>:<ul className="grid gap-4 md:grid-cols-2">{pages.map(p=><li key={p.id} className="workspace-page-card card p-4" data-testid={'card-my-page-'+p.username}><div className="flex items-center gap-3"><span className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-line/50">{p.avatar?<img src={p.avatar} alt="" className="h-full w-full object-cover"/>:<span className="flex h-full w-full items-center justify-center font-semibold text-muted">{p.displayName.slice(0,1).toUpperCase()}</span>}</span><div className="min-w-0 flex-1"><p className="truncate font-semibold">{p.displayName}</p><p className="truncate font-mono text-xs text-muted">{prettyUrl(p.username)}</p></div><span className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent">Published</span></div><div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-surface/75 p-3"><div><p className="text-xs text-muted">Views</p><p className="mt-1 text-lg font-semibold tabular-nums">{p.views.toLocaleString()}</p></div><div><p className="text-xs text-muted">Button clicks</p><p className="mt-1 text-lg font-semibold tabular-nums">{p.totalClicks.toLocaleString()}</p></div></div><div className="mt-4 flex items-center gap-2"><button onClick={()=>go('/'+p.username)} className="btn-ghost flex-1 px-3 py-2 text-xs"><Eye className="h-3.5 w-3.5"/> Preview</button><button onClick={()=>go('/edit/'+p.username)} className="btn-primary flex-1 px-3 py-2 text-xs"><Pencil className="h-3.5 w-3.5"/> Edit page</button></div><div className="mt-3 border-t pt-3"><ShareBar username={p.username} compact/></div></li>)}</ul>}</section>
 <aside className="workspace-right-rail space-y-5"><section className="card p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">Quick actions</h2><span className="text-xs text-muted">TOOLS</span></div><div className="mt-4 space-y-2"><button onClick={()=>go('/links')} className="workspace-quick-action"><Link2 className="h-4 w-4 text-accent"/><span><strong>Create a short link</strong><small>Make long URLs easy to share</small></span><ArrowRight className="ml-auto h-4 w-4 text-muted"/></button><button onClick={()=>go('/qr-codes')} className="workspace-quick-action"><QrCode className="h-4 w-4 text-accent"/><span><strong>Generate a QR code</strong><small>Share links in print or online</small></span><ArrowRight className="ml-auto h-4 w-4 text-muted"/></button><button onClick={()=>go('/analytics')} className="workspace-quick-action"><BarChart3 className="h-4 w-4 text-accent"/><span><strong>Explore analytics</strong><small>Understand clicks and traffic</small></span><ArrowRight className="ml-auto h-4 w-4 text-muted"/></button></div></section><section className="card p-5"><span className="workspace-stat-icon"><Link2 className="h-5 w-5"/></span><h2 className="mt-3 font-semibold">One link. More possibilities.</h2><p className="mt-2 text-sm leading-relaxed text-muted">Bring your bio page, smart short links, QR codes and performance insights together in one calm workspace.</p></section></aside></div></div>;
}
function LoadingScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-surface">
      <div className="relative">
        {/* Outer ring */}
        <div className="h-14 w-14 rounded-full border-[3px] border-line/40" />
        {/* Spinning accent ring */}
        <div className="absolute inset-0 h-14 w-14 animate-spin rounded-full border-[3px] border-transparent border-t-accent border-r-accent/40" />
        {/* Center logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Logo className="h-6 w-6 text-accent" />
        </div>
      </div>
      <p className="text-sm font-medium text-muted animate-pulse">Loading…</p>
    </div>
  );
}

function Shell() {
  const { route, go } = useHashRoute();

  // Public profiles are readable by anyone
  if (route.view === 'profile') {
    return (
      <main className="min-h-dvh">
        <PublicProfile username={route.username} onEdit={(u) => go(`/edit/${u}`)} />
      </main>
    );
  }

  return (
    <main className="min-h-dvh">
      <DemoModeNotice />
      {['dashboard','links','analytics','qr-codes','build','edit'].includes(route.view) ? (
        <WorkspaceFrame go={go} active={route.view==='build'||route.view==='edit'?'dashboard':route.view}>
          {route.view==='qr-codes'?<AuthGate heading="Sign in to create QR codes" blurb="Generate QR codes for your short links and download them for print or digital sharing."><QrCodesDashboard/></AuthGate>:null}
          {route.view==='analytics'?<AuthGate heading="Sign in to view analytics" blurb="See link clicks, top destinations, devices and referrers."><AnalyticsDashboard/></AuthGate>:null}
          {route.view==='links'?<AuthGate heading="Sign in to manage your links" blurb="Create short links, set destinations and track clicks."><ShortLinksDashboard/></AuthGate>:null}
          {route.view==='dashboard'?<AuthGate heading="Sign in to see your pages" blurb="Your pages, views and clicks are tied to your account."><Dashboard go={go}/></AuthGate>:null}
          {route.view==='build'?<AuthGate heading="Sign in to build your page" blurb="It takes a moment, and it keeps your page yours to edit."><Builder initialUsername={route.username||''} onBack={()=>go('/')} onDone={u=>go('/'+u)}/></AuthGate>:null}
          {route.view==='edit'?<AuthGate heading="Sign in to edit this page" blurb="Only the account that created a page can change it."><Builder editing={route.username} onBack={()=>go('/dashboard')} onDone={u=>go('/'+u)}/></AuthGate>:null}
        </WorkspaceFrame>
      ) : <><Header go={go}/>{route.view==='home'?<Home go={go}/>:null}{route.view==='signin'?<SignInPanel/>:null}{route.view==='reset-password'?<ResetPasswordPanel/>:null}</> }
    </main>
  );
}

export default function Page() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}