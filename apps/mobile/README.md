# PromoVote mobile app (iOS and Android)

Expo SDK 57, Expo Router, expo-video. Talks to the API at https://api.promovote.com (`services/api`).

## Screens
* Feed (`src/app/(tabs)/index.tsx`): full screen vertical promos, same fair rotation as the website (`src/lib/fair-queue.ts`). Views count after 3 seconds.
* Explore (`src/app/(tabs)/explore.tsx`): search, creator circles, category pills, hashtags, two column masonry grid (docs/04 section 2.1).
* Profile tab (`src/app/(tabs)/me.tsx`): guest card, onboarding (scout or creator, username, birth date, 18+), sign out, delete account (Apple 5.1.1(v)).
* Creator profile (`src/app/creator/[handle].tsx`) and email code sign in (`src/app/sign-in.tsx`).
* Strings in English, Spanish and Turkish (`src/lib/i18n.ts`), device language first.

## Run and build
```bash
npm install
npx expo start                       # dev server (needs a development build, see below)
npx tsc --noEmit && npx expo lint    # checks before every commit
npx eas-cli@latest build --profile development --platform ios       # dev build for an iPhone
npx eas-cli@latest build --profile preview --platform android       # installable APK
npx expo run:android                 # local Android build on a computer with Android Studio
```
expo-video, SecureStore and in-app purchases need a development build, not Expo Go.
Bundle id and package: `com.miapera.promovote`.
