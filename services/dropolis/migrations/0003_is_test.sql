-- dropolis-db, migration 0003 (founder decision 2026-11-14): test accounts are flagged, never deleted.
-- ALREADY APPLIED on the live dropolis-db on 2026-11-14 by the CEO session with the D1 tool (d1_migrations row
-- '0003_is_test.sql'; 1532 test players flagged, 34 real). This file brings the repo in line so new or local databases
-- match. SQLite has no "add column if not exists": the column line runs only on databases where 0003 is not recorded.
-- The Worker sets is_test = 1 when a request carries "X-Dropolis-Test: 1" or a HeadlessChrome User-Agent, never back
-- to 0. Leaderboards, invite reward counts and the admin numbers leave is_test = 1 players out.
alter table users add column is_test INTEGER NOT NULL DEFAULT 0;
create index if not exists idx_users_is_test on users(is_test);
