-- PromoVote core schema for Cloudflare D1 (SQLite).
-- Source: docs/03-profiles-spec.md section 9, adapted for SQLite and the founder decisions:
-- creator and scout are separate account types, no subscriptions, in-app payments only,
-- no address, billing or card data is ever stored.
-- Ids are UUID text made by the API. Times are ISO 8601 UTC text.

-- ---------------------------------------------------------------- accounts
-- Private data per login user. Never public.
create table account_private (
  user_id text primary key references "user"(id) on delete cascade,
  account_type text not null check (account_type in ('scout', 'creator')),
  birth_year integer not null check (birth_year between 1900 and 2100),
  age_confirmed_at text not null,
  country_code text check (country_code is null or length(country_code) = 2),
  language text not null default 'en',
  timezone text not null default 'UTC',
  perk_email_opt_in integer not null default 0,     -- "Email me perks I claim"
  follow_email_opt_in integer not null default 0,   -- "Email me new perks from creators I follow"
  terms_accepted_at text not null,
  terms_version text not null,
  staff_role text check (staff_role in ('admin', 'moderator', 'support')),
  last_active_at text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- ---------------------------------------------------------------- media
create table media_assets (
  id text primary key,
  owner_user_id text not null references "user"(id) on delete cascade,
  kind text not null check (kind in ('avatar', 'banner')),
  r2_key text not null,
  public_url text,                       -- set when approved
  width integer, height integer, bytes integer,
  mime text not null check (mime in ('image/jpeg', 'image/png', 'image/webp')),
  moderation_status text not null default 'pending' check (moderation_status in ('pending', 'approved', 'rejected')),
  moderation_labels text,                -- JSON
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- ---------------------------------------------------------------- profiles
-- One profile per account. The type matches account_private.account_type.
create table profiles (
  id text primary key,
  owner_user_id text not null unique references "user"(id) on delete cascade,
  type text not null check (type in ('scout', 'creator')),
  handle text not null unique check (
    length(handle) between 3 and 24 and handle glob '[a-z]*' and handle not glob '*[^a-z0-9_]*'
    and handle not like '%\_\_%' escape '\' and handle not like '%\_' escape '\'
  ),
  display_name text not null check (length(display_name) between 1 and 80),
  bio text check (bio is null or length(bio) <= 600),
  i18n text,                             -- JSON {"bio": {"en","es","tr"}, "kind": {...}} for curated profiles
  avatar_media_id text references media_assets(id) on delete set null,
  banner_media_id text references media_assets(id) on delete set null,
  avatar_url text,                       -- curated or approved media url
  banner_url text,
  status text not null default 'active' check (status in ('active', 'limited', 'suspended', 'deactivated', 'pending_deletion', 'deleted')),
  is_verified integer not null default 0,
  verified_at text,
  follower_count integer not null default 0,
  handle_changed_at text,
  free_handle_change_used integer not null default 0,
  deletion_requested_at text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
create index profiles_type_status on profiles(type, status);

create table profile_settings (
  profile_id text primary key references profiles(id) on delete cascade,
  show_calls integer not null default 1,
  show_saved integer not null default 0,
  show_following integer not null default 0,
  show_in_leaderboards integer not null default 1,
  show_view_counts integer not null default 1,
  show_follower_count integer not null default 1,
  autoplay_previews text not null default 'wifi' check (autoplay_previews in ('always', 'wifi', 'never')),
  drop_reminder_time text,
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table creator_details (
  profile_id text primary key references profiles(id) on delete cascade,
  kind text not null check (kind in ('game_dev', 'youtuber', 'streamer', 'short_video', 'app_maker', 'shop', 'brand')),
  category text not null check (category in ('games', 'apps', 'shops', 'creators', 'brands')),
  contact_email text,                    -- private, platform communication only
  founding_creator integer not null default 0,
  founder_owned integer not null default 0,   -- shows "Made by the PromoVote founder"
  release_status text not null default 'live' check (release_status in ('live', 'soon')),
  android_status text check (android_status in ('live', 'soon')),
  ios_status text check (ios_status in ('live', 'soon')),
  weekly_upload_limit integer not null default 3,
  live_slot_limit integer not null default 15,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
create index creator_details_category on creator_details(category);

create table profile_links (
  id text primary key,
  profile_id text not null references profiles(id) on delete cascade,
  platform text not null check (platform in ('youtube', 'twitch', 'kick', 'tiktok', 'instagram', 'x', 'steam', 'app_store', 'google_play', 'etsy', 'discord', 'itch', 'website')),
  url_input text not null check (length(url_input) <= 500),
  canonical_url text not null,
  label text,
  external_id text,
  position integer not null default 0,
  verify_status text not null default 'unverified' check (verify_status in ('unverified', 'pending', 'verified', 'failed', 'revoked')),
  verify_method text,
  verify_code_hash text,
  verify_code_expires_at text,
  verified_at text,
  safety_status text not null default 'pending' check (safety_status in ('pending', 'safe', 'flagged', 'blocked')),
  last_scanned_at text,
  click_count integer not null default 0,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
create index profile_links_profile on profile_links(profile_id, position);

create table reserved_handles (
  handle text primary key,
  reason text not null check (reason in ('system', 'brand', 'protected_name', 'offensive', 'retired')),
  claimable_by_verification integer not null default 0,
  note text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table handle_history (
  id text primary key,
  profile_id text not null references profiles(id) on delete cascade,
  old_handle text not null,
  new_handle text not null,
  changed_by text not null check (changed_by in ('owner', 'admin')),
  hold_until text not null,
  redirect integer not null default 1,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
create index handle_history_old on handle_history(old_handle, hold_until);

-- ---------------------------------------------------------------- promos
create table promos (
  id text primary key,
  creator_profile_id text not null references profiles(id) on delete cascade,
  slug text not null,
  lang text not null default 'en',
  title text not null check (length(title) between 3 and 60),
  description text check (description is null or length(description) <= 280),
  i18n text,                             -- JSON {"title": {...}, "desc": {...}} for curated promos
  status text not null default 'draft' check (status in ('draft', 'in_review', 'live', 'rejected', 'paused', 'removed')),
  cta_kind text check (cta_kind in ('app_store', 'google_play', 'shop', 'etsy', 'watch', 'website', 'notify')),
  cta_url text,
  cta_safety_status text not null default 'pending' check (cta_safety_status in ('pending', 'safe', 'flagged', 'blocked')),
  has_perk integer not null default 0,
  is_pinned integer not null default 0,
  rights_confirmed_at text,
  rejection_code text, rejection_note text, fix_allowed integer,
  submitted_at text, approved_at text, live_at text, paused_at text,
  resolves_at text,
  hit_outcome text not null default 'pending' check (hit_outcome in ('pending', 'correct', 'incorrect', 'void')),
  verified_view_count integer not null default 0,
  public_view_bucket integer,
  click_count integer not null default 0,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  unique (creator_profile_id, slug)
);
create index promos_creator_status on promos(creator_profile_id, status, live_at desc);
create index promos_status_live on promos(status, live_at desc);

-- Video files. Uploaded promos use Cloudflare Stream; curated launch promos use static files.
create table promo_videos (
  id text primary key,
  promo_id text not null references promos(id) on delete cascade,
  label text not null default 'A' check (label in ('A', 'B')),
  stream_uid text,
  mp4_url text, webm_url text, poster_url text,
  duration_ms integer not null check (duration_ms between 5000 and 60500),
  width integer, height integer,
  unique (promo_id, label)
);

-- Hashtags: max 5 per promo, lowercase, letters (any language), digits, underscore.
create table hashtags (
  tag text primary key check (length(tag) between 2 and 30),
  use_count integer not null default 0,
  blocked integer not null default 0,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
create table promo_hashtags (
  promo_id text not null references promos(id) on delete cascade,
  tag text not null references hashtags(tag),
  position integer not null default 0,
  primary key (promo_id, tag)
);
create index promo_hashtags_tag on promo_hashtags(tag);

-- ---------------------------------------------------------------- social
create table follows (
  follower_profile_id text not null references profiles(id) on delete cascade,
  creator_profile_id text not null references profiles(id) on delete cascade,
  source text not null default 'other' check (source in ('profile', 'feed', 'explore', 'share', 'other')),
  source_promo_id text references promos(id) on delete set null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  primary key (follower_profile_id, creator_profile_id)
);
create index follows_creator on follows(creator_profile_id, created_at desc);

-- Votes ("calls"). Scouts only, one per promo.
create table calls (
  id text primary key,
  scout_profile_id text not null references profiles(id) on delete cascade,
  promo_id text not null references promos(id) on delete cascade,
  video_id text references promo_videos(id),
  choice text not null check (choice in ('will_blow_up', 'not_for_me')),
  voter_ordinal integer,
  is_valid integer not null default 1,
  invalid_reason text,
  score_eligible integer not null default 0,
  outcome text not null default 'pending' check (outcome in ('pending', 'correct', 'incorrect', 'void')),
  multiplier integer,
  score_delta integer,
  is_called_it integer not null default 0,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  resolved_at text,
  unique (scout_profile_id, promo_id)
);
create index calls_promo on calls(promo_id, created_at);
create index calls_scout_recent on calls(scout_profile_id, created_at desc);

create table saves (
  scout_profile_id text not null references profiles(id) on delete cascade,
  promo_id text not null references promos(id) on delete cascade,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  primary key (scout_profile_id, promo_id)
);
create index saves_recent on saves(scout_profile_id, created_at desc);

-- Valid views: at least 3 seconds, one per viewer per promo per day.
-- viewer_key is the profile id, or a random device id for guests (weight 0.5 in charts).
-- Boosted impressions are flagged and never count toward charts.
create table view_events (
  promo_id text not null references promos(id) on delete cascade,
  viewer_key text not null,
  day text not null,                     -- YYYY-MM-DD UTC
  is_guest integer not null default 0,
  is_boost integer not null default 0,
  max_seconds integer not null default 3,
  completed integer not null default 0,
  country_code text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  primary key (promo_id, viewer_key, day)
);
create index view_events_day on view_events(day, promo_id);

create table click_events (
  promo_id text not null references promos(id) on delete cascade,
  viewer_key text not null,
  day text not null,
  is_guest integer not null default 0,
  is_boost integer not null default 0,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  primary key (promo_id, viewer_key, day)
);
create index click_events_day on click_events(day, promo_id);

create table scout_stats (
  profile_id text primary key references profiles(id) on delete cascade,
  scout_score integer not null default 0 check (scout_score >= 0),
  level integer not null default 1,
  calls_resolved_wbu integer not null default 0,
  calls_correct_wbu integer not null default 0,
  called_it_count integer not null default 0,
  current_streak_weeks integer not null default 0,
  best_streak_weeks integer not null default 0,
  freezes_available integer not null default 0 check (freezes_available <= 2),
  best_weekly_rank integer,
  current_week_rank integer,
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
create index scout_stats_score on scout_stats(scout_score desc);

create table score_events (
  id integer primary key autoincrement,
  profile_id text not null references profiles(id) on delete cascade,
  delta integer not null,
  reason text not null check (reason in ('call_correct', 'call_incorrect', 'admin_adjustment', 'fraud_reversal')),
  call_id text references calls(id) on delete set null,
  note text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
create index score_events_profile on score_events(profile_id, created_at desc);

create table badges (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text not null,
  icon text not null,
  applies_to text not null check (applies_to in ('scout', 'creator')),
  tier integer not null default 1,
  is_active integer not null default 1
);

create table profile_badges (
  profile_id text not null references profiles(id) on delete cascade,
  badge_id text not null references badges(id),
  awarded_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ref text,                              -- JSON
  hidden_by_owner integer not null default 0,
  revoked_at text,
  primary key (profile_id, badge_id, awarded_at)
);

-- Charts: day, week, month. Organic only (no boost), see docs/04 section 1.
create table rankings (
  period_kind text not null check (period_kind in ('day', 'week', 'month')),
  period text not null,                  -- '2026-10-06', '2026-W41', '2026-10'
  metric text not null check (metric in ('views', 'clicks', 'hit_score', 'rising', 'scout_pick', 'scout_score')),
  scope text not null check (scope in ('promo', 'scout')),
  category text not null default 'all',
  rank integer not null,
  entity_id text not null,
  score real not null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  primary key (period_kind, period, metric, scope, category, rank)
);
create index rankings_entity on rankings(entity_id, period desc);

-- ---------------------------------------------------------------- safety
create table blocks (
  blocker_profile_id text not null references profiles(id) on delete cascade,
  blocked_profile_id text not null references profiles(id) on delete cascade,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  primary key (blocker_profile_id, blocked_profile_id)
);
create index blocks_blocked on blocks(blocked_profile_id);

create table reports (
  id text primary key,
  reporter_user_id text references "user"(id) on delete set null,
  target_type text not null check (target_type in ('profile', 'avatar', 'banner', 'display_name', 'bio', 'link', 'promo', 'perk', 'hashtag')),
  target_id text not null,
  target_profile_id text references profiles(id) on delete cascade,
  reason text not null check (reason in ('impersonation', 'spam_or_scam', 'malicious_link', 'nudity_or_sexual', 'hate_or_harassment', 'violence', 'copyright', 'trademark', 'minor', 'misleading_perk', 'perk_not_working', 'asks_for_votes_or_follows', 'other')),
  details text check (details is null or length(details) <= 500),
  status text not null default 'open' check (status in ('open', 'in_review', 'actioned', 'dismissed')),
  priority integer not null default 3,
  assigned_to text references "user"(id) on delete set null,
  resolution_note text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  resolved_at text
);
create index reports_queue on reports(status, priority, created_at);
create index reports_target on reports(target_profile_id, created_at desc);

create table verification_requests (
  id text primary key,
  profile_id text not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('link_ownership', 'verified_badge', 'handle_claim')),
  link_id text references profile_links(id) on delete cascade,
  evidence text,                         -- JSON
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewer_id text references "user"(id) on delete set null,
  decision_note text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  decided_at text
);

create table strikes (
  id text primary key,
  profile_id text not null references profiles(id) on delete cascade,
  reason_code text not null,
  report_id text references reports(id),
  issued_by text references "user"(id) on delete set null,
  expires_at text not null,
  appealed integer not null default 0,
  overturned_at text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table moderation_actions (
  id integer primary key autoincrement,
  actor_user_id text not null references "user"(id),
  target_profile_id text references profiles(id) on delete set null,
  target_type text not null,
  target_id text,
  action text not null,
  reason_code text not null,
  before_json text, after_json text,
  statement_sent_at text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Link safety scans (docs/04 section 4.3). Rescanned daily while live.
create table link_scans (
  id text primary key,
  url text not null,
  final_url text,
  redirect_count integer,
  verdict text not null check (verdict in ('safe', 'flagged', 'blocked', 'error')),
  reasons text,                          -- JSON
  scanned_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
create index link_scans_url on link_scans(url, scanned_at desc);

create table pii_access_log (
  id integer primary key autoincrement,
  staff_user_id text not null references "user"(id),
  subject_user_id text not null,
  fields text not null,                  -- JSON array
  context text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- ---------------------------------------------------------------- perks
-- Codes are shown only to signed in users with a verified email, never in page source.
-- Never tied to votes, follows or reviews.
create table perks (
  id text primary key,
  promo_id text references promos(id) on delete cascade,
  creator_profile_id text not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('code', 'steam_key', 'beta_invite', 'discount')),
  mode text not null default 'shared' check (mode in ('shared', 'unique')),
  title text not null check (length(title) between 3 and 60),
  description text check (description is null or length(description) <= 200),
  i18n text,
  redeem_url text,
  region text,
  stock_total integer check (stock_total is null or stock_total between 1 and 10000),
  stock_left integer,
  starts_at text not null,
  ends_at text not null,
  not_working_reports integer not null default 0,
  status text not null default 'in_review' check (status in ('in_review', 'active', 'paused', 'ended', 'removed')),
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
create index perks_creator on perks(creator_profile_id, status);

-- Code values are encrypted by the API with the PERK_KEY secret (AES-GCM).
create table perk_codes (
  id text primary key,
  perk_id text not null references perks(id) on delete cascade,
  code_encrypted text not null,
  claimed_by_user_id text references "user"(id) on delete set null,
  claimed_at text
);
create index perk_codes_free on perk_codes(perk_id, claimed_by_user_id);

create table perk_claims (
  perk_id text not null references perks(id) on delete cascade,
  user_id text not null references "user"(id) on delete cascade,
  code_id text references perk_codes(id),
  claimed_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  primary key (perk_id, user_id)
);

-- ---------------------------------------------------------------- payments (in-app only)
-- Apple and Google are merchant of record. We store transaction ids, never buyer identity or cards.
create table iap_products (
  id text primary key,                   -- same id in App Store Connect and Play Console, e.g. boost_3d
  kind text not null check (kind in ('boost', 'trailer_test', 'pro')),
  boost_hours integer,
  active integer not null default 1
);

create table purchases (
  id text primary key,
  profile_id text references profiles(id) on delete set null,  -- kept for tax records after account deletion
  store text not null check (store in ('app_store', 'play_store')),
  product_id text not null references iap_products(id),
  store_transaction_id text not null unique,
  environment text not null check (environment in ('production', 'sandbox')),
  status text not null default 'active' check (status in ('active', 'consumed', 'refunded', 'revoked')),
  purchased_at text not null,
  refunded_at text,
  raw_event text,                        -- JSON from RevenueCat, for audits
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
create index purchases_profile on purchases(profile_id, created_at desc);

create table boosts (
  id text primary key,
  purchase_id text not null unique references purchases(id),
  promo_id text not null references promos(id) on delete cascade,
  starts_at text not null,
  ends_at text not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'running', 'done', 'stopped_refund', 'stopped_moderation')),
  impressions integer not null default 0,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
create index boosts_running on boosts(status, ends_at);

-- ---------------------------------------------------------------- privacy
create table data_requests (
  id text primary key,
  user_id text not null references "user"(id) on delete cascade,
  kind text not null check (kind in ('export', 'delete_account')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'cancelled')),
  download_key text, expires_at text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  completed_at text
);

-- ---------------------------------------------------------------- seed reference data
insert into iap_products (id, kind, boost_hours) values
  ('boost_1d', 'boost', 24), ('boost_3d', 'boost', 72), ('boost_7d', 'boost', 168), ('trailer_test', 'trailer_test', null);

insert into reserved_handles (handle, reason) values
  ('admin','system'),('api','system'),('app','system'),('about','system'),('help','system'),('support','system'),
  ('settings','system'),('account','system'),('login','system'),('logout','system'),('signin','system'),('signup','system'),
  ('register','system'),('auth','system'),('oauth','system'),('callback','system'),('explore','system'),('discover','system'),
  ('search','system'),('top','system'),('rankings','system'),('leaderboard','system'),('drop','system'),('today','system'),
  ('feed','system'),('home','system'),('new','system'),('edit','system'),('promo','system'),('promos','system'),
  ('creator','system'),('creators','system'),('scout','system'),('scouts','system'),('studio','system'),('panel','system'),
  ('dashboard','system'),('report','system'),('reports','system'),('verify','system'),('verified','system'),('terms','system'),
  ('privacy','system'),('legal','system'),('dmca','system'),('copyright','system'),('security','system'),('status','system'),
  ('blog','system'),('press','system'),('jobs','system'),('careers','system'),('pricing','system'),('advertise','system'),
  ('ads','system'),('brand','system'),('brands','system'),('embed','system'),('widget','system'),('cdn','system'),
  ('static','system'),('assets','system'),('media','system'),('sitemap','system'),('robots','system'),('favicon','system'),
  ('www','system'),('mail','system'),('email','system'),('hello','system'),('noreply','system'),('null','system'),
  ('undefined','system'),('root','system'),('system','system'),('staff','system'),('team','system'),('mod','system'),
  ('moderator','system'),('official','system'),('test','system'),('demo','system'),('promovote','system'),('boost','system'),
  ('perks','system'),('wallet','system'),('inbox','system'),('upload','system');
