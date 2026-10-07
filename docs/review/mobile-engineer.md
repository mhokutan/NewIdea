# Mobile engineer review (2026-10-07)

Role: Mobile Engineering lead. Domain score: **Engineering quality and App Store technical readiness**.
Scope read: `apps/mobile/src/**` (all 19 files), `services/api/src/index.js`, `services/api/migrations/0002_core.sql`, `apps/mobile/app.json`, `eas.json`, `package.json`, the installed `expo-router`, `expo-video` and `react-native` sources in `node_modules`, screenshots 01 and 12.
Stack checked: Expo SDK 57.0.27, React Native 0.86.3 (New Architecture), expo-router 57 with `unstable-native-tabs`, expo-video 57.0.5, react-native-gesture-handler 2.32, Reanimated 4.5.1, React Compiler on.
`npx tsc --noEmit` passes. `npx expo lint` passes. No code was changed.

## Scores

| # | Area | Score | Evidence |
|---|------|-------|----------|
| 1 | Retention | 4/10 | The two habit loops (vote, save) silently fail for many signed in users, nothing is persisted or shown back (no "my calls", no saved list in the app), and views are never counted, so there is no reason to return tomorrow. |
| 2 | Session time | 5/10 | The vertical feed with preloading and fair rotation works, but the video keeps playing behind other tabs, there is no horizontal navigation, and the CTA likely sits under the iOS tab bar. |
| 3 | Originality | 5/10 | Right side rail plus bottom left creator block plus "For you" tab row is the TikTok / Reels layout one to one; the vote labels are the only distinct element. |
| 4 | Trademark and trade dress | 7/10 | No marks copied in code or assets; risk is only the combined TikTok trade dress ("For you" label in that exact position, right rail order, share arrow) which is generic piece by piece. |
| 5 | Engineering quality and App Store technical readiness | 4/10 | Core actions give no feedback, 1.2 report and block exist in the API but not in the app, privacy and terms are not tappable, delete account swallows errors, view tracking is dead code, and creator editing is missing (2.1 completeness). |

## 1. Root cause of "Will blow up, Not for me, Save and Share do nothing"

There are two separate causes. Vote and Save have a proven cause in code. Share has no gate in code, so it needs one device test to confirm; the most likely cause is below.

### 1a. Vote and Save (proven by the code)

`apps/mobile/src/ui/PromoReel.tsx`

```ts
52  const needAccount = () => { router.push(me ? '/me' : '/sign-in'); };
53  const vote = async (choice) => {
54    if (!isScout) return needAccount();
55    setVoted(choice);                       // lime state, shown before any network call
56    api.vote(promo.id, choice).catch(() => {});
```
```ts
58  const toggleSave = () => {
59    if (!isScout) return needAccount();
```

and `apps/mobile/src/lib/use-me.ts:33`: `isScout: s.me?.profile?.type === 'scout'`.

Deduction:
* If `isScout` were true, the button would turn lime immediately (line 55 runs before the API call, and API errors are swallowed). The founder saw no change at all, so `isScout` was false.
* If `me` were null (guest or failed `/v1/me`), the code pushes `/sign-in`, which is a visible modal. The founder saw nothing, so `me` was not null.
* So the founder was **signed in but not a scout**: either onboarding was not finished (`me.profile === null`, `needsOnboarding: true`) or the account is a **creator** (founder note 2 talks about "creator profile", which suggests the TestFlight account was created as a creator; creators cannot vote by design, and the API also makes Save scout only at `services/api/src/index.js:478`).
* For that user the only reaction is `router.push('/me')`. From inside the feed this resolves to a tab switch (expo-router turns PUSH into NAVIGATE for a tab navigator, see `node_modules/expo-router/build/global-state/getNavigationAction.js`, and `NativeBottomTabsRouter` handles it). With `NativeTabs` the JS state change is not reliably reflected by the native UITabBarController, and even when it is, nothing explains why the user was moved. The result the founder describes, "they just sit there", matches a silent no-op.
* Same pattern in `apps/mobile/src/app/creator/[handle].tsx:30` (Follow).

