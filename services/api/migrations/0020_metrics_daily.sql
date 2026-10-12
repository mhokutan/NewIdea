-- Daily store metrics for all founder apps (docs/09-metrics-hub.md). One long table: a new metric or product is a new row.
-- Filled by the daily store collector (Apple sales reports, Google Play report files). Read only from /admin.
create table metrics_daily (
  product_id text not null,          -- promovote, poleris, haulingempire
  source text not null,              -- app_store, google_play
  date text not null,                -- YYYY-MM-DD (UTC for Apple sales reports, Pacific for Play files as Google writes them)
  metric text not null,              -- downloads, updates, installs, uninstalls, active_devices, rating_avg, crashes, anrs, iap_units...
  value real,
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  primary key (product_id, source, date, metric)
);
create index metrics_daily_lookup on metrics_daily(product_id, source, date);
