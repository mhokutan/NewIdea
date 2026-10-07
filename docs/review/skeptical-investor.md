# Skeptical Investor review: Differentiation and competitive position

Date: 2026-10-07. Reviewer: Skeptical Investor / Devil's Advocate.
Inputs: `docs/review/brief.md`, `docs/00-idea-brief.md`, `docs/01-team-verdict.md`, `docs/04-explore-charts-upload.md`, screenshots `docs/review/screens/01..13`, `apps/mobile/src/ui/PromoReel.tsx`, `apps/mobile/src/app/(tabs)/index.tsx`, `services/api/src/index.js`, `services/api/migrations/0002_core.sql`, `web/landing/public/index.html`, web research (sources at the end).

Legal notes are not legal advice.

## Kurucuya kısa özet (Türkçe)

Bugünkü haliyle PromoVote ilk 10 saniyede "oy butonu eklenmiş bir TikTok" gibi görünüyor. "For you" sekmesi, sağda 4 yuvarlak buton, sol altta avatar ve başlık: bunlar TikTok'un dili. Asıl farkımız olan "tahmin" fikri (Will blow up deyip 7 gün sonra haklı çıkıp çıkmadığını görmek) veritabanında var (`calls`, `resolves_at`, `hit_outcome`, `scout_stats`) ama ekranda hiç yok. Oy verince hiçbir şey olmuyor, sonuç hiçbir zaman açıklanmıyor, Scout profili boş. Yani fark kodda değil, sadece dokümanda. Çözüm yeni strateji değil: zaten karar verilmiş olan "tahmin et, sonucu gör, I called it" döngüsünü görünür yapmak. Aşağıda 5 imza özellik ve P0/P1/P2 listesi var.

## 1. Scores

| # | Area | Score | Evidence (one sentence) |
|---|---|---|---|
| 1 | Retention | 4/10 | Nothing brings a user back tomorrow: votes never resolve (no resolution job in `daily()` in `services/api/src/index.js`), no "your call resolved" moment, and the Scout profile after signup is empty (screenshot 13). |
| 2 | Session time | 4/10 | About 16 promos from 3 founder creators in an endless fair rotation means repeats within minutes, and Top is an empty screen (screenshot 04). |
| 3 | Originality | 3/10 | Screenshot 01 is TikTok grammar line by line ("For you" tab, right rail of round icons, avatar and title bottom left, outlined CTA), and the only original element, the vote, gives no visible feedback. |
| 4 | Trademark and trade dress safety | 6/10 | Each element alone is generic, but the combination of the "For you" label, right rail and full bleed vertical layout reads as TikTok trade dress by association; the name PromoVote still has no USPTO search. |
| 5 | Differentiation and competitive position (my domain) | 4/10 | The white space we can own (a consumer prediction game on new things, with a public track record) is real and unoccupied, but the shipped app does not show it anywhere, so today we compete head on with TikTok, Shorts, Netflix and Disney+ vertical feeds and Steam. |

## 2. Does it read as a TikTok clone with a voting button?

Honest answer: yes, today it does.

What a new user sees in the first 10 seconds (screenshots 01, 05, website `index.html`):

1. A full screen vertical video with a blurred poster behind it. Same as TikTok, Reels, Shorts, and since 2026 also Netflix and Disney+ "Verts".
2. A tab strip "For you / New / Top / Featured". "For you" is the single most TikTok identified phrase in consumer software.
3. A right rail of 4 round dark buttons with labels under them. Same silhouette as TikTok.
4. Avatar, name, one line title, "more", and a CTA bottom left. Same as TikTok and Reels.
5. They tap "Will blow up". If they are not a finished Scout, `needAccount()` calls `router.push('/me')`, which with NativeTabs does nothing visible. If they are a Scout, the circle turns lime. That is all. No date, no stake, no crowd, no reveal.

