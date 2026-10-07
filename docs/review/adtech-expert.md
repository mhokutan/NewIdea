# App review: Ad-Tech and Advertiser Success (businesses and brands)

Reviewer: Ad-Tech and Advertiser Success lead
Date: 2026-10-07
Angle: real businesses that pay for results. Local businesses, national and DTC brands, app studios, Shopify and Amazon sellers, streamers who sell sponsorships. Teammate `creator-economy-expert.md` covers indie creators and owns the category taxonomy; this report designs the business side to fit it.

Inputs read: `docs/review/brief.md`, `docs/00-idea-brief.md`, `docs/01-team-verdict.md` (pricing lines), `docs/03-profiles-spec.md`, `docs/05-mobile-app-and-payments.md` (IAP prices), `apps/mobile/src/app/creator/[handle].tsx`, `apps/mobile/src/app/(tabs)/me.tsx`, `services/api/src/index.js`, `services/api/migrations/0002_core.sql`, screenshots 07, 08, 11, 12.

## 1. The question a business owner asks

"Why would I move $50 from Meta to an app with no proof?" In 2026 Meta CPM in the US is about $10.50 to $16.80 and TikTok about $3 to $10, and CPMs rose about 20% year over year. PromoVote cannot win on audience size. It can win on three things that cost the business nothing:

1. **Reason to try:** a free, good looking brand page with verified links, a store or website button, a perk, and promos that real people vote on. Setup in 5 minutes. No ad budget at risk.
2. **Reason to stay:** numbers they can check in their own tools (CTA clicks with UTM tags in Shopify, GA4, App Store Connect; perk code redemptions in their own checkout) plus followers they keep for the next launch.
3. **Reason to pay later:** deeper stats, stories to talk to their followers, Trailer Test, Boost. Never reach to strangers bought outside the Sponsored slot.

Today the app delivers none of the three for a business, because a creator account can do almost nothing after signup.

## 2. What I found in the code and screens

| # | Finding | Where | Why it hurts a business |
|---|---|---|---|
| F1 | Creator onboarding asks only username, display name, date of birth and one of 3 category pills (Games, Apps, Shops). No logo, no website, no store link, no "person or business". The API already accepts `creators` and `brands` (`CATEGORIES` in `index.js` line 10) but the UI hides them. | screen 12, `/v1/onboarding` | A brand or local shop does not see itself in the list and leaves at step 1. |
| F2 | `PATCH /v1/me` edits only name, bio, language and email opt ins. There is no endpoint for avatar, banner, links, CTA, perks or promo upload, even though the tables exist (`profile_links`, `perks`, `perk_codes`, `media_assets`, `promos`). | `services/api/src/index.js` lines 380 to 401 | Matches the founder's test: "Completely empty." A business page without a logo and a website link is not trusted by anyone, including the business itself. |
| F3 | No owner view on the creator page. `creator/[handle].tsx` hides Follow when `isMe` but shows no Edit, no Share, no stats, no studio strip. | `creator/[handle].tsx` lines 61 to 65 | The owner opens their page and has nothing to do. No reason to come back. |
| F4 | No stats anywhere for the owner, although `view_events` (3 s valid views, `max_seconds`, `completed`, `is_boost`) and `click_events` already collect exactly what a business needs. | migrations 0002 lines 243 to 266 | Data exists and is invisible. An advertiser who cannot see clicks assumes there were none. |
| F5 | Public profile shows "0 followers". Spec 3.2.5 says hide below 10 and show a "New creator" chip. | screen 07, `[handle].tsx` line 57 | "0 followers" next to a verified badge reads as a dead account to visitors and as an insult to the owner. |
| F6 | No primary CTA on the profile. Store, website and app links are small grey chips; "Coming soon" is a dead chip with no notify action. | screen 07, `[handle].tsx` lines 67 to 76 | The page has one big button (Follow) and no money button (Get the app, Visit store, Shop now, Get directions). For a business the CTA click is the product. |
| F7 | No perk callout on the profile and no "Perk" chip on promo tiles, though `promos.has_perk` and the `perks` tables exist and perks are a founder P0 decision. | `[handle].tsx`, spec 3.2.8 | Perks (codes, trials, beta keys) are the cheapest, most measurable reason for a shop to post here. |
| F8 | Banner is blurred (`blurRadius={18}`), so screen 07 shows green mud. | `[handle].tsx` line 43 | For a brand the banner is its storefront sign. Blurring it looks broken. |
| F9 | Promo tiles show only a poster and duration, no title, no view bucket, no rank or perk chip. Two founder promos run 0:38 and 0:43, above the free 30 s cap. | screen 08 | Visitors cannot tell promos apart; the 30 s rule looks unenforced. |
| F10 | Link platforms allow Etsy, Steam, App Store, Google Play, socials, website. No Amazon, no Google Maps (local), no "Shopify" label (it is a website, but the label and icon matter to sellers). CTA kinds have no `directions`, `book`, `amazon`. | `profile_links.platform`, `promos.cta_kind` | Amazon sellers and local businesses have no correct button. |
| F11 | Verified badge is one signal for everyone. No separate "Verified business" meaning, and nothing on the tooltip. | spec 3.2.4, `[handle].tsx` line 55 | Brands want to prove they are the real brand (impersonation is their top fear). Users want to know a check mark was earned, not bought. |

