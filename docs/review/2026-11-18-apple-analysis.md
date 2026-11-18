# PromoVote: Apple compliance analysis (2026-11-18)

Requested by the founder through the CEO. Read only, written by a Fable 5.2 helper, checked by PromoVote Cloud. No code changed.

## Summary
* iPhone Duo (foldable) is real: Apple Tech Talk "Prepare your app for iPhone Duo" and a DTS lab. Fold/unfold is a live resize. Our layout is reactive (no module level Dimensions), videos do not restart, but the reel list can rest between two items after a fold.
* Siri AI Developer Preview is real (Apple news 2026-11-03): App Intents, Xcode and internal TestFlight only, App Store submission "in spring"; Turkish "coming soon"; not in the EU.
* iOS 27 SDK required for uploads from April 2027; apps built with it must adopt UIScene.

## 1. Foldable
| Item | Today | To do | Effort |
|---|---|---|---|
| Reel paging `src/app/(tabs)/index.tsx:189,215,218` and `src/app/play/[handle].tsx:44,53,56` | Offset stays at old height x index after a resize | `scrollToIndex(active, animated:false)` on height change | 0.5 day |
| Reel video `src/ui/PromoReel.tsx:43,201,210` | No restart; wide screen gives big blurred side bars | Cap reel width or add a side panel | 2 to 3 days |
| Duel `src/ui/DuelView.tsx:89-95,113` | Survives; stacked videos crop hard on a wide screen | Side by side above about 600 width (like the web) | 1 day |
| Grids (explore, me, creator, Sheet) | Reactive | Check column count when open | 0.5 day |

## 2. Siri App Intents
| Intent | EN / TR | Data | Effort |
|---|---|---|---|
| Open Today's Drop | "Show today's drop in PromoVote" / "PromoVote'ta bugünün drop'unu göster" | opens feed | 2 to 3 days for the 3 open intents |
| Open Duel | "Open the duel" / "Düelloyu aç" | opens /duel | included |
| Explore search | "Find game trailers in PromoVote" / "PromoVote'ta oyun fragmanı bul" | opens /explore | included |
| Scout Score (spoken) | "How is my Scout Score" / "Kaşif puanım kaç" | /v1/me/scout, signed in | 3 to 4 days more (shared keychain for the auth token) |
| My calls | "What happened to my calls" / "Tahminlerime ne oldu" | /v1/me/activity, signed in | shared with the row above |
Expo SDK 57: local config plugin with Swift intents; SDK 58 has expo-app-intents (alpha). Needs an iOS build to test.

## 3. iOS 27 gaps
| Item | Today | To do | Effort |
|---|---|---|---|
| iOS 27 SDK from April 2027 | Expo SDK 57 | Move to SDK 58 or build with Xcode 27 | 2 to 4 days |
| UIScene required | Scene support off (`app.json`) | `ios.enableSceneSupport`, retest Apple/Google sign in and deep links | 1 day |
| Liquid Glass opt-out ignored | Native tabs | Check tab bar over video | 0.5 day |
| New age rating questions, due 2027-01-12 | Not answered | Answer in App Store Connect (PromoVote: Shared Location no, Dating no; Dovelet needs care) | 10 minutes |
| Account deletion | Present | Nothing | 0 |

## Top 5
1. Age rating questions before 2027-01-12 (all founder apps).
2. Reel offset fix on resize (also helps Android foldables).
3. Expo SDK 58 with UIScene in January or February, before April.
4. Duel side by side on wide screens.
5. Three open-app Siri intents; spoken Scout Score later.

Sources: developer.apple.com/news?id=gdk2umrf, developer.apple.com/forums/thread/847644, developer.apple.com/videos/play/tech-talks/111461/, devclass.com (2026-09-16), developer.apple.com/news/?id=yxkh08us, expo.dev/changelog/sdk-58.
