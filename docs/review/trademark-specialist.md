# Trademark, brand protection and App Store policy review

Reviewer: trademark and brand protection specialist, App Store policy specialist (second member of the legal team).
Date: 2026-10-07. Scope: name, logo, wording, layout, App Store Review Guidelines 1.2, 3.1, 3.2.2, 4.1, 5.2.

**This is not legal advice.** It is a structured risk screen based on public web sources. Before filing or launch, a US trademark attorney should run a full clearance search (USPTO, state, common law) and confirm the filing strategy.

## Method and limits

* Read: `docs/review/brief.md`, `apps/mobile/src/lib/i18n.ts`, `web/landing/public/favicon.svg`, `apps/mobile/assets/images/icon.png`, `apps/mobile/src/ui/Icon.tsx`, `apps/mobile/src/ui/PromoReel.tsx`, `apps/mobile/src/app/(tabs)/explore.tsx`, `services/api/src/index.js` (report and block routes), screenshots 01, 06, 07, 10.
* Web checks: Justia trademark mirror of USPTO records, Trademark Elite, App Store search API (iTunes Search, US storefront), handle URL probes, Apple's live App Review Guidelines page.
* Limits: the USPTO Trademark Center search, EUIPO eSearch and WIPO Global Brand Database are JavaScript apps that this environment cannot query directly, so those three were checked only through mirrors and web search. Handle probes for TikTok, Instagram, X, Twitch and Kick are not reliable (those sites return 200 or 404 for any name). Treat "no conflict found" below as "none found in public mirrors", not as clearance.

## Scores

| # | Area | Score | Evidence (one sentence) |
|---|------|-------|-------------------------|
| 1 | Retention | 5 | Nothing pulls a user back tomorrow yet (no notifications, profile is empty after signup, the "story" circles do not open any story), so return visits depend only on new promos. |
| 2 | Session time | 6 | The vertical feed holds attention, but taps on vote, save and share give no visible result (founder test item 3), which ends sessions early. |
| 3 | Originality | 6 | Full screen vertical video, right side icon rail, top "For you" tab and ringed avatar circles are the shared grammar of TikTok, Reels and Instagram; the labeled verdict buttons ("Will blow up" / "Not for me") and the "paying never buys a spot" copy are the only clearly own elements. |
| 4 | Trademark and trade dress safety | 7 | No PromoVote mark or app found and the logo is not close to any major logo, but the "For you" tab label borrows TikTok's best known feature name and the creator Poleris promo shows a "Calm" heading in a meditation app. |
| 5 | Domain: brand protection and App Store policy readiness | 5 | Report and Block exist in the API (`POST /v1/reports`, `blocks` table) and in i18n, but no screen exposes them, which is a likely Guideline 1.2 rejection; no trademark filed and handles not secured. |

