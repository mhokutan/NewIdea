-- Optional video or image for a social post: a public https URL the Worker fetches and uploads to X before posting.
alter table social_posts add column media_url text;
