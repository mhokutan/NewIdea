-- New Hauling Empire promo (founder upload 2026-10-09): Turkish store preview, 28.5 s, 720x1560.
-- Same CTA as the other Hauling Empire promos (notify on iOS; Android gets Google Play from the creator).
insert into promos (id, creator_profile_id, slug, lang, title, description, i18n, status, cta_kind, cta_url, cta_safety_status, has_perk, rights_confirmed_at, submitted_at, approved_at, live_at)
select '0890044c-c7e0-5059-9170-fc94d34dc6bc', creator_profile_id, 'hauling-empire-start-small', 'tr', 'Start small, grow your map',
  'Small jobs, new regions, trucks at sea and your own fuel stations. No gems, no energy.',
  '{"title":{"en":"Start small, grow your map","es":"Empieza pequeño, haz crecer tu mapa","tr":"Küçük başla, haritanı büyüt"},"desc":{"en":"Small jobs, new regions, trucks at sea and your own fuel stations. No gems, no energy.","es":"Trabajos pequeños, nuevas regiones, camiones en el mar y tus propias gasolineras. Sin gemas, sin energía.","tr":"Küçük işler, yeni bölgeler, denize açılan tırlar ve kendi istasyonların. Elmas yok, enerji yok."}}',
  'live', cta_kind, cta_url, cta_safety_status, has_perk,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
from promos where slug = 'hauling-empire-first-truck'
on conflict (id) do nothing;
insert into promo_videos (id, promo_id, label, mp4_url, webm_url, poster_url, duration_ms, width, height) values
  ('278fd850-cde7-5e3b-9e11-8e049137b553', '0890044c-c7e0-5059-9170-fc94d34dc6bc', 'A',
   'https://promovote.com/media/hauling-empire-start-small.mp4', 'https://promovote.com/media/hauling-empire-start-small.webm',
   'https://promovote.com/media/hauling-empire-start-small-poster.jpg', 28500, 720, 1560)
on conflict (id) do nothing;
insert into hashtags (tag, use_count) values ('truckgame', 1), ('tycoon', 1), ('mobilegame', 1)
on conflict (tag) do update set use_count = use_count + 1;
insert into promo_hashtags (promo_id, tag, position) values
  ('0890044c-c7e0-5059-9170-fc94d34dc6bc', 'truckgame', 0), ('0890044c-c7e0-5059-9170-fc94d34dc6bc', 'tycoon', 1), ('0890044c-c7e0-5059-9170-fc94d34dc6bc', 'mobilegame', 2)
on conflict do nothing;
