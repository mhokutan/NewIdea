-- Creator video uploads (founder decision 2026-10-16). Indexes for the upload quota and the review queue.
create index if not exists promos_creator_created on promos(creator_profile_id, created_at);
create index if not exists promos_status_submitted on promos(status, submitted_at);
