# Mobile product design review, designer 2 (2026-10-07)

Role: Mobile Product Design (second designer). Angle: accessibility, Android and Material 3, motion and micro interactions, gestures, information architecture (3 tabs plus a future "followed creators" row), and consistency between promovote.com and the app.

Sources judged: all 13 screenshots in `docs/review/screens/`, `apps/mobile/src/**` (every file), `apps/mobile/app.json`, `web/landing/public/` (styles.css, feed.css, feed.js, index.html, explore.js), `web/landing/src/index.js`, `docs/03-profiles-spec.md`, `docs/04-explore-charts-upload.md`. Skills applied: redesign-existing-projects (interactivity and states audit), web-design-guidelines (focus, targets, reduced motion), design-taste-frontend and high-end-visual-design (originality, motion), design-references (Spotify, Pinterest, Apple, PlayStation for patterns only).

## 1. Scores

| # | Area | Score | Evidence (one sentence) |
|---|------|-------|-------------------------|
| 1 | Retention | 4 | There is no reason to return tomorrow: a vote gives no "call locked, result in N days" loop, there is no followed creators row, and the signed in profile is only Sign out and Delete (screenshot 13). |
| 2 | Session time | 5 | The fair queue never ends and autoplays well, but every promo is a dead end sideways (no way to go deeper into one creator without leaving the player), there is no progress bar, and the Top tab is an empty page (screenshot 04). |
| 3 | Originality | 5 | Right side circular rail, "For you" tabs with underline, and lime ringed story circles (screenshot 06) read as a TikTok plus Instagram skin; only the vote labels are PromoVote's own. |
| 4 | Trademark and trade dress safety | 6 | Name and logo are safe, but the Google button is a hand drawn blue "G" letter (`sign-in.tsx` line 47), which breaks Google's sign in branding rules, and "For you" plus ringed circles plus right rail add up to TikTok and Instagram trade dress. |
| 5 | My domain: accessibility, platform fit, motion and gestures | 3 | Rail buttons have no pressed state and no haptics (`PromoReel.tsx` line 138), so taps feel dead; white 11 pt labels sit on bright video with a 2 px shadow (screenshot 01); several targets are under 44 pt; strings for VoiceOver are hard coded English; no Android ripple; predictive back is off; zero horizontal gestures. |

Every score is below 8. Section 6 lists the minimum changes, prioritized.

## 2. What I saw on each screen

* **01 / 02 Feed For you.** Video framing with blurred backdrop is good. Problems: tab labels at 68 percent white sit on a light grey video and are hard to read; rail labels "Will blow up" and "Not for me" are white on a white planner page and almost disappear; "more" is a 13 pt word with no visual affordance; the expanded state (02) lets the title overlap the creator row ("Und... budget and life" cut by the avatar), because the shade grows to 70 percent but the text block has no own background, and the poster behind it is white. The CTA "Visit the shop" is about 37 pt tall.
* **03 / 05 New and Featured.** "Picked by the PromoVote team. Never paid." collides with text burned into the video (05). The bottom info overlaps the app's own burned in tab bar (Poleris screenshots) and is unreadable. This will happen often with app promos: phone screen recordings always have a tab bar at the bottom. The info area needs a solid enough scrim, not a 34 percent gradient.
* **04 Top.** An empty full screen inside the main feed. A user who swipes or taps here hits a dead end on day one.
* **06 Explore.** Good structure (search, circles, pills, hashtags, masonry). The lime rings around every creator say "unseen story" but there are no stories; this is Instagram's visual grammar without its meaning. Tile titles over posters with burned in text become noise ("Your daily manifestation ritual" over the affirmation card). Pills are about 38 pt, hashtag chips about 33 pt tall.
* **07 / 08 Creator.** Strongest screen. Issues: back button 40 pt; grid tiles have no title, no vote signal, no "Perk" chip; tapping a tile jumps to the Feed tab (`router.push('/')`), which loses the creator context and on iOS switches tabs under the user. Spec (`docs/03` line 383) says the tile should open a creator only player.
* **09 Guest profile.** One card, then a black void. No preview of what you get (Scout Score, Called it, Saved).
* **10 Sign in.** On web only "Continue with email" shows. On device the Google button is a white pill with a typed "G". Copy is fine.
* **11 Type choice.** Two equal cards with no icons, no illustration, no "you can't change this later" warning. Choosing an account type is irreversible (one email = one account), so it deserves a confirmation.
* **12 Creator form.** DOB row overflows (YYYY cut off). The disabled "Create profile" button is lime at 60 percent opacity, which still reads as enabled. Categories are the 3 seed values. No avatar, links, bio or perk fields.
* **13 Scout after signup.** Name, handle, Sign out, Delete. Delete account in red as the second most prominent element on the main profile is wrong placement; it belongs in Settings.

## 3. Accessibility audit

### 3.1 Contrast on video (the biggest a11y issue)

Text sits on unpredictable video frames, so contrast must be guaranteed by the UI, not by the content.

* Rail labels (`PromoReel.tsx` styles.railLabel): 11 pt, white, `textShadowRadius: 2`. On white frames the ratio approaches 1:1. Fix: 12 pt semibold minimum, and put the label inside the rail capsule or behind a soft 60 percent black pill; or drop labels after the first session and keep them in `accessibilityLabel` only (show labels during the first 3 promos as onboarding, then icons only, which also frees video area).
* Feed tabs (`index.tsx` styles.tabText): inactive at `rgba(255,255,255,0.68)`. Fix: add a top scrim gradient (black 55 percent to 0, 120 pt tall) behind the header, which also fixes the Featured note collision; inactive tabs at 80 percent.
* Info block: replace the 34 percent gradient with a scrim that starts at the top of the text block and reaches at least 0.85 black under text. Rule of thumb from WCAG 1.4.3 for text over images: measure against the lightest possible frame. With 0.85 black over white, white text is about 11:1.
* Disabled button: opacity 0.6 on lime still passes as "active". Use `C.surface2` background and `C.muted` text for disabled, so the state is not color only.
* Static colors are fine: lime on `#0a0a0f` about 16:1, `#a8a5b8` muted on `#0a0a0f` about 8:1, danger `#ff6b6b` about 6.5:1.

