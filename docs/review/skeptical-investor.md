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

---

# Round 2

Date: 2026-10-07. Inputs: `docs/review/brief-r2.md`, screenshots `docs/review/screens-r2/01..19`, `apps/mobile/src/ui/PromoReel.tsx`, `apps/mobile/src/app/(tabs)/explore.tsx`, `services/api/src/index.js` (vote handler around line 688, `resolveCalls()` at line 883).

## Kurucuya kısa özet (Türkçe)

Büyük ilerleme var. İlk 10 saniye artık TikTok gibi okunmuyor. "Today's Drop", 7 parçalı ilerleme çubuğu, alttaki iki büyük çağrı butonu ve dokununca çıkan "Called: Will blow up. Result Oct 14. Scout #1" bileti uygulamaya kendi kimliğini veriyor. Round 1'de istediğim 5 imza özelliğin 4'ü yapılmış. Hâlâ 8'in altında kalan tek ciddi konu sonuç kuralı. Şu an bir tahmin, sonradan gelenlerin yarısı aynı şeyi söylerse "doğru" sayılıyor. Bu ölçtüğü şey "tuttu mu" değil, "kalabalık katıldı mı". Bu yüzden "her şeye erkenden Will blow up de" stratejisi neredeyse hep kazanıyor ve arkadaş grubuyla kolayca oynanabiliyor. Düşük trafikte de çoğu sonuç "void" çıkacak, yani ilk ödül anı boşa gidecek. Kalan maddeler küçük ve aşağıda listeli.

## 1. Scores

| # | Area | R1 | R2 | Evidence (one sentence) |
|---|---|---|---|---|
| 1 | Retention | 4 | 6 | The loop now exists (calls, Result Oct 14, Scout Score, end card "results in 7 days"), but with the beta rule of 10 later calls most first results at today's traffic will be "void", and there is no reminder before day 7. |
| 2 | Session time | 4 | 6 | A finite Drop of 7 plus "Keep watching" is the right shape, but the pool is still about 16 promos from 3 founder creators, so "Keep watching" repeats quickly. |
| 3 | Originality | 3 | 7 | Screenshots 01 and 13 now read as their own product: "Today's Drop" with progress segments, a two button call bar with the chevron, and a ticket after the call; the right rail of round icons and full bleed video still carry some TikTok silhouette, and promos show no open call status before you tap. |
| 4 | Trademark and trade dress safety | 6 | 7 | "For you" and story rings are gone and creator tiles are rounded squares; segmented progress bars are a generic pattern, but the USPTO knockout search for PromoVote is still not on file. |
| 5 | Differentiation and competitive position | 4 | 6 | The prediction game is finally visible, which is the white space no competitor holds, but the resolution rule scores agreement with the later crowd instead of whether the promo did well, so "I called it" can be farmed and does not yet mean taste. |

## 2. First 10 seconds: still a TikTok clone?

No, not anymore. A new user sees "Today's Drop", a 1 of 7 progress bar, a game trailer first (Hauling Empire, matching the decided niche), and two wide buttons at the thumb: "Not for me" and a lime "Will blow up" with the double chevron. Tapping it as a guest opens "Sign in to make your call. Your call locks in and the result comes in 7 days" (screenshot 02). After the call the bar becomes a ticket (screenshot 13). The end card (05) says "That's today's drop". None of TikTok, Reels, Shorts, Steam, SWIPEPLAY or Product Hunt has this sequence. This is the signature I asked for.

What still keeps Originality at 7: the right rail (Save, Share, More in dark circles) plus a full bleed video is still the TikTok layout above the call bar, and the promo itself shows no state ("Open: 6 days left, 12 scouts called" or "Early: under 100 views") before the user acts. S2 from round 1 is the missing piece.

## 3. The remaining fatal flaw: what "right" means

`resolveCalls()` (line 883) marks "Will blow up" correct when at least 50% of later valid calls on the same promo are also "Will blow up". Three problems:

