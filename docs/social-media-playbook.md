# Social media playbook (how the X account is run)

For the CEO session and anyone who takes over the founder's social media. Written 2026-11-16 by the PromoVote session,
which ran it until now. Repo `mhokutan/NewIdea`, branch `claude/gracious-pasteur-nu8ssc`.

## 1. What exists
* One X account, **@PromoVoteApp**, posts for all the founder's products (PromoVote, Hauling Empire, Poleris, Nicheable,
  Dovelet, Dropolis). Keys are Worker secrets on `promovote-api` (`X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`,
  `X_ACCESS_SECRET`). Never print, copy or ask for them.
* The queue is the table **`social_posts`** in the D1 database **`promovote-db`**
  (id `b6a6a86f-5e7e-48fe-9ad1-2a29b1222a31`). Columns: `id` (text, unique), `network` ('x'), `body` (1 to 280 chars),
  `scheduled_at` (ISO UTC), `status` (queued, posted, failed, cancelled), `media_url` (optional video), plus `posted_at`,
  `external_id`, `error` and the stats columns `impressions`, `likes`, `reposts`, `replies`, `bookmarks`, `stats_at`.
* `promovote-api` posts it by itself (`services/api/src/index.js`, `postDueSocial`): the `0 * * * *` job sends the oldest
  due `queued` row (one per run), the `7 * * * *` job catches up anything 5 minutes late and refreshes the stats of
  recent posts (`refreshSocialStats`). Success sets `posted` and `external_id`; an error sets `failed` and `error`.
* The founder sees everything at **promovote.com/admin/x** (posts, queue, stats; read only).

## 2. Rules (founder decisions, do not change without the founder)
* **No links in posts** (a post with any URL costs $0.20, a plain one $0.015). Say "link in our profile" or "search
  Hauling Empire on the App Store / Google Play". The only exception was the iPhone launch day post.
* **10 plain posts a day** at 11, 12, 13, 14, 16, 17, 18, 20, 21 and 23 UTC (raised from 4 on 2026-11-02 to use the X
  credit before it expires) **plus at least 2 video posts a week** (we used 15 UTC on video days).
