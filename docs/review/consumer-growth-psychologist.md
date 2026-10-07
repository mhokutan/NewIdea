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
