-- Office (founder request 2026-11-12): promovote.com/admin/office shows the founder's Claude sessions as characters
-- in a small 3D office. The "CEO" Claude session writes these rows DIRECTLY with the Cloudflare D1 tool; there is no
-- write endpoint on any Worker. Reading: GET https://api.promovote.com/v1/admin/office, only with ADMIN_API_TOKEN,
-- which only the admin site (behind the admin login) holds. D1 itself is never public.
-- No personal data: short role names and work notes only (no e-mails, names of players or customers, keys).
create table if not exists office_agents (
  id text primary key check (length(id) between 2 and 40 and id not glob '*[^a-z0-9-]*'), -- 'ceo', 'hauling-dev', 'empire-desktop', 'robo-works'
  role text not null check (length(role) between 1 and 60),                                 -- shown name: "CEO", "Hauling Geliştirici"
  status text not null check (status in ('working', 'idle', 'waiting_owner', 'blocked', 'offline')),
  last_action text check (last_action is null or length(last_action) <= 160),                -- last work, up to 160 characters
  needs_owner text check (needs_owner is null or length(needs_owner) <= 300),                -- the yes the founder owes, or null
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))                   -- ISO time, UTC
);

-- Step 2 (later): notes from the founder to the CEO, answered by the CEO.
create table if not exists office_notes (
  id text primary key,                                                                       -- a UUID made by the writer
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  text text not null check (length(text) between 1 and 1000),
  status text not null default 'new' check (status in ('new', 'read', 'answered')),
  answer text check (answer is null or length(answer) <= 2000)
);
create index if not exists office_notes_status on office_notes (status, created_at);
