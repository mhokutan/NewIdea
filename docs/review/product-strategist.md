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

---

# Round 2 (2026-10-07)

Read: `docs/review/brief-r2.md`, screens `docs/review/screens-r2/01..19`, `apps/mobile/src/lib/gate.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/me.tsx`, `app/(tabs)/explore.tsx`, `app/sign-in.tsx`, `ui/PromoReel.tsx`, `services/api/src/index.js` (`/v1/drop`, `/v1/charts`, `resolveCalls`, `daily`).

## R2.1 Verdict

Big step. The scout funnel now has a floor: a guest tap opens an honest sheet (screen 02), the call runs after sign in, the call bar turns into a ticket with a result date and scout rank (screen 13), the drop is finite with an end card (screen 05), and the scout profile shows Score, open calls, Saved and Following (screen 14). The creator side reaches a real studio with a checklist and stats (screens 17, 18). What still stops 8 is the **second day and the seventh day**: tomorrow's drop is mostly the same promos, the 7 day reveal will be "void" for almost every call at beta scale, nothing reminds the user to come back, and we still cannot measure any of it.

## R2.2 Scores

| # | Area | R1 | R2 | Evidence |
|---|---|---|---|---|
| 1 | Retention | 3 | **6** | Loop exists end to end (drop, ticket, open calls, `resolveCalls` cron), but with `RESOLVE_MIN_LATER = 10` later calls per promo almost every beta call resolves `void`, there is no reveal card or resolved history in `ScoutHome`, no reminder, and `/v1/drop` reshuffles the same small pool so day 2 shows already called promos. |
| 2 | Session time | 4 | **7** | Finite drop with progress segments, end card, "Keep watching" and Explore give a clear 3 to 5 minute session; the cap is content (3 real creators, about 18 promos), which the brief lists as planned. |
| 3 | Originality | 5 | **8** | The bottom call bar that becomes a ticket ("Called: Will blow up. Result Oct 14. Scout #1"), the daily drop with an end card and the Scout Score card are clearly PromoVote, not a short video clone. |
| 4 | Trademark and trade dress | 6 | **8** | "For you" and the story rings are gone, creator circles are rounded squares, the right rail is down to Save, Share, More (not legal advice). |
| 5 | Activation funnel | 2 | **6** | Scout steps S3 to S8 and S11 are fixed and the creator path reaches C7 (stats), but a new scout ends on the Profile tab instead of back on the promo, test creators with no promos appear in Explore (screen 07: "Test Studio", "Pixel Fox"), the drop end card tells a guest "You made 0 of 7 calls" (screen 05), and there are still no funnel events. |

## R2.3 Funnel walk: what is fixed

Scout (section 3.1 of round 1):

| Step | R1 drop point | R2 status |
|---|---|---|
| S1 First promo | Random, off niche opener | **Fixed.** `/v1/drop` puts games first (screen 01 opens on Hauling Empire). One time "Tap for sound" hint and coach mark still missing (P1). |
| S2 Repeats | Infinite loop of 18 promos | **Fixed for day 1** (finite drop). **New issue for day 2**, see B4. |
| S3 Guest vote | Intent lost | **Fixed.** `asScout()` queues the action, the sheet explains the 7 day result (screen 02). |
| S4 Sign in | Dropped on Profile | **Fixed** for returning users (`router.dismiss()` in `sign-in.tsx`). New users still go to Profile for onboarding, see B2. |
| S5 Onboarding | 6 manual inputs | **Mostly fixed.** Two steps, handle suggested from name, native date picker, link preview (screen 12). Name is not prefilled from Apple or Google (`social-sign-in.ts` reads no name), type cards still say "You cannot..." (screen 11). P1. |
| S6 First call | No payoff | **Fixed.** Ticket, haptic, rank, crowd split after 5 calls, 409 handled, state from `/v1/me/state`. |
| S7 Creator taps vote | Silent | **Fixed.** "Creators can't vote" sheet. |
| S8 Save | No Saved list | **Fixed.** Saved tab on profile, toasts. |
| S9 Follow | Dead action | **Partly.** Following list exists, but nothing tells a scout a followed creator posted. P1. |
| S10 Session end | No trigger | **Open.** No reminder or push. B6. |
| S11 Profile | Empty, Delete prominent | **Fixed.** Score card, open calls, Saved, Following; Sign out and Delete moved into the "..." sheet. |
| S13 Day 7 reveal | No job, no UI | **Job exists, UI does not**, and the threshold makes most calls void. B5. |

