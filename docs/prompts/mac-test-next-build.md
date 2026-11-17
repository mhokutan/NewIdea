# Mac test before the next PromoVote build (2026-11-17)

For the founder's desktop Claude on the Mac. Talk to Hazım in simple Turkish, no dashes.

## Rules
- Test only. No EAS build, no store upload, never write `[build ios]`, `[build android]` or `[play ...]` in a commit.
- Never print or copy secrets or passwords. If a sign in asks for a password or code, ask Hazım to type it.
- Push only to branch `claude/gracious-pasteur-nu8ssc` (never main), and only the report and screenshots below.

## 0. Setup
```bash
cd ~/NewIdea 2>/dev/null || git clone https://github.com/mhokutan/NewIdea ~/NewIdea && cd ~/NewIdea
git fetch origin claude/gracious-pasteur-nu8ssc && git checkout claude/gracious-pasteur-nu8ssc && git pull
cd apps/mobile && npm ci
npx tsc --noEmit && npx expo lint          # both must pass
npx expo run:ios                            # local development build on the iOS simulator (iPhone SE and a Pro Max)
npx expo run:android                        # local build on an Android emulator, if Android Studio is installed
```
If a step fails, write the exact error in the report and continue with what works.

## 1. New languages (pt Brazil, de, fr; also check es and tr still look right)
Open the app in each language:
- iOS: `xcrun simctl launch booted com.miapera.promovote -AppleLanguages "(de)" -AppleLocale de_DE` (then fr, pt-BR).
- Android 13+: Settings > Apps > PromoVote > Language, or switch the emulator language.
On each language, on the small iPhone (SE) and a big one, open: Today's Drop, a reel with the call bar
(Not for me / Will blow up), the call ticket after a call, Explore, Duel, the Me tab, Sign in, onboarding, the upload
screen (language pills) and every sheet that opens (sign in sheet, "Keep your calls" sheet).
Check: no text cut off or overflowing a button, no English left (brand names like PromoVote, App Store, Scout Score
are fine), dates look normal. Screenshot every screen with a problem, and one good screen per language.

## 2. Calls without sign in (new)
Delete the app first (fresh install), do not sign in:
1. Make 3 calls on 3 different reels: each turns into a call ticket, no sign in asked.
2. After the 3rd call a sheet "Keep your calls" appears (in the phone language). Press "Not now".
3. 4th call: the normal sign in sheet appears.
4. Close the app fully and open it again: the 3 calls are still shown on those reels.
5. Sign in as a scout (Apple or Google; Hazım picks the account and types any password), finish onboarding if asked:
   the 3 calls must now be in the account (Me tab / activity shows them) and the call you tapped in step 3 too.
Report each step as OK or what happened.

## 3. Quick regression
Videos play and swipe smoothly, sound on/off, Duel tab picks work, a promo watched to the end does not restart oddly,
creator page opens from a reel. On Android a store button shows on reels; on iPhone it does not (only on the creator page).

## 4. Report
Write `docs/review/2026-11-17-mac-test/REPORT.md` (short, Turkish): setup result, then sections 1 to 3 with OK or the
problem, the i18n key or screen for each text problem and a shorter text suggestion. Put screenshots in the same folder
(PNG, under 1 MB each). Then:
```bash
cd ~/NewIdea && git add docs/review/2026-11-17-mac-test && git commit -m "Mac test report before the next build" && git push origin claude/gracious-pasteur-nu8ssc
```
Tell Hazım in 3 lines: passed or not, the worst problem, and that the report is pushed.
