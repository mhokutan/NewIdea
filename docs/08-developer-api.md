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
- Limits: per key per day (free: 2 uploads, Pro: 10), plus the normal monthly upload limits. 429 with Retry-After.
- Endpoints: `POST /v1/promos` (video_url or upload URL, title, tags, cta, made_with_ai required), `GET /v1/promos/:id`,
  `GET /v1/stats?range=7d`. Webhook when a promo is approved or rejected.
- Never sold through the API: feed position, chart position, votes, reach to non followers. Same fair rotation.
- Abuse: link safety check on every CTA, duplicate video hash check, key auto disabled after repeated rejections.
- Billing (founder decision 2026-10-09): step 1, API access is part of PromoVote Pro (v1.1, App Store and Google Play
  subscription, no new payment system, no card data). Pro creators get an "API key" button in Studio. Step 2, only if
  agencies and companies ask for more: Stripe usage billing on developer.promovote.com (needs the Stripe decision changed,
  the separate LLC, Stripe Tax, and care with store rules about linking to web payments).
- Later: cross post a promo to the creator's own X account (our `social_posts` engine is the base).
