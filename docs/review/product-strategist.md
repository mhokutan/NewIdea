# Product Strategy review: first 5 minutes and first 7 days (2026-10-07)

Role: Chief Product Strategist. Domain score: **Activation funnel (install to aha, scout and creator)**.
Teammate: `docs/review/consumer-growth-psychologist.md` covers the habit loop (trigger, reward, streak, reveal job). This file covers the funnel: every step, every drop point, and the number we watch at each step. Where we agree I point to their item instead of repeating it.

Read: `docs/review/brief.md`, `docs/00-idea-brief.md`, `docs/01-team-verdict.md`, `docs/03-profiles-spec.md` (7.1 onboarding, 3.3 scout loop), screenshots 01 to 13, `apps/mobile/src/**`, `services/api/src/index.js`.

## 1. Verdict in one paragraph

The first 30 seconds are decent: the app opens straight into a playing video with no wall, which is right. Everything after the first tap breaks. A guest who taps "Will blow up" is sent to sign in, then dropped on the Profile tab, and the vote they wanted to make is lost. A new scout ends on a screen with Sign out and a red Delete button (screenshot 13). A new creator ends on the same empty screen with no way to add a picture, a link, a perk or a promo, because none of that exists in the app or the API. There is no aha in the first 5 minutes for either side, and no reason in the first 7 days to come back. The product idea is fine; the funnel has no floor.

## 2. Scores

| # | Area | Score | Evidence |
|---|---|---|---|
| 1 | Retention | **3** | No moment in the first session creates an open loop (pending call, follow with new content, saved list); the profile after signup is a dead end (screenshot 13, `me.tsx` `Account()`). |
| 2 | Session time | **4** | Instant video start helps, but about 18 promos, a first promo that is a static PDF screenshot (screenshot 01, Nicheable planner, not the indie game niche) and an empty Top tab (screenshot 04) cap the session at a few minutes. |
| 3 | Originality | **5** | The vote words and "called it" idea are ours, but none of it is visible; what is visible (For you tab, right icon rail, full screen loop) reads as a short video clone. |
| 4 | Trademark and trade dress safety | **6** | "For you" is TikTok's signature feed label; combined with the right rail layout it raises the copy impression (not legal advice); a stories row on top of the feed would add an Instagram signal. |
| 5 | Activation funnel (my domain) | **2** | Scout: intent is lost at sign in and there is no first reward. Creator: funnel stops at step 3 of 7 because setup, upload, perk and stats do not exist (`services/api/src/index.js` has no promo create, perk or creator stats route). |

## 3. Scout journey: install to aha

Definition of aha for a scout:
* **Day 0 aha (first session):** "I made calls and something is waiting for me." Concretely: 3 or more calls made and the app shows "3 calls pending, first reveal Oct 14".
* **Day 7 aha:** the first reveal, "Your call on X was right. +20" (the reveal job is teammate P0 item, not repeated here).

Without a Day 0 aha nobody is around on Day 7 to get the real one. That is the core funnel problem.

### 3.1 Step map with drop points

