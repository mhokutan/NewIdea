# Consumer Growth and Behavioral Design review (2026-10-07)

Role: Consumer Growth and Behavioral Design lead. Domain score: **Engagement loop and habit design**.
Scope read: `docs/review/brief.md`, `docs/00-idea-brief.md`, `docs/01-team-verdict.md`, `docs/03-profiles-spec.md` (sections 3.3, 7.1), screenshots 01 to 13, `apps/mobile/src/**`, `services/api/src/index.js`, `services/api/migrations/0002_core.sql`.

## 1. The one sentence verdict

The engagement loop is fully designed on paper (`docs/01-team-verdict.md` section 4 and `docs/03-profiles-spec.md` 3.3.2 to 3.3.8) and half built in the database (`calls.outcome`, `calls.is_called_it`, `scout_stats.current_streak_weeks`, `freezes_available`, `promos.resolves_at`), but **none of it reaches the scout's screen**. Today the app is an infinite feed of about 18 promos from 3 creators with buttons that give no feedback, so there is no trigger, no reward and no investment. A scout has no reason to open it tomorrow.

## 2. Scores

| # | Area | Score | Evidence |
|---|---|---|---|
| 1 | Retention | **3** | No daily drop, no notification, no reveal, no Scout Score, no streak; votes are not even shown back after a reload (`PromoReel.tsx` keeps `voted` and `saved` only in local state, and `/v1/feed` returns no viewer state). |
| 2 | Session time | **4** | "For you" never ends, but with about 18 promos (`web/landing/content/promos.json`) the scout sees repeats within 6 to 8 minutes, a vote returns nothing, and Top is an empty dead end (screenshot 04). |
| 3 | Originality | **5** | The vote words "Will blow up / Not for me" are distinctive, but the shell (For you tab, full screen video, right side round icon rail) reads as TikTok; the original part, prediction plus reveal, is invisible. |
| 4 | Trademark and trade dress safety | **6** | "For you" is TikTok's signature feed name and the right rail plus tab layout adds to the impression; renaming the first tab to the decided "Today's drop" removes most of this (not legal advice). |
| 5 | Engagement loop and habit design | **2** | Of the Hooked model's four steps only "action" exists, and even that fails silently for non onboarded users (`needAccount()` does `router.push('/me')`, invisible with NativeTabs); trigger, variable reward and investment are all missing. |

## 3. What a scout needs to come back (the loop we decided, mapped to code)

Loop from `docs/01-team-verdict.md` section 4, with current state:

| Step | Decided | In the app today | Gap |
|---|---|---|---|
| Trigger | Evening push "Today's 5 new games are ready" | No `expo-notifications`, no push token table, no reminder time | Missing |
| Opening reward | "The game you called yesterday got 140 wishlists. Hit +1" | No resolution job (`daily()` only cleans up), no "Just resolved" card | Missing |
| Watch and decide | Will blow up / Not for me, Save, skip free | Buttons exist, no feedback, no saved state on reload, a second vote silently 409s | Broken |
| Surprise | Optional perks (beta key, code) from the advertiser | `has_perk` exists, never shown, no claim flow | Missing |
| Closing | "Done for today. Your calls reveal in 7 days." 5 to 7 per day | Infinite loop of the same 18 promos | Opposite |
| Weekly ritual | Monday Top 10 and scout ranking, share card | Top tab empty, Charts "soon" | Missing |
| Investment | Scout Score, level, called it history, badges, weekly streak | Profile shows name, handle, Sign out, Delete (screenshot 13) | Missing |

The most important leading indicator for this product is **open loops per scout**: the number of pending calls waiting to be revealed. A scout with 3 or more pending calls has a concrete, honest reason to return. Today that number is invisible, so it is effectively zero.

## 4. Benchmarks and what is realistic for PromoVote

Approximate public ranges (industry reports from AppsFlyer, Adjust and company filings; treat as directional, not exact):

| App | Habit engine | Typical session | Retention signal | Lesson for PromoVote |
|---|---|---|---|---|
| Average consumer app | none | 3 to 5 min | D1 about 25%, D7 about 10%, D30 about 4 to 6% | Our floor. Without a loop we land here or below. |
| Duolingo | Daily streak, freezes, reminders, leagues | 5 to 15 min | DAU/MAU above 35%, very high for the category | Streaks work when the unit is small and finishable. Their loss aversion copy is the part we do not copy. |
| BeReal | One daily trigger, finite content | 2 to 4 min | Huge D1 at launch, then fell when friends' content got boring | A single daily notification plus finite drop builds D1. Content quality decides D30. |
| Letterboxd | Identity (diary, lists, stats), weekly rhythm | short | Strong long term retention of the core | A profile that shows your taste is the investment that keeps people for years. Our Scout profile should feel like this. |
| Product Hunt | Daily leaderboard reset, hunter status | short, mostly web | Daily return for makers, weekly for viewers | Daily reset plus "I found it first" status maps directly to the drop and called it. |
| Reddit | Karma, community, infinite threads | about 20 min per day for DAU | Strong for engaged users | Reputation without cash value can work if it is visible and earned. |
| TikTok | Personalized infinite feed, huge catalog | about 90 min per day for active users | Very high | **Not realistic for us.** Infinite feed needs millions of videos. With 18 promos it shows repeats and feels empty. |

