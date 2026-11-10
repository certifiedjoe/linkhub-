'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { LogOut, Mail, ShieldCheck } from 'lucide-react';
import { authEnabled, consumeNextRoute, getSupabase, redirectTarget } from '@/lib/supabase';
import { Logo } from '@/components/logo';

type AuthState = {
  /** null while loading, then the signed-in user or null. */
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** False when Supabase env vars are absent — the app then runs unauthenticated. */
  enabled: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  loading: false,
  enabled: false,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(authEnabled);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setLoading(false);
      return;
    }
    let alive = true;

    sb.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setLoading(false);
      consumeNextRoute();
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    const { data: sub } = sb.auth.onAuthStateChange((event, next) => {
      setSession(next);
      setLoading(false);

      // Detect password recovery
      if (event === 'PASSWORD_RECOVERY') {
        window.location.hash = '/reset-password';
      }
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await getSupabase()?.auth.signOut();
    setSession(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user: session?.user ?? null, session, loading, enabled: authEnabled, signOut }),
    [session, loading, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* ------------------------------------------------------------------ */

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.9-.1-1.5-.2-2.2H12v4.2h6.6c-.1 1.1-.9 2.8-2.5 3.9l-.1.1 3.6 2.8.3.1c2.3-2.1 3.6-5.2 3.6-8.9z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5l-.1.1-3.7 2.9.1.1C3.5 21.3 7.4 24 12 24z"
      />
      <path fill="#FBBC05" d="M5.3 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.6.4-2.4V9.5L1.5 6.6l-.1.1A11.9 11.9 0 0 0 0 12c0 1.9.5 3.8 1.4 5.4l3.9-3z" />
      <path
        fill="#EA4335"
        d="M12 4.7c2.2 0 3.7.9 4.5 1.7l3.3-3.2C17.8 1.2 15.2 0 12 0 7.4 0 3.5 2.7 1.4 6.6l3.9 3c1-2.9 3.6-4.9 6.7-4.9z"
      />
    </svg>
  );
}

type Mode = 'signin' | 'signup' | 'forgot';

/** Supabase surfaces network failures as a bare "Failed to fetch", which tells nobody anything. */
function readableError(err: unknown): string {
  const message = err instanceof Error ? err.message : '';
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return 'Could not reach the sign-in service. Check your connection, and that NEXT_PUBLIC_SUPABASE_URL is correct.';
  }
  return message || 'Something went wrong. Try again.';
}

/**
 * Sign-in card. Email + password and Google, matching what is enabled in the
 * Supabase dashboard. Shown by AuthGate; also reachable at #/signin.
 */
