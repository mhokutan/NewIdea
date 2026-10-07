# Marketplace Economist review: user side value and the two sided marketplace

Date: 2026-10-07. Reviewer: Marketplace Economist and Pricing lead.
Scope: why a player or shopper would watch promos on PromoVote instead of TikTok, YouTube or Steam; cold start with 3 founder creators and 21 promos; originality from the user's point of view; signature features; the founder's new idea of a paid monthly creator membership with stories.
Sources read: `docs/review/brief.md`, `docs/00-idea-brief.md`, `docs/01-team-verdict.md`, `docs/03-profiles-spec.md` (scoring rules), screenshots 01 to 13, `apps/mobile/src/app/(tabs)/index.tsx`, `apps/mobile/src/ui/PromoReel.tsx`, `apps/mobile/src/lib/fair-queue.ts`, `apps/mobile/src/app/(tabs)/explore.tsx`, `services/api/src/index.js`, `services/api/migrations/0002_core.sql`, `web/landing/content/promos.json`.

Domain score for this role: **Marketplace liquidity and user side value** (does a new user find enough good, fresh, honest content, and does each side make the other side more valuable).

## 1. Score table

| # | Area | Score | Evidence (one sentence) |
|---|---|---|---|
| 1 | Retention | **3** | Nothing brings a user back tomorrow: calls are stored but never resolved (no resolution job in `daily()`, `scout_stats` is created and never updated), there is no daily drop, no reveal, no notification, and the catalog repeats after about 14 promos. |
| 2 | Session time | **4** | An English viewer has 9 English promos totalling 180 seconds; my simulation of `nextRound` shows the first non English promo at slot 8 (median) and the first repeat at slot 14, so a session runs dry in about 3 to 5 minutes. |
| 3 | Originality (user view) | **5** | The three ideas only PromoVote has (fair turns, charts money cannot buy, called it reputation) are all invisible in the app today, so a user sees a vertical feed with a right rail, which reads as "TikTok for ads". |
| 4 | Trademark and trade dress (user facing wording and patterns) | **6** | "For you" is TikTok's signature tab name, the right rail of round buttons plus bottom left creator block is the TikTok layout, and gradient rings around creator circles echo Instagram stories; each item alone is common, together they read as a copy. |
| 5 | Marketplace liquidity and user side value | **3** | Supply is 3 creators, all made by the founder (each tagged "Made by the PromoVote founder"), across 3 unrelated niches (truck game, Etsy planners, manifestation app), with 0 followers shown, an empty Top tab and no perks exposed, so the user side has very little to discover. |

Every score is below 8. Section 7 lists the minimum changes to lift each one to 8 or more.

## 2. Why would a player or shopper watch here instead of TikTok, YouTube or Steam?

Honest answer: today, they would not. As designed in `docs/01-team-verdict.md` and `docs/03-profiles-spec.md`, they would, for four reasons that no incumbent offers together.

| Need of the user | TikTok / Reels | YouTube | Steam (Discovery Queue, Next Fest) | PromoVote (as designed) |
|---|---|---|---|---|
| "Show me new things, not the same big names" | Algorithm favors what already performs; ads blend in | Search driven, you must know what to look for | Strong for PC games, weighted by sales and wishlists | **Fair turns:** every creator gets the same number of turns, so unknowns reach you first |
| "Can I trust what is popular?" | Popular can be bought (Spark Ads, promote) | Trending mixes paid and organic signals | Top sellers are honest but favor already big games | **Honest charts:** Boost is labeled and never counts toward charts |
| "Do I get anything for having good taste?" | Likes, nothing persistent | Nothing | Curator pages, but only for big curators | **Called it:** predict early, get a public, provable taste record (Scout Score, badges) |
| "Is there something in it for me?" | Random promo codes | Sponsor codes in long videos | Sales, but not tied to discovery | **Perks:** keys, codes and betas from creators, never tied to votes |
| "Everything in one place: mobile games, apps, shops, creators" | Yes but unlabeled | Yes but long form | PC games only | Yes, short, labeled, with a direct CTA |

The user value proposition in one line: **"See it before everyone else, prove you called it, and know the chart was not bought."**

