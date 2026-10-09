# CLAUDE.md

## Project

Name: **PromoVote**. Domain **promovote.com** owned (Cloudflare Registrar, registered 2026-10-02, expires 2027-10-02). promovote.app not bought yet. USPTO trademark search and filing (classes 35, 42) still to do. Old working names: OnlyAds / WatchAds.
Vision: **"The social media of ads."** A platform where ads are the content, advertisers are creators with profiles and followers, and users are curators who discover, vote and rank.

Status: validation stage. **promovote.com landing page is LIVE** (waitlist).

## Live infrastructure (Cloudflare)
* Landing page: `web/landing/` (Cloudflare Worker + static assets). Deploy: `cd web/landing && npx wrangler deploy`. Custom domains promovote.com and www (www 301 to apex).
* Waitlist: D1 `promovote-waitlist`, table `waitlist` (email, role, link, country, created_at). Count: `npx wrangler d1 execute promovote-waitlist --remote --command "SELECT role, COUNT(*) FROM waitlist GROUP BY role"`.
* Admin: `promovote.com/admin` (HTTP Basic auth, password = Worker secret `ADMIN_PASSWORD` set by the founder in the dashboard; Claude does not know it). Shows signups, roles, countries, CSV export at `/admin/export.csv`, and real visitors for the last 14 days.
* Visit counter (cookieless, own): the Worker injects `public/v.js` into every HTML page; it posts to `/api/v`, rows go to D1 `promovote-waitlist` table `visits` (visitor = daily salted hash, no IP stored; salt in `visit_salt`). Bots, headless browsers and the admin's browser (`v-ignore.js` on /admin) are not counted.
* Bot protection: Turnstile widget `promovote-waitlist`; secret stored as Worker secret `TURNSTILE_SECRET` (never commit it).
* Email Routing: hello@ and support@promovote.com forward to the founder's Hotmail.
* Zone: Always HTTPS, min TLS 1.2. Token comes from env `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`. Never print it.
* Privacy and Terms pages are drafts for lawyer review before launch.
* Feed content is generated: edit `web/landing/content/promos.json` (promos, creators, translations) and `web/landing/content/ui.json` (UI strings in en, es, tr), then run `python3 web/landing/build.py` and deploy. Do not hand-edit `public/index.html`, `public/creators/*.html` or `public/i18n.js`.
* Feed ordering (in `public/feed.js`): per viewer fair rotation. Each round gives every creator 2 slots, viewer language first (then English), then least seen, a promo counts as seen after 3s. Moves server side when accounts exist.
* Videos: originals in `media/incoming/`, web versions (MP4 + WebM + poster) in `web/landing/public/media/`. Media is served with HTTP range support by the Worker (Safari needs it).
* Explore page `/explore` (built by build.py into `public/explore.html`, logic in `public/explore.js`): search, categories (creator `category`: games, apps, shops), hashtags (promo `tags`), creators, promo grid. Charts (today, week, month) and uploads are specified in `docs/04-explore-charts-upload.md`; charts stay an honest empty state until real vote data exists. Boost never counts toward charts.
* Home tabs (founder decision 2026-10-07): Today's Drop (7 promos a day, progress, end card, then "keep watching" into the fair rotation), Following (founder request 2026-10-07: new promos from followed creators, newest first, no ranking, no Boost), New, Team picks. Profiles show Followers, Saves and Calls (neutral totals; the Will blow up split is never shown before a scout calls). Reels have a Follow pill and a save count; following never earns anything. Top moves to Explore as Charts. Never use the label "For you". Vote UI: a bottom call bar (Not for me / Will blow up, with the logo's double chevron) that turns into a call ticket after voting; save and share stay on the right. Swipe left plays the same creator's other promos; never swipe to vote. Trademark filing: decided later, before public launch.
* Mobile app Explore is different from web (founder decision): Instagram/TikTok/Snapchat style with creator story circles, category pills, autoplay masonry grid, tap to full screen feed. See section 2.1 of `docs/04-explore-charts-upload.md`.
* Founder creators in the feed: Hauling Empire (game, Google Play live since 2026-10-07 `com.mhokutan.haulingempire`, App Store coming; notify CTA on iOS, Google Play on Android), Nicheable (Etsy, perk NEWIDEA25 as a real gift), Poleris (app, App Store and Google Play live `com.miapera.poleris`; promo `linkKind: appstore`, creator `cta.android` = Play URL). Android viewers get `ctaAndroid` (Google Play) from the API; Google Play buttons and links are never shown on iOS.
* Company: MIA PERA TRANSPORTATION LLC (NJ) dba PromoVote for now. Separate LLC when revenue starts or before user uploads open. App Store and Google Play use the founder's Individual developer accounts for now (founder decision 2026-10-06; seller name is the founder's own name). Apps can be transferred to a new company account later (Apple App Transfer, Google Play app transfer). Payments (founder decision 2026-10-06): in-app only (Apple StoreKit + Google Play Billing, verified by our own Worker; no RevenueCat, founder decision 2026-10-06), no Stripe for now. In-app purchases ship in version 2, v1 is fully free (founder decision 2026-10-07); products and prices in `docs/05` section 1.1. Apple and Google are merchant of record and send buyer receipts. Never collect address, billing or card data. See `docs/05-mobile-app-and-payments.md`. Store setup (App Store Connect, Google Play, keys) is done by the founder's desktop Claude from `store/README.md` (store assets in `store/assets/`); progress and notes go through git in `store/status.md` (never secrets).


