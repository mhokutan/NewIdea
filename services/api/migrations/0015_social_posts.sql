-- Scheduled posts for PromoVote's own social accounts (founder request 2026-10-09). The hourly cron posts the due ones.
-- Starts with X; later this can become a creator feature (share a promo to X).
create table social_posts (
  id text primary key,
  network text not null default 'x' check (network in ('x')),
  body text not null check (length(body) between 1 and 280),
  scheduled_at text not null,
  status text not null default 'queued' check (status in ('queued', 'posted', 'failed', 'cancelled')),
  posted_at text,
  external_id text,
  error text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
create index social_posts_due on social_posts(status, scheduled_at);
