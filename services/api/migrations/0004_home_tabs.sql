-- Home tabs (founder decision 2026-10-07): For you, New, Top, Featured.
-- Featured is an editorial pick by the PromoVote team. It is never sold; paid Boost stays a separate, labeled slot.
alter table promos add column featured_at text;
create index promos_featured on promos(featured_at desc) where featured_at is not null;

-- First picks: one launch promo per founder creator.
update promos set featured_at = '2026-10-07T00:00:00.000Z'
where slug in ('hauling-empire', 'nicheable-planners', 'poleris');