The economic logic behind it: in a normal ad platform the user pays with attention and gets nothing back. Here the user is a curator. Their scarce input is judgement (a call), not watch time. Fair turns give them the raw material (unknowns), the reveal gives them the payoff (being right), and honest charts make being right worth bragging about. Remove any one of the three and the loop collapses back into "a feed of ads".

**The gap today:** none of the four is visible in the build.

| Unique value | Exists in data or code? | Visible to the user? |
|---|---|---|
| Fair turns | Yes (`lib/fair-queue.ts`) | No. Nothing tells the user the feed is fair or shows rounds |
| Honest charts | Yes (Top tab rule, `TOP_MIN_VIEWS = 50`, boosts excluded) | Only as an empty black screen with one sentence (screenshot 04) |
| Called it reputation | Schema only (`calls.outcome`, `scout_stats`) | No. Votes give no feedback, no reveal date, nothing resolves, profile is empty (screenshot 13) |
| Perks | Schema only (`perks`, `perk_codes`); API returns `hasPerk` | No. No badge, no claim flow, no API endpoint |

## 3. Cold start: what a new user sees on day 1

### 3.1 Inventory on day 1

| Item | Value |
|---|---|
| Creators | 3 (Hauling Empire 11 promos, Poleris 6, Nicheable 4), all founder owned |
| Promos | 21, total 418 s of video |
| English promos | 9 (Hauling Empire 2, Nicheable 4, Poleris 3), total 180 s |
| Turkish promos | 11 (Hauling Empire 8, Poleris 3) |
| Spanish promos | 1 |
| Niches | truck tycoon game, Etsy spreadsheets and planners, manifestation and meditation app |

Simulation of the current `nextRound` for an English viewer (2,000 runs, script in scratchpad):

| Metric | Result |
|---|---|
| Median slot of first non English promo | 8 |
| Median slot of first repeat | 14 |
| Non English promos in the first 20 slots (average) | 7.7 |

Root cause in `fair-queue.ts`: the sort key is `seen` first and language second, so once a creator's English promos have been seen once, an unseen Turkish promo beats a seen English one. Fairness between creators is correct; fairness should not override the viewer's language.

### 3.2 Day 1 walk through (user's eyes)

1. Opens app. First promo (screenshot 01) is a Nicheable Etsy planner, a still spreadsheet image, not a game trailer. The positioning ("discover new games") breaks in the first second.
2. Taps "Will blow up". Nothing visible happens (founder test item 3). No reveal date, no "+ score pending".
3. Scrolls. Truck game, planner, meditation app, truck game. Around promo 8 a Turkish video appears; around promo 14 the first repeat.
4. Taps Top: a black screen (screenshot 04). Taps Featured: a promo with the "Picked by the PromoVote team" note overlapping the title (screenshot 05).
5. Opens a creator: "0 followers", "Made by the PromoVote founder" (screenshot 07). Three out of three creators say this. The user concludes: this is one person's portfolio app.
6. Profile after sign in: name, handle, Sign out, Delete account (screenshot 13). No score, no calls, no saved, nothing to come back for.

Session ends at roughly 3 to 5 minutes. Next day: same 21 promos, nothing resolved. Expected D1 retention in this state: low single digits.

### 3.3 Chicken and egg: which side to subsidize first

This is a supply led marketplace. Viewers come for the content, creators come for the viewers, but creators with ready made trailers are cheap to recruit and hungry for exposure, while viewers are expensive (paid acquisition loses money on every view, per the verdict). So:

* **Subsidize supply first** (free uploads, concierge onboarding, the founder personally uploading for the first 30 to 50 creators with permission). Never charge the supply side before liquidity.
* **Win demand with format, not money**: a finite daily drop plus a reveal loop makes a small catalog feel intentional instead of empty.
* **Seed with honest "not yet on PromoVote" content** if needed: official public trailers via the YouTube embed player, clearly labeled, with a "Is this yours? Claim it" CTA (the Yelp and Etsy cold start move). Trust and Safety must approve the exact rules first (labeling, impersonation, takedown). Not legal advice.

### 3.4 Liquidity math

**A. Fresh content needed so a daily user never sees a repeat in their language.**
At about 2.6 promos per minute (20 s average plus swipe), a 7 minute session is about 18 promos.

