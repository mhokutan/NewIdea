# App review brief, round 2 (2026-10-07)

Same rules as `docs/review/brief.md` (read it first): every expert must score at least 8/10 on Retention, Session time, Originality, Trademark and trade dress safety, and their own domain. Your round 1 report is in `docs/review/<your-file>.md`; the team summary is `docs/review/00-summary.md`.

## What changed since round 1 (all live on the API, app build 5 on its way to TestFlight)

Commits on branch `claude/gracious-pasteur-nu8ssc`: 9e92933, 1fd6aba, dd9bdee, 71a08cb, 7424e9f. Read the diffs and the code.

1. **Every tap answers.** Account gate sheet (`apps/mobile/src/lib/gate.tsx`): guests get "Sign in to make your call", users without a profile get "Finish your profile", creators get "Creators can't vote". The tapped call, save or follow runs after sign in and onboarding. Haptics, pressed states, toasts, 409 handled. State comes from `GET /v1/me/state`.
2. **Call bar.** Vote moved from the right rail to a bottom bar (Not for me / Will blow up with the logo's double chevron) that turns into a ticket: "Called: Will blow up. Result Oct 14. Scout #1" plus crowd split after 5 calls. Save, Share and "More" stay on the right (`apps/mobile/src/ui/PromoReel.tsx`).
3. **Store compliance.** "More" menu on every promo and on creator pages: Report (7 reasons) and Block (blocked creators disappear). Help and legal links (support email, Terms, Privacy, Guidelines) on Profile for everyone, tappable Terms and Privacy on sign in, delete account shows errors and the 30 day notice, `promovote.com/delete-account` page, "Open in App Store" wording, no "unlock perks", Google Play soon only on Android, founder note always visible, official Google button style, unused Android permissions blocked, app review account with fixed email code.
4. **Identity.** Tabs are now Today's Drop (`GET /v1/drop`: same 7 promos per language per day, fair across creators, games first; progress segments; end card "That's today's drop, you made N of 7 calls, results in 7 days"; then Keep watching into the fair rotation), New, Team picks ("never paid, the founder makes some of these"). "For you" and the empty Top tab are gone. Charts moved to Explore with an honest progress bar. Creator circles are rounded squares, no story rings. Fair rotation puts the viewer language first.
5. **Calls resolve.** Daily job resolves each call 7 days after it was made using the later crowd (beta: at least 10 later calls, else void). Right "Will blow up" = 10 x early multiplier (first 10 scouts x3, first 50 x2), right "Not for me" = 5, wrong never costs points. Updates Scout Score, level, Called it.
6. **Profiles.** Two step onboarding (name suggests a handle, native date picker, 7 categories for creators: Games, Apps, Streams, Videos, Shops, Brands, Local). Scout profile: Scout Score card ("reputation only, no cash value"), level progress, open calls with result dates, Saved, Following. Creator studio: banner, setup checklist, free 7/28 day stats (valid views, completion, avg seconds, button taps, tap rate, saves), scout verdict after 30 calls, "email your first trailer" until uploads open. Edit profile: logo and banner (resized on the phone, stored on R2), name, bio, categories (+2), main button, release status, up to 8 links (https only, no shorteners). Public creator page: real banner, "New creator" chip under 10 followers, share, report/block, proper link names.
7. **Security.** Top ranks only signed in views, view seconds capped at video length, a minor report limits a profile only after 2 different reporters in 7 days, /v1 writes rate limited (60/min/IP) with a 16 KB body cap, exp:// only in development, RevenueCat webhook removed.

## Still not done (known, planned)

* Video upload by creators (R2, 720p on device, first 3 reviewed by hand). R2 must be enabled by the founder first; photo upload returns "not available yet" until then.
* Perks / promo codes and the scout perk wallet.
* Swipe left to play the same creator's other promos.
* Daily local reminder notification and the weekly forgiving streak.
* Apple token revoke on account deletion (needs a Sign in with Apple key).
* Stories and the Pro plan (v1.1, founder decision).
* More real content (12+ creators, 60 English promos).

## Screens

New screenshots (English, iPhone size web build): `docs/review/screens-r2/01..19-*.png`. On iPhone the Feed / Explore / Profile menu is a native bottom tab bar; on web it floats at the top, ignore that overlap. Photos in 16 to 19 are test images.

## What to return

Re-score the same 5 areas (1 to 10, one sentence of evidence each, and the round 1 score next to it). Then list only what still keeps any score below 8, as P0 / P1 with file references, smallest change first. Append a section "Round 2" to your existing report file `docs/review/<your-file>.md` (English, no em or en dashes) and return the short summary (score table + remaining blockers).