Creator (section 4 of round 1):

| Step | R2 status |
|---|---|
| C3 Categories | **Fixed.** 7 categories. |
| C4 Page setup | **Fixed.** Checklist 4/5, logo, banner, bio, links, edit profile (screens 16, 17). Photo upload depends on R2 being enabled by the founder. |
| C5 First promo | **Concierge** ("Email your trailer"). Acceptable for submission, as I recommended. The message appears twice on the same screen (checklist note and card, screen 18). |
| C6 Perk | Open (planned). Not a blocker for 8. |
| C7 Stats | **Fixed in structure.** But a creator with no promo sees a grid of six zeros (screen 18), which reads as "nobody watched". P1. |

## R2.4 Remaining blockers (smallest change first)

### P0 (before App Store submission)

B1. **Hide creators without live promos from Explore.** Where: `/v1/creators` in `services/api/src/index.js`, add `and exists (select 1 from promos pr where pr.creator_profile_id = p.id and pr.status = 'live')`. Why: screen 07 shows "Test Studio" and "Pixel Fox"; tapping leads to an empty page, the worst first impression of the catalog. Works when: every circle in Explore opens a page with at least one promo.

B2. **Send a new scout back to the promo after onboarding.** Where: `lib/gate.tsx`, in the effect that runs `queue.action`, call `router.navigate('/')` before `a()` when the current route is `/me` (or in `me.tsx` `submit()` for scouts when an action is queued). Why: today the call runs in the background while the user stares at their profile; the ticket moment is lost. Works when: in a fresh install test, guest tap, sign in, onboarding ends on the same promo showing the ticket.

B3. **End card variants.** Where: `EndCard` in `app/(tabs)/index.tsx`. Guest: "Sign in to make your calls. Results in 7 days." with Sign in as the primary button. Signed in with 0 calls: "Make a call on any of today's 7 to get a result Oct 14" with "Back to the first one". Why: "You made 0 of 7 calls" (screen 05) scolds the exact users we want to convert. Works when: `gate_guest_t` sign ins from the end card are visible in events (B7).

B4. **Make tomorrow's drop new for this viewer.** Where: `app/(tabs)/index.tsx` load step (client side for now): drop promos the viewer already called (`vs.calls`) or saw in the last 3 days, fill from the pool, and if fewer than 7 fresh promos exist, show the real number ("4 new today") instead of padding with repeats. Change "A new drop lands tomorrow" to only show when the pool has unseen promos. Why: with about 18 promos, `/v1/drop` reshuffles the same pool, so on day 2 a scout opens to tickets they already have. That is a D1 killer. Works when: day 2 drop for a day 1 scout has 0 already called promos.

B5. **Let the reveal happen at beta scale, and show it.** Where: `resolveCalls()` and `ScoutHome` in `me.tsx`.
* `RESOLVE_MIN_LATER = 10` later calls in 7 days will not be reached for most promos with a few hundred scouts, so nearly every call becomes `void` and the Day 7 aha never fires. For beta, when later calls are under 10, resolve against the promo's later engagement cohort (completion rate, saves and CTA taps from later signed in viewers, top 40% vs bottom 40% of that week's promos, middle stays void). Keep the rule public in Guidelines.
* Add a "Just resolved" card at the top of `ScoutHome` and a resolved list under Open calls (right, wrong, or "Not enough scouts yet, no points lost" for void).
* Confirm the cron actually runs: `CLAUDE.md` lists "open Workers dashboard once (workers.dev subdomain needed for the daily cron)" as a pending founder action.
Works when: at least 50% of calls older than 7 days resolve non void, and "Just resolved" is seen by 60% of D7 users.