| Model | New promos needed per week per language | With 3 creators at 3 promos/week each |
|---|---|---|
| Infinite fresh feed, 18 per day | 126 | 9 (gap: 117) |
| Daily drop of 5 fresh + replay and Explore | 35 | 9 (gap: 26) |
| Daily drop of 5, at 12 active creators x 3/week | 35 | 36 (covered) |

Conclusion: the verdict's finite daily drop is not only a psychology choice, it is the only model the supply can feed. Target at launch: **at least 12 active creators and 60 English promos**, of which at least 9 creators are not the founder.

**B. Users needed so calls can resolve (current spec: 150 valid views per promo within 7 days).**
DAU needed = promos live per week x 150 / (7 x valid views per user per day). With 15 valid views per user per day:

| Live promos per week | DAU needed to resolve every promo |
|---|---|
| 21 | 30 |
| 60 | 86 |
| 150 | 214 |
| 500 | 714 |

Good news: resolution is reachable early. Bad news: the spec also says a call resolves 7 days after the promo's `live_at`. All 21 seed promos are already older than 7 days at launch, so **a new user's call on any seed promo can never resolve**. The rule must be per call, not per promo (see P0 item 3).

**C. Fair rotation does not scale on its own.** "Two slots per creator per round" gives every creator equal exposure regardless of quality. With 300 creators, a bad promo gets the same turns as a great one, and the user side pays for it in skips. Rule to adopt: **fair floor, earned ceiling**. Every new promo gets a guaranteed fair first batch (for example the first 100 valid views, spread across viewers), then extra turns scale with completion rate and "will blow up" share, with a cap per creator per round so one creator can never dominate. Money never changes either the floor or the ceiling; Boost stays a separate labeled slot. This keeps the promise to creators ("everyone gets a fair start") and to users ("what you see earned its place").

## 4. Originality from the user's point of view

| Element | Looks like | Verdict |
|---|---|---|
| Vertical full screen feed, swipe up | TikTok, Reels, Shorts | Generic pattern, acceptable |
| Right rail of round icon buttons, creator block bottom left | TikTok | Too close in combination; differentiate |
| Tab name "For you" | TikTok's signature | Rename |
| Creator circles with gradient ring (Explore) | Instagram stories | Use lime ring and a fair turn meaning |
| "Will blow up / Not for me" | Own | Strong, keep, make it the hero |
| Top tab honest empty state | Own idea, poor execution | Turn into an unlock mission |
| Featured "never paid" note | Own | Good, move off the title |

Score today 5 because the parts that are original are hidden and the parts that are visible are borrowed. Score reachable: 8 to 9 once the reveal loop, rounds and the unlock mission are on screen.

## 5. Proposed signature features (user side)

1. **Fair Rounds.** The feed is shown in rounds: "Round 3: every creator gets 2 turns." A thin progress bar at the top fills per promo. At the end of a round, a full screen card: "Round done. You saw 6 creators. 3 calls locked, reveal on Oct 14. Next round or Explore." This makes fairness visible, gives natural stopping points that end on a positive note (good for retention), and is not a TikTok pattern.
2. **Call it and Reveal Day.** Tapping "Will blow up" locks the call with a visible stamp: "Called. Reveals Oct 14." The profile shows a "Pending reveals" shelf with countdowns, and the opening screen on reveal day shows "You called Hollow Lantern early. Right, x3." This is the return trigger the app is missing.
3. **Daily Drop.** "Today's drop: 5 new promos" at the top of the feed, finite, then "Drop done, see you tomorrow at 6 pm" with the option to keep browsing older promos. Matches the verdict and the supply math.
4. **Charts unlock mission.** Replace the black Top screen with a community goal: "Charts open when 50 scouts vote this week: 12 of 50. Money can never buy a spot." Each call moves the bar. The empty state becomes a reason to vote and invite.
5. **Gift inside.** A small "Gift" chip on promos with an active perk, opening a claim sheet. Claim never depends on voting, following or rating (FTC and platform rules). Shoppers get a concrete reason to open the app.
6. **Scout card.** Shareable card with "Called it x4, Scout level 3", the only growth loop where the user brags about taste, not about the app.

## 6. The founder's new idea: paid monthly membership with stories for creators

### 6.1 Context

