/* Seed a few showcase profiles so the site is never empty. Idempotent. */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const avatars = JSON.parse(fs.readFileSync(path.join(__dirname, 'avatar-data-urls.json'), 'utf8'));
const db = new Database(path.join(__dirname, '..', 'data.db'));

db.exec(`
CREATE TABLE IF NOT EXISTS profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL, tagline TEXT NOT NULL DEFAULT '', avatar TEXT NOT NULL DEFAULT '',
  theme TEXT NOT NULL DEFAULT 'ember', owner TEXT NOT NULL DEFAULT '', views INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS links (
  id INTEGER PRIMARY KEY AUTOINCREMENT, profile_id INTEGER NOT NULL, label TEXT NOT NULL, url TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'link', position INTEGER NOT NULL DEFAULT 0, clicks INTEGER NOT NULL DEFAULT 0);
`);

const SEEDS = [
  {
    username: 'amina.studio',
    display_name: 'Amina Juma',
    tagline: 'Portrait photographer in Dar es Salaam. Bookings open for August.',
    avatar: avatars['demo-avatar.jpg'],
    theme: 'ember',
    views: 1284,
    links: [
      { label: 'Follow on Instagram', url: 'https://instagram.com/', icon: 'instagram', clicks: 318 },
      { label: 'Chat on WhatsApp', url: 'https://wa.me/', icon: 'whatsapp', clicks: 229 },
      { label: 'Book a session', url: 'https://calendly.com/', icon: 'booking', clicks: 131 },
      { label: 'Print shop', url: 'https://example.com/shop', icon: 'shop', clicks: 64 },
    ],
  },
  {
    username: 'baraka.beats',
    display_name: 'Baraka Mwenda',
    tagline: 'Producer & beatmaker. New EP out now.',
    avatar: avatars['demo-avatar-2.jpg'],
    theme: 'tide',
    views: 942,
    links: [
      { label: 'Listen on Spotify', url: 'https://open.spotify.com/', icon: 'music', clicks: 402 },
      { label: 'Watch on YouTube', url: 'https://youtube.com/', icon: 'youtube', clicks: 188 },
      { label: 'Beats on TikTok', url: 'https://tiktok.com/', icon: 'tiktok', clicks: 96 },
      { label: 'Book studio time', url: 'https://wa.me/', icon: 'whatsapp', clicks: 71 },
    ],
  },
  {
    username: 'zawadi.crafts',
    display_name: 'Zawadi Crafts',
    tagline: 'Handmade kitenge bags and home pieces. Delivery countrywide.',
    avatar: avatars['demo-avatar-3.jpg'],
    theme: 'daylight',
    views: 617,
    links: [
      { label: 'Shop the catalogue', url: 'https://example.com/catalogue', icon: 'shop', clicks: 245 },
      { label: 'Order on WhatsApp', url: 'https://wa.me/', icon: 'whatsapp', clicks: 190 },
      { label: 'See our workshop', url: 'https://instagram.com/', icon: 'instagram', clicks: 88 },
      { label: 'Find us in Kariakoo', url: 'https://maps.google.com/', icon: 'location', clicks: 34 },
    ],
  },
];

const exists = db.prepare('SELECT id FROM profiles WHERE username = ? COLLATE NOCASE');
const insertProfile = db.prepare(
  'INSERT INTO profiles (username, display_name, tagline, avatar, theme, owner, views) VALUES (?, ?, ?, ?, ?, ?, ?)'
);
const insertLink = db.prepare('INSERT INTO links (profile_id, label, url, icon, position, clicks) VALUES (?, ?, ?, ?, ?, ?)');

for (const seed of SEEDS) {
  if (exists.get(seed.username)) {
    console.log(`skip ${seed.username} (exists)`);
    continue;
  }
  const info = insertProfile.run(seed.username, seed.display_name, seed.tagline, seed.avatar, seed.theme, '', seed.views);
  seed.links.forEach((l, i) => insertLink.run(info.lastInsertRowid, l.label, l.url, l.icon, i, l.clicks));
  console.log(`seeded ${seed.username}`);
}
