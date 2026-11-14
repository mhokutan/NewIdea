-- office-db, migration 0004 (founder request 2026-11-14): which stage a task card is in, how far along it is, and a
-- short timeline. The CEO session writes all of it with the D1 tool; the page only reads it.
-- Apply (only after the founder's yes): npx wrangler d1 migrations apply office-db --remote (from services/api), or the
-- same SQL through the D1 tool plus a row in d1_migrations (cloud session tokens have no D1 access).
alter table office_tasks add column stage text check (stage is null or length(stage) <= 120);        -- "2/5 Reklam düzeltmesi"
alter table office_tasks add column progress integer check (progress is null or progress between 0 and 100);
create table if not exists office_task_log (
  id text primary key check (length(id) between 8 and 64),                                    -- a UUID made by the writer
  task_id text not null check (length(task_id) between 8 and 64),                             -- office_tasks.id
  at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),                           -- ISO time, UTC
  text text not null check (length(text) between 1 and 300)
);
create index if not exists office_task_log_task on office_task_log (task_id, at);
