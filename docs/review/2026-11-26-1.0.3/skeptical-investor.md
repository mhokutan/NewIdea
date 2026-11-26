# Skeptical Investor review: PromoVote 1.0.3 (2026-11-26)

Role: Skeptical Investor / Devil's Advocate. Domain score: business value of this release.
Inputs: `docs/review/2026-11-26-1.0.3/brief.md`, `docs/00-idea-brief.md`, `docs/review/2026-11-10-fable-analysis.md`,
`docs/review/2026-11-17-mac-test/REPORT.md` and PNGs, `store/review-notes-1.0.3.md`, `apps/mobile/app.json`,
`apps/mobile/src/lib/guest-calls.ts`, `guest-sync.ts`, `gate.tsx`, `install-source.ts`, `src/ui/PromoReel.tsx`,
`src/app/(tabs)/index.tsx` (EndCard), `src/app/creator/[handle].tsx`, `src/app/upload.tsx`, `src/app/(tabs)/me.tsx`,
`src/lib/i18n.ts`, `services/api/src/index.js` (upload and PATCH handlers, APP_EVENTS), one fresh competitor search.
Strategy is not reopened; this judges execution. Legal notes are not legal advice.

## Kurucuya kısa özet (Türkçe)

1.0.3 doğru sürüm: en büyük sorun "kimse tahmin yapmıyor" idi (Fable analizi: 30 günde gerçek kullanıcıdan 1 kişi, 3 tahmin) ve bu sürüm onu doğrudan hedefliyor. Girişsiz 3 tahmin iyi yazılmış (24 saat sınırı, tekrar deneme, çift gönderim yok), Android kurulum kaynağı Hauling Empire kartını ölçecek. Xcode 27 açılmama hatası (UIScene) düzeltilmiş. Ama iki şey bu sürümün kendi ana özelliğini zayıflatıyor: Drop sonundaki kart misafire hâlâ "Tahmin yapmak için giriş yap" diyor (artık yanlış) ve misafire günlük hatırlatma hiç önerilmiyor, yani tahmin yapan ama giriş yapmayan kişiyi geri getirecek hiçbir şey yok. Girişsiz akışın 2. ile 5. adımları gerçek telefonda hiç denenmedi. Üretici tarafında yükleme sağlam ama "düzelt" modunda buton ve dil değişikliği sessizce kayboluyor, tanıtım başına istatistik yok. Asıl şirket riski değişmedi: tüm içerik kurucuya ait, dışarıdan üretici 0. Bu yüzden tutunma ve oturum süresi kod ile 8 olamaz; gerçek içerik ve gerçek kullanıcı ister.

## 1. Scores

Expert A: skeptical early stage investor. Angle: does 1.0.3 give a user a reason to come back, and is it clearly its own product.
Expert B: creator economy expert. Angle: is the creator side (page, upload, studio stats, gifts) worth a small creator's time.

| Area | A (investor) | Evidence A | B (creator economy) | Evidence B |
|---|---|---|---|---|
| Retention | 6 | Guest calls fix activation, but a guest who does not sign in gets no result, no reminder (EndCard hides the reminder when `guest`, `index.tsx` line 284) and an end card that says "Sign in to make your calls", so nothing brings the new cohort back; real calls to date are near zero. | 5 | A creator has no weekly reason to open the studio: totals only, no per promo stats, the scout verdict waits for 30 calls (`calls_wait`) and no outside creator exists yet. |
| Session time | 6 | Drop, Keep watching and Duel are the right shape, but every promo is the founder's own (the 1.0.3 review notes say so), so the pool repeats within days. | 6 | Creator pages are a clean grid with views and pinned tiles, but 3 to 5 founder brands cannot hold a session. |
| Originality | 8 | Call bar, ticket with result date, scout strip, Drop progress and now a call in the first 10 seconds without a sign in wall read as its own product, not TikTok. | 7 | Calls as a public total and the dashed gift card are ours; the studio stat grid and link in bio page are standard patterns. |
| Trademark and trade dress | 7 | No copied labels or rails remain, but the USPTO knockout search for PromoVote (classes 35, 42) is still not on file (CLAUDE.md), so I hold at 7. | 8 | Creator page, gift card and upload form use generic layouts, own colors and no third party marks. |
| Domain: business value of this release | 6 | The right release (activation plus measurement: `guest_first_call`, `guest_sync`, `install_from_he` are in API `APP_EVENTS`), but its value is only as good as the test it enables, and the guest end card and missing guest reminder blunt it. | 6 | Upload pipeline is solid (quota, review queue, fix and resend, AI label, rights), gifts work, but fix mode silently drops CTA and language changes and stats stop at totals. |

