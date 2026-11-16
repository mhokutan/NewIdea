# Desktop task: connect TikTok to the PromoVote admin page and send 5 drafts

Hazım asked for this (2026-11-16). Work in his browser. Talk to him in simple Turkish, no dashes.

## Rules
- Never type, copy or show any password or secret yourself. If a login asks for a password or code and the browser does not fill it, stop and ask Hazım to type it.
- Do not change any setting in the TikTok developer portal or in Cloudflare.
- If something looks different from below, stop and ask Hazım.

## Steps
0. (Good to have) Record the screen (macOS Cmd+Shift+5 > Record Entire Screen) for steps 1 to 4, save it on the Desktop as `tiktok-sandbox-demo.mp4`. TikTok needs it for the app review later.
1. Open https://promovote.com/admin/tiktok
   - Cloudflare Access asks for an email: founder@promovote.com. The code arrives in Hazım's Gmail (read it in a new Gmail tab or ask him).
   - Then the browser asks for the admin username/password: ask Hazım to type it.
2. Press **"Test hesabıyla bağla (sandbox)"**. TikTok login opens: sign in with the TikTok account **promovote** (ask Hazım if it is not signed in). On the permission screen press Authorize / Continue. Back on promovote.com/admin/tiktok it should say "TikTok hesabı bağlandı" and the card shows "Bağlı".
3. In **"Yeni TikTok paylaşımı"** send these 5 videos one by one with **"Taslak olarak gönder (TikTok gelen kutusu)"**. Leave "Kim görebilir" empty. Tick "Bu video kendi ürünümü tanıtıyor (Your brand)". After each one the page should say "Video TikTok gelen kutuna gönderildi".

| Video in the list | Caption |
|---|---|
| @haulingempire: You don't drive. You run the company. | You don't drive. You run the company. Start with one van, plan routes on land and sea, hire your team. Search Hauling Empire on the App Store or Google Play. #mobilegames #tycoon #indiedev |
| @dropolis: One parcel shop. One day, Mars. | One parcel shop. One day, Mars. Pack orders, send couriers to every door, grow a tiny town into a colony on Mars. Search Dropolis on Google Play. #citybuilder #mobilegames #indiedev |
| @dovelet: Their note on your home screen | Far apart? Their note, on your home screen. One touch buzzes their phone, shared photos on both widgets, no location tracking. Search Dovelet on Google Play. #longdistance #couples |
| @poleris: Two minutes a day for your intention | Two minutes a day for your intention. Write it, read it, give thanks, see it. 21 day journey, box breathing, guided meditation. Search Poleris on the App Store. #manifestation #selfcare |
| @nicheable: Plan it. Track it. Done. | Plan it. Track it. Done. E-Ink planners, a college grade tracker and a rental tax tracker. Find Nicheable on Etsy. #digitalplanner #productivity |

4. Scroll to "Gönderilenler", reload once: rows should say "TikTok gelen kutusunda" or "Yükleniyor".
5. Report to Hazım in short Turkish (he pastes it to the cloud Claude): connected yes/no and the account name shown, each of the 5 videos sent yes/no with any error text exactly as shown, recording saved yes/no.