On 2026-10-06 the founder removed subscriptions ("No subscriptions", brief says do not reopen). The reason recorded in the verdict: a monthly fee makes creators expect guaranteed reach, which forces either paying viewers or refunds. A paid creator membership with stories brings that exact risk back the next day. The decision is the founder's; below is the economic effect so it is an informed one.

### 6.2 Effect on fairness

Stories sit at the very top of the app (creator circles row in Explore, and on mobile likely at the top of the home screen). That row is the most valuable placement in the app. If only paying creators can post stories:

| Creators total | Paying (10%) | Share of creators | Share of above the fold story impressions |
|---|---|---|---|
| 100 | 10 | 10% | close to 100% |
| 1,000 | 100 | 10% | close to 100% |

That is pay for placement on the most visible surface. It directly breaks the two promises that make PromoVote original to users: "every creator gets equal turns" and "money cannot buy position". Users notice quickly ("the top row is always the same paying accounts"), and the honest positioning that differentiates us from TikTok is gone.

### 6.3 Effect on marketplace balance

* It taxes the side we must subsidize. Supply is the cheap side to grow and the side we are short on (3 creators, all founder). A fee at this stage slows the recruitment of the next 50 creators.
* It creates a reach expectation that the demand side cannot meet yet. At 100 DAU and 15 views each, the whole app delivers 1,500 views a day; a paying creator in a pool of 30 will get about 50 views a day and will ask for a refund.
* Apple and Google: a creator subscription for in app digital features must be IAP and must give ongoing value (App Store guideline 3.1.2). Feasible, but adds review risk while the app still has to prove it is not "primarily ads" (3.2.2).

### 6.4 Unit economics (why the money is not worth the trade today)

| Item | Value |
|---|---|
| Price (example) | $9.99 / month via IAP |
| Store fee (Small Business Program 15%) | $1.50 |
| Net per paying creator | $8.49 |
| Cost of stories (15 s, 720p, about 2 MB each, 30 per month on R2, free egress) | well under $0.01 per creator per month |

| Active creators | Conversion | Monthly net revenue |
|---|---|---|
| 3 (today) | 100% | $25 |
| 100 | 10% | $85 |
| 1,000 | 5% | $425 |

Margin is near 100%, but the absolute amount is tiny until there are thousands of creators, while the damage to fairness and to supply growth starts on day 1.

### 6.5 Recommendation

* **Stories: yes, and free for every creator.** Stories are the cheapest way to fill the cold start: a creator can post a 10 s "devlog today" or "new code live" without making a full promo. That gives users fresh content daily from a small creator base. Order the story row by the same fair rotation (least seen first, never the same order twice), never by payment.
* **Membership: not now.** Revisit only when all three are true: at least 100 active creators, at least 1,000 DAU, and creators are asking for tools. Then sell **tools and capacity, never reach or position**: Pro analytics, longer uploads (already decided as paid), scheduling, perk tools, more story slots per day (capacity, but each story still gets only its fair turn in the row). Rule to write into the spec: "A paid product may increase what a creator can make or measure, never how often or where the app shows it, except the labeled Sponsored slot."

## 7. Minimum changes to bring every score to at least 8

### P0: before App Store submission

