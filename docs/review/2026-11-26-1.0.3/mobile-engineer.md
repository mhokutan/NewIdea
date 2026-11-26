# Mobile engineering review: PromoVote 1.0.3 (2026-11-26)

Role: Mobile Engineering lead. Commit reviewed: 908f699 on `claude/gracious-pasteur-nu8ssc`.
Expo SDK 57 (installed `expo` 57.0.27, lockfile 57.0.27), React Native 0.86.3, expo-video 57.0.5,
expo-build-properties 57.0.22.

## What I ran (no network installs, no builds)

* `npx tsc --noEmit`: pass.
* `npx expo lint`: pass (exit 0, no output).
* `npx expo config --type public`: resolves; version 1.0.3, `ios.infoPlist.CFBundleLocalizations` = en, es, tr, pt,
  de, fr; root `locales` map resolves to 6 files, each with only `NSPhotoLibraryUsageDescription` (valid JSON).
* `npx expo config --type introspect` (with a dummy `GOOGLE_IOS_URL_SCHEME`): Info.plist gets
  `UIApplicationSceneManifest` with `EXExpoAppSceneDelegate`, multiple scenes off; entitlements are associated domains
  plus Sign in with Apple only (no `aps-environment`, so `withoutPush` in `app.config.ts` still works); URL schemes
  `promovote`, `com.miapera.promovote`, `exp+promovote` and the Google reversed client id.
* `node --test apps/mobile/tests/guest-sync.test.mjs`: 3 of 3 pass.

## Expert 1: build and release engineer

Angle: will the TestFlight and Play closed testing builds of 1.0.3 compile, sign, upload and open.

Findings:
* The last blocker (Mac test, iOS app built with Xcode 27 does not open: "UIScene life cycle is required") is fixed
  in `apps/mobile/app.json` line 92 (`expo-build-properties` `ios.enableSceneSupport: true`). The plugin
  (`node_modules/expo-build-properties/build/iosSceneSupport.js`) needs installed expo >= 57.0.23; the lockfile pins
  57.0.27, and `npm ci` in both workflows uses the lockfile, so prebuild will not throw. The plugin rewrites the
  standard SDK 57 Swift AppDelegate; we have no `ios/` folder (CNG), so the template is standard.
* `ExpoAppSceneDelegate.swift` in expo 57.0.27 forwards `openURLContexts`, `continue userActivity` and
  `willConnectTo` (cold start links), so universal links, the `promovote://` scheme and Google sign in redirects
  should keep working. This is the one area that is new native behavior and only a real device run proves it.
* `.github/workflows/ios-build.yml`: `runs-on: macos-26`, default Xcode 26, `eas-cli@24.12.1 --local`, so the EAS
  cloud image question from the Mac report does not apply to our CI. With scene support the app opens on both
  Xcode 26 and Xcode 27 SDKs, so a runner image switch no longer breaks launch.
* `eas.json`: `appVersionSource: remote`, production `autoIncrement: true`, so build numbers and versionCodes come
  from EAS and cannot collide with build 18. Marketing version 1.0.3 is above the live 1.0.2.
* `.github/workflows/android-build.yml` line 61: `RELEASE_NOTES` still says "New: Following tab, creator stats,
  ..." from an older build. Not a build failure, but closed testers read it.
* Triggers fire only on pushes to `claude/gracious-pasteur-nu8ssc` with `[build ios]` / `[build android]`; the work is
  on that branch, so the founder's go commit will trigger correctly.

## Expert 2: runtime quality engineer

Angle: first launch crashes, guest calls and sync, SecureStore, install source, video and memory.

Findings:
* Guest calls (`apps/mobile/src/lib/guest-calls.ts`): SecureStore read is wrapped in try/catch and validated
  (line 28), writes are capped at 6 entries (line 36), so a corrupt or missing value cannot crash first launch.
  Sync is single flight, only for scouts (`src/lib/gate.tsx` line 77), 400/404/409 settle and network or 5xx retry
  (`guest-sync.ts` line 88); tests pass.