| # | Step | What happens today (code, screen) | Drop point | Fix | Metric and target |
|---|---|---|---|---|---|
| S0 | Store page to install | Not reviewed here (store assets in `store/assets/`). | Screenshots must show the vote and the reveal, not just a video feed, or we look like one more video app. | First store screenshot: "Call the next hit game before everyone else." | Product page conversion 25 to 35% (store analytics). |
| S1 | First open, first promo | `index.tsx` loads `/v1/feed`, fair round, autoplay muted. First item in screenshot 01 is a planner PDF scroll with white on white text. | 1. Opener is random among 3 creators and can be the weakest, off niche promo. 2. Muted with no hint. 3. No one line explaining what this app is. | Fixed **opener of 3** for a first session: best game trailers from Featured, then normal rotation. One time pill "Tap for sound". One time coach mark on promo 1 (spec 7.1 step 6): "Skip is free. Call the games you think will blow up." | % of first opens that reach 3 promos: target 75%. 3 s view rate on promo 1: 85%. |
| S2 | Swipe and watch | Vertical paging works. No horizontal gestures (founder item 4). | Small catalog shows repeats after about 6 to 8 minutes (teammate). | See tab decision in section 5: a finite drop removes the "repeats" feeling. | Promos per first session: median 7 or more. First session length: median 2.5 to 4 min. |
| S3 | First vote tap as guest | `PromoReel.tsx` `needAccount()` pushes `/sign-in` with no context. | Intent is not saved. User does not know why they left the video. | Bottom sheet over the video: "Sign in to lock your call. It reveals in 7 days." Save `{promoId, action}` as a **pending action** in memory. | Guest vote taps per first session user: 40%. Sheet to sign in start: 50%. |
| S4 | Sign in | `sign-in.tsx`, Apple and Google native. On success `router.replace('/me')`. Subtitle promises "unlock perks" that do not exist yet. | The user is taken away from the feed to Profile. | On success: if onboarding needed, show onboarding as a **modal**, then `router.back()` to the same promo and replay the pending action. Remove "unlock perks" until perks ship. | Sign in start to success: 80% (Apple), 70% (Google). |
| S5 | Onboarding | `me.tsx` `Onboarding()`: account type, then username, display name, DD/MM/YYYY (overflow, screenshot 12), terms checkbox. Nothing is prefilled. Copy frames both types by what you cannot do ("You cannot post", "You cannot vote", screenshot 11). | 6 manual inputs on the first ever screen, plus a type choice that most users do not understand yet. | Default path is Scout: one screen with name prefilled from Apple/Google, suggested handle (editable), native date picker, terms checkbox, one button. "I am a creator or business" is a secondary link. Positive copy: "Scout: find hits early, build your Scout Score." | Sign in success to onboarding done: 85%. Median time on onboarding under 40 s. |
| S6 | First call | `vote()` sets local state, fires `api.vote`, no feedback. Second vote 409 is ignored. State lost on reload (no viewer state in `/v1/feed`). | The core action has zero payoff. This is the single biggest drop point. | After a call: short haptic, lime toast "Called. Reveals Oct 14. You are scout #12 on this one." (early rank, not the vote split, so no herding). Counter chip in the top bar: "3 pending". Return viewer vote and save state in `/v1/feed`. | % of new scouts with 1 call in session 1: 80%. Calls per session: 5 or more. |
| S7 | Creator tries to vote | `isScout` false and `me` exists, so `router.push('/me')` does nothing visible (founder item 3). | Looks broken. | Sheet: "Creators cannot vote, so rankings stay fair. Share it instead." with Share button. | Silent tap rate: 0 (log every `needAccount` call that does not open a screen). |
| S8 | First save | `toggleSave` works on the API, but **there is no Saved list anywhere in the app** (`GET /v1/saves` is unused). | Save is a dead action, nobody saves twice. | Saved tab on the scout profile (spec 3.3, P0 in spec table). Toast "Saved. Find it in your profile." | Save rate: 8 to 15% of promos viewed by signed in scouts. |
| S9 | First follow | `creator/[handle].tsx` follow works. Nothing uses follows (no Following feed, no "new from" signal). | Follow is another dead action. | Following tab (section 5) and a "new since last visit" dot on followed creators. | Follows per new scout in week 1: 1.5 or more. |
| S10 | First session end | User leaves. No push permission asked (`expo-notifications` not installed). | No trigger, no way back. | After the 3rd call: contextual ask "Want a ping when your first call reveals?" (teammate P0 covers the push stack). | Push opt in: 45 to 60% iOS. |
| S11 | Profile after signup | Screenshot 13: name, handle, Sign out, Delete. | The investment screen is empty, and Delete is one of only two actions on it. | Scout profile minimum: Scout Score block (0 is fine), Pending calls row with countdowns, Saved, Following. Move Sign out and Delete into a Settings screen. | Profile visits per WAU: 1 or more per week. |
| S12 | Day 1 to 6 return | No reason exists. | | Daily drop of 5 to 7 new promos plus "pending calls" countdown (teammate). | D1 25 to 30%. Sessions per active day 1.3 to 1.6. |
| S13 | Day 7: first called it | `calls.outcome`, `scout_stats.called_it_count` exist in DB; no resolution job, no reveal UI. | The real aha never arrives. | Reveal job plus "Just resolved" card (teammate P0 item 6). Share card "I called it". | D7 12 to 18% (team gate 15%). % of D7 users who saw at least 1 reveal: 60%. |

