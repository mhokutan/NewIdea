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