**Realistic targets for PromoVote** (signed in scouts, first 90 days):

* Session: 3 to 5 minutes (a 7 promo drop at about 25 s each is about 3 minutes, plus reveal, profile, Explore).
* Sessions per active day: 1.3 to 1.6 (drop plus one reveal or profile check).
* D1: 25 to 32%. D7: 12 to 18% (the team gate is D7 at least 15%). D30: 6 to 10%.
* Weekly active scouts completing at least 3 drops: 30% of WAU.
* Notification opt in with a contextual ask after the first drop: 45 to 60% on iOS.

We should optimize **frequency and calls per session**, not minutes. Chasing TikTok minutes with a tiny catalog would hurt both retention and the honest "finite drop" identity.

## 5. Specific observations in code and screens

1. `PromoReel.tsx` `needAccount()`: for a signed in user without a profile it pushes `/me`, which does not visibly switch a NativeTabs tab. The tap looks dead. This is the founder's "buttons just sit there".
2. `PromoReel.tsx` `vote()`: sets local `voted` and swallows errors. The server allows one call per promo (`unique (scout_profile_id, promo_id)`, 409 `already_voted`), but the UI lets the scout flip between choices, which misrepresents what was recorded. After reload the vote is gone from the UI.
3. No haptic and no animation on vote or save. In a prediction product the moment of committing a call must feel physical.
4. `/v1/feed` and `/v1/home` return no viewer state (my call, my save, following). Every screen starts blank for the scout.
5. `me.tsx` `Account()`: no Scout Score, level, streak, pending calls, saves, follows, badges. `/v1/profiles/:handle` already returns `stats` for scouts but the app never reads it.
6. `index.tsx`: "For you" is the default, infinite, and identical to a guest feed. No progress, no end, no daily identity.
7. Top tab (screenshot 04): honest, but a full screen dead end. Featured (screenshot 05): the "Picked by the PromoVote team" note overlaps the video title; there is no reason given for each pick.
8. Follow exists only on the creator page; the feed has no way to follow and follows have no visible effect (spec: followed creators get up to 2 of 7 drop slots).
9. Share sends a generic link. It does not carry the scout's call, so it creates no social proof and no "come prove me wrong" hook.
10. `services/api/src/index.js` `daily()`: no call resolution, no score events, no streak evaluation. Even if the UI existed, the first reveal day would show nothing.
11. Cold start math: the spec voids promos under 150 valid views and uses top 20% of a weekly category cohort. With 3 creators and a few hundred scouts, almost every call will resolve `void`. The reveal loop would be dead on arrival.

## 6. Minimum changes to reach 8 or more

Ordering principle: first make actions feel alive (D0), then give a reason to return tomorrow (D1), then a reason to return in a week (D7). Item numbers are global.

### P0 (must ship before App Store submission)

**1. Actions always answer.**
* What: when a guest or a non onboarded user taps vote, save or follow, open a bottom sheet ("Sign in to make your call" or "Finish your profile to make your call", with one button) instead of `router.push`. On success: haptic (`expo-haptics`, light impact), a short scale animation on the icon, and the button locks to the recorded choice. Handle 409 by showing the existing choice.
* Where: `ui/PromoReel.tsx` (`needAccount`, `vote`, `toggleSave`), `app/creator/[handle].tsx` (`toggleFollow`), new `ui/AuthSheet.tsx`. Add viewer state to `/v1/feed` and `/v1/home` responses (`viewer: { call, saved, following }` per promo, one extra query joined on `calls` and `saves` for the signed in profile).
* Why: a dead tap at the first action kills D0 trust; no D1 is possible after that.
* Worked when: zero silent taps in a 20 tap manual test; vote state survives an app restart; calls per signed in view rises above 15%.

**2. Instant reward after every call (crowd split).**
* What: the `POST /v1/calls` response returns the current split for that promo (`willBlowUpPct`, `totalCalls`, `yourPosition`). The reel shows it only after the scout has called (never before, to prevent herding): "62% of scouts say Will blow up. You are scout #14. Reveals Oct 14." When fewer than 10 calls exist: "You are one of the first scouts here. Early calls count up to 3x." This is honest (spec 3.3.6 early multiplier) and is the variable reward the loop is missing between now and day 7.
* Where: `services/api/src/index.js` `/v1/calls`; `ui/PromoReel.tsx` small result chip under the rail.
* Why: a prediction with no feedback for 7 days is too delayed a reward for a new user. Seeing whether you agree with the crowd is immediate, curious and free of cash value.
* Worked when: calls per session up at least 30% versus build 3; median drop completion above 70%.

