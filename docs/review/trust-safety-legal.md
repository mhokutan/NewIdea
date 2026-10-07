# PromoVote app review: Trust & Safety and Legal

Reviewer: Trust & Safety and Legal/Compliance lead. Date: 2026-10-07.
Domain score: **Trademark, trade dress and store policy safety**.

This is not legal advice. It is a practical launch checklist; a US trademark attorney and product counsel should review the filing plan, Terms and store answers before submission.

Inputs read: `docs/review/brief.md`, `docs/00-idea-brief.md`, `CLAUDE.md`, screenshots `docs/review/screens/01..13`, `apps/mobile/src/lib/i18n.ts`, `apps/mobile/src/ui/PromoReel.tsx`, `apps/mobile/src/app/sign-in.tsx`, `apps/mobile/src/app/(tabs)/me.tsx`, `services/api/src/index.js`, `web/landing/public/favicon.svg`, `store/assets/*`, `store/README.md`, `store/status.md`, website legal pages. Web checks on 2026-10-07 (sources at the end).

## 1. Score table

| # | Area | Score | Evidence (one sentence) |
|---|---|---|---|
| 1 | Retention | 4 | Signed in profile is empty (screen 13) and votes/saves do nothing on device, so there is no personal reason to come back tomorrow. |
| 2 | Session time | 5 | The feed plays well, but there are only 3 creators and no working vote loop, so a session ends after a few swipes. |
| 3 | Originality | 6 | Labeled vote buttons ("Will blow up", "Not for me") and "Paying never buys a spot" are distinct, but the full screen feed, right rail and a "For you" first tab read as a TikTok pattern at first glance. |
| 4 | Trademark and trade dress safety | 7 | No live "PromoVote" mark, app or company found and the icons are generic, but the name is weak (descriptive) and the pink to violet ring nods to Instagram. |
| 5 | **Trademark, trade dress and store policy safety (my domain)** | **5** | Name and layout are low risk, but the build has clear App Store / Google Play rejection triggers: no in-app Report/Block (Guideline 1.2, Play UGC policy) even though the review notes promise them, no in-app contact, Terms/Privacy not tappable, no Sign in with Apple token revocation on delete, "Google Play coming soon" shown on iOS (2.3.10), and an "unlock perks" claim for a feature that does not exist (2.3.1). |

With the P0 list below, I expect 4 to rise to 8 and 5 to rise to 8. Items 1 to 3 belong mostly to other experts; I only list the legal side of them.

## 2. Name: PromoVote

### 2.1 What I found (knockout search, not a full clearance)

* USPTO (via public mirrors and web search): no live or dead application for PROMOVOTE or PROMO VOTE found. Nearby marks: PROMOTE (Pacesetter, class 10, heart devices; not relevant), PROMOVE (Cannon Equipment, abandoned 2023), PROMOTE THE VOTE (abandoned 2020). Justia and the USPTO search UI blocked automated access, so the founder must run the free search at tmsearch.uspto.gov himself (steps in 7.2).
* EUIPO / TMview: the service was unavailable to me. Must be checked before any EU filing.
* App Store and Google Play: no app named PromoVote. Similar but different: ProxyVote (proxy voting), POGO Vote, Topvote, PromoKit, PromoBox, Promova (language learning, registered by Unlimited Promova Limited, class 9). Promova is the closest in sound; different goods and a different second syllable, so low risk, but expect it to be cited in a full search.
* Companies and domains: PROMOVATE (South Africa, corporate gifts), a 2014 agency portfolio page titled "PROMOVOTE" (one off Zewa voting campaign), and GoGo Photo Contest uses "promo votes" as a feature term. None is a live competing brand.

### 2.2 The real risk is weakness, not infringement

"Promo" + "vote" for a service where users vote on promos is close to **merely descriptive** (USPTO Section 2(e)(1)). Expect an Office Action, mostly in class 35. That does not block use; it means the word mark may be slow or land on the Supplemental Register first. Two answers: (1) file the word mark anyway in the classes where it is more suggestive (9, 42), (2) file the logo as a design mark later, which is easier to register, and build distinctiveness through use.

**No rename needed.** Keep PromoVote.

## 3. Wording risks

