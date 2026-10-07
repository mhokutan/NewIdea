# Mobile Product Design review (2026-10-07)

Reviewer: Mobile Product Design lead. Domain score: **Visual design and UX quality**.
Inputs: all 13 screenshots in `docs/review/screens/`, the code in `apps/mobile/src/`, `services/api/src/index.js`, `docs/03-profiles-spec.md`, the project design skills (design-taste-frontend, high-end-visual-design, redesign-existing-projects, web-design-guidelines, design-references) and five brand references: `spotify` (dark media app), `pinterest` (discovery grid and social), `playstation` (games store), `airbnb` (host profile and onboarding forms), `x.ai` (near black canvas). Patterns borrowed, nothing copied.

## Scores

| # | Area | Score | Evidence (one sentence) |
|---|------|-------|-------------------------|
| 1 | Retention | 4/10 | Nothing pulls a user back tomorrow: no "called it" result, no saved list, no streak, no perk wallet, and the profile after signup is a name plus Sign out (screen 13). |
| 2 | Session time | 5/10 | The fair rotation feed never ends and video plays well, but dead taps on vote/save break the loop, there is no path from a promo into more of that creator except a small avatar link, and Top is a black screen with one sentence (screen 04). |
| 3 | Originality | 4/10 | Full screen vertical video + right rail of round icon buttons + bottom left avatar/title/"more" + "For you" tab + lime story rings on Explore is the TikTok/Reels/Instagram layout; only the vote labels are PromoVote's own. |
| 4 | Trademark and trade dress safety | 6/10 | Name, logo and colors are clean, but "For you" is TikTok's signature tab name and, combined with the right rail and story circle rings, the overall look moves closer to TikTok and Instagram trade dress than it needs to. |
| 5 | Visual design and UX quality | 4/10 | Basic dark system is coherent, but there are P0 UX bugs (silent taps, DOB overflow, expanded caption that hides the creator name on light videos, screen 02), the creator page lacks almost everything a creator needs, and onboarding ends on an empty screen. |

Not legal advice on item 4.

## What I saw, screen by screen

**Feed (01, 02, 03, 05)**
* Overlay legibility depends on the video. On the white Nicheable poster the creator name disappears when expanded and the title overlaps the poster (02). The shade is a 34% / 70% linear gradient (`ui/PromoReel.tsx` `shade`, `shadeOpen`) that is too weak over bright frames, and on web it may not render at all (`experimental_backgroundImage`).
* The right rail sits at `bottom: 110` and collides with the caption block and the CTA zone. Rail labels are 11 px white with a 2 px shadow; "Will blow up" and "Not for me" are hard to read over light frames (01) and over the video's own text (03, 05, where the label overlaps "4 min").
* Text stack competes with the video's own burned in text: the video headline plus our title plus our description plus the CTA plus the rail labels gives five text layers (03, 05). The "Picked by the PromoVote team" note sits directly on top of the video's headline (05).
* The CTA ("Visit the shop", "Download on the App Store") is a ghost button with the same weight as the rail. It should be the one strong action besides the vote.
* No tap feedback anywhere: `RailButton` has no pressed style, no haptic, no animation, no count. When the user is not an onboarded Scout, `needAccount()` calls `router.push('/me')`, which with NativeTabs does nothing visible. Creators tapping vote get the same silence (they cannot vote, but nobody tells them).
* Vote state mismatch: the UI lets you switch between Will blow up and Not for me, but `POST /v1/calls` is insert or ignore and returns 409 on a second vote, and the client swallows the error. The screen then lies about the stored vote.
* Share: `Share.share` is called correctly; on device it reportedly does nothing. With no pressed state the user cannot tell if the tap registered. Needs a device check (see P0.1).

**Top empty state (04)**: a black screen with one centered sentence. It looks broken, not intentional.

**Explore (06)**: good structure (story circles, category pills, hashtags, masonry). Problems: tile caption shade does not draw, so creator name and title sit unreadable on top of the video's own UI text; all three story rings are the same lime ring, which reads as "Instagram stories" and carries no meaning; three chip rows stacked (circles, categories, hashtags) push the grid below the fold.

