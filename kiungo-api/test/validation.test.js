const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeLinks, safeUrl } = require('../utils/validation');

test('sanitizeLinks preserves BIGINT IDs and ignores client click counters', () => {
  const [existing, added] = sanitizeLinks([
    { id: '9007199254740993', label: 'Portfolio', url: 'https://example.com', clicks: 9999 },
    { label: 'Contact', url: 'contact.example', clicks: 500 },
  ]);

  assert.equal(existing.id, '9007199254740993');
  assert.equal(added.id, null);
  assert.equal('clicks' in existing, false);
  assert.equal('clicks' in added, false);
  assert.equal(added.url, 'https://contact.example/');
});

test('sanitizeLinks rejects malformed, duplicate, zero and out-of-range BIGINT IDs', () => {
  for (const id of ['12x', '0', '9223372036854775808']) {
    assert.throws(
      () => sanitizeLinks([{ id, label: 'A', url: 'https://a.example' }]),
      { status: 400 }
    );
  }

  assert.throws(
    () => sanitizeLinks([
      { id: '12', label: 'A', url: 'https://a.example' },
      { id: '012', label: 'B', url: 'https://b.example' },
    ]),
    { status: 400 }
  );
});

test('sanitizeLinks ignores empty builder rows but rejects partially completed rows', () => {
  assert.deepEqual(sanitizeLinks([{ label: '', url: '' }]), []);
  assert.throws(
    () => sanitizeLinks([{ label: 'Missing URL', url: '' }]),
    { status: 400 }
  );
  assert.throws(() => sanitizeLinks([null]), { status: 400 });
});

test('sanitizeLinks uses safe integer positions and falls back for invalid positions', () => {
  const [valid, fallback] = sanitizeLinks([
    { label: 'A', url: 'https://a.example', position: 4 },
    { label: 'B', url: 'https://b.example', position: 1.5 },
  ]);
  assert.equal(valid.position, 4);
  assert.equal(fallback.position, 1);
});

test('safeUrl rejects malformed executable-protocol input', () => {
  assert.equal(safeUrl('javascript:alert(1)'), null);
  assert.equal(safeUrl('https://example.com'), 'https://example.com/');
});
