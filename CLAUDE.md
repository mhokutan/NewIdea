# CLAUDE.md

## Project

Name: **PromoVote**. Domain **promovote.com** owned (Cloudflare Registrar, registered 2026-10-02, expires 2027-10-02). promovote.app not bought yet. USPTO trademark search and filing (classes 35, 42) still to do. Old working names: OnlyAds / WatchAds.
Vision: **"The social media of ads."** A platform where ads are the content, advertisers are creators with profiles and followers, and users are curators who discover, vote and rank.

Status: validation stage. **promovote.com landing page is LIVE** (waitlist).

## Live infrastructure (Cloudflare)
* Landing page: `web/landing/` (Cloudflare Worker + static assets). Deploy: `cd web/landing && npx wrangler deploy`. Custom domains promovote.com and www (www 301 to apex).
* Waitlist: D1 `promovote-waitlist`, table `waitlist` (email, role, link, country, created_at). Count: `npx wrangler d1 execute promovote-waitlist --remote --command "SELECT role, COUNT(*) FROM waitlist GROUP BY role"`.
* Admin: `promovote.com/admin` (HTTP Basic auth, password = Worker secret `ADMIN_PASSWORD` set by the founder in the dashboard; Claude does not know it). Shows signups, roles, countries, CSV export at `/admin/export.csv`.
* Bot protection: Turnstile widget `promovote-waitlist`; secret stored as Worker secret `TURNSTILE_SECRET` (never commit it).
* Email Routing: hello@ and support@promovote.com forward to the founder's Hotmail.
* Zone: Always HTTPS, min TLS 1.2. Token comes from env `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`. Never print it.
* Privacy and Terms pages are drafts for lawyer review before launch.
* Feed content is generated: edit `web/landing/content/promos.json` (promos, creators, translations) and `web/landing/content/ui.json` (UI strings in en, es, tr), then run `python3 web/landing/build.py` and deploy. Do not hand-edit `public/index.html`, `public/creators/*.html` or `public/i18n.js`.
* Feed ordering (in `public/feed.js`): per viewer fair rotation. Each round gives every creator 2 slots, least seen first, viewer language first, a promo counts as seen after 3s. Moves server side when accounts exist.
* Videos: originals in `media/incoming/`, web versions (MP4 + WebM + poster) in `web/landing/public/media/`. Media is served with HTTP range support by the Worker (Safari needs it).
* Explore page `/explore` (built by build.py into `public/explore.html`, logic in `public/explore.js`): search, categories (creator `category`: games, apps, shops), hashtags (promo `tags`), creators, promo grid. Charts (today, week, month) and uploads are specified in `docs/04-explore-charts-upload.md`; charts stay an honest empty state until real vote data exists. Boost never counts toward charts.
* Founder creators in the feed: Hauling Empire (game, store pending, notify CTA), Nicheable (Etsy, perk NEWIDEA25), Poleris (app, App Store live, Google Play soon; creator `cta: {type: store, android: soon}`, promo `linkKind: appstore`).
* Company: MIA PERA TRANSPORTATION LLC (NJ) dba PromoVote for now. Separate LLC when revenue starts or before user uploads open. Payments plan: Stripe on the web for advertisers, optional in-app purchase later.


## Founder context
* Lives in the USA, already has a company (LLC), active Apple Developer and Google Play accounts.
* Background: Salesforce developer. Builds with Claude, cost matters.

## Read first
1. `docs/00-idea-brief.md`: original idea, ChatGPT model, founder's answers.
2. `docs/01-team-verdict.md`: decisions of the 8-expert team. **This is the current source of truth.**
3. `docs/debate/`: full round 1 and round 2 texts.
4. `docs/02-next-session-handoff.md`: Cloudflare setup plan and current account state.

## Current decisions (short)
* First niche: indie game trailers. Users: players who like discovering new games.
* Scope: all creators and businesses, no sector limit (games, YouTube, Twitch, Kick, TikTok, Instagram, apps, brands). Never reward users for following/subscribing (platform ToS, fake engagement).
* Profiles: see `docs/03-profiles-spec.md`. Creator and Scout are **separate account types** (chosen at signup, one email = one account); creators cannot vote.
* Paid product: "Trailer Test" report (creative test + real audience feedback), not cheap views.
* Skip is free. Points = "Kaşif Puanı" (reputation, no cash value, not spent).
* Advertiser offers (Steam keys, codes, beta) are optional and never tied to votes or reviews.
* No subscriptions (founder decision 2026-10-06). Everything is free like social media (profiles, posting, watching). Paid extras only: Boost (labeled Sponsored, separate slot, never takes organic fair-queue turns), Trailer Test report, Pro analytics. Viewers are never paid. Free accounts get upload limits.
* 18+, English first, restricted categories closed.
* Planned stack: Expo + React Native Web (web, iOS, Android from one codebase), Next.js advertiser panel, Supabase, Cloudflare Stream, Stripe. Web public first, app stores after the checklist in the verdict.
* Before building: 3 week validation test (paid concierge reports + weekly trailer list).

## Team and skills
* Agents: `.claude/agents/` (product-strategist, adtech-expert, consumer-growth-psychologist, marketplace-economist, trust-safety-legal, cto-architect, creator-economy-expert, skeptical-investor).
* Project skills (`.claude/skills/`): `team-debate`, `domain-check`, `ad-review`, `unit-economics`, `design-references`, Taste (`design-taste-frontend`, `high-end-visual-design`, `redesign-existing-projects`, `image-to-code`), Vercel `web-design-guidelines`.
* Plugins (`.claude/settings.json`): Cloudflare, Anthropic example-skills (frontend-design, webapp-testing), Impeccable, Addy Osmani web-quality-skills, Trail of Bits (insecure-defaults, sharp-edges, differential-review, supply-chain-risk-auditor, static-analysis).
* Design references: `design/references/<brand>/DESIGN.md` (74 brands, MIT). Borrow patterns, never copy a brand.
* Browser testing: Playwright MCP in `.mcp.json` (via `scripts/playwright-mcp.sh`).
* For any UI work: use Taste + Impeccable for direction, then audit with web-design-guidelines and web-quality-skills, then verify in a real browser with Playwright.

## Writing style
* Talk to the founder in Turkish, simple and clear.
* Never use em dashes or en dashes.
* Legal notes are not legal advice.