### 3.2 Funnel targets for an app this size (first 90 days, signed in scouts unless noted)

These are realistic for a new, small catalog consumer app with founder led acquisition, not TikTok numbers.

| Stage | Target | Kill or rethink line |
|---|---|---|
| First open to 3 promos watched (all users) | 75% | under 55% means the opener is wrong |
| First open to sign in success (all users, session 1) | 15 to 25% | under 10% means the guest to sign in sheet is not selling the call |
| Sign in success to onboarding done | 85% | under 70% |
| New scout with 3 or more calls in session 1 | 60% | under 40% means calls feel pointless |
| Median first session | 2.5 to 4 min | |
| Calls per session (signed in) | 5 or more | |
| D1 / D7 / D30 | 25 to 30% / 12 to 18% / 6 to 10% | D7 under 10% after 2 weeks of reveals |
| Week 4 retention | 20% or more (investor gate in `docs/01-team-verdict.md`) | |
| Weekly voting scouts at week 12 | 1,000 (investor gate) | |
| Share rate (shares per 100 promo views) | 1 to 2 | |

We optimize **calls per scout per week** and **D7**, not minutes. Teammate's section 4 agrees.

### 3.3 Instrumentation (P0, cheap)

Today only `view_events` and `click_events` exist. We cannot see any of the funnel above. Add one D1 table `app_events (id, day, viewer_key, name, props_json, created_at)` and a `POST /v1/events/app` route in `services/api/src/index.js` (same pattern as `trackEvent`, same cookieless approach as the landing visit counter, no third party SDK, no cost). Events, in order:

`app_open` (with `first: true` once per device), `promo_view_3s`, `coach_seen`, `guest_gate_shown` (with `action`), `signin_start`, `signin_ok` (provider), `onboarding_ok` (type), `pending_action_applied`, `call`, `save`, `follow`, `share`, `cta_click`, `push_prompt`, `push_ok`, `reveal_seen`, `silent_tap` (any tap that changes no screen).

A simple funnel block on `promovote.com/admin` (it already shows signups and visits) is enough. How we know it works: the admin shows S1 to S10 conversion for the TestFlight cohort within one day.

## 4. Creator journey: sign up to aha

Definition of aha for a creator: **"Real people watched my promo and told me something I did not know."** Concretely the first stats card: views, 3 s hold rate, CTA clicks, and after 7 days the call split. This is also the seed of the paid Trailer Test report, so it is the most important screen for the business.

| # | Step | Today | Drop point | Fix | Metric and target |
|---|---|---|---|---|---|
| C1 | Arrive | Mostly from founder outreach. | Link opens the website, not the app. | Outreach link with a creator invite code that opens the app on the creator path. | Invite link to install: 40% (warm outreach). |
| C2 | Sign in and pick Creator | Screenshot 11, "You cannot vote" framing. | Fine, apart from copy. | "Creator or business: post promos, get real feedback." | |
| C3 | Creator form | Categories games, apps, shops only (founder item 7). | Streamers, short video creators and real businesses do not see themselves and quit. | Use the taxonomy from `docs/review/creator-economy-expert.md`. | Creator onboarding done: 85%. |
| C4 | Set up page | Screenshot 13 equivalent: name, handle, link to own page. No avatar, banner, bio, links (founder item 2). `PATCH /v1/me` only takes name, bio, language and email flags. | **Funnel ends here today.** | Setup checklist on the creator Profile tab: Avatar, Bio, Links (up to 3), First promo, Perk (optional). Progress "2 of 4 done". Each item opens a small form. | Page complete (avatar, bio, 1 link) within 24 h: 60%. |
| C5 | First promo | No upload route, no upload screen. | Hard stop. | Upload flow per decided rules (10 to 30 s, 720p on device, R2, Pending Review). Show status "In review, usually within 24 h". | First promo submitted within 48 h of signup: 50%. Approved within 24 h: 90%. |
| C6 | First perk | `has_perk` exists, no UI. | | Optional perk form (code, beta key, link). Never tied to votes (decided). | 30% of creators add a perk. |
| C7 | First stats | No creator stats route or screen. | No aha, no reason to post a second promo. | Stats card per promo on the creator Profile: views, 3 s hold, CTA clicks today; call split and Hit Score after 7 days. Push "Your promo got its first 50 views." | % of creators who open stats within 7 days: 80%. Second promo within 14 days: 40%. Creator W4 retention: 40%. |

