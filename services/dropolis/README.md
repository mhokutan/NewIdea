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
`GOOGLE_CLIENT_IDS` (web, Android upload key, Android debug key from the Google Cloud project "dropolis"; the token `aud` is the web client id). Append the Play App Signing client id after the first Play upload.

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
