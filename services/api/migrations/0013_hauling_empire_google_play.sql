-- Hauling Empire is live on Google Play (2026-10-07); the App Store version is still coming.
-- Android viewers get the Google Play button (ctaAndroid), iOS viewers keep "Notify me at launch".
update creator_details set release_status = 'live', android_status = 'live', ios_status = 'soon'
where profile_id = (select id from profiles where handle = 'haulingempire');
insert into profile_links (id, profile_id, platform, url_input, canonical_url, label, position, safety_status, last_scanned_at)
select 'link-haulingempire-google-play', id, 'google_play', 'https://play.google.com/store/apps/details?id=com.mhokutan.haulingempire',
       'https://play.google.com/store/apps/details?id=com.mhokutan.haulingempire', null, 0, 'safe', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
from profiles where handle = 'haulingempire'
on conflict (id) do nothing;