| Term | Where | Risk | Action |
|---|---|---|---|
| For you | Feed tab `home_for_you` | Low legal risk. I found no TikTok/ByteDance registration for FOR YOU; the phrase is used by X, Threads, Instagram, YouTube, Apple Music and Apple News. Main cost is originality, because "For you" as the first tab is TikTok's signature. | Optional rename for originality (for example "Your mix"), not legally required. |
| New, Top, Featured | Feed tabs | Generic (Reddit, App Store). | Keep. Make sure "Top" is truly vote based and Boost never enters it (already decided). |
| Featured note "Picked by the PromoVote team. Never paid." | `featured_note` | Today every featured item is the founder's own project. "Never paid" is true but incomplete; FTC Endorsement Guides want material connections disclosed clearly. | Add the founder disclosure (P0 7). |
| Will blow up / Not for me | Vote rail | Generic phrases, not "hot or not" on people (Guideline 1.2 bans that only for real people). | Keep. Do not allow promos whose subject is a person's looks. |
| Called it | Spec only, not in app yet | Generic phrase. | Keep. Do not try to register. |
| Scout / Kaşif | Account type | Many SCOUT marks exist in classes 9 and 42. Using it as a role label is descriptive use, low risk. | Keep as a label. Do not file SCOUT or "Scout Score" as marks. |
| Boost (v2) | Spec | Meta, TikTok, X use "boost" for paid reach. Boost Mobile enforces BOOST in telecom (forced Optus to rename "Internet Boost" in Australia). Lowercase descriptive use with a "Sponsored" label is low risk. | Keep as a verb ("Boost this promo"), never as a stand alone product brand. Do not file it. |
| Download on the App Store | `cta_app_store` button | That exact phrase is Apple's badge text; Apple's marketing guidelines say not to create your own badge. | Use the official badge, or change text to "Open in App Store" / "Get the app" (P1). |
| Google Play coming soon | `android_soon`, shown on iOS | Guideline 2.3.10: no names of other mobile platforms in the iOS app. | Hide on iOS (P0 5). |
| Unlock perks | `sign_in_p` | Guideline 2.3.1: do not promote features the app does not offer. No perk UI exists yet. | Remove until perks ship (P0 4). |
| "The social media of ads" | `web/landing/public/about.html` title and h1 | Guideline 3.2.2(iii) rejects apps "designed predominantly for the display of ads"; Google Play bans apps whose primary purpose is serving ads. A reviewer who opens the marketing URL sees "ads". | Keep the vision internally; store metadata and the page linked as marketing URL should say trailers, promos, discover, vote (P0 6, website P1). |

## 4. Trade dress and logo

### 4.1 Layout

A full screen vertical video feed with a right side action rail is now an industry pattern (TikTok, Reels, YouTube Shorts, Snapchat Spotlight, Pinterest, LinkedIn video). In the US, functional features cannot be protected as trade dress (TrafFix), and I know of no successful trade dress claim over this layout. Apple 4.1 (copycats) is about copying a specific app's name or UI, not a genre.

What keeps us safe today: our rail uses flame, thumb down, bookmark and share node icons with text labels; there is no heart, no comment bubble, no spinning music disc, no avatar with a "+" follow badge at the top of the rail, no "Following | For You" header. **Do not add those TikTok specific elements.** If a follow button goes on the rail, use a text pill, not a "+" on the avatar.

Risk: low. Score impact comes from originality, not law.

### 4.2 Logo (double up chevron, lime, in a pink to violet gradient ring)

* Double up chevron: a common geometric symbol (rank insignia, "scroll to top" icon sets). Low distinctiveness, low conflict. Reddit's upvote is a single arrow; Product Hunt's logo is a "P" in an orange circle and its upvote is a triangle. No conflict found.
* Gradient ring: Instagram's brand gradient (yellow, orange, pink, purple) and its story ring are well known, and Meta enforces actively (mostly against "insta" and "gram" names). Ours is a two stop pink (#ff5470) to violet (#8b5cff) ring with no yellow or orange, and the core is a lime chevron. Risk: low to moderate as trade dress, low as trademark.
* Keep it, with two rules: (1) lime stays the dominant brand color (it already is in the app), (2) never put the pink to violet gradient ring around user avatars or "story" circles. Explore currently uses lime rings around creator avatars (screen 06): keep it lime.
* Before filing the logo, run a USPTO design code search (circles 26.01, arrows/chevrons 24.15).

## 5. Store policy check (today's build)

