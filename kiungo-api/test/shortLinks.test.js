const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeShortLinkInput, selectWebDestination } = require('../utils/shortLinks');

test('short links require an HTTP or HTTPS destination', () => {
  const input = sanitizeShortLinkInput({
    destinationUrl: 'https://example.com/shop',
    title: 'Shop',
  });
  assert.equal(input.destination_url, 'https://example.com/shop');
  assert.throws(
    () => sanitizeShortLinkInput({ destinationUrl: 'javascript:alert(1)' }),
    { status: 400 }
  );
  assert.throws(
    () => sanitizeShortLinkInput({ destinationUrl: 'mailto:hello@example.com' }),
    { status: 400 }
  );
});

test('short codes are normalized and validated', () => {
  assert.equal(
    sanitizeShortLinkInput({ destinationUrl: 'https://example.com', code: 'My-Link' }).code,
    'my-link'
  );
  for (const code of ['ab', 'bad code', 'admin', 'api', 'x'.repeat(33)]) {
    assert.throws(
      () => sanitizeShortLinkInput({ destinationUrl: 'https://example.com', code }),
      { status: 400 }
    );
  }
});

test('smart destinations accept app schemes but reject executable schemes', () => {
  const input = sanitizeShortLinkInput({
    destinationUrl: 'https://example.com',
    iosUrl: 'myapp://product/123',
    androidUrl: 'https://example.com/open-in-app',
    fallbackUrl: 'https://example.com',
  });
  assert.equal(input.ios_url, 'myapp://product/123');
  assert.equal(input.android_url, 'https://example.com/open-in-app');
  assert.throws(
    () => sanitizeShortLinkInput({
      destinationUrl: 'https://example.com',
      iosUrl: 'javascript://alert(1)',
    }),
    { status: 400 }
  );
});

test('partial updates only include fields explicitly supplied', () => {
  assert.deepEqual(
    sanitizeShortLinkInput({ status: 'paused' }, { partial: true }),
    { status: 'paused' }
  );
});

test('expiry values must be valid timestamps', () => {
  assert.throws(
    () => sanitizeShortLinkInput({
      destinationUrl: 'https://example.com',
      expiresAt: 'not-a-date',
    }),
    { status: 400 }
  );
});

test('mobile and desktop website destinations accept only HTTP or HTTPS', () => {
  const input = sanitizeShortLinkInput({ destinationUrl: 'https://www.example.com', mobileUrl: 'https://m.example.com/page', desktopUrl: 'https://www.example.com/page', fallbackUrl: 'https://fallback.example.com' });
  assert.equal(input.mobile_url, 'https://m.example.com/page');
  assert.equal(input.desktop_url, 'https://www.example.com/page');
  assert.throws(() => sanitizeShortLinkInput({ destinationUrl: 'https://www.example.com', mobileUrl: 'javascript:alert(1)' }), { status: 400 });
});