B6. **Daily local reminder (already planned).** Where: `expo-notifications` local schedule, asked after the user's 3rd call or on the end card, never on first open. Copy: "Today's drop is ready" and "Your call on X has a result". No loss wording. Why: without a trigger, D1 depends on memory. Works when: opt in 45% or more, and D1 of opted in users is at least 1.5 times the rest.

B7. **Funnel events (unchanged from round 1 P0 item 8).** Where: `app_events` table plus `POST /v1/events/app`, helper in `lib/api.ts`, funnel block on `/admin`. Why: every target in round 1 section 3.2 is unmeasurable today, so no score above 7 on Retention or Funnel can be verified. Works when: the admin shows S1 to S10 for the build 5 TestFlight cohort.

### P1 (before public launch)

* Prefill display name from Apple (first sign in `fullName`) and Google; positive type card copy ("Scout: find hits early and build your Scout Score").
* Team picks note overlaps the video title (screen 06): give it its own row under the tabs with a solid background, or move it into the reel as a "Team pick" chip.
* Creator studio before the first promo: replace the six zero tiles with one card "Your numbers start when your first promo goes live" and keep one "Email your trailer" button (remove the duplicate).
* Charts in Explore: show the list only at 5 or more ranked promos and add thumbnails; a chart of one entry (screen 07) looks like a bug.
* Following signal: dot on followed creators who posted since last visit (round 1 P2 stories alternative, no rings, no "Stories" name).
* One time "Tap for sound" hint and 3 step coach mark on the first drop promo.
* Universal links for `promovote.com/?v=` so shares open the app.

## R2.5 Expected scores

| Area | R1 | R2 | After P0 | After P0 + P1 |
|---|---|---|---|---|
| Retention | 3 | 6 | 8 (once B5 shows non void reveals and D7 is measured at 15% or more) | 8 |
| Session time | 4 | 7 | 7 | 8 (needs the planned 12+ creators and 60 promos) |
| Originality | 5 | 8 | 8 | 8 |
| Trademark and trade dress | 6 | 8 | 8 | 8 |
| Activation funnel | 2 | 6 | 8 | 9 |

Honest note: Session time cannot reach 8 by code alone. With about 18 promos the drop runs out of fresh content in 2 to 3 days. The content plan in the brief (12+ creators, 60 English promos) is the real blocker for that score, and it should run in parallel with B1 to B7.

---

# Round 3 (2026-10-07, night)

Read: `docs/review/brief-r3.md`, screens `docs/review/screens-r3/01..18`, `apps/mobile/src/app/(tabs)/index.tsx`, `app/(tabs)/me.tsx`, `lib/gate.tsx`, `lib/reminder.ts`, `lib/i18n.ts`, `lib/social-sign-in.ts`, `ui/ResultReveal.tsx`, `ui/PromoReel.tsx`, `services/api/src/index.js` (`/v1/drop`, `/v1/creators`, `resolveCalls`, `crowdBar`, `weeklyStreaks`, events routes), `web/landing/content/promos.json`.

## R3.1 Verdict

The funnel is now built end to end, and most of my round 2 P0 list is closed. B1 (creators without live promos hidden, `index.js` line 328), B2 (the gate returns to the tapped promo, `gate.tsx` lines 67 to 79), B3 (guest and zero call end card variants, `index.tsx` line 218), the name prefill from Apple, the reminder offered only after a finished drop, the one time reveal sheet (screen 13) and Results with accuracy (screens 14, 15) are all done well. What still stops 8 is no longer missing screens. It is three honesty gaps in the day 2 to day 14 loop, and the same missing measurement as in rounds 1 and 2:
1. An English viewer has about 9 to 10 English promos in the drop pool (`promos.json`, `langRank < 2` in `/v1/drop`). A daily scout sees 7 fresh on day 1, 2 or 3 on day 2, and 0 on day 3.
2. The daily reminder says "7 new promos" every day at 18:00 forever (`reminder.ts` line 30, `i18n.ts` line 62), even when there are 0 new promos and even if the user already opened the app at 17:00. By day 3 that is a false promise sent to our most engaged users.
3. At beta scale most calls will not have a result on the date we printed on the ticket. `RESOLVE_MIN_LATER = 10` (`index.js` line 1094) needs 10 later scouts on the same promo; Charts show "So far: 3" scouts (screen 05). The call is rechecked daily up to 21 days and then goes void, while the ticket and Open calls keep saying "Result Oct 14" after Oct 14 has passed (`me.tsx` line 169, `PromoReel.tsx` line 111, `resolvesAt` is always `created_at + 7 days`).