| Rule | Status | Finding |
|---|---|---|
| Apple 1.2 UGC: filter, report, block, published contact | **Fail** | API has `/v1/reports` and `/v1/blocks` (`services/api/src/index.js` lines 532 and 549), `api.report` exists in `apps/mobile/src/lib/api.ts` line 65, strings `report` and `block` exist, but **no screen uses them**. No support email or contact link anywhere in the app. Review notes in `store/status.md` line 53 tell Apple to test "reporting, blocking": the reviewer will not find them. Near certain rejection. |
| Apple 1.2 EULA "no tolerance" | **Fail** | Terms/Guidelines pages do not state zero tolerance for objectionable content and abusive users, and the in-app Terms text is not a link. |
| Apple 1.2.1 creator content age mechanism | Pass | Declared date of birth at onboarding, 18+ checkbox. Fix the DOB overflow (screen 12) so it is usable. |
| Google Play UGC policy | **Fail** | Same gap: public UGC apps must have in-app report content, report user and block user, and Terms accepted before posting. |
| Apple 2.1 completeness | **Risk** | Vote and Save do nothing for a user who has not finished onboarding (silent `router.push('/me')` in `PromoReel.tsx` line 52), DOB field cut off. Reviewers reject "obvious technical problems". Review account must be a finished Scout (it is: @appreview). |
| Apple 2.3.1 accurate claims | **Risk** | "unlock perks" in `sign_in_p` (en, es, tr). |
| Apple 2.3.10 other platforms | **Risk** | "Google Play coming soon" chip in `PromoReel.tsx` line 115 and `creator/[handle].tsx` line 75 renders on iOS. |
| Apple 3.2.2(iii) "predominantly ads" / Play "Made for Ads" | **Risk (biggest strategic one)** | The product is promos as content. It passes if the store page, review notes and app show a discovery and voting product: creator profiles, follow, vote, save, charts, no ad network, no reward for watching. Wording decides how the reviewer reads it. |
| Apple 3.2.2(i) "interface displaying third party apps like the App Store" | Risk, low today | Mixed content (games, shops, channels) and video first UI help. Avoid store-like grids of apps with "Get" buttons, star ratings or prices. |
| Apple 4.8 login | Pass | Native Sign in with Apple shown on iOS next to Google. |
| Apple 5.1.1(v) deletion | **Partial** | In-app delete exists with a 30 day grace (fine if disclosed). Missing: Sign in with Apple token revocation via Apple's REST API (TN3194) when the account is deleted. Also `me.tsx` line 42 swallows API errors and signs out, so a failed deletion looks successful. |
| Apple 5.1.1 guest access | Pass | Guests can watch everything. |
| Privacy policy link in app | **Fail** | `legal_note` in `sign-in.tsx` line 57 is plain text. Needs tappable Terms and Privacy, also from Profile. |
| Google Play account deletion web link | Pass | `promovote.com/delete-account` exists; put it in Play Console Data safety. |
| Age rating | Pass if done | Apple's new questionnaire (4+/9+/13+/16+/18+) must be answered or updates are blocked; set 18+ for UGC. Play: target audience 18+, IARC questionnaire. `store/README.md` already says this. |
| Google Sign-In branding | Risk, low | `sign-in.tsx` lines 45 to 49 draw a fake "G" in #4285F4. Google's branding guidelines require the official button or logo asset. |
| Founder self promotion (FTC) | **Risk** | All 3 creators and all Featured items are the founder's. "Made by the PromoVote founder" shows only after tapping "more" (`PromoReel.tsx` line 123). A material connection disclosure must be visible without a tap. |
| DMCA safe harbor | Not yet required | `copyright.html` says agent registration is "in progress". It costs $6 at dmca.copyright.gov; do it before any user upload opens. |

## 6. Rights to show third party trailers

Today the feed only shows the founder's own projects, so there is no third party rights problem yet. Rules for when it grows (weekly trailer list, concierge Trailer Test, uploads):