Secondary issues that make vote and save look broken even for real scouts:
* `PromoReel.tsx:56` and `:61`: errors are swallowed. A second vote returns 409 `already_voted` (API `index.js:465`), a pending deletion profile returns 403, and the UI never knows.
* Vote and save state is never loaded from the server (the feed response has no viewer state), so after the cell unmounts (windowSize 3) the lime state is lost and the next tap gets a silent 409.

Fix (small, safe):
1. Replace `needAccount` with an explicit reason: guest opens `/sign-in`; `needsOnboarding` opens a bottom sheet or `Alert` "Finish your profile to vote" with a button that calls `router.navigate('/(tabs)/me')`; creator gets a short toast "Creator accounts can't vote. Scouts vote." and the vote buttons render in a disabled style for creators (keep Share, and decide if Save should be allowed for creators; if yes change `requireProfile(c, "scout")` to `requireProfile(c)` at `index.js:478, 488, 495`).
2. Make vote and save optimistic with rollback and a visible error: on 409 keep the lime state, on other errors revert and show a toast.
3. Return `viewer: { call: 'will_blow_up' | 'not_for_me' | null, saved: boolean }` per promo from `/v1/feed`, `/v1/home`, `/v1/explore` when a session exists, and seed `voted` and `saved` from it.

How to verify: on TestFlight sign in with (a) a new Apple id that skips onboarding, (b) a creator, (c) a scout. Expected: (a) sees the "finish your profile" sheet, (b) sees the creator toast, (c) sees lime instantly and the vote survives scrolling away and back and an app restart.

### 1b. Share

`PromoReel.tsx:63`: `Share.share({ message }).catch(() => {})` has no gate, and React Native's iOS implementation (`RCTActionSheetManager.mm` `showShareActionSheetWithOptions`) presents a `UIActivityViewController` on `RCTPresentedViewController()`. The code itself is correct, so if Share does nothing the presentation fails silently. Most likely cause:

* `apps/mobile/src/app/sign-in.tsx:26`: after Apple sign in the modal screen `sign-in` is **replaced** with `/me` (`router.replace('/me')`). The common navigator of `sign-in` and `(tabs)/me` is the root Stack, so React Navigation's REPLACE swaps the modal route for a **second `(tabs)` route** (stack becomes `[(tabs), (tabs)]`). Natively, react-native-screens has to dismiss a modal and push a screen containing a second UITabBarController in one transaction. This leaves a stale presented view controller or a detached hierarchy, and UIKit then refuses to present the share sheet ("Attempt to present UIActivityViewController ... whose view is not in the window hierarchy" in the device log). It also mounts a second feed with its own video players underneath (memory, and the left edge swipe goes "back" to another feed).
* This fits the founder's flow exactly: he tested right after Sign in with Apple.

How to confirm in 2 minutes: (1) force quit, reopen (already signed in, no modal history), tap Share: if the sheet opens, this is the cause. (2) On the build with sign in done, swipe from the left edge on the feed: if another feed slides in, the duplicate `(tabs)` is confirmed. (3) Mac Console app filtered on the device shows the "Attempt to present" line.

Fix: in `sign-in.tsx` `done()`, call `router.dismiss()` (or `router.back()`), then `router.navigate('/(tabs)/me')` (navigate reuses the existing tabs). Never `replace` out of a modal into a tab route. Also pass `url` separately on iOS (`Share.share({ message: promo.title, url })`) and log failures instead of `.catch(() => {})`.

If Share still fails on a cold start as a guest, the touch is not reaching the rail; then remove `removeClippedSubviews` (`app/(tabs)/index.tsx:118`, known to misbehave with Fabric and gives no benefit at windowSize 3) and add `console.log` in each `onPress` to see it in the dev client.

### 1c. Not the cause (checked)

* The full screen pause `Pressable` (`PromoReel.tsx:82`) is rendered before the rail, so the rail is on top. The rail has no overlapping sibling: `info` ends at `right: 84`, the rail is 68 wide at `right: 8`.
* `styles.shade` and the paused icon use `pointerEvents="none"`, `styles.info` and the top bar in `index.tsx:121` use `box-none` and only cover the top area.
* The CTA and creator Link are not affected by the gate.

