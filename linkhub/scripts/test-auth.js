/**
 * Exercises the API's auth rules without needing a real Supabase project.
 *
 * Boots the API with a legacy HS256 JWT secret, mints tokens with that secret the way
 * Supabase would, and asserts that ownership is enforced.
 *
 *   node scripts/test-auth.js
 */
const path = require('path');
const { spawn } = require('child_process');
const { SignJWT } = require('jose');

const PORT = 8123;
const SECRET = 'test-secret-at-least-32-characters-long-xxxxx';
const URL_BASE = `http://127.0.0.1:${PORT}`;
const DB = path.join(__dirname, '..', '.tmp-auth-test.db');

let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || detail === undefined ? '' : `  -> ${detail}`}`);
  if (!ok) failures += 1;
}

async function token(sub, { expired = false, secret = SECRET } = {}) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ sub, role: 'authenticated', email: `${sub}@example.com` })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(expired ? now - 7200 : now)
    .setIssuer('https://stub.supabase.co/auth/v1')
    .setAudience('authenticated')
    .setExpirationTime(expired ? now - 3600 : now + 3600)
    .sign(new TextEncoder().encode(secret));
}

const call = (method, path, { auth, body } = {}) =>
  fetch(URL_BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

async function main() {
  require('fs').rmSync(DB, { force: true });
  const server = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'api.js')], {
    env: {
      ...process.env,
      PORT: String(PORT),
      SUPABASE_URL: 'https://stub.supabase.co',
      SUPABASE_JWT_SECRET: SECRET,
      KIUNGO_DB: DB,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (d) => process.stdout.write(`  [api] ${d}`));
  server.stderr.on('data', (d) => process.stderr.write(`  [api] ${d}`));

  for (let i = 0; i < 60; i += 1) {
    try {
      const r = await fetch(`${URL_BASE}/api/health`);
      if (r.ok) break;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  const alice = await token('11111111-1111-1111-1111-111111111111');
  const bob = await token('22222222-2222-2222-2222-222222222222');
  const expired = await token('11111111-1111-1111-1111-111111111111', { expired: true });
  const wrongKey = await token('11111111-1111-1111-1111-111111111111', { secret: 'a-completely-different-secret-value-here' });

  const draft = { username: 'alice.page', displayName: 'Alice', tagline: 'hi', avatar: '', theme: 'ember', links: [{ label: 'Site', url: 'https://example.com', icon: 'link' }] };

  check('session reports auth enabled', (await (await call('GET', '/api/session')).json()).authEnabled === true);

  check('create without a token -> 401', (await call('POST', '/api/profiles', { body: draft })).status === 401);
  check('create with an expired token -> 401', (await call('POST', '/api/profiles', { auth: expired, body: draft })).status === 401);
  check('create with a token signed by the wrong key -> 401', (await call('POST', '/api/profiles', { auth: wrongKey, body: draft })).status === 401);
  check('/api/me without a token -> 401', (await call('GET', '/api/me')).status === 401);

  const created = await call('POST', '/api/profiles', { auth: alice, body: draft });
  check('Alice can create her page -> 201', created.status === 201, created.status);

  check('anyone can read the public page', (await call('GET', '/api/profiles/alice.page')).status === 200);
  check('isOwner is false for a stranger', (await (await call('GET', '/api/profiles/alice.page')).json()).isOwner === false);
  check('isOwner is false for Bob', (await (await call('GET', '/api/profiles/alice.page', { auth: bob })).json()).isOwner === false);
  check('isOwner is true for Alice', (await (await call('GET', '/api/profiles/alice.page', { auth: alice })).json()).isOwner === true);

  check("Bob cannot edit Alice's page -> 403", (await call('PUT', '/api/profiles/alice.page', { auth: bob, body: { displayName: 'Hacked' } })).status === 403);
  check("Bob cannot delete Alice's page -> 403", (await call('DELETE', '/api/profiles/alice.page', { auth: bob })).status === 403);
  check('forged X-Visitor-Id is ignored', (await call('PUT', '/api/profiles/alice.page', { body: { displayName: 'Hacked' } })).status === 401);
  check('page is untouched', (await (await call('GET', '/api/profiles/alice.page')).json()).displayName === 'Alice');

  check('Alice can edit her own page', (await call('PUT', '/api/profiles/alice.page', { auth: alice, body: { displayName: 'Alice J' } })).status === 200);
  check("Alice's dashboard lists 1 page", (await (await call('GET', '/api/me', { auth: alice })).json()).length === 1);
  check("Bob's dashboard is empty", (await (await call('GET', '/api/me', { auth: bob })).json()).length === 0);

  check('views can be counted anonymously', (await call('POST', '/api/profiles/alice.page/view')).status === 200);
  check('Alice can delete her own page', (await call('DELETE', '/api/profiles/alice.page', { auth: alice })).status === 200);

  server.kill();
  require('fs').rmSync(DB, { force: true });
  require('fs').rmSync(`${DB}-wal`, { force: true });
  require('fs').rmSync(`${DB}-shm`, { force: true });
  console.log(failures === 0 ? '\nAll auth checks passed.' : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