## 2. What 1.0.3 gets right (and why it matters for the money)

* It attacks the right number. The Fable analysis found 49 app opens, 19 sign in views and 3 calls from one person in 30 days. Calls without sign in move the first call before the sign in wall; that is the activation fix the funnel needed.
* The guest code is careful: 24 hour expiry so nobody waits for results before keeping a call, single flight sync, retry only on non final errors, pure parts tested (`guest-sync.ts`).
* Install source on Android plus the App Store campaign gives the first honest read on whether Hauling Empire players convert into PromoVote scouts. That is a real distribution test with no ad spend.
* The Xcode 27 UIScene launch blocker from the Mac test is fixed (`app.json` `expo-build-properties.ios.enableSceneSupport: true`), and most of the Mac test truncations are fixed in i18n.

## 3. The fatal flaw is still supply, not code

`store/review-notes-1.0.3.md`: "Every promo in this build belongs to the developer's own products." That sentence is true and it is the company risk. The prediction game needs fresh outside promos to call early; with 3 to 5 founder brands, results resolve on founder content judged by a handful of scouts. Competitor check today: the consumer "call it early" space is still empty; what grew in 2026 is AI "viral score" tools for creators (PreViral, Viral Validator, VidScore and similar App Store apps), which compete for the same small creator budget our paid Trailer Test wants, and are criticized for scores that mean nothing. Our answer has to be real human calls on real outside promos.

What would need to be true: at least 12 outside creators posting, a new promo in Today's Drop every day for 7 days, and at least 30% of first session users making a call.

## 4. Changes to bring scores to 8

### P0 (before this TestFlight / closed testing build)

| # | What | File | Why | Verify |
|---|---|---|---|---|
| P0.1 | Change the guest end card line: it says "Sign in to make your calls" in all 6 languages, but guests can now call. Use the guest call count: "You made {n} calls. Sign in to keep them; results in 7 days." | `apps/mobile/src/lib/i18n.ts` `drop_done_guest` (en line 60 and the 5 other languages), `apps/mobile/src/app/(tabs)/index.tsx` EndCard line 289 | It contradicts the headline feature of the build under test and teaches testers the wrong rule. | Fresh install, 2 guest calls, finish the drop: card shows the count and "keep", in en and tr. |
| P0.2 | Run the untested guest flow on a real phone: 3 calls, "Keep your calls" sheet, 4th call asks sign in, app restart keeps tickets, Apple or Google sign in as scout syncs the calls, and sign in as a creator does not crash or show stale tickets. | Mac test section 2 steps 2 to 5; `guest-calls.ts`, `gate.tsx` | This is the whole point of 1.0.3 and it was never run past call 1 (`docs/review/2026-11-17-mac-test/REPORT.md`). | `app_events` shows `guest_first_call`, `guest_call`, `guest_sync` from the test device; synced calls appear under Profile, Calls. |

### P1 (before public launch; P1.1 also before the 1.0.3 store submission)

