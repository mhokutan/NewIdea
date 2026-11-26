# Dropolis API

Base URL: `https://dropolis-api.promovote.com` (Cloudflare Worker `dropolis-api`, D1 `dropolis-db`, Durable Object
`Presence`). Code: `src/index.js`, schema: `migrations/`. Deploy: `npx wrangler deploy` in this folder; migrations:
`npx wrangler d1 migrations apply dropolis-db --remote`. Admin view: promovote.com/admin/dropolis/oyun.

All bodies are JSON. Auth is a bearer token: `Authorization: Bearer <token>`. CORS is open (no cookies), so the
Capacitor app (`capacitor://localhost`, `https://localhost`) can call it directly. Rate limit: 120 requests a minute
per IP. Errors: `{ "error": { "code", "message" } }`.

## Auth
| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/v1/auth/guest` | `{ deviceId }` | `{ token, user }` new guest; the same `deviceId` gets its old guest back if it never linked Apple/Google |
| POST | `/v1/auth/apple` | `{ idToken, nonce?, deviceId? }` + guest token if any | `{ token, user, switched }` |
| POST | `/v1/auth/google` | `{ idToken, nonce?, deviceId? }` + guest token if any | `{ token, user, switched }` |
| POST | `/v1/auth/logout` | | `{ ok }` |

Linking rules: called with the guest's token and an Apple/Google account seen for the first time, that account is
linked to the guest (`token` is `null`, keep the current one; progress stays). If that Apple/Google account already
belongs to another player, the call signs in to that player: `token` is the new token and `switched` is `true`
(ask the player first; the guest on this phone is left as it was). ID tokens are checked against Apple's and
Google's public keys; audiences are the public vars `APPLE_AUDIENCES` (`com.promovote.dropolis`) and
`GOOGLE_CLIENT_IDS` (web, Play App Signing, Android upload key, Android debug key from the Google Cloud project "dropolis"; the token `aud` is the web client id).

## Player
| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/v1/me` | | `{ user: { id, name, avatar, country, createdAt, linked: ["apple"] } }` |
| PATCH | `/v1/me` | `{ name?, avatar?, country? }` | `{ user }` (name 24 chars, avatar `[a-z0-9_-]`, country ISO 2 letters) |
| DELETE | `/v1/me` | | `{ deleted: true }`: player, save, scores, events, sessions deleted at once (App Store 5.1.1(v)) |

## Cloud save (one per player, up to 128 KB)
| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/v1/save` | | `{ data, version, updatedAt }` (`data: null, version: 0` when empty) |
| PUT | `/v1/save` | `{ data, version, force? }` | `{ version, updatedAt }`; 409 `version_conflict` with `server` copy when `version` is not the server's |

Send the `version` you last got. On 409 show "use cloud or this phone?" and resend with the chosen data and
`force: true`.

## Leaderboards
| Method | Path | Body / query | Returns |
|---|---|---|---|
| POST | `/v1/scores` | `{ scores: [{ board, value }] }` or `{ board, value }` | `{ ok, week }`; best value kept for all time and the current week (Monday UTC) |
| GET | `/v1/leaderboard/:board` | `?period=week|all&limit=50` | `{ top: [{ rank, value, name, avatar, country, me }], me: { rank, value } }` |

Boards: `city_level`, `deliveries`, `colonists`. Send scores when they change or at session end, not every frame.

## Events and online
| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/v1/events` | `{ events: [{ name, at?, props? }] }` up to 200 events, 64 KB | `{ ok, stored }` (one database row per batch) |
| POST | `/v1/presence` | | `{ ok }` heartbeat every 5 minutes while the game is open |
| GET | `/v1/online` | | `{ online }` players seen in the last 6 minutes (public) |

Event names: lowercase `snake_case`. The admin panel reads: `session_start`, `session_end` (`props.seconds`),
`tutorial_step` (`props.step`, a number from 1), `mission_done`, `level_up` (`props.level`), `first_rocket`.