What is already right and should stay: separate Creator account type, links only from `safety_status = 'safe'`, perks never tied to votes or follows, boosted views flagged with `is_boost` and excluded from charts, valid view = 3 s and one per viewer per day. That last point is a real selling line: "we remove invalid views and show you how many."

## 3. What a business page must have (design for the teammate's taxonomy)

### 3.1 Identity: person or business

Add `creator_details.entity` = `person` | `business`, chosen at signup next to category. It drives labels, verification method, JSON-LD (`Person` vs `Organization`, already in spec 8.2) and which fields show. It does not change ranking.

Business fields (all optional except logo and one link):

* Logo (avatar, required before first promo), banner (not blurred), display name, bio 300 chars.
* Primary CTA button, chosen by the owner from: Get the app (App Store / Google Play auto split by device), Wishlist on Steam, Shop now (website, Shopify, Etsy, Amazon), Get directions (Google Maps link, local only), Book or order (website), Watch live (Twitch, Kick, YouTube), Notify me (for "Coming soon", collects in-app follow plus a launch alert opt in, never an email to the business).
* Links: up to 8 (spec 3.2.3) plus new platforms `amazon`, `google_maps`, and a Shopify label for website links on `*.myshopify.com` or stores that pass a Shopify check.
* Local business only: city and country shown publicly, optional business address shown as a Google Maps link (a public business address is not a personal or billing address; we still never collect billing data).
* Streamers only: "Work with me" button that opens a PromoVote contact form relayed to the creator's private `contact_email`. Sponsors never see the email until the creator replies. P2.

### 3.2 Verified business badge

Keep two signals as spec 3.2.4 says, and make the business one explicit:

* **Verified business** (check next to name, tooltip "PromoVote confirmed this business owns {domain}. This is not an endorsement."). Method: domain meta tag, DNS TXT or `/.well-known/promovote.txt` (already specified, automate it first), or developer website for App Store, Google Play and Steam. Amazon sellers: verify the brand website or a storefront announcement, manual review.
* **Free and earned, never sold.** Meta sells its badge from $14.99 per month; that works for Meta because the badge means "paid and ID checked". On a voting platform a buyable badge would make every vote look bought. Membership must not include or speed up the badge beyond review queue order.
* The founder's own three accounts show "Made by the PromoVote founder" today. Keep it; it is honest disclosure.

### 3.3 Perks and promo codes (founder P0)

* Creator side, minimal P0: one active perk per account, single code for everyone mode (for example NEWIDEA25), title, end date, terms line. Unique code lists, quantity caps per day and scheduling come with membership.
* Scout side: "Get perk" on the profile perk card and on the promo, code goes to My Perks. Claim never reads votes or follows (already a hard rule; keep the unit test).
* Why businesses love it: a code is attribution they trust because it shows up in their own Shopify, Etsy or POS discount report. Show "claims" in our stats and tell them to compare with redemptions in their store.
* Local businesses: "Show this at the counter" perk view with the claim time, no code needed. P1.

### 3.4 Free stats (forever) versus Pro stats

Rule: anything that proves we delivered (views, completion, clicks) is free. Charging to see whether the free product worked kills trust. Pro sells depth and speed of learning.

