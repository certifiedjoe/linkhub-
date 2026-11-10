const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeShortLinkInput, selectWebDestination } = require('../utils/shortLinks');

test('short links require an HTTP or HTTPS main destination', () => {
  const input = sanitizeShortLinkInput({ destinationUrl: 'https://example.com/shop', title: 'Shop' });
  assert.equal(input.destination_url, 'https://example.com/shop');
  assert.throws(() => sanitizeShortLinkInput({ destinationUrl: 'javascript:alert(1)' }), { status: 400 });
  assert.throws(() => sanitizeShortLinkInput({ destinationUrl: 'mailto:hello@example.com' }), { status: 400 });
});

test('short codes are normalized and validated', () => {
  assert.equal(sanitizeShortLinkInput({ destinationUrl: 'https://example.com', code: 'My-Link' }).code, 'my-link');
  for (const code of ['ab', 'bad code', 'admin', 'api', 'x'.repeat(33)]) {
    assert.throws(() => sanitizeShortLinkInput({ destinationUrl: 'https://example.com', code }), { status: 400 });
  }
});

test('mobile, desktop and fallback destinations accept only HTTP or HTTPS', () => {
  const input = sanitizeShortLinkInput({
    destinationUrl: 'https://www.example.com',
    mobileUrl: 'https://m.example.com/page',
    desktopUrl: 'https://www.example.com/page',
    fallbackUrl: 'https://fallback.example.com',
  });
  assert.equal(input.mobile_url, 'https://m.example.com/page');
  assert.equal(input.desktop_url, 'https://www.example.com/page');
  assert.equal(input.fallback_url, 'https://fallback.example.com');
  assert.throws(() => sanitizeShortLinkInput({ destinationUrl: 'https://www.example.com', mobileUrl: 'javascript:alert(1)' }), { status: 400 });
});

test('short codes and partial updates only change explicitly supplied fields', () => {
  assert.deepEqual(sanitizeShortLinkInput({ status: 'paused' }, { partial: true }), { status: 'paused' });
  assert.deepEqual(sanitizeShortLinkInput({ mobileUrl: '' }, { partial: true }), { mobile_url: null });
});

test('expiry values must be valid timestamps', () => {
  assert.throws(() => sanitizeShortLinkInput({ destinationUrl: 'https://example.com', expiresAt: 'not-a-date' }), { status: 400 });
});

test('smart routing selects mobile website destinations', () => {
  const link = { destination_url: 'https://www.example.com', mobile_url: 'https://m.example.com', desktop_url: 'https://desktop.example.com', fallback_url: 'https://fallback.example.com' };
  assert.deepEqual(
    selectWebDestination(link, 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile Safari/604.1'),
    { destination: 'https://m.example.com', device: 'mobile' }
  );
  assert.deepEqual(
    selectWebDestination(link, 'Mozilla/5.0 (Linux; Android 14; Mobile) Chrome/120.0'),
    { destination: 'https://m.example.com', device: 'mobile' }
  );
});

test('smart routing selects desktop website destinations', () => {
  const link = { destination_url: 'https://www.example.com', mobile_url: 'https://m.example.com', desktop_url: 'https://desktop.example.com', fallback_url: 'https://fallback.example.com' };
  assert.deepEqual(
    selectWebDestination(link, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36'),
    { destination: 'https://desktop.example.com', device: 'desktop' }
  );
});

test('unknown user agents use the configured fallback', () => {
  const link = { destination_url: 'https://www.example.com', mobile_url: 'https://m.example.com', desktop_url: 'https://desktop.example.com', fallback_url: 'https://fallback.example.com' };
  assert.deepEqual(selectWebDestination(link, ''), { destination: 'https://fallback.example.com', device: 'unknown' });
  assert.deepEqual(selectWebDestination(link, 'curl/8.0'), { destination: 'https://fallback.example.com', device: 'unknown' });
});

test('missing device-specific URLs fall back to the main destination', () => {
  const link = { destination_url: 'https://www.example.com', mobile_url: null, desktop_url: null, fallback_url: null };
  assert.deepEqual(
    selectWebDestination(link, 'Mozilla/5.0 (Linux; Android 14; Mobile) Chrome/120.0'),
    { destination: 'https://www.example.com', device: 'mobile' }
  );
  assert.deepEqual(
    selectWebDestination(link, 'Mozilla/5.0 (X11; Linux x86_64) Firefox/120.0'),
    { destination: 'https://www.example.com', device: 'desktop' }
  );
});