## R3.2 Scores

| # | Area | R2 | R3 | Evidence |
|---|---|---|---|---|
| 1 | Retention | 6 | **7** | Every loop part now exists (uncalled first drop from a pool of 21, local reminder, reveal sheet, Results, forgiving weekly streak), but the English pool empties on day 3, the reminder copy is static and false once it does, and past due calls show a date that already passed with no "waiting for more scouts" state. |
| 2 | Session time | 7 | **7** | Swipe between three tabs and the creator player (screen 07, "1 / 11") add depth, but New and Team picks are the same small pile and a daily scout runs out of fresh English promos in 2 days; this score is a content problem now, not a code problem. |
| 3 | Originality | 8 | **8** | Ticket with outcome, "The crowd saw it differently. No points lost.", the "You called it" reveal, Scout Score with weekly dots and the gift wallet (screen 18) are clearly PromoVote. |
| 4 | Trademark and trade dress | 8 | **8** | New tagline "The social network for promos", no story rings, solid backed Team picks note, rounded square creator tiles; nothing new raises a copy signal (not legal advice). |
| 5 | Activation funnel | 6 | **7** | B1, B2, B3 and the name prefill are fixed and the guest to first ticket path is clean (screens 02, 08, 10, 11), but there are still no funnel events (third round in a row), so no step can be measured, and the type cards still frame both choices by what you cannot do (screen 09, `i18n.ts` line 19). |

## R3.3 Round 2 blockers: status

| Item | Status |
|---|---|
| B1 Hide creators without live promos | **Fixed** (`/v1/creators` `exists ... status = 'live'`). Note: screen 16 shows "9 Lives Studio" with no promos, but that is a direct creator page from local seed data, not Explore. |
| B2 Back to the promo after onboarding | **Fixed** (`queue.from` and `router.navigate(from)` in `gate.tsx`). |
| B3 End card variants | **Fixed** (guest, zero calls, N calls). |
| B4 Tomorrow's drop new for this viewer | **Partly.** Uncalled first plus "N new for you today" is right. Missing: the end card still promises "A new drop lands tomorrow" when the pool has nothing unseen, and seen but not called promos are not pushed back. The real gap is supply (see R3.5). |
| B5 Reveal at beta scale, and show it | **UI fixed, rule not.** Reveal sheet and Results are good. `RESOLVE_MIN_LATER` is still 10, the wait is now up to 21 days, and the UI does not tell the scout that a result is late. |
| B6 Daily local reminder | **Shipped, copy wrong** (static "7 new promos", repeating daily trigger). |
| B7 Funnel events | **Not done.** Only `/v1/events/link`, `view`, `click` exist. |

## R3.4 Remaining blockers (smallest change first)

### P0 (before App Store submission)

P0.1 **Late result state on tickets and Open calls.** Where: `me.tsx` line 169, `PromoReel.tsx` line 111, and the three `resolvesAt` places in `index.js` (lines 753, 879, 919). What: when `outcome = 'pending'` and `resolvesAt` is in the past, show "Waiting for more scouts. Checked every day, no points lost." instead of a past date; optionally return `waiting: true` from the API. Why: a result date that passes silently is the fastest way to teach a new scout that the core promise is fake. Works when: no screen ever shows a result date earlier than today.

P0.2 **Honest reminder.** Where: `lib/reminder.ts`, called from the drop load in `index.tsx` (lines 78 to 85). What: replace the repeating DAILY trigger with a one shot notification for the next 18:00, rescheduled on every app open with the real numbers: "{n} new promos in Today's Drop" when the unseen pool has at least 3, "Your call on {title} has a result" when a call is due, and no notification at all when both are zero. Do not fire on a day the user already opened the app. Keep the copy free of loss wording. Also show `drop_done_p` "A new drop lands tomorrow" only when the pool still has unseen promos (`index.tsx` line 224). Why: a false "7 new" on day 3 trains users to ignore or disable the only trigger we have. Works when: reminder opt out rate under 10% in the TestFlight cohort, and no reminder is sent with 0 new promos.