| Metric | Free (owner only) | Pro (membership) |
|---|---|---|
| Valid views (3 s+), invalid views removed | Yes, last 28 days | 12 months history |
| Completion rate, average seconds watched | Yes | Second by second retention curve, skip second |
| CTA clicks and CTR, per promo and per profile link | Yes | By country, language, new vs returning, follower vs non follower (segments min 50 people) |
| Saves, follows gained from each promo, perk claims | Yes | Perk claimer reactions segment (spec 3.2.8) |
| Profile visits | Yes | Traffic source (feed, explore, share, story) |
| Votes split (Will blow up vs Not for me) | Top line % only | Split by segment, trend over days |
| Category benchmark | No | "Your completion is top 30% of Shops this week" |
| A/B of two promos | No | Yes (Trailer Test stays a separate one off report) |
| CSV export, weekly email digest | Weekly digest yes | CSV export yes |

Attribution that costs us almost nothing and earns the most trust: **auto append UTM tags** to every outbound CTA and profile link (`utm_source=promovote&utm_medium=promo&utm_campaign={slug}`; App Store links get `pt`/`ct` campaign tokens; Google Play links get a `referrer` with the same UTM). The owner can turn it off per link. This makes PromoVote appear inside the business's own Shopify, GA4, App Store Connect and Play Console reports. That is "proof" without us asking them to believe our dashboard.

Later (P2): Amazon Attribution tag field, server to server conversion postback for apps (MMP style install postbacks) and a Shopify app for orders. Not before there is traffic.

### 3.5 Categories: cover businesses, not only creators

The teammate owns the taxonomy. From the business side, the rules I need:

1. **Two axes, not one list.** Who (person or business) is an account attribute. What (category) is what they promote. A game studio is a business in Games; a streamer is a person in Streamers. Explore filters by category; a "Businesses only" toggle is not needed.
2. **Top level pills must include business groups**, roughly: Games, Apps, Streamers and video, Shops (Shopify, Amazon, Etsy, DTC), Local (food, beauty, fitness, services, with city), Brands (national and consumer brands), plus a **Deals** filter that shows promos with an active perk. Subcategories are tags, not pills.
3. **Schema:** `creator_details.category` and `kind` are CHECK constrained to 5 and 7 values (`0002_core.sql` lines 85 to 86). Move both to a lookup table (`categories(id, parent_id, label_i18n, enabled)`) so new groups do not need a migration of a CHECK constraint, and so the Explore pills, onboarding and API read one source.
4. **Local needs location.** A "Local" category is useless without a city filter ("near me" by city, never GPS in P0).
5. Restricted categories stay closed (bars and alcohol, cannabis, dating, crypto, finance, health claims), including for local businesses.

## 4. Monthly membership and stories (founder's new request)

Note: this changes the 2026-10-06 "no subscriptions" decision. It is the founder's call; once confirmed, update `CLAUDE.md` and `docs/01-team-verdict.md`. It stays consistent with the core rules if it follows the guardrails below.

### 4.1 Who pays and what it buys

* Sold to **Creator accounts only** (people and businesses). Scouts never pay and never see a paywall. Viewers are never paid.
* It buys **tools to talk to people who already chose to follow you** and **deeper stats**. It never buys reach to strangers. Reach to strangers is only Boost, labeled Sponsored, in its own slot.

### 4.2 Stories rules

* A story = photo or vertical video up to 15 s, lives 24 h, optional one link sticker (scanned like all links, UTM tagged) or one perk sticker. No vote buttons on stories (votes belong to promos and the fair queue).
* **Where it shows:** a ring on the creator's avatar (profile, feed overlay, Explore) and a story row at the top of Home **only for followers of that creator**. Order inside the row: unseen first, then most recent. Not shown to non followers on Home, never in the organic fair queue, never in charts, never counted in Hit Score, never boosted.
* **Give free creators a taste:** 1 story per week free, members up to 10 per day. Reason: at launch there will be very few members, and a members only row is an empty row that makes the app look dead. The free story also is the best upsell ("Your story got 212 views and 19 link taps. Members post daily.").
* **Moderation:** stories cannot wait 24 h for human review. Auto image and text checks on upload; accounts that are verified and have no strikes in 90 days publish instantly; new accounts go to a fast queue. Report button on every story.
* **Trade dress:** do not copy the Instagram look. Instagram's ring is a yellow, orange, pink, purple gradient; our logo is already a pink to violet gradient ring, so a gradient story ring would sit very close to Instagram. Use a **solid lime ring** (#c6ff3d) for unseen and a thin grey ring for seen, with our own tap and hold behavior. "Stories" is a generic term used by Snapchat, Instagram, YouTube, LinkedIn and WhatsApp, so the word itself is low risk, but an own name (for example "Updates") helps originality. Not legal advice.