## Friend invites (2026-11-04)
The server is the ledger: the game shows only what these endpoints return. Every grant is written to
`referral_ledger` (who, because of whom, coins, gems, when).

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/v1/referral` | | `{ code, link, invited, canRedeem, pending: [{ id, friendName, coins, gems }] }` (code made on first call) |
| POST | `/v1/referral/redeem` | `{ code }` | `{ coins: 0, gems: 10 }` |
| POST | `/v1/referral/progress` | `{ milestone: "chapter1" }` | `{ created }`; 404 `not_invited` for a player who used no code; a second call creates nothing |
| POST | `/v1/referral/claim` | `{ id }` | `{ coins: 500, gems: 20 }`; 409 `already_claimed`; 404 for another player's reward |

* Codes: 7 characters from `A-Z` and `2-9` without `0 O 1 I`, unique per player.
* Link: `https://dropolis.promovote.com/i/<code>`: landing page with the code and both store buttons; the Google Play
  button passes `referrer=code=<code>` (read it with the Play Install Referrer API to prefill the code).
* `canRedeem`: never redeemed, this device never redeemed, account younger than 7 days.
* Redeem errors: 404 `unknown_code`, 400 `own_code`, 409 `already_redeemed`, 403 `too_old`, 409 `device_used`,
  400 `mutual` (a player cannot redeem the code of someone they invited), 400 `device_required`.
* Limits: at most 50 invite rewards per inviter (after that `progress` answers `{ created: false, reason: "inviter_cap" }`);
  one redeem per device (stored as a SHA-256 hash, kept after account deletion).
* Analytics: the server writes `referral_redeem` and `referral_claim` events. Admin: promovote.com/admin/dropolis/oyun, "Davetler".

## Test accounts (2026-11-14)

Founder decision: test accounts are flagged, never deleted. `users.is_test` (migration `0003_is_test.sql`, applied on
the live dropolis-db on 2026-11-14) becomes 1 when `POST /v1/auth/guest`, Apple / Google sign in or any authenticated
request carries the header `X-Dropolis-Test: 1` or a `HeadlessChrome` User-Agent. It never goes back to 0. Automated
tests should always send `X-Dropolis-Test: 1`.

Test players can play normally, but they are left out of: leaderboard tables and everyone's rank (a test player still
sees its own value), the invite count, invite rewards (a test invitee finishing chapter 1 earns its inviter nothing,
`{ created: false, reason: "test_account" }`, and does not use up the 50 reward cap), and every number on the admin page
`promovote.com/admin/dropolis/oyun` and the status card. Gems and coins already given stay in the ledger totals.
Tests: `node --test services/dropolis/test/is-test.test.mjs` (local only).

## In-app purchases (Dropolis 1.1, 2026-11-21)

