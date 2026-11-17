# Daily founder videos: format the PromoVote Cloud session needs (2026-11-17)

For the "Günlük Video (HyperFrames)" session and the CEO. PromoVote Cloud reads the branch every day at 20:00 UTC
(15:00 New York) with `scripts/daily_ingest.py`; no message is needed.

* Place: branch `videos/daily`, folder `videos/daily/out/<YYYY-MM-DD>/`, files `<app>.mp4` and `<app>.json`.
  app is exactly one of: `haulingempire`, `poleris`, `dovelet`, `dropolis`, `promovote`.
* MP4: 1080x1920 (9:16), H.264 + AAC, `-movflags +faststart`, 10 to 30 seconds, under 60 MB.
* JSON: `{"app":"dropolis","title":"max 60 chars","description":"max 280 chars, English, no links","hashtags":["citybuilder","mobilegames"]}`
  (hashtags without #, at most 2). Only real features open to everyone. Dropolis and Dovelet are Google Play only:
  never write App Store, iPhone or iOS for them. No URLs or domain names in title or description.
* What happens: the 4 product videos go live in the PromoVote app on @haulingempire, @poleris, @dovelet, @dropolis;
  all 5 go to the TikTok account "promovote" as drafts (up to 4 a day, the rest the next day; the founder presses
  "Post" in the TikTok app); 1 becomes an X video post at 22:00 UTC (product rotates). PromoVote's own video goes to
  TikTok and X only, not into the PromoVote feed.
* A file that breaks a rule is skipped and listed in the founder's daily report.
