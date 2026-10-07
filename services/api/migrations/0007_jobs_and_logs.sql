-- Expert review round 2 (2026-10-07).
-- job_runs: heartbeat for scheduled jobs, shown on /health and /admin, so we know calls really resolve.
create table if not exists job_runs (
  name text primary key,
  ran_at text not null,
  info text
);
-- deletion_log: audit of completed account deletions that survives the user row (data_requests cascades away).
create table if not exists deletion_log (
  id integer primary key autoincrement,
  user_id text not null,
  requested_at text,
  completed_at text not null
);