### 3.2 Touch targets (44 pt iOS, 48 dp Android)

| Element | File | Now | Fix |
|---|---|---|---|
| Creator back button | `creator/[handle].tsx` styles.back | 40 x 40 | 44 x 44 visual, or `hitSlop={4}` |
| Feed CTA ("Visit the shop") | `PromoReel.tsx` styles.cta | about 37 pt tall | `minHeight: 44`, paddingVertical 12 |
| Hashtag links in feed | `PromoReel.tsx` styles.hashtag | text only, about 18 pt | padding 8 x 10 or `hitSlop={12}` |
| Explore pills | `Pill.tsx` styles.pill | about 38 pt | `minHeight: 44` (Android 48) |
| Explore hashtag chips | `explore.tsx` styles.tag | about 33 pt | `minHeight: 40` plus `hitSlop` |
| Onboarding checkbox | `me.tsx` styles.box | 24 pt box, row is pressable | fine, keep the whole row pressable |
| "more / less" | `PromoReel.tsx` | whole text block pressable | fine |
| Rail buttons | 48 pt circle in 68 pt column | fine | keep |

Android: use 48 dp as the floor (Material 3).

### 3.3 VoiceOver and TalkBack

* Hard coded English labels: `'Play'`, `'Pause'` (PromoReel line 82), `'Sound on' / 'Sound off'` (index line 141), `'Back'` (creator line 46), `'Day' / 'Month' / 'Year'` (me lines 112 to 114). Move to `i18n.ts` (en, es, tr).
* A promo is announced as a pile of fragments. Make the reel one accessible element with a summary label ("Nicheable, Etsy shop. Undated planners for focus, budget and life. Promo 3.") and **custom actions** via `accessibilityActions`: Will blow up, Not for me, Save, Share, Open creator, Open link. This is how iOS expects swipeable media cards to work (VoiceOver rotor "Actions"), and it makes voting one swipe instead of six.
* After a vote or save, call `AccessibilityInfo.announceForAccessibility('Your call is locked')` (and the localized equivalent). Today nothing is announced, and the founder's own complaint ("they just sit there") is exactly what a VoiceOver user hears.
* Vertical paging with VoiceOver: three finger swipe pages the FlatList; make sure the newly active reel gets focus (`AccessibilityInfo.setAccessibilityFocus` on page change) so VO does not stay on the old item.
* Tabs: `accessibilityRole="tablist"` is on the ScrollView, good. Add `accessibilityLabel` "Feed sections". Explore category pills should be a radio group (`accessibilityRole="radio"` plus `checked`), hashtags toggles.
* Handle check uses the glyphs ✓ and ✗ (me line 105). Read aloud as "check mark". Use words: "@name is available" / "@name is taken".
* Avatar mono letters are decorative: set `accessible={false}`; the name next to it carries the meaning.
* Captions: promos have speech in some cases. Plan a captions track (WebVTT on R2 now, Stream later) and a "Captions" toggle beside sound. P1, App Store does not require it, EU Accessibility Act style expectations do.

### 3.4 Dynamic Type (iOS) and font scale (Android)

RN scales text by default, but the overlay layout is fixed (rail width 68, `info.right: 84`, rail `bottom: 110`). At AX sizes the title and rail labels will cover most of the video and labels will wrap into 3 lines.

* On video overlays only, cap with `maxFontSizeMultiplier={1.35}` (title, desc, rail labels, tab labels). Video stays visible, text still grows 35 percent.
* Everywhere else (profile, onboarding, Explore, creator page, sign in) allow full scaling, and test at the largest accessibility size: the DOB row, the 3 column grid duration chips and the creator header (`head` row with 96 pt avatar) must wrap rather than clip. The creator name already has `numberOfLines={1}`; at large sizes allow 2.
* DOB row (founder issue 6): replace three fields with one native date picker (`@react-native-community/datetimepicker`, spinner on iOS, Material date picker on Android) opening from a single 48 pt field that shows the localized date. This fixes the overflow, Dynamic Type, locale order (DD/MM vs MM/DD) and input errors at once. If a picker is not wanted, use Year first (age gate only needs year plus month), on two rows.

### 3.5 Motion and vestibular

* Respect Reduce Motion (`AccessibilityInfo.isReduceMotionEnabled` / Reanimated `useReducedMotion`): no scale bounces, use opacity fades. The website already does this (`feed.css` line 167, `feed.js` line 2); the app does not.
* Autoplay: iOS has a system setting "Auto-Play Video Previews". When it is off, start each reel paused with a big play button. Small effort, good review signal.

## 4. Android and Material 3