## Founder context
* Lives in the USA, already has a company (LLC), active Apple Developer and Google Play accounts.
* Background: Salesforce developer. Builds with Claude, cost matters.

## Read first
1. `docs/00-idea-brief.md`: original idea, ChatGPT model, founder's answers.
2. `docs/01-team-verdict.md`: decisions of the 8-expert team. **This is the current source of truth.**
3. `docs/debate/`: full round 1 and round 2 texts.
4. `docs/02-next-session-handoff.md`: Cloudflare setup plan and current account state.
5. `docs/07-todo.md`: to do list agreed with the founder (what to do when the apps are approved, next versions). Update it when items are done.

## Current decisions (short)
* First niche: indie game trailers. Users: players who like discovering new games.
* Scope: all creators and businesses, no sector limit (games, YouTube, Twitch, Kick, TikTok, Instagram, apps, brands). Never reward users for following/subscribing (platform ToS, fake engagement).
* Profiles: see `docs/03-profiles-spec.md`. Creator and Scout are **separate account types** (chosen at signup, one email = one account); creators cannot vote.
* Paid product: "Trailer Test" report (creative test + real audience feedback), not cheap views.
* Skip is free. Points = "Kaşif Puanı" (reputation, no cash value, not spent).
* Advertiser offers (Steam keys, codes, beta) are optional and never tied to votes or reviews.
* Subscriptions: one creator-only plan "PromoVote Pro" in v1.1 after the first App Store approval (founder decision 2026-10-07, replaces the 2026-10-06 "no subscriptions" rule): $9.99/month or $99.99/year, Apple and Google auto-renewing. Pro: stories up to 10 per day with story stats, Pro stats, more uploads and 60 s videos, perk code lists. Free creators get 1 story per week. Stories show only to followers (ring on the avatar, row for followed creators), never in the organic queue, charts or Hit Score; a test guards that ranking code never reads the Pro flag. Never sold: verified badge, feed or chart position, reach to non-followers, votes. Viewers stay free forever. Story ring is a solid lime arc, never the pink to violet gradient.
* Earlier rule (2026-10-06, now limited to viewers): Everything is free like social media (profiles, posting, watching). Paid extras only: Boost (labeled Sponsored, separate slot, never takes organic fair-queue turns), Trailer Test report, Pro analytics. Viewers are never paid. Free accounts get upload limits: videos 10 to 30 s, 10 per month (5 in the first 30 days); videos for a paid Boost or Trailer Test can be up to 60 s and do not count (founder decision 2026-10-07, `docs/04` section 4.1). Video storage for uploads: Cloudflare R2 for now (free), compressed to 720p H.264 on the phone before upload; move to Cloudflare Stream when users grow (founder decision 2026-10-07).
* 18+, English first, restricted categories closed.
* Planned stack: Expo + React Native Web (web, iOS, Android from one codebase), Next.js advertiser panel, Supabase, Cloudflare Stream, Stripe. Mobile app first (founder decision 2026-10-06); the website stays as showcase, feed and Explore without payments. Backend is all Cloudflare (no Supabase; the founder's Supabase projects are separate, never touch them): API Worker `promovote-api` at https://api.promovote.com, code in `services/api/` (Hono + Better Auth email OTP), D1 `promovote-db`, migrations in `services/api/migrations/` (apply with `npx wrangler d1 migrations apply promovote-db --remote`). Seed is generated from `web/landing/content/promos.json` by `services/api/scripts/gen-seed-sql.py`. The founder's 3 creators (haulingempire, nicheable, poleris) are 3 separate creator accounts owned by placeholder users `founder+<handle>@promovote.com`, managed by Claude. Sign in (founder decision 2026-10-06, free path): native Sign in with Apple (iOS) and Google (iOS, Android) via ID tokens verified by Better Auth; email OTP code exists but is hidden (`EXPO_PUBLIC_EMAIL_LOGIN=1`) because Cloudflare Email Sending needs Workers Paid. Setup steps in `docs/06-sign-in-setup.md`. App review test account: review@promovote.com (scout @appreview, migration 0005), signs in with "Continue with email" and a fixed code in the API Worker secret `REVIEW_CODE` (var `REVIEW_EMAIL`); no email is sent. Other emails get `EMAIL_LOGIN_SOON` until Email Sending is on. Never commit the code. Pending founder actions: Google OAuth client ids (web, iOS, Android), `EXPO_TOKEN` env var for EAS builds, open Workers dashboard once (workers.dev subdomain needed for the daily cron).
* Builds (founder rule 2026-10-09): do NOT start iOS or Android builds or store uploads after each change. Collect changes, finish the to do list, run the checks and the expert review, then build only when the founder says so. Builds run on GitHub Actions (`[build ios]`, `[build android]` in a commit message; Play tools with `[play ...]`), never by accident: never put these markers in a commit message without the founder's go.
* Mobile app: `apps/mobile/` (Expo SDK 57, Expo Router, expo-video, Better Auth Expo client). Bundle id `com.miapera.promovote`. EAS profiles in `apps/mobile/eas.json` (development, preview, production). Builds: iOS through EAS cloud, Android through EAS or locally on the founder's computer. Run `npx tsc --noEmit && npx expo lint` before commits. See `apps/mobile/README.md`.
* API jobs (Worker crons in `services/api/wrangler.jsonc`): hourly `7 * * * *` resolves calls (later crowd bar, only the first 7 scored calls a day earn points), daily `17 4 * * *` hard deletes accounts after 30 days (`deletion_log`), cleans sessions and runs the weekly streak once per week. `GET https://api.promovote.com/health` shows the last run of each job (`job_runs`). Migrations up to 0008 are applied remotely.
* Game rules in code: Today's Drop = 7 promos picked per day from a pool of 21 (uncalled first), Charts open after 20 scouts call in 7 days, weekly streak = calls on 3 different days (Mon to Sun UTC) with up to 2 saved weeks. Gifts (perks): one active gift per creator, codes sealed with AES-GCM, claim needs sign in only and never reads calls or follows. Display names and bios cannot pose as PromoVote staff.
* App reminders are local only (expo-notifications, daily 18:00 after the first finished drop). The iOS push entitlement is stripped in `apps/mobile/app.config.ts` until server push ships.
* Before building: 3 week validation test (paid concierge reports + weekly trailer list).

## Team and skills
* Model use (founder request 2026-10-07, cost): use Haiku (`model: "haiku"`) for simple subagent work and for token heavy work: web fetches and multi page research gathering, broad file and code sweeps, reading long logs, transcripts, docs or data dumps and summarizing them, bulk screenshot checks, link and copy checks, translations of UI strings, routine status reads. Haiku gathers and summarizes; the main session makes the decision from its summary. Keep the main session and the expert agents below on the default model (product, design, legal, security, architecture and app review scores need judgment).
* Agents: `.claude/agents/` (mobile-product-designer, mobile-engineer, product-strategist, adtech-expert, consumer-growth-psychologist, marketplace-economist, trust-safety-legal, cto-architect, creator-economy-expert, skeptical-investor).
* Project skills (`.claude/skills/`): `team-debate`, `domain-check`, `ad-review`, `unit-economics`, `design-references`, Taste (`design-taste-frontend`, `high-end-visual-design`, `redesign-existing-projects`, `image-to-code`), Vercel `web-design-guidelines`.
* Plugins (`.claude/settings.json`): Cloudflare, Anthropic example-skills (frontend-design, webapp-testing), Impeccable, Addy Osmani web-quality-skills, Trail of Bits (insecure-defaults, sharp-edges, differential-review, supply-chain-risk-auditor, static-analysis).
* Design references: `design/references/<brand>/DESIGN.md` (74 brands, MIT). Borrow patterns, never copy a brand.
* Browser testing: Playwright MCP in `.mcp.json` (via `scripts/playwright-mcp.sh`).
* For any UI work: use Taste + Impeccable for direction, then audit with web-design-guidelines and web-quality-skills, then verify in a real browser with Playwright.

* App review team (founder rule 2026-10-07): before shipping, the expert team reviews the app with `docs/review/brief.md`; every expert must score at least 8/10 on retention, session time, originality and trademark safety. Each role is a team of at least two experts with different angles (founder rule 2026-10-07). Reports in `docs/review/`.

## Writing style
* Talk to the founder in Turkish, simple and clear.
* Never use em dashes or en dashes.
* Legal notes are not legal advice.
