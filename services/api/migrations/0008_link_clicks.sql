-- Profile link taps (one per viewer per link per day), shown to the owner in the studio.
-- Keyed by profile and URL, because saving links replaces the profile_links rows.
create table link_click_events (
  profile_id text not null references profiles(id) on delete cascade,
  url text not null,
  viewer_key text not null,
  day text not null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  primary key (profile_id, url, viewer_key, day)
);
create index link_click_events_day on link_click_events(profile_id, day);
