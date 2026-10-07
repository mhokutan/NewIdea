-- Profiles and categories (expert review 2026-10-07, founder decisions).
-- Category, creator kind and link platform lists move from CHECK constraints to the API, so new values never
-- need another table rebuild (D1 / SQLite cannot alter a CHECK). Categories: games, apps, streams, videos,
-- shops, brands, local. The old value 'creators' becomes 'videos'.
PRAGMA defer_foreign_keys = on;

create table creator_details_new (
  profile_id text primary key references profiles(id) on delete cascade,
  kind text not null,
  category text not null,
  secondary_categories text,             -- JSON array, up to 2
  primary_cta text,                      -- default button for the public page: website, app_store, google_play, steam, shop, watch_live, ...
  contact_email text,
  founding_creator integer not null default 0,
  founder_owned integer not null default 0,
  release_status text not null default 'live' check (release_status in ('live', 'soon')),
  android_status text check (android_status in ('live', 'soon')),
  ios_status text check (ios_status in ('live', 'soon')),
  weekly_upload_limit integer not null default 3,
  live_slot_limit integer not null default 15,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
insert into creator_details_new (profile_id, kind, category, contact_email, founding_creator, founder_owned, release_status, android_status, ios_status, weekly_upload_limit, live_slot_limit, created_at, updated_at)
  select profile_id, kind, case category when 'creators' then 'videos' else category end, contact_email, founding_creator, founder_owned, release_status, android_status, ios_status, weekly_upload_limit, live_slot_limit, created_at, updated_at
  from creator_details;
drop table creator_details;
alter table creator_details_new rename to creator_details;
create index creator_details_category on creator_details(category);

create table profile_links_new (
  id text primary key,
  profile_id text not null references profiles(id) on delete cascade,
  platform text not null,
  url_input text not null check (length(url_input) <= 500),
  canonical_url text not null,
  label text,
  external_id text,
  position integer not null default 0,
  verify_status text not null default 'unverified' check (verify_status in ('unverified', 'pending', 'verified', 'failed', 'revoked')),
  verify_method text,
  verify_code_hash text,
  verify_code_expires_at text,
  verified_at text,
  safety_status text not null default 'pending' check (safety_status in ('pending', 'safe', 'flagged', 'blocked')),
  last_scanned_at text,
  click_count integer not null default 0,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
insert into profile_links_new select * from profile_links;
drop table profile_links;
alter table profile_links_new rename to profile_links;
create index profile_links_profile on profile_links(profile_id, position);