1. **Dominant strategy.** Scouts lean positive (people skip what they dislike, and "Not for me" feels rude to small creators). If the average later share of "Will blow up" across promos is above 50%, then calling "Will blow up" on everything, as early as possible, wins most of the time and earns the x3 early multiplier. The scoreboard then rewards speed and volume, not taste. The Scout Score becomes noise and "Called it" loses meaning.
2. **Collusion.** One early scout plus 10 friends calling "Will blow up" later equals a guaranteed 30 points and a "Called it". Creators cannot vote, but their friends can sign up as scouts with Apple or Google. There is no per promo cluster check.
3. **It contradicts our own spec.** `docs/03-profiles-spec.md` defines a hit by Hit Score (completion, saves, button taps, follows from the promo's own views) with calls excluded, exactly so predictions cannot be self fulfilling. The beta rule is the opposite.

Also, with `RESOLVE_MIN_LATER = 10` and today's traffic, almost every Oct 14 result will be "void". The first payoff moment, the one that should bring people back, will say "void".

What would need to be true for the scoreboard to be a moat: a call is right only if the promo beat its peers on real behaviour, and saying "yes" to everything does not pay.

## 4. Remaining blockers (smallest change first)

### P0 (before App Store submission)

| # | What | Where | Why | Done when |
|---|---|---|---|---|
| P0.1 | Hide test creators ("Test Studio", "Pixel Fox 9877") from public lists, or delete them from the live D1. | Explore creators query in `services/api/src/index.js`; data in D1 `promovote-db` | They appear on the live Explore (screenshot 07). A reviewer or first user sees fake accounts. | Explore shows only real creators on the production API. |
| P0.2 | Label founder promos in Charts ("Made by the PromoVote founder"), and only open Charts after the 50 valid view floor from docs/04 section 1.2. | `apps/mobile/src/app/(tabs)/explore.tsx` lines 76 to 84; `/v1/home?tab=top` | Charts today show one founder promo at #1 with no label (screenshot 07). Our own rule in docs/04 section 1.3 requires the label; without it "paying never buys a spot" looks like self dealing. | The label is visible on every founder item in Charts; Charts stay empty below the floor. |
| P0.3 | Base rate fix for resolution: "Will blow up" is right only if the later "Will blow up" share on this promo is above the median share of all promos that went live the same ISO week (not a flat 50%). "Not for me" is right if it is below the median. | `resolveCalls()` lines 883 to 899 | Kills the "yes to everything" strategy with a few lines and no new data. | Simulation: a scout who taps "Will blow up" on every promo ends near 50% right, not 80%+. |
| P0.4 | Honest void copy: when a call voids, show "Not enough scouts saw this one yet. No points lost." instead of a bare "void", and keep the call open up to 14 days before voiding. | `resolveCalls()` (extend the window), Scout profile open calls list in `apps/mobile/src/app/(tabs)/me.tsx` | The first result moment must not feel broken. | No call shows a bare "void" on the profile. |

### P1 (before public launch)

| # | What | Where | Why | Done when |
|---|---|---|---|---|
| P1.1 | Call status chip on each promo: "Open: N days left, X scouts called" (bucketed), or "Early: be one of the first 10". | `ui/PromoReel.tsx` above the info block; `PROMO_SELECT` adds call count bucket | Shows the game in the first frame before any tap; this is what takes Originality from 7 to 8. | 5 second test: 6 of 10 strangers say "predict which games will blow up". |
| P1.2 | Blend the outcome: once a promo has 150 valid views, resolve by Hit Score rank in its weekly cohort (calls excluded, as in the spec), with the crowd rule only as the low traffic fallback. | `resolveCalls()`, Hit Score from `view_events`, saves, clicks | Makes "Called it" mean real early taste; this is the moat. | Weekly job writes `hit_outcome` on promos; calls resolve against it. |
| P1.3 | Collusion guard: ignore later calls from accounts created after the early call that have fewer than 3 calls on other creators, and cap "Called it" to once per creator per scout per month. | `resolveCalls()` later count query (line 889) | Stops friend rings from farming. | Seeded test ring of 10 fresh accounts does not flip an outcome. |
| P1.4 | Daily local reminder ("Today's drop is ready") and a day 7 "Your result is in" notification. | Planned list in brief-r2 | The loop needs a trigger; without it the 7 day gap kills D7. | D1 and D7 measured from `view_events`; target D7 15% per the verdict. |
| P1.5 | 12+ real creators, 60 English promos, mostly indie games, with written permission. | Seed script or creator onboarding | Session time and differentiation both cap at 6 on 3 founder creators. | At least 20 non founder promos live; "Keep watching" does not repeat within 20 swipes. |
| P1.6 | USPTO knockout search for PromoVote (classes 35, 42). | Founder or lawyer | The trademark score stays at 7 until it is on file. | Written result saved. |
| P1.7 | Fix the overlap of the Team picks note with the promo headline (screenshot 06). | `app/(tabs)/index.tsx` note position | A small visual bug, but it sits on the first screen of that tab. | Note and promo text never overlap at 393 x 852. |

Expected after P0 and P1: Retention 8, Session time 8, Originality 8, Trademark 8, Differentiation 8.

## 5. Investor view after round 2

Still not a pre-seed investment today, but this is now a product I can describe in one sentence that is not "TikTok for ads": **"A daily drop of new games and apps where you call the hits early and build a public track record."** That is a real position. The milestones from round 1 section 7 stay the same. One addition: before any pitch, show the resolution rule passing a simple test, where "yes to everything" earns no more than a coin flip. If the scoreboard can be farmed, there is no moat.

---

# Round 3

Date: 2026-10-07 (night). Inputs: `docs/review/brief-r3.md`, screenshots `docs/review/screens-r3/01..18`, `services/api/src/index.js` (`/v1/calls` at line 885, `crowdBar()` and `resolveCalls()` at lines 1094 to 1159, `weeklyStreaks()` at line 1166), `apps/mobile/src/ui/ResultReveal.tsx`, `apps/mobile/src/ui/PromoReel.tsx`, `apps/mobile/src/app/(tabs)/me.tsx`, `apps/mobile/src/lib/reminder.ts`, one fresh competitor search.

## Kurucuya kısa özet (Türkçe)

Round 2'de istediğim en önemli düzeltme yapılmış: "Will blow up" artık sabit %50'ye göre değil, son haftanın medyan kalabalık oranına göre doğru sayılıyor. Yani "her şeye evet" demek artık isabet oranında yazı tura seviyesine düşüyor. Günde sadece 7 çağrının puan alması da hacim hilesini kesiyor. Sonuç anı, Results listesi, haftalık seri ve 18:00 hatırlatması ile döngü artık tam. Özgünlük 8'e çıktı. Ama iki somut sorun var. Birincisi puan tablosu hâlâ "her şeye erken evet" diyeni ödüllendiriyor: doğru "Will blow up" 30 puana kadar, doğru "Not for me" sadece 5 puan. Hesapladım: her şeye evet diyen biri, %65 isabetli dürüst bir oyuncudan daha çok puan topluyor. Düzeltmesi tek satır (iki tarafı eşit puanla). İkincisi bir hata: ilk "You called it" ekranı kodda hiç çıkmıyor, çünkü cihaz ilk sonucu "geçmiş" sayıp saklıyor. En önemli an tam da o. Geri kalan açık (içerik azlığı, sonuçların düşük trafikte void olması, marka araştırması) kodla değil, gerçek kullanıcı, gerçek içerik ve senin kararınla kapanır.

## 1. Scores

| # | Area | R2 | R3 | Evidence (one sentence) |
|---|---|---|---|---|
| 1 | Retention | 6 | 7 | The full loop now exists (hourly resolver, ticket outcome, Results with accuracy in screenshot 15, reveal sheet in 13, forgiving weekly streak in 14, 18:00 local reminder offered after the first drop), but the very first reveal never fires (`ResultReveal.tsx` lines 25 to 30), there is still no "I called it" share card, and at founder traffic most calls will void after 21 days because each needs 10 later callers. |
| 2 | Session time | 6 | 6 | Tab swipe and the creator player (07) add paths, but the server pool of 21 is larger than the roughly 16 live promos from 3 founder creators, so Today's Drop and Keep watching repeat within a day; this only closes with real content. |
| 3 | Originality | 7 | 8 | Drop progress, the two button call bar with the chevron, a ticket that turns into a right or wrong result, Results with accuracy, streak dots and the "Charts open when 20 scouts call" progress card (05) form a sequence no feed app, Steam or SWIPEPLAY has; the right rail and the missing pre tap call status remain the only TikTok echoes. |
| 4 | Trademark and trade dress safety | 7 | 7 | "The social network for promos" replaces the old line, Google Play options are hidden on iOS and staff impersonation is blocked, but the USPTO knockout search for PromoVote (classes 35, 42) is still not on file, and I will not score this 8 without it. |
| 5 | Differentiation and competitive position | 6 | 7 | The median crowd bar (`crowdBar()`, line 1098) makes "yes to everything" a coin flip on accuracy and the 7 scored calls per day cap volume, but the point table is asymmetric (right "Will blow up" = 10 x up to 3, right "Not for me" = 5, wrong = 0), so blanket early "yes" still tops the Scout Score, and the outcome still measures agreement with the later crowd, not real behaviour. |

Competitive check (fresh search): consumer side is still empty. Hit prediction exists only as developer tools (GameRefinery's Game Power Score, Playtracker popularity scores). The white space from round 1 is still ours if the score means taste.

## 2. The remaining scoring flaw, with numbers

Rule today (`resolveCalls()`, lines 1132 to 1137): right "Will blow up" earns 10 x multiplier (x3 for the first 10% of callers, x2 for the next 20%), right "Not for me" earns 5, a wrong call costs nothing.

Two scouts, both calling early (x3), 7 scored calls a day:

* **Blanket yes:** accuracy about 50% against the median bar, so 7 x 0.5 x 30 = **about 105 points a day**.
* **Honest scout, 65% accurate, half yes and half no:** 3.5 x 0.65 x 30 + 3.5 x 0.65 x 5 = **about 80 points a day**.

The farmer wins by 30%. Expected value says call "Will blow up" whenever you think it has more than a 1 in 7 chance (early) or 1 in 3 chance (late). So "Not for me" is almost never worth pressing for points, the crowd split drifts positive, and the Scout Score and Level reward speed, not taste. Accuracy is shown (screenshot 15), which helps, but the big lime number on the profile (14) is the score.

What would need to be true: the score must rise with accuracy, not with saying yes. The smallest fix is symmetric points. With right "Not for me" also worth 10 x multiplier, blanket yes earns about 15 per call and the 65% scout about 19.5. Good.

Smaller notes:
* No test guards the rule. In round 2 I asked for a test where "yes to everything" earns no more than a coin flip before any pitch. There is none in `services/api/`.
* Collusion: one early scout plus 10 fresh friend accounts still flips an outcome; there is no guard (round 2 P1.3 still open).
* The word "called it" means two things: the reveal says "You called it! 1 right" for any correct call (13), while the profile stat "Called it" counts only correct early x3 calls (14 shows 0 next to a +30 result; that pairing is likely seed data, since the code sets `is_called_it` for x3, but the copy mismatch is real).

## 3. Remaining blockers (smallest change first)

### P0 (before App Store submission or before any pitch)

| # | What | Where | Why | Done when |
|---|---|---|---|---|
| P0.1 | Fix the skipped first reveal: when no `pv_results_seen` key exists, store `{right: 0, total: 0}` as soon as the scout is signed in (or treat a missing key as zero when the scout has calls made in this install), so the first resolved results do show the sheet. | `apps/mobile/src/ui/ResultReveal.tsx` lines 25 to 30 (the early return on `!total` means the key is never written before the first result, then line 30 swallows it) | The first result is the payoff that teaches the loop. Today a new scout never sees "You called it". | Fresh install, one call, seed it resolved: the sheet appears once. |
| P0.2 | Symmetric points: right "Not for me" = 10 x multiplier, same as "Will blow up". | `resolveCalls()` line 1137 in `services/api/src/index.js`, plus the points line in the Scout help copy | Removes the last dominant strategy; makes the score a taste score. | Simulation below shows blanket yes below a 60% honest scout. |
| P0.3 | A unit test of the rule: 1,000 simulated promos, a blanket yes scout, a blanket no scout, and a 65% scout; assert the 65% scout has the highest score and both blanket players land near 50% accuracy. | New test next to `services/api/src/index.js` (export `crowdBar` and the outcome math as pure functions) | Investor and App Review both need "the scoreboard cannot be farmed" as a fact, not a claim. | Test runs in CI and fails if someone changes the weights back. |

### P1 (before public launch)

| # | What | Where | Why | Done when |
|---|---|---|---|---|
| P1.1 | One meaning for "called it": reveal title says "1 right" or "Right call", and "Called it" stays for early x3 hits only. | `reveal_right_t` in `apps/mobile/src/lib/i18n.ts` (en, es, tr) | The badge must be rare to mean status. | Copy review. |
| P1.2 | Call status chip before the tap: "Open, 9 scouts called" (bucketed) or "Be one of the first 10". | `apps/mobile/src/ui/PromoReel.tsx` chips block near line 183; call count bucket in the feed select | Shows the game in the first frame; the last TikTok echo. | 5 second test: 6 of 10 strangers say "predict which games blow up". |
| P1.3 | Collusion guard: later calls from accounts younger than the early call with fewer than 3 calls on other creators do not count toward `n` or `share`. | `resolveCalls()` later query, line 1122 | A friend ring flips any outcome today. | Seeded ring of 10 fresh accounts does not change the result. |
| P1.4 | "I called it" share card (1080 x 1920, chevron, promo, date called, scout number). | New view in the app, share from the Results row | Status is our replacement for money; status needs an audience. | Share rate per correct call measured; target 10%. |
| P1.5 | Low traffic resolution: for the beta, lower `RESOLVE_MIN_LATER` to 5 while daily active scouts are below 100, and show the count needed on the open call ("needs 3 more scouts"). | `RESOLVE_MIN_LATER` line 1094; open calls row in `me.tsx` | Otherwise most first results are void and the loop never pays out. | Under 30% of beta calls void. |
| P1.6 | Blend real behaviour into the outcome once a promo has 150 valid views (Hit Score rank in its weekly cohort, calls excluded, per `docs/03-profiles-spec.md`). | `resolveCalls()` | Turns "predict the crowd" into "predict the hit"; the copy "The crowd saw it differently" is honest today, but the button says "Will blow up". | `hit_outcome` written weekly; calls resolve against it. |
| P1.7 | USPTO knockout search for PromoVote (classes 35, 42). | Founder or lawyer | Trademark stays at 7 without it. | Written result on file. |
| P1.8 | Real supply: at least 12 non founder creators and 40 promos, mostly indie games, with written permission. | Outreach, seed script or creator upload | Session time cannot reach 8 on 3 founder creators; the drop pool of 21 already exceeds live supply. | Keep watching does not repeat within 20 swipes; Today's Drop is new each day for 7 days. |

**Only real users or real content can close:** Session time (P1.8), the void rate and therefore the payoff side of Retention (P1.5 helps, users decide), and Hit Score blending (P1.6 needs 150 views per promo). Trademark closes only with the founder's search. Everything in P0 is code and small.

Expected after P0 and P1.1 to P1.4: Originality 8, Differentiation 8, Retention 8 in a closed beta with at least 50 active scouts. Session time 8 and Trademark 8 need P1.8 and P1.7.

## 4. Investor view after round 3

Better, and for the first time the mechanism is close to defensible: base rate is fixed, volume is capped, results are shown honestly with "no points lost". I still would not invest at pre-seed today, for the same two reasons: supply is 3 founder creators, and the score can still be topped by saying yes early. P0.2 and P0.3 fix the second in an afternoon. The first is the real company risk, and only outreach fixes it.

Milestones that would change my mind (unchanged in substance): 40% of first session users make a call, 25% of callers return when results land, a 5 second test where 6 of 10 say "calling which new games blow up", 30 non founder creators with 40% posting a second promo, and the verdict's week 12 money gate (50 paying developers, about $2,000 MRR). Add one: the scoring test from P0.3 in CI, shown in the deck.

Sources for the fresh check: [GameRefinery (ArcticStartup)](https://arcticstartup.com/does-a-successful-game-come-down-to-the-right-formula-gamerefinery-thinks-theyve-found-it/?amp=1), [Playtracker popularity score](https://playtracker.net/insight/game/137674).