* No automated replies or DMs. Replies to real people are written by Claude as drafts and sent by the founder by hand.
* Never claim something that is not true (store availability, player counts, features not open to everyone).
* No paid keys or tools (HeyGen, ElevenLabs, Gemini...) without the founder's yes. Our own music only (section 4).
* English, short, one idea per post, at most 2 hashtags (#indiedev, #gamedev, #mobilegames, #appstore...).
* Mix: product posts for every product in turn, questions to indie devs (they bring replies), small "how we built it"
  notes, PromoVote game posts (Today's Drop, Duel, "call it before everyone else").
* X credit: $11.40 left on 2026-11-16, it expires on 2027-01-07 (52 days). A plain post costs $0.015, so 10 a day until
  then is about $8; the credit is enough with room to spare. If it runs low, drop to 2 to 4 posts a day and tell the founder.

## 3. Filling the queue (D1 tool on promovote-db, touch only `social_posts`)
Write a week at a time. Use a unique readable id, for example `2026-11-17-1100-he`.
```sql
INSERT INTO social_posts (id, network, body, scheduled_at, status)
VALUES ('2026-11-17-1100-he', 'x', 'Night routes pay more in Hauling Empire. Plan the trip, beat the clock. Search Hauling Empire on Google Play. #mobilegames', '2026-11-17T11:00:00.000Z', 'queued');
-- a video post
INSERT INTO social_posts (id, network, body, scheduled_at, status, media_url)
VALUES ('2026-11-18-1500-video', 'x', 'Two promos, one call. Which one blows up first? Play the Duel, link in our profile.', '2026-11-18T15:00:00.000Z', 'queued', 'https://promovote.com/media/x/he-update-3.mp4');
```
Checks before you stop:
```sql
SELECT status, COUNT(*), MAX(scheduled_at) FROM social_posts GROUP BY status;          -- queue lasts how long?
SELECT id, scheduled_at, error FROM social_posts WHERE status = 'failed' ORDER BY scheduled_at DESC LIMIT 10;
SELECT body FROM social_posts WHERE body LIKE '%http%' AND status = 'queued';           -- must be empty
```
To stop a post: `UPDATE social_posts SET status = 'cancelled' WHERE id = '...' AND status = 'queued';`
Never touch any other table in promovote-db.

## 4. Making a video
* Tool: **HyperFrames** (HTML to MP4, Apache 2.0, telemetry off). Templates in the repo:
  `videos/promovote-x-launch`, `videos/promovote-x-duel` (two promos side by side, "which one blows up"),
  `videos/promovote-x-nov/make.py` (makes several duel variants from the duel template),
  `videos/daily-template/` (25 s app video from store screenshots and real release notes; read its README first).
* Music: our own, generated (`scripts/make_music.py`, or the ffmpeg `aevalsrc` line in `videos/daily-template/README.md`).
  Never use songs or sounds from elsewhere.
* Source clips: promo videos in `web/landing/public/media/`, store screenshots and release notes from each product's
  own repo (paths in `videos/daily-template/README.md`). Use only real features open to every player.
* Output: vertical 1080x1920, 15 to 30 s, **H.264 MP4** (`ffmpeg ... -c:v libx264 -crf 25 -pix_fmt yuv420p -c:a aac
  -movflags +faststart`), about 3 to 5 MB. Check frames with `npx hyperframes snapshot` before rendering.
* Publish the file: put it in `web/landing/public/media/x/<name>.mp4`, commit, deploy the site
  (`cd web/landing && npx wrangler deploy`, a deploy needs the founder's yes), check
  `https://promovote.com/media/x/<name>.mp4` answers 200, then queue the post with that `media_url`.
* Brand: black, white and one yellow (#FFD60A), Geist font, the double chevron logo; no purple, no neon.

## 5. Weekly routine (what we did)
1. Monday: read last week's stats (`/admin/x` or `SELECT id, impressions, likes, reposts, replies FROM social_posts
   WHERE status = 'posted' AND posted_at >= date('now','-7 days') ORDER BY impressions DESC`), note what worked.
2. Write the next 7 days (70 plain posts + 2 or more videos), no links, mix all products.
3. Make the videos, deploy them (founder's yes), queue them.
4. Every day: glance at `failed` rows and the queue end date; fix and requeue.
5. Tell the founder in short Turkish: what went out, best post, queue lasts until when, credit left if known.

## 6. Honest numbers so far
311 posts sent by 2026-11-16, about 5 views per post on average, videos slightly better (about 8). X alone brought
almost no visits (1 in 30 days). The analysis in `docs/review/2026-11-10-fable-analysis.md` suggests fewer X posts and
putting the same videos on TikTok and YouTube Shorts (uploaded by the founder by hand). Ask the founder before changing
the daily count.

## 7. Weekly PromoVote promos (founder request 2026-11-16)
Every week **one new promo per founder product goes into PromoVote itself** (app feed and website), on the product's own
creator account: @haulingempire, @poleris, @nicheable, @dropolis, @dovelet (all founder accounts, label "Made by the
PromoVote founder"). Dropolis and Dovelet are Google Play only: their promos use the Google Play button, which iPhone
never shows. Do not claim App Store availability for them until it is true (check `itunes.apple.com/lookup?id=...`).
The same 1080p files can also go to X (video posts) and, later, TikTok.

1. Sources: store screenshots and listing text from each product's repo (`videos/daily-template/README.md` has the
   paths; Dovelet: `mhokutan/CoupleApp` `design/cikti/magaza/en/play-*.jpg` and `docs/magaza/listing-aso-2026-11.json`;
   Poleris: App Store screenshots from the iTunes lookup API; Nicheable: crops of its existing promo clips).
2. Video: `videos/promovote-weekly/make.py` (22 s, 1080x1920: hook, 6 screens, 3 real feature lines, end card with
   "Search <name>" or "Find ... on Etsy"; no URL on screen). Check frames with `npx hyperframes snapshot`, then render.
3. Web files in `web/landing/public/media/`: `<slug>.mp4` (720x1280 H.264 crf 25, aac), `<slug>.webm` (VP9 crf 36,
   opus), `<slug>-poster.jpg` (frame at 1.7 s). About 2 MB each.
4. Content: write `web/landing/content/weekly/<year>-w<week>.json` (`creators` only for new accounts, `promos` with
   en/es/tr title and desc), then `python3 scripts/add_promos.py <batch>`, `python3 web/landing/build.py`,
   `python3 services/api/scripts/gen-promo-sql.py <batch> <next number>_promos_<year>_w<week>` (adds rows only; safe to
   run twice). Test the migration on a local SQLite copy of all migrations before applying.
5. Live: apply the migration (`npx wrangler d1 migrations apply promovote-db --remote`, or the D1 tool plus a manual
   `d1_migrations` row) and deploy promovote-landing **from a worktree at the live commit** with only the new media,
   `content/`, `public/index.html`, `public/creators/*`, `public/explore.html`, `public/duel.html` and `public/i18n.js`
   changes. Never deploy unfinished branch work.
   **Standing yes (founder 2026-11-17: "bundan sonra promovote tiktok hesabından paylaşım ve promovote'da ayrı ayrı
   hesaplardan bizim uygulamalar için olan iş kısmı sende")**: the weekly promos go live without asking each week
   (migration + media deploy), then tell the founder after. Before any landing deploy run `npx wrangler deployments list`:
   other sessions deploy promovote-landing too (2026-11-17 a deploy from an old base removed their office work for
   15 minutes). Merge the remote branch first and deploy from a base that contains everything already live.
6. Check: `https://promovote.com/media/<slug>.mp4` answers 200, `https://api.promovote.com/v1/creators/<handle>` lists the
   promo, then tell the founder in short Turkish.

## 8. TikTok (account "promovote", connected 2026-11-17, sandbox until TikTok approves the app)
* promovote-landing runs `tiktokCron` every day at 15:17 UTC (`src/tiktok.js`): it sends up to 2 founder promos that were
  never sent (English, 8 s or more, newest first) as drafts to the TikTok inbox, never more than 4 drafts in 24 h.
  New weekly promos are picked up by themselves once they are live in promovote-db.
* The founder publishes each draft in the TikTok app (TikTok rule; unaudited apps also post private only).
* Check: `npx wrangler d1 execute promovote-waitlist --remote --command "SELECT created_at, video_path, status, error FROM tiktok_posts ORDER BY id DESC LIMIT 10"`.
* Before submitting the app for review, replace `docs/tiktok/flow-preview.mp4` with a real sandbox screen recording.

## 9. Daily founder videos (CEO and founder 2026-11-17)
* A separate video session pushes 5 videos a day to branch `videos/daily` (format: `docs/prompts/daily-video-format.md`).
* Every day at 20:00 UTC run `python3 scripts/daily_ingest.py <YYYY-MM-DD>` from the repo root: checks, uploads to R2
  `promovote-media/daily/<date>/` through `PUT https://api.promovote.com/v1/admin/ingest` (Worker secret INGEST_TOKEN set
  to a fresh random value before the run and again after it; founder allowed this on 2026-11-17), adds the 4 product promos to promovote-db, queues all 5 for
  TikTok (`tiktok_queue`, sent by promovote-landing at 21:17 UTC) and one X video post at 22:00 UTC. Safe to run twice.
* Media URLs: `https://api.promovote.com/media/daily/<date>/<app>.mp4` (1080), `<app>-720.mp4` (app feed), `<app>-poster.jpg`.