* **No ripple or pressed state anywhere** except `Pill`, `Button` and `TypeCard`. Add `android_ripple={{ color: 'rgba(255,255,255,0.16)', borderless: true, radius: 28 }}` on rail buttons and the sound button, bounded ripple on rows, chips and tiles. This is the Material "every tap shows state" rule and solves founder issue 3's "nothing happens" feel on Android.
* **Predictive back** is disabled (`app.json` `predictiveBackGestureEnabled: false`). Android 16 enforces predictive back for apps targeting API 36. Turn it on and test the creator screen and sign in modal.
* **System back gesture comes from both edges on Android.** Any horizontal pan I propose in section 5 must ignore touches that start within 24 dp of either edge (`Gesture.Pan().hitSlop({ left: -24, right: -24 })` or start region checks).
* **NativeTabs on Android** renders a Material bottom navigation with an active indicator pill (`indicatorColor={C.surface2}`). Good. Make sure the indicator contrast is visible: `#1d1d2b` on `#0a0a0f` is about 1.3:1, too faint. Use lime at 18 percent opacity, or `#2a2a3d`.
* **Edge to edge** is mandatory on Android 15+. The feed uses `insets.top`; the info block uses a fixed `bottom: 20`. On Android with 3 button navigation, verify the CTA is not under the nav bar (use `insets.bottom` when the tab bar is hidden, for example in the creator player).
* **Typography**: app has no custom font, so Android shows Roboto and iOS shows SF, while the website uses Bricolage Grotesque for display and Inter for body. Load both with `expo-font` (files already exist in `web/landing/public/fonts/`) and use Bricolage for titles, scores and counts. This is the cheapest originality win and makes app and site one brand.
* **Google sign in button** (`sign-in.tsx` lines 45 to 49): a typed blue "G" in a white pill is not the approved Google mark. Use the official "G" logo asset per Google Identity branding guidelines (or `GoogleSigninButton` from the library). This is a trademark issue, not taste.
* **Share sheet**: `Share.share({ message })` on Android puts the URL inside the message, fine. On iOS pass `url` separately so the share sheet shows the link preview and "Copy" works: `Share.share({ message: title, url })`.
* **Haptics**: Android needs `expo-haptics` too (uses `performHapticFeedback`); keep intensities light, respect system "Touch feedback" setting (expo-haptics does).

## 5. Motion, micro interactions and gestures

### 5.1 Tap feedback (P0, founder issue 3)

Rule: every tap shows a change within 100 ms, even when the action cannot complete.

* Rail buttons: `Pressable` style function with `transform: [{ scale: pressed ? 0.9 : 1 }]` and icon background lighten; Android ripple.
* Guest or not onboarded tapping a vote: never a silent `router.push('/me')` (`PromoReel.tsx` line 52). Show a bottom sheet in place, like the website already does (`index.html` `data-sheet="vote"`): "Make your call. Sign in to lock it in." with Apple and Google buttons, or "Finish your profile (1 step)" with the onboarding form inside the sheet. After success, **apply the vote the user tapped** so the intent is not lost. Same for Save and Follow.
* Share: today the promise is ignored. On success or dismiss, flash the share icon lime for 1.2 s ("Shared" label), like the website does (`feed.js` lines 255 to 269). If the founder still sees nothing on device, log the rejection instead of `.catch(() => {})`; with `message` only, iOS shows the sheet, so a silent failure points at a touch interception problem, which the pressed state will make visible immediately.

### 5.2 Vote animation and haptics (identity moment)

The vote is PromoVote's signature, so it should feel like placing a bet, not liking a post.

* **Will blow up**: icon circle fills lime, flame scales 1.0 to 1.25 to 1.0 with a spring (Reanimated, about 260 ms), a lime ring expands and fades from the button (one pulse, not confetti), `Haptics.impactAsync(Medium)`. Then a small chip slides up above the info block for 2 s: "Call locked. Results in 7 days." with the double chevron logo mark. This chip is the "called it" story starting, and it is original (no other feed tells you when your opinion will be judged).
* **Not for me**: quiet. Icon fills white, `Haptics.selectionAsync()`, chip "Got it. Fewer like this." No celebration. Optional P2 A/B: auto advance to the next promo after 600 ms.
* **Change of mind**: tapping the other vote within the lock window swaps with a cross fade; tapping the same vote again asks nothing, it is already locked (decide lock rules with the product lead).
* **Save**: bookmark fills with a 1.15 bounce, `Haptics.impactAsync(Light)`, toast "Saved" with "View" linking to Profile > Saved.
* **Follow** (creator page): per spec `docs/03` line 1276, button morphs lime to outline in 150 ms, follower count ticks with a number roll, light haptic.
* **No double tap to vote.** Double tap to like is TikTok and Instagram muscle memory and trade dress; a prediction should be a deliberate tap on a labeled button. Double tap can do nothing, or seek forward 5 s.
* **Progress bar**: 2 pt line at the bottom of each reel (website has `.progress`), white at 70 percent. It tells people how long a promo is, which raises completion and session time.
* **Loading**: replace `ActivityIndicator` in Feed, Explore, Creator with skeletons (poster shaped blocks with a slow shimmer, no shimmer under Reduce Motion).
* **Tab underline** in the feed header should slide between tabs (shared value), not jump.

### 5.3 Gestures (founder issue 4)

Principle: one axis, one meaning, everywhere in the app. Vertical = next thing. Horizontal = deeper into the same thing. Left edge = back (system).

**Feed.**