If the creator side cannot ship before submission, the honest minimum is: hide the Creator card in onboarding and replace it with "Creator or business? Apply" (a short form that lands in D1, concierge as in `docs/01-team-verdict.md` section 10). A dead end creator account is worse than a waitlist. Founder said completeness is P0, so my recommendation is to ship C4 and C7 at minimum and keep C5 as concierge upload (founder uploads for the first creators) until the upload flow is ready.

## 5. The 4 home tabs, the empty Top tab, and stories

### 5.1 For you, New, Top, Featured

With about 18 promos from 3 creators, four tabs are four views of the same small pile:
* **New** is For you sorted by date. Same videos (screenshots 01 and 03).
* **Featured** is a subset of the same videos, and the note "Picked by the PromoVote team. Never paid." collides with the video title (screenshot 05).
* **Top** is empty (screenshot 04).
* **For you** is TikTok's signature label and infinite, which contradicts the decided finite daily drop (`docs/03-profiles-spec.md`, "Daily drop: 5 to 7 promos per day. Finite.").

Four tabs signal "big catalog" and then show the same content. That breaks trust in the first minute.

**Decision I recommend: 2 home tabs.**
1. **Today's drop** (default). The first 5 to 7 unseen promos, built by the existing fair queue (`lib/fair-queue.ts`), with a progress chip "3 of 7". After the last one: "Done for today. Your calls reveal in 7 days." then "Keep watching" continues the normal rotation for people who want more. This keeps session time for heavy users and gives everyone a finish line. It also removes the "For you" label.
2. **Following**. Promos from creators you follow, newest first. Empty state for new users: 3 suggested creators with Follow buttons (this is also the S9 fix).

Horizontal swipe between these two tabs (pager) answers founder item 4 cleanly. A left swipe on a promo can open the creator profile.

Where the other two go:
* **Top** moves to Explore as **Charts** (already a placeholder in `explore.tsx`), published every Monday as "This week's 10" (decided weekly ritual).
* **Featured** becomes a "Team pick" label on the promo itself and a row in Explore, plus it powers the first session opener (S1).
* **New** becomes a sort option in Explore.

### 5.2 The empty Top tab

Never ship a full screen empty tab as one of four top level choices. Empty top level navigation tells a new user "nobody is here". The honesty principle stays (no fake data, `TOP_MIN_VIEWS = 50` in the API is right), but the place changes:
* In Explore, the Charts card shows progress instead of "soon": "This week's 10 opens Monday. 312 of 500 calls so far." Every call a user makes moves the bar. That turns the empty state into a reason to vote.
* `/v1/charts` already returns `open: false`; add a `progress` count (valid calls this week) to the response.

### 5.3 Stories row of followed creators on top of the feed

**Do not put it on top of the full screen feed.** Reasons:
* It eats about 110 px of a full screen video and fights the tab bar for the same space.
* For a new user it is empty (0 follows) and for everyone it is tiny (3 creators today).
* "Stories" means ephemeral creator content. Our creators post promos, not stories, so the circles would just be links to profiles.
* Circles with rings above a feed are a strong Instagram and Snapchat signal. Explore already has creator circles (screenshot 06); a second copy on Home raises trade dress risk and adds no function.

**What to do instead (P2, after follows exist):** a row "New from creators you follow" at the top of the **Following** tab only, not of the drop. A ring lights up only when the creator posted a promo since your last visit, and tapping it plays only their new promos. That is a real trigger ("someone I follow posted") and it lives where it makes sense. Do not use the word "Stories". Gate: show it only when the user follows 3 or more creators.

## 6. Minimum changes to bring every score to 8 or more

Ordered by funnel impact. Items marked (T) are owned in detail by the teammate's file; I list them so the order is clear.

### P0 (before App Store submission)

