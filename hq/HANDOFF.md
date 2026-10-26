# Handoff: what the cloud Claude session built and runs (as of 2026-10-26)

Written for the Paperclip agents of Flip Coin Studios. Covers everything the cloud Claude Code session (claude.ai/code,
repo `mhokutan/NewIdea`, branch `claude/gracious-pasteur-nu8ssc`) has built since 2026-10-05, how it works, and how
the work is done. The rulebook stays `CLAUDE.md` at the repo root; read it first. If this file and `CLAUDE.md`
disagree, `CLAUDE.md` wins. Questions to the cloud session: see section 12.

Talk to the founder in Turkish, simple, no em or en dashes. Never print, commit or paste a secret.

---

## 1. Who does what

| Actor | Where it runs | What it owns |
|---|---|---|
| Founder (Mevlüt Hazım Okutan) | phone, Windows PC | every decision, every login, secrets, merges, store consoles, money |
| Cloud Claude (this session) | claude.ai/code cloud container, clones `mhokutan/NewIdea` fresh each time | PromoVote code, both Cloudflare Workers, D1 data, X queue and videos, the admin dashboard for all products |
| Desktop Claude | founder's Windows PC (and SSH to the Mac mini) | App Store Connect and Google Play setup from `store/README.md`, Windows only repos (Poleris, Hauling Empire local work), Mac mini setup. Reports through `store/status.md` |
| Paperclip CEO and agents | Mac mini `erictogay`, `~/hq/*` | portfolio priorities, reports, product work on branches with PRs |

Each product repo has its own Claude sessions and its own `CLAUDE.md`. The cloud session never touches another
product's code or backend; it only reads their stats feeds.

## 2. Repo map (`mhokutan/NewIdea`)

| Path | What |
|---|---|
| `CLAUDE.md` | rules and all founder decisions with dates. Source of truth |
| `docs/00..09` | idea brief, team verdict, profiles spec, explore/charts/upload spec, mobile and payments, sign in setup, to do list (`07-todo.md`, Turkish), developer API plan, metrics hub plan |
| `docs/debate/`, `docs/review/` | expert team debates and app review reports (`brief.md` is the review brief) |
| `docs/prompts/` | ready prompts sent to other product sessions so they build a stats feed for our admin (HE, Poleris, Dovelet, currency, playtime) |
| `web/landing/` | Worker `promovote-landing`: promovote.com site + admin panel. `src/index.js` is the whole Worker |
| `web/landing/content/` | `promos.json`, `ui.json` (en, es, tr). Build with `python3 web/landing/build.py`. Never hand edit generated files in `public/` (`index.html`, `creators/*.html`, `i18n.js`, `explore.html`, `duel.html`) |
| `web/landing/public/media/` | web videos (MP4 + WebM + poster); `media/x/` holds the X post videos |
| `services/api/` | Worker `promovote-api` at api.promovote.com (Hono + Better Auth). `src/index.js` routes and jobs, `src/auth.js`, `src/stats.js` (store stats collector) |
| `services/api/migrations/` | D1 migrations 0001..0022 (all applied remotely) |
| `apps/mobile/` | Expo SDK 57 app (Expo Router, expo-video). Tabs: Feed (`index`), Duel, Explore, Me. Screens: upload, creator, edit-profile, perk, activity, sign-in, play |
| `.github/workflows/` | `ios-build.yml`, `android-build.yml`, `play-admin.yml`; triggered only by `[build ios]`, `[build android]`, `[play ...]` in a commit message |
| `store/` | store setup guide, assets, `status.md` (desktop and cloud Claude message board, never secrets) |
| `videos/` | HyperFrames video projects (`promovote-x-launch`, `promovote-x-duel` are the templates) |
| `design/` | brand (`design/brand/`), 74 brand references (borrow patterns, never copy) |
| `hq/` | `CEO.md` (CEO charter), `KURULUM-MAC-MINI.md` (Mac setup), this file, `qa/` (question channel) |
| `.claude/` | agents (expert team), skills (HyperFrames, motion, taste, review), settings |

## 3. Live systems (all Cloudflare, account of the founder)

### 3.1 Worker `promovote-landing` (promovote.com, www, developer.promovote.com)
* Static site with feed, Explore (`/explore`), Duel (`/duel`), creator pages, privacy and terms (drafts for a lawyer).
* `/api/waitlist` (Turnstile protected, D1 `promovote-waitlist` table `waitlist`), `/api/v` (own cookieless visit
  counter, table `visits`, daily salted hash, no IP), `/api/duel` (table `duel_picks`).
