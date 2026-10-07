-- Founder pages get their main button, and Nicheable's NEWIDEA25 becomes a real gift (it was only a has_perk flag,
-- so the gift chip opened "This gift has ended"). The code is already public in the site source, so it is stored
-- with the "plain:" prefix the API understands; gifts created in the app are always AES-GCM sealed.
update creator_details set primary_cta = 'app_store' where profile_id = (select id from profiles where handle = 'poleris');
update creator_details set primary_cta = 'etsy' where profile_id = (select id from profiles where handle = 'nicheable');
update creator_details set primary_cta = 'notify' where profile_id = (select id from profiles where handle = 'haulingempire');

insert into perks (id, creator_profile_id, kind, mode, title, description, redeem_url, starts_at, ends_at, status)
select 'perk-nicheable-newidea25', id, 'discount', 'shared', '25% off the whole Nicheable shop',
       'One use per buyer. Offer by Nicheable, a shop owned by the PromoVote founder. Etsy terms apply.',
       'https://nicheable.etsy.com?coupon=NEWIDEA25', '2026-10-07T00:00:00.000Z', '2026-12-31T23:59:59.000Z', 'active'
from profiles where handle = 'nicheable'
on conflict (id) do nothing;
insert into perk_codes (id, perk_id, code_encrypted)
select 'perkcode-nicheable-newidea25', 'perk-nicheable-newidea25', 'plain:NEWIDEA25'
where exists (select 1 from perks where id = 'perk-nicheable-newidea25')
on conflict (id) do nothing;

-- The promo flag is no longer read; the chip shows only for a real active gift.
update promos set has_perk = 0;