| # | What | File | Why | Verify |
|---|---|---|---|---|
| P1.1 | Fix the review note line "user video upload is not open to the public in this version": any account can pick Creator in onboarding and submit an upload (`POST /v1/me/promos` only needs a creator profile). Either say "uploads go to a manual review queue and never publish automatically" or gate upload by invite. | `store/review-notes-1.0.3.md`, `services/api/src/index.js` line 970, `apps/mobile/src/ui/Onboarding.tsx` | A false statement in review notes is a worse risk than the feature itself. | Note matches what a fresh account can do. |
| P1.2 | Offer the local daily reminder to guests who made at least one call. | `apps/mobile/src/app/(tabs)/index.tsx` EndCard line 284 (`if (guest ...) return`) | The guest cohort is the one 1.0.3 creates; without a trigger they never see a result or a new drop. | `reminder_on` events from guests; D1 return of guests who called. |
| P1.3 | Fix mode drops the main button and language: the screen lets the creator change them, but `api.updatePromo` sends only title, description and AI, and the PATCH handler ignores the rest. Send and accept `ctaKind` and `lang`, or hide those pickers in fix mode. | `apps/mobile/src/app/upload.tsx` line 102, `apps/mobile/src/lib/api.ts` line 131, `services/api/src/index.js` line 914 | A rejection for a wrong button cannot be fixed, and the creator is told nothing. | Reject a test upload, change the button in fix mode, resend: the review queue shows the new button. |
| P1.4 | Per promo stats in the studio (views, completion, calls count per promo) under each tile. | `apps/mobile/src/app/(tabs)/me.tsx` CreatorHome grid, `/v1/me/studio` | Totals alone give a creator no reason to return or to post a second promo, which is the verdict's stage 2 gate. | Studio tile shows views and calls; second promo rate measured. |
| P1.5 | Show upload errors in the user's language: `setErr(e.message)` shows the server's English text. Map `upload_limit`, `too_many_drafts`, `cta_link_missing`, `bad_title` to i18n keys. | `apps/mobile/src/app/upload.tsx` line 110 | 5 of 6 app languages get English errors at the most fragile creator moment. | Trigger `cta_link_missing` in tr: Turkish text. |
| P1.6 | Real supply: 12 outside creators, 40 promos, mostly indie games, with written permission. | Outreach, creator onboarding | Session time and Retention cannot reach 8 on founder content. | A new promo in Today's Drop every day for 7 days. |
| P1.7 | USPTO knockout search for PromoVote (classes 35, 42). | Founder or lawyer | Trademark stays at 7 without it. | Written result on file. |

### P2 (later)

* Upload progress bar and Android on device compression (`upload.tsx`, already in `docs/07-todo.md`).
* Weekly creator summary in Activity pushed as a local or server notification ("12 scouts called your promo this week").
* Leftover truncations from the Mac test: fr `share` "Partager", es `save` "Guardar" on iPhone SE; check on device.

Only real content and real users can close Retention and Session time to 8 (P1.6); P0 and P1.1 to P1.5 are code or copy and small.

## 5. Would I invest at pre-seed?

No, not today. 1.0.3 is a well built activation experiment, but there is still no demand proof on either side: near zero real calls, zero outside creators, and every promo is the founder's. I am not funding code quality; I am funding evidence that strangers come back to call, and that creators post twice.

What would change my mind (the Fable targets, made strict):
1. 100 new installs from 1.0.3, of which at least 30% make a guest call and at least 10% sign in to keep them.
2. At least 25% of callers who signed in return on their result day.
3. 12 outside creators live, at least 40% posting a second promo within 30 days.
4. `install_from_he` shows Hauling Empire players convert at a measurable rate, which would make the founder's own games a real, free distribution channel.

Hit 1 and 3 and I take the meeting for a small pre-seed; add the verdict's week 12 money gate (50 paying developers, about $2,000 per month) and I would lead.

## Sources

* [PreViral (GetApp)](https://www.getapp.com/all-software/a/previral/)
* [Viral Validator (TrustMRR)](https://trustmrr.com/startup/viral-validator?metric=mrr)
* [VidScore AI: Viral Analytics (App Store)](https://apps.apple.com/us/app/-/id6756249746)
* [Viral AI: AI Creator Toolkit (App Store)](https://apps.apple.com/app/id6749170075)