* Small race: `guestCallCount()` (guest-calls.ts line 40) is a sync read of memory that is filled only after
  `showGuestCalls()` runs once the session check ends (`gate.tsx` line 78). A guest who taps before that on a cold
  start is treated as having 0 calls, so a 4th call can slip through once. No crash, data only.
* Install source (`src/lib/install-source.ts`): Android only, try/catch around the whole thing, RN 0.86
  `URLSearchParams.get` is implemented (`react-native/Libraries/Blob/URLSearchParams.js` line 62). Called from
  `src/app/_layout.tsx` line 24 without await, so it never blocks first render. Note: Android users updating from
  1.0.2 will also send one event on their first 1.0.3 open, mostly `install_organic`; this inflates organic installs
  in the first days.
* Video: unchanged since 1.0.2. Feed FlatList `windowSize={3}`, `initialNumToRender={2}`, `maxToRenderPerBatch={2}`
  (`src/app/(tabs)/index.tsx` lines 223 to 225), so at most about 3 expo-video players live at once; Duel holds 2.
  Rail labels now shrink to fit (`src/ui/PromoReel.tsx`), a layout change only.

## Scores

| Expert | Retention | Session time | Originality | Trademark and trade dress | Build and runtime safety |
|---|---|---|---|---|---|
| Build and release engineer | 8: guest calls let a new user act in the first minute without a sign in wall, which is the biggest retention lever in this build. | 8: no new player or list cost; the feed keeps the same 3 item window that shipped in 1.0.2. | 8: the call game and guest calls are our own mechanic, no copied native components. | 9: no third party marks in config, icons or permission texts; bundle and scheme are our own. | 8: tsc, lint and config pass; the scene blocker is fixed with a supported API, signing and versioning are remote; real device link and sign in check still owed. |
| Runtime quality engineer | 8: kept calls survive a restart and are synced on sign in with safe retries. | 8: no added work on the feed path; install source and guest load run off the render path. | 8: guest calls with a 24 hour keep window are a distinct flow. | 9: permission strings in 6 languages name only PromoVote. | 8: every new storage and native call is wrapped; the only gaps are a cold start count race and metric inflation, neither crashes. |

## P0 (must before this 1.0.3 build)

None in code. One verification gate on the first TestFlight build (scene lifecycle is new native behavior):
* `apps/mobile/app.json` line 92. Why: scene support changes how iOS delivers URLs and the launch path. Verify on a
  real iPhone with the TestFlight build: cold start opens; Sign in with Apple; Google sign in returns to the app;
  tap `https://promovote.com/@haulingempire` in Notes with the app killed and with it in background (opens in app);
  daily reminder still fires. If any fails, do not submit for review.

## P1 (before public launch)

* `.github/workflows/android-build.yml` line 61: update `RELEASE_NOTES` to the 1.0.3 changes (calls without sign in,
  6 languages). Verify: the alpha track release notes in Play Console after the build.
* `apps/mobile/src/lib/guest-calls.ts` line 40 and `src/ui/PromoReel.tsx` line 132: await `load()` before the guest
  count check (for example make the check `await guestCallCount()` that calls `load()`). Verify: fresh install, call
  3 promos, kill the app, open and tap a 4th promo immediately; the sign in sheet must open.

## P2 (later)

* `apps/mobile/src/lib/install-source.ts`: skip the event when `Application.getInstallReferrerAsync` is not the first
  install (for example compare `Application.getInstallationTimeAsync()` with the update time, or only send when no
  older app key exists in SecureStore). Verify: update from a 1.0.2 build and check `app_events` gets no install row.
* `apps/mobile/package.json`: add `"test": "node --test tests/*.test.mjs"` so `node --test tests/` (a folder) is not
  used by mistake; it fails to find files today. Verify: `npm test` shows 3 passing tests.