1. **Pending action through sign in.** Where: `ui/PromoReel.tsx` `needAccount()`, `app/sign-in.tsx` `done()`, `app/(tabs)/me.tsx`. What: guest gate sheet with reason, store `{promoId, action}`, run onboarding as a modal, return to the same promo, apply the action. Why: S3 to S6 is where intent dies today. Works when: `pending_action_applied / guest_gate_shown` is 25% or more in TestFlight, and the founder's test item 3 passes.
2. **Every tap answers.** Where: `PromoReel.tsx` vote, save, share; creator vote sheet (S7). What: call toast with reveal date and early rank, save toast, haptic, "Creators cannot vote" sheet, handle 409 as "already called". Return viewer vote and save state in `/v1/feed` and `/v1/home`. Why: core action has no payoff. Works when: `silent_tap` events are 0 and state survives app restart.
3. **One screen scout onboarding.** Where: `me.tsx` `Onboarding()`. What: Scout default, name prefilled from Apple/Google, suggested handle, native date picker (fixes screenshot 12), positive copy, Creator as secondary link. Works when: sign in to onboarding done is 85% or more, median under 40 s.
4. **Scout profile with something in it.** Where: `me.tsx` `Account()`. What: Scout Score block, Pending calls row with countdowns, Saved list (`GET /v1/saves` already exists), Following list; Sign out and Delete move to Settings. Why: S8, S11. Works when: profile visits per WAU 1 or more and saved list opened by 30% of savers.
5. **Creator minimum kit.** Where: new `app/creator/edit.tsx`, `PATCH /v1/me` extended (avatar, banner, links), new perk and stats routes in `services/api/src/index.js`. What: setup checklist (avatar, bio, links, perk), stats card per promo (views, 3 s hold, CTA clicks), concierge upload until the upload flow ships. If not possible before submission, replace the Creator card with "Apply". Why: C4 to C7, founder items 2 and 8. Works when: 60% of new creators complete the page within 24 h and 80% open stats within 7 days.
6. **Two home tabs: Today's drop and Following.** Where: `app/(tabs)/index.tsx` `TABS`, `lib/fair-queue.ts`. What: finite drop with progress and done screen, then optional "Keep watching"; Following with suggested creators empty state; horizontal pager between them. Remove the "For you" label. Why: honest catalog size, decided loop, trademark distance, founder item 4. Works when: 50% of scouts finish a drop on days they open the app and D1 rises.
7. **First session opener and coach mark.** Where: `index.tsx` `append()` first round, one time flags in storage. What: 3 best game promos first (from Featured), "Tap for sound" pill, one coach mark. Works when: 3 promo reach rate 75% or more, promo 1 hold rate 85%.
8. **Funnel events.** Where: new `app_events` table and `POST /v1/events/app`, small client helper in `lib/api.ts`, funnel block on `/admin`. Works when: the admin shows S1 to S10 for the TestFlight cohort.
9. (T) Push permission after the 3rd call and the reveal job with a "Just resolved" card.

### P1 (before public launch)

10. **Charts in Explore with progress.** Where: `explore.tsx` charts card, `/v1/charts` adds `progress`. Monday "This week's 10" with share card. Works when: 20% of WAU open Charts on Mondays.
11. **Creator upload flow** (decided limits, R2, review queue) replacing concierge. Works when: first promo within 48 h is 50%.
12. **Creator notifications**: "first 50 views", "your call split is ready". Works when: creator W4 retention 40%.
13. **Share loop**: shared link opens the app on that promo (universal links for `promovote.com/?v=`), "I called it" card. Works when: 1 to 2 shares per 100 views and installs attributed to shares are visible.

### P2 (later)

14. "New from creators you follow" ring row inside the Following tab, gated at 3 follows, no "Stories" naming.
15. Server side fair queue and personalization once accounts and votes exist (already planned in `CLAUDE.md`).
16. Creator weekly email digest with stats, the bridge to the paid Trailer Test report.

## 7. Expected scores after changes

| Area | Now | After P0 | After P0 + P1 |
|---|---|---|---|
| Retention | 3 | 7 | 8 (only once reveals run on real data and D7 is measured at 15% or more) |
| Session time | 4 | 7 | 8 |
| Originality | 5 | 8 | 8 |
| Trademark and trade dress | 6 | 8 | 8 |
| Activation funnel | 2 | 8 | 9 |

Honest note: a funnel score is a forecast until the TestFlight cohort numbers from section 3.2 exist. If after two weeks of real reveals D7 is under 10%, the problem is the content (catalog size and quality), not the funnel, and the next move is more creators, not more features.