**3. "Today's drop" replaces "For you" as the first tab.**
* What: a finite daily list of 7 promos per scout (server picks with the existing fair rotation rules: least seen first, max 2 slots from followed creators, never boosts), a thin progress bar "3 of 7", and a done card at the end: "Done for today. Your calls reveal in 7 days. See you tomorrow." with two optional buttons "Browse New" and "My pending calls". Browsing stays free and unlimited in New and Explore; the drop is the ritual, not a wall. Guests also get a drop (stored by device id) so the ritual starts before sign in. Rename tabs to `Today's drop`, `New`, `Rising` (was Top), `Picks` (was Featured).
* Where: `app/(tabs)/index.tsx` (`TABS`, `EMPTY`), new `GET /v1/drop` in `services/api/src/index.js` (deterministic per profile or device per UTC day, cached in a `daily_drops` table), `lib/i18n.ts` strings in en, es, tr.
* Why: with 18 promos an infinite feed shows repeats and feels empty; a finite drop turns small supply into scarcity and a daily identity (BeReal, Wordle, Product Hunt). It also removes the "For you" trade dress overlap.
* Worked when: drop completion rate above 60%; share of DAU that completes the drop above 40%; no repeat promo inside one drop.

**4. Scout profile v1 (the empty profile problem).**
* What, top to bottom, following spec 3.3 and 1256 to 1263, but only what data supports today:
  1. Header: avatar (initial monogram if none), display name, `@handle`, lime level ring.
  2. Scout Score block: big number (starts at 0), "Level 1", progress bar "50 to Level 2" (threshold `25 * n * (n - 1)`), and one line "Reputation only. No cash value."
  3. Stats row: Calls made, Called it, Accuracy ("after 10 reveals"), Weekly streak.
  4. Today's drop card: "3 of 7 left, Continue" or "Done for today".
  5. Pending calls carousel: poster, your choice, "Reveals in 3 days". Private.
  6. Badges: Early Scout or Founding Scout granted at signup if the email is on the waitlist, plus locked badges in grey with how to earn them (Called It 1, Sharp Eye, Streak 4 weeks). Endowed progress: the scout starts with one badge, not zero.
  7. Tabs: Called it, Saved, Following, each with the spec empty state copy.
  8. Settings row at the bottom (Sign out, Delete account move into a Settings screen).
* Where: `app/(tabs)/me.tsx` (`Account()` rewritten for scouts), new `GET /v1/me/scout` returning `stats`, `pendingCalls`, `saves` (reuse `/v1/saves`), `following`, `badges`, `drop` progress. Seed `early_scout` and `founding_scout` by matching the waitlist D1 table by email at onboarding.
* Why: investment is the step that makes the next session more valuable; an empty profile tells the scout nothing is being kept for them. This is the founder's complaint #1.
* Worked when: at least 40% of new scouts open the profile on day 0; D1 of scouts who opened the profile is higher than of those who did not.

**5. One daily reminder, asked at the right moment.**
* What: after the first completed drop, a soft prompt "Get tomorrow's drop at 7 pm?" with a time picker; only on Yes call the iOS permission dialog. Schedule a **local** daily notification with `expo-notifications` (no server, free). Copy rotates through allowed lines only: "Today's drop is ready", "7 new promos are in". Settings toggle to change time or turn off.
* Where: new `lib/reminders.ts`, done card in `index.tsx`, settings in `me.tsx`, store the time in `account_private` (new column `drop_reminder_time`, already in the spec schema).
* Why: there is no external trigger today. One predictable daily trigger is the cheapest D1 lever that exists.
* Worked when: opt in 45% or more of scouts who saw the soft prompt; D1 of opted in scouts at least 10 points higher.

**6. The reveal must work on day 7 (ship in the same build).**
* What: hourly cron resolves promos whose `resolves_at` has passed: compute outcome, write `score_events`, update `calls.outcome`, `is_called_it`, `scout_stats`. Beta rule for the cold start (publish it in the app): cohort = all promos live in the last 14 days, minimum 30 valid views (not 150), Hit = top 25% by Hit Score. Revisit when weekly valid views per promo pass 150. Opening card on the profile and on top of the drop: "Your call on Hauling Empire was right. +30 (3x early)" with Share.
* Where: `services/api/src/index.js` `daily()` split into `hourly()` and `daily()`, `wrangler.toml` cron, `GET /v1/me/scout` adds `justResolved`.
* Why: the first scouts reach day 7 inside the review and TestFlight window. If day 7 shows nothing, the whole prediction promise is broken at the exact moment it should pay off. Without the lower threshold nearly every call resolves `void`.
* Worked when: more than 60% of resolved calls are non void in the first month; "Just resolved" card opened by 50% of scouts who have one.

