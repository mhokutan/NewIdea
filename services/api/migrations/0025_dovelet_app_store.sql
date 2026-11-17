-- Dovelet is live on the App Store (2026-11-16, id6824002542). Like Hauling Empire: promos open the App Store on iOS,
-- Android viewers get Google Play from the creator's google_play link (ctaAndroid).
update creator_details set ios_status = 'live', android_status = 'live', primary_cta = 'app_store'
where profile_id = (select id from profiles where handle = 'dovelet');
update profile_links set position = 1
where platform = 'google_play' and profile_id = (select id from profiles where handle = 'dovelet');
insert into profile_links (id, profile_id, platform, url_input, canonical_url, label, position, verify_status, safety_status, verified_at, last_scanned_at)
select 'link-dovelet-app-store', id, 'app_store', 'https://apps.apple.com/us/app/dovelet-for-couples/id6824002542',
       'https://apps.apple.com/us/app/dovelet-for-couples/id6824002542', 'App Store', 0, 'verified', 'safe',
       strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
from profiles where handle = 'dovelet'
on conflict (id) do nothing;
update promos set cta_kind = 'app_store', cta_url = 'https://apps.apple.com/us/app/dovelet-for-couples/id6824002542', cta_safety_status = 'safe'
where creator_profile_id = (select id from profiles where handle = 'dovelet');
