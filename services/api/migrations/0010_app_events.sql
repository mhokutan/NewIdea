-- Funnel events: one row per event name per viewer per day (unique daily users per step, cheap to write).
-- viewer_key = p:<profile id> or d:<random device id> for guests. No IP, no device details.
create table app_events (
  name text not null,
  viewer_key text not null,
  day text not null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  primary key (name, day, viewer_key)
);
create index app_events_viewer on app_events(viewer_key, day);
