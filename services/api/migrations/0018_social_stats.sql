-- Public stats for our own X posts, refreshed by the hourly job at most every 12 hours (founder request 2026-10-10:
-- see which topics get the most views and post more of them).
alter table social_posts add column impressions integer;
alter table social_posts add column likes integer;
alter table social_posts add column reposts integer;
alter table social_posts add column replies integer;
alter table social_posts add column bookmarks integer;
alter table social_posts add column stats_at text;
