# PromoVote Developer API (plan)

Founder idea 2026-10-09. Phase 1 is live: https://developer.promovote.com redirects to promovote.com/developers
(early access list, waitlist role `api`). No keys are issued yet.

## Phase 2: prerequisites (security first)
1. In app video upload is live (R2 storage, 720p, 10 to 30 s), with the review queue (`docs/04`).
2. Moderation: every API upload enters the same queue as app uploads; nothing goes live without review.
3. Separate LLC before user uploads open (CLAUDE.md).

## Phase 2: design
- Keys: `pv_live_...`, created in Studio, shown once, stored as a SHA-256 hash, scopes `promos:write`, `stats:read`.
  Revoke anytime. Last used time and IP country shown in Studio.
- Limits for Pro (founder decision 2026-10-09): 5 uploads a day and 60 a month per account, videos up to 60 s and 100 MB,
  stats reads 60 a minute per key, at most 3 keys per account. Over the limit: 429 with Retry-After, nothing is processed.
  A later "Business" plan for agencies and studios (for example 50 uploads a day) at a higher price.
- Protection so the API never takes the system down: uploads go into the review queue and are processed in order (no
  synchronous work); a global daily cap on all API uploads pauses new uploads and alerts us when hit; keys switch off
  automatically after repeated rejections; duplicate video hashes are refused; all traffic stays behind Cloudflare.
- Endpoints: `POST /v1/promos` (video_url or upload URL, title, tags, cta, made_with_ai required), `GET /v1/promos/:id`,
  `GET /v1/stats?range=7d`. Webhook when a promo is approved or rejected.
- Never sold through the API: feed position, chart position, votes, reach to non followers. Same fair rotation.
- Abuse: link safety check on every CTA, duplicate video hash check, key auto disabled after repeated rejections.
- Billing (founder decision 2026-10-09): step 1, API access is part of PromoVote Pro (v1.1, App Store and Google Play
  subscription, no new payment system, no card data). Pro creators get an "API key" button in Studio. Step 2, only if
  agencies and companies ask for more: Stripe usage billing on developer.promovote.com (needs the Stripe decision changed,
  the separate LLC, Stripe Tax, and care with store rules about linking to web payments).
- Later: cross post a promo to the creator's own X account (our `social_posts` engine is the base).
