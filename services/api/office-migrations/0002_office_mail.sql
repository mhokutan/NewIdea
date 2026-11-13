-- office-db, migration 0002 (founder request 2026-11-13): mail animation on promovote.com/admin/office.
-- The CEO session writes one row per "mail" between two sessions with the D1 tool; the page reads rows from the last
-- 10 minutes through GET /v1/admin/office and plays each once (it remembers shown ids in the browser only).
-- Apply (only after the founder's yes): npx wrangler d1 migrations apply office-db --remote (from services/api).
-- No personal data: a short label only.
create table if not exists office_mail (
  id text primary key check (length(id) between 8 and 64),                                   -- a UUID made by the writer
  from_id text not null check (length(from_id) between 2 and 40),                             -- office_agents.id
  to_id text not null check (length(to_id) between 2 and 40),                                 -- office_agents.id
  label text not null check (length(label) between 1 and 60),                                 -- written on the envelope
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))                    -- ISO time, UTC
);
create index if not exists office_mail_created on office_mail (created_at);