## 2. Other bugs found (with file and line)

| Severity | Where | Bug | Fix | Verify |
|---|---|---|---|---|
| P0 | `ui/PromoReel.tsx:42` | `useEventListener(player, 'timeUpdate')` never fires: expo-video `timeUpdateEventInterval` defaults to 0, which disables the event (`expo-video/build/VideoPlayer.types.d.ts:85`). Views are never sent, `onSeen` never runs, so fair rotation never learns what was seen and creators get zero views. | In the `useVideoPlayer` setup set `p.timeUpdateEventInterval = 0.5`. | Watch a promo 4 s, check `view_events` in D1 gets a row. |
| P0 | `lib/api.ts:73-75` | `crypto.randomUUID()` for the guest device id. Hermes does not guarantee `crypto.randomUUID` and no polyfill is installed (`expo-crypto` absent). Once views work this may throw and be swallowed. | `npx expo install expo-crypto` and use `Crypto.randomUUID()`. | Guest view row with `d:` key appears. |
| P0 | `app/(tabs)/index.tsx` | Feed video keeps playing when the user opens Explore, Profile or a creator page (NativeTabs keeps the screen mounted, nothing pauses on blur). Unmuted audio plays behind other screens. | `const focused = useIsFocused()` (exported by expo-router) and pass `active={focused && index === active}`. | Unmute, switch tab: audio stops; come back: resumes. |
| P0 | `ui/PromoReel.tsx:154, 168` | `info` sits at `bottom: 20` with no bottom inset. On iOS NativeTabs content extends under the translucent tab bar, so the CTA ("Visit the shop") and the "more" link are probably under the bar and not tappable. Web hides this because the bar is at the top. | Use `useSafeAreaInsets().bottom` (includes the tab bar inside native tabs) for `info.bottom` and `rail.bottom`. | On iPhone the CTA is fully above the tab bar and tappable. |
| P0 | `app/sign-in.tsx:26` | `router.replace('/me')` from a modal creates a duplicate `(tabs)` (see 1b). | `router.dismiss()` then `router.navigate('/(tabs)/me')`. | No second feed behind the first after sign in. |
| P0 | `app/(tabs)/me.tsx:42` | Delete account swallows API errors, then signs out, so the user believes the account is deleted when it is not (5.1.1(v)). | Show an error and stay signed in when the DELETE fails; on success show "Deleted. You have 30 days to restore". | Turn on airplane mode, delete: error shown. |
| P1 | `app/(tabs)/me.tsx:111-114` | Date of birth row overflows (screenshot 12): on web a TextInput has an intrinsic min width, so `flex: 1` cannot shrink it. On iPhone SE width it is also tight. | Give the three inputs `minWidth: 0` plus fixed widths (DD 72, MM 72, YYYY flex 1), or one native date picker (`@expo/ui` is already installed). Add auto advance DD to MM to YYYY. | Screenshot at 320, 375, 393 widths: YYYY fully visible. |
| P1 | `app/(tabs)/index.tsx:99-118` | `removeClippedSubviews` with paging on Fabric is a known source of blank cells and lost touches; little gain at `windowSize={3}`. | Remove it. | Fast scroll 30 items: no blank cell. |
| P1 | `app/_layout.tsx` | No `GestureHandlerRootView` at the root, so any RNGH gesture added later will not work. | Wrap the Stack in `<GestureHandlerRootView style={{ flex: 1 }}>`. | A test `Gesture.Tap()` fires. |
| P2 | `services/api/src/index.js:580` | RevenueCat webhook still exists although the founder decided no RevenueCat (2026-10-06). | Remove or replace with own StoreKit / Play verification when Boost ships. | Route returns 404. |

## 3. Horizontal swipe gestures (founder note 4)

Everything needed is already installed and SDK 57 compatible: `react-native-gesture-handler ~2.32`, `react-native-reanimated 4.5.1`, `react-native-worklets 0.10.1`.

Recommended, in this order:

