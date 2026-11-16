CREATE TABLE IF NOT EXISTS waitlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  link TEXT,
  country TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_waitlist_role ON waitlist(role);

-- Cookieless visit counter. visitor = SHA-256(daily random salt + IP + user agent), salt rotates every UTC day.
CREATE TABLE IF NOT EXISTS visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day TEXT NOT NULL,
  path TEXT NOT NULL,
  ref TEXT,
  country TEXT,
  device TEXT,
  visitor TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_visits_day ON visits(day);
CREATE TABLE IF NOT EXISTS visit_salt (day TEXT PRIMARY KEY, salt TEXT NOT NULL);

-- Duel picks (web test 2026-10-16): which of two promos a visitor picked. visitor = same daily salted hash as visits, no IP.
CREATE TABLE IF NOT EXISTS duel_picks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day TEXT NOT NULL,
  a TEXT NOT NULL,
  b TEXT NOT NULL,
  pick TEXT NOT NULL,
  visitor TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_duel_once ON duel_picks(day, visitor, a, b);

-- TikTok (founder request 2026-11-16): the founder's own TikTok account, created on first use by src/tiktok.js.
CREATE TABLE IF NOT EXISTS tiktok_auth (id TEXT PRIMARY KEY, mode TEXT NOT NULL, open_id TEXT, display_name TEXT, scope TEXT,
  access_enc TEXT NOT NULL, access_expires_at INTEGER NOT NULL, refresh_enc TEXT NOT NULL, refresh_expires_at INTEGER NOT NULL,
  connected_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS tiktok_posts (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL DEFAULT (datetime('now')),
  kind TEXT NOT NULL, video_path TEXT NOT NULL, caption TEXT, privacy TEXT, publish_id TEXT, status TEXT, error TEXT);