### 4.3 What goes in the membership

| Included | Not included, ever |
|---|---|
| Stories up to 10 per day, story stats (views, link taps, perk claims) | Verified badge (earned free) |
| Pro stats (section 3.4): retention curve, segments, benchmarks, 12 months, CSV | Any weight in the fair queue, charts, Hit Score or rankings |
| Higher upload limit (30 per month instead of 10) and videos up to 60 s | Extra organic feed slots or more reach to non followers |
| Perk tools: unique code lists, daily caps, scheduling, 3 active perks | Ability to vote, or any reward to viewers |
| Pin up to 3 promos, schedule promos | Seeing which scouts follow them or how a person voted |
| Faster review queue (target 4 h instead of 24 h; same rules) | Hiding negative votes or blocking critics from reports |
| Profile accent color and CTA button style (within brand rules) | Turning off the Sponsored label on Boost |

Separate one off purchases stay separate: Boost ($4.99 / $9.99 / $19.99) and Trailer Test ($49.99), as in `docs/05`.

Enforce in code like the perk rule: the feed ordering, charts and Hit Score functions must not read the membership flag. Add a unit test that fails if `membership` or `is_member` appears in those modules.

### 4.4 Price

* **One plan at launch: $9.99 per month or $99.99 per year** (2 months free). Apple and Google auto renewing subscription, verified by our Worker, as already planned for IAP. With the Small Business Program (15%), net about $8.49 per month.
* Why $9.99: it is an impulse price for a solo seller or a local shop, below Meta Verified for Business Standard ($14.99) and in the range of link in bio pro plans. A Meta test campaign burns $10 in one day; our plan has to feel smaller than one day of Meta.
* **Founding offer:** first 3 months at $4.99 (Apple introductory offer) for the first 100 members, or a 7 day free trial. Not both.
* **Later, a Business plan at $29.99 per month** (P2): team seats (several logins on one business page, needs the multi user model), multiple locations for local chains, priority support. Do not launch it until 20+ members ask for seats.
* Kill or keep test: after 60 days, target 3% to 5% of weekly active creators paying and monthly churn under 10%. If fewer than 20 members after 60 days, the value is in stats, not stories; repackage.

## 5. Scores

Domain score (5) = "Advertiser and business readiness: would a real business trust this page, measure results, and come back?"

| # | Area | Score | Evidence |
|---|---|---|---|
| 1 | Retention | 4 | A creator or business has nothing to do after signup: no edit, no upload, no stats, no perk (F2, F3, F4), so there is no reason to open the app tomorrow. |
| 2 | Session time | 5 | The scout feed is watchable, but business owners spend seconds: one page with no owner tools and promo tiles without titles (F9). |
| 3 | Originality | 7 | Voting and Scout reputation are original; the business page itself is a generic avatar, Follow, grid layout with no PromoVote specific proof (votes, rank, perks, verified business). |
| 4 | Trademark and trade dress | 7 | Current page is safe, but the planned story ring with our pink to violet gradient would sit close to Instagram's ring; decide the lime ring now. |
| 5 | Advertiser and business readiness | 3 | No logo, links, CTA, perk or stats tooling, and "0 followers" publicly shown (F5), so no business would put its name on it yet. |

Expected after the P0 and P1 list: Retention 8, Session time 8, Originality 8, Trademark 8, Business readiness 8.

## 6. Minimum changes to reach 8 or more

### P0 (before App Store submission)

1. **Edit profile for creators and businesses.**
   What: logo and banner upload (R2, client crop, EXIF strip), bio, up to 8 links, primary CTA choice, person or business toggle.
   Where: new `apps/mobile/src/app/edit-profile.tsx`; entry from `me.tsx` and owner view of `creator/[handle].tsx`; API `POST /v1/me/media`, `PUT /v1/me/links`, extend `PATCH /v1/me` with `ctaKind`, `entity`; migration 0006 adds `amazon`, `google_maps` platforms and CTA kinds `directions`, `amazon`, `book`, `watch_live`.
   Why: F1, F2. The founder's "completely empty".
   Done when: on a real iPhone a new creator adds logo, website and store link in under 3 minutes and all three render on the public page.

