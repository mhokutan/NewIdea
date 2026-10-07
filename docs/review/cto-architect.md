# CTO / Backend and Platform review (2026-10-07)

Reviewer: CTO, backend and platform (second engineer; the mobile engineer covers the app in `docs/review/mobile-engineer.md`).
Domain score: **Backend completeness and platform safety** (does the API support what the app must do, safely, on the Cloudflare free tier).
Inputs: `docs/review/brief.md`, `CLAUDE.md`, `docs/00-idea-brief.md`, `docs/03-profiles-spec.md`, `docs/04-explore-charts-upload.md`, `docs/05-mobile-app-and-payments.md`, `services/api/src/index.js`, `services/api/src/auth.js`, `services/api/migrations/0001..0005`, `services/api/wrangler.jsonc`, `web/landing/src/index.js`, `web/landing/wrangler.jsonc`, `apps/mobile/src/lib/api.ts`, `docs/review/creator-economy-expert.md` (category taxonomy).

## 1. Summary

The schema is good. `0002_core.sql` already models media, links with safety status, perks with encrypted code pools, reports, strikes, boosts and charts. The API is clean, parameterized everywhere, and every write is scoped to the signed in profile, so I found **no IDOR**. The problem is that the API is read mostly: there is no write route for avatar, banner, links, perks, promos, stories or a follow feed. That is exactly the founder's "everything is missing". Two live issues need fixing before submission: the Top tab can be pushed by a script that posts fake guest views, and any signed in user can instantly limit any creator's profile with one "minor" report.

## 2. Scores

| # | Area | Score | Evidence |
|---|---|---|---|
| 1 | Retention | 5 | No follow feed, no stories row, no push hooks and no endpoint that tells the app what the viewer already voted or saved, so nothing on the server pulls a user back tomorrow. |
| 2 | Session time | 6 | `/v1/feed` returns up to 300 promos in one call and the fair rotation runs on the device, which is fine for 21 promos but gives no follow or story surfaces to extend a session. |
| 3 | Originality | 7 | Calls, hit outcome, Scout Score and "called it" are modeled (`calls.outcome`, `scout_stats`) and are clearly not a TikTok clone, but no job resolves them yet, so the user only sees a plain vote. |
| 4 | Trademark and trade dress safety | 8 | Route names, enums and seed data use our own words and brands; nothing in the backend uses third party marks (the "For you" label is an app side question). |
| 5 | Backend completeness and platform safety | 4 | Missing write APIs for every item the founder flagged, Top tab is gameable with random guest device ids, the "minor" report is an abuse lever, and no rate limits exist on `/v1` writes. |

## 3. Code review findings

### 3.1 Security

