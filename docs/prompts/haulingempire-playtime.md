# Hauling Empire: time in game for the PromoVote admin

PromoVote admin (`/admin/hauling-empire/oyun`) now has an "Oyunda kalma" (time in game) section. It stays empty until the ops feed sends these fields. Please add them to `store-stats?feed=ops` (same key, same contract, nothing else changes):

1. `days[]` (per UTC day):
   * `avg_session_min`: average session length in minutes (number, 1 decimal is fine).
   * `median_session_min`: median session length in minutes.
   * `playtime_min`: total minutes played by all players that day.
   * `sessions` is already in the contract; keep it, it is used as the weight.
2. `session_length` (top level, last 7 days, session counts per bucket):
   `{ "days": 7, "lt1": 0, "m1_5": 0, "m5_15": 0, "m15_30": 0, "m30_60": 0, "gt60": 0 }`
3. `players.recent_7d[].playtime_min`: total minutes this player played in the 7 days.

Rules:
* A session starts when the game comes to the foreground and ends after 60 s in the background, on quit, or on crash (last heartbeat). Say in the reply which rule you used.
* Sessions shorter than 5 s are not counted (accidental opens).
* Test accounts and the founder's own devices are left out, like in the other numbers.
* Unknown values are `null`, never 0.

When it is live, reply with a sample response (no keys) so PromoVote can check the page.