2. **Owner view and free stats card.**
   What: on your own page show Edit profile, Share, and a stats card for 7 and 28 days: valid views, completion %, average seconds, CTA clicks, CTR, saves, follows gained, perk claims, invalid views removed. Per promo stats on tap.
   Where: `GET /v1/me/stats` reading `view_events` and `click_events` with `is_boost = 0` split from boosted; card in `creator/[handle].tsx` when `viewer.isMe`.
   Why: F3, F4. Proof is the product.
   Done when: numbers equal a manual D1 count for the founder's three accounts.

3. **Public business page that converts.**
   What: big primary CTA button next to Follow (device aware for App Store vs Google Play); "Coming soon" becomes "Notify me"; perk card with Get perk; promo tiles get title, Perk chip and view bucket (>= 100); replace "0 followers" with "New creator" below 10; remove the banner blur; verified tooltip text.
   Where: `creator/[handle].tsx` lines 43, 57, 67 to 76, 80 to 86; `/v1/profiles/:handle` returns `cta`, `activePerk`, follower bucket.
   Why: F5 to F9.
   Done when: on Nicheable the code NEWIDEA25 is claimable from the profile, and on Poleris the CTA opens the App Store on iOS.

4. **UTM tagging on every outbound link.**
   What: append UTM (and App Store `pt`/`ct`, Play `referrer`) server side when building `cta.url` and profile link URLs; owner can turn it off per link.
   Where: `promoOut` and the profile links map in `services/api/src/index.js`.
   Why: lets businesses see PromoVote traffic in their own analytics. Cheapest trust feature we have.
   Done when: a test click on a Nicheable promo shows `utm_source=promovote` in Etsy stats.

5. **Categories cover businesses.**
   What: onboarding and Explore use the teammate's taxonomy with business groups (Shops, Local, Brands) and a Deals filter; categories from a lookup table, not CHECK constraints.
   Where: `0002_core.sql` lines 85 to 86 replaced by `categories` table in migration 0006; `CATEGORIES` in `index.js`; onboarding form and `explore.tsx` pills.
   Why: founder feedback 7; F1.
   Done when: a coffee shop, an Amazon seller and a Twitch streamer can each find a fitting category in onboarding without "Other".

6. **Minimal perk creation (founder P0).**
   What: one active perk per creator, single code mode, end date, terms line; My Perks wallet for scouts.
   Where: `POST /v1/me/perks`, `POST /v1/perks/:id/claim` on existing `perks`, `perk_codes`, `perk_claims` tables; small form in edit profile.
   Why: F7; the cheapest measurable reason for a shop to post.
   Done when: a creator creates a perk in the app and a separate scout account claims it; claim code path has no read of `calls` or `follows` (unit test).

### P1 (before public launch)

7. **Verified business flow** with domain meta tag, DNS TXT or well known file, automated; manual path for store developers and Amazon brands. Done when a test domain verifies without staff action in under 1 minute.
8. **Membership and stories** as in section 4 (one plan $9.99 per month, $99.99 per year; free 1 story per week; lime ring; follower only story row; guard test that ranking code never reads the membership flag). Ship as v1.1 after the first App Store approval so the first review is not delayed by subscription metadata. Done when 3% of weekly active creators pay after 60 days and churn is under 10% monthly.
9. **Weekly creator digest** (push and opt in email): "Your week: views, completion, CTA clicks, perk claims, new followers." Done when creator week 4 return rate is 40% or more.
10. **Local business fields**: city, Google Maps link, "Show at the counter" perk, Local pill with city filter. Done when 5 local businesses in one city are live.
11. **Enforce the 30 s free cap** on uploads (and relabel founder promos above 30 s as 60 s paid length or trim them). Done when the server rejects a 31 s free upload.

### P2 (later)

12. Pro stats depth (retention curve, segments, category benchmark, CSV) inside the membership.
13. Media kit card for streamers and brands: opt in shareable image with followers, completion, top countries (segments of 50 or more), "Verified by PromoVote". Plus "Work with me" relay form.
14. Business plan $29.99 with team seats and multiple locations.
15. Conversion postbacks (app installs, Shopify orders, Amazon Attribution tag).