1. **Only rights holders upload.** Creator accounts upload their own videos and tick a rights warranty (they own or licensed footage, music, voice, logos) at each upload. Music is the hidden trap: many trailers license music only for YouTube or the store page.
2. **Curated third party trailers need written permission.** An email from the developer saying "you may show our trailer on PromoVote, including in paid reports" is enough. Press kits usually allow press and non commercial use only; PromoVote sells reports, so a press kit is not permission.
3. **Do not download trailers from Steam, YouTube or store pages** and re host them. That is copying without a licence and outside DMCA safe harbor protection for content we put up ourselves.
4. **YouTube embeds are not a shortcut.** The YouTube API policies require the standard player UI and unmodified title and thumbnail; our full screen autoplay feed with overlays does not fit. Use a "Watch on YouTube" link out instead.
5. **Names and logos of games, Etsy, App Store:** fine for identifying the product (nominative use) as long as we do not suggest partnership. "Verified" only after owner proof. The `impersonation` and `trademark` report reasons already exist in the API.
6. **Takedown flow:** DMCA agent registered, counter-notice flow (already drafted in `copyright.html`), repeat infringer rule, 24 hour action on reports (Apple expects timely response).
7. **EU later:** DSA notice and action, statement of reasons when removing content, and for Boost the Article 26 ad label (sponsored, on whose behalf, who paid). Small startups are exempt from the heavier Copyright Directive Article 17 duties for the first 3 years if under EUR 10M turnover and 5M monthly users.

## 7. Trademark filing recommendation

### 7.1 Who files

File in the name of the entity that will own the brand. CLAUDE.md says a separate LLC will be formed before uploads or revenue. US intent to use applications cannot be assigned before use is proven except together with the business (15 U.S.C. 1060). Two clean options: (a) form the new LLC first and file in its name, or (b) file now under MIA PERA TRANSPORTATION LLC and file the Statement of Use before moving the brand, then record an assignment. Option (a) is cleaner if the LLC is weeks away.

### 7.2 Before filing (free, 1 hour)

At tmsearch.uspto.gov search: `promovote`, `promo vote`, `promovot*`, `provote`, `promote vote`, `promovia`, `promova`, plus "vote" marks in classes 9, 35, 41, 42. In EUIPO eSearch plus / TMview repeat for the EU and UK. Screenshot results into the repo (no secrets).

### 7.3 Classes and order

| Wave | When | Mark | Classes | Why |
|---|---|---|---|---|
| 1 | Now, before public launch, intent to use basis | PROMOVOTE (standard characters) | **9** (downloadable mobile app), **42** (non-downloadable software, online platform for sharing and rating videos), **35** (advertising and promoting the goods and services of others; online business directory) | 9 and 42 protect the app and platform where the name is most suggestive; 35 covers the money product (Trailer Test, Boost). |
| 2 | Within 6 months of wave 1 (Paris priority keeps the US date) | Same word mark | EU (EUIPO) and UK, same 3 classes | English first, global users; EU and UK are the likely next markets. |
| 2 | When charts and rankings go live | PROMOVOTE | **41** (entertainment: providing non-downloadable videos online, online rankings and competitions) | Covers the "charts" and community side. |
| 3 | After the logo is final | Logo (design mark) | 9, 42 | Easier to register than a descriptive word; protects the icon on stores. |
| Skip for now | | | 38 (telecom, chat, forums) | Only if DMs or chat ship. |

Use USPTO ID Manual wording to avoid surcharges.

### 7.4 Budget (official fees as published for 2025 to 2026; confirm before paying)

| Item | DIY | With attorney |
|---|---|---|
| USPTO base application, 3 classes x $350 | $1,050 | $1,050 + $750 to $2,000 fees |
| Surcharges if free text or missing info ($200 or $100 per class) | $0 if ID Manual used | usually $0 |
| Clearance search by attorney | $0 (own search) | $300 to $1,000 |
| Office Action response (likely 2(e)(1) descriptiveness) | your time, risky | $500 to $1,500 |
| Statement of Use later (about $150 per class) and extensions (about $125 per class each) | $450+ | same + small fee |
| EUIPO, 3 classes (EUR 850 + 50 + 150) | EUR 1,050 | EUR 1,050 + EUR 800 to 1,500 |
| UK IPO, 3 classes | about GBP 270 | + GBP 400 to 800 |
| Class 41 add on later (US) | $350 | + $250 to 500 |
| DMCA agent | $6 per 3 years | same |
| promovote.app domain (defensive) | about $15 per year | same |

Realistic year one: **DIY US only about $1,100**; **attorney assisted US about $2,500 to $4,000**; **US + EU + UK with attorney about $6,000 to $9,000**.

### 7.5 DIY or attorney

* DIY is fine for the **filing itself** in the US if you use ID Manual entries; the form is simple.
* Use a **flat fee attorney** for two things: the clearance opinion before filing (because of Promova and crowded "vote" marks) and the **descriptiveness Office Action**, which is where DIY applications usually die.
* For EU and UK use an attorney or a fixed price service; foreign filings are not worth DIY mistakes.
* Also claim the handle `promovote` on X, Instagram, TikTok, YouTube, Reddit, Threads, and buy promovote.app.

