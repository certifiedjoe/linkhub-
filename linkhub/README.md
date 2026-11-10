# Kiungo

A link-in-bio website. A user creates a profile, uploads a photo, adds as many link
buttons as they want, and gets their own shareable page for social bios.

_Kiungo_ is Swahili for "link".

---

## Stack

| Layer    | Choice                                                       |
| -------- | ------------------------------------------------------------ |
| Frontend | Next.js 15 (App Router), React 18, TypeScript                |
| Styling  | Tailwind CSS v3 + CSS custom properties for theming          |
| Icons    | `lucide-react` (UI) + `react-icons` (brand marks)            |
| Backend  | Express 5 on port 8000                                       |
| Database | SQLite via `better-sqlite3` (WAL mode), file `data.db`       |
| Auth     | Supabase Auth — email + password and Google                  |
| Fonts    | Clash Display + Satoshi, loaded from Fontshare               |

---

## Getting started

Requires Node 18+.

```bash
npm install
cp .env.example .env.local   # then fill it in — see "Supabase setup" below
```

Run the API and the Next.js dev server in **two terminals**:

```bash
# terminal 1 — API on http://localhost:8000
npm run api

# terminal 2 — site on http://localhost:3000
npm run dev
```

Optionally load the three example profiles:

```bash
node scripts/seed.js
```

Open http://localhost:3000

If you skip `.env.local`, the app still runs but **without authentication** — an amber
banner says so, and the API identifies you by a forgeable header. Fine for a first look,
never for anything public.

---

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. **Project Settings → API.** Copy the project URL and the anon (publishable) key into
   `.env.local` as `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and set
   `SUPABASE_URL` to the same URL.
3. **Authentication → Providers → Email.** On by default. Leave "Confirm email" on for
   production; turn it off while developing so sign-up is instant.
4. **Authentication → Providers → Google.** Enable it, then paste in a Client ID and
   Client Secret from a Google Cloud OAuth 2.0 credential. In Google Cloud, the
   authorised redirect URI is `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`.
5. **Authentication → URL Configuration.** Set Site URL to `http://localhost:3000`, and
   add `http://localhost:3000/**` plus your production origin to Redirect URLs. The `/**`
   matters: this app appends a `?next=` parameter so people land back where they started.
6. Restart both servers. `next build` inlines `NEXT_PUBLIC_*` values, so a rebuild is
   required after any change to them.

If your project still uses the older shared HS256 JWT secret instead of asymmetric signing
keys, also set `SUPABASE_JWT_SECRET`. Projects created recently use asymmetric keys and
need only `SUPABASE_URL`; the API verifies tokens against the project's public JWKS.

### How auth is enforced

The browser sends the Supabase access token as `Authorization: Bearer <jwt>`. The API
verifies the signature itself (`server/auth.js`, using `jose`) and takes the user id from
the token's `sub` claim. Nothing in the request body or headers can influence identity.

- `POST`/`PUT`/`DELETE /api/profiles*` and `GET /api/me` require a valid token → 401
- Editing or deleting a page you do not own → 403
- Reading a public profile, counting a view, counting a click → open to everyone

Run the checks:

```bash
npm run test:auth
```

That boots the API with a throwaway secret and a temporary database, mints tokens for two
fake users, and asserts 19 behaviours including expired tokens, tokens signed with the
wrong key, cross-user edit attempts, and forged `X-Visitor-Id` headers.

---

## Project layout

```
app/
  layout.tsx        Fonts, metadata, API-base + dark-mode bootstrap scripts
  page.tsx          Hash router, header, landing page, dashboard
  globals.css       Design tokens, component classes, the four profile themes
components/
  auth.tsx          AuthProvider, useAuth, SignInPanel, AuthGate, UserMenu
  builder.tsx       The profile editor (photo upload, links, theme, live preview)
  profile-view.tsx  Public profile page, ProfileStage, ShareBar, Avatar
  icons.tsx         Icon registry, URL -> icon guessing, theme definitions
  logo.tsx          Inline SVG logo + wordmark
lib/
  api.ts            Typed API client (attaches the bearer token) + image resizing
  supabase.ts       Browser Supabase client, session storage, OAuth redirect handling
server/
  api.js            Express + SQLite API
  auth.js           Supabase JWT verification (JWKS and legacy HS256)
scripts/
  seed.js           Seeds three example profiles (idempotent)
  test-auth.js      End-to-end auth and ownership checks
  prep-avatars.py   Crops/optimises source portraits into public/*.jpg
public/             Demo avatars
```

