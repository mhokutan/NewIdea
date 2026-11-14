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
