# Metrics hub: one admin for every product (draft, 2026-10-12)

Founder question: PromoVote, Hauling Empire and Poleris all have App Store and Google Play pages, and later each may get its own social accounts. How do we keep the stats apart and in one place?

## 1. Admin layout: product first, then source
* Top: a product switcher: PromoVote, Hauling Empire, Poleris, Nicheable (and any future product).
* Under it, tabs for that product: Overview, App Store, Google Play, Social (X now, later TikTok, Instagram, YouTube, Kick), Website (visitors, only for products with a site).
* Overview = one plain Turkish card per product: "Last 7 days: 40 downloads (+25%), 12 new players, rating 4.6, top post 210 views".
* URL shape: /admin/p/<product>/<source>, for example /admin/p/haulingempire/app-store. Today's pages stay as PromoVote's tabs.

## 2. Data model: one long table, no new columns per platform
* products: id (promovote, haulingempire, poleris, nicheable), name, apple_app_id, play_package, website, active.
* product_accounts: product_id, network (x, tiktok, instagram, youtube, kick, etsy), handle, connected_at. Tokens never in this table (see 4).
* metrics_daily: product_id, source (app_store, google_play, x, game_server, website...), date (UTC), metric (downloads, page_views, new_players, d1, d7, crash_rate, anr_rate, rating_avg, impressions, likes, followers...), value, updated_at. Primary key (product_id, source, date, metric). Late data (Apple is 1 to 2 days behind) simply overwrites the row.
* Adding a new product or platform = new rows, not new code in the database.

## 3. Who collects what
* Store stats: one collector for all apps. The founder's Apple account and Google Play account own all the apps, so one App Store Connect API key and one Google Play service account can read every app, keyed by app id or package name. Best place: a daily cron in the PromoVote API Worker (it already has Play access for builds). This avoids building the same Apple and Google code in every project.
* Product-only numbers (Hauling Empire new players, D1, D7 from its game server; Poleris in-app numbers): each product pushes a small daily summary to one PromoVote ingest endpoint.
* Ingest endpoint rules: one key per product, stored hashed, write only, can only write its own product_id, only daily totals (no personal data), rate limited, values validated (numbers, known metric names, last 400 days only).
* Social: each product's own accounts. For X one developer app can post for many accounts; each account needs its own access token (stored as an encrypted secret, not in the table). social_posts gets an account column so the queue and the stats are split per account.

## 4. Security
* Keys and tokens live only as Worker secrets or encrypted columns, never in git, never in the browser.
* The admin stays behind the admin password; it only reads.
* Each product key can be revoked alone.

## 5. Order of work (suggested)
1. products + metrics_daily tables, ingest endpoint, product switcher in admin (PromoVote data moves under "PromoVote").
2. Hauling Empire pushes its game server numbers (its session already plans this; change the plan from "we pull your endpoint" to "you push to ours").
3. Central store collector: Google Play first (service account exists), then App Store Connect (needs an API key with the right role created by the founder).
4. Social accounts per product when the founder opens them.