1. **Swipe between feed tabs (For you / New / Top / Featured)** with `react-native-pager-view` (`npx expo install react-native-pager-view`, needs a new dev build). One page per tab, each page owns its own vertical `FlatList`. A horizontal native pager containing vertical lists is the safest combination because UIKit and Android resolve the direction natively. Only the selected page passes `active` to its reels; other pages render posters only (no player) to keep memory flat. Keep the tab row as the indicator and sync `onPageSelected` with `setTab`.
2. **Swipe left on a promo to open the creator** with RNGH: `Gesture.Pan().activeOffsetX([-25, 25]).failOffsetY([-15, 15])` inside a `GestureDetector` around the reel; on end with `translationX < -60` call `router.push('/creator/' + handle)` via `runOnJS`/`scheduleOnRN`. `failOffsetY` lets the vertical FlatList win any mostly vertical drag. Do not attach it on the pager variant at the same time unless the pan is only active on the last tab, or the two gestures fight.
3. Swipe right to go back on the creator screen already works through the native stack edge gesture; keep `gestureEnabled` default and do not cover the left 20 pt with a pan.

Prerequisite: `GestureHandlerRootView` at the root (table above). Test: on iPhone, a diagonal drag of 30 degrees must scroll the feed, a flat drag must switch tab, and the edge swipe on the creator page must still go back.

## 4. Video preloading and memory

* Today each mounted cell creates its own `useVideoPlayer` on mount, so with `windowSize={3}` and `initialNumToRender={2}` about 3 players buffer at once. That is acceptable preloading for MP4 under 30 s and gives instant start on the next item.
* Risks: the duplicate `(tabs)` after sign in doubles the players; the pager plan above would triple them unless off screen pages render posters only; three blurred `expo-image` copies (`blurRadius={40}`) per cell cost CPU on older iPhones.
* Improvements, in order: pause on blur (P0 above); keep players only for `active - 1 .. active + 1` and render poster only for other mounted cells; set `player.bufferOptions = { preferredForwardBufferDuration: 5 }` for non active players; replace the live blur with a pre blurred poster generated at upload time (or `blurRadius` 20 on a 64 px thumbnail). When HLS via Cloudflare Stream arrives the `hls` branch at `PromoReel.tsx:24` is already wired.
* Measure: Xcode Instruments Allocations while scrolling 50 promos; memory should plateau, not climb.

## 5. Profile and creator editing (founder notes 1 and 2)

The schema is ready (`profile_links`, `media_assets`, `perks`, `perk_codes`, `perk_claims`, `promo_videos` in `0002_core.sql`), but the API only has `PATCH /v1/me` for name, bio and language, and the app has no edit screen at all. Minimal set:

API (`services/api/src/index.js`, add an R2 binding `MEDIA` in `wrangler.jsonc`, bucket served from a custom domain such as `media.promovote.com`):
* `PUT /v1/me/avatar` and `PUT /v1/me/banner`: the Worker receives the image body (max 2 MB, `image/jpeg|png|webp`), writes `avatars/<profileId>/<uuid>.jpg` to R2, inserts `media_assets`, updates `profiles.avatar_url`. Proxying through the Worker is simpler than presigned URLs and fits free limits.
* `GET/PUT /v1/me/links`: replace the list (max 8), validate `platform` against the CHECK list, canonicalize, `safety_status = 'pending'`; return them in `/v1/profiles/:handle` only when `safe` (or pending for the owner).
* `POST/PATCH/DELETE /v1/me/perks` (creators only) and `POST /v1/perks/:id/claim` (signed in, verified email, never tied to votes or follows, per decisions).
* Video: `POST /v1/me/promos` creates a draft, `PUT /v1/me/promos/:id/video` streams the MP4 to R2 (`videos/<promoId>/a.mp4`), poster uploaded alongside, status `pending_review` until the ad review queue approves. Enforce limits server side (10 per month, 5 in the first 30 days, 10 to 30 s free) using the client reported duration plus moderation, since a Worker cannot probe video. A migration is needed: `media_assets.kind` only allows `avatar` and `banner`.