* Vertical swipe: next promo in the fair queue (unchanged).
* **Horizontal swipe left on a promo: this creator's other promos**, played in place, as a horizontal pager. A small header appears: avatar, name, "2 of 11", and dots. Swipe right returns toward the first promo; from the first, a swipe right does nothing (rubber band). Swipe up at any point continues the main queue with the next creator. This is the "2D feed": vertical is breadth across creators (fair rotation keeps working, since each vertical step is still one creator turn), horizontal is depth into one creator. It answers the founder's "swipe to open the creator" without leaving the player, it creates session time from content that exists today (Hauling Empire has 11 promos), and it is not how TikTok or Reels work (TikTok's swipe left opens a profile page).
* A tap on the avatar or name still opens the full creator page.
* Do **not** use horizontal swipe for For you / New / Top / Featured. Reasons: two horizontal meanings cannot coexist; New and Top are thin or empty early, so a swipe would land on dead pages; and a 4 page pager of video lists multiplies video players and memory. Tabs stay tap only (header strip can still be swiped as a scroll view).
* Implementation: nested horizontal `FlatList` per vertical item with `pagingEnabled` and `directionalLockEnabled` (iOS), which lets native scroll views resolve direction; or `react-native-gesture-handler` `Gesture.Pan()` with `activeOffsetX([-16, 16])` and `failOffsetY([-10, 10])` (both libraries are already installed). Only the active row mounts its horizontal list, and only the visible cell has a playing player.
* Conflicts: the Feed tab is a tab root, so the iOS edge back swipe is not active there. On Android, ignore pans starting within 24 dp of both edges (system back). Long press opens the action sheet (5.4), so pan must require movement before activating.
* Discoverability: on the first session, after the 3rd promo, show a one time nudge: the current reel peeks 24 pt left with "More from Nicheable" and a chevron, then settles. Never again after the user swipes once.

**Creator page.**

* Full screen player opened from the grid: vertical swipe through this creator's promos only (spec `docs/03` line 383), swipe down from the top or tap close to dismiss, iOS edge swipe back keeps working because the player is a pushed stack screen. Present it as `fullScreenModal` with `gestureEnabled: true`.
* When the page gets tabs (Promos, Perks, About), tabs can be a horizontal pager, but its pan must start more than 30 pt from the left edge so the iOS back swipe always wins (`fullScreenSwipeEnabled` on native stack plus pan `hitSlop({ left: -30 })`).

**Explore.** No horizontal page swipe. Explore already has three horizontal scrollers (circles, categories, hashtags); a fourth horizontal meaning on the grid would fight them. Horizontal stays inside carousels only. Pull to refresh on the grid.

**Own profile.** Tabs Called it, Saved, Following as a horizontal pager, same left edge rule.

### 5.4 Long press sheet (also fixes an App Store risk)

Long press on a promo (500 ms, `Haptics.impactAsync(Light)`) opens a sheet: Report, Not interested in this creator, Copy link, Captions, Playback speed. The API already has `api.report` (`lib/api.ts` line 65) with 13 reasons, but the app has no report or block UI. Apple Guideline 1.2 requires a way to report content and block users in apps with user generated content. The sheet must also be reachable without a long press: add a "..." rail button or put Report in the expanded info. This is P0.

## 6. Information architecture

### 6.1 Three tabs, kept

Feed, Explore, Profile is the right shape. Creators need to post, but a 4th "+" tab would be dead for Scouts (who cannot post). Put **"New promo"** as the primary button in a creator's own Profile tab header, and as a FAB style button on their own creator page. Scouts never see it.

Tab icons: keep SF and Material symbols. When signed in, replace the Profile icon with the user's avatar (small, 24 pt, ring when there is a new result). That gives the Profile tab a reason to be opened ("your call resolved").

### 6.2 Feed header and the followed creators row

Constraint: the feed is full screen video; a permanent stories row would push the header to about 190 pt and cover the top of every video.

Proposal: **Drops row**, collapsed by default.

* Header left: a compact avatar stack (3 overlapping 24 pt avatars of followed creators who have a new promo, plus a count), labeled "Drops". Tap, or pull down on the first promo, expands a row of 56 pt circles under the tabs, with a scrim behind it. Swipe up or start playing collapses it.
* Tapping a circle plays that creator's new promos in the horizontal pager from 5.3, so "Drops" and "creator depth" are the same component.
* **Do not** use a gradient ring around circles. The brand ring is pink to violet; Instagram's story ring is pink, orange, purple. That is the closest trade dress risk in the whole app. Use a **segmented lime arc** (one segment per unseen promo, like a progress ring) or a small lime double chevron badge on the avatar. Unseen = lime arc, seen = no arc.
* Copy: call it "Drops" (already in `docs/03` line 509 wording "your drop"), not "Stories".
* Empty state (follows nobody): the avatar stack is replaced by "Follow creators to get their drops", which opens Explore's creator section.
* Explore circles today have lime rings that mean nothing. Change them to the app icon shaped avatar (radius 30 percent, same as the creator page) without a ring, titled "Creators to know". Rings only ever mean "unseen drop", only in the Feed.

### 6.3 Feed tabs

* Remove **Top** from the Feed until vote data exists; charts belong in Explore (`docs/04`), where the honest empty state already lives. An empty tab inside the main feed is a dead end.
* Rename to reduce TikTok resemblance (decision for the trademark expert, my recommendation): **For you** to **Discover**, **New** to **Fresh**, **Featured** to **Team picks**. Three tabs, and "Following" later becomes the Drops row, not a 4th tab.

### 6.4 Profile tab content (founder issues 1, 2, 8)

* **Scout**: header (avatar, name, handle, level ring), Scout Score, a "Pending calls" card ("3 calls, first result in 5 days"), tabs Called it, Saved, Following. Settings behind a gear: language, notifications, Sign out, Delete account (move Delete out of the main screen; still reachable in 2 taps, which App Store requires).
* **Creator**: preview of their public creator page with "Edit profile" (avatar, banner, bio, links up to 5, category from the creator expert's taxonomy, perk code), "New promo", and a stats strip (views, calls, saves). Empty states for each: "Add your first promo, 10 to 30 s, 10 per month free."
* **Guest**: a blurred preview of a Scout profile (score 0, "Your first call is one tap away") above the Sign in button, instead of a black void.

## 7. Website and app consistency (promovote.com vs app)

| Topic | Website (`web/landing/public`) | App (`apps/mobile/src`) | Recommendation |
|---|---|---|---|
| Display font | Bricolage Grotesque + Inter | system font only | load both in the app (`expo-font`) |
| Primary button | pink to violet gradient pill (`.btn`) | lime rounded rectangle, radius 14 | pick one primary per surface: lime = action in product (vote, follow, sign in), gradient = brand marketing only. Document it in `lib/theme.ts` and `styles.css` comments |
| Vote tap as guest | opens explanatory sheet (`data-sheet="vote"`) | silent `router.push` | copy the website pattern into the app (P0) |
| Share feedback | "Shared/Copied" state (`is-shared`) | none | add (P0) |
| Progress bar | yes (`.progress`) | no | add (P1) |
| Perk chip | lime "Perk" tag (`.tag-perk`, NEWIDEA25) | no perk UI, though API returns `hasPerk` | add the chip in the reel (P1); it is a reason to come back |
| End card | yes (`.reel-end`) | infinite, no end | fine for app, keep infinite |
| Feed tabs | none | 4 tabs | align after 6.3 (web can gain Discover / Fresh later) |
| Reduced motion, focus rings | yes | no reduced motion | add to app |
| Creator URL | `/@handle` served (`src/index.js` line 318) | Account links to `promovote.com/@handle` | consistent, good |
| Universal links | **no `/.well-known/apple-app-site-association` or `assetlinks.json` route** | `associatedDomains: applinks:promovote.com` | add both files to the Worker so shared `promovote.com/?v=slug` and `/@handle` links open the app. Without this, every share sends people to the website, not the app (P0 for growth, P1 at the latest) |
| Colors | `--text #f5f4f8`, `--muted #a3a1b5`, `--surface #15151f` | `#ffffff`, `#a8a5b8`, `#14141f` | small drift; make `theme.ts` and `styles.css` share exact values |

## 8. Prioritized minimum changes

### P0 (before App Store submission)

1. **Tap feedback and in place auth sheet.** `ui/PromoReel.tsx` (`RailButton`, `needAccount`, `share`), `app/creator/[handle].tsx` (`toggleFollow`). Pressed scale plus Android ripple on every rail button; replace silent `router.push('/me')` with a bottom sheet (sign in, or finish profile) that completes the original action after success; share with `url` field and a "Shared" state. Why: founder issue 3, every tap must react in 100 ms. Done when: on a TestFlight build, a guest, a not onboarded user and a Scout each tap all four rail buttons and see a visible change every time; screen recording shows under 100 ms.
2. **Vote moment with haptics.** Add `expo-haptics`; Reanimated spring on the flame; "Call locked. Results in 7 days." chip; VoiceOver announcement. Why: retention loop and originality start here. Done when: a tester can tell you, without being told, when their vote will be judged.
3. **Report and block UI.** Long press sheet plus a visible "..." entry, wired to `api.report`; block creator. Why: App Store Guideline 1.2. Done when: Report is reachable in 2 taps from any promo and any creator page, with and without long press.
4. **Contrast and targets on the feed.** Top scrim behind tabs and Featured note; stronger bottom scrim; rail labels 12 pt in a pill; CTA, pills, back button, hashtags to 44 pt (48 dp Android). Files: `index.tsx`, `PromoReel.tsx`, `Pill.tsx`, `explore.tsx`, `creator/[handle].tsx`. Done when: screenshots 01, 03, 05 re shot over the brightest frames have legible labels, and Accessibility Inspector (iOS) and Accessibility Scanner (Android) report no target or contrast warnings on Feed and Explore.
5. **Localized accessibility labels and a summary label plus custom actions on the reel.** `PromoReel.tsx`, `index.tsx`, `creator/[handle].tsx`, `me.tsx`, `i18n.ts`. Done when: VoiceOver in Turkish reads every control in Turkish and can vote via the Actions rotor.
6. **DOB as one native date picker; disabled button styling.** `me.tsx`. Done when: no overflow at the largest Dynamic Type size on a 375 pt wide iPhone SE and on a small Android.
7. **Official Google sign in mark.** `sign-in.tsx`. Done when: button matches Google Identity branding guidelines.
8. **Profile completeness shell** (with the other experts' content plan): Scout tabs and Settings, Creator edit and "New promo", guest preview; Delete account moved into Settings. `me.tsx`. Done when: after Sign in with Apple, a new Scout sees at least a score, a pending calls card and Saved; a new Creator sees Edit profile with avatar, links and perk.

### P1 (before public launch)

9. **Horizontal creator depth in the feed** (5.3) with the one time peek nudge, edge exclusions on Android, creator only player from the creator grid. Done when: average promos per session rises (track horizontal swipes per session) and there are no accidental back gestures in testing on iPhone and Pixel.
10. **Drops row** (6.2) with segmented lime arc, no gradient ring; Explore circles lose rings. Done when: a user with 3 follows sees unseen drops at a glance and the circles no longer resemble Instagram stories in a side by side check.
11. **Feed tabs**: remove Top from Feed, rename per 6.3 (after trademark expert sign off).
12. **Fonts and tokens shared with the website**; progress bar; perk chip; skeleton loaders; sliding tab underline; Reduce Motion and "Auto-Play Video Previews" respected.
13. **Universal links**: serve `apple-app-site-association` and `assetlinks.json` from `web/landing/src/index.js`. Done when: tapping a shared promovote.com link on a phone with the app opens the app on that promo.
14. **Android**: enable predictive back, stronger tab indicator, verify edge to edge bottom insets.

### P2 (later)

15. Captions track and toggle. 16. Auto advance after "Not for me" (A/B). 17. Playback speed and seek by double tap. 18. Tablet layout (currently `supportsTablet: false`, fine for v1).

## 9. Expected scores after P0 and P1

| Area | Now | After P0 | After P1 |
|---|---|---|---|
| Retention | 4 | 6 | 8 (vote result loop, Drops, Profile) |
| Session time | 5 | 6 | 8 (creator depth, progress bar, perk chip) |
| Originality | 5 | 7 | 8 (vote moment, 2D feed, Drops arc, own fonts) |
| Trademark and trade dress | 6 | 7 | 8 (Google mark, no gradient ring, renamed tabs, no double tap like) |
| A11y, platform, motion, gestures | 3 | 7 | 9 |

Note: legal remarks above (trade dress, Google branding, Apple guidelines) are design observations, not legal advice.

## Round 2 (2026-10-07)

Judged from `docs/review/screens-r2/01..19`, the commits 1fd6aba, dd9bdee, 71a08cb, 7424e9f and the current code in `apps/mobile/src` (PromoReel, Sheet, gate, index, explore, creator, me, edit-profile, app.json). Angle unchanged: accessibility, touch targets, motion and haptics, gestures, IA.

### Scores

| # | Area | R1 | R2 | Evidence (one sentence) |
|---|------|----|----|-------------------------|
| 1 | Retention | 4 | 7 | Today's Drop is a finite daily ritual with progress segments and an end card ("You made N of 7 calls, results in 7 days"), and the ticket plus Open calls on the Scout profile give a dated reason to return; there is still no reminder and no result reveal moment to pull people back on day 7. |
| 2 | Session time | 5 | 7 | "Keep watching" after the drop, the CTA and the expanded details keep people in, but a creator's grid tile still jumps to the Feed tab (`creator/[handle].tsx` line 102) and there is no way to go deeper into one creator from the player. |
| 3 | Originality | 5 | 8 | The bottom call bar that turns into a "Called: Will blow up. Result Oct 14. Scout #1" ticket, the double chevron, and the daily drop with an end card are PromoVote's own; nothing in TikTok, Reels or Product Hunt looks or works like this. |
| 4 | Trademark and trade dress | 6 | 8 | "For you" is gone, creator circles are rounded squares with no story ring, the Google button uses the official G asset, and the vote is no longer on a TikTok style rail; the remaining right rail (Save, Share, More) is generic. |
| 5 | My domain (a11y, platform, motion, gestures) | 3 | 6 | Every tap now answers (haptics, pressed scale, rail ripple, gate sheets, toasts with VoiceOver announcements), the call buttons are 52 pt in the thumb zone and DOB uses a native picker on device; still open: English only labels, no reel summary or custom actions, no Dynamic Type caps, 40 pt buttons on creator pages, missing top scrim (screen 06), no call animation, predictive back off, no horizontal gesture. |

### What got better (verified)

* Founder issue 3 is solved in code: `gate.tsx` keeps the tapped action and runs it after sign in and onboarding; creators get an explanation instead of silence. Haptics: light impact on every tap, success notification after the server confirms a call (`PromoReel.tsx` lines 29, 83).
* Call bar (screens 01, 13): two 52 pt buttons at the bottom, lime "Will blow up" on the right under the thumb, "Not for me" outlined on the left. This is the best change of the round for reach and identity.
* Rail labels sit in a dark pill (screen 01), readable on any frame. CTA is a white 44 pt button. Creator row has `minHeight: 44`.
* Report and Block are 2 taps from any promo and creator page (screen 03), sheets have `accessibilityViewIsModal` and titled headers.
* DOB is a native date picker on iOS and Android (`me.tsx` line 339); the web build keeps three fields, which now fit (screen 12).
* Top removed from the Feed, Charts live in Explore with honest progress (screen 07). Explore circles lost the meaningless rings. Delete account moved behind the profile menu.

### Still holding my domain below 8 (smallest change first)

**P0 (before App Store submission)**

1. **Hard coded English accessibility labels.** `ui/PromoReel.tsx` line 134 (`'Play' / 'Pause'`), `app/(tabs)/index.tsx` sound button (`'Sound on' / 'Sound off'`), `app/creator/[handle].tsx` line 59 (`'Back'`), `ui/Sheet.tsx` line 14 (`'Close'`), `me.tsx` web DOB fields (`'Day' / 'Month' / 'Year'`). Move to `i18n.ts`. Done when: VoiceOver in Turkish reads no English.
2. **40 pt buttons on creator pages.** `creator/[handle].tsx` styles `back` and `round` (lines 132, 134): 40 to 44. Done when: Accessibility Inspector shows no small target warning on screens 08 and 19.
3. **Top scrim behind the feed header.** Screen 06: "Picked by the PromoVote team. Never paid. The founder makes some of these promos." is printed on top of the video's own title and is unreadable. Add a gradient view (black 60 percent to 0, about 140 pt) behind `styles.top` in `index.tsx`, and set inactive `tabText` to 80 percent white. Done when: screen 06 re shot has a legible note and tabs.
4. **Bottom scrim must cover the info block.** Screen 06 again: the creator name, "Made by the PromoVote founder" and title are mixed with the promo's own burned in tab bar. The shade is 40 percent tall with its solid stop at 25 percent, but the text block starts about 35 percent from the bottom (call bar plus info). Change `shade` in `PromoReel.tsx` line 243 to height 52 percent with the 0.95 stop at 40 percent. Done when: Poleris promos (which all end with an app tab bar) show readable creator and title text.
5. **Dynamic Type caps on overlays.** No `maxFontSizeMultiplier` anywhere. At the largest text sizes "Will blow up" and "Not for me" overflow the 52 pt buttons and the title covers the video. Add `maxFontSizeMultiplier={1.35}` to call bar texts, ticket texts, rail labels, reel title, desc, "more", feed tabs and the drop progress. Leave profile, studio, onboarding and sign in fully scalable. Done when: at AX5 on an iPhone SE the call bar stays one line per button and the video is still visible.
6. **One summary element per reel with custom actions.** Make the reel container `accessible` with a label ("Hauling Empire. Hauling Empire on a bigger screen. Promo 1 of 7.") and `accessibilityActions` for Will blow up, Not for me, Save, Share, More, Open creator, handled in `onAccessibilityAction`. On page change, `AccessibilityInfo.setAccessibilityFocus` on the new reel. Done when: a VoiceOver user can make a call from the Actions rotor without hunting for the button.

**P1 (before public launch)**

7. **Android feedback parity.** `android_ripple` exists only on rail buttons; add it to the call buttons (`PromoReel.tsx` lines 199, 203), `Sheet` actions, `Pill`, `Button`, the creator round buttons and Explore tiles. Done when: every pressable on a Pixel shows a ripple.
8. **Hashtag targets.** `PromoReel.tsx` `hashtag` has `paddingVertical: 6` (about 30 pt). Use 11, or `hitSlop={8}`. Same for Explore hashtag chips.
9. **Call moment motion.** The bar swaps to the ticket instantly. Use Reanimated (installed) `FadeInDown.springify()` on the ticket and a one time scale pulse on the chevron icon, skipped when `useReducedMotion()` is true. Small code, big "it worked" signal. Done when: the swap is visible in a 60 fps screen recording and absent with Reduce Motion on.
10. **Creator only player.** Grid tiles on `creator/[handle].tsx` line 102 push `/` and switch the user to the Feed tab. Open a stack screen that plays only this creator's promos (vertical), with iOS edge back intact. This is also where the planned "swipe left for the same creator" can start, with Android 24 dp edge exclusions as in section 5.3.
11. **Predictive back.** `app.json` `predictiveBackGestureEnabled: false`. Turn on and test the creator page, edit profile and sign in modal before targeting API 36.
12. **Empty creator page copy.** Screen 19 says "Nothing matches yet." under Promos (`creator/[handle].tsx` line 100 reuses the search string). Use "No promos yet" for visitors and "Email your first trailer" for the owner.
13. **Avatar fallback.** Screen 07: "Test Studio" and "Pixel Fox" circles in Explore render empty. When `uri` fails, `Avatar` should fall back to the mono letter (`expo-image` `onError`).
14. **Brand fonts.** Load Bricolage Grotesque for titles, Scout Score and the ticket (`expo-font` is installed; files in `web/landing/public/fonts/`).
15. **Universal links.** Still no `apple-app-site-association` or `assetlinks.json` route in `web/landing/src/index.js`, so shared promo links open the website, not the app.

### Expected after the P0 list

My domain moves to 8 after items 1 to 6 (all small, about one day). Retention and Session time reach 8 with the planned daily reminder and result reveal (retention) and item 10 plus the planned same creator swipe (session time); those belong to the other experts' lists too, so I do not repeat them as my blockers.

## Round 3 (2026-10-07, night)

Judged from `docs/review/screens-r3/01..18`, commits c885a37 to db91c30 and every file in `apps/mobile/src` (PromoReel, index, play/[handle], creator/[handle], explore, me, sign-in, perk, Sheet, ReportMenu, PerkSheet, ResultReveal, Avatar, Pill, Fade, reminder, theme, _layout, app.json). Angle unchanged: accessibility, platform conventions (iOS HIG, Material 3), motion and gestures.

### Scores

| # | Area | R2 | R3 | Evidence (one sentence) |
|---|------|----|----|-------------------------|
| 1 | Retention | 7 | 8 | The loop now closes: the ticket shows the outcome ("no points lost" when wrong, screen 11), a one time "You called it! 1 right" sheet greets the scout on the feed (screen 13), Results with accuracy sit above Open calls (screen 15), a forgiving weekly streak with dots is on the profile (screen 14), and the 18:00 local reminder is offered only after a finished drop (`index.tsx` EndCard). |
| 2 | Session time | 7 | 7 | The creator player ("Hauling Empire 1 / 11", screen 07) and "keep watching" add depth, but there is still no in feed way to go deeper into one creator (the horizontal swipe was spent on tabs), Explore tiles, Results, Saved and studio tiles all jump to the Feed tab instead of a player, and with 3 creators the depth runs out fast. |
| 3 | Originality | 8 | 8 | Bricolage Grotesque on titles, Scout Score and the ticket, the branded sign in with three value lines (screen 08), the outcome ticket and the dashed gift card (screen 16) are PromoVote's own; the tab swipe adds nothing original. |
| 4 | Trademark and trade dress | 8 | 8 | No story rings, rounded square avatars, official Google G with the #747775 border (`sign-in.tsx` line 131), Apple's own button; a horizontal swipe between top feeds is a generic pattern, not a protected look. |
| 5 | My domain (a11y, platform, motion, gestures) | 6 | 7 | Five of my six R2 P0 items are done (localized labels, 44 pt creator buttons, Dynamic Type caps on every overlay, a reel summary with the full actions rotor, ticket spring through Reanimated 4 which follows Reduce Motion by default), but the feed tabs are still unreadable over bright frames (screens 01, 03, 11, 13), and the new tab swipe has no finger tracking, no Android edge exclusion and contradicts the founder's swipe rule. |

### Verified since round 2

* All R2 hard coded labels are now `t()` keys: Play/Pause, Sound on/off, Back, Close, Day/Month/Year (`PromoReel.tsx` 128 to 136, `index.tsx` 189, `creator/[handle].tsx` 59, `Sheet.tsx` 28, `me.tsx` 446 to 448). Only the logo's "PromoVote" label stays English, which is correct.
* The video area is one accessible element with a summary label (creator, title, call state) and actions for play/pause, both calls, save, share, creator, CTA and More (`PromoReel.tsx` 126 to 148). Calls are hidden from the rotor once made. Good.
* `maxFontSizeMultiplier` 1.3 to 1.35 on tabs, notes, creator row, title, desc, more, chips, CTA, call bar, ticket, rail labels and toast; sheets and buttons at 1.4; profile, onboarding and Explore scale freely.
* Creator page back, share and more are 44 pt; play screen buttons 44 pt; hashtag links have 11 pt vertical padding; creator links have `minHeight: 44`.
* Top scrim exists (`index.tsx` 168, black 60 percent to 0) and the Team picks note sits on a solid 78 percent backing (screen 04, now legible). Bottom shade is 55 percent tall with a 0.82 stop (screens 07, 11 read well).
* Android ripple on call buttons, rail, Sheet actions, Pill and Button. Avatar falls back to a letter (screens 05, 16, 18). Empty creator page copy is right ("No promos yet.", screen 16).
* Sheets wait for `onDismissed` before navigating (iOS one modal rule) in Sheet, ReportMenu, PerkSheet, ResultReveal and Settings. Report and Block are one sheet with steps (screen 03).

### Still holding scores below 8 (smallest change first)

**P0 (my domain, before App Store submission)**

1. **Feed tabs over bright video.** Screens 01, 03, 11 and 13: "New" and "Team picks" sit on the promo's own white headline ("You run the business", "Pick loads. Plan routes.") and cannot be read; the 60 percent scrim fades to 0 exactly where the tabs are. `index.tsx` line 168: raise the first stop to 0.8 and add a middle stop (`colors: ['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0)']`, `locations: [0, 0.6, 1]`), and set inactive `tabText` (line 246) to `rgba(255,255,255,0.85)`. If a frame still wins, put the tab strip on a 55 percent black pill like the rail labels. Done when: screens 01 and 03 re shot have legible inactive tabs.
2. **Tab swipe: decide, then make it a real gesture.** `index.tsx` lines 120 to 124. (a) CLAUDE.md (founder decision 2026-10-07) says "Swipe left plays the same creator's other promos", but the code makes swipe left go to the next tab. One of the two must change; my recommendation from R1 section 5.3 stands (horizontal = deeper into the same creator, tabs tap only), because two horizontal meanings cannot coexist and New and Team picks are thin. If the founder keeps tab swipe, update CLAUDE.md. (b) Whichever meaning wins, the pan only acts `onEnd`: nothing moves under the finger, then the list blanks and a spinner shows. Direct manipulation needs the content (or at least the lime tab dot) to follow `translationX` and settle with a spring, skipped under Reduce Motion. (c) Add Android edge exclusion: `.hitSlop({ left: -24, right: -24 })`, so a swipe near the edge is not stolen by system back, which on a tab root closes the app. Done when: on a Pixel with gesture navigation 10 edge swipes never exit the app, and a 60 fps recording shows the content tracking the finger.

**P1 (before public launch)**

3. **Remaining small targets.** Explore hashtag chips `paddingVertical: 7` (about 33 pt, `explore.tsx` 148) to `minHeight: 44`; the reel gift chip is 28 pt plus 4 hitSlop (`PromoReel.tsx` 262) to `minHeight: 32` with `hitSlop: 8`; scout segment buttons `minHeight: 40` (`me.tsx` 520) to 44; onboarding "Back" (`me.tsx` 470) has no `accessibilityRole="button"`.
4. **Android ripple parity.** Still missing on the creator page round buttons and links, creator grid tiles, Explore tiles, creator circles and hashtag chips, the feed sound button, scout segment, Results and Open call rows, wallet code and the TypeCard. One shared `Touchable` wrapper with a bounded ripple would cover all of them.
5. **Predictive back.** `app.json` line 28 still has `predictiveBackGestureEnabled: false`. Turn on and test sign in, edit profile, perk and the creator player before targeting API 36.
6. **Tiles open the Feed tab.** Explore grid and charts (`explore.tsx` 80, 126), Results, Open calls, Saved (`me.tsx` 150, 164, 179) and studio promos (`me.tsx` 330) push `/` with `v`, which switches tabs under the user and loses their place; back does not return. Open the stack player (`/play/[handle]` or a generic `/play` with a list) like the creator grid already does. This is also the cheapest session time win left.
7. **Bottom scrim on app screen recordings.** Screen 04 (Poleris): "Made by the PromoVote founder" still mixes with the promo's burned in text. Move the 0.82 stop from 0.55 to 0.4 in `PromoReel.tsx` line 151, or give the creator row a subtle text backing.
8. **Small a11y polish.** Handle status reads the glyphs "check mark" / "multiplication x" (`me.tsx` 440): use words. Disabled `Button` looks like a pressed one (opacity 0.6, `Pill.tsx` 130): use `C.surface2` with `C.muted` text. On page change, move VoiceOver focus to the new reel (`AccessibilityInfo.setAccessibilityFocus`). Android tab indicator `C.surface2` on `C.bg` is about 1.3:1 (`(tabs)/_layout.tsx`): use `#2a2a3d` or lime at 18 percent.
9. **Copy that confuses (for the product lead).** Screen 14 shows "1 Right calls" next to "0 Called it": two names for what a scout reads as the same thing, and a plural with 1. Explain "Called it" (early right call) or merge the stats.

**P2**

10. Respect the iOS "Auto-Play Video Previews" setting; captions track and toggle.

### Gaps that code cannot close

* Session time is capped by supply: 3 founder creators (about 30 promos) means the creator player and keep watching run dry within one or two sessions. Real creators are needed before Session time can honestly reach 8, even after item 6.
* Retention at 8 is a design judgment; the reminder opt in rate and day 7 return can only be confirmed with real users after the first results resolve.

### Expected after the P0 list

My domain reaches 8 after items 1 and 2 (about half a day, plus the founder's decision on the swipe meaning). Items 3 to 8 move it toward 9. Session time reaches 8 with item 6 plus the in feed same creator swipe and more real creators.