## 8. Minimum changes (prioritized)

### P0: before App Store and Google Play submission

1. **Report and Block in the app.** Where: add a "..." button on the rail in `apps/mobile/src/ui/PromoReel.tsx` (Report promo, Report creator, Block creator) and in the header of `apps/mobile/src/app/creator/[handle].tsx`; add `api.block(handle)` next to `api.report` in `apps/mobile/src/lib/api.ts`; reasons from `REPORT_REASONS`. Guests tapping Report go to sign in. Why: Apple 1.2, Play UGC policy, and the review notes already promise it. Done when: the review account can report a promo and block a creator on a real device, rows appear in D1 `reports` and `blocks`, and the blocked creator no longer appears in feed and Explore.
2. **Contact and legal links in the app.** Where: a "Help and legal" block in `apps/mobile/src/app/(tabs)/me.tsx` for guests and signed in users (support@promovote.com mailto, Terms, Privacy, Community Guidelines, Copyright, Delete account page); make `legal_note` in `sign-in.tsx` line 57 and the checkbox text in `me.tsx` line 126 tappable links. Add one sentence to `web/landing/public/terms.html` and `guidelines.html`: zero tolerance for objectionable content and abusive users, reports acted on within 24 hours. Why: Apple 1.2 (contact, EULA), 5.1.1 privacy link, Play UGC. Done when: every link opens on device and the sentence is live on promovote.com.
3. **Delete account that really works.** Where: `services/api/src/index.js` `app.delete("/v1/me")` (line 404) or the daily hard delete job (line 636) calls `https://appleid.apple.com/auth/revoke` for users who signed in with Apple (keep the Apple refresh token from sign in); `me.tsx` line 42 shows a success message with the final deletion date, or an error, instead of swallowing failures. Why: Apple 5.1.1(v) and TN3194. Done when: after deleting, the Apple ID settings no longer list PromoVote and the app shows the scheduled date.
4. **No promises the build cannot keep.** Where: `sign_in_p` in `i18n.ts` lines 15, 39, 62 becomes "Watch free. Sign in to vote, save and follow." (es/tr same meaning); update review notes in `store/status.md` line 53 to list only what works. Why: Apple 2.3.1 and 2.1. Done when: every feature named in metadata, screenshots and review notes can be reached in TestFlight.
5. **Hide other platform names on iOS.** Where: `PromoReel.tsx` line 115 and `creator/[handle].tsx` line 75 render `android_soon` only when `Platform.OS === 'android'`. Why: Apple 2.3.10. Done when: no "Google Play" text appears anywhere in the iOS build.
6. **Store copy framed as discovery and voting, not ads.** Where: App Store Connect and Play listing (name, subtitle, description, keywords, screenshots, feature graphic), review notes, and the page used as marketing URL. Never "ads", "watch ads", "TikTok for"; use "trailers", "promos", "discover", "vote", "creators". Add to review notes: "All videos are posted by the creators who own them and reviewed before going live. There is no ad network, no reward for watching, and paid placement never affects rankings." Why: Apple 3.2.2(iii), Play "Made for Ads", 2.3.7. Done when: a text search of the listing and notes finds no "ads".
7. **Founder disclosure always visible.** Where: `PromoReel.tsx` line 123 moves `founder_made` out of the `open &&` block into the always visible creator line (for example "Etsy shop · By the PromoVote founder"); `featured_note` becomes "Picked by the PromoVote team. Never paid. Includes the founder's own projects." while that is true. Why: FTC Endorsement Guides (material connection), Apple 2.3.1 honesty. Done when: a collapsed screenshot of any founder promo shows the disclosure.
8. **Fix the 2.1 blockers other experts flagged** (vote/save silent no-op for users without a finished profile, DOB overflow on screen 12). Done when: a fresh Apple sign in user can vote within 3 taps and all 3 DOB fields are visible on a 393 pt wide screen.

### P1: before public launch

