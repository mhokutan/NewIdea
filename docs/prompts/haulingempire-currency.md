# Hauling Empire: sales in local currency for the PromoVote admin (2026-10-17)

Paste this into the Hauling Empire session.

The PromoVote admin shows a GBP purchase of the Pro membership only as "$6.63". The founder wants to see what the buyer actually paid. Please change the `store-stats?feed=ops` response (same key, same endpoint):

1. In `sales.by_product_30d[]` add `local`: a list of what buyers paid in their own currency, summed per currency, for example
   `"local": [{"currency": "GBP", "amount": 4.99}, {"currency": "USD", "amount": 9.98}]`
   (ISO 4217 codes, amounts as numbers, test purchases excluded as today).
2. Keep `usd` as the dollar total, and write in one line how it is converted: the store's own USD (Apple proceeds or Google payout) or a daily exchange rate. Say whether it is the price the buyer paid (gross) or what the developer receives after the store's cut (net). Gross is preferred for the `usd` field; if net, add `usd_net` beside it instead of changing `usd`.
3. Same for `sales.days[]` if it is easy: `apple_local` and `google_local` with the same shape. Not required.

The admin already reads `local` and shows it in a new "Ödenen (yerel)" column; until the feed sends it the column says "gelmiyor".
