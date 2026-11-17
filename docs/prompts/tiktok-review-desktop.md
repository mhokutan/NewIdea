# Desktop task: record the TikTok demo and send the app for TikTok review (2026-11-17)

Hazım asked for this. Work in his browser on the Mac. Talk to him in simple Turkish, no dashes.
Goal: once TikTok approves the app "PromoVote", the cloud Claude can post videos publicly by itself.

## Rules
- Never type, copy or show a password, code or secret yourself. When a login asks, ask Hazım to type it.
- Do not change settings in Cloudflare. In the TikTok developer portal change only the App review video (and press Submit at the end).
- If something looks different from below, stop and ask Hazım.

## 1. Start the screen recording
macOS: Cmd+Shift+5 > Record Entire Screen (or the browser window only). Keep it under 3 minutes. Close other tabs with private data first.

## 2. Show the whole flow (slowly, 2 to 3 seconds on each screen)
1. Open https://promovote.com/admin/tiktok (Cloudflare asks for founder@promovote.com, the code is in Hazım's Gmail; the admin password: Hazım types it).
2. The page shows the connected account. Press **"Bağlantıyı kes"** (disconnect).
3. Press **"Test hesabıyla bağla (sandbox)"**. The TikTok login and permission screen opens: sign in with the TikTok account **promovote** (Hazım types the password if asked), show the permission list for 3 seconds, press **Authorize**.
4. Back on the page: "TikTok hesabı bağlandı", card shows "Bağlı".
5. In **"Yeni TikTok paylaşımı"**: pick a video from the list, type a caption (for example: `One parcel shop. One day, Mars. #citybuilder`), in "Kim görebilir" choose **Sadece ben** (the only choice in sandbox), tick "Bu video kendi ürünümü tanıtıyor", show the line about Music Usage Confirmation, then press **"Doğrudan paylaş"**.
6. The page says the video was sent. Scroll to **"Gönderilenler"**, reload after 30 to 60 seconds until the row shows "Paylaşıldı" (or "İşleniyor").
7. Open https://www.tiktok.com in a new tab (signed in as promovote), go to the profile and show the new private video.
If a step shows an error, keep recording, then stop and tell Hazım the exact error text.

## 3. Stop and save
Stop the recording. Save it on the Desktop as `tiktok-review-demo.mov` (under 50 MB; if bigger, export at 1080p in QuickTime: File > Export As > 1080p).

## 4. Put it in the TikTok app review and submit
1. https://developers.tiktok.com > profile icon > Manage apps > PromoVote (Production, not Sandbox).
2. App review section: remove the old demo video (flow-preview) and upload `tiktok-review-demo.mov`. Keep the explanation text as it is.
3. Check once: Login Kit and Content Posting API added, Direct Post on, scopes user.info.basic, video.upload, video.publish, redirect URI https://promovote.com/admin/tiktok/callback, Terms https://promovote.com/terms, Privacy https://promovote.com/privacy.
4. Press **Submit for review**.

## 5. Report to Hazım (short Turkish, he pastes it to the cloud Claude)
Recording done yes/no and its length, direct post worked yes/no (or the exact error), video replaced yes/no, submitted for review yes/no and the status the portal shows now.
