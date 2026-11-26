# Product strategist review: PromoVote 1.0.3 (2026-11-26)

Role: product fit and review risk. Read only review; nothing else was changed.
Sources read: `brief.md`, `docs/00-idea-brief.md`, `docs/01-team-verdict.md`, `docs/07-todo.md`,
`store/review-notes-1.0.3.md`, `store/route-a-metadata.md`, `docs/review/2026-11-17-mac-test/REPORT.md`,
`apps/mobile/src/app/(tabs)/explore.tsx`, `(tabs)/me.tsx`, `src/ui/PromoReel.tsx`, `src/ui/Onboarding.tsx`,
`src/lib/guest-calls.ts`, `src/lib/i18n.ts`, `apps/mobile/app.json`, `services/api/src/index.js` (home tab `top`).

## Expert 1: Product strategist (angle: does 1.0.3 move the validation goals?)

Validation goals from `docs/01-team-verdict.md` section 10 and phase table: 300 to 500 voters, 25 to 30 percent
come back next week, D7 at least 15 percent, then paying developers. 1.0.3 is an activation and measurement build,
not a monetization build. That is the right order: the paid side cannot be tested without a voter base.

| Score | 1 to 10 | Evidence |
|---|---|---|
| Retention | 8 | Guest calls (`guest-calls.ts`) put a first call in the first 30 seconds and the 7 day result is the reason to come back; the soft "Keep your calls" sheet says the honest trade (gone after 24 h). |
| Session time | 8 | Today's Drop of 7 plus Duel tab plus "keep watching" fair rotation is unchanged and proven in 1.0.2; nothing in 1.0.3 shortens it. |
| Originality | 9 | Call, lock, resolve in 7 days, Scout Score is still a loop no feed app or store has. |
| Trademark and trade dress | 9 | Own name, own chevron mark, monochrome plus one yellow; no copied TikTok or Instagram chrome, no "For you". |
| Domain: product fit | 8 | Every 1.0.3 item serves a validation metric: guest calls (activation), 6 languages (top of funnel), install source and guest events (attribution and funnel), call resolver fix (trust in results). |

Concerns that do not block: supply is only founder products (Hauling Empire, Poleris, Nicheable, Dropolis, Dovelet),
so a returning scout sees the same 5 brands; this caps retention more than any build can. The niche "indie game
trailers" is drifting toward "founder's apps"; outside creators are the real test.

## Expert 2: App Store positioning (angle: 3.2.2(i) risk, again)

| Score | 1 to 10 | Evidence |
|---|---|---|
| Retention | 8 | The call loop is the first screen, which is also the strongest 3.2.2(i) defense. |
| Session time | 8 | Same feed and Duel as the approved 1.0.2; no catalog-style browsing added. |
| Originality | 9 | Reviewer sees a game with a score strip, not a list of apps. |
| Trademark and trade dress | 8 | Store text avoids "discover", "new apps", "indie games"; Play ASO idea `PromoVote: New Games & Apps` in `docs/07-todo.md` must never reach iOS. |
| Domain: review risk | 7 (8 after the P0) | UI is identical to the approved Route A (Explore leads with creators, charts and category pills in the second segment, `PromoReel.tsx` hides the store button on iOS), but `store/review-notes-1.0.3.md` makes 3 claims the build does not match. |

The 3 claims in `store/review-notes-1.0.3.md` that are not true:
1. "user video upload is not open to the public in this version": any new account can pick Creator in
   `Onboarding.tsx` and the studio in `(tabs)/me.tsx` opens `/upload`. Uploads are manually reviewed, but they are open.
2. "a chart ranked by scouts' call accuracy (not by downloads or clicks)": the `top` tab in
   `services/api/src/index.js` ranks by in-app views plus 3 times Will blow up calls, not by accuracy.
3. "resolves seven days later against the real result": calls resolve against the later crowd (`crowdBar`), as
   `store/route-a-metadata.md` correctly says.
A reviewer who finds one false line reads the rest with suspicion; after a 3.2.2(i) rejection this is the main risk.

## P0 (before submitting 1.0.3 to App Review; no code change, does not block the build itself)

* `store/review-notes-1.0.3.md`: fix the 3 lines above. Suggested text: "Creators can submit videos; every video is
  reviewed by hand before it is published, and at the time of this review all live promos belong to the developer's
  own products." / "a chart ranked by in-app views and scout calls (not by downloads, prices or store ratings)" /
  "resolves seven days later against the calls of the scouts who came after". Also replace "before they spend money
  on advertising" with "before they launch" (keeps the app away from ad framing, 3.2.2(iii)). Verify: each sentence
  checked against the files named above; character count under 3500.

No code P0. UIScene fix from the Mac test is in `apps/mobile/app.json` (`enableSceneSupport: true`), and the
`strip_guest` and side label truncations are shortened in `i18n.ts`.

## P1 (before public launch)

* Store texts in es, tr, pt, de, fr (`mhokutan/nakliye-patronu` branch `claude/aso-yeni-metinler`): run the Route A
  word list ("discover", "new apps", "indie games", "watch ads", "earn", "For you") in every language, including
  translations like "descubre", "keşfet", "entdecke", "découvre". Verify: grep each file before pasting.
* Screenshots on `origin/store/aso-2026-11`: the first image must be the call bar, never a grid of app tiles or a
  chart. Verify: open the 3 PNGs.
* Before approving the first third party app promo from `/admin/onay`: re-read 3.2.2(i), keep the store link on the
  creator page only, and update the review notes. Verify: iOS reel shows no store button for that promo.
* Validation dashboard: guest_first_call to sign in conversion, D1 and D7 of guests vs signed in scouts, weekly
  returning callers (target 25 to 30 percent). Without it 1.0.3 does not answer the validation question.
* Supply: first 5 outside indie game creators onboarded (manual), so the niche test is real.

## P2 (later)

* Server push for "your call resolved" (today only the local 18:00 reminder), the strongest D7 lever.
* Guest who never signs in: 3 calls per 24 h reset silently; consider a gentle "your calls are waiting" on day 2.
