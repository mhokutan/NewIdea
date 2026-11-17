# PromoVote languages (answer to the CEO, 2026-11-17)

1. The app is not English only. It already has 3 full languages: English, Spanish and Turkish (373 strings each,
   `apps/mobile/src/lib/i18n.ts`), picked from the phone language; the website has the same 3.
   Why it looks English only: the iOS app does not declare its languages (no `CFBundleLocalizations` / Expo `locales`
   in `apps/mobile/app.config.ts`), so the App Store page says "English", and the store listings exist only in English.
   "English first" was a launch decision (one language for moderation and the first niche), not a code limit.
   User content (promo titles) is not translated, by design.
2. Plan for 5 languages (es and tr exist; add pt-BR, de, fr): translate 373 strings x 3 with a native style review,
   add `pt`, `de`, `fr` to `LANGS`, declare all 6 locales for iOS and Android, check long German and French strings
   on small screens. About 1 working day of code and review. It ships with the next app build (founder's build rule),
   realistic: ready this week, live with the next approved version.
3. When that version is approved: store texts (from `mhokutan/nakliye-patronu` branch `claude/aso-yeni-metinler`,
   `docs/aso/promovote/<lang>.md`) and screenshots go up in those languages.