1. Register the DMCA agent ($6) and remove the "in progress" line in `web/landing/public/copyright.html` lines 34 and 75. Done when: the Copyright Office directory lists PromoVote.
2. Run the USPTO/EUIPO self search (7.2), decide the owning entity (7.1), file wave 1 (9, 42, 35). Done when: three serial numbers are in `store/status.md`.
3. Buy promovote.app and claim social handles.
4. Official Google Sign-In button in `sign-in.tsx` lines 45 to 49. Done when: it matches Google's branding guide assets.
5. App Store CTA: official badge or "Open in App Store" text (`cta_app_store` in `i18n.ts`). Same rule for a future Google Play badge.
6. Moderation ops: admin queue for reports with a 24 hour target, pre-moderation of every upload (this is our "filter" under 1.2), word filter on handles, names and bios. Publish the rules in `guidelines.html`.
7. Upload rights warranty checkbox and the third party trailer rules in section 6, before uploads open.
8. Website: soften "The social media of ads" on `about.html` for anything a reviewer might open (keep the idea, for example "The social network for promos").
9. Optional for originality: rename "For you" to an own term.

### P2: later

1. EU and UK filings within 6 months of the US date; class 41 when charts go live; logo design mark.
2. DSA readiness for EU users (notice and action, statement of reasons, Boost ad labels with advertiser and payer).
3. Brand guard: keep lime dominant, no pink to violet rings around avatars, never add TikTok signature rail elements.

## 9. Top 5 changes

1. Report and Block in the app (P0 1).
2. In-app contact, tappable Terms/Privacy and a zero tolerance sentence (P0 2).
3. Delete account with Apple token revocation and honest result (P0 3).
4. Remove "unlock perks", hide "Google Play" on iOS, and write store copy without "ads" (P0 4, 5, 6).
5. Always visible founder disclosure, then file PROMOVOTE in classes 9, 42, 35 and register the DMCA agent (P0 7, P1 1, P1 2).

## Sources