App:
* "Edit profile" screen from `me.tsx` `Account`: avatar (`expo-image-picker` with `allowsEditing`, `aspect [1,1]`, then `expo-image-manipulator` resize to 512 px JPEG 0.8), name, bio, links editor, and for creators perks and "Upload promo".
* Upload: `expo-image-picker` with `mediaTypes: ['videos']`, `videoMaxDuration: 30`, and on iOS `videoExportPreset: VideoExportPreset.H264_1280x720` (on device 720p transcode by AVFoundation). Android has no export preset; add `react-native-compressor` (has an Expo config plugin, needs a dev build) or accept originals up to a size cap. Poster with `expo-video-thumbnails`. Check each of these APIs against the SDK 57 docs before coding, as AGENTS.md requires.
* Verify: upload a 25 s 4K iPhone clip; the file in R2 is 1280x720 H.264 and under about 15 MB; avatar appears on the reel and profile within one refresh.

## 6. App Review Guidelines risks

| Guideline | Status | Needed |
|---|---|---|
| 1.2 User generated content | **Fail.** Profiles, names and bios are UGC today, promos soon. API has `/v1/reports` and `/v1/blocks` but the app has no Report or Block button anywhere (`api.report` is unused). | "..." menu on each reel (Report promo) and on the creator page (Report profile, Block). Blocked creators hidden from feed and explore (check the feed queries filter `blocks`). A visible contact (support@promovote.com) in the profile tab. Terms acceptance already exists. |
| 2.1 App completeness | **Risk.** Buttons that do nothing (section 1) and an empty creator profile with no editing read as incomplete. The reviewer account must be able to vote. | Fix section 1, ship minimal profile editing, make the review account a finished scout with sample saves. |
| 4.8 Login services | Pass. Sign in with Apple is offered on iOS next to Google. | Keep Apple first on iOS. |
| 5.1.1(i) Privacy policy | **Risk.** `legal_note` is plain text; there is no tappable Privacy Policy or Terms link in the app. | Links on sign in, onboarding and profile to promovote.com/privacy and /terms (`expo-web-browser`). |
| 5.1.1(v) Account deletion | Partial. Exists, but errors are swallowed (`me.tsx:42`). | Show failure; confirm the 30 day grace in the UI. |
| 2.3 / 2.5 | Note. `ITSAppUsesNonExemptEncryption: false` is correct. Make sure no RevenueCat or Boost UI reaches the binary before payments exist. | |

## 7. Minimum changes to bring every score to 8 or more

P0, before App Store submission:
1. Vote, Save, Follow feedback (`PromoReel.tsx:52-62`, `creator/[handle].tsx:30`): explicit sheet for "finish profile", toast for creators, optimistic state with visible errors, viewer state from the API. Raises 2.1, retention. Done when the 3 account test in 1a passes.
2. Sign in exit (`sign-in.tsx:26`): `dismiss` plus `navigate` instead of `replace`; confirm Share with the cold start test; log share errors. Done when Share opens right after a fresh sign in.
3. Report and Block UI on reel and creator page, support contact, tappable Privacy and Terms, delete account error handling. Clears 1.2 and 5.1.1.
4. Playback correctness: `timeUpdateEventInterval = 0.5`, `expo-crypto` UUID, pause on blur, bottom inset for `info` and `rail`. Done when D1 shows view rows and audio stops on tab switch.
5. Minimal Edit profile: avatar to R2, name, bio, links (creators also see their own public page preview). Clears founder notes 1 and 2 and 2.1.

P1, before public launch:
6. Horizontal pager between feed tabs plus swipe left to creator (section 3), with `GestureHandlerRootView`.
7. Retention surfaces: "My calls" (with result when the promo charts) and "Saved" lists in the profile tab, using the existing `/v1/saves`. Raises retention to 8.
8. Originality and trade dress: move the vote pair out of the TikTok right rail into a distinct bottom "call" bar (two wide buttons with the call counts revealed after voting), rename "For you" to a PromoVote term (for example "Discover"), keep Save and Share in a smaller secondary row. Raises originality and trademark to 8.
9. Perks creation and claim, promo video upload with on device 720p, DOB fix, remove `removeClippedSubviews`.

P2, later:
10. Player pool for active plus or minus 1, pre blurred posters, Cloudflare Stream HLS, remove the RevenueCat webhook, server side upload limits with Stream duration checks.