**Creator page (07, 08)**: the strongest screen. Banner is a blurred poster, square avatar, verified check, follow, bio, a "Coming soon" chip that looks like a tappable button but is not. Missing versus `docs/03-profiles-spec.md` section 3.2: links row (none rendered for Hauling Empire), stats row, perks callout, Notify me CTA for an unreleased game, tabs (Promos, Rankings, About), titles on promo tiles, and for the owner an **Edit profile** entry (when `viewer.isMe` the follow button just vanishes and nothing replaces it). Duration label `0:${seconds}` breaks for promos of 60 s or more (paid uploads up to 60 s).

**Guest profile (09)**: one card, then a black screen. No preview of what you get (Called it history, saved, perks).

**Sign in (10)**: no brand mark, top half empty, title and copy only. On iOS the Apple button appears; the composition still looks unfinished.

**Onboarding (11, 12)**: type choice uses the heading "Join PromoVote" again; cards have no icon, no example, no visual difference. The form is one long page: username, display name (empty even though Apple gave us a name), DOB as three text fields (overflows on web: RN Web TextInput has an intrinsic width so `flex: 1` cannot shrink it; YYYY is cut off), category pills, a checkbox, a disabled button that is a dimmed lime with black text (looks enabled), and a gray Cancel. No progress, no avatar, no bio, no link. After submit the user lands on screen 13.

**Account after signup (13)**: name, handle, Sign out, Delete account. This is the founder's "everything is missing".

## Brand reference comparison (patterns to borrow, not copy)

| Reference | Pattern worth borrowing | Where in PromoVote |
|-----------|-------------------------|--------------------|
| Spotify (dark media) | Content first darkness: UI is achromatic, one functional accent. Pill and circle geometry for touch. Dense, app like spacing, not marketing whitespace. | Keep lime strictly for "your call" and the primary action. Today lime is used for avatars, rings, tabs, chips, verified icon, and buttons, so it means nothing. |
| Pinterest (discovery) | The image is the card: no padding, one overlay pill anchored to a corner, avatar + name at bottom left of the tile. Active filter chip flips fully inverted. Two radius system. | Explore tiles: replace the failing two line caption with one corner pill ("Game", "Perk", "New") and a small creator row under the tile, not on top of the video UI. |
| PlayStation (games store) | Imagery does 60 to 90% of the work, copy lives in a small editorial slot; one commerce color reserved for store actions only; game tile = key art + title + platform tag. | Feed CTA gets its own reserved style (filled, store specific), separate from vote and rail. Creator promo tiles get title + platform tag. Platform chips derived from verified links. |
| Airbnb (host profile, forms) | Host card: avatar, name, badge, one trust stat, one action. Stepwise account flow with one question per screen and a sticky bottom primary button. Rating display card as a hero stat. | Creator header stats row and perk card; onboarding as 3 short steps with a sticky Continue. Scout "Called it" number as the hero stat on the scout profile. |
| x.ai (near black canvas) | White hairline pill outlines on near black, tracked mono captions for metadata. | Metadata (duration, "pending", "resolves Sunday") in a small tracked caption style to separate system info from creator copy. |

## How to make it look like PromoVote, not a TikTok skin

The product's unique verb is **calling it**. Make the call the visual identity.

1. **Replace the right rail of four circles with a "Call bar".** One wide two sided control at the bottom, above the caption: left half "Not for me", right half "Will blow up", with the double up chevron from the logo on the right half. Save and Share become two small icons at the top right of the caption block. No other app has a split call bar; it is one handed (thumb zone) and makes voting the main act instead of liking.
2. **The "called" moment.** After a call: the bar morphs into a ticket chip "Called at #37 of 112 scouts, result Sunday" with a short spring and a light haptic. The ticket shape (notched corners) becomes a brand motif used again for perks and on the scout profile.
3. **Gradient ring means something.** The pink to violet ring from the logo goes only around creators with a live perk or a new drop this week. No ring otherwise. This replaces the generic lime story ring and is meaningful, not decorative.
4. **Brand type.** Use the website's display face (Bricolage Grotesque) for titles, creator names and numbers via `expo-font`; keep the system face for body. Tabular numbers for counts.
5. **Rename the home tabs.** "For you" to "Drop" (the fair rotation is literally a drop of every creator), keep "New", rename "Top" to "Charts" (matches Explore spec), keep "Featured" as "Team picks". This removes the most recognizable TikTok string.
6. **Lime discipline.** Lime only for: your call, primary button, active tab marker. Avatars without a picture get a neutral surface with the brand gradient letter, not a lime block.