### P1 (before public launch)

**7. Reveal push and weekly ritual.** Register a push token (`push_tokens` table) and send at most one reveal push per day, batched: "2 of your calls revealed". Monday 00:00 UTC: "Top 10 of the week" list in the Rising tab and a scout ranking (opt out respected), with a share card. Where: API cron, `index.tsx`. Worked when: D7 at or above 15%, Monday DAU at least 1.3x the weekday average.

**8. Weekly streak, forgiving.** 3 completed drops in a Monday to Sunday week (scout's timezone) counts; 1 freeze every 4 weeks, max 2, applied automatically; shown on profile as "Week 3". Banned copy: anything that threatens loss ("Your streak will die", "Don't lose your progress"). Where: cron weekly job, `me.tsx`. Worked when: 4 week retention of streak holders at least 2x non holders, with no rise in uninstalls after reminders.

**9. Guest calls count after sign in.** Guests can make up to 3 calls stored on device; the sheet says "Sign in to keep your 3 calls. They reveal Oct 14." On sign in they attach to the new profile and become score eligible if still inside the 72 h window. Honest endowed progress, the strongest guest to scout conversion lever. Where: `PromoReel.tsx`, `lib/api.ts`, `/v1/onboarding` accepts `pendingCalls`. Worked when: guest to signed in conversion doubles.

**10. Rising and Picks tabs earn their place.** Rising (was Top): show a community goal instead of a blank screen: "Rising opens at 500 scout calls this week. 212 so far." plus the 3 promos with the most calls in 48 h when at least 10 calls exist. Picks (was Featured): one line "Why we picked it" per promo; fix the note overlapping the title. Where: `index.tsx`, `/v1/home`. Worked when: tab taps on Rising convert to at least one watched promo 70% of the time.

**11. Follow from the feed, with a visible effect.** Small "+" on the creator avatar in the reel. Followed creators' new promos get up to 2 of 7 drop slots and a "From creators you follow" label. Never rewarded with score or badges (spec rule and platform ToS). Where: `PromoReel.tsx`, `/v1/drop`. Worked when: follows per 100 views above 2; follow source `feed` becomes the main source.

**12. Perks as surprise, never as payment.** "Gift inside" chip on promos with `has_perk`; claim from the reel without needing a vote; perk wallet tab on the profile. Higher levels get earlier access to limited perk queues (decided in the verdict), never cash. Where: `PromoReel.tsx`, perk endpoints on existing `perks`, `perk_codes`, `perk_claims`. Worked when: perk claim rate above 5% of perk promo views; no change in vote split on perk versus non perk promos (proves perks do not buy votes).

**13. Onboarding that starts the habit in under 60 seconds.** Spec 7.1: pick at least 3 tags, prefilled handle from the Apple or Google name, then straight into the drop with 3 coach marks ("Skip is free", "Call it", "Save it"). Fix the date of birth row (screenshot 12). Where: `me.tsx` `Onboarding`. Worked when: median time from sign in to first call under 60 s.

**14. Share carries the call.** Share text and link include the scout's call: "I called Will blow up on Hollow Lantern. Reveals Oct 14. promovote.com/?v=slug&by=handle". The landing shows "@handle called this" on open. Where: `PromoReel.tsx` `share`, web landing. Worked when: share to install rate measurable through the `by` parameter.

### P2 (later)

15. Story card 1080 x 1920 and per call "I called it" card (spec 3.3, OG Worker).
16. Follow scouts and curator lists ("Follow this scout's picks").
17. Seasonal events: "Ad of the week", launch week specials, a yearly "Scout Awards".
18. Personal taste stats on the profile ("You call games 2x better than apps"), Letterboxd style year in review.

## 7. Ethical guardrails (keep these in code review)

* Skip is always free and never mentioned as costing anything.
* Scout Score: no cash value, not spendable, not transferable, stated on the profile and in ToS.
* Score, badges and levels are never earned by watch time, number of promos watched, follows, shares or perk claims. Only by calls that reveal correct, early (spec 3.3.5, 3.3.6).
* `not_for_me` never costs points. Honest taste is never punished.
* Notifications: at most 1 reminder plus 1 reveal batch per day, quiet hours 22:00 to 08:00 local, never sent before permission, never loss framed, never fake urgency or fake counts ("23 people are watching now" is banned).
* No red badge counts on the app icon for marketing. Only for real reveals.
* Crowd split shown only after the scout's own call, to avoid herding.
* Perks are never tied to votes, reviews or follows, and are labeled as from the creator.
* Apple 4.5.4: push is optional and not used for unsolicited promotion without opt in; drop reminders are opt in.

## 8. Expected scores after the changes

| Area | Now | After P0 | After P0 + P1 |
|---|---|---|---|
| Retention | 3 | 7 | 8 to 9 |
| Session time | 4 | 7 | 8 |
| Originality | 5 | 8 | 8 to 9 |
| Trademark and trade dress | 6 | 8 | 8 |
| Engagement loop and habit design | 2 | 7 | 8 to 9 |

Honest note: Retention reaches 8 only when the reveal loop runs with real data (item 6 in P0 plus item 7 in P1) and the D7 gate of 15% is measured on real scouts. Until then any score is a prediction.

## 9. Metrics to instrument now

* D1, D7, D30 by cohort week, split guest versus signed in scout.
* Drop completion rate, calls per session, calls per signed in view.
* Pending calls per active scout (target median 5 or more by day 7).
* Reveal card open rate, share rate from reveal.
* Notification opt in rate, opt out rate, uninstall rate in the 24 h after a push.
* Vote split on perk versus non perk promos (integrity check).

Legal notes in this report are not legal advice.

---

# Round 2 (2026-10-07)

Read: `docs/review/brief-r2.md`, screenshots `docs/review/screens-r2/01, 05, 13, 14` and others, `apps/mobile/src/app/(tabs)/index.tsx`, `apps/mobile/src/ui/PromoReel.tsx`, `apps/mobile/src/app/(tabs)/me.tsx`, `apps/mobile/src/lib/i18n.ts`, `services/api/src/index.js` (`/v1/drop`, `/v1/calls`, `callInfo`, `/v1/me/state`, `/v1/me/scout`, `resolveCalls`, `daily`).

## R2.1 What got much better

* **The loop now exists on screen.** Today's Drop with 7 progress segments, a finite end card, and Keep watching after it (screen 05). This is the BeReal / Product Hunt daily ritual we wanted, and it turns a small catalog into a feature.
* **The call ticket is the best idea in the app.** "Called: Will blow up. Result Oct 14. Scout #1" (screen 13) gives a commitment, a date to come back and an early status, all in one bar. The crowd split appears only after the scout calls, so it does not drive herding. This is PromoVote's own pattern, not TikTok's.
* **Every tap answers.** Gate sheet, haptics (`PromoReel.tsx` line 29 and 83), state loaded from `/v1/me/state`, and the 409 returns the existing call. The founder's "buttons just sit there" problem is fixed in code.
* **The profile is no longer empty.** Scout Score card with "Reputation only. No cash value.", level, Open calls with result dates, Saved, Following (screen 14). Open calls are exactly the "open loops" metric from round 1.
* **Calls resolve.** `resolveCalls` exists, wrong calls cost nothing, "Not for me" can be right too, there is a beta threshold of 10 later calls, and the early multiplier rewards being first. Every change goes into `score_events`.
* **Identity and trade dress.** "For you" and the empty Top tab are gone; the tabs are Today's Drop, New, Team picks, and the creator circles are rounded squares.

## R2.2 Scores

| # | Area | R1 | R2 | Evidence |
|---|---|---|---|---|
| 1 | Retention | 3 | **6** | The drop, the ticket date and Open calls give real reasons to come back, but the result is never shown when it lands, there is no reminder, and the drop repeats already called promos from day 2 on. |
| 2 | Session time | 4 | **7** | A 7 promo drop plus Keep watching fits the realistic 3 to 5 minute target; the limit now is the catalog of about 18 promos, not the design. |
| 3 | Originality | 5 | **8** | The bottom call bar that turns into a dated ticket, plus the finite daily drop and Scout Score, read as their own product, not as Reels or Product Hunt. |
| 4 | Trademark and trade dress safety | 6 | **8** | "For you" is gone, the right rail now has only Save, Share and More, and the circles are rounded squares instead of story rings (not legal advice). |
| 5 | Engagement loop and habit design | 2 | **6** | Action and investment are now strong, but the trigger (reminder) is missing, the variable reward at reveal is invisible, and the scoring rule can be gamed by calling "Will blow up" on everything. |

## R2.3 What still keeps scores below 8 (smallest change first)

### P0 (before App Store submission)

**1. Guest end card says "You made 0 of 7 calls".**
Where: `apps/mobile/src/app/(tabs)/index.tsx` `EndCard` (around line 175). For guests and for 0 calls, show "Sign in to make your calls. Results come in 7 days." with the existing gate sheet, instead of a 0 score that feels like failure. Worked when: end card to sign in tap rate is measurable and above 10% for guests.

**2. Make sure the resolver actually runs, and runs on time.**
Where: `services/api/src/index.js` `daily()` and `wrangler.toml` cron. CLAUDE.md still lists "open Workers dashboard once (workers.dev subdomain needed for the daily cron)" as a pending founder action. If the cron never fires, no call ever resolves and the ticket date becomes a broken promise. Also run `resolveCalls` hourly (it is cheap), so "Result Oct 14" is true on Oct 14 in every time zone, and add `lastResolveRun` to `/health`. Worked when: `/health` shows a run in the last 2 hours; first beta calls resolve on their date.

**3. Show the result where the promise was made (the opening reward).**
Today `outcome` comes back in `/v1/me/state` but nothing displays it. The ticket keeps saying "Result Oct 14" after Oct 14, and the profile only increments a counter.
* Ticket (`apps/mobile/src/ui/PromoReel.tsx` around lines 185 to 195): when `outcome` is `correct` show "Right. +30 (3x early)"; when `incorrect` show "Not this time. No points lost."; when `void` show "Not enough scouts called it. No result."
* Profile (`apps/mobile/src/app/(tabs)/me.tsx`): a "New results" card at the top for calls resolved since the last profile visit (keep the last seen time on the device), with a Share button, and a "Results" tab next to Open calls (spec 3.3.9 "Called it" list).
* API (`/v1/me/scout`): add `recent` = last 20 resolved calls with `outcome`, `score_delta`, `multiplier`, `resolved_at`. Also return `accuracy` for the owner (provisional before 10 results).
* Why: the reveal is the variable reward that drives D7. Right now day 7 is silent.
* Worked when: at least 50% of scouts with a new result open the card; D7 of scouts with at least one result is clearly higher than of those without.

**4. Close the "always Will blow up" exploit.**
In `resolveCalls` (lines 882 to 899) a wrong call costs 0, a right "Will blow up" pays 10 to 30 and a right "Not for me" pays only 5, and "right" means at least 50% of later calls agree. The best strategy is to call "Will blow up" on everything. That inflates Scout Score into meaninglessness and, worse, biases the scout verdict that creators see in the studio and later pay for in the Trailer Test.
Smallest fix that keeps the decided "wrong never costs points" rule:
* Score eligible calls only for promos in that day's drop, max 7 per day (set `calls.score_eligible` in `POST /v1/calls`; `resolveCalls` gives points only when it is 1). Calls in New, Team picks and Keep watching still count for the crowd and the creator, just not for score.
* Make "Will blow up" right only when the later share beats the typical promo, not a flat 50%: right when the later share is at least `max(0.5, median later share of calls resolved in the last 14 days)`.
* Show owner accuracy on the profile (from item 3), so spraying "Will blow up" visibly lowers your own number.
Worked when: across scouts the share of "Will blow up" calls stays under about 70%; the median Scout Score does not grow faster than the share of correct calls.

**5. A personal drop that never repeats a called promo.**
Where: `services/api/src/index.js` `/v1/drop` (lines 229 to 252) is the same 7 for every viewer per language per day with public cache. With about 18 promos, a daily scout sees mostly already called tickets by day 2 or 3, so the D1 return lands on nothing to do.
* For signed in scouts, drop promos they already called and use `Cache-Control: private`. For guests, the app filters promos it has already shown in the last 3 drops (stored on the device).
* If fewer than 7 fresh promos are left, show an honest short drop ("4 new today") instead of padding with repeats. Until weekly new promos pass about 35, consider `DROP_SIZE = 5`.
* When the scout reopens the app, start the drop at the first promo they have not called yet (`index.tsx` sets `setActive(0)` on every load).
Worked when: no promo the scout already called appears in their drop; drop completion on day 2 is not lower than on day 1.

**6. One daily local reminder (still listed as not done).**
Same as round 1 item 5: after the first finished drop, a soft prompt "Get tomorrow's drop at 7 pm?", then the iOS permission dialog, then a local `expo-notifications` schedule. Allowed copy only: "Today's drop is ready." Plus, once results exist, the same notification can say "2 of your calls have results" on that day (local, scheduled from the known `resolvesAt` dates, no server push needed). Where: new `apps/mobile/src/lib/reminders.ts`, `EndCard`, settings on Profile. Worked when: opt in rate of 45% or more among scouts who saw the prompt; D1 of opted in scouts at least 10 points higher.

### P1 (before public launch)

7. **First level up should come fast.** Linear `level * 100` means Level 2 needs several right calls, and screen 14 shows an empty bar. Put Level 2 at 30 points (one right early call) and keep the gaps growing after that (spec 3.3.2). Where: `resolveCalls` level formula, `/v1/me/scout` `nextLevelAt`.
8. **Weekly forgiving streak** (3 drops in a week, automatic freeze, no loss copy). The columns already exist in `scout_stats`.
9. **Monday ritual**: charts in Explore plus a top scouts list and a share card, once the progress bar fills.
10. **Share carries the call**: "I called Will blow up on X. Result Oct 14." with `&by=handle`, and an "I called it" card after a right result.
11. **Content supply**: the plan of 12+ creators and 60 English promos is the ceiling for both retention and session time. A daily scout needs about 35 to 50 fresh promos per week.
12. **Perks as surprise**, never tied to calls, follows or reviews.

## R2.4 Expected scores after the P0 list

| Area | R2 now | After P0 |
|---|---|---|
| Retention | 6 | 8 (provisional until real D7 is measured) |
| Session time | 7 | 8 once the personal drop and more content remove repeats |
| Originality | 8 | 8 |
| Trademark and trade dress | 8 | 8 |
| Engagement loop and habit design | 6 | 8 |

Items 1, 2 and 5 are small. Items 3 and 4 decide whether Scout Score means something. Item 6 is the only external trigger the app will have at launch.

Legal notes in this report are not legal advice.

---

# Round 3 (2026-10-07, night)

Read: `docs/review/brief-r3.md`, screenshots `docs/review/screens-r3/01, 02, 04, 05, 11 to 16`, `apps/mobile/src/app/(tabs)/index.tsx`, `apps/mobile/src/app/(tabs)/me.tsx`, `apps/mobile/src/ui/PromoReel.tsx`, `apps/mobile/src/ui/ResultReveal.tsx`, `apps/mobile/src/lib/reminder.ts`, `apps/mobile/src/lib/i18n.ts`, `services/api/src/index.js` (`/health`, `/v1/home`, `/v1/drop`, `/v1/calls`, `/v1/me/scout`, `crowdBar`, `resolveCalls`, `weeklyStreaks`, `scheduled`), `web/landing/content/promos.json`.

## R3.1 Status of my round 2 P0 list

| R2 item | Status | Note |
|---|---|---|
| 1. Guest end card "0 of 7" | Done | `drop_done_guest` and `drop_done_zero` copy plus a Sign in button (`index.tsx` EndCard). |
| 2. Resolver runs on time | Done in code | Hourly cron, `job_runs` heartbeat on `/health`. Still depends on the founder opening the Workers dashboard once so crons fire; confirm `/health` shows `resolve_calls` within 2 hours after deploy. |
| 3. Show the result | Done | Ticket outcome, Results list with accuracy, one time reveal sheet (screens 13 to 15). This is the variable reward the loop was missing. |
| 4. "Always Will blow up" exploit | Mostly done | Median crowd bar, percentile multiplier, 7 score eligible calls a day, visible accuracy. A spray strategy now lands near 50% accuracy, which the profile shows. The payout is still asymmetric (right Will blow up 10 to 30, right Not for me 5), acceptable while accuracy is visible. |
| 5. Personal drop without repeats | Partly | Uncalled promos first from a pool of 21 and "N new for you today". But the pool is the whole catalog (about 18 promos), and when fewer than 7 are fresh the drop is padded with already called promos (`index.tsx` lines 81 to 82). |
| 6. Daily local reminder | Done | Offered on the end card after a finished drop, never at launch, off switch in Settings, local only. Copy has an honesty problem (below). |

Also new and good: forgiving weekly streak by call days with saved weeks and no loss copy (screen 14), Charts progress card instead of an empty tab (screen 05), gifts that never read calls or follows (screen 16).

## R3.2 Scores

| # | Area | R2 | R3 | Evidence |
|---|---|---|---|---|
| 1 | Retention | 6 | **7** | All four loop steps now exist (reminder, call, reveal, Score and streak), but a daily scout runs out of fresh promos on day 3 with about 18 in the catalog, and with few scouts most tickets will pass their result date without a result because a call needs 10 later calls (`RESOLVE_MIN_LATER`). |
| 2 | Session time | 7 | **7** | Drop plus Keep watching plus tab swipe fits the 3 to 5 minute target, but the ceiling is the catalog, not the design; from day 3 the drop is mostly tickets the scout already made. |
| 3 | Originality | 8 | **8** | The dated call ticket that turns into a result, the "You called it" reveal and the call day streak read as PromoVote's own product. |
| 4 | Trademark and trade dress safety | 8 | **8** | No "For you", no story rings, own call bar, own tagline "The social network for promos"; horizontal swipe between feed tabs is a common pattern, not a signature (not legal advice). |
| 5 | Engagement loop and habit design | 6 | **7** | The Hooked loop is complete and ethical, but two copy bugs hit the trigger and the reward at exactly the cold start moment: the reminder promises "7 new promos" every day and overdue tickets keep showing a past "Result" date. |

## R3.3 What still keeps scores below 8 (smallest change first)

### P0 (before App Store submission, all small)

**1. Reminder copy must stay true when nothing is new.**
`apps/mobile/src/lib/i18n.ts` line 62 (and es, tr): `reminder_p` says "7 new promos. Make your calls before the crowd does." With about 18 promos a daily scout has 0 fresh promos from day 3 or 4, so the notification becomes a false count every evening. False counts are on our own banned list, and they are the fastest way to lose notification permission. Change to a neutral line without a number, for example "See what dropped today and check your open calls." Worked when: notification opt out rate in the first 14 days stays under 10%.

**2. Overdue tickets need their own state.**
`apps/mobile/src/ui/PromoReel.tsx` lines 107 to 111 and `apps/mobile/src/app/(tabs)/me.tsx` line 169 always show `Result <date>` while `outcome` is `pending`. `resolveCalls` keeps a call pending until 10 later calls exist, for up to 21 days. In TestFlight and the first launch weeks that is most calls, so the ticket will say "Result Oct 14" on Oct 20. When `resolvesAt` is in the past and the call is still pending, show "Waiting for more scouts. Final result by <resolvesAt + 14 days>." The API already knows both numbers (`CALL_DAYS`, `RESOLVE_MAX_DAYS`). Worked when: no ticket shows a past date as a future promise.

**3. "Points added" only when points were added.**
`i18n.ts` line 59 `outcome_right` says "You called it right. Points added." but calls beyond the first 7 of the day are not score eligible (`index.js` line 1137) and get 0 points. Use "You called it right." and append "+N points" only when `points > 0` (the profile already does this, line 157); on the ticket, add "Not scored (over today's 7)" when right with 0 points. Small, but this is the exact moment the scout decides whether the Score is honest.

### P1 (before public launch)

4. **Honest short drop.** When fewer than 7 promos are fresh, show only the fresh ones and end with "That's all new today, N promos" instead of padding with called tickets (`index.tsx` lines 81 to 83). When 0 are fresh, open on a card with the scout's Results and Open calls, then Keep watching. Until weekly new promos pass about 35, `DROP_SIZE = 5` is a better default.
5. **First level up after one right call.** Still linear `level * 100` (`index.js` lines 750 and 1146, `me.tsx` line 107). Screen 14 shows a right early call (+30) and still "70 points to level 2". Put Level 2 at 30 and grow gaps after that (for example 30, 100, 250, 500).
6. **"How results work" sheet.** Tap on the ticket or the Score card: "Will blow up is right when the scouts who came after you lean more toward it than on a typical promo. Wrong calls never cost points. Only your first 7 calls a day score." Without it, a "The crowd saw it differently" result feels arbitrary. Text only, `PromoReel.tsx` and `me.tsx`.
7. **Share carries the call.** `PromoReel.tsx` `share` (line 96) still sends only title and link. Add "I called Will blow up on X. Result Oct 14." and `&by=handle`; after a right result, share from the Results row. This is the only organic acquisition loop the scout side has.
8. **Guest calls kept on device** (round 1 item 9): up to 3 guest calls attach to the profile after sign in. Strongest guest to scout lever; the gate sheet (screen 02) already sets it up.
9. **Results day local notification.** The app knows each call's `resolvesAt`; schedule one local "Results day for N of your calls" when the scout has open calls, no push server needed, at most one per day, merged with the daily reminder.

## R3.4 What code cannot close

* **Retention 8 and Session time 8 need real content.** A daily scout needs about 35 to 50 fresh English promos per week. Today the catalog is about 18 from 3 founder creators; after day 3 the honest drop is empty. This closes only with creator outreach and creator uploads (R2 photo and video upload still pending).
* **The reveal needs real scouts.** With `RESOLVE_MIN_LATER = 10`, a promo needs at least 11 callers before anyone gets a result. With fewer than about 30 active scouts, most calls end void after 21 days. Either recruit a launch cohort (waitlist plus indie game communities, target 50 or more scouts calling in week 1) or lower the beta threshold to 5 later calls and say so in the "How results work" sheet.
* **D7 at or above 15% must be measured** on real TestFlight and launch cohorts before any Retention score of 8 is more than a prediction.

## R3.5 Expected scores after P0

| Area | R3 now | After P0 (1 to 3) | After P1 plus real content and scouts |
|---|---|---|---|
| Retention | 7 | 7 | 8 to 9 (needs measured D7) |
| Session time | 7 | 7 | 8 |
| Originality | 8 | 8 | 8 to 9 |
| Trademark and trade dress | 8 | 8 | 8 |
| Engagement loop and habit design | 7 | 8 | 8 to 9 |

Plain answer: the habit design is now good enough to ship once P0 items 1 to 3 are fixed (a few lines of copy and one conditional). Retention and Session time stay at 7 until there is more content and enough scouts for results to resolve; that is a supply and launch gap, not a code gap.

Legal notes in this report are not legal advice.