Code: `src/purchases.js`, schema: `migrations/0004_purchases.sql` (NOT applied on the live database yet).
**Deploy order: apply 0004 first, then deploy.** The new Worker reads `purchases` when an account is deleted, so a
Worker without the tables would answer 500 to `DELETE /v1/me` (App Store rule 5.1.1(v)). The store is
the judge, D1 table `purchases` is the ledger. Both endpoints need the player's bearer token. These answers use the
game's contract: errors are `{ "error": "<code>" }` (a string, not the object above), sometimes with a `reason`.

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/v1/purchases/verify` | `{ platform: "ios"\|"android", productId, transactionId, jws?, receipt?, purchaseToken?, installId? }` | `{ ok, transactionId, productId, again, grant: { gems, skin, cityCard }, sandbox }` |
| GET | `/v1/purchases` | | `{ items: { starterPack, cityCard }, gemsBought, transactions: [...] }` (restore on a new phone) |

Verify errors: 400 `bad_request`, 402 `not_valid` (store says no: the game drops it; `reason` says why, for example
`revoked`, `pending`, `bundle_id`, `jws_signature`), 409 `owned_by_other`, 503 `store_unreachable` (the game keeps it
and tries later; also when a store secret is missing).

Products (grant table lives in `PRODUCTS` in `src/purchases.js`): `dropolis.starter_pack` (one time, 150 gems and the
`sky` skin, the key in the game's roviSkins catalog), `dropolis.city_card` (one time, City Card), `dropolis.gems_s` 80, `gems_m` 450, `gems_l` 1000,
`gems_xl` 2200 gems. The real prices are set in the store consoles; `usd` in `PRODUCTS` is the list price for
revenue reports (owner approved 2026-11-21): starter_pack 1.99, city_card 4.99, gems_s 0.99, gems_m 4.99, gems_l 9.99,
gems_xl 19.99 USD. Change it together with the consoles.

How a purchase is checked:
* iOS with `jws` (StoreKit 2): ES256, x5c chain of 3, root pinned to Apple Root CA G3 (SHA-256), each certificate
  signed by the next, Apple marker extensions on the leaf and intermediate, certificates valid at `signedDate`. Then
  bundle id `com.promovote.dropolis`, `productId` and `transactionId` match, no `revocationDate`, environment
  `Production` or `Sandbox`.
* iOS with only `receipt`: App Store Server API `GET /inApps/v1/transactions/{transactionId}` (production, then
  sandbox) with the owner's In-App Purchase key. The signed transaction Apple returns goes through the same checks as
  above (chain, bundle id, productId, transactionId, revocation). The receipt itself is not parsed, so this path
  only knows the `transactionId` the game sends; that is why it needs the account binding below (without
  `appAccountToken` it answers 402 `account_token_required`; var `IAP_RECEIPT_TOKEN = "optional"` turns that off).
* Android: Google Play Developer API `purchases.products.get` for `com.promovote.dropolis` with the service account.
  `purchaseState` must be 0. `purchaseType` 0 (test) is stored with `sandbox = 1`, 1 (promo code) with price 0. The
  ledger key is `purchaseToken`; the order id is kept in `order_id`; the answer echoes the `transactionId` the game sent.

Account binding (2026-11-26): the game passes the player id (`user.id` from `/v1/me`, also `accountToken` in
`GET /v1/purchases`, a UUID) to the store at purchase time: StoreKit 2 `Product.PurchaseOption.appAccountToken(UUID)`,
Play Billing `BillingFlowParams.setObfuscatedAccountId(id)`. The store signs it into the transaction (`appAccountToken`
in the JWS, `obfuscatedExternalAccountId` from Google). A token for another player answers 409 `owned_by_other`
(the purchase is that player's; signing in to that account restores it). A missing token is accepted on the JWS and
Google paths (the phone holds the signed purchase), required on the receipt path. A transaction whose first owner
deleted the account restores for the new account without gems, whatever the token says. This closes the "someone
claims another player's Apple transaction id first" gap of the receipt path.

Ledger rules:
* One row per store transaction (`unique (platform, transaction_id)`). The same transaction again returns the same
  answer with `again: true`, without calling the store, and never grants twice (two calls at the same moment also
  give one row).
* A transaction that belongs to another player: 409 `owned_by_other`. On iOS this also covers another transaction of
  the same original purchase.
* A one time item the player already owns, a transaction whose first owner deleted the account (on iOS one time
  items also by original transaction id), or an Apple Family Sharing copy (`inAppOwnershipType = FAMILY_SHARED`) is
  stored with `gems = 0`, `restored = 1` and answered `again: true`.
* A transaction the store already reported as refunded (`purchase_store_refunds`, filled by the refund
  notifications even when the purchase was never verified) answers 402 `not_valid` reason `refunded`.
* Sandbox: accepted for everyone by default and stored with `sandbox = 1` (App Review buys in sandbox on the
  production build, and TestFlight can not be told apart on the server). Var `IAP_SANDBOX = "testers"` accepts it only
  for players with `is_test = 1`.
* Account deletion: an anonymous total per day, platform and product goes to `purchase_deleted_totals`, the SHA-256
  hashes stored on each row (`tx_hash`, `orig_hash`) go to `purchase_tombstones`, then the rows are deleted, all in
  one batch, so a verify running at the same moment can not slip past the tombstone.
* Revenue: from `purchases` (`price_usd`, list price before store fees) where `status = 'granted'`, `sandbox = 0`,
  `restored = 0` and the player is not `is_test`, plus `purchase_deleted_totals` with `sandbox = 0` and `is_test = 0`.
  The `purchase` event from the game is for funnels only.

Secrets (the owner sets them with `npx wrangler secret put <NAME>` in this folder; never in the repo):
`GOOGLE_PLAY_SERVICE_ACCOUNT` (the whole JSON key file), `APPLE_IAP_KEY_ID`, `APPLE_IAP_ISSUER_ID`,
`APPLE_IAP_PRIVATE_KEY` (the `.p8` file contents; only for the receipt fallback, StoreKit 2 JWS needs no secret).

Refunds (code ready 2026-11-26, not live): `src/notifications.js`. Both routes skip the player token; the store
signature is the auth. The game does not take gems back in 1.1; a refunded row leaves `GET /v1/purchases` and
revenue, and verifying it again answers 402 `not_valid` reason `refunded`.

| Method | Path | Sender | What it does |
|---|---|---|---|
| POST | `/v1/store/apple/notifications` | App Store Server Notifications V2, body `{ signedPayload }` | `REFUND`, `REVOKE`: row `refunded`; `REFUND_REVERSED`: back to `granted`; other types answered 200 and ignored |
| POST | `/v1/store/google/rtdn` | Pub/Sub push of Google Real-time developer notifications | `voidedPurchaseNotification`: the row with that `purchaseToken` becomes `refunded`; test and other messages 200 ignored |

Apple: the notification and the transaction inside it are both checked with the same pinned JWS chain as purchases,
and must be for `com.promovote.dropolis`. Google: the push carries an OIDC token from Google; it is checked with
Google's keys, audience var `GOOGLE_RTDN_AUDIENCE`, and the email must be var `GOOGLE_RTDN_SA_EMAIL`. Bodies over
64 KB are refused. A refund for a deleted account finds no row (answers `refunded: 0`).

Owner steps to turn refunds on (after deploy, values never in the repo):
1. App Store Connect, the app, App Information, App Store Server Notifications: Version 2, production and sandbox URL
   `https://dropolis-api.promovote.com/v1/store/apple/notifications`.