---

## API

Base URL `http://localhost:8000`.

| Method   | Path                            | Purpose                                |
| -------- | ------------------------------- | -------------------------------------- |
| `GET`    | `/api/health`                   | Liveness check                         |
| `GET`    | `/api/username-available?u=`    | Username availability + validity       |
| `GET`    | `/api/session`                  | Whether auth is on and who you are     |
| `GET`    | `/api/me`                       | Your own profiles (auth required)      |
| `GET`    | `/api/profiles`                 | Public showcase list                   |
| `GET`    | `/api/profiles/:username`       | One profile with its links             |
| `POST`   | `/api/profiles`                 | Create a profile                       |
| `PUT`    | `/api/profiles/:username`       | Update a profile                       |
| `DELETE` | `/api/profiles/:username`       | Delete a profile (owner only)          |
| `POST`   | `/api/profiles/:username/view`  | Increment the view counter             |
| `POST`   | `/api/links/:id/click`          | Increment a link's click counter        |

Tables: `profiles(id, username UNIQUE COLLATE NOCASE, display_name, tagline, avatar, theme, owner, views)`
and `links(id, profile_id, label, url, icon, position, clicks)`.

Outbound URLs are sanitised server-side (`http`/`https`/`mailto`/`tel` only). The JSON
body limit is 12 MB because avatars are stored as data URLs. One account may own at most
10 pages (`MAX_PAGES_PER_USER` in `server/api.js`).

The `owner` column holds a Supabase user id (UUID). Rows created before auth was added
hold the old visitor string and are now unowned — clear them, or reassign them with a
one-off `UPDATE profiles SET owner = '<your-uuid>' WHERE owner = 'local-visitor'`.

---

## One thing to know before you extend it

**Routing is hash-based, on purpose.**
Everything lives on a single page and routes are hash fragments — `#/`, `#/build`,
`#/edit/<username>`, `#/dashboard`, `#/<username>`. This was chosen so the static export
works when hosted behind a proxy or inside an iframe. If you deploy to Vercel or any host
that serves real paths, switch to proper App Router routes: add `app/[username]/page.tsx`,
`app/build/page.tsx`, and so on, and replace the `parseHash` / `useHashRoute` helpers at
the top of `app/page.tsx` with `next/navigation`. Clean `kiungo.link/username` URLs are
worth the change — they matter for a product whose whole value is a shareable link.

Worth doing before launch:

- **Move avatars out of the database.** They are base64 data URLs in a SQLite column
  today. Put them in S3, Cloudflare R2, or Supabase Storage and keep only the URL.
- **Add rate limiting** on the click/view endpoints — they are deliberately open, so the
  counters can be inflated by anyone with `curl`.
- **Set `CORS_ORIGIN`** to your real origin. It defaults to `*`.
- **Per-profile OpenGraph tags** so a shared link previews with the person's photo and
  name. Hash routing cannot do this — it needs the real-path routing described above, plus
  `generateMetadata`.
- **Swap SQLite for Postgres** (Neon or Supabase) if you host on a serverless platform;
  serverless filesystems are not persistent.

---

## Building

```bash
npm run build     # static export -> out/
```

Serve `out/` with any static host, and run `server/api.js` somewhere reachable. The
frontend finds the API through `window.__KIUNGO_API__`, set in `app/layout.tsx`; it falls
back to `http://localhost:8000`. Point that at your deployed API URL.

## Notes

- Supabase persists its session in `localStorage`. `lib/supabase.ts` probes for it and
  falls back to an in-memory store where it is blocked (sandboxed iframes, Safari private
  mode) rather than throwing. Nothing else in the app touches browser storage.
- Google sign-in uses the PKCE flow, which returns `?code=` in the query string. The
  implicit flow would return tokens in the URL fragment and collide with the hash router.
  Do not change `flowType`.
- `lucide-react` 1.x dropped brand icons. Brand marks come from `react-icons/si` and
  `react-icons/fa6`. Note `SiLinkedin` does not exist — use `FaLinkedin`.
- `tsconfig.json` needs `baseUrl: "."` **and** the webpack alias in `next.config.mjs`
  for `@/*` imports to resolve in both the type checker and the bundler.