| # | Severity | Finding | Where | Fix |
|---|---|---|---|---|
| S1 | High | **Top tab is gameable.** Guests send any random `deviceId` and each counts 0.5 in Top. 100 curl calls with fresh ids push any promo past `TOP_MIN_VIEWS = 50`. `seconds` and `completed` are trusted from the client and capped at 600, not at the video length. | `index.js` 162 to 189, 504 to 526 | Guest weight 0 in Top until device attestation exists. Cap `seconds` at `duration_ms / 1000 + 1`. Add a `weight` column (section 5.7). |
| S2 | High | **Report abuse.** Any signed in user (even without a profile) can send `reason: "minor"` and the target profile goes to `limited` at once. No rate limit. One script can take down every creator, including the founder's 3. | `index.js` 532 to 547 | Require a finished profile, rate limit 10 reports per hour, and auto limit only when 2 distinct reporters with accounts older than 7 days report "minor" within 24 h, or a moderator confirms. Keep priority 1 alert. Never auto limit `founder_owned` or verified profiles. |
| S3 | Medium | **No rate limits on `/v1` writes.** Better Auth only limits `/api/auth/*`. Votes, follows, saves, events and reports are unlimited. | all `/v1` POST | Workers Rate Limiting binding (section 5.7). |
| S4 | Medium | **Top tab breaks above 100 promos.** D1 allows at most 100 bound parameters per query; `pr.id in (?, ?, ...)` with more than 100 qualifying promos throws a 500. | `index.js` 186 to 187 | Pass ids as one JSON string: `and pr.id in (select value from json_each(?))`. Same pattern for any future "ids" list. |
| S5 | Medium | **Admin is Basic auth only**, no lockout, no second factor, password strength unknown. This becomes high once the review queue (videos, avatars, reports) lives there. | `web/landing/src/index.js` 111 to 123, 176 | Put `/admin*` and the new review queue behind **Cloudflare Access** (Zero Trust free up to 50 users, one time PIN to the founder's email). Verify the `Cf-Access-Jwt-Assertion` header in the Worker. Keep Basic auth as a second layer if wanted. |
| S6 | Low | `trustedOrigins` includes `exp://` in production. Only needed for Expo Go in development. | `auth.js` 6 | Add `exp://` only when `DEV_LOG_OTP === "1"`, like localhost. |
| S7 | Low | Dead RevenueCat webhook. Founder decision 2026-10-06: no RevenueCat, own receipt verification. Returns 401 while the secret is unset, so it is safe today, but it is extra attack surface and the `purchases.raw_event` comment is stale. | `index.js` 571 to 604, `wrangler.jsonc` secrets comment | Delete now; add `POST /v1/iap/apple` and `/v1/iap/google` (server notification v2 JWS and Play RTDN) in v2 with Boost. |
| S8 | Low | No JSON body size limit and no Content-Type check on writes. | middleware | `hono/body-limit` 64 KB on `/v1/*`, reject non `application/json` on POST/PATCH (also closes any text/plain CSRF style request from the web). |
| S9 | Low | Onboarding does not check `handle_history.hold_until`, the handle check route does. | `index.js` 357 to 361 | Add the third select from `/v1/handles/:handle`. |
| S10 | Low | Blocks are not applied to reads (blocked creator still in feed, profile, follow). | `PROMO_SELECT`, `/v1/profiles/:handle` | P1: filter blocked creator ids for signed in viewers. |
| S11 | Low | `follower_count` update is a second statement after the insert, not in the same batch. Counts can drift under concurrency. | `index.js` 444 to 456 | Use `db.batch` with `update ... where changes() > 0` pattern, or recount in the daily job. |

What is already right: every SQL is parameterized; LIKE input is escaped; writes always use `v.profile.id` from the session, never an id from the body; boosts check `creator_profile_id = v.profile.id`; CORS allows only `https://promovote.com` (native apps send no Origin, so no CORS need); cookies are SameSite Lax by Better Auth default; perk codes are planned AES-GCM encrypted; the landing Worker has strong CSP, escapes admin output and blocks CSV formula injection.

Rule for every new endpoint below: **owner bound SQL** (`where id = ? and creator_profile_id = ?`), never accept a profile id from the body, server generated ids for uploads, and `requireProfile(c, type)` on every write.

### 3.2 Data and schema

* **D1 cannot alter a CHECK constraint.** The new 7 category taxonomy (games, apps, streams, videos, shops, brands, local, from the creator expert) needs a table rebuild of `creator_details` (create new, copy, drop, rename) in one migration. Same for any new `profile_links.platform` or `promos.cta_kind`. Recommendation: in migration 0006 rebuild these three tables once and drop the enum CHECKs for platform, category and cta_kind; validate in the API from one `CONFIG` object (and a `creator_tags` table) so new values never need a rebuild again. Update the `CATEGORIES` constant and the `kinds` map in `index.js` 10 and 352.
* **Deletion audit row is lost.** `data_requests.user_id` cascades on user delete, so the daily job deletes the "done" row it just wrote. Make `user_id` nullable with `on delete set null` and keep a hashed user id for the audit.
* **Votes vanish on account deletion** (`calls` cascade with the profile), but `docs/03` 6.7 says votes stay as anonymized aggregates. Fine for launch; before charts open, make `calls.scout_profile_id` `on delete set null` and keep the row.
* **R2 objects of deleted users** must be deleted by the daily job (privacy promise in `docs/03` 3.1.3 and 6.7).
* No endpoint returns the viewer's own state per promo (voted, saved, following). After an app restart the buttons look unvoted and a tap returns 409 `already_voted`, which the app shows as "nothing happens". This is part of the founder's bug 3 on the backend side.

### 3.3 Website Worker (`web/landing/src/index.js`)

* `serveMedia` reads the whole video into memory (`arrayBuffer`) for every Range request and every video byte goes through a Worker invocation (`run_worker_first: true`). Safari and iOS AVPlayer send several Range requests per play. The mobile app also plays these same URLs. This burns the shared 100k requests per day and risks the 10 ms CPU limit on large files. Workers static assets also cap files at 25 MiB.
* Fix: move all promo media to an R2 bucket with a custom domain `media.promovote.com` (native Range support, CDN cached, free egress, no Worker invocation). Keep `/media/*` on the website as a 301 to the new host for old links.
* The hardcoded `PERKS` object (NEWIDEA25) should move into the API `perks` table so web and app share one source.
* Waitlist upsert lets anyone overwrite the role and link of an existing email (no proof). Low risk, note only.

### 3.4 Daily cron

* `triggers.crons: ["17 4 * * *"]` with `workers_dev: false`. Cloudflare requires the account's workers.dev subdomain to exist before cron triggers deploy; it is created when the founder opens Workers and Pages in the dashboard once (pending founder action in `CLAUDE.md`). Until then the 30 day hard delete promised to Apple (5.1.1(v)) does not run.
* How to know it works: after the founder action, `npx wrangler deploy` shows the schedule, the dashboard Triggers tab lists it, and a new `job_runs` table gets one row per day. Add `lastDailyRun` to `/health` and show it in admin; red if older than 26 h.
* Jobs to add: perk expiry (`status = 'ended'` after `ends_at`), story row cleanup, website link rescans (`docs/04` 4.3 step 5), R2 cleanup for deleted users, purge `rateLimit` rows, anomaly flags for votes and views (section 5.7), and later call resolution and rankings.
* Use R2 **lifecycle rules** instead of cron where possible: delete `pending/` objects after 7 days and `stories/` objects after 2 days. Free and needs no code.

## 4. Cloudflare free tier cost

| Resource | Free limit | Our use at launch | Watch out |
|---|---|---|---|
| Workers requests | 100,000 per day, shared by both Workers | About 40 to 60 requests per active user per day today (feed, tabs, me, one view event per promo) | With media still on the landing Worker, about 1,500 DAU is the ceiling. Batch view events (one POST per 20 s or per 10 views) and move media to R2: ceiling goes to about 5,000 DAU. |
| Workers CPU | 10 ms per request | Fine for JSON routes | Image work must use the Images binding, never JS decoding. |
| D1 | 5M rows read, 100k rows written per day, 5 GB | Each view event writes the row plus its index | Batched events and the 1 row per viewer per promo per day rule keep this far below limits. |
| R2 | 10 GB storage, 1M Class A, 10M Class B per month, free egress | A 30 s 720p video at about 2 Mbps is about 7.5 MB; 10 GB holds about 1,300 videos | Above that $0.015 per GB month: 100 GB is about $1.50 per month. |
| Images binding (transform) | 5,000 unique transformations per month | 1 avatar or banner = 2 to 4 variants | Enough for about 1,500 profile images per month; then $0.50 per 1,000. |
| Workers AI | 10,000 neurons per day | Vision check on avatars, banners and 3 frames per video | Measure neurons per image in week 1; if the quota runs out, items fall back to the manual queue, never auto approve. |
| Rate Limiting binding, Turnstile, Cloudflare Access (50 users), CSAM Scanning Tool | Free | | |
| App Attest | Free | | Play Integrity standard: 10,000 calls per day free; we call it once per install, not per vote. |

Honest recommendation: stay on free for TestFlight and the store review. Move to **Workers Paid ($5 per month)** before public launch. It removes the 100k per day wall (10M per month included), raises CPU to 30 s, raises D1 limits, and unlocks Cloudflare Email Sending, which email sign in and perk emails need anyway. Expected total at 1,000 to 10,000 DAU: $5 to $25 per month. Cloudflare Stream stays a later step (decided).

## 5. Minimum API for the missing features

All routes are under `https://api.promovote.com`, JSON, session from Better Auth. "C" = creator only, "S" = scout only, "A" = any finished profile, "G" = guest allowed.

### 5.1 Profile edit

| Route | Who | Notes |
|---|---|---|
| `GET /v1/me/studio` | C | One call for the owner view: profile, links (all statuses), media status, upload quota left this month, perks with stock and claim counts, promos by status. |
| `PATCH /v1/me` (extend) | A | Add: `category` (primary) and `secondaryCategories` (max 2), `tags` (1 to 5 from `creator_tags`), `releaseStatus`, `iosStatus`, `androidStatus`, `website` shortcut. Display name: NFC, collapse spaces, max 80 code points, block URLs, zero width chars, check mark lookalikes, "promovote", "official", "verified", "admin", "staff" (`docs/03` 3.1.2). Bio: add email and phone patterns, max 4 line breaks. Change limits: name 3 per 30 days for creators (count in `moderation_actions` or a small `profile_changes` table). |

### 5.2 Avatar and banner upload (R2, signed URLs)

Buckets: `promovote-uploads` (private, all raw uploads) and `promovote-media` (public, custom domain `media.promovote.com`, CDN cached, CSAM Scanning Tool enabled on the zone).

1. `POST /v1/uploads` (A for avatar; C for banner, video, story). Body: `{ kind, mime, bytes, width, height, durationMs? }`. Server checks kind, mime, size, dimensions and quota, creates an `uploads` row (`pending_upload`), and returns `{ uploadId, url, headers, expiresAt }`: an R2 S3 presigned PUT valid 10 minutes, with `Content-Type` and `Content-Length` in the signed headers so R2 rejects any other size or type. Key: `pending/{profileId}/{uploadId}`. Needs R2 S3 keys as Worker secrets (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`) and the small `aws4fetch` library. Fallback if we want no S3 keys: `PUT /v1/uploads/:id` streams the body into `env.UPLOADS.put()` with the same checks (free plan body limit is 100 MB, enough).
2. Client PUTs the file directly to R2.
3. `POST /v1/uploads/:id/complete` (owner only). Server: `head()` the object and compare size; read the first 64 KB and check magic bytes (JPEG `FFD8FF`, PNG `89504E47`, WebP `RIFF....WEBP`); run the Images binding to make WebP variants (avatar 400, 192, 96; banner 1500x500, 750x250, quality 82), which also **strips EXIF and GPS**; write variants to `promovote-media/a/{mediaId}-{size}.webp`; delete the original; run moderation; set `media_assets.moderation_status`.
4. Owner sees the new image at once with "Under review" if not yet approved; public keeps the old image or the monogram until approved (`docs/03` 3.1.3).

Limits: avatar JPEG/PNG/WebP, max 5 MB, 200 to 4096 px, 1:1 crop on device, HEIC converted on device. Banner max 8 MB, min 1200x400. 10 image uploads per hour per account.

Image moderation on the free tier, three layers:
* **Cloudflare CSAM Scanning Tool** on the media zone (free; must be on before any user upload is public).
* **Workers AI vision model** (for example a Llama 3.2 Vision or LLaVA model) asked for JSON labels: nudity, sexual, gore, hate symbol, contains text with contact info or URL, looks like a minor. Clear pass: approve. Clear fail: reject with reason. Anything else or AI quota exhausted: manual queue. Never auto approve on error.
* **Human**: grey zone, reports, and the first upload of every new creator (moderator sees the full profile card in the queue, `docs/03` 6.4).

### 5.3 Profile links with safety checks

| Route | Who | Notes |
|---|---|---|
| `POST /v1/me/links` | C (scouts later) | `{ platform, url, label? }`, max 8 links. |
| `PATCH /v1/me/links/:id` | owner | label, position. |
| `DELETE /v1/me/links/:id` | owner | |
| `POST /v1/links/:id/click` | G | Counts, then the app opens the URL with an "You are leaving PromoVote" sheet for non allowlisted hosts. |

Checks in order (sync part under 3 s):
1. Parse with `new URL`; https only; no user:pass, no IP literal host, no non default port, max 500 chars.
2. Reject known shorteners (bit.ly, tinyurl.com, t.co, goo.gl, is.gd, cutt.ly, rebrand.ly and similar list in config).
3. Platform host allowlist: youtube.com, youtu.be, twitch.tv, kick.com, tiktok.com, instagram.com, x.com, twitter.com, store.steampowered.com, apps.apple.com, play.google.com, etsy.com and *.etsy.com, discord.gg, discord.com, itch.io and *.itch.io, plus the new platforms the creator expert adds. Platform must match the host. Match = `safety_status = 'safe'` at once.
4. `website` (any domain): `pending`, then in `ctx.waitUntil`: follow redirects manually (max 5 hops, 3 s), store `final_url` in `link_scans`, check the final host against our denylist, URLhaus, and Google **Web Risk** (the commercial version of Safe Browsing; verify current free quota) or the free Cloudflare URL Scanner API. Punycode hosts (`xn--`) go to manual review. Pass: `safe`. Fail: `blocked` and a strike if malware or phishing.
5. Daily cron rescans `website` links; a newly flagged link pauses the creator's promos that use it (`docs/04` 4.3).

Only `safe` links are public (already true in `GET /v1/profiles/:handle`). The owner sees all statuses in `/v1/me/studio`.

### 5.4 Perks and promo codes (never tied to votes)

| Route | Who | Notes |
|---|---|---|
| `POST /v1/perks` | C | `{ promoId?, kind, mode: 'shared' or 'unique', title (3 to 60), description (max 200), redeemUrl?, region?, startsAt, endsAt (max 6 months), code? (shared, 3 to 30 letters and digits), codes? (unique, up to 10,000 lines), stockTotal? }`. Codes encrypted with AES-GCM (`PERK_KEY` secret), plus an HMAC per code to reject duplicates. First perk of a creator goes to `in_review`, later ones `active`. Redeem URL goes through 5.3 checks. Closed categories: rejected. |
| `PATCH /v1/perks/:id` | owner | pause, resume, new end date, add codes. |
| `GET /v1/perks/:id` | G | Public card: title, creator, stock state ("42 left" or "Limited"), ends at. Never the code. Promo and profile responses add `perk: {id, title, stock, endsAt}`. |
| `POST /v1/perks/:id/claim` | S | Returns the code once and stores it in the wallet. |
| `GET /v1/me/perks` | S | Wallet, decrypts the user's codes. |
| `POST /v1/perks/:id/not-working` | S, claimers only | 5 distinct reports = auto pause and a moderation item (`docs/04` 4.4). |

Claim eligibility (from `docs/03` 3.2.8): finished scout profile, verified email (Apple and Google count), age 18+ confirmed, account age at least 7 days (founder may lower to 24 h for launch), 1 claim per account per perk, 3 claims per account per day, 1 claim per attested device per perk once attestation exists. **The claim handler never reads `calls`, `follows` or `saves`.** Add a test that greps the handler for these table names and fails if found (`docs/03` 553).

Atomic claim with no race (one D1 batch is one transaction, and D1 runs writes one at a time):

```sql
-- unique codes
insert into perk_claims (perk_id, user_id)
  select ?1, ?2 where exists (select 1 from perk_codes where perk_id = ?1 and claimed_by_user_id is null);
update perk_codes set claimed_by_user_id = ?2, claimed_at = ?3
  where id = (select id from perk_codes where perk_id = ?1 and claimed_by_user_id is null limit 1)
  and exists (select 1 from perk_claims where perk_id = ?1 and user_id = ?2 and code_id is null);
update perk_claims set code_id = (select id from perk_codes where perk_id = ?1 and claimed_by_user_id = ?2)
  where perk_id = ?1 and user_id = ?2;
-- shared code with stock: insert the claim only if stock_left is null or > 0, then decrement stock_left in the same batch.
```

A duplicate claim fails on the `perk_claims` primary key and the whole batch rolls back. Creators see stock and claim counts only, never who claimed.

### 5.5 Video upload to R2 (720p on device)

Device: compress to 720p (H.264, about 2 Mbps, AAC, faststart) and make 3 JPEG frames at 25, 50 and 75 percent.

| Step | Route | Rules |
|---|---|---|
| Ask | `POST /v1/uploads` `{kind: 'video', mime: 'video/mp4', bytes, durationMs, width, height, frames: 3}` | Creator only, profile has avatar (`docs/03` 3.1.3). Duration 10,000 to 30,500 ms (paid 60,500 later). Max 40 MB (720p 30 s is about 8 MB; the 200 MB in `docs/04` 4.1 was for raw uploads, not needed with device compression). Height up to 1280. Quota: 10 per calendar month, 5 in the first 30 days after `profiles.created_at`, counted from `uploads` rows of kind video that reached `complete` (rejected still count, so spam is not free). Max 15 live promos (`creator_details.live_slot_limit`). Returns one presigned PUT for the video and 3 for the frames. |
| Upload | direct PUT to R2 | |
| Finish | `POST /v1/uploads/:id/complete` | Size check, `ftyp` box check, read `mvhd` from the `moov` box (range read the head; if not there, the tail) for real duration, tolerance 0.5 s. Frames go through the Workers AI check. |
| Publish | `POST /v1/promos` `{uploadId, title, description, lang, category, tags (max 5), ctaKind, ctaUrl, rightsConfirmed: true}` | Title 3 to 60, description max 280 without links, CTA through 5.3 checks. Status: `in_review` if the creator has fewer than 3 approved promos, if AI is not a clear pass, or if the CTA host is not allowlisted. Otherwise `live`, with a random 10 percent going to a spot check list. Stores `rights_confirmed_at`. |
| Manage | `PATCH /v1/promos/:id` (owner: title, description, tags, pause), `DELETE /v1/promos/:id` (owner: status `removed`, objects deleted by cron) | |

Admin review queue (behind Cloudflare Access): `GET /admin/queue?type=promo|media|link|perk|report`, `POST /admin/promos/:id/approve`, `POST /admin/promos/:id/reject {code, note, fixAllowed}`. Approve copies `pending/...` to `promovote-media/v/{promoId}.mp4` and the poster, fills `promo_videos`, sets `live_at`, and writes `moderation_actions`. Reject keeps the file in `pending/` for the 7 day lifecycle so the creator can see why. My recommendation: build the queue in the API Worker on `admin.promovote.com` (it owns D1 and R2) and link to it from the current waitlist admin. Target SLA 24 h, the founder reviews from the phone browser.

### 5.6 Stories and the follow feed

New tables (migration 0006):

```sql
create table stories (
  id text primary key,
  creator_profile_id text not null references profiles(id) on delete cascade,
  upload_id text not null,
  kind text not null,                       -- 'video' (max 15 s) or 'image'
  media_url text, poster_url text, duration_ms integer,
  cta_kind text, cta_url text,              -- optional, same link checks
  status text not null default 'pending',   -- pending, live, removed
  created_at text not null, expires_at text not null   -- created_at + 24 h
);
create index stories_live on stories(creator_profile_id, expires_at);
create table story_views (
  story_id text not null references stories(id) on delete cascade,
  viewer_profile_id text not null references profiles(id) on delete cascade,
  viewed_at text not null,
  primary key (story_id, viewer_profile_id)
);
```

| Route | Who | Notes |
|---|---|---|
| `POST /v1/stories` | C | `{uploadId, ctaUrl?}`. Only creators with at least 3 approved promos (trusted). Free limit 3 stories per 24 h from `creator_details.story_daily_limit` (new column, so a Pro tier later is a number change, not a schema change). AI frame check, then live; reports go to the queue. |
| `DELETE /v1/stories/:id` | owner | |
| `GET /v1/stories/row` | G | Signed in: creators I follow with live stories (`expires_at > now`), unseen first, then newest. Guest or no follows: featured creators with live stories, so the row is never empty. Max 30 creators. |
| `POST /v1/stories/seen` | A | `{ids: [...]}` batched, `insert or ignore`. |
| `GET /v1/feed/following?cursor=` | A | Live promos of followed creators, keyset paging on `(live_at, id)`, 20 per page. Uses the existing `follows` primary key and `promos_creator_status` index. |
| `GET /v1/me/following` | A | List of followed creators for the profile tab. |
| `GET /v1/me/state?promoIds=` | A | `{voted: {id: choice}, saved: [ids], following: [handles]}` with ids passed through `json_each`, max 100. Fixes buttons that look unvoted after a restart. |

Expiry: queries filter on `expires_at`, so a story disappears at 24 h even if no job runs. R2 lifecycle deletes `stories/` objects after 2 days; the daily cron deletes old rows.

### 5.7 Anti bot for votes and views

Layer 1, device attestation (P1, needed before charts open, not for TestFlight):
* `GET /v1/devices/challenge` returns a random nonce (stored 5 minutes).
* `POST /v1/devices/attest` with iOS App Attest `{keyId, attestation}` or Android Play Integrity `{integrityToken}`.
  * iOS: verify the CBOR attestation, the certificate chain to the Apple App Attestation root, `rpIdHash = sha256(teamId + "." + bundleId)`, the nonce, and the counter.
  * Android: call the Play Integrity `decodeIntegrityToken` API with a service account (Worker secret), require `PLAY_RECOGNIZED`, `MEETS_DEVICE_INTEGRITY` and the matching nonce.
* The server stores a `devices` row and returns our own HMAC signed device token (30 days). The app sends it as `X-PV-Device` on votes, views and claims. Attest once per install. Per vote assertions come later only if fraud appears. Client side, use Expo's app integrity module (check the exact package name for SDK 57); it needs a dev build, not Expo Go.
* Devices that cannot attest (web, simulator, old phones) still work, but their weight is 0 for charts.

Layer 2, rate limits (Workers Rate Limiting binding, period 10 or 60 s, plus D1 daily counts):

| Action | Limit |
|---|---|
| Vote | 20 per minute and 500 per day per profile |
| View event | 120 per minute per device, 300 counted views per day per viewer |
| Follow, save | 60 per minute per profile |
| Report | 10 per hour per user |
| Upload ask | 10 per hour per profile |
| Perk claim | 3 per day per account, 10 per minute per IP |
| Handle check, onboarding | 30 per minute per IP |
| Guest events | 60 per minute per IP |

Layer 3, server rules and weighting (hidden, charts only; the user always sees their own vote):
* A vote is `score_eligible` only if the same viewer has a `view_events` row for that promo with at least 3 s (the app must flush the view before the vote).
* `seconds` is capped at the video length plus 1 s; `completed` only counts when `seconds >= duration - 1`.
* New column `weight real` on `view_events` and `calls`. Weight: unattested guest 0, attested guest 0.3, scout account under 24 h 0.5, attested scout older than 7 days 1.0. A device with more than 3 accounts gives 0 to the extra accounts. Hosting provider ASNs (from `request.cf.asn`, list in config) give 0.
* Top and charts use `sum(weight)`; Boost never counts (already `is_boost = 0`).
* Daily anomaly job: a promo whose weighted views come more than 50 percent from accounts under 24 h old or from one ASN is flagged, removed from Top and queued for review. Confirmed vote fraud = suspension (`docs/03` 6.4).

### 5.8 Migration 0006 (one file)

Rebuild `creator_details`, `profile_links` and `promos` without enum CHECKs for category, platform and cta_kind (validated in the API); add `promos.category`; new `creator_categories`, `creator_tags`, `uploads`, `stories`, `story_views`, `devices`, `job_runs`, `profile_changes`; add `view_events.weight`, `calls.weight`, `creator_details.story_daily_limit`, `perk_codes.code_hmac`; make `data_requests.user_id` nullable with `on delete set null`; extend `media_assets.kind` with video, frame and story (also a rebuild). Test it on a local copy first: `npx wrangler d1 migrations apply promovote-db --local`, run the seed, then remote.

## 6. Prioritized minimum changes

Time estimates assume one person working with Claude, full working days, backend only (the app screens are in the mobile engineer's report).

### P0, before App Store submission

| # | What | Where | Why | Done when | Time |
|---|---|---|---|---|---|
| 1 | Fix Top gaming and the 100 parameter limit: guest weight 0, `seconds` capped at video length, `json_each` for ids. | `index.js` 162 to 189, 515 to 522 | S1, S4. A script can put any promo in Top today; above 100 promos the tab returns 500. | 200 curl calls with random device ids leave Top empty; a local test with 150 promos returns 200 OK. | 0.5 day |
| 2 | Report abuse fix, Workers Rate Limiting on all `/v1` writes, body limit and JSON Content-Type check, remove `exp://` in prod and the RevenueCat route. | `index.js` 532 to 547, middleware, `auth.js` 6, `wrangler.jsonc` | S2, S3, S6, S7, S8. One request can hide any creator; no write is limited. | One "minor" report no longer changes status; the 21st vote in a minute returns 429 with code `rate_limited`. | 1 day |
| 3 | Profile edit: extend `PATCH /v1/me`, add `GET /v1/me/studio`, links CRUD with the sync safety checks (allowlist, shorteners, https) and async scan. | new routes, migration 0006 | Founder items 1 and 2: creator page "completely empty". | A new creator adds bio, category, 3 links on a phone; allowlisted links show at once, a bit.ly link is refused with a clear message. | 2 days |
| 4 | Avatar and banner upload: R2 buckets, presigned PUT, complete step with Images binding (variants, EXIF strip), Workers AI check, CSAM tool on, admin queue behind Cloudflare Access. | new `uploads` routes, `admin.promovote.com` | Founder item 2 ("no profile picture") and Apple guideline 1.2 (UGC needs filtering and moderation). | An uploaded JPEG with GPS data comes back as WebP without EXIF; owner sees it at once, public after approval; a test nude image lands in the queue, not public. | 2 days |
| 5 | Video upload with 100 percent manual review for each creator's first 3 promos, monthly quota, promo create, admin approve copies to `media.promovote.com`. | `uploads`, `POST /v1/promos`, admin queue | Founder item 8: completeness is P0; a creator account with no way to post is a parked handle and fails review as a dead end. | A creator uploads a 20 s clip from the phone, it shows "In review", the founder approves on the phone, it plays in the New tab within a minute; a 45 s clip or the 11th upload of the month is refused with a clear message. | 3 days |
| 6 | Perks MVP: shared code mode, create, public card, claim, wallet, not working reports; seed NEWIDEA25 into the table. Unique code pools in P1. | `perks` routes | Founder item 2 ("no promo code / perk creation"). | Nicheable perk claimed in the app, code appears in the wallet, a second claim returns 409, the test that greps for `calls` and `follows` in the claim code passes. | 1.5 days |
| 7 | Viewer state and follow feed: `GET /v1/me/state`, `GET /v1/feed/following`, `GET /v1/me/following`; clear error codes the app can show. | new routes | Founder item 3 (buttons "just sit there" after restart) and retention (a reason to come back: new promos from people you follow). | After an app restart voted promos show the vote; following 1 creator shows only that creator's promos in a Following list. | 1 day |
| 8 | Cron verified and observable: founder opens Workers and Pages once, redeploy, `job_runs` heartbeat in `/health` and admin, fix `data_requests` cascade, add R2 cleanup for deleted users, lifecycle rules on both buckets. | `daily()`, `wrangler.jsonc`, migration 0006 | Apple 5.1.1(v) deletion promise and privacy promise for media. | `job_runs` gets a row every day; a test account deleted 30 days ago (backdated row) is gone after the next run, including its R2 files. | 0.5 day |

P0 total: about 11 to 12 working days of backend work.

### P1, before public launch

1. Stories (5.6) with the follow row and guest fallback. 2 days.
2. Device attestation (App Attest, Play Integrity), `weight` columns, anomaly job, vote requires a prior view (5.7). 3 days.
3. Move all promo media from the landing Worker to `media.promovote.com` (R2), 301 the old `/media/*` paths. 0.5 day.
4. Batch view events in one POST (with the mobile engineer). 0.5 day.
5. Workers Paid ($5 per month) and Email Sending; perk emails for opted in scouts (CAN-SPAM footer). 1 day.
6. Unique code pools for perks, daily link rescans, perk expiry in cron, blocks applied to reads. 1.5 days.
7. Push notifications through Expo push (free): new promo from a followed creator, your call resolved. Needs a `push_tokens` table. 1.5 days.
8. Call resolution job (hit outcome, Scout Score, "called it") so the original mechanic becomes visible. 2 days.

### P2, later

Cloudflare Stream when video traffic grows; per vote App Attest assertions if fraud appears; Pro stories as a paid extra (only a limit change); IAP receipt verification routes with Boost in v2; data export ZIP; OG images; server side fair rotation when accounts and data exist.

## 7. How the scores reach 8

| Area | Now | After P0 | After P1 | What moves it |
|---|---|---|---|---|
| Retention | 5 | 7 | 8 | Follow feed and real creator uploads (P0), stories row and push (P1). |
| Session time | 6 | 7 | 8 | Following list, creator profiles with real content and perks (P0), stories (P1). |
| Originality | 7 | 8 | 8 | Perks never tied to votes, verified safe links and creator uploads make our own model visible; call resolution (P1) shows "called it". |
| Trademark and trade dress | 8 | 8 | 8 | Keep own naming in new routes and copy (Calls, Scouts, Perks, Stories row with our ring style on the app side). |
| Backend completeness and safety | 4 | 8 | 9 | P0 items 1 to 8 close every missing write API and the two live abuse holes; P1 adds attestation and weighting before charts open. |

Legal notes in this report are not legal advice.

---

# Round 2 (2026-10-07)

Inputs: `docs/review/brief-r2.md`, commits 9e92933, 1fd6aba, dd9bdee, 71a08cb, 7424e9f, current `services/api/src/index.js` (943 lines), `src/auth.js`, `migrations/0006_profiles_categories.sql`, `wrangler.jsonc`, `apps/mobile/src/app/edit-profile.tsx` (image resize).

## R2.1 What was fixed from round 1

| Round 1 item | Status | Evidence |
|---|---|---|
| S1 Top gameable by guest ids | Fixed | Top counts only `is_guest = 0` views (`index.js` 191 to 194); seconds capped at video length plus 1 s (786 to 787). |
| S4 more than 100 bound params | Fixed | `json_each(?)` (205). |
| S2 one "minor" report limits a profile | Partly fixed | Now needs 2 distinct reporters in 7 days (817 to 821). See R2.3 B5. |
| S3 no rate limits, S8 no body cap | Partly fixed | `WRITE_LIMIT` 60 per minute per IP and 16 KB cap on `/v1` writes (37 to 46). See R2.3 B6. |
| S6 `exp://` in production | Fixed | `auth.js` 7 to 8. |
| S7 RevenueCat webhook | Fixed | Removed (847 to 848). The file header comment on line 3 still mentions RevenueCat; cosmetic. |
| Viewer state after restart | Fixed | `GET /v1/me/state` (725 to 745), scoped to the session profile, limit 500 per list. |
| Category taxonomy and CHECK rebuild | Fixed | 0006 rebuilds `creator_details` and `profile_links` without enum CHECKs; `CATEGORIES` and `KIND_BY_CATEGORY` in the API (11 to 12). |
| Profile edit, links, media, studio, scout profile | Built | 437 to 622. |
| Call resolution job | Built | `resolveCalls` (882 to 916). |

Security check of the new routes: every new write uses `requireProfile` with the right type (`/v1/me/links` creator, `/v1/me/studio` creator, `/v1/me/scout` scout, `/v1/me/media` any profile). All SQL is bound and scoped to `v.profile.id` or `v.user.id`; ids never come from the body. The `${kind}` column names in `/v1/me/media` come from a fixed whitelist, not user input. `/media/*` only serves keys that match a strict regex, with `nosniff`. **No IDOR and no SQL injection found.** `resolveCalls` is idempotent (only `outcome = 'pending'`), each call is one atomic batch, and the level formula is correct (`scout_score` on the right side of the UPDATE is the old value).

## R2.2 Scores

| # | Area | R1 | R2 | Evidence |
|---|---|---|---|---|
| 1 | Retention | 5 | 7 | State, Today's Drop, results after 7 days and the scout profile give real reasons to come back. But results only arrive if the daily cron runs, and the workers.dev subdomain is still listed as not enabled (`docs/02` line 38). At low traffic most calls will also resolve as "void" (10 later calls rule). |
| 2 | Session time | 6 | 8 | 7 promo Drop, then the endless fair rotation, plus Saved, Following, open calls and studio stats give enough surfaces per visit. |
| 3 | Originality | 7 | 8 | Calls that resolve, an early multiplier, "Called it" and a daily Drop are clearly our own mechanic, not a feed clone. |
| 4 | Trademark and trade dress | 8 | 8 | "Today's Drop", "Team picks" and "Calls" are our own words; "For you" is gone; no third party marks in routes or data. |
| 5 | Backend completeness and platform safety | 4 | 7 | Big step and no IDOR, but the cron is unverified, the Drop can change in the middle of a day, links can get around moderation, and media has no content check before R2 goes on. |

## R2.3 What still keeps a score below 8

### P0 (before App Store submission), smallest first

| # | What | Where | Why | Done when |
|---|---|---|---|---|
| B1 | **Make the Drop stable for the whole day.** Today `rnd()` runs in list order (`live_at desc`), so one new live promo shifts every random number and the whole Drop changes in the middle of the day. A scout who made 3 of 7 calls sees a different set. Rank by a per promo hash instead: `score = hash(day + ":" + lang + ":" + promo.id)`. Or store the first result of the day in a small `drops(day, lang, promo_ids)` table with `insert or ignore`. | `index.js` 233 to 236 | Breaks "you made N of 7 calls" and the daily ritual. | Add a promo with `live_at = now`, call `/v1/drop` again: same 7 ids. |
| B2 | **Links cannot get around moderation.** `PUT /v1/me/links` deletes all rows and inserts them again as `safe`, so a link a moderator set to `blocked` comes back on the next save. Keep a blocked list (canonical URL and host, global and per profile, for example `link_scans.verdict = 'blocked'`) and refuse those links. Keep the status of links that did not change. | `index.js` 499 to 518 | Malware or scam links are the top store and legal risk for a link-out product. | Block a link in D1, save the same link again from the app: refused with a clear message. |
| B3 | **Harden "minor" reports.** Count only reporters who have a profile at least 7 days old (today a signed in user with no profile counts), and never auto limit `founder_owned` or verified profiles (moderator only). Two free Apple or Google accounts can still hide any creator today. | `index.js` 803 to 821 | Abuse lever against creators, including the founder's 3. | Two fresh accounts report `haulingempire` as "minor": the status stays `active` and 2 priority 1 reports wait in the queue. |
| B4 | **Media guard before the founder turns on R2.** Reject when `Content-Length` is missing or above the limit before calling `arrayBuffer()`. Today a 100 MB body is read into memory first. Check magic bytes (JPEG `FFD8FF`, PNG `89504E47`, WebP `RIFF....WEBP`) instead of trusting the Content-Type header, so `api.promovote.com` cannot host any file type under our domain (this hurts our Safe Browsing reputation). The app re-encodes with `manipulateAsync`, which drops EXIF, but a modified client can skip that. Reject JPEGs that have an APP1 Exif segment, or strip it. | `index.js` 527 to 536 | The upload returns 503 today, so it is safe now. This must ship before or together with the R2 switch. | A `.zip` sent as `image/png` gets 400; a JPEG with GPS EXIF gets 400 or comes back stripped. |
| B5 | **Cron live and visible.** The founder opens Workers and Pages once (creates the workers.dev subdomain), then we redeploy and confirm the trigger in the dashboard. Add a `job_runs` row per run, plus `lastDailyRun` and `callsResolved` on `/health`. Also fix the `data_requests` cascade, which still deletes the audit row it just marked done (0006 did not change it). | `wrangler.jsonc` 18, `index.js` 918 to 943, migration 0007 | Every call ticket says "Result Oct 14". If the cron does not run, no result ever arrives and the core loop breaks. Apple's 30 day deletion promise also depends on it. | `/health` shows a run in the last 26 h; a test call backdated 8 days is resolved after the next run. |

### P1 (before public launch)

| # | What | Where | Why |
|---|---|---|---|
| B6 | Rate limit key = profile id when signed in, IP only for guests; raise the per IP limit (for example 300 per minute). Mobile carriers put thousands of users behind one IP (CGNAT), so 60 per minute per IP will give false 429s on views and calls at launch. Also refuse writes without `Content-Length` (chunked bodies skip the 16 KB check). | `index.js` 37 to 46 | False errors look like "buttons do nothing" again. |
| B7 | Fewer "void" results at low traffic: if a call has fewer than 10 later calls at day 7, keep it pending and check daily up to day 28, then void. Skip calls from profiles that are not `active`. Loop the job until no due calls are left (today the cap is 500 per day, so a backlog can build up). Show void as "Not enough scouts yet, no points lost". | `index.js` 882 to 916 | A first week full of "void" tickets kills the reason to come back. |
| B8 | Website link scan (Web Risk or Cloudflare URL Scanner) with `pending` until clean, plus a daily rescan. Known platform hosts stay instant. | `index.js` 487 to 518, `daily()` | Today any https site is public at once. |
| B9 | Display name rules: block "PromoVote", "official", "verified", check mark lookalikes, zero width chars, and names whose confusable skeleton matches a verified creator. | `index.js` 403 to 404, 443 to 447 | Today anyone can be "Hauling Empire" with a near identical handle. |
| B10 | Image moderation (Workers AI check, grey zone to the queue) and media served from an R2 custom domain or through `caches.default`. Today each avatar view is one Worker request and counts against the free 100k per day. | `index.js` 527 to 559 | Store guideline 1.2 and free tier headroom. |
| B11 | Device attestation and vote weights before Charts open. Resolution grades a call by the later crowd, so sock accounts that vote after you can make your own early calls "right" and farm x3 "Called it". | new `devices` routes, `calls.weight` | Leaderboard and Scout Score trust. |
| B12 | Housekeeping before uploads: `promos.cta_kind` still has the old CHECK (no `steam`, `itch`, `watch_live`, which `CTA_KINDS` already allows), so it needs a rebuild in the upload migration. `weekly_upload_limit` is stale (the decision is monthly). The follow count update is still not batched. The line 3 comment still says RevenueCat. | `0002_core.sql` 152, `0006`, `index.js` 3, 665 to 666 | Prevents surprise 500s when uploads open. |

Not repeated here because they are known and planned (`brief-r2.md`): video upload, perks, stories, Apple token revoke.

## R2.4 Path to 8

* **Retention 7 to 8:** B5 (the cron really runs and is visible) and B7 (fewer voids). Then the "Result in 7 days" promise actually comes true.
* **Backend completeness and safety 7 to 8:** B1 to B5. Each is under half a day; all five together take about 1.5 working days.

Legal notes in this report are not legal advice.
