# Trust & Safety and Legal/Compliance review: PromoVote 1.0.3 (2026-11-26)

Not legal advice. A licensed lawyer should review the Terms, Privacy Policy and store declarations before public launch.

Domain score: Compliance (privacy, store policy, age, trademark).

## Expert 1: Privacy and app store compliance (angle: what Apple / Google review, GDPR / CCPA and the 18+ promise see in this build)

| Score | Value | Evidence |
|---|---|---|
| Retention | 8 | Guest calls (`apps/mobile/src/lib/guest-calls.ts`) let a new user play before sign in, which is what Apple 5.1.1(v) wants (no forced account for non account features), and the soft sheet after call 3 is honest, not a dark pattern. |
| Session time | 8 | No compliance feature adds friction to the loop; the age gate sits at sign in only (`Onboarding.tsx`), after the user already played. |
| Originality | 8 | The call game with 7 day resolution and no cash value stays clear of gambling and contest rules (Terms section 7, age rating doc 2.3). |
| Trademark and trade dress safety | 9 | No third party marks in UI strings; "Made by the founder of PromoVote" label on founder promos also covers FTC self promotion disclosure. |
| Compliance | 8 | Server side 18+ gate, guest calls stay on device and expire after 24 h, are only sent after a scout account (so after the age check) exists; install source sends only an event name, never the raw referrer (`install-source.ts`), and the API allowlists event names (`services/api/src/index.js` 1565). Gaps are text and store forms, not code. |

## Expert 2: Trademark and trade dress (angle: names, wording, translations, icon and layout vs TikTok / Instagram / Snapchat / Apple)

| Score | Value | Evidence |
|---|---|---|
| Retention | 8 | Distinct own vocabulary (call, Scout Score, Today's Drop, Duel) gives users a reason to come back that is not a copy of a "For you" feed; "For you" is absent in all 6 languages of `i18n.ts`. |
| Session time | 8 | Duel and Drop are own loops, not borrowed formats with protected names (no "Reels", "Stories" as a product name, "Spotlight", "Shorts"). |
| Originality | 8 | Bottom call bar with the double chevron and the call ticket are not in TikTok or Instagram; the right rail (save, share, more) is an industry standard pattern. |
| Trademark and trade dress safety | 8 | Words used are generic or descriptive in every language (Drop, Charts / Rankings / Classements, Duel / Duelo / Duell / Düello, Keşfet / Explorar / Entdecken); monochrome black, white, one yellow, solid story ring (no Instagram gradient), own chevron icon. Only open item: the PromoVote mark itself is not cleared or filed yet (USPTO search planned). |
| Compliance | 8 | Store text avoids "discover new apps / indie games" (route A), and nothing shows App Store data or Apple / Google badges on reels on iOS. |

## P0 (must before this TestFlight / closed testing build)

None. Nothing in the 1.0.3 code is a store or legal blocker for a TestFlight or Play closed testing build.

## P1 (before submitting 1.0.3 for public review, then before public launch)

1. `web/landing/public/terms.html` line 50 says "To make calls ... you need an account", which now contradicts guest calls (line 62 `#age`). Change to "To keep calls, earn Scout Score, save, follow ...". Verify: read both lines, no contradiction. Deploy the web page before the 1.0.3 submission (Age Suitability URL points here).
2. `web/landing/public/privacy.html` section 2: add (a) guest calls are kept on the device for up to 24 hours and sent to your account only if you sign in as a scout; (b) on Android the app reads the Google Play install referrer once and sends only a source label (for example "from Hauling Empire"), never the full referrer. The "Stored only on your device, not sent to us" list must not imply guest calls never leave the phone. Verify: text matches `guest-calls.ts` and `install-source.ts`.
3. App Store Connect App Privacy and Play Data safety: add "Device ID" (Apple) / "Device or other IDs" (Google) for the random guest device id used by events, as the privacy.html comment line 211 already asks; remove "Purchase History" until v2 (optional, over declaring is not rejected). Install source fits "Product Interaction" / "App interactions", already declared. Verify: ASC App Privacy page and Play Console Data safety preview.
4. Hauling Empire in game card links players to an 18+ app. Check Hauling Empire's age rating and Play target audience: if it is rated for or targets users under 18 (or is in Families), show the card only to players who confirmed 18+ or remove it, otherwise Apple 1.3 / Google "inappropriate ads and cross promotion" risk falls on Hauling Empire. Verify: HE store ratings and the card condition in the HE code.
5. `store/review-notes-1.0.3.md`: add one line from `docs/store/apple-age-rating-2026-11.md` 6.4 ("18+ only. Date of birth asked at sign up; server refuses under 18 ...") and one line on guest calls ("a guest can make 3 calls kept on the device; sign in is needed to keep them"). Check the sentence "Every promo in this build belongs to the developer's own products" against the live seed before pasting.
6. Apple age rating: apply `docs/store/apple-age-rating-2026-11.md` (new Shared Location and Dating questions are required for the next submission) with Override 18+ and Age Suitability URL `https://promovote.com/terms#age` (section is live).
7. USPTO clearance search and filing for PROMOVOTE (classes 9, 35, 42; class 9 for the downloadable app is missing from the CLAUDE.md plan of 35 and 42) before public launch.

## P2 (later)

* "Under 18" reason in the in app Report menu; written "delete without the 30 day wait" rule for underage accounts.
* Decision with a lawyer on Apple Declared Age Range and Google Play Age Signals APIs and US state app store age laws (Texas, Utah, Louisiana) for 2027.
* Keep a short glossary that bans "For you", "Reels", "Stories" as a feature name, "Spotlight", "Shorts" and store names in any future language.
