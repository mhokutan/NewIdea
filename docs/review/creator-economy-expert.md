# Creator Economy and Social Platform review (2026-10-07)

Reviewer: Creator Economy and Social Platform lead.
Domain score: **Creator / advertiser value**.
Inputs: `docs/review/brief.md`, screenshots 07, 08, 11, 12, 13, `apps/mobile/src/app/creator/[handle].tsx`, `apps/mobile/src/app/(tabs)/me.tsx`, `docs/03-profiles-spec.md`, `docs/04-explore-charts-upload.md` section 4, `services/api/migrations/0002_core.sql`, `services/api/src/index.js`.

## 1. What a creator sees today

The public creator page (screenshots 07, 08) looks good for the 3 seeded founder creators: banner, avatar, verified check, follow, bio, "Coming soon" chip, a 3 column promo grid. That page is fed by seed SQL, not by anything a creator can do.

A real creator who signs up gets this path:

1. Account type card (screenshot 11), then a form with username, display name, date of birth, category (Games / Apps / Shops) and terms (screenshot 12). No logo, no link, no bio, no "what do you make" pitch.
2. After "Create profile" the Profile tab shows name, `@handle`, a row `promovote.com/@handle`, Sign out, Delete account (same layout as screenshot 13). Nothing else.
3. Tapping the row opens their public page: monogram avatar, no banner, no bio, no links, "0 followers", heading "Promos" over an empty grid with no empty state text.

What exists in code vs what is missing:

| Capability | Schema (0002_core.sql) | API (index.js) | App |
|---|---|---|---|
| Edit name, bio | `profiles.display_name`, `bio` | `PATCH /v1/me` (name, bio only) | No edit screen |
| Avatar, banner | `media_assets` (avatar, banner), `profiles.avatar_url` | None | None |
| Links + verification | `profile_links` (13 platforms, verify and safety status, click_count), `verification_requests`, `link_scans` | None (read only in `GET /v1/profiles/:handle`) | Rendered if present, never editable |
| Promo upload | `promos`, `promo_videos` (Stream uid or mp4 urls) | None | None |
| Perks / promo codes | `perks`, `perk_codes` (AES-GCM), `perk_claims` | None | None |
| Stats | `view_events`, `click_events`, `follows.source_promo_id`, `saves`, `calls` | Events written, nothing read back for the owner | None |
| Owner view of own page | `viewer.isMe` returned | Yes | Hides Follow, adds nothing else |

The data model is about 80% ready for a creator toolkit. The gap is API routes and 4 screens. That is good news: this is execution, not strategy.

Conclusion: the founder's finding is correct. A creator account today is a parked handle. No indie dev, app maker or Etsy seller would come back tomorrow, and an App Store reviewer who picks "Creator" will see a dead end.

## 2. Scores

| # | Area | Score | Evidence |
|---|---|---|---|
| 1 | Retention | 4 | Creators have zero reasons to return (no upload, no stats, no follower news), and without new creator content the scout feed stays at 3 seeded creators. |
| 2 | Session time | 5 | Scouts can watch and browse the profile grid, but a creator session ends in under 30 seconds because there is nothing to do. |
| 3 | Originality | 6 | Public page reads as a TikTok profile clone (avatar, follow, 3 column 9:16 grid); the unique parts (verified links with proof, perks never tied to votes, scout verdicts, fair rotation) are not visible yet. |
| 4 | Trademark and trade dress safety | 8 | Name, colors and logo are own; the 3 column vertical grid and "Follow" are generic patterns; keep avoiding "For You" style wording on creator surfaces and do not use platform logos beyond official brand guidelines for link icons. |
| 5 | Creator / advertiser value | **2** | No logo, no links, no upload, no perks, no stats: the creator has nothing to set up and nothing to measure. |

## 3. Minimum creator toolkit for version 1

Goal: an indie game dev, an app maker or an Etsy shop can set up a page in under 5 minutes, post a promo, and has a reason to open the app every week. Everything below is free. Paid things are in section 5.

### 3.1 Creator home ("Studio") on the Profile tab

When `profile.type === 'creator'`, `me.tsx` `Account()` becomes a creator home, not an account page:

* Top: own page preview card (avatar, name, handle, follower count, "View public page", "Share page").
* **Setup checklist** until complete (this is the single biggest lever for activation): Add logo, Add a one line pitch, Add your main link, Verify your link, Post your first promo, Add a perk (optional). Each row opens the right editor. Show "3 of 6 done".
* Studio strip: promos by status (Draft, In review, Live, Needs changes, Paused), exactly as spec 3.2.9 owner extras.
* "This week" stats card (section 3.5).
* Upload button (section 3.4), with "7 of 10 uploads left this month".
* Settings row at the bottom: Account, Privacy, Sign out, Delete account. Destructive actions move off the main screen.

### 3.2 Profile editing

One "Edit profile" screen (spec 7.3), fields in this order:

| Field | Rule | Notes |
|---|---|---|
| Logo (avatar) | JPEG, PNG, WebP, max 5 MB, crop 1:1 on device | Required before the first promo is submitted (spec 3.1.3). Upload to R2 via the API, EXIF stripped, `moderation_status = pending`; owner sees it at once, public sees it after approval (manual queue is fine at our volume). |
| Banner | 3:1, max 8 MB | Optional. If empty use the brand gradient, not a blurred empty box. Tip: "Use key art or a screenshot." |
| Display name | 1 to 40 visible chars | Already in `PATCH /v1/me`. |
| Pitch (bio) | Creator 0 to 300 chars, no URLs | Already validated in `PATCH /v1/me`. Placeholder "What do you make, in one line?" |
| Category | 1 primary + up to 2 secondary | See section 6. |
| Tags | 1 to 5 from a controlled list per category | See section 6. |
| Release status | Live / Coming soon, per store (iOS, Android, Steam) | Already in `creator_details`. Drives the "Coming soon" chip and the Notify CTA. |
| Links | Section 3.3 | |

API: extend `PATCH /v1/me` (category, tags, release status), add `POST /v1/me/media` (returns upload target, then confirm), `GET /v1/me/studio` (owner data in one call).

### 3.3 Links with verification

* Up to 8 links, max 1 per platform, website max 2 (spec 3.2.3). Platforms from the existing `profile_links.platform` enum; add `shopify`, `amazon` and `kick` is already there.
* Paste a URL, the app detects the platform from the domain (no platform picker needed). Server normalizes to `canonical_url`, rejects shorteners and link aggregators (Linktree, Beacons), follows redirects, checks Web Risk. Pending links are visible only to the owner.
* Public rendering: platform icon + short label ("Steam page", "@name", "etsy.com/shop/x"). Verified links get a small lime check. Order is set by the owner (drag).
* Verification in v1, cheapest first:
  1. **Website**: meta tag or `/.well-known/promovote.txt` or DNS TXT. Fully automatic.
  2. **YouTube**: code in channel description, read with YouTube Data API (free quota). Automatic.
  3. **Twitch**: code in bio, Helix users endpoint. Automatic.
  4. **App Store, Google Play, Steam**: verify the developer website listed on the store page (method 1). Fallback manual.
  5. **Etsy, Shopify, TikTok, Instagram, Kick, X, Discord, itch.io**: code in bio or shop announcement, manual check by us (screenshot + live page). Fine at launch volume.
* Verified creator badge (next to the name) stays manual: one verified primary link + approved logo + no strikes.
* Track per link clicks (`profile_links.click_count`) and show them in stats. This is the number Linktree users care about most.

### 3.4 Video upload flow (free tier as decided)

Decided limits: 10 to 30 s, 10 per month (5 in the first 30 days), up to 15 live, R2 storage, compress to 720p on the phone.

Flow in the app (5 steps, one screen each, back always works):

1. **Pick video** from the library. Client checks duration (reject outside 10 to 30 s with a trim hint), aspect (9:16 best, others letterboxed), size.
2. **Compress** to 720p H.264 on device, show progress. Generate a poster frame; let the creator pick the cover frame from a scrubber (cover choice matters a lot for small creators).
3. **Details**: title (3 to 60), description (0 to 280, no URLs), language, category (prefilled from profile), up to 5 hashtags.
4. **Button**: CTA kind (section 6.4) + URL. URL domain must match the CTA kind; fast approval if it matches a verified link domain or a known store. Optional: attach a perk (section 3.6).
5. **Review and submit**: preview in the real feed player with overlay, rights checkbox ("I own or have rights to this video and music"), Advertising Policy checkbox. Submit goes to `in_review`.

Backend: `POST /v1/promos` (create draft, returns upload URL to R2, presigned or Worker streamed; a 720p 30 s file is around 10 to 20 MB, well under Worker limits), `POST /v1/promos/:id/submit`, `PATCH /v1/promos/:id` (pause, resume, edit metadata), `DELETE`. First 3 promos of every creator are manually reviewed (docs/04 4.1). Moderation statuses already exist in `promos.status`.

States the creator sees: "In review, usually within 24 hours", "Live", "Needs changes: <reason>" with Fix and resubmit. Push notification on approval and on rejection. This notification alone is a strong return trigger.

### 3.5 Free stats (owner only)

Free, simple, honest. Show per promo and for the whole page, last 7 days and since live:

| Metric | Source | Why it matters to a small creator |
|---|---|---|
| Valid views (3 s+) | `view_events` | Proof people saw it. Exact for the owner. |
| Completion % | `view_events.completed` | Is the first second good enough? Top line only. |
| Button clicks and click rate | `click_events` | The number they really came for (wishlists, installs, shop visits). |
| Saves | `saves` | Intent signal. |
| Follows from this promo | `follows.source_promo_id` | Audience they keep. |
| Scout verdict split | `calls` | "Will blow up" vs "Not for me", shown after 30 calls, owner only (spec 4: never public, it would bias votes). This is the unique free hook. |
| Profile visits and link clicks | new `profile_visits` daily counter, `profile_links.click_count` | Linktree style, but tied to the promo that drove them. |
| Perk claims | `perk_claims` | Stock left and claims count. |
| Invalid views removed | fraud filter | "We removed 41 bot views." Trust sells. |

Follower identities are never shown (spec 4). No charts beyond a 7 day sparkline in v1.

**Weekly return trigger:** a Monday push (Expo push, free; email needs Workers Paid so it can wait) "Your week on PromoVote: 1,240 views, 38 clicks, +12 followers, 64% said Will blow up." Monday also matches the weekly rankings. This plus approval pushes is the creator retention loop.

### 3.6 Perks and promo codes (never tied to votes)

