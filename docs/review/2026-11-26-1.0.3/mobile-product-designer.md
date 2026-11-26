# Mobile product design review: PromoVote 1.0.3 (2026-11-26)

Role: Mobile Product Design. Domain score: UX quality.
Evidence: code at HEAD (`apps/mobile/src/ui/PromoReel.tsx`, `src/lib/gate.tsx`, `src/lib/guest-calls.ts`,
`src/app/(tabs)/index.tsx`, `src/app/(tabs)/me.tsx`, `src/app/(tabs)/_layout.tsx`, `src/lib/i18n.ts`) and the Mac test
screenshots in `docs/review/2026-11-17-mac-test/` (taken before the label fixes and commit 908f699, so text overflow
there is partly outdated). `app.json` is 1.0.3 and already has `enableSceneSupport: true` (the Mac test blocker).

## Expert 1: mobile UX designer, guest call flow and first session

| Score | Value | Evidence |
|---|---|---|
| Retention | 8 | A guest can now make 3 real calls in the first minute and sees the call ticket with a result date (`android-tr-tahmin-fisi.png`), so the "called it" loop starts before any sign in wall. |
| Session time | 8 | Calling no longer pulls a first time viewer out of the feed into a sheet; the keep sheet comes only after call 3, 900 ms later, with "Not now". |
| Originality | 8 | The yellow chevron call bar turning into a ticket is the product's own signature; it is not a like or a heart. |
| Trademark and trade dress | 9 | Monochrome plus one yellow, own chevron mark, bottom call bar instead of a TikTok right rail heart stack. |
| UX quality | 7 | The flow works, but three guest texts still say the opposite of what just happened (below), and there is no confirmation that kept calls reached the account. |

Findings:
* After 3 guest calls, the drop end card says "Sign in to make your calls" (`drop_done_guest`, `EndCard` in
  `index.tsx` line 289 ignores `calls` when `guest`). The Me tab guest card says "Sign in to vote, save and follow"
  (`guest_p`). Both contradict the headline feature exactly at the conversion moment, in all 6 languages.
* A tap on the call bar while the session is still loading (`current.loading`) is queued in `asScout`, and once loading
  ends with no account the effect in `gate.tsx` line 72 opens the sign in sheet. On a slow first launch the very first
  call of a new guest hits the old wall instead of a free call, and nothing visible happens until loading ends.
* After sign in, `syncGuestCalls` returns the saved count but nothing shows it. The person who just signed in "to keep
  my calls" gets no "3 calls saved" moment.
* The guest ticket shows "Result on <date>" like a real call, but if the guest never signs in the call is dropped after
  24 hours and no result ever comes. The keep sheet explains it once; the ticket never does.
* `gate_keep_p` hard codes "3" instead of `GUEST_FREE_CALLS`.

## Expert 2: localization and layout designer, 6 languages on iPhone SE and Pro Max

| Score | Value | Evidence |
|---|---|---|
| Retention | 8 | Phone language is picked automatically and the call bar ("Wird explodieren", "Ça va exploser", "Vai explodir") fits on SE in the screenshots. |
| Session time | 8 | Reel rail, call bar and bottom tabs fit on SE in de and fr; the top tab row scrolls instead of wrapping. |
| Originality | 8 | Call vocabulary is consistent per language (Tahmin, Tipp, predicción, palpite, prédiction), not literal "vote". |
| Trademark and trade dress | 9 | No borrowed labels such as "For you"; "Scout Score" kept as a product term. |
| UX quality | 8 | Strip and rail overflow from the Mac test are fixed: `strip_guest` shortened in de, es, fr; `save` and `share` now "Merken", "Garder", "Enviar"; rail labels use `numberOfLines={1}` plus `adjustsFontSizeToFit` (min 0.75) in a 64 px box (908f699). |

Findings:
* Rail labels can shrink to 8.25 pt (11 x 0.75), below the HIG 11 pt floor. With the new short words nothing should
  shrink today, but this needs one look on SE at the largest Dynamic Type step.
* The "Feed" bottom tab stays English in es, pt, fr (tr has "Akış"). Acceptable, not consistent.
* fr top tab "Choix de l'équipe" starts cut on SE; it scrolls, so acceptable.
* Android tab bar was white on a dark app in `android-tr-ana.png`; `_layout.tsx` now sets `backgroundColor={C.bg}`,
  needs a recheck on the build.
* Duel, Explore, Me, sign in, onboarding and upload were never checked on device in de, fr, pt (Mac test section 1).

## Minimum changes

### P0 (before this 1.0.3 build)
1. Guest copy that contradicts guest calls. Files: `apps/mobile/src/lib/i18n.ts` (`guest_p`, `drop_done_guest` in all
   6 languages), `apps/mobile/src/app/(tabs)/index.tsx` `EndCard`. Why: the main new feature is denied on screen at
   the moment we ask for sign in. How: `guest_p` becomes "Guests can watch everything and make 3 calls. Sign in to keep
   calls, save and follow."; for a guest with calls > 0 the end card says "Sign in to keep your {n} calls. Results come
   in 7 days." (new key), else today's line. Verify: as guest make 2 calls, finish the drop, read the end card and the
   Me tab in en and one long language (de).

### P1 (before public launch)
2. Loading race: in `gate.tsx`, when loading ends as guest and the queued action came from a call, run it as a guest
   call instead of opening the sign in sheet (or let `PromoReel.vote` wait for the session). Verify: throttle network,
   tap Will blow up within 1 s of cold start, expect a ticket, not a sheet.
3. Confirmation after sync: toast "Your {n} calls are saved" when `syncGuestCalls` returns > 0 (`gate.tsx`). Verify:
   3 guest calls, sign in, see the toast and the calls on the profile.
4. Guest ticket line: "Kept on this phone for 24 h. Sign in to keep it." under the ticket for unsynced guest calls
   (`PromoReel.tsx` `sub`). Verify: guest call shows the line, after sign in it shows the result date.
5. Full screen pass of Duel, Explore, Me, sign in, onboarding, upload in de, fr, pt on SE and Pro Max, plus Android tab
   bar color. Verify: screenshots added to the review folder.

### P2 (later)
6. `gate_keep_p` reads `GUEST_FREE_CALLS` instead of a literal 3.
7. Guest strip shows calls left ("2 free calls left") after the first guest call.
8. Raise rail `minimumFontScale` to keep at least 10 pt; translate "Feed" in es, fr, pt if not a brand word.