test('smart routing chooses mobile, desktop and unknown-agent fallback destinations', () => {
  const link = { destination_url: 'https://www.example.com', mobile_url: 'https://m.example.com', desktop_url: 'https://desktop.example.com', fallback_url: 'https://fallback.example.com' };
  assert.deepEqual(selectWebDestination(link, 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile Safari/604.1'), { destination: 'https://m.example.com', device: 'mobile' });
  assert.deepEqual(selectWebDestination(link, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36'), { destination: 'https://desktop.example.com', device: 'desktop' });
  assert.deepEqual(selectWebDestination(link, ''), { destination: 'https://fallback.example.com', device: 'unknown' });
});

test('device-specific destinations fall back to the main destination when omitted', () => {
  const link = { destination_url: 'https://www.example.com', mobile_url: null, desktop_url: null, fallback_url: null };
  assert.equal(selectWebDestination(link, 'Mozilla/5.0 (Linux; Android 14; Mobile) Chrome/120.0'), { destination: 'https://www.example.com', device: 'mobile' }.destination);
  assert.equal(selectWebDestination(link, 'Mozilla/5.0 (X11; Linux x86_64) Firefox/120.0').destination, 'https://www.example.com');
});

st test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeShortLinkInput, selectWebDestination } = require('../utils/shortLinks');

test('short links require an HTTP or HTTPS destination', () => {
  const input = sanitizeShortLinkInput({
    destinationUrl: 'https://example.com/shop',
    title: 'Shop',
  });
  assert.equal(input.destination_url, 'https://example.com/shop');
  assert.throws(
    () => sanitizeShortLinkInput({ destinationUrl: 'javascript:alert(1)' }),
    { status: 400 }
  );
  assert.throws(
    () => sanitizeShortLinkInput({ destinationUrl: 'mailto:hello@example.com' }),
    { status: 400 }
  );
});

test('short codes are normalized and validated', () => {
  assert.equal(
    sanitizeShortLinkInput({ destinationUrl: 'https://example.com', code: 'My-Link' }).code,
    'my-link'
  );
  for (const code of ['ab', 'bad code', 'admin', 'api', 'x'.repeat(33)]) {
    assert.throws(
      () => sanitizeShortLinkInput({ destinationUrl: 'https://example.com', code }),
      { status: 400 }
    );
  }
});

test('smart destinations accept app schemes but reject executable schemes', () => {
  const input = sanitizeShortLinkInput({
    destinationUrl: 'https://example.com',
    iosUrl: 'myapp://product/123',
    androidUrl: 'https://example.com/open-in-app',
    fallbackUrl: 'https://example.com',
  });
  assert.equal(input.ios_url, 'myapp://product/123');
  assert.equal(input.android_url, 'https://example.com/open-in-app');
  assert.throws(
    () => sanitizeShortLinkInput({
      destinationUrl: 'https://example.com',
      iosUrl: 'javascript://alert(1)',
    }),
    { status: 400 }
  );
});

test('partial updates only include fields explicitly supplied', () => {
  assert.deepEqual(
    sanitizeShortLinkInput({ status: 'paused' }, { partial: true }),
    { status: 'paused' }
  );
});

test('expiry values must be valid timestamps', () => {
  assert.throws(
    () => sanitizeShortLinkInput({
      destinationUrl: 'https://example.com',
      expiresAt: 'not-a-date',
    }),
    { status: 400 }
  );
});

test('mobile and desktop website destinations accept only HTTP or HTTPS', () => {
  const input = sanitizeShortLinkInput({ destinationUrl: 'https://www.example.com', mobileUrl: 'https://m.example.com/page', desktopUrl: 'https://www.example.com/page', fallbackUrl: 'https://fallback.example.com' });
  assert.equal(input.mobile_url, 'https://m.example.com/page');
  assert.equal(input.desktop_url, 'https://www.example.com/page');
  assert.throws(() => sanitizeShortLinkInput({ destinationUrl: 'https://www.example.com', mobileUrl: 'javascript:alert(1)' }), { status: 400 });
});

test('smart routing chooses mobile, desktop and unknown-agent fallback destinations', () => {
  const link = { destination_url: 'https://www.example.com', mobile_url: 'https://m.example.com', desktop_url: 'https://desktop.example.com', fallback_url: 'https://fallback.example.com' };
  assert.deepEqual(selectWebDestination(link, 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile Safari/604.1'), { destination: 'https://m.example.com', device: 'mobile' });
  assert.deepEqual(selectWebDestination(link, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36'), { destination: 'https://desktop.example.com', device: 'desktop' });
  assert.deepEqual(selectWebDestination(link, ''), { destination: 'https://fallback.example.com', device: 'unknown' });
});

test('device-specific destinations fall back to the main destination when omitted', () => {
  const link = { destination_url: 'https://www.example.com', mobile_url: null, desktop_url: null, fallback_url: null };
  assert.equal(selectWebDestination(link, 'Mozilla/5.0 (Linux; Android 14; Mobile) Chrome/120.0'), { destination: 'https://www.example.com', device: 'mobile' }.destination);
  assert.equal(selectWebDestination(link, 'Mozilla/5.0 (X11; Linux x86_64) Firefox/120.0').destination, 'https://www.example.com');
});

test('legacy app-store fallbacks are not part of website routing', () => {
  const input = sanitizeShortLinkInput({
    destinationUrl: 'https://example.com',
    iosStoreUrl: 'https://apps.apple.com/app/id123',
    androidStoreUrl: 'https://play.google.com/store/apps/details?id=com.example.app',
  });
  assert.equal(input.ios_store_url, 'https://apps.apple.com/app/id123');
  assert.equal(input.android_store_url, 'https://play.google.com/store/apps/details?id=com.example.app');
  assert.throws(() => sanitizeShortLinkInput({ destinationUrl: 'https://example.com', iosStoreUrl: 'javascript:alert(1)' }), { status: 400 });
});

test('partial smart-link updates can clear a store fallback', () => {
  assert.deepEqual(sanitizeShortLinkInput({ iosStoreUrl: '' }, { partial: true }), { ios_store_url: null });
});
