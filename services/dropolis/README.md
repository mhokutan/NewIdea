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

Code: `src/purchases.js`, schema: `migrations/0004_purchases.sql` (NOT applied on the live database yet). The store is
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
`sky_rovi` skin), `dropolis.city_card` (one time, City Card), `dropolis.gems_s` 80, `gems_m` 450, `gems_l` 1000,
`gems_xl` 2200 gems. Prices live only in the store consoles; `usd` in `PRODUCTS` is the list price for revenue
reports and is `null` until the owner confirms it.

How a purchase is checked:
* iOS with `jws` (StoreKit 2): ES256, x5c chain of 3, root pinned to Apple Root CA G3 (SHA-256), each certificate
  signed by the next, Apple marker extensions on the leaf and intermediate, certificates valid at `signedDate`. Then
  bundle id `com.promovote.dropolis`, `productId` and `transactionId` match, no `revocationDate`, environment
  `Production` or `Sandbox`.
* iOS with only `receipt`: App Store Server API `GET /inApps/v1/transactions/{transactionId}` (production, then
  sandbox) with the owner's In-App Purchase key, and the returned JWS is checked as above. The receipt itself is not
  parsed.
* Android: Google Play Developer API `purchases.products.get` for `com.promovote.dropolis` with the service account.
  `purchaseState` must be 0. `purchaseType` 0 (test) is stored with `sandbox = 1`, 1 (promo code) with price 0. The
  ledger key is `purchaseToken`; the order id is kept in `order_id`; the answer echoes the `transactionId` the game sent.

Ledger rules:
* One row per store transaction (`unique (platform, transaction_id)`). The same transaction again returns the same
  answer with `again: true`, without calling the store, and never grants twice (two calls at the same moment also
  give one row).
* A transaction that belongs to another player: 409 `owned_by_other`. On iOS this also covers another transaction of
  the same original purchase.
* A one time item the player already owns, or a transaction whose first owner deleted the account, is stored with
  `gems = 0`, `restored = 1` and answered `again: true`.
* Sandbox: accepted for everyone by default and stored with `sandbox = 1` (App Review buys in sandbox on the
  production build, and TestFlight can not be told apart on the server). Var `IAP_SANDBOX = "testers"` accepts it only
  for players with `is_test = 1`.
* Account deletion: an anonymous total per day, platform and product goes to `purchase_deleted_totals`, a SHA-256 of
  each transaction key to `purchase_tombstones`, then the rows are deleted.
* Revenue: from `purchases` (`price_usd`, list price before store fees) where `status = 'granted'`, `sandbox = 0`,
  `restored = 0` and the player is not `is_test`, plus `purchase_deleted_totals` with `sandbox = 0` and `is_test = 0`.
  The `purchase` event from the game is for funnels only.

Secrets (the owner sets them with `npx wrangler secret put <NAME>` in this folder; never in the repo):
`GOOGLE_PLAY_SERVICE_ACCOUNT` (the whole JSON key file), `APPLE_IAP_KEY_ID`, `APPLE_IAP_ISSUER_ID`,
`APPLE_IAP_PRIVATE_KEY` (the `.p8` file contents; only for the receipt fallback, StoreKit 2 JWS needs no secret).

Next steps (not in 1.1): refunds. App Store Server Notifications V2 and Google Real-time developer notifications
(voided purchases) can set `status = 'refunded'` and `refunded_at`; the game does not take gems back in 1.1. Also an
online check of the Apple certificates (OCSP) and binding purchases to the player with `appAccountToken` /
`obfuscatedAccountId`.

Tests: `node --test services/dropolis/test/purchases.test.mjs` (local only, fake D1 over `node:sqlite`, store calls
stubbed, a fake Apple certificate chain made with openssl).