v1 scope (keep it small):

* Kinds: promo code (shared, one code for everyone), discount, free trial, beta invite link. Unique key pools (Steam keys) wait for v1.1 because they need encrypted bulk upload and stock logic, though the tables exist.
* Fields (docs/04 4.4): code 3 to 30 chars, offer text max 60 chars, end date required (max 6 months), optional region, optional redeem URL (same safety scan as links), terms line.
* Attach to one promo or to the whole page. Shows as a lime "Perk" chip on the promo and a perk card on the profile.
* Scouts tap **Get perk**, a separate button never placed inside the vote row. Code is fetched from the server, never in page source, then saved to the scout's My Perks list.
* Hard rules in code: the claim route never reads `calls` or `follows` (unit test, spec 5.1). Perk text is reviewed: no "vote", "follow", "review", "subscribe" to get. 5 "code not working" reports pause the perk and notify the creator.
* Perks need review like promos (`perks.status = in_review`).
* Closed categories get no perks.

Why it matters: for an Etsy shop or app maker, "38 people claimed NEWIDEA25" is the clearest value number PromoVote can show for free.

### 3.7 What the public page needs from the creator side

* Share page button (native share sheet, copy link fallback) and the OG card at `/og/@handle.png`.
* Empty state for no promos: owner sees "Post your first promo" button; public sees "No promos live yet. Follow to see the first one."
* "New creator" chip instead of "0 followers" (spec 3.2.5 says hide under 10). Today the page says "0 followers", which hurts small creators. Quick fix in `creator/[handle].tsx` line 57.
* Promo tile tap opens a creator only player (swipe through this creator's promos), not the main feed. Today it pushes `/` with `v` param.

## 4. Comparison: how others do it and what PromoVote does differently

| Platform | What the creator gets | What PromoVote takes | What PromoVote does differently |
|---|---|---|---|
| Steam store page | Store page, capsule art, trailer, wishlist, followers, Next Fest exposure | Release status and "Coming soon" + Notify, wishlist as a CTA | PromoVote does not sell or host the game. It is the place before the wishlist: a verdict from real players on the trailer, then a click to Steam. Never a store clone. |
| itch.io | Page, builds, devlogs, pay what you want, jams | Indie friendliness, free to start | No file hosting, no payments. The atom is a 10 to 30 s promo, not a build. Devlog style updates can later be short promo posts. |
| Product Hunt maker page | One launch day, upvotes, comments, maker profile | Ranking by day and week, the thrill of launch | No single launch day spike: fair rotation gives every creator turns all week. Makers cannot vote. Votes are predictions scored later (Called it), not popularity clicks, so buying upvotes does not pay. |
| TikTok business profile | Profile, link in bio, analytics, paid ads in a separate tool | Vertical video, follow, simple analytics | Ads are honestly ads and are the content. Organic reach is a guaranteed fair queue, not an opaque algorithm. Boost is labeled and never takes organic turns. |
| Linktree | Link hub, click analytics | Link list with per link clicks | Links come with proof (verified ownership) and with the promo that drove the click. No aggregator links allowed, so PromoVote is the hub. |
| Patreon | Paid memberships, perks for paying fans | Perks idea | No subscriptions and no paywall. Perks are free gifts to anyone signed in, never tied to money, votes or follows. |

**PromoVote's own creator promise (one line):** "Post your promo, get a fair turn in front of real scouts, see honest verdicts, and keep the followers." Every screen in the toolkit should prove one part of that line. If a feature does not, it is a copy.

Signature elements that no listed platform has, to make visible in v1:

1. **Scout verdict** in owner stats (free top line), full breakdown in Trailer Test (paid).
2. **Fair turn counter**: "Your promos got 1,240 fair turns this week" (from the rotation), so small creators see they were not buried.
3. **Proof links**: verified check on links, not just on the name.
4. **Resolved verdict card** (P2, opt in, after the 7 day resolution): shareable image "Called a hit by scouts, #3 Simulation, Week 41". Creators post it on X, Reddit, Discord: that is both creator pride and our growth loop.

## 5. Saved for paid version 2

| Product | What | Why it waits |
|---|---|---|
| Boost | Labeled Sponsored slot, separate from the fair queue, 1, 3, 7 days (`iap_products` seeded) | Needs real scout traffic to sell honestly. Never counts toward charts. |
| Trailer Test | Full report: retention curve, drop off second, A/B (2 videos), skip distribution, reasons, segment of perk receivers, comparison to category median | The paid core product; concierge version runs in the validation test first. |
| Pro analytics | Country segments (min 50), 28 and 90 day history, CSV export, profile visit sources | Free stats must first prove the habit. |
| 60 s uploads | Only with Boost or Trailer Test (decided) | |
| Unique key pools at scale | Bulk Steam key upload with stock | v1.1 free, maybe a cap above 500 keys later |

Rule for the paywall: never charge for identity (profile, links, verification) or for the basic truth (views, clicks, verdict top line). Charge for depth and reach.

## 6. Category taxonomy

Today Explore has All / Games / Apps / Shops because there are 3 seed creators. Real creators will be game devs, app makers, streamers, video creators, online shops and brands, including local businesses.

### 6.1 Top level categories (Explore pills, v1)

Seven pills after "All". Short labels, one word each so they fit on a 393 px screen and translate well.

| Pill | Who | `creator_details.kind` values | Default CTA |
|---|---|---|---|
| Games | Indie and small studio game devs (PC, mobile, console) | `game_dev` | Wishlist / Download / Play |
| Apps | App makers, SaaS, tools | `app_maker` | Download / Website |
| Streams | Twitch, YouTube Live, Kick streamers | `streamer` | Watch live |
| Videos | YouTubers, TikTok and Instagram creators | `youtuber`, `short_video` | Watch |
| Shops | Etsy, Shopify, Amazon sellers, own online stores | `shop` | Visit shop |
| Brands | National and online consumer brands | `brand` | Website / Visit shop |
| Local | Local businesses (cafe, salon, studio, services) | `local_business` (new) | Website / Visit |

"Local" ships in signup and data from day 1 but the Explore pill stays hidden until there are at least 20 live local creators, because a local pill needs a location filter to be useful (country first, city later, opt in, business address only, never the person's address).

Explore order: All, Games, Apps, Streams, Videos, Shops, Brands, (Local). Games stays first because it is the first niche.

### 6.2 Sub categories as tags (controlled lists, 1 to 5 per creator)

Platforms are not tags; platform chips come from links (spec 3.2.2). Free hashtags stay on promos only.

* **Games**: PC, Mobile, Console, Cozy, Strategy, Simulation, Action, Adventure, Puzzle, RPG, Horror, Roguelike, Platformer, Multiplayer, Pixel art, Narrative, Demo out, Early access.
* **Apps**: Productivity, Utilities, Photo and video, Social, Education, Travel, Developer tools, AI, Music, Lifestyle.
* **Streams**: Gaming, Just chatting, Music, Creative, Speedrun, Esports, IRL, Talk shows.
* **Videos**: Gaming, Comedy, Tech, Cooking, Education, Art, Music, Travel, Fitness (no health claims), Vlog, DIY.
* **Shops**: Handmade, Jewelry, Clothing, Home and decor, Art prints, Digital downloads, Stickers and stationery, Pets, Toys and games.
* **Brands**: Fashion, Beauty (no health claims), Tech and gadgets, Home, Outdoors, Food and drink (non alcoholic), Pets.
* **Local**: Cafe and restaurant, Salon and barber, Fitness studio (no health claims), Home services, Events, Retail, Repair.

Tag lists live in one config table (`creator_tags(category, tag, active)`) so the founder can edit without a release.

### 6.3 How a creator picks it at signup

Signup step "What do you make?" (replaces the 3 pills in screenshot 12):

1. Pick **one primary** from 7 cards with an icon and an example ("Games: trailers for your game"). Primary drives Explore placement, default CTA and fair rotation category.
2. Optional: pick **up to 2 secondary** categories (example: a game dev who also streams picks Games + Streams). Secondary makes the creator appear in those pills' creator rows, but each promo still has exactly one category (set at upload, defaults to primary).
3. Tags (1 to 5) are asked in Edit profile or the setup checklist, not at signup, to keep signup short.

Schema changes (new migration 0003, D1 is SQLite so the check constraints need a table rebuild):

* `creator_details.category` check becomes `('games', 'apps', 'streams', 'videos', 'shops', 'brands', 'local')`. Map existing `creators` to `videos`. Keep it as the primary.
* `creator_details.kind` adds `local_business`.
* New table `creator_categories (profile_id, category, position)` with `position` 0 primary, 1 and 2 secondary, unique per profile and category, max 3 rows (enforced in the API).
* `promos` gets `category` (one of the 7), required at upload.
* API `/v1/onboarding`: replace the hard coded `kinds` map (index.js line 352) with: primary category plus kind (for Videos ask "YouTube or short video"; it can also be inferred from the first link).

### 6.4 CTA mapping

Labels come from a fixed list (no free text, no "Buy now!!" style), the URL domain must match the CTA kind.

| CTA label | `promos.cta_kind` | Allowed domains | Typical category |
|---|---|---|---|
| Wishlist on Steam | `steam` (new) | store.steampowered.com | Games |
| Play on itch.io | `itch` (new) | *.itch.io | Games |
| Download | `app_store` / `google_play` | apps.apple.com, play.google.com | Games, Apps |
| Notify me | `notify` | none (PromoVote follow + launch alert) | Coming soon games and apps |
| Watch live | `live` (new) | twitch.tv, kick.com, youtube.com | Streams |
| Watch | `watch` | youtube.com, tiktok.com, instagram.com | Videos |
| Visit shop | `shop` / `etsy` | etsy.com, *.myshopify.com, verified shop domain, amazon.com (store or product URL) | Shops, Brands |
| Website | `website` | verified website domain, else manual review | Apps, Brands, Local |

Rules: "Download" picks the right store by device and falls back to "Notify me" when that store is `soon` (as Poleris does today). "Watch live" shows a "Live now" dot only when the Twitch or YouTube API says live (P2); before that the button simply opens the channel. All outbound links are labeled as leaving PromoVote and carry `rel="sponsored noopener"`.

### 6.5 Restricted categories that stay closed in v1

Closed at signup (category picker says "Not on PromoVote yet") and at promo review, and no perks:

* Alcohol, tobacco, vaping, cannabis and CBD.
* Gambling of any kind: casinos, betting, sweepstakes, social casino games, skin gambling, paid loot box promos.
* Crypto, NFTs, tokens, Web3 projects.
* Finance: trading, investing, loans, credit, "get rich" courses, MLM.
* Health: supplements, weight loss, medical, pharmacy, mental health treatment claims.
* Dating and adult content.
* Politics: candidates, parties, ballot and issue ads.
* Always prohibited (spec Guidelines): weapons, drugs, counterfeit, scams, malware.

A creator whose links or videos point to a closed category is rejected at first review (the first 3 promos are manual anyway). Edge cases (a game with optional loot boxes, a fitness YouTuber) are allowed when the promo makes no gambling or health claim.

## 7. Prioritized changes

### P0 (before App Store submission)

1. **Creator home in the Profile tab.** Where: `apps/mobile/src/app/(tabs)/me.tsx` `Account()`, new `ui/CreatorHome.tsx`, API `GET /v1/me/studio`. What: page preview, setup checklist, studio strip, upload entry, settings moved down. Why: a reviewer or founder who picks Creator must see a working product, not a dead end. Done when: a fresh creator account shows a checklist with 6 steps and every row opens a working screen or an honest "next update" state.
2. **Edit profile with logo, banner, pitch, category.** Where: new `app/edit-profile.tsx`, extend `PATCH /v1/me`, new `POST /v1/me/media` (R2, pending moderation). Why: the founder's top complaint ("no profile picture"). Done when: a new creator uploads a logo and pitch and sees them on `/creator/<handle>` within seconds (owner view), public after approval.
3. **Links editor with safety scan and website verification.** Where: new `app/edit-links.tsx`, API `POST/PATCH/DELETE /v1/me/links`, `POST /v1/me/links/:id/verify`. Why: links are the reason a creator is here (wishlist, install, shop). Done when: pasting a Steam, App Store, Etsy or website URL saves a normalized link, it shows on the public page, and the website meta tag check turns it verified.
4. **Taxonomy at signup.** Where: `me.tsx` Onboarding category block, `index.js` onboarding `kinds` map, migration 0003. What: 7 primary cards + up to 2 secondary. Why: today a streamer or a brand has no category and picks a wrong one. Done when: every kind can sign up and appears under the right Explore pill.
5. **Public page fixes.** Where: `creator/[handle].tsx`. What: "New creator" chip instead of "0 followers" under 10, Share page button, empty promo state with owner "Post your first promo" button, gradient banner when no banner, fix DOB row overflow in onboarding (YYYY cut off, screenshot 12). Done when: a brand new creator page looks intentional, not broken.
6. **Honest upload bridge if real upload slips.** If section 3.4 is not ready for submission, the Upload button opens "Submit your first promo": video file or link + title + CTA, sent to the review queue and posted by us (concierge, matches the validation plan). Done when: a creator can get a promo live without email back and forth.

### P1 (before public launch)

1. **Video upload flow** (section 3.4). `app/upload/*`, `POST /v1/promos`, R2, on device 720p compression, cover picker, review queue, approval and rejection pushes. Done when: median time from pick to submitted under 2 minutes, and first 3 promos route to manual review.
2. **Free stats screen + Monday push** (section 3.5). `app/stats.tsx`, `GET /v1/me/stats?range=7d`. Done when: 40% of creators with a live promo open stats in week 2 and week 4.
3. **Perks v1** (shared codes, section 3.6). `app/perk-edit.tsx`, `POST /v1/perks`, `POST /v1/perks/:id/claim`, My Perks in scout profile, unit test that claim never reads calls or follows. Done when: Nicheable's NEWIDEA25 runs through the new flow instead of the static site.
4. **Automatic YouTube and Twitch verification**, manual queue for the rest, admin screen to approve.
5. **Creator only player** on profile tile tap, and OG share card for creator pages.

### P2 (later)

1. Unique key pools (Steam keys) with encrypted bulk upload.
2. Resolved verdict share card (opt in, after resolution).
3. "Live now" indicator for streamers, Local pill with location filter.
4. Paid v2: Boost, Trailer Test, Pro analytics, 60 s uploads.
5. Team access for studios (2 to 3 people on one creator page).

### How we know the creator side reaches 8

* Profile completion: at least 70% of new creators add logo, pitch and one link within 24 hours.
* Activation: at least 50% submit a first promo within 7 days.
* Weekly return: at least 40% of creators with a live promo open the app in week 4.
* Value: at least 60% of live promos get one or more button clicks in their first 7 days, and creators can see that number.

With P0 done the domain score moves from 2 to about 6 (identity and links exist, but no self serve posting). With P1 done (upload, stats, perks) it reaches 8, and retention and originality on the creator side move with it to 8 because creators now have a weekly loop and the verdict, fair turns and proof links are visible.

---

# Round 2 (2026-10-07)

Inputs: `docs/review/brief-r2.md`, screenshots `docs/review/screens-r2/15` to `19`, `apps/mobile/src/app/(tabs)/me.tsx` (`CreatorHome`), `apps/mobile/src/app/edit-profile.tsx`, `apps/mobile/src/app/creator/[handle].tsx`, `services/api/src/index.js` (`/v1/me/studio`, `PUT /v1/me/links`, `POST /v1/me/media`, `PATCH /v1/me`, `GET /v1/profiles/:handle`), `services/api/migrations/0006_profiles_categories.sql`.

## R2.1 What improved

Nearly every round 1 P0 for the creator side shipped, and it shipped well:

* **Creator studio** (screenshot 17): banner, logo, Edit profile, View public page, a 5 step setup checklist with a progress bar, a "Your numbers" card with 7 and 28 days, scout verdict after 30 calls, and an honest "email your first trailer" bridge. This is the creator home I asked for.
* **Edit profile** (16): logo and banner resized on the phone and stored on R2, bio with a counter (47 / 300), primary category plus "Also fits (up to 2)", main button from a fixed list (Open website, App Store, Google Play, Wishlist on Steam, Visit the shop, Watch live, Watch), "Not released yet", up to 8 links.
* **Links** (`checkLink`, index.js 478 to 498): https only, platform detected from the host (15 platforms including Amazon, Shopify, Google Maps for Local), shorteners and link in bio pages rejected with a clear message. Public page shows proper names ("Steam", "pixelfox.games").
* **Taxonomy**: the 7 categories (Games, Apps, Streams, Videos, Shops, Brands, Local) are live in onboarding (15) and edit. Migration 0006 moved the category, kind and platform lists out of CHECK constraints into the API, so new values never need another table rebuild. Good call, better than my 0003 proposal.
* **Public page** (19): real banner, "New creator" chip instead of "0 followers", share button, Report and Block in the menu.
* **Stats are free forever** (comment at index.js 586), boost impressions are excluded from views. Matches the paywall rule.

## R2.2 Scores

| # | Area | R1 | R2 | Evidence |
|---|---|---|---|---|
| 1 | Retention | 4 | 6 | A creator now has a page to finish and numbers to check, but cannot post a promo themselves and gets no weekly nudge, so after setup there is still no reason to open the app every week. |
| 2 | Session time | 5 | 6 | Setup and edit take a real 3 to 5 minutes, but a finished creator with no promo sees a wall of six zeros and a mailto button. |
| 3 | Originality | 6 | 7 | The scout verdict in the studio, the call ticket, "Team picks, never paid" and the honest drop end card are clearly PromoVote's own; the creator page itself is still a generic banner, avatar and grid. |
| 4 | Trademark and trade dress safety | 8 | 8 | "For you" is gone, circles are rounded squares, link chips use text names, not platform logos; button labels such as "Open in App Store" follow store wording. |
| 5 | Creator / advertiser value | 2 | 6 | Identity, links, categories and free stats now exist; posting, perks and link tap counts, the 3 things a small creator measures value by, are still missing. |

## R2.3 What still keeps scores below 8 (smallest change first)

### P0 (before App Store submission, all small)

1. **Public empty state copy is wrong.** `apps/mobile/src/app/creator/[handle].tsx` line 100 uses `t('nothing')` = "Nothing matches yet." (a search string, screenshot 19). Use "No promos live yet. Follow to see the first one." for visitors and, when `viewer.isMe`, "Post your first promo" with the email trailer button. Done when: screenshot 19 shows the new copy in en, es, tr.
2. **"Main button" is saved but never shown.** `primary_cta` is written by `PATCH /v1/me` (index.js 462) and read only by the studio. `GET /v1/profiles/:handle` (index.js 320 to 344) does not return it and the public page does not render it. A creator picks "Wishlist on Steam" and nothing changes: the same "tap does nothing" problem the founder hit in round 1. Fix: return `primaryCta` and render one full width button under the bio that opens the first link matching that kind (Steam link for `steam`, store link by device for `app_store` / `google_play`, falling back to Notify when `release_status = 'soon'`). Hide the button if no matching link exists and show the owner a hint in edit ("Add a Steam link for this button"). Done when: a creator who picks Wishlist on Steam and adds a Steam link sees that button on their public page.
3. **mailto can silently fail.** `me.tsx` lines 175 and 244 call `Linking.openURL('mailto:...')`. On an iPhone without the Mail app set up this does nothing or throws. Check `Linking.canOpenURL` first; otherwise copy `support@promovote.com` and show a toast "Email copied. Send your trailer to support@promovote.com". Done when: tapping on a device without Mail shows the toast.
4. **Zero wall in stats.** Before the first live promo, replace the six zero tiles (screenshot 18) with one line: "Your numbers start when your first promo is live. Views, watch time, button taps and saves, free forever." Show the grid only when `promos.length > 0`. Also: "Saves" ignores the 7 / 28 day toggle (index.js 602 has no date filter while the tile sits in a ranged grid); filter `s.created_at` by the range. Add a Followers tile with the 7 day delta from `follows.created_at`. Done when: a new creator sees one clear sentence, and an active creator's saves change when switching 7 and 28 days.

### P1 (before public launch)

5. **Link taps.** `profile_links.click_count` exists but nothing increments it. Add `POST /v1/events/link` (or a `/out/:linkId` redirect) from the public page and a "Link taps" tile in the studio, per link. This is the number a Linktree user compares us with. Done when: tapping "Steam" on a public page raises the count in the owner's studio.
6. **Self serve promo upload** (known, blocked on R2). This is the single change that moves Creator value and creator Retention to 8. Flow as in section 3.4: pick, trim check, 720p on device, cover frame, details, button, rights checkbox, `in_review`, push on approval and rejection. Until it ships, keep the email bridge and answer within 24 h.
7. **Perks v1** (known): shared code per promo or page, separate "Get perk" button, My Perks for scouts, claim route never reads calls or follows (unit test). Shops and app makers measure value by claims.
8. **Weekly creator push** (Expo push, free): Monday "Your week: views, button taps, new followers, scout verdict" plus a push when a promo is approved. This is the creator's weekly return trigger. Done when: week 4 creator return reaches 40%.
9. **Secondary categories do nothing in Explore.** They are stored in `creator_details.secondary_categories`, but the Explore creator query filters only `d.category = ?` (index.js 268 and 294). Add `or exists (select 1 from json_each(d.secondary_categories) where value = ?)` to the creator list (promos keep their own single category). Done when: a Games creator with Streams as a second category shows in the Streams creator row.
10. **Trust before uploads open.** Links are saved as `safety_status = 'safe'` without any scan or redirect check (index.js 516), and logos and banners are saved as `approved` with no review (index.js 544). Fine for a closed beta of hand picked creators, not for open signup: a scam link or offensive logo goes public instantly on a page we invite people to share. Add a redirect follow plus Google Web Risk lookup on save, and an admin list of new logos and banners from the last 24 h with a one tap remove. Done when: a known phishing test URL is rejected and new images appear in the admin queue.
11. **Website verification** (meta tag or `/.well-known/promovote.txt`) and a small lime check on verified links. This is the "proof links" signature from section 4 and the cheapest originality win on the creator page.
12. **Creator only player** (known, "swipe left"): tapping a tile on a creator page should play that creator's promos, not jump into the main feed (`creator/[handle].tsx` and `me.tsx` line 235 push `/` with `v`).

### Expected scores after these

* After P0 (items 1 to 4, about one day of work): Creator value 7, Session time 7, Retention 6.
* After P1 items 5 to 8 (link taps, upload, perks, weekly push): Creator value 8, Retention 8, Session time 8.
* Originality reaches 8 with items 11 and 12 plus the scout verdict being visible once real calls arrive.

---

# Round 3 (2026-10-07, night)

Inputs: `docs/review/brief-r3.md`, screenshots `docs/review/screens-r3/06`, `07`, `14`, `16`, `17`, `18`, `apps/mobile/src/app/creator/[handle].tsx`, `apps/mobile/src/app/perk.tsx`, `apps/mobile/src/ui/PerkSheet.tsx`, `apps/mobile/src/ui/PromoReel.tsx`, `apps/mobile/src/app/(tabs)/me.tsx` (`CreatorHome`), `apps/mobile/src/app/edit-profile.tsx`, `apps/mobile/src/lib/categories.ts`, `apps/mobile/src/lib/mail.ts`, `services/api/src/index.js` (profiles, perks, studio, events/link, explore, creators), `services/api/scripts/gen-seed-sql.py`.

## R3.1 What improved

Of my 12 round 2 items, 7 shipped and they shipped cleanly:

* **R2 P0 1 to 4 all done.** Owner and visitor empty copy (`no_promos_owner`, `no_promos`), main button returned as `primaryCta` and rendered next to Follow, mailto falls back to copy plus alert (`lib/mail.ts`), the zero wall is one sentence (`stats_zero`) and saves now respect the 7 / 28 day range, plus a New followers tile.
* **Link taps (R2 P1 5):** `POST /v1/events/link`, one per viewer per link per day, owner taps excluded, shown in the studio. UTM tags on non store links mean a creator also sees PromoVote in their own Shopify, Etsy or GA numbers. That is the right instinct: we prove value in tools the creator already trusts.
* **Gifts (R2 P1 7):** this is the best creator side feature so far. The creator form is short (kind, title, code, link, days, stock), the studio shows claims and End, the public page has a dashed coupon card (16), the code sheet (17) and the scout Gifts wallet (18) are clear, and the rule "Gifts never depend on your calls or follows" is printed on every surface and enforced in the claim handler (`index.js` 692 to 708 reads only the perk and the user id). Codes are AES-GCM sealed. For an Etsy shop or an app maker, "38 claims of LIVES20" is the first number on PromoVote that maps directly to money.
* **Creator only player (R2 P1 12):** grid tap opens `/play/[handle]` with "Hauling Empire 1 / 11" (07). Exactly the "swipe through one creator" behaviour that small creators want, because it turns one view into a binge of their catalogue.
* **Scout loop** (Results, reveal sheet, forgiving streak, score_eligible cap) is outside my domain, but it matters to creators: a scout who returns weekly is a creator's audience returning weekly.

## R3.2 Scores

| # | Area | R2 | R3 | Evidence |
|---|---|---|---|---|
| 1 | Retention | 6 | 7 | Scouts now have a weekly loop (streak, results, reveal) and creators have claims, link taps and new followers to check, but a creator still cannot post and gets no weekly recap, so creator side return is capped. |
| 2 | Session time | 6 | 7 | The creator player, the gift flow and the wallet add real minutes for scouts; a creator without a live promo still finishes the studio in about 2 minutes. |
| 3 | Originality | 7 | 8 | Gifts that are explicitly never tied to calls or follows, the call ticket with outcome, "You called it" and the scout verdict for creators are a combination no other creator platform has; the creator page layout itself is still generic and proof links are missing. |
| 4 | Trademark and trade dress safety | 8 | 8 | "The social network for promos" is descriptive and safe, link chips stay text, Google Play is hidden on iOS, the dashed coupon and Bricolage titles are generic patterns, not a brand's trade dress. |
| 5 | Creator / advertiser value | 6 | 7 | Identity, main button, link taps, followers and gifts with claims now give a creator real numbers; self serve posting is still missing, and the 3 live creators do not show off the new tools (no main button on any founder page, Nicheable's gift chip opens "This gift has ended"). |

## R3.3 What still keeps scores below 8 (smallest change first)

### P0 (before App Store submission, all small)

1. **Nicheable gift chip is a dead promise.** `gen-seed-sql.py` line 53 sets `has_perk = 1` on every Nicheable promo, and `PROMO_SELECT` (`index.js` line 126) shows the gift chip when `pr.has_perk or exists (active perk)`. Production has no `perks` row (no migration or seed creates one, and the code must be sealed with the secret, so SQL cannot). Result: a scout taps the lime Gift chip on a founder promo and gets "This gift has ended." Fix: remove `pr.has_perk or` from line 126 so the chip only follows a real active perk, then create NEWIDEA25 as a real gift on @nicheable through `POST /v1/me/perks` with the founder placeholder account. Done when: the chip on Nicheable promos opens the real NEWIDEA25 code and its claims show in Nicheable's studio. This also gives the App Store reviewer a working gift on real content instead of a seeded test creator.
2. **No founder page shows the main button.** Seed never sets `creator_details.primary_cta`, so screenshot 06 (Hauling Empire) and the Poleris and Nicheable pages show Follow only. One small migration: `poleris` to `app_store`, `nicheable` to `etsy`, `haulingempire` stays null (Follow already acts as its notify). Done when: Poleris shows "Open in the App Store" next to Follow on iOS.
3. **Gift title can ask for follows.** `POST /v1/me/perks` checks `/(vote|follow|like|subscribe)/` on `description` only (`index.js` 659), and the app never sends a description; the title is the only text scouts see. "Follow us, get 20% off" passes today. Run the same check on `title`, add `review|rate|call|share|comment`, and return the same `no_conditions` message. Done when: that title is rejected with the message in the form. This is the one rule the whole gift system rests on (FTC incentivized reviews, App Store 3.2.2 and store ToS), so it must be enforced in code, not only in copy.

### P1 (before public launch)

4. **Link taps never count for seed links.** `GET /v1/profiles/:handle` sends `withUtm(canonical_url)`, which adds a trailing slash to `https://nicheable.etsy.com`; `/v1/events/link` strips the UTM params and compares with the stored `canonical_url` without the slash (`index.js` 987), so it never matches. User created links are already normalised by `checkLink`, so only the seed is hit. Fix: send the link position or id from the app instead of the URL, or normalise both sides with `new URL().toString()`. Done when: a tap on Nicheable's Etsy link raises Link taps in its studio.
5. **Main button hidden with no hint.** If a creator picks "Wishlist on Steam" but has no Steam link, `primaryCta` returns null and the button silently disappears (`index.js` 378 to 383). Add one line under the button picker in `edit-profile.tsx` line 122: "Add a Steam link below to show this button."
6. **Studio promo tiles still jump into the main feed** (`me.tsx` line 330 navigates to `/` with `v`). Use the same `/play/[handle]` push as the public page.
7. **Visitor empty state** says "No promos yet." (`i18n.ts` 56). Add "Follow to see the first one." so the empty page has a next step (16 shows how bare it is).
8. **Secondary categories still do nothing in Explore** (carried from R2 item 9): `/v1/creators` filters only `d.category = ?` (`index.js` 329). Add the `json_each(d.secondary_categories)` clause.
9. **Weekly creator recap** (carried). No push server yet, so do the free half now: a "Your week" card at the top of the studio (views, button taps, link taps, new followers, gift claims, change versus last week) and a Monday local reminder for creators, the same mechanism as the scout 18:00 reminder. Server push for approvals comes with uploads.
10. **Trust before open signup** (carried): links are saved `safe` without a scan (`index.js` 571) and photos `approved` (606). Fine for hand picked creators, required before signup is public. Gifts add a new surface: a `redeem_url` passes only `checkLink`, so add it to the same scan.
11. **Proof links** (carried): website verification by meta tag or `/.well-known/promovote.txt` and a lime check on verified links. This is the cheapest way to make the creator page itself original rather than a banner, avatar and grid.
12. **Self serve promo upload** (known, blocked on R2 in the dashboard). Still the single change that moves Creator value and creator Retention to 8. Until then answer emailed trailers within 24 hours.

### What only real creators and users can close

* **Creator value 8 and creator side Retention 8** need self serve upload plus real creators beyond the 3 founder pages. No code change can make a creator studio feel alive while every live promo belongs to the founder. Outreach to 20 to 30 indie devs, app makers and Etsy shops (the validation plan) is the real blocker.
* Gift claims, link taps and the scout verdict (shown after 30 calls) are only convincing with real traffic. The tools are now in place; the numbers are not.

### Expected scores after these

* After P0 1 to 3 (under a day): Creator value 7, but the founder pages finally demonstrate every creator tool on real content, which is what the App Store reviewer sees.
* After P1 4 to 9 plus upload: Creator value 8, Retention 8, Session time 8.
* With real creators posting weekly and gifts being claimed, Creator value can reach 9, because PromoVote would then be the only place where a small creator gets a fair turn, an honest verdict and a measurable gift result for free.
