-- Dropolis: players, linked sign ins, sessions, one cloud save per player, leaderboards, batched events,
-- daily activity (for DAU, MAU and retention) and a deletion log. Online count lives in the Presence Durable Object.
create table users (
  id text primary key,
  device_id text,
  name text,
  avatar text,
  country text,
  created_at text not null,
  last_seen text not null
);
create index users_device on users(device_id);
create index users_created on users(created_at);

create table identities (
  provider text not null check (provider in ('apple', 'google')),
  subject text not null,
  user_id text not null references users(id) on delete cascade,
  email text,
  created_at text not null,
  primary key (provider, subject)
);
create index identities_user on identities(user_id);

create table sessions (
  token_hash text primary key,
  user_id text not null references users(id) on delete cascade,
  created_at text not null
);
create index sessions_user on sessions(user_id);

create table saves (
  user_id text primary key references users(id) on delete cascade,
  data text not null,
  version integer not null,
  updated_at text not null
);

-- period = 'all' or the Monday (UTC) of the week, YYYY-MM-DD
create table scores (
  user_id text not null references users(id) on delete cascade,
  board text not null check (board in ('city_level', 'deliveries', 'colonists')),
  period text not null,
  value integer not null,
  updated_at text not null,
  primary key (user_id, board, period)
);
create index scores_board on scores(board, period, value desc);

-- One row per batch the phone sends (every 5 minutes or at session end): payload is a JSON array of events.
create table event_batches (
  id integer primary key autoincrement,
  user_id text not null references users(id) on delete cascade,
  day text not null,
  received_at text not null,
  payload text not null
);
create index event_batches_day on event_batches(day);
create index event_batches_user on event_batches(user_id);

create table daily_active (
  user_id text not null references users(id) on delete cascade,
  day text not null,
  primary key (user_id, day)
);
create index daily_active_day on daily_active(day);

create table deletion_log (
  day text primary key,
  count integer not null
);