| # | What | Where | Why | How we know it worked |
|---|---|---|---|---|
| 1 | Vote, Save feedback: stamp "Called. Reveals <date>" on the reel; for guests, store calls on device and sync on sign in ("Your 3 calls are saved, sign in to lock them"); sync time is the call time (no backdating) | `ui/PromoReel.tsx` (`vote`, `needAccount`), `lib/api.ts`, `/v1/calls` | Founder test item 3; the core loop must answer every tap | 100% of vote taps produce a visible change in a Playwright run; guest to sign in conversion is measurable |
| 2 | Language first, then fairness: sort by language tier first, `seen` second; other languages only after the viewer's language and English are exhausted, or not at all | `lib/fair-queue.ts` (`nextRound` sort key) and `web/landing/public/feed.js` | Simulation: 7.7 of the first 20 slots are not in English | Re run simulation: 0 non English promos in the first 20 for an English viewer |
| 3 | Make calls resolvable at small scale: resolve per call, 7 days after the call, by "crowd reveal": correct if the promo's will blow up share among votes cast after yours is at or above its category median, with at least 20 later votes, else void. Early multiplier by voter position stays. Add to `daily()` and update `scout_stats` | `services/api/src/index.js` (`daily`), `docs/03-profiles-spec.md` section 3.3 | Today nothing resolves, and seed promos are already past their window | A test scout's call shows `outcome` correct or incorrect 7 days later; `scout_stats.scout_score` changes |
| 4 | Scout profile is not empty: Scout Score, Pending reveals shelf with countdowns, Saved list | `app/(tabs)/me.tsx`, `/v1/me` | Screenshot 13 and founder item 1 | Profile shows at least 3 sections for a new scout |
| 5 | Replace the black Top screen with the charts unlock mission ("12 of 50 scouts voted this week") | `app/(tabs)/index.tsx` (`EMPTY.top`), new count in `/v1/home?tab=top` | Empty screens kill sessions; turns honesty into a goal | Top tab tap to next action rate; zero blank screens in a screenshot review |
| 6 | Rename "For you" to an own name (suggestion: "Fair feed" or "Drop"), use lime rings, not gradient rings, on creator circles | `index.tsx` TABS labels, `ui.json`/i18n keys `home_for_you`, `explore.tsx` | Trade dress distance from TikTok and Instagram | Legal and design reviewers sign off |
| 7 | Hide follower counts under 10 ("New creator") and show the founder disclosure once, smaller | `app/creator/[handle].tsx`, `PromoReel.tsx` (`founder_made`) | "0 followers" plus 3 of 3 founder tags reads as a vanity app | Qualitative test with 5 users: none say "this is one person's app" |

### P1: before public launch

| # | What | Where | Why | How we know it worked |
|---|---|---|---|---|
| 8 | Supply: recruit at least 9 non founder creators, reach 60 English promos, game first (lead with game trailers, not planners) | Ops, `promos.json` seed, `gen-seed-sql.py` | Liquidity math 3.4 A | Catalog check: at least 12 creators, 60 English promos |
| 9 | Daily Drop (5 fresh per day) with a "Drop done" card and an evening push | `index.tsx`, new `/v1/drop`, Expo notifications | Only model the supply can feed; return trigger | D1 at least 30%, D7 at least 15% (verdict target) |
| 10 | Fair Rounds UI: round progress bar and round complete card | `index.tsx`, `fair-queue.ts` returns round metadata | Makes the unique value visible; healthy stopping points | Average session at least 6 minutes and at least 2 rounds per session |
| 11 | Reveal Day opening screen and shareable Scout card | `me.tsx`, `index.tsx` launch modal, share image | The payoff of the loop and the growth loop | Share taps per resolved correct call at least 10% |
| 12 | Perks visible: "Gift" chip and claim sheet, never tied to votes | `PromoReel.tsx`, new `/v1/perks/:id/claim` | Concrete shopper value | Perk claim rate per perk impression |
| 13 | Free creator stories ordered by fair rotation | `explore.tsx` circles row, new `stories` table | Fresh content from a small base; answer to the membership idea | Share of DAU who open at least one story; stories per creator per week |

### P2: later

| # | What | Where | Why | How we know it worked |
|---|---|---|---|---|
| 14 | Fair floor, earned ceiling ranking, moved server side | `/v1/feed`, view and skip signals in `view_events` | Fairness that scales without hurting quality | Skip rate falls as catalog grows; no creator above cap per round |
| 15 | Labeled "Not yet on PromoVote" YouTube embeds with claim CTA, only after Trust and Safety approval | `promos` with `source = 'embed'` | Cold start seeding the Yelp and Etsy way | Claim rate of embedded profiles |
| 16 | Creator membership only after 100 creators and 1,000 DAU, tools only, never reach | Pricing spec | Protects fairness and supply growth | Gate met before any paywall ships |

## 8. Expected scores after the changes

| Area | Today | After P0 | After P1 |
|---|---|---|---|
| Retention | 3 | 6 | 8 |
| Session time | 4 | 6 | 8 |
| Originality (user view) | 5 | 7 | 9 |
| Trademark and trade dress (wording, patterns) | 6 | 8 | 8 |
| Marketplace liquidity and user side value | 3 | 5 | 8 |

Retention, session time and liquidity cannot reach 8 with code alone; they need P1 item 8 (real supply). That is the honest bottleneck: the app is now ahead of its catalog.