Minimum average after the P0 and P1 items below: every row at 8 or higher from the trademark and policy point of view (retention and session rely on the product team's fixes, which I list only where they touch policy).

## 1. Name: PromoVote

### Findings

| Mark or name | Where | Owner | Status / goods | Risk to PromoVote |
|---|---|---|---|---|
| PROMOVOTE / PROMO VOTE | USPTO mirrors, web, App Store, Google | none found | none found | Name appears free |
| PROMOTE THE VOTE (SN 88774462) | USPTO | individual / org | Abandoned 2020, class 35 voting promotion | None (dead) |
| PROMOTE THE VOTE (SN 78291838) | USPTO | | Abandoned | None (dead) |
| PROMOVA (SN 97452167) | USPTO, App Store | Unlimited Promova Limited | Live, language learning app; ID also lists advertising and publicity services | Low to moderate: same first syllables "PROMO-V", class 9 app and a class 35 entry; different meaning, sound ends differently ("va" vs "vote"), different field (language learning). Most likely examiner citation if any. |
| PROMOTE (Reg. 2681537) | USPTO | Camlog Biotechnologies | Dental implants, class 10 | None (unrelated goods) |
| PROMOTE 2 EARN (SN 97493624) | USPTO | | promotional / earning services | Low |
| VOTEAPP (SN 90774555) | USPTO | | Voting SaaS, class 42 | Low (shared generic "vote") |
| VOTE (Reg. 7808934) | USPTO | Shandong Huayee | Trucks, class 12 | None |
| PromoBoost / PromoteBoost | web, Capterra | small SaaS | affiliate software | Low; but avoid naming any PromoVote feature "PromoBoost" |
| TikTok Promote | TikTok product feature | ByteDance | in-app ad boost tool | Low for the name; avoid the word "Promote" as a feature name |
| Promovoto Capacitaciones | App Store | Fersa Technologies (MX) | training app | Very low |
| ProxyVote | App Store | Broadridge | proxy voting | Very low |

### Assessment

* **No rename needed.** No identical or near identical live mark or app was found for PromoVote.
* **Weakness, not conflict:** "Promo" + "Vote" describes the service (people vote on promos). A USPTO examiner may issue a Section 2(e)(1) "merely descriptive" refusal for class 35 advertising services. Counter: the compound is a coined single word with no dictionary entry, which usually lands as "suggestive". Plan B is the Supplemental Register plus a design mark filing for the logo, which protects the brand look even if the word is held descriptive.
* Social handles: YouTube `@promovote` returned 404 (likely free). X, TikTok, Instagram, Twitch, Kick and Reddit could not be confirmed. Reserve them by hand this week.
* Domains: promovote.com owned. promovote.app not owned; it is cheap and blocks a squatter.

### Filing plan (for the attorney to confirm)

* Applicant: MIA PERA TRANSPORTATION LLC (owner of the brand today). If a new LLC is formed later, assign the mark with a written assignment.
* Marks: (1) word mark PROMOVOTE, standard characters; (2) the logo (ring plus double chevron), no color claim so it covers any color.
* Classes: 9 (downloadable mobile app), 35 (online advertising and promotion services; providing an online marketplace for advertisers and audiences), 42 (providing temporary use of non downloadable software; platform for sharing and rating video content). Optional 38 (streaming video) and 41 (entertainment, online rankings) later.
* Basis: 1(b) intent to use for class 9 until the app is public in the App Store; 1(a) use in commerce for 35 / 42 only if the attorney agrees the live waitlist site counts.
* Cost: USPTO base fee is $350 per class since 2025-01-18, plus $200 per class if free text IDs are used instead of ID Manual wording. Two marks in 3 classes, ID Manual wording only: about $2,100 in USPTO fees.
* International: the app ships in Spanish and Turkish. After the US filing, a Madrid Protocol extension to the EU (EUIPO) and Turkey within 6 months keeps the US priority date.

## 2. "For you" tab label

### Findings

* No USPTO registration or application for "FOR YOU" or "FOR YOU PAGE" owned by ByteDance or TikTok was found in public mirrors. An unrelated "FYP" application (SN 99913742, See You There LLC, filed 2026-06-30) exists. Many unrelated "FOR YOU" marks exist in other fields, which shows the phrase is diluted and hard for anyone to own alone.
* "For You" and "For You Page / FYP" are still strongly associated with TikTok in the public mind. Instagram, X and YouTube also use "For you", so legal risk of the two words alone is low.
* The bigger issues are not legal ownership but: (a) Guideline 4.1(a) asks apps not to make "minor changes to another app's name or UI"; a reviewer sees "For you" plus a vertical feed plus a right rail as a TikTok pattern; (b) it is **inaccurate**: the feed is a fair rotation (`public/feed.js`, `lib/fair-queue.ts`), not a personal recommendation, so "For you" overstates personalization; (c) it costs originality points.

### Recommendation

Rename the first tab in `apps/mobile/src/lib/i18n.ts` key `home_for_you` (and the web feed if it shows the same label):

| Option | en | es | tr | Why |
|---|---|---|---|---|
| **Recommended** | Lineup | En fila | Sıradakiler | Describes the fair rotation honestly; nobody owns it in social apps |
| Alt 1 | Up next | A continuación | Sıradaki | Generic, accurate |
| Alt 2 | Mix | Mezcla | Karışık | Short, neutral |
| Avoid | For you, FYP, Discover (Snapchat), Reels, Shorts, Spotlight | | | Platform feature names |

Note: Turkish "Keşfet" is already the Explore tab, so do not reuse it for the feed tab. Also rename the key itself (for example `home_lineup`) so the old label does not come back.

## 3. Logo: double up chevron in a gradient ring

Files: `web/landing/public/favicon.svg` (ring stroke `#ff5470` to `#8b5cff`, two lime `#c6ff3d` chevrons on `#14141f`), `apps/mobile/assets/images/icon.png` (same design).

| Compared with | Their mark | Similarity | Risk |
|---|---|---|---|
| Reddit | Snoo alien; upvote is a single outlined arrow, orange | Shared idea "up = vote" only | Low |
| Product Hunt | Orange circle with "P"; upvote is a single triangle | Circle shape only | Low |
| Twitch | Purple speech bubble "glitch" | Purple only | Very low |
| Kick | Neon green "KICK" wordmark on black (KICK, Kick Streaming Pty Ltd, filed 2024-07-31) | Neon green on black palette | Low; the lime plus near black palette is close to Kick's look, so never pair the lime with a blocky K style wordmark |
| Vimeo | Blue "V" | None | Very low |
| Instagram | Multi color gradient (yellow, orange, pink, purple) rounded square; story ring is the same gradient | Pink to violet gradient ring around a dark disc | **Moderate watch item.** Meta claims a "Spectrum Multi-Color Gradient Mark" and has opposed gradient app icons at the TTAB. PromoVote's two stop pink to violet ring, round not square, with a lime chevron, is different enough today. Keep it that way. |
| Military / gaming rank chevrons | Generic double chevron | High, but generic symbol | Low (no single owner) |

### Recommendations

* Keep the logo. It is not close to any one major mark.
* Do not add orange or yellow stops to the ring; keep two stops (pink, violet) so it never drifts toward Instagram's spectrum.
* Do not use the gradient ring around creator avatars. Today `explore.tsx` uses a lime ring (`styles.ring`, `borderColor: C.lime`), which is good. A pink to violet ring around avatars would read as an Instagram story ring.
* File the logo as a design mark (section 1).

## 4. Trade dress: vertical feed, right side rail, story rings

* **Law in short (US):** product and interface design is protected as trade dress only if it is non functional and has acquired distinctiveness (Wal-Mart v. Samara, 2000; TrafFix v. Marketing Displays, 2001). A vertical swipe feed and a side action rail are now industry standard on TikTok, Reels, Shorts and Snapchat Spotlight, which makes a successful trade dress claim against a small app unlikely. Snap and Instagram never registered "Stories". No court ruling found that protects the vertical feed layout itself (the Triller v. TikTok dispute was about a patent and was dropped in 2023).
* **Real risk is App Review 4.1 Copycats and brand perception**, not a lawsuit: "Don't simply copy the latest popular app ... or make some minor changes to another app's name or UI."
* **Specific to PromoVote:**
  * Right rail (screenshot 01): four round dark buttons with labels (Will blow up, Not for me, Save, Share). Labeled verdict words are already different from TikTok's heart / comment / share; keep the text labels always visible, they are the most distinctive element.
  * "Story" circles in Explore (screenshot 06): the code names them `story` and draws a ring, but tapping opens a creator, not a story. A ring means "unseen story" in Instagram grammar, so it looks borrowed and also misleads. Either drop the ring (plain avatar with a small category badge) or build real creator stories later.
  * Avoid copying exact TikTok details: no spinning record disc, no "+" follow badge on the avatar in the rail, no heart icon for voting, no Duet / Stitch names.

### Recommendations to own the layout

* Put the two verdict buttons in a bottom "verdict bar" (two wide pills side by side) instead of stacking them in the rail. Keep Save and Share in a slim rail. This single change makes a screenshot of PromoVote unmistakable and directly shows the product idea (voting).
* Show a small live result after a vote (for example "62% say Will blow up") as the brand signature. It is product feedback and also a distinct look.

## 5. App Store Review Guidelines

### 5.1 Guideline 3.1 and a monthly subscription for creator stories

Product decision recorded in `CLAUDE.md` and the brief: **no subscriptions**. I do not reopen it. For completeness, if a paid "creators can post stories" plan were ever offered:

* 3.1.1: unlocking a feature in the app (posting stories) must use Apple In-App Purchase. No Stripe link, no license code, no web purchase prompt inside the app (US storefront link out rules changed after the Epic ruling, but the app must still offer IAP and the founder chose IAP only).
* 3.1.2(a): an auto-renewable subscription must provide ongoing value, last at least 7 days, and work on all the user's devices. "Post stories" alone is thin; it would need ongoing service value (hosting, analytics, reach reports) to pass review comfortably.
* 3.1.2(a): users must get what they paid for "without performing additional tasks".
* 3.1.2(c) and Schedule 2: before purchase, show title, length, price per period, what is included, auto renew terms, links to Terms of Use (EULA) and Privacy Policy, a Restore Purchases button.
* Paid reach must never decide organic rank (already a decision: Boost is labeled Sponsored, separate slot). Keep it, also because of FTC endorsement rules.
* The one time paid extras that were decided (Boost, Trailer Test report, Pro analytics) are consumable or non consumable IAPs and follow 3.1.1 and 3.1.2(c) style disclosure anyway.

### 5.2 Guideline 1.2 user generated content (feed today, stories later)

Required for any app with UGC or social networking, and PromoVote has profiles, follows and creator posts:

| 1.2 requirement | Status in code | Gap |
|---|---|---|
| Filter objectionable material before it is posted | Uploads not open yet; ad review checklist exists (`.claude/skills/ad-review`) | Must be live (pre moderation queue or automated filter) before uploads or stories open |
| Report offensive content, timely response | API `POST /v1/reports` exists, i18n has `report` | **No Report button in `PromoReel.tsx` or `creator/[handle].tsx`.** P0 |
| Block abusive users | API checks `blocks` table, i18n has `block` | **No Block action in the UI.** P0 |
| Published contact information | hello@ and support@promovote.com exist | Not shown in the app. Add to Profile tab and App Store support URL. P0 |
| 1.2.1(a) creator apps: age gate by declared or verified age | DOB field in onboarding, 18+ | OK once the DOB overflow bug (screenshot 12) is fixed |
| No "hot or not" voting on real people | Votes are on promos | Keep votes on promos, never on a creator's face or body; write it into Community Guidelines |

Stories specific (when built): Report and Block must be reachable from the story viewer itself, expiring content must still be kept for moderation and legal holds for a set period, and the moderation SLA (for example 24 h) should be in the Community Guidelines.

### 5.3 Other guidelines that matter for an "ads as content" app

* **3.2.2(iii)**: "apps that are designed predominantly for the display of ads" are unacceptable. This is the single most important policy risk for PromoVote. Mitigation: in the App Store description, screenshots and review notes, describe the product as a discovery and voting community for games, apps and creators (user generated creator content under 1.2.1), not as an ad network. Never say "watch ads". Viewers are never paid (already decided), which helps.
* **2.1 App completeness**: buttons that do nothing (founder test item 3) are a common rejection reason. P0.
* **4.1(c) and 5.2.1**: do not use other companies' names or icons in the app icon, name, subtitle or screenshots. The current screenshot set shows creator promos that contain third party UI; acceptable as creator content, but the App Store marketing screenshots should use the founder's own creators only.
* **5.2.1 third party IP in creator content**: the Poleris promo (screenshot 06) shows a section titled **"Calm"** inside a meditation app. Calm.com, Inc. owns CALM marks for meditation apps (verify in the attorney search). Using "Calm" as a feature heading in a competing meditation app is a real risk for Poleris and a visible one on PromoVote. Rename that section in Poleris (for example "Unwind" or "Rest") and re-export the promo.
* **Upload attestation**: when uploads open, the creator must confirm they own or are licensed to use the trailer, music and marks shown, with a trademark and copyright complaint form (already planned at `/legal/trademark` in `docs/03-profiles-spec.md`).
* **4.8 Login**: Sign in with Apple is offered alongside Google. OK. **5.1.1(v)** account deletion is present. OK.

## 6. Prioritized changes

### P0 (before App Store submission)

1. **Report and Block in the UI.** Where: `apps/mobile/src/ui/PromoReel.tsx` (overflow "..." on each promo), `apps/mobile/src/app/creator/[handle].tsx` (header menu). Call existing `POST /v1/reports` and the block route. Why: Guideline 1.2. Done when: a reviewer account can report a promo and block a creator in two taps, a row lands in `reports` / `blocks`, and the blocked creator disappears from that viewer's feed.
2. **Rename the "For you" tab.** Where: `apps/mobile/src/lib/i18n.ts` key `home_for_you` (en, es, tr) and the tab id in `app/(tabs)/index.tsx`. Use "Lineup / En fila / Sıradakiler". Why: 4.1 copycat signal, TikTok association, and the label is inaccurate for a fair rotation. Done when: `grep -ri "for you\|para ti\|sana özel" apps/mobile/src web/landing/content` returns nothing.
3. **Contact info in the app.** Where: `app/(tabs)/me.tsx` (guest and signed in), plus App Store Connect support URL. Show support@promovote.com and links to Terms, Privacy, Community Guidelines. Why: 1.2. Done when: visible without signing in.
4. **Every tap gives feedback.** Where: `PromoReel.tsx` vote, save, share; replace the silent `router.push('/me')` with a sign in or finish onboarding sheet. Why: 2.1 completeness. Done when: on TestFlight each button shows a state change, a sheet or the share sheet.
5. **App Store copy framed as a creator discovery and voting community.** Where: App Store Connect description, subtitle, review notes, `store/README.md`. Why: 3.2.2(iii). Done when: the words "watch ads" and "ad network" do not appear; review notes explain creators, votes and moderation.

### P1 (before public launch)

6. **File USPTO applications** (word mark and logo, classes 9, 35, 42) through an attorney, applicant MIA PERA TRANSPORTATION LLC. Done when: serial numbers are recorded in `CLAUDE.md`.
7. **Reserve handles and promovote.app** (X, Instagram, TikTok, YouTube, Twitch, Kick, Reddit, Threads, Bluesky, Discord vanity). Done when: a list with owner email sits in `store/status.md` (no passwords).
8. **Remove the ring from Explore avatars or make it mean something.** Where: `explore.tsx` `styles.ring` and the `story` component. Why: Instagram story grammar without the story function. Done when: circles are plain avatars with a category badge, or open real stories.
9. **Verdict bar.** Move "Will blow up" and "Not for me" from the rail into a two button bar above the CTA in `PromoReel.tsx`; show a live split after voting. Why: originality and distinct trade dress. Done when: a blurred screenshot is still recognizable as PromoVote, not TikTok.
10. **Fix the "Calm" heading in the Poleris app promo** and re-export. Done when: the promo no longer shows "Calm" as a feature name.
11. **Upload rights attestation and trademark complaint form** live before uploads open.

### P2 (later)

12. Madrid Protocol extension to EU and Turkey within 6 months of the US filing.
13. Brand guideline page (logo clear space, two stop gradient only, lime never with a block K style wordmark) so future design work does not drift toward Instagram or Kick.
14. Clearance search for paid feature names before launch ("Trailer Test", "Boost" is descriptive and fine as a plain word but do not stylize it like Meta's "Boost post").
15. If stories are built: Report and Block inside the story viewer, retention of expired stories for moderation, published SLA.

## Sources

* [PROMOTE THE VOTE SN 88774462 (Justia)](https://trademark.justia.com/887/74/promote-the-88774462.html)
* [PROMOVA SN 97452167 (Justia)](https://trademark.justia.com/974/52/promova-97452167.html)
* [PROMOTE Reg. 2681537 (Trademark Elite)](https://www.trademarkelite.com/trademark/trademark-detail/75787337/PROMOTE)
* [VOTE Reg. 7808934 (Trademark Elite)](https://www.trademarkelite.com/trademark/trademark-detail/98732096/VOTE)
* [VOTEAPP SN 90774555 (Justia)](https://trademarks.justia.com/907/74/voteapp-90774555.html)
* [PROMOTE 2 EARN (Justia)](https://trademarks.justia.com/974/93/promote-2-97493624.html)
* [FYP SN 99913742 (Justia)](https://trademarks.justia.com/999/13/fyp-99913742.html)
* [ByteDance trademarks list (Justia)](https://trademark.justia.com/owners/bytedance-ltd-3667179)
* [TikTok Ltd trademarks list (Justia)](https://trademark.justia.com/owners/tiktok-ltd-4488235)
* [Kick Streaming Pty Ltd trademarks (Justia)](https://trademark.justia.com/owners/kick-streaming-pty-ltd-6102955)
* [PRODUCT HUNT registration (Justia)](https://trademarks.justia.com/869/56/product-86956229.html)
* [Instagram TTAB opposition against a gradient design (Law Street Media)](https://lawstreetmedia.com/?p=10194)
* [What's the story with Stories (DuetsBlog)](https://www.duetsblog.com/2016/08/articles/patents/whats-the-story-with-stories/)
* [Triller v. TikTok (TechCrunch)](https://techcrunch.com/2020/07/30/triller-sues-tiktok-over-patent-infringement/)
* [About Promote on TikTok](https://ads.tiktok.com/resources/help/article/about-promote-on-tiktok)
* [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
* [New USPTO trademark fees effective 2025-01-18 (Fish & Richardson)](https://www.fr.com/insights/thought-leadership/blogs/new-uspto-trademark-fees-go-into-effect-january-18-2025/)
* App Store search: iTunes Search API, US storefront, terms "promovote" and "promova" (run 2026-10-07).

## Round 2 (2026-10-07)

This is still not legal advice. I checked `docs/review/brief-r2.md`, `apps/mobile/src/lib/i18n.ts` (en, es, tr), `apps/mobile/src/app/sign-in.tsx`, `apps/mobile/src/app/(tabs)/explore.tsx`, screenshots `docs/review/screens-r2/01, 03, 07, 09, 10, 13`, `store/README.md`, and the live API (`GET /v1/explore`, `GET /v1/creators`).

### What I verified

| Round 1 item | Round 2 status | Evidence |
|---|---|---|
| "For you" tab | Fixed | No "For you", "Para ti" or "Sana özel" label left in `i18n.ts`. Tabs: Today's Drop / New / Team picks (es: Drop de hoy / Nuevo / Elegidos, tr: Bugünün seçkisi / Yeni / Ekibin seçimi). The empty Top tab is gone. |
| New tab names | Clear | "Today's Drop", "Team picks", "Called it", "Scout Score" are ordinary words that nobody owns in this field; I found no live US mark "TODAY'S DROP" or "DAILY DROP" for apps (only an unrelated UK "The Sunday Drop"). Low risk. Do not stylize "Drop" like a sneaker brand's drop calendar. |
| Story rings | Fixed | `explore.tsx` now draws `Avatar ... radius={18}` (rounded squares, no ring). Screenshot 07 confirms. |
| Report and Block | Fixed | Screenshot 03: "More" sheet with Report and "Block @handle"; brief says 7 report reasons and blocked creators disappear. Meets Guideline 1.2 report and block. |
| Contact info | Fixed | Screenshot 09: "Help and legal" with Contact support, Terms of Use, Privacy Policy, Community Guidelines, visible to guests. Sign in has tappable Terms and Privacy (screenshot 10). `promovote.com/delete-account` returns 200. |
| Sign in buttons | Good | Apple uses the official `AppleAuthenticationButton` (CONTINUE, WHITE). Google uses the branding spec (white, `#747775` border, standard G image, "Continue with Google"). The web screenshot only shows email, which is expected on web. |
| Vote layout | Much more original | Screenshot 01 and 13: bottom call bar (Not for me / Will blow up with the logo chevron) turning into a ticket "Called: Will blow up. Result Oct 14. Scout #1". This is now the product's signature and does not exist on TikTok, Reels or Product Hunt. |
| "Unlock perks" | Removed | Sign in copy now "Sign in to call promos, save them and follow creators." |
| Store framing (3.2.2(iii)) | Partly | Short description in `store/README.md` line 46 is good ("Discover, vote and rank the best game trailers and app promos."). Long description and App Review notes are not written yet. |
| "Calm" in Poleris promo | **Not fixed** | Live `GET /v1/explore` returns promo slug `poleris-calm`, description "The Calm tab: box breathing and guided meditations", tag `calm`; the video shows a "Calm" header and a "CALM" nav tab. In screenshot 07 it is the #1 Charts card and the first Explore tile. |
| "Open in App Store" | Small wording issue | Apple's App Store Marketing Guidelines say to write "the App Store" (with "the"), never translate "App Store", never use it as a verb. "Open in App Store" misses "the". Spanish "Abrir en App Store" also misses the article ("en el App Store"). Turkish "App Store'da aç" is fine. "Open in Google Play" is fine. |
| Trademark filing and handles | Not done | No serial numbers in `CLAUDE.md`; handles not listed in `store/status.md`. |

Two smaller watch items:
* The 7 progress segments at the top of Today's Drop (screenshot 01) look like Instagram Stories progress bars. A segmented progress bar is functional and not protectable on its own, so legal risk is low, but combined with a 7 item daily sequence it reads as "Stories". Optional: use a numbered counter ("3 / 7") or a ticket stub row in the lime brand color instead of thin white bars.
* Screenshot 07 shows "Test Studio" and "Pixel F..." creators. The live `GET /v1/creators` returns only the 3 founder creators, so this is the test environment. Keep test accounts out of production (Guideline 2.1 placeholder content).

### Scores, round 2

| # | Area | R1 | R2 | Evidence |
|---|---|---|---|---|
| 1 | Retention | 5 | 7 | A daily drop plus calls that resolve in 7 days give a real reason to come back, but there is no reminder notification or streak yet, so the return depends on memory. |
| 2 | Session time | 6 | 8 | Every tap now answers (gate sheet, haptics, toasts), the 7 promo drop has a clear end card and "Keep watching" continues into the rotation. |
| 3 | Originality | 6 | 8 | The call bar and ticket, Today's Drop, Team picks and rounded square creator tiles make a screenshot recognizable as PromoVote; the remaining borrowed pieces are the right rail and story-like progress bars. |
| 4 | Trademark and trade dress safety | 7 | 8 | "For you" and story rings are gone and the new labels are clear, but the "Calm" promo is still live and featured. |
| 5 | Brand protection and App Store readiness | 5 | 8 | Report, Block, contact links, delete account page and official sign in buttons now meet Guidelines 1.2, 4.8 and 5.1.1(v); the US filing, handle reservations and App Review notes are still open. |

Only Retention stays below 8. It is mainly a product item, listed below because the fix also touches policy (notification permission wording).

### Remaining items (smallest first)

**P0 (before App Store submission)**
1. **Fix the "Calm" promo.** Rename the section in the Poleris app (for example "Unwind" or "Rest"), re-export the video and poster, and in `web/landing/content/promos.json` change slug `poleris-calm`, the description "The Calm tab" and the tag `calm` (lowercase `#calm` as a plain hashtag word is fine, but not as the name of a tab). Then run `python3 web/landing/build.py`, regenerate the seed with `services/api/scripts/gen-seed-sql.py`, deploy, and confirm that `GET /v1/explore` no longer contains "Calm tab". Why: Guideline 5.2.1 and Calm.com, Inc.'s CALM marks for meditation apps. It is the top Charts card, so a reviewer sees it first.
2. **Write the App Review notes and long description** in `store/README.md` (then App Store Connect): "a community where scouts discover and call game trailers, app promos and creator videos; creators are verified; Report and Block on every promo; reviewer account email and fixed code". Avoid "watch ads", "ad network", "For you". Why: Guideline 3.2.2(iii). Done when the text is in App Store Connect and has none of those words.

**P1 (before public launch)**
3. **"Open in the App Store".** In `apps/mobile/src/lib/i18n.ts` set `cta_app_store` to "Open in the App Store" (en) and "Abrir en el App Store" (es); keep tr. Same on the website if the label is there. Why: Apple App Store Marketing Guidelines.
4. **Daily reminder (retention to 8).** Local notification "Today's Drop is ready" plus "Your call on X resolved" (already planned in the brief). Ask permission after the first drop end card, not at launch, with plain wording. Done when Day 1 to Day 7 return can be measured.
5. **File the US trademarks** (word PROMOVOTE and the logo, classes 9, 35, 42) and **reserve handles plus promovote.app**, as in round 1 items 6 and 7. Record serial numbers in `CLAUDE.md` and the handle list in `store/status.md` (no passwords).
6. **Optional originality polish:** replace the white segmented bars on Today's Drop with a numbered counter or lime ticket stubs (`apps/mobile/src/app/(tabs)/index.tsx`).

Sources added in round 2: [Apple App Store Marketing Guidelines](https://developer.apple.com/app-store/marketing/guidelines/), [UK IPO journal, The Sunday Drop UK00004354196](https://www.ipo.gov.uk/t-tmj/tm-journals/2026-013/UK00004354196.html), live API responses from `api.promovote.com` (2026-10-07).

## Round 3 (2026-10-07, night)

This is still not legal advice. I checked `docs/review/brief-r3.md`, `apps/mobile/src/lib/i18n.ts` (en, es, tr), `apps/mobile/src/lib/categories.ts`, `apps/mobile/src/ui/Icon.tsx`, `apps/mobile/src/lib/theme.ts`, `apps/mobile/assets/fonts/` (Bricolage Grotesque with `OFL.txt`), `services/api/src/index.js` (staff name guard, report reasons, UTM), `services/api/migrations/0003_seed_launch.sql`, `web/landing/content/promos.json`, `web/landing/public/index.html` and `about.html`, `store/README.md`, `store/status.md`, and all 18 images in `docs/review/screens-r3/`. Founder context respected: trademark filing is decided later, and the "Calm" rename is a pending founder action.

### What I verified

| Item | Round 3 status | Evidence |
|---|---|---|
| "Open in the App Store" | Fixed | `i18n.ts` line 12 "Open in the App Store", line 78 "Abrir en el App Store", tr unchanged; screenshot 04 shows the button. Matches Apple Marketing Guidelines. |
| Google Play on iOS | Fixed | `categories.ts` `ctaVisible` hides `google_play` on iOS; the "Google Play coming soon" line in `creator/[handle].tsx` renders only on Android. Removes a 2.3.10 (other platforms in metadata) risk on iOS. |
| Report reasons | Better | Screenshot 03 lists "Pretending to be someone else", "Harmful link", "Copyright", "Uses my brand or trademark"; API `REPORT_REASONS` includes `trademark` and `impersonation`. This gives brand owners an in app path, which helps 5.2.1 and later DMCA style handling. |
| Staff impersonation | Fixed | `STAFF_NAME` regex in `services/api/src/index.js` blocks "PromoVote", "admin", "moderator", "official support" and similar in names (unless verified) and bios. Protects our own mark from look alike accounts. |
| Tagline | Fixed | "The social network for promos" on `about.html`; "The social media of ads" is gone from app and site. Less 3.2.2(iii) "ads app" signal. |
| Brand font | OK | Bricolage Grotesque is SIL OFL 1.1 and `OFL.txt` ships beside it. OFL allows bundling in a commercial app; only the font name cannot be reused for a modified font. No risk. |
| Logo and ring colors | OK | Pink and violet appear only in `theme.ts` tokens and the logo (screenshot 08); no creator avatar uses the gradient ring. Creator tiles stay rounded squares (screenshots 05, 06). Instagram distance kept. |
| Verified badge | OK, watch | `Icon.tsx` uses SF Symbol `checkmark.seal.fill` on iOS and Material `verified` elsewhere, in lime (screenshot 06). Both are licensed system icon sets and the seal with check is a generic shape. Do not recolor it blue, which is the Meta / X look. SF Symbols may not be used in the app icon or store marketing art. |
| Disclosure of founder content | Good | "Made by the PromoVote founder" under each founder creator and the Team picks note "Never paid. The founder makes some of these promos" (screenshot 04). Good for FTC style honesty and for review. |
| Gifts | OK | Screenshot 17: "Gifts never depend on your calls or follows." Codes are the creator's own (LIVES20 is local test data). No third party marks in the gift UI. |
| Today's Drop progress | Improved | The segment bar now fills in lime on dark grey (screenshots 01, 11), which reads less like white Instagram Stories bars. Optional item from round 2 is effectively closed. |
| Third party store names | OK | "Wishlist on Steam", "View on Etsy", "Open on itch.io", "Open in Google Play" are plain nominative text with no logos. Fine. Do not add their badges without following each brand's badge rules. |
| "Calm" promo | **Not fixed (founder action pending)** | `promos.json` lines 146 to 156 still have slug `poleris-calm` and "The Calm tab"; seed `0003_seed_launch.sql` lines 125 and 131 the same; `index.html` line 673 serves it on the website; screenshot 05 shows the "Calm" heading as the first Explore tile. |
| App Review notes and long description | **Not written** | `store/README.md` still says "Ekran görüntüleri ve açıklama metni için şimdilik dur". Worse, its facts are now stale: "Uygulama içi satın alma var (consumable: Boost ve Trailer Test). Abonelik yok." and "Kullanıcı video yükleyebilir (moderasyonlu)", while v1 is fully free, Pro is planned for v1.1 and uploads are not open. If desktop Claude copies these into App Store Connect, the metadata will not match the build (Guideline 2.3.1 accurate metadata, 2.1 completeness). |
| Trademark filing, handles, promovote.app | Not done (founder decides later) | No serial numbers in `CLAUDE.md`; `store/status.md` has no handle list. |

Small note: `drop_fresh` "{n} new for you today" uses the words "for you" inside a sentence. That is ordinary English and not a tab label, so it is fine. Keep "For you" out of any tab or section name.

### Scores, round 3

| # | Area | R2 | R3 | Evidence (one sentence) |
|---|---|---|---|---|
| 1 | Retention | 7 | 8 | The 18:00 local reminder offered after the first finished drop, the forgiving weekly streak with saved weeks, and the one time "You called it" reveal (screenshots 13, 14) give three concrete reasons to come back. |
| 2 | Session time | 8 | 8 | Swipe between home tabs and the creator player (screenshot 07, "1 / 11") add depth after the drop, but with 3 creators a session still runs out of new content fast. |
| 3 | Originality | 8 | 8 | Call bar, ticket with outcome, Results with accuracy, gift card with dashed code and the Bricolage display type now look like one brand; the right rail of round icons is still the shared short video grammar. |
| 4 | Trademark and trade dress safety | 8 | 8 | Staff name guard, trademark report reason, no gradient avatar rings and correct "the App Store" wording are all good, but the "Calm" promo is still live and still the first Explore tile, so I cannot raise this to 9. |
| 5 | Brand protection and App Store readiness | 8 | 8 | Report, Block, contact, delete account and Google Play hidden on iOS meet 1.2, 2.3.10, 4.8 and 5.1.1(v); App Review notes and the long description are still missing and the store brief now contains facts that contradict the v1 build. |

No row is below 8. Two items keep rows 4 and 5 from moving up and, in my view, should be closed before the first App Store submission because they are the cheapest way to avoid a rejection or a demand letter.

### Remaining items (smallest first)

**P0 (before App Store submission)**
1. **Correct the store brief facts.** In `store/README.md` (BİLGİLER block): change the IAP line to "v1: no in app purchases, no subscriptions (Pro subscription planned for v1.1)", change the upload line to "Creators cannot upload in v1; the team posts promos sent by email. Report and Block on every promo, account deletion in app." Why: Guideline 2.3.1 and App Privacy answers must match the build. Done when desktop Claude cannot copy a stale claim into App Store Connect. Text only, five minutes.
2. **Write the App Review notes and long description** (round 2 item 2, still open). Put the draft in `store/README.md` as its own block: "PromoVote is a community where scouts discover game trailers, app promos and creator videos and call which ones will blow up. Calls resolve in 7 days and build a reputation score with no cash value. Creators are separate accounts and cannot vote. All promos in this build are posted by the founder's three studios, marked 'Made by the PromoVote founder'. Report and Block are under More on every promo. Review account: review@promovote.com, tap Continue with email, code in the review field." Avoid "watch ads", "ad network", "For you", "earn". Why: 3.2.2(iii) and 2.1. Done when the text is in App Store Connect.
3. **"Calm" rename (founder action).** Rename the section in the Poleris app, re-export `poleris-calm` and `poleris-calm-tr` (video and poster), then in `web/landing/content/promos.json` change the slug and "The Calm tab" / "La pestaña Calma" / "Sakinlik sekmesi", run `python3 web/landing/build.py`, regenerate the seed with `services/api/scripts/gen-seed-sql.py` (new migration, do not edit 0003), deploy the site and API, and confirm `GET /v1/explore` and promovote.com contain no "Calm tab". Lowercase `#calm` as a hashtag is fine. Why: 5.2.1 and Calm.com, Inc.'s CALM marks for meditation apps; it is the first Explore tile a reviewer sees. Interim option if the re-export takes time: set the two promos to not live so they leave Explore and the drop pool. This is the only item holding row 4 at 8.

**P1 (before public launch)**
4. **Reserve handles and promovote.app.** This does not need the filing decision and costs almost nothing: X, Instagram, TikTok, YouTube, Threads, Bluesky, Reddit, Twitch, Kick, Discord vanity. Record names and owner email in `store/status.md` (no passwords).
5. **US filing when the founder decides** (word PROMOVOTE and the logo, classes 9, 35, 42, applicant MIA PERA TRANSPORTATION LLC). Practical point: once the app is public in the App Store, other people can see the name and file first in other countries; the US first use date is still on our side, but a 1(b) filing before public launch is the cheapest insurance. Not legal advice; an attorney should confirm.
6. **Brand guide note** (round 1 item 13): lime verified seal never blue, two stop gradient only on the logo, the Pro story ring stays a solid lime arc (already a founder rule). One short section in `docs/` is enough.

Gaps that only real users or content can close: session time beyond 8 needs more creators than the 3 founder studios, and the Charts screen (screenshot 05, "So far: 3") stays empty until real scouts call. Neither is a trademark issue, but a reviewer seeing only founder content plus an empty chart is another reason the App Review notes in item 2 must explain it plainly.