* [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
* [Apple TN3194: account deletion and revoking Sign in with Apple tokens](https://developer.apple.com/documentation/technotes/tn3194-handling-account-deletions-and-revoking-tokens-for-sign-in-with-apple)
* [Apple Marketing Resources and Identity Guidelines](https://developer.apple.com/app-store/marketing/guidelines)
* [Apple new age ratings (13+, 16+, 18+), questionnaire deadline](https://www.businesstoday.in/amp/technology/news/story/apple-overhauls-app-store-age-ratings-adds-new-13-16-and-18-categories-486587-2025-07-28)
* [Google Play User Generated Content policy](https://support.google.com/googleplay/android-developer/answer/9876937)
* [Google Play account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111)
* [Google Play ads policy (Made for Ads)](https://support.google.com/googleplay/android-developer/answer/9857753)
* [YouTube API Services Required Minimum Functionality](https://developers.google.com/youtube/terms/required-minimum-functionality)
* [USPTO 2025 trademark fee changes (Reed Smith)](https://www.reedsmith.com/en/perspectives/2025/01/uspto-announces-trademark-fee-increases-effective)
* [EUIPO fee breakdown 2026](https://tmarkmetric.com/insights/eu-trademark-cost)
* [DMCA agent $6 fee, 3 year validity (Fenwick)](https://www.fenwick.com/insights/publications/copyright-alert-copyright-offices-new-electronic-system-for-designating-agents-under-the-dmca)
* [PROMOTE, Pacesetter, class 10](https://www.trademarkelite.com/trademark/trademark-detail/77036768/PROMOTE)
* [PROMOVE, abandoned](https://www.trademarkelite.com/trademark/trademark-detail/88862243/PROMOVE)
* [PROMOTE THE VOTE, abandoned](https://trademark.justia.com/887/74/promote-the-88774462.html)
* [Promova trademark owner](https://trademark.justia.com/owners/unlimited-promova-limited-6294651)
* [PROMOVOTE agency portfolio page (2014)](https://cargocollective.com/canary/PROMOVOTE)
* [GoGo Photo Contest "promo votes"](https://support.gogophotocontest.com/hc/en-us/articles/9072527057683)
* [Boost Mobile v Optus "Boost" dispute](https://www.smartcompany.com.au/?p=258996)
* [Instagram brand gradient](https://about.instagram.com/brand/gradient)
* [Game press kit usage terms example](https://gtstu.com/indie-game-press-kit/)

---

# Round 2 (2026-10-07)

Inputs: `docs/review/brief-r2.md`, screenshots `docs/review/screens-r2/01..19`, current code in `apps/mobile/src/` (`ui/PromoReel.tsx`, `lib/gate.tsx`, `app/(tabs)/me.tsx`, `app/sign-in.tsx`, `app/creator/[handle].tsx`, `lib/i18n.ts`, `lib/categories.ts`), `services/api/src/index.js`, `web/landing/public/delete-account.html` and the live page https://promovote.com/delete-account, `store/README.md`, `store/status.md`. Still not legal advice.

## R2.1 Scores

| # | Area | R1 | R2 | Evidence (one sentence) |
|---|---|---|---|---|
| 1 | Retention | 4 | 6 | Today's Drop plus calls that resolve in 7 days with a Scout Score give a real reason to return, but there is no reminder yet and only 3 real creators. |
| 2 | Session time | 5 | 6 | The 7 promo drop with an end card and "Keep watching" works, but the pool is too small to keep a long session going. |
| 3 | Originality | 6 | 8 | "For you" is gone, voting moved to a bottom call bar that becomes a ticket ("Called: Will blow up. Result Oct 14. Scout #1"), and story rings became rounded squares (screens 01, 07, 13). |
| 4 | Trademark and trade dress safety | 7 | 8 | No TikTok signature wording or rail elements remain, the logo chevron is reused as the call icon, "Open in App Store" replaced Apple's badge text, and the Google button now uses the official G and border. |
| 5 | **Trademark, trade dress and store policy safety (my domain)** | 5 | **7** | Report, Block, in-app contact, tappable legal links, honest delete flow, Android-only "Google Play soon" and the always-visible founder note are all fixed, but a few small store items remain (below). |

## R2.2 Round 1 store triggers, re-checked

| Round 1 trigger | Status | Evidence |
|---|---|---|
| No Report / Block (Apple 1.2, Play UGC) | **Fixed** | "More" sheet on every promo and on creator pages (screen 03); 7 report reasons in `PromoReel.tsx` lines 25 to 28; `api.block` used and blocked creators are hidden through `/v1/me/state` (`index.js` line 733). |
| No in-app contact | **Fixed** | "Help and legal" with Contact support, Terms, Privacy, Guidelines on Profile for guests and members (screens 09, 14). |
| Terms / Privacy not tappable | **Fixed** | Underlined links on sign in (screen 10). |
| "Zero tolerance" sentence in Terms (Apple 1.2 EULA) | **Open** | No match for "tolerance" or "objectionable" in `terms.html` or `guidelines.html`; only a general enforcement line (`guidelines.html` line 135). |
| Delete account hides errors | **Fixed** | `me.tsx` lines 44 to 53 show `delete_failed` or `delete_done` ("deleted in 30 days"). |
| Apple token revoke on delete (TN3194) | **Open (known)** | Listed as not done in the brief; needs a Sign in with Apple key. |
| Play account deletion web link | **Fixed, one wording bug** | Page is live, names the developer (Hazim Okutan), lists deleted and kept data, offers email deletion. But the in-app steps say "Tap Profile, tap Delete account". In the app, Delete account sits inside the "..." settings sheet (`me.tsx` line 63, screen 14). Google checks that the steps match. |
| "unlock perks" claim (2.3.1) | **Fixed** | `sign_in_p` is now "Watch free. Sign in to call promos, save them and follow creators." |
| "Google Play coming soon" on iOS (2.3.10) | **Fixed for the chip, one gap** | `PromoReel.tsx` line 121 and `creator/[handle].tsx` line 94 are Android only, and the feed maps `google_play` to "Open website". But the creator main button picker in Edit profile offers "Open in Google Play" (`lib/categories.ts` line 13, screen 16). If that label renders on an iOS creator page it names another mobile platform. |
| Founder disclosure hidden behind "more" | **Fixed** | "Made by the PromoVote founder" sits under the creator name on every founder promo (screen 01). Team picks note now says "The founder makes some of these promos." |
| "Download on the App Store" badge text | **Fixed** | "Open in App Store" (screen 06). |
| Fake Google "G" | **Fixed** | Official asset and #747775 border (`sign-in.tsx` lines 54, 111 to 113). |
| 2.1 blockers (silent taps, DOB overflow) | **Fixed** | Gate sheets answer every tap (screen 02); native date picker (`me.tsx` line 340). |
| "Ads" framing (3.2.2(iii), Play Made for Ads) | **Partly open** | App copy says promos and calls, which is good. The long store description is not written yet, and `about.html` (4 times) plus `app.js` still say "The social media of ads". |
| DMCA agent | **Open (P1)** | `copyright.html` line 34 still says "in progress". |

## R2.3 New findings in round 2

1. **Test creators are visible in production.** Explore shows "Test Studio" and "Pixel Fox" (screen 07), and screen 19 shows "Pixel Fox 9877" with a placeholder logo. If a reviewer sees them, that is placeholder content under Apple 2.1(a).
2. **Profile photos go live without review once R2 is on.** In `index.js` line 545, uploads are stored with `moderation_status = 'approved'`, and the comment on line 525 says "shown right away". Under Apple 1.2 the "filter" duty means a logo or banner from a brand new account should not be public before any check. This is harmless today because uploads return "not available yet". It becomes a problem the day the founder enables R2.
3. **No word filter on display name and bio.** The bio blocks links (line 451) and handles have a reserved list, but slurs or sexual words go live until someone reports them. This is acceptable for a first review only if you do item 2 and act on reports within 24 hours. A small blocklist is cheap.
4. **Report needs sign in.** A guest who taps Report gets the sign in sheet (`PromoReel.tsx` line 112). Apple usually accepts this. A "Report by email" fallback to support@ costs one line and removes the argument.
5. **Report reasons miss two that matter on a promo platform.** "Impersonation" and "trademark" already exist in the API (`REPORT_REASONS`) but not in the app list. Brand owners will need them.
6. **The founder note is hard to read on busy videos.** On Team picks (screen 06) the note and the "Picked by the PromoVote team" line sit on top of text in the video and become unreadable. FTC wants disclosures you can actually read: add a solid or blurred backing.
7. **The first chart is founder content.** Charts show "1 Breathe, visualize, rest" (Poleris, the founder's app) with no founder label (screen 07). Apply the same founder label on chart rows, or keep charts empty until the minimum vote threshold.
8. **Review notes point to the wrong delete path.** `store/status.md` line 61 should say where Delete account is: "Profile, tap the ... button at the top right, Delete account".

## R2.4 What still keeps my domain below 8 (smallest change first)

### P0 (before submitting build 5)

1. **Fix the delete-account steps on the page and in the review notes.** In `web/landing/public/delete-account.html` line 22, write: "Tap Profile, tap the ... button at the top right, tap Delete account and confirm." Make the same change in the review notes in `store/status.md` line 61. Done when: a reviewer following the page reaches the confirm dialog.
2. **Add the zero tolerance sentence.** Add one line to `terms.html` (user content section) and `guidelines.html` (enforcement): "PromoVote has zero tolerance for objectionable content and abusive users. We review reports within 24 hours and remove violating content and accounts." Done when: the line is live on promovote.com.
3. **Remove test accounts and test content from production D1** ("Test Studio", "Pixel Fox", any test promos and test votes that feed Charts), or mark them hidden. Done when: Explore and Charts show only real creators.
4. **Keep "Google Play" text off iOS everywhere.** In the creator page and the Edit profile picker, show the `google_play` main button as "Get the app" (or hide that option) when `Platform.OS === 'ios'` (`lib/categories.ts` line 13; the creator page CTA render). Done when: a text search of iOS screens finds no "Google Play".
5. **Write the long store description and keywords without "ads".** Use: trailers, promos, today's drop, make your call, creators. Done when: the App Store Connect and Play listing text contains no "ads".
6. **Apple token revocation.** The founder creates a Sign in with Apple key (Certificates, Identifiers and Profiles, Keys, about 10 minutes) and adds it as a Worker secret. The delete handler or the daily hard delete job then calls `appleid.apple.com/auth/revoke`. Detection risk at review is low, but it is an Apple requirement. If the key cannot be ready, submit build 5 and ship this in the next build. Do not leave it for later than that.

### P1 (before public launch or before R2 is enabled, whichever comes first)

1. **Before enabling R2,** store uploads as `pending` in `index.js` line 545. Show the monogram to everyone except the owner until a moderator approves, or until an automatic image safety check passes.
2. Add a small blocklist for display name and bio (same place as the bio link check, `index.js` line 451).
3. Add "Impersonation or trademark" to the app report reasons (`PromoReel.tsx` lines 25 to 28 and the creator page). Add "Report by email" for guests.
4. Give the founder note and the Team picks note a readable backing (screen 06). Add the founder label to chart rows.
5. Register the DMCA agent ($6) and remove the "in progress" sentence in `copyright.html` lines 34 and 75.
6. Change "The social media of ads" in `about.html` and `app.js` to wording a reviewer will not read as an ad app.
7. Filing plan unchanged from section 7: run the self search, pick the owning entity, file PROMOVOTE in classes 9, 42 and 35.

With P0 items 1 to 5 done, my domain score is **8**. Item 6 lifts it to 9.
