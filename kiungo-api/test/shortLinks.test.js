const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeShortLinkInput } = require('../utils/shortLinks');

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

test('store fallbacks must be valid HTTP or HTTPS URLs', () => {
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
