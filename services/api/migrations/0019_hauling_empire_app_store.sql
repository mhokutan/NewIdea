-- Hauling Empire is live on the App Store (2026-10-10, id6815224121). Every Hauling Empire promo now opens the
-- App Store on iOS (Android keeps Google Play from the creator link), plus a new 7 s "now on the App Store" promo.
update creator_details set release_status = 'live', android_status = 'live', ios_status = 'live'
where profile_id = (select id from profiles where handle = 'haulingempire');
update profile_links set position = 1
where platform = 'google_play' and profile_id = (select id from profiles where handle = 'haulingempire');
insert into profile_links (id, profile_id, platform, url_input, canonical_url, label, position, safety_status, last_scanned_at)
select 'link-haulingempire-app-store', id, 'app_store', 'https://apps.apple.com/us/app/hauling-empire-truck-tycoon/id6815224121',
       'https://apps.apple.com/us/app/hauling-empire-truck-tycoon/id6815224121', null, 0, 'safe', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
from profiles where handle = 'haulingempire'
on conflict (id) do nothing;
update promos set cta_kind = 'app_store', cta_url = 'https://apps.apple.com/us/app/hauling-empire-truck-tycoon/id6815224121', cta_safety_status = 'safe'
where creator_profile_id = (select id from profiles where handle = 'haulingempire');

insert into promos (id, creator_profile_id, slug, lang, title, description, i18n, status, cta_kind, cta_url, cta_safety_status, has_perk, rights_confirmed_at, submitted_at, approved_at, live_at)
select 'f8aa3fb5-e869-537f-81e7-b080c4b10053', id, 'hauling-empire-ios-launch', 'en', 'Hauling Empire is now on the App Store',
  'Now on iPhone and iPad. Start with one van and grow a logistics empire. No gems, no energy timers.',
  '{"title":{"en":"Hauling Empire is now on the App Store","es":"Hauling Empire ya está en la App Store","tr":"Hauling Empire artık App Store''da"},"desc":{"en":"Now on iPhone and iPad. Start with one van and grow a logistics empire. No gems, no energy timers.","es":"Ya en iPhone y iPad. Empieza con una furgoneta y crea un imperio logístico. Sin gemas ni temporizadores.","tr":"Artık iPhone ve iPad''de. Tek bir kamyonetle başla, lojistik imparatorluğunu kur. Elmas yok, enerji bekleme yok."}}',
  'live', 'app_store', 'https://apps.apple.com/us/app/hauling-empire-truck-tycoon/id6815224121', 'safe', 0,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
from profiles where handle = 'haulingempire'
on conflict (id) do nothing;
insert into promo_videos (id, promo_id, label, mp4_url, webm_url, poster_url, duration_ms, width, height) values
  ('006d8f5f-66b3-50a1-93e2-c85e3bafe0eb', 'f8aa3fb5-e869-537f-81e7-b080c4b10053', 'A',
   'https://promovote.com/media/hauling-empire-ios-launch.mp4', 'https://promovote.com/media/hauling-empire-ios-launch.webm',
   'https://promovote.com/media/hauling-empire-ios-launch-poster.jpg', 7000, 720, 1280)
on conflict (id) do nothing;
insert into hashtags (tag, use_count) values ('truckgame', 1), ('tycoon', 1), ('iosgames', 1)
on conflict (tag) do update set use_count = use_count + 1;
insert into promo_hashtags (promo_id, tag, position) values
  ('f8aa3fb5-e869-537f-81e7-b080c4b10053', 'truckgame', 0), ('f8aa3fb5-e869-537f-81e7-b080c4b10053', 'tycoon', 1), ('f8aa3fb5-e869-537f-81e7-b080c4b10053', 'iosgames', 2)
on conflict do nothing;
