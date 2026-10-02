# Next Session Handoff: Cloudflare Setup for promovote.com

Written 2026-10-02 at the end of the first session. The next session should start here.

## State at handoff

* Domain **promovote.com** is registered at Cloudflare Registrar (expires 2027-10-02). promovote.app not bought.
* Cloudflare account is new and empty: no Workers, no KV, no D1. R2 is not enabled (needs dashboard "Enable").
* The **Cloudflare Developer Platform** claude.ai connector is connected. It can list/read Workers, create D1/KV/R2/Hyperdrive and search Cloudflare docs. It can NOT deploy code or edit DNS.
* The project plugin `cloudflare@cloudflare` (16 skills + MCP at mcp.cloudflare.com) is enabled in `.claude/settings.json`. Its MCP needs OAuth, which only works in an interactive session (`/mcp`). Not required.
* The founder added `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` to the cloud environment settings. They load only in a NEW session.
* Network access to `api.cloudflare.com` works.

## Token permissions the founder was asked to set

Template "Edit Cloudflare Workers" (Workers Scripts, Pages, KV, D1, R2, Tail, Account Settings read, User details read, Workers Routes) plus:

| Scope | Permission | Level | Purpose |
|---|---|---|---|
| Zone | DNS | Edit | Point promovote.com to the site |
| Zone | Zone Settings | Edit | Always HTTPS, speed, security |
| Zone | SSL and Certificates | Edit | SSL |
| Zone | Cache Purge | Purge | Clear cache after deploys |
| Zone | Email Routing Rules | Edit | hello@promovote.com forwarding |
| Zone | Zone | Read | Read zone info |
| Zone | Analytics | Read | Traffic |
| Account | Email Routing Addresses | Edit | Add destination address |
| Account | Turnstile | Edit | Bot protection on forms |
| Account | Stream | Edit | Video later |

Zone Resources: only promovote.com. No Billing, Members, API Tokens permissions on purpose.

## Step 1: Verify (do this first)

1. Check env vars exist WITHOUT printing their values.
2. `curl -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" https://api.cloudflare.com/client/v4/user/tokens/verify`
3. Get the zone id: `GET /zones?name=promovote.com`.
4. Probe each permission with a harmless read call (DNS records list, zone settings list, email routing rules list, turnstile widgets list, stream list, workers scripts list). Show the founder a table: permission, works / missing.
5. If something is missing, tell the founder exactly which row to add in the token (Turkish, simple).

If the env vars are still missing: the founder probably saved them to another environment or did not press Save. Explain and stop.

## Step 2: Before building, ask the founder (one message)

1. **Scope of the landing page:** only indie games, only new creators (YouTube, Kick, Twitch, Instagram, TikTok), or both? (Open question, see CLAUDE.md. Recommended: both, "Creators + Games".)
2. **Destination email** for hello@promovote.com forwarding. Do not guess it.
3. **Test product price** for the concierge report: $29, $49 or $99. (Team could not agree.)

## Step 3: Build (after answers)

1. **Landing page** on Cloudflare Workers (static assets), deployed with Wrangler, custom domain promovote.com + www redirect.
   * English copy. Positioning from `docs/01-team-verdict.md`.
   * Two audiences: creators/developers ("Show your trailer to real viewers, get a report in 72 hours") and viewers ("Discover new creators and games first, vote, get recognized").
   * Waitlist form for both sides, protected with Turnstile. Store signups in D1.
   * Stripe Payment Link button for the paid test report (founder creates the link in Stripe; ask for the URL).
   * Simple Privacy Policy and Terms pages from templates, marked as drafts for lawyer review.
2. **Email Routing:** enable on the zone, add destination address (founder must click the verification email), create hello@ and support@ rules.
3. **Zone settings:** Always Use HTTPS on, minimum TLS 1.2, Brotli on.
4. Commit code to the repo, push to the session's designated branch.

## Rules

* Talk to the founder in Turkish, simple and clear. No em dashes or en dashes.
* Never print or echo the token. Never ask the founder to paste secrets in chat.
* Confirm before any destructive or hard-to-reverse Cloudflare change (deleting records, changing nameservers).

## Session 2 progress (2026-10-02)

Step 1 done. Token is active, account id matches the zone, zone promovote.com is active (NS: eoin, josephine). DNS has 0 records.

| Permission | Result |
|---|---|
| DNS, Zone Settings, SSL, Workers Routes | works |
| Email Routing Rules + Addresses | works (routing not enabled yet) |
| Turnstile | works |
| Workers Scripts | works |
| D1 | MISSING |
| Workers KV Storage | MISSING |
| Pages | MISSING |
| Workers R2 Storage | MISSING (R2 also needs dashboard Enable) |
| Stream | MISSING |
| Account Settings Read | MISSING (also blocks workers.dev subdomain read) |
| Zone Analytics REST | sunset by Cloudflare, use GraphQL later. Not a token problem. |

Done: Always Use HTTPS on, minimum TLS 1.2. Brotli was already on, SSL mode is Full.

Waiting on founder: add the missing permissions (at least D1 Edit and Account Settings Read before the landing page), and answer the 3 questions in Step 2.
