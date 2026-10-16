-- Duel in the app (founder request 2026-10-16): two promos at once, the viewer picks the one that blows up first.
-- One pick per pair per viewer per day. Picks never change calls, points, charts or Hit Score, and nobody sees who "lost".
create table if not exists duel_picks (
  day text not null,
  a text not null,
  b text not null,
  pick text not null,
  viewer_key text not null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  primary key (day, a, b, viewer_key)
);
create index if not exists duel_picks_day on duel_picks(day);