* Media served with HTTP range support (Safari needs it).
* Admin panel `/admin` (HTTP Basic, password is the Worker secret `ADMIN_PASSWORD`; Claude does not know it). Turkish UI.
  Four product buttons: Durum (status), PromoVote, Hauling Empire, Poleris. Pages:
  * `/admin` status: green / yellow / red per product, explains missing feeds with the real reason.
  * `/admin/bekleme` waitlist + `/admin/export.csv`; `/admin/visitors` (14 days); `/admin/x` X posts and stats
    (reads `promovote-db` through binding `APPDB`); `/admin/onay` creator upload review queue.
  * `/admin/app-store`, `/admin/google-play` with `?p=haulingempire|poleris|promovote` and `?range=7|30|90`.
  * `/admin/hauling-empire/oyun` in-game ops (online now, per region TR/EU/SAM/USA, sessions, time in game, sales
    Apple and Google apart in real dollars via open.er-api.com daily rates, products, funnel, crashes).
  * `/admin/poleris/uygulama`, `/admin/lovelet/uygulama` (Dovelet; internal id stays `lovelet`).
  * `/admin/unity-ads` (nav label "Reklam geliri"): LevelPlay Reporting API first (matches the LevelPlay site, all
    networks, 15 min cache), Unity Monetization Stats API as fallback. "Days to $100" uses the average of the last
    7 finished days from the first earning day (fixed 2026-10-26).
* Product feeds: each product exposes a `store-stats` function in its own Supabase project, same contract; the
  Worker calls it with a key (10 s timeout, 1 day backup cache, `feedWhy` explains failures):
  * Hauling Empire: Supabase `bcwahdyqpbzyqllszeng`, key `HE_STATS_KEY`, `?feed=ops` for in-game (prebuilt every
    5 min on their side after a 502 timeout incident).
  * Poleris: Supabase `gcbcaunmxznaixwnnfux`, key `POLERIS_STATS_KEY`. Dovelet later with `LOVELET_STATS_KEY`.
* Deploy: `cd web/landing && npx wrangler deploy`. `keep_vars` is on; dashboard values must be Secrets.

### 3.2 Worker `promovote-api` (api.promovote.com)
* D1 `promovote-db`, R2 `promovote-media` (uploads under `promos/<profile>/<promo>/<uuid>`, served by `/media/*`),
  service binding `LANDING`, rate limit `WRITE_LIMIT`.
* Auth: Better Auth. Native Sign in with Apple (iOS) and Google (iOS, Android) via ID tokens. Email OTP exists but is
  hidden (needs Workers Paid for Email Sending). App review account review@promovote.com signs in with a fixed code
  in secret `REVIEW_CODE` (never written anywhere).
