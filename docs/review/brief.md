# App review brief (2026-10-07)

Founder request: build an expert mobile app and website team, use the project's skills and the 74 app/brand design references, review the PromoVote app, and score it. **Every expert score must be at least 8/10 before we ship.** Main goals: people stay in the app (session time, retention), the app is not a copy of another app, and it does not infringe trademarks or trade dress.

## What to review

* Mobile app code: `apps/mobile/src/` (Expo SDK 57, Expo Router, NativeTabs, expo-video). Screens: `app/(tabs)/index.tsx` (feed with tabs For you / New / Top / Featured), `app/(tabs)/explore.tsx`, `app/(tabs)/me.tsx` (profile, onboarding, account), `app/creator/[handle].tsx`, `app/sign-in.tsx`, `ui/PromoReel.tsx` (one full screen promo with vote, save, share, CTA).
* API: `services/api/src/index.js` (Hono on Cloudflare Workers, D1 schema in `services/api/migrations/`).
* Website: `web/landing/` (promovote.com, live; feed and explore on the web too).
* Screenshots of the current app (web build at iPhone size, 393x852): `docs/review/screens/01..13-*.png`. On a real iPhone the Feed / Explore / Profile menu is a native bottom tab bar; on web it floats at the top and overlaps headers, so ignore that overlap, but judge everything else.
* Product context: `CLAUDE.md`, `docs/01-team-verdict.md` (source of truth), `docs/03-profiles-spec.md`, `docs/04-explore-charts-upload.md`, `docs/05-mobile-app-and-payments.md`.
* Design references: `design/references/<brand>/DESIGN.md` (74 brands). Project skills: `.claude/skills/` (design-taste-frontend, high-end-visual-design, redesign-existing-projects, web-design-guidelines, design-references, team-debate, ad-review, unit-economics).

## Founder's own test on a real iPhone (TestFlight build 3)

1. After Sign in with Apple, "everything is missing". The profile after signup only shows name, handle, Sign out, Delete account.
2. Creator profile has no profile picture, no website, no link fields, no promo code / perk creation. "Completely empty."
3. Vote buttons (Will blow up, Not for me), Save and Share do nothing when tapped ("they just sit there"). Likely cause for vote/save: the user had not finished onboarding, and the code calls `router.push('/me')` silently, which does nothing visible with NativeTabs. Share also reportedly does nothing: investigate.
4. There is no left / right swipe anywhere. The founder expects horizontal swipe gestures (for example between feed tabs, or to open the creator).
5. Earlier: the text overlay on the feed covered too much of the video (now collapsed by default with "more").
6. Onboarding date of birth row overflows (screenshot 12: YYYY field is cut off).

## Decisions already made (do not reopen)

* Mobile app first. Free like social media. No subscriptions. Paid extras (Boost, Trailer Test) come in version 2.
* Creator and Scout are separate account types. Creators cannot vote. Viewers are never paid. Skip is free.
* Video uploads: free 10 to 30 s, 10 per month (5 in the first 30 days); paid up to 60 s. Storage: Cloudflare R2 for now (free), compress to 720p on the phone before upload. Cloudflare Stream later when users grow.
* Sign in: Apple and Google (native). Email sign in only for the app review account for now.
* 18+, English first, app UI in en/es/tr today, more languages planned.
* Brand: PromoVote, promovote.com. Colors dark (#0a0a0f), lime (#c6ff3d), pink to violet gradient ring logo with a double up chevron.

## Scoring (every expert)

Score 1 to 10 for each, with one sentence of evidence:

1. **Retention**: will people come back tomorrow and next week?
2. **Session time**: will people stay longer per visit?
3. **Originality**: is it clearly its own product, not a TikTok / Reels / Product Hunt clone?
4. **Trademark and trade dress safety**: name, logo, wording ("For you" etc.), layout, icons.
5. **Your own domain score** (named in your role).

Then give the **minimum changes to bring every score below 8 up to at least 8**, as a prioritized list: P0 (must before App Store submission), P1 (before public launch), P2 (later). Each item: what, where in the code, why, and how you would know it worked. Be concrete and short. Do not rewrite decided product strategy; improve execution.

Write your full report to `docs/review/<your-role>.md` (English, no em dashes or en dashes) and return a short summary with your score table and your top 5 changes.

## Founder feedback added later

7. Categories are too narrow: Explore shows All / Games / Apps / Shops only, based on our 3 seed creators. Real creators include streamers (YouTube, Twitch, Kick), short video creators, app makers, game developers, online shops and real businesses and brands. The creator expert proposes the category taxonomy; others should design for it.
8. Founder: "the app is missing a lot". Treat completeness as P0.