## Horizontal swipe: what it should do

* **Swipe left / right on the feed = move between home tabs** (Drop, New, Charts, Team picks) with a pager (`react-native-pager-view` or a Reanimated horizontal pager; gesture handler and Reanimated are already in `package.json`). The tab indicator follows the finger. This is the founder's expectation and is a common, non distinctive pattern.
* **Swipe left on the creator row or tap it = open the creator page** as a push with native back swipe. Do not make full screen swipe left open the profile (that is TikTok's signature gesture).
* **Do not map votes to swipes.** Accidental horizontal flicks would create votes, which breaks "Skip is free" and pollutes the data the Charts depend on; swipe to judge cards also has a patent and litigation history (Match Group). Not legal advice.
* Edge swipe back on the creator page and sign in stays native.

## Prioritized changes (minimum to reach 8 on every score)

### P0: before App Store submission

**P0.1 Every tap answers within 100 ms** (Visual/UX, Session, Retention)
* What: `RailButton` (or the new Call bar) gets a pressed scale 0.92 + `expo-haptics` light impact, an animated filled state, and a count once data exists. Replace `needAccount()` in `ui/PromoReel.tsx` and `toggleFollow` in `app/creator/[handle].tsx` with a bottom sheet: guest gets "Sign in to call it" with Apple/Google buttons inline; signed in but not onboarded gets "Finish your profile (30 s)" that opens onboarding as a modal route (`app/onboarding.tsx`, presentation modal), then returns to the same promo and applies the pending action; creator gets "Creators cannot vote. Scouts call the hits." Lock the vote after the first call and show a 3 s Undo snackbar before sending, matching the server's one vote rule; surface 409 and network errors as a toast.
* Share: verify on device; pass `{ message, url }` (iOS uses `url` for the link preview), show pressed state, and log the `Share.share` result. If it still fails inside the paged FlatList, call it after `requestAnimationFrame`.
* Done when: on TestFlight, tapping each of vote, save, share, follow as guest, as un-onboarded user, as creator and as scout always shows a visible response in under 100 ms (screen recording at 60 fps), and no vote state disagrees with `GET /v1/me` data.

**P0.2 Onboarding: Apple sign in to a finished profile in 3 short steps** (Visual/UX, Retention)
* What: move onboarding out of `app/(tabs)/me.tsx` into its own modal stack. Step 1 "How will you use PromoVote": two large cards with an icon and one example each (Scout: "Call hits before they blow up"; Creator: "Post promos for your game, app or shop"). Step 2 "You": display name prefilled from Apple/Google, handle suggested from the name and checked live, DOB as one native date picker field (`@react-native-community/datetimepicker`, spinner on iOS) which also fixes the screen 12 overflow; 18+ and terms in one line under the button. Step 3 creator only: logo (required), banner (optional), category, one main link (website/App Store/Steam/Etsy). Sticky bottom Continue button; disabled state as a gray surface, not dim lime. Progress dots at top. Finish lands on the user's own profile with a "Complete your page" checklist (logo, banner, bio, links, first promo, first perk), not on the Sign out screen.
* Interim fix if the stack takes longer: on the current DOB row add `minWidth: 0` (and `width: 0` with `flex`) on each TextInput.
* Done when: a fresh Apple account reaches a filled profile in under 60 s and under 8 taps, nothing overflows at 320 pt width or at the largest Dynamic Type size.

**P0.3 Own profile is a real page, with Edit profile** (Visual/UX, Retention)
* What: `Account` in `app/(tabs)/me.tsx` renders the same layout as the public creator page for creators (header, stats, links, perks, promos) with an "Edit profile" and "Share page" pair where Follow would be. Edit profile screen: logo, banner, display name, bio (600 chars, no links, the server already enforces it), links (max 8, one per platform, website max 2, per spec 3.2.3), category. Account settings (language, email preferences, Sign out, Delete account) move behind a gear icon. Scout profile: Scout Score block (provisional), tabs Called it, Saved, Following, with honest empty states.
* API gap (for the CTO): `PATCH /v1/me` only takes displayName, bio, language and email flags. Needed: media upload for avatar/banner (R2, `media_assets` table already exists), CRUD for `profile_links` (table exists), and perks (spec says P0).
* Done when: the founder can set logo, banner, bio, website and a link from the phone and see them on `/creator/<handle>` and on promovote.com.

**P0.4 Feed overlay clarity** (Visual/UX, Originality)
* What in `ui/PromoReel.tsx`: stronger bottom scrim (solid 0.85 at the bottom 15%, eased to 0 at 45%) drawn with `expo-linear-gradient` so it works on every platform; expanded details open as a bottom sheet over a dimmed video, not as a taller text stack over the frame; caption block max 3 lines collapsed (creator row, title, one line description); move the rail up so it never overlaps the caption or CTA; rail labels 12 pt semibold with a real backing; the Team picks note goes into the tab label area, not on the video. CTA becomes a filled pill in a reserved commerce style.
* Done when: on all 13 seed promos (light and dark frames) the creator name, title, CTA and labels pass 4.5:1 contrast against the frame behind them, checked with screenshots.

**P0.5 Empty states that look intentional** (Visual/UX, Session)
* What: one shared `EmptyState` component (icon or illustration, title, one line, one action). Top/Charts: "Charts open when scouts start calling. Paying never buys a spot." + button "Start calling in New" that switches tab. Featured: "No team picks this week yet" + "Back to Drop". Explore no results: "No promos for #tag yet" + clear filter. Creator with no promos (owner): "Post your first promo" (or "Uploads open soon"). Saved, Called it, Following, Perks: each with a reason and one action. Guest profile: preview of the scout profile (blurred Called it card) with Sign in.
* Done when: no screen in the app is ever a plain sentence on black.

### P1: before public launch

**P1.1 Horizontal pager between home tabs** in `app/(tabs)/index.tsx` (see swipe section). Done when: swipe changes tab with the indicator following the finger, vertical scroll still works, and the For you round state is kept when you come back.

**P1.2 Call bar and "called" ticket** replacing the round rail (originality section items 1 and 2). Done when: 5 testers shown a muted screenshot do not name TikTok first.

**P1.3 Tab renames and lime discipline**: "For you" to "Drop", "Top" to "Charts", "Featured" to "Team picks" in `lib/i18n.ts` (en, es, tr); lime limited to call, primary, active marker; gradient ring only for creators with a live perk or new drop (`app/(tabs)/explore.tsx` `ring`). Done when: no "For you" string remains in app or web.

**P1.4 Creator page completeness** in `app/creator/[handle].tsx`: links row with platform icons and verified check; stats row (followers, promos, best chart badge when it exists); perk card in the ticket shape with "Get perk" (never tied to votes or follows); Notify me CTA for `releaseStatus === 'soon'` instead of the passive "Coming soon" chip; tabs Promos / About; promo tiles with title and a correct `m:ss` duration; real banner image upload instead of a blurred poster. Done when: the page matches the order in `docs/03-profiles-spec.md` section 3.2.

**P1.5 Brand type and sign in polish**: load Bricolage Grotesque via `expo-font` for display; sign in screen gets the gradient ring logo, a short looping montage of real promos in the top half, and the three value lines (Call hits, Save promos, Claim perks). Done when: the sign in screen is recognizable as PromoVote with the logo covered.

**P1.6 Explore tiles**: corner pill + creator row under the tile instead of text on top of the video UI; collapse hashtags into the search field suggestions to bring the grid above the fold. Done when: first grid row is visible without scrolling on a 393 x 852 screen.

### P2: later

* Weekly "Drop day" moment: Sunday results screen ("You called 3 of 4"), shareable scout card image.
* Skeleton loaders that match feed and grid shapes instead of a centered spinner.
* Dynamic Type and VoiceOver pass: rail and call bar as one accessible group with a clear value ("Your call: Will blow up, pending").
* Reduced motion: replace springs with fades when the OS setting is on.

## Expected scores after P0 + P1

| Area | Now | After P0 | After P0 + P1 |
|------|-----|----------|---------------|
| Retention | 4 | 6 | 8 (Called it results and perks wallet need the P2 drop day for 9) |
| Session time | 5 | 7 | 8 |
| Originality | 4 | 5 | 8 |
| Trademark and trade dress | 6 | 6 | 8 |
| Visual design and UX quality | 4 | 7 | 8 to 9 |

Originality and trade dress cannot reach 8 without P1.2 and P1.3; I recommend pulling those two into the App Store build if time allows, because the first public screenshots set how people see the product.

## Round 2 (2026-10-07)

Inputs: `docs/review/brief-r2.md`, all 19 screenshots in `docs/review/screens-r2/`, and the changed code (`ui/PromoReel.tsx`, `lib/gate.tsx`, `ui/Sheet.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/me.tsx`, `app/edit-profile.tsx`, `app/creator/[handle].tsx`, `app/(tabs)/explore.tsx`).

### Scores

| # | Area | R1 | R2 | Evidence (one sentence) |
|---|------|----|----|-------------------------|
| 1 | Retention | 4 | 6 | Today's Drop, the call ticket with a result date and the Scout Score card with open calls give a real reason to come back, but the daily reminder is missing and so is the "your call came true" reveal screen (results only change a number on the profile), so nothing pulls the user back on day 2 or day 8. |
| 2 | Session time | 5 | 7 | The 7 promo drop with progress segments, an end card and "Keep watching" into the fair rotation is a good loop, but there is still no horizontal swipe anywhere, and the creator page and Explore are thin with 3 real creators. |
| 3 | Originality | 4 | 7 | The call bar, the ticket ("Called: Will blow up. Result Oct 14. Scout #1"), the drop segments and the rounded square creator tiles are PromoVote's own; the right rail, the bottom left creator block and the system font still read as a generic short video app. |
| 4 | Trademark and trade dress | 6 | 8 | "For you" and the story rings are gone; the tab names, call bar and ticket are original; the segment bar is a generic progress pattern. Not legal advice. |
| 5 | Visual design and UX quality | 4 | 7 | Every tap now answers (pressed scale, haptics, gate sheets, toasts, 409 handled), and the scout profile, creator studio and edit profile are solid; a set of small but visible flaws remains (list below). |

### What improved (verified in code and screens)

* `lib/gate.tsx` keeps the tapped action and runs it after sign in and onboarding; creators get a clear "Creators can't vote" sheet (screen 02). This closes my round 1 P0.1.
* Call bar and ticket (`ui/PromoReel.tsx` lines 182 to 210, screens 01 and 13): the main action sits in the thumb zone and the vote is now the visual identity. Rail labels have a backing pill; the CTA is a filled white button.
* Onboarding is 2 steps with a suggested handle, a native date picker on device and the link preview "promovote.com/@name" (screens 11, 12, 15). The DOB overflow is gone.
* Scout profile (screen 14): Scout Score, level bar, "Reputation only. No cash value.", Open calls with result dates, Saved, Following.
* Creator studio (17, 18): setup checklist, free 7/28 day numbers, honest "scout verdict after 30 calls", "Email your trailer" until uploads open. Edit profile (16): logo, banner, bio counter, category plus 2, main button, release status, up to 8 links.
* Drop end card (05) is clear and on brand (double chevron mark).

### Still keeping a score below 8 (smallest change first)

**P0 (before App Store submission)**

1. **Team picks note sits on top of the video's headline** (screen 06). `app/(tabs)/index.tsx` line 164 draws `featured_note` as text over the video. Move it into a one time toast or a small "i" next to the tab label, or give it a solid backing. Done when: no app text overlaps video text on any Team picks promo.
2. **Wrong empty copy on a creator page** (screen 19). `app/creator/[handle].tsx` line 100 reuses the search string "Nothing matches yet." Use "No promos yet" for visitors, and for the owner "Post your first promo" with the Email your trailer action. Add the string in `lib/i18n.ts` (en, es, tr).
3. **Owner on own public page has no Edit button** (screen 19). When `p.viewer?.isMe`, the Follow button disappears and nothing replaces it (line 80). Show "Edit profile" + "Share page" there. Done when: the owner can reach Edit profile from the public page in one tap.
4. **Help and legal list inside onboarding** (screens 11, 12, 15). `app/(tabs)/me.tsx` line 59 renders `LegalLinks` under every state. Hide it during onboarding steps (Terms and Guidelines are already linked in the checkbox line; make those words tappable). Keep it for guest, scout and creator profiles. Done when: onboarding screens end at the Create profile and Back buttons.
5. **Handle suggestions with long random numbers** (maya183182, pixelfox9877). Try the clean name first (`maya`, `mayalin`, `maya_lin`), then a 2 digit suffix, before 6 digits. Also do not copy the number into the display name ("Pixel Fox 9877" in screens 15 to 19 looks like a test account). Done when: a new Apple user named Maya Lin gets a suggestion with at most 2 digits.
6. **"Finish your profile" does not return to the promo.** `lib/gate.tsx` line 64 navigates to `/me`; after Create profile the queued call runs while the user is on Profile, so they never see the ticket appear. After onboarding, `router.back()` (or navigate to the Feed tab with `v=<promo>`) before running the action, then show the ticket. Done when: guest taps Will blow up, signs in, finishes the profile and lands back on the same promo with the ticket visible.

**P1 (before public launch)**

7. **Horizontal swipe between home tabs** (founder request, still missing): Today's Drop, New, Team picks as a pager in `app/(tabs)/index.tsx` (gesture handler and Reanimated are already installed). Keep "swipe left for the same creator's other promos" as planned, but only on the creator row or after a short edge pull so it never fights the tab pager. Do not map votes to swipes. Lifts Session time to 8.
8. **Result reveal and daily reminder** (Retention to 8): when a call resolves, open the app on a full screen result card in the ticket shape ("You called it. Hauling Empire, +30 points, Scout #1 of 23") with a share action, and add the planned local reminder "Today's drop is ready, 7 promos". Without these two, results are invisible and Retention stays at 6 or 7.
9. **Sign in screen is still unbranded** (screen 10, unchanged since round 1). Add the gradient ring logo, three short value lines (Call hits early, Save promos, Follow creators) and a muted loop of real promos in the empty top half. `app/sign-in.tsx`.
10. **Brand display font** (Originality to 8): load Bricolage Grotesque with `expo-font` for titles, creator names, Scout Score and ticket text. Today every screen is the system font, which is the main reason the app still looks generic.
11. **Lime discipline**: lime now marks the Will blow up button, ticket, Level pill, active profile tab, checklist ticks, progress bars, mono avatars and the New creator chip. Keep it for the call, the primary button and progress; make the Level pill, active segmented tab and mono avatar neutral (surface with a white or gradient letter). This also makes the ticket stand out more.
12. **"New creator" chip next to a verified badge** (Poleris, screen 08): show only one trust label. Prefer verified; hide New creator when `verified` is true.
13. **Explore**: creator tiles "Test Studio" and "Pixel Fox" render with no logo (screen 07, test data, but the empty tile must fall back to the mono avatar); the Charts card with one entry looks unfinished, so show it as "Charts open at 10 calls" with the progress bar until there are at least 3 entries.
14. **Drop end card for guests** (screen 05): "You made 0 of 7 calls" for a guest should read "Sign in to make your calls. Results come in 7 days." with Sign in as the primary button.
15. **Creator studio polish**: collapse finished checklist items into "4 of 5 done"; add a "Your promos" grid so the owner sees their content from the studio.

### Expected scores after the list

| Area | R2 | After P0 | After P0 + P1 |
|------|----|----------|---------------|
| Retention | 6 | 6 | 8 (items 8 and the planned streak) |
| Session time | 7 | 7 | 8 (item 7) |
| Originality | 7 | 7 | 8 (items 9, 10, 11) |
| Trademark and trade dress | 8 | 8 | 8 |
| Visual design and UX quality | 7 | 8 | 9 |

P0 items 1 to 6 are each under an hour of work and bring my domain score to 8. Retention and Session time depend on the planned P1 features (reminder, result reveal, swipe), not on more polish.

## Round 3 (2026-10-07, night)

Inputs: `docs/review/brief-r3.md`, all 18 screenshots in `docs/review/screens-r3/`, the commits c885a37 to db91c30 and the current code (`ui/PromoReel.tsx`, `ui/ResultReveal.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/me.tsx`, `app/(tabs)/explore.tsx`, `app/creator/[handle].tsx`, `app/play/[handle].tsx`, `app/sign-in.tsx`, `lib/theme.ts`, `lib/i18n.ts`). Yardstick as before: design-taste-frontend, high-end-visual-design, web-design-guidelines, and the spotify, pinterest, playstation and airbnb references. Note: the floating Feed/Explore/Profile pill in the screens is the web tab bar; where it covers a title (09, 10, 14, 15, search field in 05) I did not count it against the iPhone build.

### Scores

| # | Area | R2 | R3 | Evidence (one sentence) |
|---|------|----|----|-------------------------|
| 1 | Retention | 6 | 7 | The loop is now complete on paper (results with accuracy, one time reveal sheet, weekly streak with dots, gifts wallet, opt in 18:00 reminder after the first drop), but the reveal (13) is a generic text sheet that names no promo, has no ticket shape and no share, and the profile shows "1 Right calls" next to "0 Called it" right after a "You called it!" sheet, which muddles the reward. |
| 2 | Session time | 7 | 8 | Swipe between Today's Drop, New and Team picks, the creator grid opening a vertical player ("Hauling Empire 1 / 11", screen 07), "Keep watching" from the end card and a 21 promo pool give enough paths to keep watching; the ceiling is now content (3 creators), not design. |
| 3 | Originality | 7 | 8 | Bricolage Grotesque on titles, names, Scout Score and ticket, the branded sign in with the gradient ring mark and three value lines (08), the call bar and ticket (11), and the dashed gift ticket (16 to 18) now read as PromoVote; the right rail with three circles and the bottom left creator block are the only generic short video parts left. |
| 4 | Trademark and trade dress | 8 | 8 | No "For you", no story rings, lime arcs not used anywhere as a ring, own tab names and own call bar; the remaining right rail is a common pattern, not a distinctive one. Not legal advice. |
| 5 | Visual design and UX quality | 7 | 7 | All six round 2 P0 items are fixed (Team picks note on a solid backing, "No promos yet", Edit profile and Share for the owner, no legal list in onboarding, clean handle "mayalin", return to the promo after onboarding), but the first screen of the app (01, 03, 11) shows the home tab labels colliding with the video's own burned in headline, and a handful of visible polish gaps remain (list below). |

### Round 2 list, status

* Done: items 1 to 6 (all P0), 7 swipe, 8 reveal and reminder (basic), 9 sign in, 10 brand font, 12 one trust label (`newCreator && !verified`), 13 Charts progress card (05), 14 guest end card copy.
* Partly done: 11 lime discipline. Level pill and mono avatars are neutral now, but the active segment tab on the Scout profile (14, 18), the Saved rail icon when on, the gift chip, the verified check, the "Coming soon" chip and the right result row border are all lime, so lime still means six things.
* Not visible in screens: 15 studio polish (checklist collapse, "Your promos" grid in the studio).

### What still keeps a score below 8 (smallest change first)

**P0 (before App Store submission, each under an hour)**

1. **Home tab labels are unreadable over bright or text heavy videos** (01, 03, 11, 13: "Today's Drop New Team picks" sits on top of "You run the business" and "Pick loads. Plan routes."). `app/(tabs)/index.tsx` line 168 draws a 0.6 to 0 scrim; that is too weak for burned in trailer titles. Use a 3 stop scrim (0.85 at the top, 0.55 at the tab row, 0 at about 180 pt) and add a text shadow (`textShadowColor: rgba(0,0,0,0.6)`, radius 6) on the tab labels and the mute button. Done when: tab labels pass 4.5:1 on all seed promos, checked on device screenshots. This alone takes Visual/UX to 8.
2. **Scout stats contradict the reveal** (13 then 14). The sheet says "You called it! 1 right", the card shows "Called it 0". `called_it` in `lib/i18n.ts` means an early 3x hit (`services/api/src/index.js` line 1139). Rename it "Early hits" (es "Aciertos tempranos", tr "Erken isabet") or drop the third tile and show "Accuracy 50%" there instead. Also trim the result row copy "You called it right. Points added. +30 points" to "Right call  +30" (`outcome_right`).
3. **Reveal sheet is a missed moment** (13, `ui/ResultReveal.tsx`). Keep the one time logic, but render the result as the ticket: thumbnail of the best resolved promo, "Will blow up. Right.", "+30" in the display face, Scout rank if any, and a Share action next to See my results. Still one sheet, still respects the iOS modal rule. This is the variable reward of the whole loop and today it looks like a settings dialog. Lifts Retention to 8 from the design side.

**P1 (before public launch)**

4. **Lime discipline, last step**: active segment tab on the Scout profile becomes a white pill with ink text (`app/(tabs)/me.tsx` `segOn`, line 521); Saved rail icon on state becomes white fill with ink icon (`ui/PromoReel.tsx` `RailButton`); verified check white. Keep lime for the call, the primary button, progress and the gift ticket outline.
5. **"Coming soon" still looks like a button** (06, `app/creator/[handle].tsx` line 41 and `styles.soon`). It has the same size, border and placement as a link button but does nothing. Either make it the planned "Notify me" action or render it as a small non interactive caption next to the category chip ("Indie game · Coming soon").
6. **Onboarding type cards** (09): no icon, no visual difference, and both descriptions end on a negative ("You cannot post promos", "You cannot vote"). Add the call chevron and a creator icon, lead with the benefit ("Call hits before they blow up" / "Post promos for your game, app or shop"), and move the restriction to a smaller second line.
7. **Explore tile captions over video UI** (05, Poleris tile): the tile shade starts at 45% and is 0.92 only at the very bottom, so "Your daily manifestation ritual" sits on the promo's own UI text. Use the round 1 Pinterest pattern: title and creator under the tile on the page background, or raise the shade to 0.6 at 55%.
8. **Creator page header**: still no stats row (followers, promos) and links do not render for Hauling Empire (06). The page leans on one huge lime Follow button; a quieter Follow next to a stats row would match the Airbnb host card pattern from round 1.
9. **Right rail**: three 48 pt circles with labels for Save, Share and More. With the call bar now carrying the identity, collapse Save and Share into two small icons at the right of the creator row and keep More in the top right. This removes the last TikTok layout cue and frees the right edge of the video.

### What only real users or content can close

* Retention above 7 to 8 and Session time above 8 depend on more than 3 creators: a 7 promo drop that repeats the same 3 brands every day will feel thin by day 4 no matter how good the reveal is. That is supply and outreach, not code.
* The reveal and streak only become motivating when results arrive from a real crowd; with a handful of scouts most calls will be "void" or decided by very few votes. Expect to tune copy after the first 2 weeks of real results.

### Expected scores after this list

| Area | R3 | After P0 | After P0 + P1 |
|------|----|----------|---------------|
| Retention | 7 | 8 | 8 (9 needs real results and more creators) |
| Session time | 8 | 8 | 8 (9 needs more content) |
| Originality | 8 | 8 | 9 (item 9) |
| Trademark and trade dress | 8 | 8 | 8 |
| Visual design and UX quality | 7 | 8 | 9 |
