-- Poleris is live on Google Play (2026-10-07): no more "Google Play coming soon", and a Google Play link
-- that Android viewers get as the promo button (the API returns it as ctaAndroid).
update creator_details set android_status = 'live' where profile_id = (select id from profiles where handle = 'poleris');
insert into profile_links (id, profile_id, platform, url_input, canonical_url, label, position, safety_status, last_scanned_at)
select 'link-poleris-google-play', id, 'google_play', 'https://play.google.com/store/apps/details?id=com.miapera.poleris',
       'https://play.google.com/store/apps/details?id=com.miapera.poleris', null, 1, 'safe', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
from profiles where handle = 'poleris'
on conflict (id) do nothing;
