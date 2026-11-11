# Hauling Empire: all time totals in the players list (2026-11-11)

Prompt for the Hauling Empire session. The admin panel already shows these columns as soon as the feed sends them.

```
PromoVote admin panel request, small and read only for players. In store-stats feed=ops, players.recent_7d[] today has days_active, sessions and playtime_min counted only inside the last 7 days, so "active days" can never go above 8 and the founder thinks it is wrong. Keep those three fields exactly as they are, and add three all time fields to every recent_7d row:
- days_active_total: number of distinct UTC days the player was active since their first session,
- sessions_total: all sessions since the first session,
- playtime_min_total: all minutes played since the first session (same rules as playtime_min: sessions under 5 s left out).
Same player filter as today (no bots, no testers). Use the 90 day cache or a small per player summary table so the ops job does not get slower (remember the 7 Nov outage); measure the job time before and after and tell me. Do not change any other field. Tell me when it is live; no new app build is needed.
```