P0.3 **Resolve at beta scale (with the economist).** Where: `RESOLVE_MIN_LATER` and `crowdBar` in `index.js` lines 1094 to 1108. What: make the minimum adaptive, for example 5 later valid calls while weekly calling scouts are under 50, 10 above that, and state the rule in the Guidelines. Why: with a handful of scouts nearly every early call ends void after 21 days, so the Day 7 aha never fires for the first cohort, who are exactly the people we need to keep. Works when: 50% or more of calls older than 7 days resolve non void during TestFlight. Honest note: below roughly 15 to 20 scouts calling the same drop each week, no threshold makes results meaningful; this part closes only with real users.

P0.4 **Funnel events (B7, unchanged for the third round).** Where: new `app_events` table and migration in `services/api/migrations/`, `POST /v1/events/app` in `index.js` (same cookieless pattern as `trackEvent`), a small `track()` helper in `lib/api.ts`, a funnel block on `promovote.com/admin`. Minimum events: `app_open` (first), `promo_view_3s`, `gate_shown`, `signin_ok`, `onboarding_ok`, `pending_action_applied`, `call`, `drop_done`, `remind_offer`, `remind_ok`, `reveal_seen`. Why: without it neither Retention nor Activation can be verified above 7, whatever the code does. Works when: the admin shows open to first call conversion and D1 for the first TestFlight cohort.

### P1 (before public launch)

* **"Called it" naming collision.** Screen 14 and 13: the sheet says "You called it! 1 right", the row says "You called it right", and the tile says "Called it 0". Rename the tile (for example "Early hits", meaning right and in the first 10% of callers) or rename the outcome copy to "Right call. +30 points" (`i18n.ts` lines 35, 59, 66). Small change, removes a "this is broken" moment at the exact reward point.
* **Positive type card copy** (third round): "Scout: find hits early and build your Scout Score." / "Creator or business: post promos and get real feedback." (`i18n.ts` line 19).
* **Viewer language in Explore and creator pages.** Screen 05 and 07 show Turkish promos ("Depo", "İstanbul Deposu") to an English viewer. Sort viewer language and English first in `/v1/explore` and the creator promo list, the same way `/v1/drop` does.
* **Top scrim vs. baked in video titles.** Screens 01 and 11: the video's own headline ("You run the business", "Pick loads. Plan routes.") sits under the tab labels. Either a stronger scrim (0.75 at top) or ask creators to keep the top 15% of the frame free in the upload guidelines.
* Universal links for shares, and the following signal dot (both from round 2, still open, need founder setup for universal links).

## R3.5 What only content or real users can close

* **Session time 8 and Retention 8 need supply, not code.** A scout who calls the full drop every day uses 49 fresh promos a week. For an English viewer we have about 10 in total. The minimum for an honest daily drop is roughly 30 English promos live before launch and 15 to 20 new English promos per week after, from at least 10 creators, with games still leading. Until then the right product move is to say the truth in the app ("{n} new today", no reminder on empty days) rather than to pad the drop.
* **Results need a crowd.** Meaningful outcomes need about 15 to 20 scouts calling the same promos each week. The first TestFlight cohort should be recruited as one group in one week (founder outreach, waitlist), not trickled in, so their calls resolve together.
* **Every forecast here is unverified until P0.4 ships.** If after two weeks of real results D7 is under 10%, the next move is more creators, not more features (same as rounds 1 and 2).

## R3.6 Expected scores

| Area | R2 | R3 | After P0 | After P0 + content plan |
|---|---|---|---|---|
| Retention | 6 | 7 | 7 (8 once events show D7 at 12% or more) | 8 |
| Session time | 7 | 7 | 7 | 8 |
| Originality | 8 | 8 | 8 | 8 |
| Trademark and trade dress | 8 | 8 | 8 | 8 |
| Activation funnel | 6 | 7 | 8 | 9 |