export function SignInPanel({ heading, blurb }: { heading?: string; blurb?: string }) {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'' | 'email' | 'google' | 'reset'>('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const { user } = useAuth();

  // Reset busy state when the component mounts (prevents stuck "Redirecting..." button)
  useEffect(() => {
    setBusy('');
  }, []);

  // If the user is already signed in, redirect them away from the sign-in page
  useEffect(() => {
    if (user) {
      window.location.hash = '/dashboard';
    }
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb) return;
    setError('');
    setNotice('');
    setBusy(mode === 'forgot' ? 'reset' : 'email');

    try {
      if (mode === 'forgot') {
        const { error: err } = await sb.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: redirectTarget(),
        });
        if (err) throw err;
        setNotice(`If an account exists for ${email.trim()}, we sent a reset link. Check your inbox.`);
        return;
      }

      if (mode === 'signup') {
        const { data, error: err } = await sb.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: redirectTarget() },
        });
        if (err) throw err;
        if (!data.session) {
          setNotice(`Check ${email.trim()} for a confirmation link, then sign in.`);
        } else {
          window.location.hash = '/dashboard';
        }
      } else {
        // signin
        const { error: err } = await sb.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (err) throw err;
        window.location.hash = '/dashboard';
      }
    } catch (err) {
      setError(readableError(err));
    } finally {
      setBusy('');
    }
  };

  const google = async () => {
    const sb = getSupabase();
    if (!sb) return;

    setError('');
    setBusy('google');

    try {
      const { error: err } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTarget(),
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (err) {
        throw err;
      }

      // Safety net: if redirect doesn't happen, unlock the button after a few seconds
      setTimeout(() => setBusy(''), 4000);
    } catch (err) {
      setError(readableError(err));
      setBusy('');
    }
  };

  return (
    <div className="mx-auto w-full max-w-md px-5 py-16">
      <div className="card p-7">
        <span className="inline-flex text-accent">
          <Logo className="h-8 w-8" />
        </span>
        <h1 className="mt-4 font-display text-xl font-semibold">
          {mode === 'signup'
            ? 'Create your account'
            : mode === 'forgot'
              ? 'Reset your password'
              : heading || 'Sign in to Kiungo'}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {mode === 'signup'
            ? 'One account holds every page you build.'
            : mode === 'forgot'
              ? 'Enter your email and we’ll send you a link to set a new password.'
              : blurb || 'Your pages stay yours — sign in to build, edit and see your stats.'}
        </p>

        {/* Hide Google button when in forgot mode */}
        {mode !== 'forgot' && (
          <>
            <button
              onClick={google}
              disabled={Boolean(busy)}
              className="btn-ghost mt-6 w-full justify-center"
              data-testid="button-google"
            >
              <GoogleMark />
              {busy === 'google' ? 'Redirecting…' : 'Continue with Google'}
            </button>

            <div className="my-5 flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-line" />
              or
              <span className="h-px flex-1 bg-line" />
            </div>
          </>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="auth-email" className="mb-1.5 block text-sm font-medium">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="field"
              data-testid="input-email"
            />
          </div>

          {/* Only show password field for signin / signup */}
          {mode !== 'forgot' && (
            <div>
              <label htmlFor="auth-password" className="mb-1.5 block text-sm font-medium">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                required
                minLength={8}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
                className="field"
                data-testid="input-password"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-accent" role="alert" data-testid="text-auth-error">
              {error}
            </p>
          )}
          {notice && (
            <p className="flex items-start gap-2 text-sm text-muted" data-testid="text-auth-notice">
              <Mail className="mt-0.5 h-4 w-4 shrink-0" />
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={Boolean(busy)}
            className="btn-primary w-full justify-center"
            data-testid="button-auth-submit"
          >
            {busy === 'email' || busy === 'reset'
              ? 'Working…'
              : mode === 'signup'
                ? 'Create account'
                : mode === 'forgot'
                  ? 'Send reset link'
                  : 'Sign in'}
          </button>
        </form>

        {/* Footer links */}
        <p className="mt-5 text-center text-sm text-muted">
          {mode === 'forgot' ? (
            <>
              Remembered your password?{' '}
              <button
                onClick={() => {
                  setMode('signin');
                  setError('');
                  setNotice('');
                }}
                className="font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-accent"
              >
                Back to sign in
              </button>
            </>
          ) : (
            <>
              {mode === 'signup' ? 'Already have an account?' : 'New here?'}{' '}
              <button
                onClick={() => {
                  setMode(mode === 'signup' ? 'signin' : 'signup');
                  setError('');
                  setNotice('');
                }}
                className="font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-accent"
                data-testid="button-toggle-mode"
              >
                {mode === 'signup' ? 'Sign in' : 'Create an account'}
              </button>
            </>
          )}
        </p>

        {/* Forgot password link – only show on sign-in mode */}
        {mode === 'signin' && (
          <p className="mt-3 text-center text-sm">
            <button
              type="button"
              onClick={() => {
                setMode('forgot');
                setError('');
                setNotice('');
                setPassword('');
              }}
              className="text-muted underline decoration-line underline-offset-4 hover:text-ink hover:decoration-accent"
              data-testid="button-forgot-password"
            >
              Forgot password?
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

/** Wraps any view that must not be seen by a stranger. */
export function AuthGate({
  children,
  heading,
  blurb,
}: {
  children: React.ReactNode;
  heading?: string;
  blurb?: string;
}) {
  const { user, loading, enabled } = useAuth();

  // Auth is turned off → just show the content (demo mode)
  if (!enabled) return <>{children}</>;

  // Still checking session
  if (loading) {
    return (
      <div className="mx-auto max-w-md px-5 py-16">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full skeleton" />
          <div className="h-4 w-48 rounded skeleton" />
          <div className="h-80 w-full rounded-2xl skeleton" />
        </div>
      </div>
    );
  }

  // Not logged in → show sign-in form
  if (!user) {
    return <SignInPanel heading={heading} blurb={blurb} />;
  }

  // Logged in → show the protected content
  return <>{children}</>;
}

/** Shown when the user lands from the password-reset email link */
export function ResetPasswordPanel() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-5 py-16">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full skeleton" />
          <div className="h-4 w-48 rounded skeleton" />
        </div>
      </div>
    );
  }

  // No session = invalid or expired link
  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md px-5 py-16 text-center">
        <p className="text-muted">This reset link is invalid or has expired.</p>
        <button
          onClick={() => (window.location.hash = '/signin')}
          className="btn-primary mt-6"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    const sb = getSupabase();
    if (!sb) return;

    setBusy(true);
    try {
      const { error: err } = await sb.auth.updateUser({ password });
      if (err) throw err;

      setSuccess(true);

      // Redirect to dashboard after success
      setTimeout(() => {
        window.location.hash = '/dashboard';
      }, 1800);
    } catch (err) {
      setError(readableError(err));
    } finally {
      setBusy(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto w-full max-w-md px-5 py-16">
        <div className="card p-7 text-center">
          <h1 className="font-display text-xl font-semibold">Password updated!</h1>
          <p className="mt-2 text-sm text-muted">
            Your password has been changed. Redirecting you…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-5 py-16">
      <div className="card p-7">
        <span className="inline-flex text-accent">
          <Logo className="h-8 w-8" />
        </span>
        <h1 className="mt-4 font-display text-xl font-semibold">Set a new password</h1>
        <p className="mt-2 text-sm text-muted">
          Choose a strong password for your account.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="field"
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium">
              Confirm password
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat the password"
              className="field"
            />
          </div>

          {error && (
            <p className="text-sm text-accent" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy} className="btn-primary w-full justify-center">
            {busy ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}

/** Header control: sign-in button when signed out, initial + sign-out when signed in. */
export function UserMenu({ onSignIn }: { onSignIn: () => void }) {
  const { user, loading, enabled, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  if (!enabled) return null;
  if (loading) return <span className="h-9 w-9 rounded-full skeleton" aria-hidden="true" />;

  if (!user) {
    return (
      <button onClick={onSignIn} className="btn-quiet whitespace-nowrap" data-testid="button-signin">
        Sign in
      </button>
    );
  }

  const email = user.email || 'Account';
  const avatar = (user.user_metadata?.avatar_url as string | undefined) || '';
  const initial = (user.user_metadata?.full_name as string | undefined)?.[0] || email[0] || '?';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border bg-raised text-sm font-medium uppercase transition hover:border-accent"
        data-testid="button-account"
      >
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          initial
        )}
      </button>

      {open ? (
        <>
          <button className="fixed inset-0 z-40 cursor-default" aria-hidden="true" tabIndex={-1} onClick={() => setOpen(false)} />
          <div role="menu" className="absolute right-0 z-50 mt-2 w-64 rounded-xl border bg-raised p-2 shadow-lift">
            <div className="px-3 py-2">
              <p className="truncate text-sm font-medium" data-testid="text-account-email">
                {email}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                <ShieldCheck className="h-3.5 w-3.5" /> Signed in
              </p>
            </div>
            <button
              onClick={() => {
                setOpen(false);
                void signOut();
              }}
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-surface"
              data-testid="button-signout"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

/** Small banner shown when the app is running without Supabase configured. */
export function DemoModeNotice() {
  const { enabled } = useAuth();
  if (enabled) return null;
  return (
    <div className="border-b border-accent/30 bg-accent/10 px-5 py-2 text-center text-xs text-ink" data-testid="banner-demo-mode">
      Running without authentication — add your Supabase keys to <code className="font-mono">.env.local</code> to enable accounts.
    </div>
  );
}