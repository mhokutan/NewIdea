-- AI labels (founder request 2026-10-08). A promo made or changed with AI shows "Made with AI".
-- Virtual creators (AI characters) are labeled on their page, and all their promos count as AI made.
alter table promos add column ai_generated integer not null default 0;
alter table creator_details add column ai_persona integer not null default 0;
