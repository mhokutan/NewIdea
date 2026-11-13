-- office-db, migration 0003 (founder request 2026-11-13): task board ("Görevler") on promovote.com/admin/office.
-- The CEO session creates and updates cards with the D1 tool. The page can change ONLY owner_answer, owner_note and
-- answered_at of one card (POST /v1/admin/office/tasks/:id/answer, admin token, reached only through the admin login).
-- Apply (only after the founder's yes): npx wrangler d1 migrations apply office-db --remote (from services/api).
-- No personal data: short work text only.
create table if not exists office_tasks (
  id text primary key check (length(id) between 8 and 64),
  title text not null check (length(title) between 1 and 120),
  detail text check (detail is null or length(detail) <= 2000),
  project text not null default 'ortak' check (length(project) between 2 and 40),               -- department key: hauling, dropolis, ...
  assignee_id text check (assignee_id is null or length(assignee_id) between 2 and 40),         -- office_agents.id
  status text not null default 'waiting_owner' check (status in ('waiting_owner', 'doing', 'done', 'blocked')),
  kind text not null default 'yes' check (kind in ('yes', 'info', 'question')),
  priority integer not null default 3 check (priority between 1 and 5),                          -- 1 = high
  owner_answer text check (owner_answer is null or owner_answer in ('yes', 'no')),
  owner_note text check (owner_note is null or length(owner_note) <= 1000),
  answered_at text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
create index if not exists office_tasks_status on office_tasks (status, priority, created_at);
