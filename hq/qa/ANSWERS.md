# Answers (cloud Claude writes here)

## Q-001
Table `social_posts` in D1 `promovote-db`. Agents do not add posts directly; send the text and time to the founder
or ask here and the cloud session queues it. Rules: no links, 280 chars, see `hq/HANDOFF.md` section 5.

## Q-002 (answered 2026-10-29, cloud Claude)
Facts:
1. Correct. Live `/v1/explore` today: 23 promos, `haulingempire` 13, `poleris` 6, `nicheable` 4, all
   `founderOwned: true`; CTA kinds `app_store` 19, `etsy` 3, `shop` 1.
2. Correct, the store text said "discover" and "new games, apps and shops". Rewritten in `store/route-a-metadata.md`.
3. Correct as of build 15: `ctaVisible` hides only `google_play` on iOS, so every iOS reel had an "Open in the App
   Store" button. That button is now gone on iOS (see Q-004).
4. Correct.
One correction to the premise: the first screen was never a grid. Feed tab = Today's Drop, one full screen video
at a time with the call bar. The catalog look came from the store button on every reel, the Explore top (charts
strip, category pills, grid) and the store text.
Third party creators (item 3): none. D1 read only, 2026-10-29: 3 creator profiles (the founder's 3), 0 promos from
any other creator in any status. Route B is still available as a fallback.

## Q-003 (acknowledged 2026-10-29, cloud Claude)
Name stays. Nothing renamed. Subtitle `Call the next big hit` is in the draft as optional; empty unless the founder
approves it.

## Q-004 (done in code 2026-10-29, cloud Claude; commit 35dbe54 on claude/gracious-pasteur-nu8ssc)
What changed: iOS reels have no store button (link only on the creator page); Today's Drop has a scout strip
(Score, streak, right calls; new scouts and guests see "Make your call. Results in 7 days."); Explore opens on
Creators (circles, hashtags, grid) and charts plus category pills moved to a second segment "Charts and
categories"; search and onboarding copy no longer read like a store (en, es, tr).
Tests passed: `npx tsc --noEmit` 0 errors, `npx expo lint` 0 problems, web export builds; Explore segments checked
in a browser. Not checked on a real iPhone (needs a build).
Files: apps/mobile/src/ui/PromoReel.tsx, apps/mobile/src/app/(tabs)/index.tsx, apps/mobile/src/app/(tabs)/explore.tsx, apps/mobile/src/lib/i18n.ts, store/route-a-metadata.md.
Reused: existing `/v1/me/scout` endpoint, ScoutSummary type, Icon, theme tokens, the segment style from Profile; no API change.
Risk: low; UI only. Android and web keep the reel button (out of scope this round).
Rollback: `git revert 35dbe54`
P0 status: 1 done (it was mostly true already), 2 done, 3 partly: the result loop exists (ResultReveal, Profile
results, accuracy, Duel tab) but the review account has 4 pending and 2 void calls and no scored result, because
with 3 scouts in total the crowd bar is never met, so a reviewer cannot see a right or wrong call today.
4 drafted, not entered. Play short description stays a draft (Play is out of scope this round).
NEEDS OWNER: let me add scored demo results for the review account (live D1 write), or accept that the reviewer sees no scored call.
NEEDS OWNER: approve the store text in store/route-a-metadata.md (and the optional subtitle).
NEEDS OWNER: say "build ios" when ready; I will not start a build or touch App Review.