## 7. Risks I want the founder to see

* **Membership drifting into pay for reach.** If the story row ever shows non followers, or members get a feed bonus, the "fair queue" promise breaks and Apple may read it as undisclosed advertising. The guard test in 4.3 is cheap insurance.
* **Selling the badge.** Do not. On a voting product, trust in the check mark is worth more than $14.99 per month.
* **Empty story row at launch.** That is why free creators get 1 story per week and the founder's three accounts should post from day one.
* **Overpromising traffic.** Never sell "X views". Sell tools and honest stats. The team verdict already removed view quotas for this reason.

Legal notes are not legal advice.

Sources: [Meta ads benchmarks 2026 (ContentStudio)](https://contentstudio.io/blog/meta-ads-benchmarks), [Ad cost comparison across platforms 2026 (Stackmatix)](https://stackmatix.com/blog/ad-cost-comparison-across-platforms-2026), [2026 TikTok ad benchmarks (Hubfluence)](https://www.hubfluence.io/resources/tiktok-cpm-rates), [Instagram ads cost 2026 (Top Growth Marketing)](https://topgrowthmarketing.com/instagram-ads-cost/), [Is Meta Verified worth it in 2026 (CreatorFlow)](https://creatorflow.so/blog/is-meta-verified-worth-it/), [Meta Verified pricing 2026 (Alejandro Rioja)](https://alejandrorioja.com/blog/get-facebook-verified/).

---

# Round 2 (2026-10-07)

Inputs: `docs/review/brief-r2.md`, screens `screens-r2/08, 15, 16, 17, 18, 19`, `services/api/src/index.js` (onboarding, `PATCH /v1/me`, `PUT /v1/me/links`, `POST /v1/me/media`, `GET /v1/me/studio`, `GET /v1/profiles/:handle`), `apps/mobile/src/app/creator/[handle].tsx`, `apps/mobile/src/lib/categories.ts`.

## What got better

Most of my round 1 P0 list is done. Edit profile has logo, banner, bio, a main category plus 2 more, a main button, release status and up to 8 links. Link platforms now include Amazon, Shopify and Google Maps, and shorteners and link-in-bio pages are blocked. Onboarding has 7 categories, including Shops, Brands and Local. The studio has a setup checklist, free 7 and 28 day numbers with boosted views excluded, the scout verdict after 30 calls, and an "email your trailer" bridge. The public page shows the real banner without blur, a "New creator" chip, Share and Report/Block. Story rings are gone and creators use rounded squares. A business can now set up a page it would not be ashamed of.

## Scores

| # | Area | R1 | R2 | Evidence |
|---|---|---|---|---|
| 1 | Retention | 4 | 6 | The checklist and numbers give owners a reason to come back once, but they cannot post a promo or a perk, so after setup the numbers stay at 0 (screen 18). |
| 2 | Session time | 5 | 6 | The studio and edit screens add real minutes, but a new creator's public page ends at "Nothing matches yet." (screen 19) and the promo tiles still have no title or chips. |
| 3 | Originality | 7 | 8 | The call ticket, Today's Drop, the scout verdict in the studio and "delivery numbers free forever" make this its own product, not a Reels or Linktree clone. |
| 4 | Trademark and trade dress | 7 | 8 | No story rings, rounded square avatars, and "For you" and the Top tab are gone; nothing I see borrows another app's look. |
| 5 | Advertiser and business readiness | 3 | 6 | Setup is complete, but the chosen main button never appears on the public page, a link label can pretend to be "App Store" or "Amazon", and there are still no perks or UTM tags. |

## Still blocking 8 (smallest change first)

### P0 (before App Store submission)

1. **Show the main button on the public page.** The owner picks "Wishlist on Steam" in Edit (screen 16), but the public page shows only small link chips (screen 19). `GET /v1/profiles/:handle` (around line 329 to 345 of `index.js`) never returns `primary_cta`, and `[handle].tsx` lines 80 to 95 never render one. Fix: return `primaryCta` plus the matching link URL (for example the first `steam` link for `wishlist_steam`), and render a full width button under Follow. On iOS show App Store and on Android show Google Play. Track taps through `click_events` or a new link event. Set Poleris to "Open in App Store". Done when screen 19 shows a "Wishlist on Steam" button that opens the Steam link.
2. **Stop link spoofing (brand safety).** This bug matters for trust:
   * `categories.ts` line 23: `label || PLATFORM_NAMES[platform] || hostname`. A free text label always wins, so `https://evil.example` labeled "App Store" shows as "App Store".
   * `index.js` line 483: `["amazon", /(^|\.)amazon\.[a-z.]+$/]` also matches `amazon.evil.com`, which then gets the "Amazon" name.
   * Line 484 has the same problem for `maps.google.[a-z.]+`.

   Fix:
   * Anchor these to real TLDs, for example `/(^|\.)amazon\.(com|co\.uk|de|fr|it|es|ca|com\.mx|co\.jp|in|com\.au|com\.br|nl|se|pl|com\.tr|ae|sa|sg)$/`. Treat `google_maps` the same way.
   * Reject a custom label that equals a platform name (App Store, Google Play, Steam, Amazon, Etsy, Shopify, YouTube, Twitch and so on) unless the detected platform matches.
   * For `website` links, always show the domain next to any custom label.

   Done when a test link `https://amazon.evil.com` saves as "evil.com" style website and the label "App Store" on a website link is refused.
3. **Honest empty state on profiles.** `[handle].tsx` line 100 uses the generic `t('nothing')`, which reads "Nothing matches yet." on a profile. Fix:
   * Visitors see: "No promos yet. Follow to see the first one."
   * Owners see: "Your first promo shows here. Email us your trailer."

   Done when screen 19 shows the new copy.
4. **Make the free numbers exact.** These figures are what we sell trust with, so they must be right. In `GET /v1/me/studio` (lines 600 to 602):
   * Clicks do not filter `is_boost = 0` while views do, so the tap rate mixes boosted clicks into organic views.
   * Saves are counted for all time while shown under the 7 / 28 day toggle.

   Fix: filter clicks by `is_boost = 0` and window saves by `created_at`. Add "Follows gained" (the `follows` table already has `created_at`). Done when every number on screen 18 changes with the 7 / 28 day toggle and matches a manual D1 query.
5. **UTM tags on outbound links** (carried over from round 1). Add `utm_source=promovote&utm_medium=promo|profile&utm_campaign={slug or handle}` server side in `promoOut` (line 150) and in the profile links output. Use `pt`/`ct` for App Store and `referrer` for Google Play. Done when a test tap on a Nicheable promo arrives in Etsy stats as `promovote`.

### P1 (before public launch)

6. **Perks, minimal version** (already planned): one single code perk per creator, a "Get perk" card on the profile, a Perk chip on tiles, and the My Perks wallet. The claim path must never read `calls` or `follows`, backed by a unit test. This is the change that moves Retention and Business readiness to 8 together with uploads.
7. **Video upload** (already planned, waits on R2). Without it every business number stays 0 unless the founder posts for them.
8. **Profile link taps.** `profile_links.click_count` exists, but nothing writes it. Add `POST /v1/events/link` and a "Link taps" line in the studio. For a shop with no promo yet, this is the only proof the page works.
9. **Real link safety scan.** `PUT /v1/me/links` inserts every link as `safety_status = 'safe'` with no check (line 516). Add Google Web Risk and a redirect check before uploads open, and rescan weekly. Brands will not sit next to a phishing page.
10. **Banner legibility.** On the Poleris seed page (screen 08), the busy banner screenshot shows text ("Day Journey") right behind the name. Add a stronger bottom gradient in `styles.bannerShade`, or put the name fully below the banner.
11. **Weekly creator digest** (push or opt in email) with views, completion, taps and new follows. Done when creator week 4 return rate is 40% or higher.
12. **Verified business flow** (domain meta tag, DNS or `.well-known`) and a tooltip on the check mark: "PromoVote confirmed this account owns {domain}. Not an endorsement."

### Membership and stories (v1.1, founder decision)

No change to my round 1 view. One plan at $9.99 per month or $99.99 per year, Creator accounts only. Stories go to followers only, behind a lime ring, never a gradient. Free creators get 1 story per week. The badge is never sold, and a unit test must keep the membership flag out of the feed, charts and Hit Score code.

## Expected after this list

If P0 items 1 to 5 are done: Business readiness 7, Originality 8, Trademark 8.

If P1 items 6 to 8 are also done (perks, uploads, link taps): Retention 8, Session time 8, Business readiness 8.
