'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, BarChart3, Eye, ImagePlus, LayoutGrid, Moon, MousePointerClick, Pencil, Plus, Sun, Mail, MessageCircle } from 'lucide-react';
import { api, type Profile, type ProfileDraft } from '@/lib/api';
import { Logo, Wordmark } from '@/components/logo';
import { Builder } from '@/components/builder';
import { ProfileStage, PublicProfile, ShareBar, prettyUrl } from '@/components/profile-view';
import { AuthGate, AuthProvider, DemoModeNotice, SignInPanel, UserMenu, useAuth, ResetPasswordPanel } from '@/components/auth';

type Route =
  | { view: 'home' }
  | { view: 'build'; username?: string }
  | { view: 'edit'; username: string }
  | { view: 'dashboard' }
  | { view: 'signin' }
  | { view: 'reset-password' }
  | { view: 'profile'; username: string };

function parseHash(hash: string): Route {
  const clean = hash.replace(/^#\/?/, '').replace(/\/$/, '');
  if (!clean) return { view: 'home' };
  const [head, tail] = clean.split('/');
  if (head === 'dashboard') return { view: 'dashboard' };
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
  const [route, setRoute] = useState<Route | null>(null);

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
            <button
              onClick={() => go('/dashboard')}
              className="btn-quiet whitespace-nowrap"
              aria-label="My pages"
              data-testid="link-dashboard"
            >
              <LayoutGrid className="h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">My pages</span>
            </button>
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
    { Icon: ImagePlus, title: 'Add your photo', body: 'Upload a picture and write a one-line bio. It is cropped and optimised for you.' },
    { Icon: Plus, title: 'Add your buttons', body: 'One button per destination — Instagram, WhatsApp, shop, booking form, anything.' },
    { Icon: MousePointerClick, title: 'Share one link', body: 'Put your Kiungo address in every bio and send traffic wherever you want.' },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:py-20">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border bg-raised px-3 py-1 text-xs font-medium text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Free while in beta
          </span>
          <h1 className="mt-5 font-display text-[clamp(2.25rem,6vw,3.75rem)] font-semibold">
            One link for everything you share.
          </h1>
          <p className="mt-5 max-w-[52ch] text-lg text-muted">
            Kiungo turns your photo and all your links into a single page with its own address — built to drop into
            every social bio you have.
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
          <p className="mt-3 text-sm text-muted">No account needed to try it. Your page is live the moment you publish.</p>
        </div>

        <div className="relative">
          <div
            className="pointer-events-none absolute -inset-8 -z-10 rounded-full opacity-40 blur-3xl"
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
          <h2 className="font-display text-xl font-semibold">Three steps, about two minutes</h2>
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
            <h2 className="font-display text-xl font-semibold">See what your audience actually taps</h2>
            <p className="mt-3 max-w-[54ch] text-muted">
              Every page counts its views, and every button counts its clicks. Reorder your buttons so the ones that
              earn go to the top.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                'Page views and per-button clicks, visible only to you',
                'Drag-free reordering — move any button up or down',
                'Four page styles, light and dark friendly',
                'Works on any phone, no app to install',
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
  const [pages, setPages] = useState<Profile[] | null>(null);

  useEffect(() => {
    api
      .mine()
      .then(setPages)
      .catch(() => setPages([]));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-xl font-semibold">My pages</h1>
        <button onClick={() => go('/build')} className="btn-primary ml-auto" data-testid="button-new-page">
          <Plus className="h-4 w-4" /> New page
        </button>
      </div>

      {pages === null ? (
        <div className="mt-8 space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-32 rounded-2xl skeleton" />
          ))}
        </div>
      ) : pages.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed px-6 py-16 text-center">
          <span className="inline-flex text-accent">
            <Logo className="h-9 w-9" />
          </span>
          <p className="mt-4 font-display text-lg font-semibold">You have no pages yet</p>
          <p className="mx-auto mt-2 max-w-[44ch] text-sm text-muted">
            Build your first page: add a photo, add your links, and get a shareable address.
          </p>
          <button onClick={() => go('/build')} className="btn-primary mt-6">
            Create my page
          </button>
        </div>
      ) : (
        <ul className="mt-8 space-y-5">
          {pages.map((p) => (
            <li key={p.id} className="card p-5" data-testid={`card-my-page-${p.username}`}>
              <div className="flex flex-wrap items-center gap-4">
                <span className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-line/50">
                  {p.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatar} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.displayName}</p>
                  <p className="truncate font-mono text-xs text-muted">{prettyUrl(p.username)}</p>
                </div>
                <div className="ml-auto flex items-center gap-4 text-sm text-muted">
                  <span className="inline-flex items-center gap-1.5 tabular-nums">
                    <Eye className="h-4 w-4" /> {p.views}
                  </span>
                  <span className="inline-flex items-center gap-1.5 tabular-nums">
                    <BarChart3 className="h-4 w-4" /> {p.totalClicks}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => go(`/${p.username}`)} className="btn-ghost px-3 py-2">
                    View
                  </button>
                  <button onClick={() => go(`/edit/${p.username}`)} className="btn-primary px-3 py-2">
                    <Pencil className="h-4 w-4" /> Edit
                  </button>
                </div>
              </div>
              <div className="mt-4 border-t pt-4">
                <ShareBar username={p.username} compact />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
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

  // Show polished loading screen until hash is read
  if (!route) {
    return <LoadingScreen />;
  }

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
      <Header go={go} />
      {route.view === 'home' ? <Home go={go} /> : null}
      {route.view === 'signin' ? <SignInPanel /> : null}
      {route.view === 'reset-password' ? <ResetPasswordPanel /> : null}
      {route.view === 'dashboard' ? (
        <AuthGate heading="Sign in to see your pages" blurb="Your pages, views and clicks are tied to your account.">
          <Dashboard go={go} />
        </AuthGate>
      ) : null}
      {route.view === 'build' ? (
        <AuthGate heading="Sign in to build your page" blurb="It takes a moment, and it keeps your page yours to edit.">
          <Builder initialUsername={route.username || ''} onBack={() => go('/')} onDone={(u) => go(`/${u}`)} />
        </AuthGate>
      ) : null}
      {route.view === 'edit' ? (
        <AuthGate heading="Sign in to edit this page" blurb="Only the account that created a page can change it.">
          <Builder editing={route.username} onBack={() => go('/dashboard')} onDone={(u) => go(`/${u}`)} />
        </AuthGate>
      ) : null}
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