* Main routes: `/v1/feed`, `/v1/home`, `/v1/drop` (Today's Drop, 7 a day from a pool of 21), `/v1/explore`,
  `/v1/charts` (open after 20 scouts call in 7 days), `/v1/profiles/:handle`, `/v1/me*`, `/v1/calls` (votes),
  `/v1/follows`, `/v1/saves`, `/v1/perks` (one active gift per creator, codes sealed AES-GCM), `/v1/duel`,
  `/v1/me/promos*` (creator uploads), `/v1/admin/review` (needs `ADMIN_API_TOKEN`, shared with the landing Worker),
  `/v1/events/*`, `/v1/reports`, `/v1/blocks`, `/v1/boosts`, Apple and Google webhooks, `/health`.
* Crons (`wrangler.jsonc`):
  * `0 * * * *`: post the due X post, then collect store stats (`stats.js`).
  * `7 * * * *`: resolve calls (only the first 7 scored calls a day earn points), catch a missed X post (5 min grace),
    refresh X stats (each post read twice: day 1 and day 3, reads are billed), store stats.
  * `17 4 * * *`: hard delete accounts after 30 days (`deletion_log`), clean sessions, weekly streak.
  * Last run of each job: `GET https://api.promovote.com/health` (`job_runs`).
* `metrics_daily` (migration 0020) is filled every 12 h for all founder apps (PromoVote, Poleris, Hauling Empire,
  Dovelet) from Apple daily sales reports (`ASC_STATS_*`, vendor 94642380) and Google Play report files
  (`PLAY_REPORTS_BUCKET`, `GOOGLE_PLAY_SA_JSON`).
* Migrations: `cd services/api && npx wrangler d1 migrations apply promovote-db --remote`. Deploy: `npx wrangler deploy`.
* Seed for the founder's 3 creators (haulingempire, nicheable, poleris; owners `founder+<handle>@promovote.com`) is
  generated from `promos.json` by `services/api/scripts/gen-seed-sql.py`.

### 3.3 Secret names (values live only in Cloudflare; never ask for them, never print them)
Landing: `ADMIN_PASSWORD`, `ADMIN_API_TOKEN`, `TURNSTILE_SECRET`, `HE_STATS_KEY`, `POLERIS_STATS_KEY`,
`LOVELET_STATS_KEY`, `LEVELPLAY_SECRET_KEY`, `LEVELPLAY_REFRESH_TOKEN`, `UNITY_ADS_KEY`, `UNITY_ORG_ID`.
API: `BETTER_AUTH_SECRET`, `REVIEW_CODE`, `ADMIN_API_TOKEN`, `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`,
`X_ACCESS_SECRET`, `ASC_STATS_ISSUER_ID`, `ASC_STATS_KEY_ID`, `ASC_STATS_KEY_P8`, `GOOGLE_PLAY_SA_JSON`.
The founder sets secrets himself in the dashboard. The cloud session uses `CLOUDFLARE_API_TOKEN` from its env.

### 3.4 Other
* Email Routing: hello@ and support@promovote.com forward to the founder's Hotmail.
* Domain promovote.com at Cloudflare Registrar (expires 2027-10-02). promovote.app not bought.
* HQ panel hq.miaperatransportation.com: Cloudflare Tunnel `hq` (cloudflared 2026.10.3 at
  `/Users/erictogay/.local/bin/cloudflared`, LaunchDaemon `com.miapera.hq.cloudflared`) to Paperclip on
  localhost:3100 (LaunchDaemon `com.miapera.hq.pm2`), behind Cloudflare Access app "HQ" (only the founder's
  Hotmail, one time PIN). Never expose anything on that tunnel without an Access rule first.

## 4. Products status (2026-10-26)

| Product | State |
|---|---|
| PromoVote app | Google Play live (`com.miapera.promovote`). iOS 1.0.2 (build 15, with Duel tab) waiting for Apple review since 2026-10-16; founder sent an expedite request 2026-10-26. v1 fully free; IAP and Pro in v2 / v1.1 |
| PromoVote web | live, waitlist, duel, explore, creator pages |
| Hauling Empire | live on both stores; 2.2.0 released 2026-10-26; founder ran the two post release Supabase lines the same day (`min_engine_build = 32`, `one_device.enforce = true`) and verified them. React + Vite + Capacitor, not Unity (only ads through Unity LevelPlay, about $1 a day) |
| Poleris | live on both stores. Code in `mhokutan/chartly`, folder `poleris/`, real work on `surum-*` branches (newest `surum-2.4`), not `main` |
| Dovelet | launch pending; stats feed planned |

Rule learned: in these repos `main` is often not the code branch. Look at `release/*` and `surum-*` before saying
"code is missing".

## 5. X (Twitter) account

* Queue: D1 `promovote-db` table `social_posts` (`body` up to 280, `scheduled_at` UTC, `status`
  queued/posted/failed/cancelled, optional `media_url`, stats columns). One post per hourly run.
* Cost (pay per use, 2026-10): a post with any URL $0.20, a plain post $0.015. So: **no links in posts** ("link in
  our profile" or "search ... on the App Store"), video instead of link. Only exception: the iPhone launch day post.
* Plan: 4 plain posts a day at 14/17/20/23 UTC plus at least 2 video posts a week. The queue is filled to
  2026-11-02 (41 queued, 9 videos). Credit left about $16 (2026-10-26), fine for about 2 months.
* Results so far: 133 posts, about 5 impressions per post, 0 likes. Posting more will not fix it. Founder idea
  (2026-10-26, on hold until he says go): thread support (reply chains) and 1 thread a day instead of single posts,
  same daily count. The code has no thread support yet (`xPost` in `services/api/src/index.js`). Real growth lever:
  the founder replying by hand in #indiedev / #gamedev; never automate replies (X treats it as spam).
* Videos: H.264 MP4 only, placed in `web/landing/public/media/x/`, deployed, then `media_url` must be on
  `https://promovote.com/`. Upload is chunked v2 media upload done by the Worker.
* Scheduled refill: a cloud scheduled task fires 2026-10-31 14:20 UTC to fill 2026-11-03..16 (linkless, 2+ videos
  a week).
* Add a post (example):
  `npx wrangler d1 execute promovote-db --remote --command "insert into social_posts (id, body, scheduled_at) values ('x-2026-11-03-14', '...', '2026-11-03T14:00:00.000Z')"`

## 6. How videos are made (HyperFrames)

* A project is one `index.html` with GSAP, `.clip` scenes with `data-start` / `data-duration`, one paused timeline on
  `window.__timelines["main"]`. Videos inside need an `id` and `muted`. Deterministic only (no random, no fetch).
* Music is our own, synthesized with numpy in `scripts/make_music.py`, loudnorm to -14 LUFS.
* Loop: `npm run check` (lint, layout, contrast), `npx hyperframes snapshot --at <s>` and look at frames, then
  `npx hyperframes render`. Copy the MP4 (H.264) to `web/landing/public/media/x/` and deploy the landing Worker.
* Brand: black, white, one yellow `#FFD60A`, Geist font, sharp double chevron logo. No purple, no neon, no gradients
  on the story ring. Remotion is not used (license). No paid AI video or voice APIs without the founder's go.

## 7. Mobile app work

* Checks before any commit: `cd apps/mobile && npx tsc --noEmit && npx expo lint`.
* **Builds and store uploads only when the founder says so.** Never put `[build ios]`, `[build android]` or
  `[play ...]` in a commit message without his explicit go (they start GitHub Actions builds).
* Before a build: the expert review (`docs/review/brief.md`), every expert at least 8/10 on retention, session
  time, originality and trademark safety.
* Pending code waiting for a build: creator uploads screen, Duel tab changes, Apple/Google sign in nonce (security
  to do in `docs/07-todo.md`).

## 8. How the cloud session works

* Fresh container each session; repo cloned; everything worth keeping is committed and pushed to
  `claude/gracious-pasteur-nu8ssc`. No PRs unless the founder asks.
* Commits end with `Co-Authored-By` and `Claude-Session` lines. No model names in repo files.
* Tools: Bash, wrangler (Cloudflare token in env), D1 remote queries, GitHub MCP limited to `mhokutan/NewIdea`,
  HyperFrames CLI, Playwright for browser checks. Cheap model (Haiku) for bulk reading and research; judgment on the
  main model.
* Shared limit: the founder's Claude plan is shared by the founder, the cloud session, desktop Claude and every
  Paperclip agent. Weekly limit resets Thursday. Keep work small when it is low.
* Style of work: read the code, change the smallest thing, run the checks, deploy, verify live (curl or the real
  page), commit, push, then tell the founder in short Turkish with what changed and why.

## 9. Hard rules (summary; full list in `CLAUDE.md` and `hq/CEO.md`)

* No secrets in git, chat or logs. The founder enters secrets.
* Never touch the founder's Supabase projects except to read stats feeds; changes there are done by the founder
  (prepare the SQL, he runs it).
* No builds, store uploads, store listing changes, App Review replies, spending, public posts outside the queue,
  deletes, force pushes, merges to default branches without the founder.
* Never reward users for following; never show a creator that a promo "lost"; never auto publish uploads; Boost
  never counts toward charts or the organic queue; viewers never pay.
* Honest numbers only.

## 10. Open items (2026-10-26)

1. PromoVote iOS 1.0.2 approval; when approved add the launch day post (the only post allowed a link).
2. Hauling Empire: founder does not know if the 2.2.0 launch day steps were done (`ft_longhood`,
   `ft_solo_weekly`, `online_access_mode = 'free'`, App Store `online` / `online_trial` removed from sale) and if
   the Play store text and 2.2.0 screenshots were uploaded. Give him a read only SQL and where to look.
3. Read only admin stats JSON endpoint (token protected) in the PromoVote API for the CEO, after Thursday.
4. X thread support, only on the founder's go.
5. Apple Ads: two campaigns with 0 impressions, founder decides pause or fix.
6. `docs/07-todo.md` items (Workers Paid for email login, nonce for sign in, admin behind Access, ASO).

## 11. Lessons that cost time

* Big product feeds time out: ask the product to prebuild its feed, keep a backup cache, show the real reason.
* Revenue: convert local currency with the day's rate; list price only as a fallback.
* Ad revenue: LevelPlay API, not the Unity API (Unity misses other networks). Pace from finished days only.
* Cloudflare skipped every `0 * * * *` run once (2026-10-09): the `:07` job catches missed X posts.
* A Worker fetching another Worker on the same zone by URL can be refused: use a service binding.
* The founder wants one consolidated, copy ready prompt, not many small steps; and he works from his phone and the
  domain, not from the Mac.

## 12. Asking the cloud session (question channel)

Branch `hq/agent-qa` in `mhokutan/NewIdea` exists for this (agents cannot create branches). Protocol in
`hq/qa/README.md`:
* Agents append questions to `hq/qa/QUESTIONS.md` on that branch (only that file).
* The cloud session answers in `hq/qa/ANSWERS.md` (only that file), same id.
* The cloud session does not watch the branch by itself: the founder tells it "hq/agent-qa'da soru var".
