const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeLinks, safeUrl } = require('../utils/validation');

test('sanitizeLinks preserves existing IDs and does not trust client click counts', () => {
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

test('sanitizeLinks rejects malformed and duplicate IDs', () => {
  assert.throws(
    () => sanitizeLinks([
      { id: '12x', label: 'A', url: 'https://a.example' },
    ]),
    { status: 400 }
  );

  assert.throws(
    () => sanitizeLinks([
      { id: '12', label: 'A', url: 'https://a.example' },
      { id: '12', label: 'B', url: 'https://b.example' },
    ]),
    { status: 400 }
  );
});

test('safeUrl blocks non-web executable protocols', () => {
  assert.equal(safeUrl('javascript:alert(1)'), 'https://javascript:alert(1)');
  assert.equal(safeUrl('https://example.com'), 'https://example.com/');
});