2. Google Cloud project of the app: a Pub/Sub topic, give `google-play-developer-notifications@system.gserviceaccount.com`
   the Publisher role on it, and set the topic in Play Console (Monetization setup, Real-time developer notifications).
3. A push subscription on that topic to `https://dropolis-api.promovote.com/v1/store/google/rtdn` with authentication
   on: pick a service account and an audience (for example the same URL).
4. Put those two public values in `wrangler.jsonc` vars `GOOGLE_RTDN_SA_EMAIL` and `GOOGLE_RTDN_AUDIENCE` (they are
   not secrets) and deploy. Until then the Google route answers 503 `not_configured` and Pub/Sub keeps retrying.

Security review 2026-11-26 (independent reviewer; fixed: malformed JWS answered 503 instead of 402, the delete and
verify race on tombstones, refunds that arrive before the verify, StoreKit 1 style restores after deletion, Family
Sharing gems). Open, owner decisions:
* Sandbox for everyone (default `IAP_SANDBOX = "all"`): a TestFlight tester can buy gems for free in sandbox, and the
  gems are real in the game (the rows say `sandbox = 1`). Needed while App Review tests purchases; switch to
  `"testers"` after approval if TestFlight is opened to the public.
* Small: two different real purchases of one one time item at the same moment both give gems (needs two payments);
  Google `quantity > 1` gives one unit; `purchaseType` 2 (rewarded) counts at list price; `receipt` up to 200 KB is
  accepted but not used; a body without Content-Length is read fully before the size check.

Certificate revocation (OCSP), assessment 2026-11-26: not built, on purpose. Apple's own server library checks the
intermediate certificate with OCSP only in its optional online mode. For us the chain is pinned to Apple Root CA G3,
needs Apple's marker extensions, and a stolen Apple intermediate or leaf key is very unlikely; if Apple revokes one,
it rotates certificates and the pin still holds. OCSP in a Worker would mean building DER requests by hand, one more
network call per purchase (and a choice between failing open or blocking sales when ocsp.apple.com is slow).
Refund and revoke notifications (below) cover the real risk, money coming back. Revisit if Apple announces a key
compromise.

Tests: `node --test services/dropolis/test/purchases.test.mjs services/dropolis/test/notifications.test.mjs` (local only, fake D1 over `node:sqlite`, store calls
stubbed, a fake Apple certificate chain made with openssl).