The only differences from TikTok are two words on a button and a lime color. A user cannot tell, from the screen, that this is a game about calling hits early. An App Store reviewer looking at Guideline 3.2.2 ("apps designed predominantly for the display of ads") also sees a feed of promos with no visible community mechanic. Differentiation is not only a brand issue here, it is an approval risk.

The irony: the differentiator is already decided and half built.

* `docs/01-team-verdict.md` section 4: finite daily list of 5 to 7, "Tahminlerin yarın açıklanacak", "I called it" badge, Kaşif Puanı from correct early calls.
* `docs/03-profiles-spec.md`: Hit Score, resolution 7 days after `live_at`, top 20% of the weekly cohort, votes excluded so calls cannot self fulfil, "I called it" share card.
* Schema: `promos.resolves_at`, `promos.hit_outcome`, table `calls`, `scout_stats (scout_score, level, called_it_count)`.
* Missing: the resolver job, the API fields, and every pixel of UI.

## 3. Competitive map (checked October 2026)

| Group | Who | What they own | What it means for us |
|---|---|---|---|
| Vertical video giants | TikTok, YouTube Shorts, Instagram Reels; Netflix vertical feed (rolled out 2026), Disney+ Verts (March 2026) | Attention, the vertical feed format, creators | A vertical feed is now a commodity. Even Netflix has one. It cannot be our identity. If we look like them, we lose on content volume every time. |
| Game discovery | Steam Discovery Queue (reworked as an overlay that explains why a game is recommended), Steam micro trailers (6 second loops), Steam Next Fest (3,000+ demos per edition); swipe apps like GameSwipe, SWIPEPLAY (10 second gameplay previews), GameFeed (playable feed) | The wishlist button, which is the conversion indie devs care about | Players already have a discovery home. "Swipe through trailers" is not new; SWIPEPLAY pitches almost the same sentence. We need a reason to open us that Steam does not give: a scoreboard of your taste. |
| Ad libraries for marketers | TikTok Creative Center Top Ads (narrowed to industry lists in 2026), Meta Ad Library, Google Ads Transparency Center, Foreplay ($49 to $99 per month, 100M+ ads) | Professionals browsing ads as research | Proof that "ads as content" demand exists, but among marketers, not consumers. Our paid side (Trailer Test) competes here for indie devs' budget; our free side cannot look like a research tool. |
| Launch voting | Product Hunt (featured launches fell from about 47 to 16 per day; reported cases of #1 launches converting almost nobody) | Maker community, the daily leaderboard | Upvotes without consequence become vanity and get gamed. Our vote must have a consequence (it resolves, it is scored, it is public). |
| Ad rating, historical | USA Today Ad Meter (works one day a year, Super Bowl), Adbowl, Facebook "Ad Battle", AdPinion (gone) | Event moments | Rating ads is an event, not a habit. Habit needs a loop with a payoff that comes back to you. |
| Rewarded attention | Mistplay (Audience Network launched May 2026, 40M+ users, $150M+ paid out), Swagbucks; dead: Perk, Viggle, Kiip | Paid attention | We decided never to pay viewers. Correct, but it removes the hook these apps use, so the replacement hook (status from correct calls) must be visible from minute one. |

The gap nobody fills: a consumer product where you **publicly call which new game, app or shop will blow up, and the app keeps your score.** In my search I found tools that predict hits for developers (GameDiscoverCo models, wishlist calculators) but no consumer app that turns early taste into identity. That is our position. It fits the decided name (Promo**Vote**), the logo (double up chevron), the "Will blow up" button, Kaşif Puanı, and "Paying never buys a spot".

What would need to be true for this position to work:

1. Calls resolve on a clear, trusted rule and the user sees the result (Hit Score, 7 days, votes excluded).
2. There is enough fresh supply that early calls are possible (at least 20 to 30 new promos per week, mostly indie game trailers, the decided niche).
3. Being right early is visible to others (profile track record, share card), so status replaces money.

## 4. Five signature features and visual moments (within decided strategy)

These make PromoVote recognisable in the first 10 seconds without new strategy. All of them are already in the verdict or the specs; this is execution.

### S1. "The Call" stamp (the first 10 second moment)

Tapping "Will blow up" plays a short full width moment: the brand double chevron shoots up, a lime stamp lands on the video: **"Called. Resolves Tue 14 Oct. You are scout #37."** Then a split bar appears: "62% called it" (shown only after your own call, so the crowd does not steer you). "Not for me" gets a quieter grey stamp. Being early is the point, so the scout number is the hook.

* Where: `apps/mobile/src/ui/PromoReel.tsx` `vote()`; API `POST` vote handler near line 464 of `services/api/src/index.js` returns `{ rank, resolves_at, split }` (set `resolves_at = live_at + 7 days` when a promo goes live).
* Why: turns a like button into a bet with a date. No other feed app has this moment.

### S2. Call ticket on every promo

A small chip at the top left of each promo: **"Open: 4 days left. 212 scouts watching"** or **"Early: under 100 views"**. Once resolved: **"Blew up"** or **"Did not"**. Every promo becomes a live question with an expiry, not an endless clip.

* Where: `PromoReel.tsx` (new chip above `styles.info`), `PROMO_SELECT` in the API adds `resolves_at`, `hit_outcome`, call count bucket.
* Why: visible in the first frame, before any tap. This is the single cheapest way to stop looking like TikTok.

### S3. Today's Drop (finite, then optional endless)

Rename "For you" to **"Today's Drop"**: 7 promos (verdict section 4: 5 to 7), progress dots at the top (3 of 7), and an end card: **"Drop done. 2 calls open, first result Thursday. Next drop 18:00."** with a secondary "Keep watching" that continues into the existing fair rotation, so the founder's endless feed stays.

* Where: `apps/mobile/src/app/(tabs)/index.tsx` `TABS` and `append()`, strings in i18n (en, es, tr); same on web `public/feed.js` via `content/ui.json` and `build.py`.
* Why: a finite daily ritual is the opposite of TikTok's infinite scroll, gives a reason to return at a fixed time, and removes the "For you" label (trade dress).

### S4. My Calls board (the Scout profile)

Replace the empty Scout profile (screenshot 13) with a track record: open calls with countdowns, resolved hits and misses, hit rate, Scout Score, level, "I called it" count. Public version on the scout's profile.

* Where: `apps/mobile/src/app/(tabs)/me.tsx`; API `GET /v1/me/calls` (reads `calls` join `promos`), `scout_stats` already exists.
* Why: identity is the replacement for money. Without a visible record there is no reason to be early.

### S5. Resolution day and the "I called it" card

A daily resolver marks `hit_outcome`, updates `scout_stats`, and the user gets: **"You called Hauling Empire 7 days ago. It blew up. Top 8% of scouts."** with a 1080 x 1920 share card (spec P1) carrying the chevron logo. Rename the empty "Top" tab to **"Resolved"**: this week's results with your calls marked. Until data exists, it shows "Results start 7 days after the first calls" instead of a blank screen.

* Where: `daily(env)` in `services/api/src/index.js` (cron `17 4 * * *` already set in `wrangler.jsonc`); push notification later; `index.tsx` tab id `top` to `resolved`.
* Why: this is the payoff that brings people back next week. It is the loop the team designed in round 2.

Visual system rules that follow from S1 to S5:

* Use the double up chevron as the motion signature (call animation, level up, share card). It is our own mark and nobody else's.
* Move the two call buttons into a bottom "call bar" (two wide thumb buttons: Not for me | Will blow up) and keep only Save and Share on a slim rail. This breaks the TikTok silhouette at a glance.
* Do not use Tinder style card swiping left and right to vote. Match Group has asserted swipe patents (for example against Bumble). Use horizontal swipe for moving between tabs or opening the creator, which is what the founder asked for anyway. Check with a lawyer.

## 5. Other execution issues that weaken position

1. **First promo is an Etsy planner** (screenshot 01) and Featured is a manifestation app (05). The decided niche is indie game trailers. The first session should open on a game trailer; otherwise the product reads as "random ads".
2. **Every creator is "Made by the PromoVote founder".** Honest and correct, but it signals an empty platform. Before public launch, bring 20 to 30 real indie trailers (with written permission) into the Drop.
3. **Silent failures kill the one original action.** `needAccount()` pushing to `/me` does nothing visible with NativeTabs. Any failed call attempt must open a sign in sheet that explains "Sign in to make your call. It resolves in 7 days."
4. **Website = same clone look.** `web/landing/public/index.html` opens straight into the same rail. Add the call ticket chip and a one line first visit hint: "Call it before it blows up."

## 6. Prioritized changes to bring every score to at least 8

### P0 (before App Store submission)

| # | What | Where | Why | How we know it worked |
|---|---|---|---|---|
| P0.1 | Make the call visible: stamp, resolve date, scout number, split after vote (S1). Replace silent `router.push('/me')` with a sign in or finish onboarding sheet. | `ui/PromoReel.tsx` `vote()`, `needAccount()`; vote handler in `services/api/src/index.js` returns `rank`, `resolves_at`, `split` | The only original action currently gives zero feedback; also shows App Review a community mechanic (3.2.2). | 5 of 5 TestFlight testers can say when their call resolves; 0 silent taps in a Playwright and on device check. |
| P0.2 | Rename tabs: "For you" to "Today's Drop", "Top" to "Resolved", "Featured" to "Team picks". | `app/(tabs)/index.tsx` `TABS`, i18n en/es/tr, web `content/ui.json` | Removes the most TikTok identified label; ties tabs to the prediction loop. | Grep finds no "For you" string in app or web; 5 second test below. |
| P0.3 | Call ticket chip on every promo (S2). | `PromoReel.tsx`, `PROMO_SELECT` in API | Makes the difference visible before any tap. | Screenshot 01 equivalent shows the chip in the first frame. |
| P0.4 | Scout profile shows My Calls (empty state: "Make your first call in Today's Drop"). | `app/(tabs)/me.tsx`, `GET /v1/me/calls` | Fixes "everything is missing" and gives identity. | Founder's own retest: profile after Apple sign in is not empty. |
| P0.5 | First session starts with a game trailer. | `lib/fair-queue` first round or `/v1/feed` order | Matches the decided niche and positioning line. | First promo on a fresh install is Hauling Empire or another game. |

### P1 (before public launch)

| # | What | Where | Why | How we know it worked |
|---|---|---|---|---|
| P1.1 | Resolver job: set `hit_outcome`, update `scout_stats`, compute Hit Score per weekly cohort, void under 150 views. | `daily(env)` in `services/api/src/index.js` | Without resolution there is no loop and no return reason. | Test promos resolve on day 7 in a staging D1; scout scores change. |
| P1.2 | Today's Drop finite flow: 7 promos, progress dots, end card, "Keep watching". | `index.tsx`, web `public/feed.js` | Ritual and return time, opposite of infinite scroll. | Drop completion rate and D1 return measured from `view_events`. |
| P1.3 | Resolution moment plus "I called it" share card with chevron. | API, new screen or sheet, image generation | Payoff and organic growth. | Share rate per resolved correct call; target 10% or more. |
| P1.4 | Bottom call bar, slim rail; chevron call animation. | `PromoReel.tsx` styles `rail`, new `CallBar` | Breaks the TikTok silhouette; own motion signature. | 5 second test: 6 of 10 strangers describe it as "predict which games will blow up", fewer than 3 say "TikTok". |
| P1.5 | 20 to 30 real indie trailers with permission. | Seed via `services/api/scripts/gen-seed-sql.py` or creator onboarding | Supply makes early calls possible and removes "founder only" look. | At least 20 non founder promos live; New tab has weekly fresh items. |
| P1.6 | Web parity: chip, hint line, tab names. | `web/landing/content/*.json`, `build.py`, `public/feed.js` | Website is the first touch for many; same clone risk. | Live page review. |
| P1.7 | USPTO knockout search for PromoVote (classes 35, 42) before spending on brand assets. | Founder / lawyer | Trademark score cannot pass 8 without it. | Written search result on file. |

### P2 (later)

* External signals in Hit Score (Steam wishlist or follower deltas) once measurable and fraud resistant.
* Category leaderboards of scouts ("Top tycoon scout this month"), Monday "Week's 10" card.
* Creator side embed: "Called by 412 scouts before it blew up" badge for the developer's own site, feeding the Trailer Test sale.
* Push notification on resolution day (needs notification permission flow and rate limits).

## 7. Would I invest at pre-seed?

Not today. Not because the idea is wrong, but because the shipped product hides the one thing that makes it different, and supply is 3 founder creators. Today I would be funding a TikTok layout competing with TikTok, Netflix and Steam for attention.

What would change my mind (all three):

1. **Product proof:** at least 40% of first session users make a call, at least 25% of callers come back on their resolution day, and a 5 second test where 6 of 10 people describe the app as "calling which new games blow up", not "TikTok for ads".
2. **Supply proof:** 30 or more non founder creators posting, at least 40% of them posting a second promo (the verdict's gate for stage 2).
3. **Money proof (unchanged from the verdict):** by week 12, 50 paying developers, about $2,000 per month, 1,000 weekly voting users, week 4 retention above 20%.

Hit those and I would discuss a $250K to $500K pre-seed. The position is defensible only if the scoreboard is real; a vertical feed alone is not a company.

## Sources

* [Netflix vertical feed (PetaPixel, Jan 2026)](https://petapixel.com/2026/01/29/following-tiktok-and-instagram-netflix-is-set-to-roll-out-vertical-videos/)
* [Disney+ Verts launch (Sports Video Group, Mar 2026)](https://www.sportsvideo.org/2026/03/13/disney-follows-in-espns-footsteps-with-launch-of-verts-vertical-video-feed-on-mobile/)
* [Steam Discovery Queue overlay redesign (PCGamesN)](https://www.pcgamesn.com/steam/discovery-queue-update)
* [Steam Next Fest June 2025 (GosuGamers)](https://www.gosugamers.net/entertainment/news/75532-steam-next-fest-june-2025-edition-kicks-off-with-thousands-of-free-game-demos)
* [GameSwipe on Google Play](https://play.google.com/store/apps/details?id=com.kihicow.gameswipe&hl=en_US)
* [SWIPEPLAY](https://swipe-plays.pro/)
* [GameFeed on Google Play](https://play.google.com/store/apps/details?id=com.game.feed.play.tok.reel)
* [TikTok Creative Center in 2026 (Creatify)](https://creatify.ai/blog/tiktok-creative-center)
* [Foreplay swipe file](https://www.foreplay.co/swipe-file) and [Foreplay vs MagicBrief (AdManage)](https://admanage.ai/blog/foreplay-vs-magicbrief)
* [Product Hunt algorithm changes](https://scour.ing/p/https://awesome-directories.com/blog/product-hunt-launch-guide-2025-algorithm-changes)
* [Adbowl](https://bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq.ipfs.4everland.io/wiki/ADBOWL.html), [AdPinion (TechCrunch)](https://techcrunch.com/?p=7749), [USA Today Ad Meter (ClickZ)](https://www.clickz.com/clickz/news/2113701/usa-facebook-pair-super-bowl-meter)
* [Mistplay Audience Network, May 2026](https://digital-release.kxan.com/business/press-releases/cision/20260514MO58694/mistplay-launches-mistplay-audience-network-following-strategic-acquisitions-marking-major-expansion-in-rewarded-advertising)
* [GameDiscoverCo models for indie devs (80.lv)](https://80.lv/articles/gamediscoverco-helping-indie-devs-with-models-and-data/)
