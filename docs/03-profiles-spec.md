# PromoVote Profile Pages: Product Spec v1

Date: 2026-10-02
Owner: Product Strategy
Status: Draft for founder review, then build
Related: `docs/01-team-verdict.md` (source of truth), `docs/debate/`, `web/landing/public/index.html`

> Legal notes in this document are not legal advice. Lawyer review is required before launch.

## Kurucu için Türkçe özet (10 satır)

1. Tek giriş (login), iki kimlik: herkesin bir **Scout (Kaşif) profili** olur, isteyen bir de **Creator (yaratıcı) sayfası** açar. Bir indie geliştirici aynı zamanda oyuncu olabilir.
2. Creator sayfasının işi: reklam bittikten sonra da kalan bir vitrin. Takipçi, promolar, sıralama rozetleri, doğrulanmış linkler.
3. Scout profilinin işi: kimlik ve gurur. Scout Score, "Called it" geçmişi, rozetler, haftalık seri. Para değeri yok, harcanmaz.
4. Adres yapısı herkes için `promovote.com/@handle`. Creator sayfaları Google'da çıkar, Scout profilleri varsayılan olarak çıkmaz (noindex).
5. Trailer Test rapor verileri (izleyici kaybı, A/B, tıklama oranı) varsayılan olarak **gizli**. Herkese açık olan sadece takipçi, promolar ve sıralama başarıları.
6. Takip etmek asla ödüllendirilmez. Hediye (Steam key, kod) asla oya veya takibe bağlanmaz. Bu kural kodda da uygulanır, sadece metinde değil.
7. E-posta, doğum tarihi, ülke ve izleme geçmişi asla herkese açık değil. Avatar ve banner yüklenince EXIF (konum) silinir, otomatik moderasyondan geçer.
8. "Verified" rozeti: yaratıcının YouTube, Twitch, Steam vb. hesabının gerçekten ona ait olduğunu kanıtlamasıyla verilir. Onay anlamı taşımaz.
9. İlk sürüm (P0) dar ve keskin: Scout'ları takip etme, yorum, ekip hesapları, embed widget P1 ve sonrasına kaldı.
10. Senden 6 karar bekliyorum (dosyanın sonunda): hesap modeli, ilk açılacak creator türleri, herkese açık izlenme sayısı, "tuttu" tanımı, Scout profili varsayılanı ve Discord/itch.io linkleri.

---

## Founder decisions (2026-10-06): these override anything below

1. **Separate accounts.** An account is either a **Creator account** (advertiser) or a **Scout account** (viewer). The type is chosen at signup and cannot be switched. One email = one account, so a person who wants both needs two different emails. Consequences for the spec below:
   * Replace "every account has a scout profile + optional creator page" with `accounts.account_type in ('creator','scout')`, fixed after signup.
   * Creator accounts can browse the feed and follow other creators, but **cannot vote, call, react or earn Scout Score.**
   * Scout accounts cannot upload promos.
   * Self vote risk moves from "same account" to "same person, two accounts": the fraud system must link accounts by device, payment card and network signals and void calls between linked accounts.
2. **No sector limits.** Any creator or business can join (games, YouTube, Twitch, Kick, TikTok, Instagram, apps, brands, local businesses). Prohibited and restricted categories from the Guidelines still apply.
3. **Public view counts:** shown after 100 valid views, rounded (1.2K), owner can hide.
4. **Hit definition:** internal Hit Score, top 20% of the weekly category cohort, calls excluded (as in 0.2).
5. **Scout profiles are not indexed by Google** (noindex), visible inside PromoVote only.
6. **Discord and itch.io links** are allowed in P0.
7. **Creator perks are P0** (promo codes, discount codes, beta keys, free trials). Creators set them on each promo: code or key list, quantity, max 1 per account, start and end date, terms text, optional "single code for everyone" vs "unique codes" mode. Scouts claim with a "Get perk" button (rules in 3.2.8, never tied to votes, follows or reviews). Delivery:
   * Always shown in the scout's in app **My Perks** wallet.
   * **Email copy only for scouts who opted in** ("Email me perks I claim" and, separately, "Email me new perks from creators I follow"). Sent by PromoVote, never by the creator. Creators never see scout emails.
   * Every perk email: clear sender, honest subject, unsubscribe link, PromoVote postal address (CAN-SPAM), and a line saying the offer is from the named creator.
   * Creators accept Perk Terms: they must honor codes, no illegal or restricted offers, no "vote/follow/review to get".

---

## 0. Principles and definitions

### 0.1 Product principles for profiles

* **Creator is a creator, not a customer.** The profile is the asset that stays after a promo ends. It must look like a creator page, not an ad account.
* **Scout is a curator, not a viewer.** The scout profile shows judgment (good calls, early finds), never time spent watching.
* **Status comes from accuracy and earliness, never from volume.** No public "minutes watched", no "promos watched" counter.
* **Never reward following or subscribing.** Not on PromoVote, not on YouTube, Twitch, Kick, TikTok, Instagram, X or Steam. No points, no badges, no perk access tied to a follow.
* **Perks are never tied to votes or reactions.** A perk is claimed from a separate "Get perk" button. Claim logic never reads vote data.
* **Private by default for anything that can embarrass, expose or be gamed.** Viewing history, pending votes, saved list, report data.
* **App Store safe.** Profiles, follow, save and rankings are the non ad value that keeps the app outside Apple 3.2.2(iii). Profiles are a P0 store requirement, not decoration.

### 0.2 Definitions (v1 defaults, tunable, final formulas owned by the scoring spec)

| Term | Definition |
|---|---|
| Account | One login (Supabase `auth.users` row). Email, birth year, country live here. Never public. |
| Scout profile | Every account has exactly one. Used to watch the daily drop, vote, save, follow. |
| Creator page | Optional. Owned by an account. P0: max 1 per account. Hosts promos. |
| Promo | A 10 to 30 second video (up to 60 s when uploaded for a paid Boost or Trailer Test) with a title, CTA link and category. Has 1 or 2 variants (A/B). |
| Daily drop | The 5 to 7 promos a scout gets per day. Finite. |
| Call | A scout's vote on a promo: `will_blow_up` or `not_for_me`. Skip is free and is not a call. |
| Hit Score | Fraud filtered engagement score of a promo: completion rate, save rate, CTA click rate, follows gained from the promo, "interested" reactions. **Calls are excluded** so predictions cannot be self fulfilling. |
| Hit | At resolution (7 days after `live_at`), a promo in the top 20% Hit Score of its category cohort (promos that went live in the same ISO week). Promos under 150 valid views resolve as `void`. |
| Scout Score | Reputation points (Turkish: Kaşif Puanı). No cash value, not spendable, not transferable. |
| Called it | A correct `will_blow_up` call made early (early multiplier 2x or 3x, see 3.3.6). |
| Weekly rankings | Every Monday 00:00 UTC: top promos per category (by Hit Score) and top scouts (by Scout Score gained that week). |

---

## 1. Purpose: the job each page does

### 1.1 Creator profile (advertiser page)

**Who:** new YouTubers, Twitch and Kick streamers, TikTok and Instagram creators, indie game developers, app makers, small brands.

| For the owner (creator) | For visitors (scouts, logged out people from Reddit, Discord, Google) |
|---|---|
| One place where all their promos live after the feed moment is over. | Decide in 5 seconds: who is this, what do they make, is it for me. |
| Accumulate followers they can reach at the next launch (P1 launch notification). | Watch their promos back to back. |
| Social proof: ranking badges ("#2 Indie Games, Week 41"), verified links. | Jump to where the creator really lives (Steam page, Twitch channel) via verified links. |
| A shareable link for their Discord, Reddit post, press kit. | Follow to get their next promo in the drop. |
| Quick private status: which promos are live, in review, rejected, and a shortcut to the Trailer Test report. | Claim an active perk (beta key, code) if one exists. |

**Core job:** "Help me get discovered and keep what I earn here." The page must convert a visitor into a follower or a CTA click, and it must make the creator proud to share it.

### 1.2 Scout profile (viewer page)

| For the owner (scout) | For visitors |
|---|---|
| See their identity grow: Scout Score, level, badges, streak. | See that this person has taste (called it history, accuracy). |
| Opening reward: "Your call on Hollow Lantern was right. +20." | Social proof for the creators they called early. |
| Private tools: saved promos, pending calls, own activity. | Reason to join: shared scout cards on Reddit, Discord, X. |
| A shareable card to brag ("Called it x12"). | |

**Core job:** "Show that I find good stuff first." The page is the scoreboard of the core loop. It is visited mostly by its owner, so the owner view is the primary design target, the public view is secondary.

---

## 2. Public view vs owner view vs admin view

### 2.1 Creator profile

| Element | Public (logged out) | Public (logged in scout) | Owner | Admin / moderator |
|---|---|---|---|---|
| Banner, avatar, display name, handle, verified badge | Yes | Yes | Yes + Edit | Yes + history of previous values |
| Creator kind chips, category tags | Yes | Yes | Yes + Edit | Yes |
| Bio | Yes | Yes | Yes + Edit | Yes + moderation flags |
| External links | Yes (only `safety_status = safe`) | Yes | All links with verify and scan status | All links + scan logs + verification evidence |
| Follower count | Yes, if >= 10 (else "New creator" chip) | Same | Exact count always + 7 day delta | Exact + growth anomaly flags |
| Follow button | Yes (prompts sign up) | Yes | No (own page) | No |
| Promos grid | `live` and `paused` only | Same | All statuses incl. draft, in review, rejected | All incl. `removed`, with reasons |
| Per promo public numbers | View bucket (if >= 100 and owner did not hide), rank chip | Same | Exact verified views, completion, CTA rate, "interested" share | Everything + invalid traffic |
| Trailer Test report | Never | Never | Link to report in creator panel | Read access, logged |
| Perks section | Active perks, "Get perk" button | Same + claim state | Stock left, claims count | Stock, claim logs, abuse flags |
| Rankings and badges | Yes | Yes | Yes + pin control | Yes + revoke |
| Joined date | Month and year | Same | Same | Exact timestamp |
| Report / Block | Report (login required) | Report, Block | No | No |
| Contact email, legal name, country, KYC status | Never | Never | Visible in settings only | Yes (access logged) |
| Strikes, open reports | Never | Never | Strikes visible to owner with reasons | Full |

### 2.2 Scout profile

| Element | Public (logged out) | Public (logged in) | Owner | Admin / moderator |
|---|---|---|---|---|
| Avatar, display name, handle | Yes | Yes | Yes + Edit | Yes + history |
| Bio | Yes | Yes | Yes + Edit | Yes + flags |
| Scout Score, level | Yes | Yes | Yes + progress to next level | Yes + score ledger |
| Accuracy % | Only after 10 resolved calls | Same | Always, with "provisional" label before 10 | Yes |
| Streak | Only if >= 2 weeks | Same | Always + freeze status | Yes |
| Badges | Yes | Yes | Yes + pin and hide control | Yes + revoke |
| Called it history | Yes, if `show_calls = true` (default true) | Same | Always | Yes |
| Pending calls (unresolved votes) | **Never** | **Never** | Yes | Yes |
| `not_for_me` calls | **Never** | **Never** | Yes | Yes |
| Saved list | Only if `show_saved = true` (default false) | Same | Always | Yes |
| Following list | Only if `show_following = true` (default false) | Same | Always | Yes |
| Weekly rank | If top 100 and `show_in_leaderboards = true` | Same | Always | Yes |
| Viewing history (watched, skipped) | **Never, no toggle** | **Never** | Owner sees own history in Settings > Activity (P1) | Aggregated only, raw access logged |
| Email, birth year, country, timezone | Never | Never | Settings only | Yes (access logged) |
| Report / Block | Report (login required) | Report, Block | No | No |

### 2.3 Admin view (both types)

Admin opens any profile at `promovote.com/@handle` with an **admin bar** pinned at top (only for `role in (admin, moderator)`), plus a full record in the admin console (`/admin/profiles/:id`, Next.js panel).

Admin bar: status chip, strike count, open reports count, risk score, quick actions (Hide avatar, Reset bio, Hide link, Force handle change, Remove verified, Limit, Suspend, Restore). Every action requires a reason code and writes to `moderation_actions`. The user receives a statement of reasons (DSA style) by email and in app.

Admin console tabs: Overview, Reports, Moderation history, Verification, Links and scans, Promos, Risk signals (device clusters, vote anomalies, follower spikes), Account (email, auth providers, birth year, country, devices count), Internal notes.

Roles:
* `admin`: everything.
* `moderator`: everything except unmasked email and payment data (email shown as `j***@g***.com`).
* `support`: read only + handle and deletion requests.

Every read of private account fields is logged to `pii_access_log`.

---

## 3. Sections and fields

### 3.1 Shared fields (both profile types)

#### 3.1.1 Handle

| Rule | Value |
|---|---|
| Field | `profiles.handle` (text, stored lowercase) |
| Required | Yes |
| Length | 3 to 24 characters |
| Allowed chars | `a` to `z`, `0` to `9`, `_` |
| Regex | `^[a-z][a-z0-9_]{2,23}$` |
| Extra rules | Must start with a letter. No `__` (double underscore). Cannot end with `_`. Input is case insensitive, uppercase is lowercased on input. |
| Uniqueness | Global, one namespace for scouts and creators. Unique among active handles, held handles and reserved handles. |
| Display | Always `@handle`, lowercase. |
| Availability check | Debounced 400 ms, API rate limit 30 requests per minute per IP. Response: `available`, `taken`, `reserved`, `invalid`. Never say "held" (do not leak that an account changed its handle). Held shows as `taken`. |
| Suggestions | If taken, offer 3 suggestions built from display name (`luna_cooks`, `lunacooks_tv`, `luna_cooks2`). |

**Reserved words** (table `reserved_handles`, seeded at launch, admin editable):

* System and routes: `admin, api, app, about, help, support, settings, account, login, logout, signin, signup, register, auth, oauth, callback, explore, discover, search, top, rankings, leaderboard, drop, today, feed, home, new, edit, p, promo, promos, creator, creators, scout, scouts, studio, panel, dashboard, report, reports, verify, verified, terms, privacy, legal, dmca, copyright, security, status, blog, press, jobs, careers, pricing, advertise, ads, brand, brands, embed, widget, og, cdn, static, assets, media, sitemap, robots, favicon, well_known, www, mail, email, hello, noreply, me, you, null, undefined, root, system, staff, team, mod, moderator, official, test, demo`.
* Brand protection: `promovote, promo_vote, promovoteapp, pv, pv_official`, and any handle containing `promovote`, `admin`, `official`, `support`, `moderator`, `staff`.
* Protected names list: about 2,000 seeded names of well known game studios, publishers, streamers, YouTubers and brands. These are `claimable_by_verification = true`: the real owner can claim after verification (see 6.4).
* Offensive list: slurs and sexual terms, matched as substrings after normalization (`0` to `o`, `1` to `i`, `3` to `e`, `4` to `a`, `5` to `s`, `_` removed).

**Change limits:**

| Case | Rule |
|---|---|
| First 7 days after account creation | 1 free change (fix mistakes), not counted. |
| Scout | 1 change per 30 days. Old handle held 14 days, `/@old` 301 redirects to new during hold. Then released. |
| Creator | 1 change per 60 days. Old handle held 90 days with 301 redirect. Only the same account can reclaim it during hold. |
| Verified creator | Same as creator, plus: verified badge is hidden until an admin confirms the new handle (target SLA 24 h). |
| Admin forced change | Any time (impersonation, offensive). Old handle goes to `reserved_handles` permanently if offensive or impersonating. |
| Deleted account | Handle held 30 days (scout) or 90 days (creator), no redirect, then released. |

#### 3.1.2 Display name

| Rule | Value |
|---|---|
| Field | `profiles.display_name` (text) |
| Required | Yes |
| Length | 1 to 40 visible characters (grapheme clusters, counted client side). Server check: max 80 code points. |
| Normalization | Unicode NFC, trim, collapse internal whitespace to single spaces. |
| Not allowed | URLs and domains (`.com`, `.gg`, `http`), `@` at start, only whitespace or only invisible chars, zero width chars, check mark lookalikes (U+2713, U+2714, U+2611, U+2705, U+1F5F8, and similar), "PromoVote", "official", "verified", "admin", "staff". |
| Emoji | Allowed, max 3. |
| Moderation | Profanity and slur filter (block on save). Confusable check (Unicode TR39 skeleton) against verified creator display names: if the skeleton matches a verified creator and the account is not that creator, block with "This name is too close to a verified creator." |
| Change limits | Scout: max 5 changes per 30 days. Creator: max 3 per 30 days. Verified creator: every change goes to review, old name stays public until approved. |

#### 3.1.3 Avatar

| Rule | Value |
|---|---|
| Field | `profiles.avatar_media_id` to `media_assets` |
| Required | Scout: optional (default is a generated gradient monogram, pink to violet, first letter of display name). Creator: **required** before the first promo can be submitted. |
| Formats | JPEG, PNG, WebP. HEIC on iOS is converted to JPEG on device before upload. No GIF, no animated in P0 (P2). |
| Upload size | Max 5 MB |
| Dimensions | Min 200 x 200 px. Max 4096 x 4096 px. |
| Crop | Client crop to 1:1, circular preview. |
| Stored variants | 400 x 400, 192 x 192, 96 x 96, 48 x 48, WebP, quality 82. |
| Privacy | EXIF and all metadata stripped server side (location in photos). Original file deleted after variants are generated. |
| Moderation | Automated image classifier (nudity, gore, hate symbols, text with contact info). Score above block threshold: reject with message. Score in grey zone: owner sees it with "Under review", public keeps the previous avatar (or monogram) until a moderator approves. Target SLA 12 h. |
| Alt text | Auto: "Avatar of {display_name}". |

#### 3.1.4 Bio

| Rule | Value |
|---|---|
| Field | `profiles.bio` (text) |
| Required | Optional |
| Length | Scout: 0 to 160 visible characters. Creator: 0 to 300. Server max 600 code points. |
| Line breaks | Max 4 |
| Not allowed | URLs and domains (links go in the links field), email addresses, phone numbers, "follow me for", "sub4sub", "f4f", promo codes patterns. Detected server side, blocked with a clear message. |
| Mentions | `@handle` is plain text in P0. Linked mentions in P1 (only to existing creator handles). |
| Moderation | Profanity and slur filter on save. Reported bios go to the moderation queue. |
| Empty state | Public: section hidden. Owner: placeholder "Add a one line pitch. What do you make?" (creator) or "What kind of games or creators do you love?" (scout). |

#### 3.1.5 Banner

| Rule | Value |
|---|---|
| Field | `profiles.banner_media_id` |
| Who | Creator: P0. Scout: P2 (scouts get a gradient header based on level). |
| Required | Optional. Default: brand gradient (`#ff5470` to `#ff7a59` to `#8b5cff`) with subtle noise. |
| Formats | JPEG, PNG, WebP |
| Upload size | Max 8 MB |
| Dimensions | Recommended 1500 x 500 (3:1). Min 1200 x 400. |
| Safe area | Center 1200 x 300. Mobile shows a 2.5:1 center crop. Editor shows the safe area overlay. |
| Stored variants | 1500 x 500, 750 x 250, WebP |
| Privacy and moderation | Same as avatar. |

### 3.2 Creator profile: sections in order

Order on the page, top to bottom: Header (banner, avatar, identity), Kind and tags, Bio, Links, Stats row, Actions, Pinned badges, Perks callout, Tabs (Promos, Rankings, About).

#### 3.2.1 Identity block

| Field | Type | Limits | Required | Notes |
|---|---|---|---|---|
| `handle` | text | see 3.1.1 | Yes | |
| `display_name` | text | see 3.1.2 | Yes | Studio, channel or brand name. |
| `avatar` | image | see 3.1.3 | Yes before first submit | Logo or face. |
| `banner` | image | see 3.1.5 | No | |
| `is_verified` | bool | system | System | Badge next to display name. See 3.2.4. |
| `founding_creator` | bool | system | System | Small chip "Founding creator" for waitlist and first 50 creators. |

#### 3.2.2 Creator kind and category tags

| Field | Type | Limits | Required | Validation |
|---|---|---|---|---|
| `creator_details.kind` | enum `game_dev, youtuber, streamer, short_video, app_maker, brand` | 1 primary | Yes | Must be in `creator_kinds_enabled` feature flag. Others show "Coming soon, join the list". |
| `creator_details.secondary_kinds` | enum array | 0 to 2 | No | Cannot repeat primary. |
| `profile_tags` | tag ids from controlled list | 1 to 5 | Yes (min 1) | Only active tags valid for the selected kinds. No free text tags in P0. |

Public labels: `game_dev` "Indie game dev", `youtuber` "YouTuber", `streamer` "Streamer", `short_video` "Short video creator", `app_maker` "App maker", `brand` "Small brand".

Seed tags P0 (games): Action, Adventure, Cozy, Horror, Puzzle, Roguelike, Strategy, Simulation, RPG, Platformer, Shooter, Narrative, Multiplayer, Pixel art, Demo available, Early access. Creator tags (behind flag): Gaming, Speedrun, Just chatting, Cooking, Tech, Comedy, Education, Music, Art, Fitness (no health claims), Vlog.

Platforms are not tags. Platform chips are derived from verified links.

#### 3.2.3 External links

| Field | Type | Limits | Required |
|---|---|---|---|
| `profile_links` rows | platform enum + URL | Max 8 links total. Max 1 per platform, except `website` max 2. | Optional, but at least 1 link is required to request verification. Strongly nudged in onboarding. |

**Allow list and URL patterns** (server normalizes to canonical form, forces `https`, strips tracking params `utm_*`, `fbclid`, `si`, `igsh`):

| Platform | Accepted patterns | Canonical stored | `external_id` |
|---|---|---|---|
| YouTube | `youtube.com/@name`, `youtube.com/channel/UC...`, `youtube.com/c/name`, `m.youtube.com/...` | `https://www.youtube.com/@name` or `/channel/UC...` | channel id (resolved via YouTube Data API) |
| Twitch | `twitch.tv/name` | `https://www.twitch.tv/name` | Twitch user id |
| Kick | `kick.com/name` | `https://kick.com/name` | lowercase slug |
| TikTok | `tiktok.com/@name` | `https://www.tiktok.com/@name` | lowercase name |
| Instagram | `instagram.com/name` | `https://www.instagram.com/name` | lowercase name |
| X | `x.com/name`, `twitter.com/name` | `https://x.com/name` | lowercase name |
| Steam | `store.steampowered.com/app/{id}/...`, `store.steampowered.com/developer/{name}`, `store.steampowered.com/publisher/{name}` | `https://store.steampowered.com/app/{id}` | app id or dev slug |
| App Store | `apps.apple.com/{cc}/app/{slug}/id{digits}`, `apps.apple.com/{cc}/developer/{slug}/id{digits}` | `https://apps.apple.com/app/id{digits}` | numeric id |
| Google Play | `play.google.com/store/apps/details?id={pkg}`, `play.google.com/store/apps/dev?id=...`, `play.google.com/store/apps/developer?id=...` | `https://play.google.com/store/apps/details?id={pkg}` | package or dev id |
| Website | any `https` URL that passes safety rules below | normalized URL | registrable domain |

**Website rules:** no IP addresses, no non standard ports, no punycode or IDN domains in P0 (homograph risk), no URL shorteners (bit.ly, tinyurl, t.co, and the full shortener denylist), no link aggregators in P0 (linktr.ee, beacons, lnk.bio and similar; their target can change after review, and the PromoVote profile is already the link hub), max URL length 500.

**Link safety scan:**
1. On save: resolve redirects server side (max 5 hops). The final registrable domain must equal the entered one, else reject "This link redirects somewhere else."
2. Check Google Web Risk API (commercial version of Safe Browsing) and our internal domain denylist.
3. Status `pending` until the scan returns (target under 5 s). Pending links are visible to the owner only.
4. Rescan: website links weekly, all links on any report, all links of a creator when one link is flagged.
5. `flagged` links are hidden publicly and the owner is notified with the reason. `blocked` links create a strike if the domain is malware or phishing.

**Rendering:** platform icon + short label (`@name`, "Steam page", domain for website). Open in a new tab with `rel="noopener noreferrer nofollow ugc"`. Verified links use `rel="me noopener noreferrer"` (no nofollow) and show a small check icon. Outbound click events are counted per link (private stat).

**Planned additions (P1, see open question 6):** Discord invite, itch.io, Reddit, Bluesky.

#### 3.2.4 Verified badge logic

Two separate signals, never mixed:

1. **Link ownership check** (per link, small check icon on the link): PromoVote confirmed this account controls that external account or page.
2. **Verified creator badge** (next to display name): PromoVote confirmed this creator is who they say they are. Tooltip copy: "Verified: PromoVote confirmed this creator owns the linked accounts. This is not an endorsement."

**Link ownership methods (P0):**

| Platform | Method | Automated in P0 |
|---|---|---|
| YouTube | Put code `promovote-XXXXXX` in channel description, we read it via YouTube Data API `channels.list` | Yes |
| Twitch | Put code in channel bio, read via Twitch Helix `users` endpoint (app token) | Yes |
| Kick, TikTok, Instagram, X | Put code in bio, owner submits, moderator checks a screenshot and the live page | Manual |
| Website | Meta tag `<meta name="promovote-verification" content="CODE">` on home page, or DNS TXT `promovote-verification=CODE`, or file `/.well-known/promovote.txt` | Yes |
| Steam, App Store, Google Play | Verify the developer website that the store page links to (website method). If the store page lists no website: manual review with evidence (for example a Steam community announcement containing the code). | Partly |

Code: 6 random base32 chars, single use, expires in 48 h, stored hashed. After success the creator may remove the code from their bio. P1: OAuth ownership for YouTube (Google, `youtube.readonly`) and Twitch.

**Verified creator badge criteria (all required):**
* At least one link ownership check passed on the creator's primary platform (YouTube for `youtuber`, Twitch or Kick for `streamer`, Steam or website for `game_dev`, App Store or Google Play or website for `app_maker`, website for `brand`, TikTok or Instagram for `short_video`).
* Avatar and display name approved, display name matches the verified account name or a clear variant (moderator judgment).
* No strikes in the last 90 days, account status `active`.
* Moderator approval (P0 all manual, target SLA 48 h).

**Badge is removed (hidden, not deleted) when:** the verified primary link is removed or fails a recheck, display name or handle change is pending review, a strike is issued, status leaves `active`. Badge is permanently revoked for impersonation or fraud.

**Uniqueness:** one external account can be verified by only one PromoVote profile (`unique (platform, external_id) where verify_status = 'verified'`). If a second profile tries, the request goes to manual review flagged "possible impersonation".

Scouts have no verified badge in P0 (P2: notable curators).

#### 3.2.5 Stats row (public)

| Stat | Rule | Format |
|---|---|---|
| Followers | Hidden publicly if < 10, replaced by chip "New creator". | 0 to 9,999 exact with comma. 10K to 999K one decimal (`12.4K`). 1M+ (`1.2M`). Screen readers get the full number. |
| Promos | Count of `live` + `paused` promos. | Integer |
| Best rank | Best weekly rank ever, for example `#3 Cozy`. Hidden if never top 10. | `#n Category` |

#### 3.2.6 Actions

* **Follow / Following** (primary, gradient button). Logged out: opens sign up sheet, returns to the page and completes the follow.
* **Share** (secondary). Native share sheet, fallback copy link with toast "Link copied".
* **Overflow menu** (three dots): Copy link, Report, Block (logged in only), "Why am I seeing this creator?" (P1).

#### 3.2.7 Pinned badges

Up to 3 badges in the header strip. Owner picks. Default: rarest, then most recent. Full list in the Rankings tab.

Creator badges P0: `founding_creator`, `top10_week` (per category, stackable count "Top 10 x3"), `number1_week`, `perk_giver` (has offered at least one perk that was claimed at least 10 times). Verified is not in the badge list, it sits next to the name.

#### 3.2.8 Perks callout (only if an active perk exists)

Card with lime accent border: perk title ("Free beta key"), promo name, stock state ("42 left" or "Limited"), end date, **Get perk** button.

Hard rules (enforced server side in the claim Edge Function):
* Claim never reads `votes`, `follows` or reactions. Claim eligibility only: logged in, email verified, account age >= 7 days, age confirmed 18+, passes device and rate checks, max 1 claim per account per perk, max 3 claims per account per day.
* Distribution is first come, first served. No raffles, no draws in P0 (sweepstakes rules).
* Copy rule: never "Follow to unlock", "Vote to get", "Subscribe for a key". Promo review rejects any promo or perk text that asks for follow, subscribe, vote or review in exchange for a reward.
* A scout's later reactions to a promo after claiming its perk are tagged `received_perk = true` in the report data (FTC disclosure, shown to the creator as a segment).

#### 3.2.9 Promos tab (default tab)

**Public grid:** `live` and `paused` promos. Order: pinned promo first (P1), then `live` by `live_at` desc, then `paused` by `live_at` desc. 12 per page, cursor pagination, infinite scroll.

**Promo tile (public):** poster frame (cropped to 4:5 with center focus, focal point picker P1), duration chip `0:28`, title (1 line, ellipsis), chips: rank (`#2 Cozy W41`), "Perk" (lime), "New" (live < 7 days). View bucket under title if >= 100 verified views and `show_view_counts = true` (`1.2K views`). Tap: opens the profile player (vertical, swipes through this creator's promos only, same vote and save controls as the feed).

**Owner extras:** a "Studio" strip above the grid with non public promos:

| Status | Chip | Owner action | Copy |
|---|---|---|---|
| `draft` | grey "Draft" | Continue, Delete | "Finish your draft to submit it." |
| `in_review` | violet "In review" | Withdraw | "A real person reviews every promo. Usually within 24 hours." |
| `live` | lime "Live" | Pause, Open report | |
| `rejected` | pink "Needs changes" if `fix_allowed`, else "Rejected" | Fix and resubmit (if allowed), Appeal, Delete | Shows `rejection_code` label + moderator note. |
| `paused` | grey "Paused" | Resume (goes live again if review is still valid, re review if > 90 days or CTA changed) | "Paused promos stay on your profile but leave the feed." |
| `removed` (admin only status) | red "Removed" | Appeal | Statement of reasons shown. |

**Promo field limits** (full promo spec lives in the upload spec, summary here for profile rendering):

| Field | Limit |
|---|---|
| Video duration | Free: 10 to 30 s. Paid (Boost or Trailer Test): 10 to 60 s. Server reads duration from Cloudflare Stream, tolerance 0.5 s. Upload limits live in `docs/04` section 4.1 (monthly). |
| File | MP4, MOV, WebM. Max 200 MB. Min 480 px short side. Aspect 9:16, 4:5, 1:1 or 16:9 (16:9 is letterboxed in the vertical player, never cropped). |
| Variants | 1 or 2 (A/B for Trailer Test) |
| Title | 3 to 60 chars |
| Description | 0 to 280 chars, no URLs |
| CTA URL | Must match the allow list for its CTA label, safety scan same as links, rescan every 24 h while live |
| CTA label | enum: `wishlist_steam`, `play_now`, `get_app_store`, `get_google_play`, `watch_youtube`, `watch_twitch`, `watch_kick`, `see_tiktok`, `see_instagram`, `visit_website` |
| Captions | Optional WebVTT, max 200 KB |
| Rights confirmation | Required checkbox, timestamp stored |
| Slots P0 | Max 3 `live`, max 3 `in_review`, max 10 `draft`, max 50 total per creator |

**Empty states:**
* Public, no promos: illustration + "No promos live yet. Follow to get the first one in your drop."
* Owner, no promos: "Post your first promo. 10 to 30 seconds. A real person reviews it, usually within 24 hours." Button "Upload promo".

#### 3.2.10 Rankings tab

List of weekly ranking finishes: week label (`Week 41, 2026`), category, rank, promo thumbnail. Plus full badge list with earned dates. Empty (public): tab hidden. Empty (owner): "Promos that reach the weekly top 10 show up here. Rankings are published every Monday."

#### 3.2.11 About tab

Bio (full), creator kind chips, all tags, all links with labels, joined month and year, "Verified since" date if verified. Owner sees "Edit profile". P1: "Press kit" link, studio location at country level (opt in).

### 3.3 Scout profile: sections in order

Order: Header (avatar, identity, level ring), Scout Score block, Stats row, Actions, Pinned badges, Owner only cards (today's drop, pending calls), Tabs (Called it, Badges, Saved, Following).

#### 3.3.1 Identity block

| Field | Type | Limits | Required |
|---|---|---|---|
| `handle` | text | 3.1.1 | Yes |
| `display_name` | text | 3.1.2 | Yes (defaults to handle) |
| `avatar` | image | 3.1.3 | No (monogram default) |
| `bio` | text | 3.1.4, max 160 | No |
| Level ring | system | Ring around avatar, lime progress to next level | System |
| `early_scout` chip | system | Shown for waitlist and beta wave accounts | System |

Scouts have no external links in P0 (spam vector on low moderation pages). P1: up to 2 links (X, website) after account age 30 days and 10 resolved calls.

#### 3.3.2 Scout Score block

* Big number (Bricolage Grotesque, 48 px mobile), label "Scout Score".
* Level `Level 7` + progress bar (lime) "180 to Level 8" (owner only shows the remaining count; public shows level only).
* Level thresholds v1: level n needs `25 * n * (n - 1)` points (L1 = 0, L2 = 50, L3 = 150, L4 = 300 ... L50 = 61,250). Cap 50.
* Score is always exact (it is identity), never abbreviated below 1M.

#### 3.3.3 Stats row

| Stat | Public rule |
|---|---|
| Called it | Count of `called_it` calls. Always shown (0 shown as "0"). |
| Accuracy | `correct will_blow_up / resolved will_blow_up`. Public only after 10 resolved calls. Owner sees it earlier with "Provisional". |
| Streak | Current weekly streak. Public only if >= 2 weeks. |
| Best weekly rank | Public if ever top 100 and leaderboards toggle on. |

#### 3.3.4 Actions

* Owner: "Edit profile", "Share my card".
* Visitor: "Share", overflow (Copy link, Report, Block).
* No Follow button for scouts in P0. Following scouts is P1 ("Follow this scout's picks"), because it only makes sense once curator lists exist.

#### 3.3.5 Badges

Scout badges P0:

| Badge | Rule | Tiers |
|---|---|---|
| Early Scout | Account created during waitlist or beta waves | 1 |
| Called It | Number of `called_it` calls | 1, 10, 50 |
| Sharp Eye | Accuracy >= 40% over >= 25 resolved `will_blow_up` calls (random baseline is about 20%) | 1 |
| Streak | Weekly streak reached | 4, 12, 26 weeks |
| Top Scout | Finished a week in the top 10 scouts | count |
| Founding Scout | On the waitlist before launch | 1 |

Rules: badges are never awarded for watch time, number of promos watched, follows, shares or perk claims. Badge icons are SVG with a text label (no emoji only badges). Owner can pin up to 3 and hide any badge from public view.

#### 3.3.6 Scout Score rules (summary for profile display, v1 defaults)

* A call resolves 7 days after the promo's `live_at`.
* Correct `will_blow_up`: +10 x early multiplier. Early multiplier by voter position among valid voters of that promo: first 10% x3, next 20% x2, rest x1.
* Incorrect `will_blow_up`: minus 3.
* `not_for_me`: never changes the score. Honest taste is never punished.
* Void promo (under 150 valid views): no change.
* Eligibility: call made within 72 h of `live_at`, account age >= 24 h, passes fraud checks, max 10 score eligible calls per day.
* Score floor 0. All changes are rows in `score_events` (ledger), written only by the service role.
* `called_it` = correct `will_blow_up` with multiplier 2 or 3.
* Calls on promos of a creator page owned by the same account are blocked (button disabled with "This is your promo").

#### 3.3.7 Streak

* Weekly, not daily (forgiving by design). Week = Monday to Sunday in the scout's timezone.
* A week counts if the scout completes at least 3 daily drops (complete = took an action on every item: call, save or skip).
* 1 freeze earned every 4 streak weeks, max 2 stored, applied automatically.
* Notifications never threaten loss ("Your streak will die" is banned copy). Allowed: "Today's drop is ready."

#### 3.3.8 Owner only cards (above tabs)

* **Today's drop card:** "3 of 7 left" + button "Continue", or "Done for today. Your calls reveal in 7 days."
* **Pending calls:** horizontal list of unresolved calls with countdown "Reveals in 3 days". Private always (prevents herding and copy voting).
* **Just resolved** (opening reward): "Your call on Hollow Lantern was right. +20" with a share button. Shown once per resolution, then moves to history.

#### 3.3.9 Tabs

| Tab | Content | Default visibility | Empty state (owner / public) |
|---|---|---|---|
| Called it (default) | Timeline cards: promo thumbnail, creator, date called, outcome, points, multiplier. Only resolved `called_it` calls. 20 per page. | Public (`show_calls` default true) | "Your first calls reveal 7 days after you make them. Today's drop is ready." / "@handle has not called one yet." |
| Badges | Grid of earned badges + locked badges (owner only, greyed, with how to earn) | Public | Owner sees locked badges. Public hides tab if none. |
| Saved | Grid of saved promos | Private (`show_saved` default false). Tab is hidden for visitors when private. | "Tap Save on any promo to keep it here." |
| Following | List of followed creators | Private (`show_following` default false) | "Follow creators to get their next promo in your drop." |

#### 3.3.10 Activity

* Public "activity" is only: badges earned and resolved called it calls. Nothing else.
* Owner activity (Settings > Activity, P1): own calls, saves, follows, perk claims, with "Delete" per row for saves and follows. Watched and skipped history is visible to the owner only and can be cleared (clearing affects personalization, not reports already delivered, since reports use aggregates).

#### 3.3.11 Rankings on scout profile

Current week position if top 100 ("#14 this week"), best ever rank, link to `/top/scouts`. Scouts can opt out of public leaderboards (`show_in_leaderboards = false`); they still earn score but are skipped in published lists.

---

## 4. Creator stats: public vs private

| Metric | Public | Owner (profile quick stats) | Owner (Trailer Test report, panel) | Notes |
|---|---|---|---|---|
| Followers | Yes (>= 10) | Exact + 7 day delta | Yes | |
| Follower identities | No | **No** in P0 (aggregate only) | No | Protects scouts. P1: only scouts with `show_following = true`. |
| Promos count | Yes | Yes | | |
| Verified views per promo | Bucketed, >= 100, owner can hide | Exact | Exact | |
| Completion rate, retention curve, drop off second | No | Top line only (completion %) | Full | Private by default. |
| A/B result | No | Winner label | Full | |
| CTA click rate | No | Yes | Yes | |
| "Interested" share and call split | No | Yes | Yes | Never public (would bias future calls). |
| Skip second distribution | No | No | Yes | |
| Invalid views removed | No | Yes | Yes (with reason breakdown) | Transparency sells. |
| Weekly rank and badges | Yes | Yes | Yes | |
| Perk claims | Stock left only | Claims count | Claims + segment of reactions from perk receivers | |
| Profile visits, link clicks | No | Yes (P1) | P1 | |

**Opt in public highlights (P1):** owner can publish a "highlights card" from a report, choosing only from: completion %, "interested" %, rank. Card is generated as an image with "Verified by PromoVote" and the report date. Raw report data is never published.

---

## 5. Social mechanics

### 5.1 Follow

* Direction P0: scout profile follows creator page. Scout to scout is P1. Creator page cannot follow.
* Free, instant, optimistic UI. No points, no badges, no perk access, no ranking weight for the follower. Follow gain counts in a promo's Hit Score only when it comes from that promo's own view (source tracked), and only after fraud filtering.
* Rate limits: 60 follow or unfollow actions per hour, 500 per day per account. Follow and unfollow of the same creator more than 3 times in 24 h is ignored silently after the 3rd.
* Effect: followed creators' new promos get priority in the scout's drop (max 2 slots of 7, so drops stay discovery first).
* P1: launch notification to followers when a new promo goes live (max 1 per creator per 7 days, per scout max 1 such notification per day).
* Code guard: `score_events.reason` enum has no follow related value. `perk_claims` function has no read access to `follows`. A unit test asserts both.

### 5.2 Share card (OG image per profile)

* URL: `https://promovote.com/og/@{handle}.png?v={og_version}`, 1200 x 630 PNG.
* Generated at the edge by a Cloudflare Worker (Satori + resvg WASM), cached in R2 by `profile_id + og_version`. `og_version` increments on any change to avatar, display name, verified, follower bucket, Scout Score bucket, pinned badges.
* Creator card: banner as blurred background, avatar, display name, verified badge, kind label, followers (if >= 10), best rank, PromoVote logo, "promovote.com/@handle".
* Scout card: dark background with pink to violet glow, avatar, `@handle`, "Scout level 7", Scout Score, "Called it x12", up to 3 badges, PromoVote logo.
* P1: 1080 x 1920 story card for Instagram and TikTok stories, and "I called it" card per resolved call.
* Suspended, deactivated, deleted: OG falls back to the generic `og.png`.

### 5.3 Report

* Who: logged in accounts only (account age >= 1 h). Logged out users get a link to the email form for legal notices (DMCA, trademark).
* Targets: profile (avatar, banner, display name, bio, link), promo, perk.
* Reasons (enum): `impersonation`, `spam_or_scam`, `malicious_link`, `nudity_or_sexual`, `hate_or_harassment`, `violence`, `copyright`, `trademark`, `minor` (user seems under 18), `misleading_perk`, `asks_for_votes_or_follows`, `other`.
* Optional details: 0 to 500 chars. Copyright and trademark open the dedicated form (required legal fields).
* Rate limit: 20 reports per day per account.
* Reporter gets a confirmation and, when resolved, an outcome notice (DSA style). Reports are anonymous to the reported party.
* Thresholds: 3 unique reports with the same reason in 24 h on a profile field auto hides that field pending review (not the whole profile). `minor` reports go to the top of the queue.

### 5.4 Block

* Logged in only. Unblock any time from Settings > Blocked.
* Scout blocks creator: creator's promos never appear in the scout's drop, the profile shows "You blocked @handle. Unblock?", follow is removed, perks from that creator are hidden.
* Scout blocks scout: each hides the other's profile ("Profile not available").
* Creator blocks scout: removes the scout's follow and prevents re-following. It **does not** stop that scout from seeing or voting on the creator's promos and their votes stay in reports. A creator cannot suppress negative feedback (FTC review suppression rule).
* P1: "Not interested in this creator" (mute) as a softer option in the feed.

### 5.5 Hard rules (copy these into Advertiser Terms and code review checklist)

1. No reward of any kind for following or subscribing, on PromoVote or any external platform.
2. Perks are never tied to calls, votes, reactions, follows or reviews.
3. Creators cannot ask for votes or follows in exchange for anything, in promos, bios, perks or links.
4. Creators cannot vote on their own promos. Creators' coordinated voting on their own work is fraud and closes the account.
5. Scout Score has no cash value, cannot be spent, cannot be transferred. Stated in ToS.

---

## 6. Privacy and safety

### 6.1 Age (18+)

* Sign up asks date of birth (month, day, year picker). Only `birth_year` and `age_confirmed_at` are stored. Under 18: account is not created, no email stored, a 24 h device cookie blocks retries, copy: "PromoVote is for people 18 and older."
* `minor` reports: profile limited instantly, moderator review within 24 h, confirmed minors are deleted.
* No school, age or birthday fields on profiles ever.

### 6.2 Never public

Email, birth year, country, timezone, IP, device data, auth provider, legal name, KYC status, payment data, watched and skipped history, pending calls, `not_for_me` calls, perk claim history, blocks, reports made or received, strikes (public), raw score ledger.

Country: stored as ISO 3166 two letter code (from IP at sign up, user can correct it in settings). Never city or region. Used for compliance and aggregate report segments only (minimum segment size 50 people before a country appears in any report).

### 6.3 Privacy toggles (Settings > Privacy)

| Toggle | Applies to | Default |
|---|---|---|
| Show my called it history | Scout | On |
| Show my saved promos | Scout | Off |
| Show who I follow | Scout | Off |
| Show me in public leaderboards | Scout | On |
| Let search engines index my profile | Scout | Off |
| Show view counts on my promos | Creator | On |
| Show my follower count | Creator | On (hidden anyway below 10) |

Toggle changes apply instantly and bump `og_version`.

### 6.4 Moderation of profile content

| Content | Automated | Human |
|---|---|---|
| Avatar, banner | Image classifier on upload, EXIF strip | Grey zone and reported items |
| Display name, bio | Profanity, slur, URL, contact info, confusable check | Reported items |
| Handle | Regex, reserved list, offensive substring list | Reported items, impersonation |
| Links | Allow list, redirect check, Web Risk, rescans | Flagged and reported |
| New creator page | All of the above | First promo review covers the whole profile (moderator sees profile card in the promo review screen) |

Strikes: 3 strikes in 180 days = suspension. Malware or phishing link, impersonation of a verified creator, or confirmed vote fraud = immediate suspension. Appeals: in app form (P0 via email `support@promovote.com`), answered within 7 days.

### 6.5 Impersonation and verification

* Prevention: confusable display name check, protected names list on handles, unique verified external ids, verified badge only after link ownership.
* Claim flow for a protected or squatted handle: the real owner opens "Claim this handle" from the reserved or taken message, proves ownership of the matching external account (3.2.4 methods), moderator decides. If the current holder is impersonating, their handle is force changed and they get a strike.
* Trademark complaints: form at `/legal/trademark`, handled per written policy.

### 6.6 Handle squatting

* One scout profile and one creator page per account in P0, so one account holds max 2 handles.
* Sign up protected by Turnstile on web and App Attest or Play Integrity on mobile (P0 for web, mobile with store launch).
* Creator pages with zero promos ever submitted and no login for 12 months: email warning, then handle released after 30 days (P2 policy, documented in ToS from day 1).
* Handles are not transferable and cannot be sold. Selling handles = ToS violation.

### 6.7 Account deletion (P0, Apple requirement)

* Settings > Account > Delete account. Re-auth required. Clear explanation of what happens.
* 30 day grace period (`pending_deletion`): profile and promos hidden immediately, login during grace offers "Restore account".
* After 30 days: personal data hard deleted (profile fields, media, links, saves, follows, blocks, settings). Votes and view events are kept only as anonymized aggregates (user id nulled) so delivered reports stay accurate. Payment records stay in Stripe as required for tax (owner of record is the LLC, retention period per lawyer).
* Creator page deletion alone (keep scout profile): same flow, scoped to the page.

### 6.8 Data export

* P0: by email request to `support@promovote.com`, delivered within 30 days (manual script).
* P1: self serve. Settings > Account > Download my data. ZIP with JSON (profile, settings, calls, score ledger, saves, follows, perk claims, badges) and media files. Link emailed, valid 7 days. Max 1 request per 7 days.

---

## 7. Onboarding and edit flows

### 7.1 Scout onboarding (goal: first drop in under 60 seconds)

1. **Entry:** landing page, shared link (creator page, scout card, promo), or app store. Deep link context is kept (for example "@pixelscout invited you").
2. **Sign up:** Continue with Apple, Continue with Google, or email magic link. Turnstile on web. Waitlist emails are matched and get `early_scout` and `founding_scout`.
3. **Age gate:** date of birth. Under 18 stops here (6.1).
4. **Pick what you like:** at least 3 tags from a grid (games P0 tags; creator tags only if the flag is on). Skippable is not allowed, minimum 3.
5. **Your handle:** prefilled suggestion from Apple or Google name or email prefix, editable, live availability check. Display name prefilled. Avatar optional ("Add later").
6. **First drop:** goes straight into today's drop. A 3 step coach mark on the first promo: "Skip is free", "Call it: Will blow up or Not for me", "Save to keep it".
7. **Drop done screen:** "Done for today. Your calls reveal in 7 days." Then the profile reveal: animated Scout Score card with the first badge (Early Scout if applicable) and "Share my card".
8. **Notification permission** (native only, asked here, not earlier): "Get tomorrow's drop at 7 pm?" with time picker. Web: email reminder opt in instead.

### 7.2 Creator onboarding (web first, also available in app)

1. **Entry:** "I'm a creator" on landing, panel URL `promovote.com/create`, or invite link from outreach.
2. **Sign up** (same as scout). The scout profile is created silently in the background with the same display name and a suggested handle; the user can edit it later.
3. **Age gate.**
4. **What do you make?** Pick primary creator kind (cards with icons). Kinds not enabled show "Coming soon" and join a waitlist.
5. **Your page:** handle (suggested from the name of the main external account if a link is pasted first), display name, avatar (required, can finish later but submit is blocked without it).
6. **Main link:** paste the primary platform link. Normalized and scanned live. Offer "Verify now" (opens 3.2.4 flow) or "Later".
7. **Tags:** 1 to 5 tags.
8. **Bio and banner:** optional, "Skip for now".
9. **First promo:** "Upload your first promo" or "Do it later". Upload flow is the promo spec; at submit the creator confirms rights and the Advertising Policy (checkboxes, timestamps stored).
10. **Done screen:** page preview, status "Your page is live. It will appear in search after your first promo is approved." Share button.

Creator page visibility during onboarding: public immediately at `/@handle` (so the creator can share it), `noindex` until the first promo is approved, and hidden from in app search until then.

### 7.3 Profile edit flow (both types)

* Entry: "Edit profile" on own profile.
* One screen, sections: Photo and banner, Name, Handle (opens its own screen), Bio, Kind and tags (creator), Links (creator), Privacy (shortcut).
* Each text field shows a live character counter from 80% of the limit, turns pink at the limit. Validation runs on blur and on save; server errors map to the field.
* Live preview toggle (mobile) or side preview (desktop) showing the public view.
* Save button disabled until something changed and all fields are valid. Leaving with unsaved changes shows "Discard changes?".
* Media: pick, crop (avatar 1:1 circle, banner 3:1 with safe area), upload with progress, then "Checking image" state (usually under 5 s). Rejected: inline error with reason, previous image kept.
* Handle change screen: shows current handle, next allowed change date, rules, warning "Your old link will redirect for 14 days (creators 90). After that someone else can take it." Requires typing the new handle and confirming.
* Verified creators: changing display name or handle shows "This will hide your verified badge until we review it (usually within 24 hours)."
* Saves are idempotent; conflicting edits from two devices: last write wins, with `updated_at` check that shows "This profile changed on another device. Reload?"

---

## 8. URLs, SEO and share previews

### 8.1 URL structure

| URL | Page |
|---|---|
| `/@{handle}` | Profile (creator or scout, rendered by type) |
| `/@{handle}/promos` | Creator promos tab (same page, tab state) |
| `/@{handle}/rankings` | Creator rankings tab |
| `/@{handle}/about` | Creator about tab |
| `/@{handle}/calls` | Scout called it tab |
| `/@{handle}/badges` | Scout badges tab |
| `/@{handle}/saved` | Scout saved (404 for visitors if private) |
| `/@{handle}/following` | Scout following (404 for visitors if private) |
| `/p/{promo_id}-{slug}` | Single promo page (promo spec) |
| `/top/{yyyy}-w{ww}` and `/top/scouts` | Weekly rankings |
| `/settings/...` | Owner settings (noindex, disallowed in robots) |
| `/og/@{handle}.png` | Share image |
| `/embed/@{handle}/badge` | Embed widget (P1) |

Rules:
* Uppercase in the handle part redirects 301 to lowercase.
* Old handle during hold: 301 to the new handle (same subpath).
* Unknown, released, deleted, `pending_deletion`, deactivated: 404 page "Profile not found." No hint about why.
* Suspended: 200 page with "This account is suspended." and `noindex`.
* Implementation note: Expo Router file names cannot start with `@` reliably on all targets. Use internal route `/u/[handle]` and a Cloudflare Worker rewrite from `/@{handle}` to `/u/{handle}`; the canonical public URL stays `/@{handle}`. In native apps, universal links (iOS) and app links (Android) map `/@*` to the profile screen.

### 8.2 SEO rules

* Creator pages indexable when: status `active`, at least 1 promo approved ever, not suspended. Else `noindex`.
* Scout pages: `noindex, follow` by default. Indexable only if the owner turns on "Let search engines index my profile" (P1).
* Edge rendering: Expo web output is a client app, so the Cloudflare Worker serves `/@handle` with a server rendered `<head>` (title, description, canonical, robots, OG, Twitter, JSON-LD) and a minimal HTML body with the key profile content (name, bio, links, promo titles) for crawlers and no JS clients. Cache 5 min at the edge, purged on `og_version` change.
* Title templates:
  * Creator: `{display_name} (@{handle}) | PromoVote`
  * Scout: `{display_name} (@{handle}), Scout on PromoVote`
* Description: creator bio first 155 chars, fallback `Watch promos from {display_name}, {kind label} on PromoVote.` Scout: `Scout level {n} on PromoVote. Called it {k} times.`
* Canonical: `https://promovote.com/@{handle}`. Tab subpaths canonical to their own URL for creators, to the root profile for scouts.
* JSON-LD: `ProfilePage` with `mainEntity` = `Person` (youtuber, streamer, short_video) or `Organization` (game_dev, app_maker, brand), `name`, `alternateName` = `@handle`, `image`, `description`, `sameAs` = verified link URLs only, `interactionStatistic` follow count (only if >= 10).
* Sitemaps: `/sitemaps/creators-{n}.xml`, 10,000 URLs per file, regenerated daily from a view of indexable creators. Scouts never in sitemaps unless opted in.
* `robots.txt`: allow `/@`, `/p/`, `/top/`; disallow `/settings`, `/api`, `/out`, `/admin`, `/og/` (images are fetched directly by social crawlers, not search).

### 8.3 Share previews

* `og:title` and `twitter:title` = title template.
* `og:image` = `/og/@{handle}.png?v={og_version}`, `og:image:width` 1200, `og:image:height` 630, `twitter:card` = `summary_large_image`.
* `og:type` = `profile`, `profile:username` = handle.
* Discord and Slack unfurl use OG. Test with Discord, X, Reddit, iMessage, WhatsApp before launch (checklist item).

---

## 9. Data model (Postgres, Supabase)

Conventions: `uuid` ids, `timestamptz` for all times, `created_at` and `updated_at` on every table, `updated_at` trigger. Anon and authenticated roles never read base tables that hold private columns; public data is served through views that select only public columns. Computed fields (scores, counts, verification, status) are written only by the service role from Edge Functions or cron jobs.

### 9.1 Enums

```sql
create type profile_type as enum ('scout', 'creator');
create type profile_status as enum ('active', 'limited', 'suspended', 'deactivated', 'pending_deletion', 'deleted');
create type creator_kind as enum ('game_dev', 'youtuber', 'streamer', 'short_video', 'app_maker', 'brand');
create type link_platform as enum ('youtube', 'twitch', 'kick', 'tiktok', 'instagram', 'x', 'steam', 'app_store', 'google_play', 'website');
create type verify_status as enum ('unverified', 'pending', 'verified', 'failed', 'revoked');
create type verify_method as enum ('code_in_bio_api', 'code_in_bio_manual', 'domain_meta', 'domain_dns', 'domain_file', 'oauth', 'manual');
create type safety_status as enum ('pending', 'safe', 'flagged', 'blocked');
create type media_kind as enum ('avatar', 'banner');
create type moderation_status as enum ('pending', 'approved', 'rejected');
create type promo_status as enum ('draft', 'in_review', 'live', 'rejected', 'paused', 'removed');
create type call_choice as enum ('will_blow_up', 'not_for_me');
create type call_outcome as enum ('pending', 'correct', 'incorrect', 'void');
create type score_reason as enum ('call_correct', 'call_incorrect', 'admin_adjustment', 'fraud_reversal');
create type report_reason as enum ('impersonation', 'spam_or_scam', 'malicious_link', 'nudity_or_sexual', 'hate_or_harassment', 'violence', 'copyright', 'trademark', 'minor', 'misleading_perk', 'asks_for_votes_or_follows', 'other');
create type report_status as enum ('open', 'in_review', 'actioned', 'dismissed');
create type staff_role as enum ('admin', 'moderator', 'support');
```

Note: `score_reason` intentionally has no follow, watch time, share or perk value.

### 9.2 Tables

```sql
-- Private account data. One row per auth user.
create table account_private (
  user_id uuid primary key references auth.users(id) on delete cascade,
  birth_year smallint not null check (birth_year between 1900 and 2100),
  age_confirmed_at timestamptz not null,
  country_code char(2),
  timezone text not null default 'UTC',
  marketing_opt_in boolean not null default false,
  staff_role staff_role,
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  kind media_kind not null,
  storage_path text not null,           -- private bucket until approved
  public_path text,                     -- set when approved (public bucket, random path)
  width int, height int, bytes int,
  mime text not null check (mime in ('image/jpeg', 'image/png', 'image/webp')),
  moderation_status moderation_status not null default 'pending',
  moderation_labels jsonb,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  type profile_type not null,
  handle text not null unique
    check (handle ~ '^[a-z][a-z0-9_]{2,23}$' and handle !~ '__' and handle !~ '_$'),
  display_name text not null check (char_length(display_name) between 1 and 80),
  bio text check (char_length(bio) <= 600),
  avatar_media_id uuid references media_assets(id) on delete set null,
  banner_media_id uuid references media_assets(id) on delete set null,
  status profile_status not null default 'active',
  is_verified boolean not null default false,
  verified_at timestamptz,
  is_indexable boolean not null default false,   -- computed by service role
  follower_count int not null default 0,          -- creators, trigger maintained
  og_version int not null default 1,
  handle_changed_at timestamptz,
  free_handle_change_used boolean not null default false,
  pinned_badge_ids uuid[] not null default '{}' check (cardinality(pinned_badge_ids) <= 3),
  deletion_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_one_scout_per_user on profiles(owner_user_id) where type = 'scout';
create unique index profiles_one_creator_per_user on profiles(owner_user_id) where type = 'creator'; -- drop in P1 for multi page
create index profiles_type_status on profiles(type, status);
create index profiles_display_name_trgm on profiles using gin (display_name gin_trgm_ops);

create table profile_settings (
  profile_id uuid primary key references profiles(id) on delete cascade,
  show_calls boolean not null default true,
  show_saved boolean not null default false,
  show_following boolean not null default false,
  show_in_leaderboards boolean not null default true,
  allow_indexing boolean not null default false,     -- scouts, P1
  show_view_counts boolean not null default true,    -- creators
  show_follower_count boolean not null default true, -- creators
  drop_reminder_time time,                           -- local time
  updated_at timestamptz not null default now()
);

create table creator_details (
  profile_id uuid primary key references profiles(id) on delete cascade,
  kind creator_kind not null,
  secondary_kinds creator_kind[] not null default '{}' check (cardinality(secondary_kinds) <= 2),
  contact_email text,            -- private, for platform communication
  legal_name text,               -- private
  kyc_status text not null default 'none' check (kyc_status in ('none', 'pending', 'passed', 'failed')),
  founding_creator boolean not null default false,
  live_slot_limit smallint not null default 3,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table profile_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  platform link_platform not null,
  url_input text not null check (char_length(url_input) <= 500),
  canonical_url text not null,
  external_id text,
  position smallint not null default 0,
  verify_status verify_status not null default 'unverified',
  verify_method verify_method,
  verify_code_hash text,
  verify_code_expires_at timestamptz,
  verified_at timestamptz,
  safety_status safety_status not null default 'pending',
  last_scanned_at timestamptz,
  click_count int not null default 0,   -- private
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profile_links_one_per_platform on profile_links(profile_id, platform) where platform <> 'website';
create unique index profile_links_verified_unique on profile_links(platform, external_id) where verify_status = 'verified';
create index profile_links_lookup on profile_links(platform, external_id);
-- trigger: max 8 links per profile, max 2 website links, scouts cannot insert in P0

create table tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  tag_group text not null check (tag_group in ('genre', 'format', 'topic')),
  applies_to creator_kind[] not null,
  is_active boolean not null default true
);

create table profile_tags (
  profile_id uuid not null references profiles(id) on delete cascade,
  tag_id uuid not null references tags(id),
  position smallint not null default 0,
  primary key (profile_id, tag_id)
);
-- trigger: creators 1 to 5 tags; scouts use profile_tags as interests, 3 to 20

create table reserved_handles (
  handle text primary key,
  reason text not null check (reason in ('system', 'brand', 'protected_name', 'offensive', 'retired')),
  claimable_by_verification boolean not null default false,
  note text,
  created_at timestamptz not null default now()
);

create table handle_history (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  old_handle text not null,
  new_handle text not null,
  changed_by text not null check (changed_by in ('owner', 'admin')),
  hold_until timestamptz not null,
  redirect boolean not null default true,
  created_at timestamptz not null default now()
);
create index handle_history_old on handle_history(old_handle, hold_until);

create table promos (
  id uuid primary key default gen_random_uuid(),
  creator_profile_id uuid not null references profiles(id) on delete cascade,
  slug text not null,
  title text not null check (char_length(title) between 3 and 60),
  description text check (char_length(description) <= 280),
  category_tag_id uuid references tags(id),
  status promo_status not null default 'draft',
  cta_label text not null,
  cta_url text not null,
  cta_safety_status safety_status not null default 'pending',
  has_perk boolean not null default false,
  is_pinned boolean not null default false,
  rights_confirmed_at timestamptz,
  rejection_code text, rejection_note text, fix_allowed boolean,
  submitted_at timestamptz, approved_at timestamptz, live_at timestamptz, paused_at timestamptz,
  resolves_at timestamptz,
  hit_outcome call_outcome not null default 'pending',
  best_rank smallint, best_rank_week text,
  verified_view_count int not null default 0,   -- private exact
  public_view_bucket int,                        -- null if < 100
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index promos_creator_status on promos(creator_profile_id, status, live_at desc);
create index promos_resolves on promos(resolves_at) where hit_outcome = 'pending';

create table promo_variants (
  id uuid primary key default gen_random_uuid(),
  promo_id uuid not null references promos(id) on delete cascade,
  label char(1) not null check (label in ('A', 'B')),
  stream_uid text not null,          -- Cloudflare Stream video id
  duration_ms int not null check (duration_ms between 9500 and 45500),
  width int, height int,
  poster_time_ms int not null default 0,
  captions_path text,
  unique (promo_id, label)
);

create table follows (
  follower_profile_id uuid not null references profiles(id) on delete cascade,  -- scout
  creator_profile_id uuid not null references profiles(id) on delete cascade,   -- creator
  source text not null check (source in ('profile', 'feed', 'promo_page', 'share', 'other')),
  source_promo_id uuid references promos(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (follower_profile_id, creator_profile_id)
);
create index follows_creator on follows(creator_profile_id, created_at desc);
-- trigger: follower must be type scout, creator must be type creator, not same owner_user_id, not blocked; maintains profiles.follower_count

create table calls (
  id uuid primary key default gen_random_uuid(),
  scout_profile_id uuid not null references profiles(id) on delete cascade,
  promo_id uuid not null references promos(id) on delete cascade,
  variant_id uuid references promo_variants(id),
  choice call_choice not null,
  voter_ordinal int,                 -- position among valid voters, set by service role
  is_valid boolean not null default true,
  invalid_reason text,
  score_eligible boolean not null default false,
  outcome call_outcome not null default 'pending',
  multiplier smallint,
  score_delta int,
  is_called_it boolean not null default false,
  received_perk boolean not null default false,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (scout_profile_id, promo_id)
);
create index calls_scout_recent on calls(scout_profile_id, created_at desc);
create index calls_promo on calls(promo_id, created_at);
create index calls_called_it on calls(scout_profile_id, resolved_at desc) where is_called_it;
-- trigger: reject when promo.creator_profile.owner_user_id = scout.owner_user_id

create table saves (
  scout_profile_id uuid not null references profiles(id) on delete cascade,
  promo_id uuid not null references promos(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (scout_profile_id, promo_id)
);
create index saves_recent on saves(scout_profile_id, created_at desc);

create table scout_stats (
  profile_id uuid primary key references profiles(id) on delete cascade,
  scout_score int not null default 0 check (scout_score >= 0),
  level smallint not null default 1,
  calls_resolved_wbu int not null default 0,   -- resolved will_blow_up
  calls_correct_wbu int not null default 0,
  called_it_count int not null default 0,
  current_streak_weeks smallint not null default 0,
  best_streak_weeks smallint not null default 0,
  freezes_available smallint not null default 0 check (freezes_available <= 2),
  best_weekly_rank int,
  current_week_rank int,
  updated_at timestamptz not null default now()
);
create index scout_stats_score on scout_stats(scout_score desc);

create table score_events (
  id bigint generated always as identity primary key,
  profile_id uuid not null references profiles(id) on delete cascade,
  delta int not null,
  reason score_reason not null,
  call_id uuid references calls(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
create index score_events_profile on score_events(profile_id, created_at desc);

create table badges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  icon_path text not null,
  applies_to profile_type not null,
  tier smallint not null default 1,
  is_active boolean not null default true
);

create table profile_badges (
  profile_id uuid not null references profiles(id) on delete cascade,
  badge_id uuid not null references badges(id),
  awarded_at timestamptz not null default now(),
  ref jsonb,                       -- for example week and category for top10_week
  hidden_by_owner boolean not null default false,
  revoked_at timestamptz,
  primary key (profile_id, badge_id, awarded_at)
);
create index profile_badges_profile on profile_badges(profile_id) where revoked_at is null;

create table weekly_rankings (
  week text not null,              -- '2026-W41'
  scope text not null check (scope in ('promo', 'scout')),
  category_tag_id uuid,            -- null for overall
  rank int not null,
  entity_id uuid not null,         -- promo id or scout profile id
  score numeric not null,
  primary key (week, scope, category_tag_id, rank)
);
create index weekly_rankings_entity on weekly_rankings(entity_id, week desc);

create table blocks (
  blocker_profile_id uuid not null references profiles(id) on delete cascade,
  blocked_profile_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_profile_id, blocked_profile_id)
);
create index blocks_blocked on blocks(blocked_profile_id);

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid references auth.users(id) on delete set null,
  target_type text not null check (target_type in ('profile', 'avatar', 'banner', 'display_name', 'bio', 'link', 'promo', 'perk')),
  target_id uuid not null,
  target_profile_id uuid references profiles(id) on delete cascade,
  reason report_reason not null,
  details text check (char_length(details) <= 500),
  status report_status not null default 'open',
  priority smallint not null default 3,     -- 1 highest (minor, malware)
  assigned_to uuid references auth.users(id),
  resolution_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index reports_queue on reports(status, priority, created_at);
create index reports_target on reports(target_profile_id, created_at desc);

create table verification_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('link_ownership', 'verified_badge', 'handle_claim')),
  link_id uuid references profile_links(id) on delete cascade,
  evidence jsonb,                  -- screenshot paths, fetched snippets
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewer_id uuid references auth.users(id),
  decision_note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create table strikes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  reason_code text not null,
  report_id uuid references reports(id),
  issued_by uuid references auth.users(id),
  expires_at timestamptz not null,   -- issued + 180 days
  appealed boolean not null default false,
  overturned_at timestamptz,
  created_at timestamptz not null default now()
);

create table moderation_actions (
  id bigint generated always as identity primary key,
  actor_user_id uuid not null references auth.users(id),
  target_profile_id uuid references profiles(id) on delete set null,
  target_type text not null,
  target_id uuid,
  action text not null,           -- hide_avatar, reset_bio, hide_link, force_handle_change, remove_verified, limit, suspend, restore
  reason_code text not null,
  before jsonb, after jsonb,
  statement_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table pii_access_log (
  id bigint generated always as identity primary key,
  staff_user_id uuid not null references auth.users(id),
  subject_user_id uuid not null,
  fields text[] not null,
  context text,
  created_at timestamptz not null default now()
);

create table perks (
  id uuid primary key default gen_random_uuid(),
  promo_id uuid not null references promos(id) on delete cascade,
  creator_profile_id uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('steam_key', 'code', 'beta_invite', 'discount')),
  title text not null check (char_length(title) between 3 and 60),
  description text check (char_length(description) <= 200),
  stock_total int not null check (stock_total between 1 and 10000),
  stock_left int not null,
  starts_at timestamptz not null, ends_at timestamptz not null,
  status text not null default 'in_review' check (status in ('in_review', 'active', 'ended', 'removed')),
  created_at timestamptz not null default now()
);

create table perk_codes (
  id uuid primary key default gen_random_uuid(),
  perk_id uuid not null references perks(id) on delete cascade,
  code_encrypted bytea not null,
  claimed_by_user_id uuid references auth.users(id),
  claimed_at timestamptz
);
create index perk_codes_free on perk_codes(perk_id) where claimed_by_user_id is null;

create table perk_claims (
  perk_id uuid not null references perks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  code_id uuid references perk_codes(id),
  claimed_at timestamptz not null default now(),
  primary key (perk_id, user_id)
);

create table data_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('export', 'delete_account', 'delete_creator_page')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'cancelled')),
  download_path text, expires_at timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
```

### 9.3 Public views (the only things anon can read)

| View | Columns | Filter |
|---|---|---|
| `public_profiles` | id, type, handle, display_name, bio, avatar public path, banner public path, is_verified, created_at (month precision), follower_count (null if < 10 or hidden), best rank, pinned badges | `status in ('active','limited')` and not `pending_deletion`, `deleted`, `deactivated`. Suspended returns a stub row (handle, status) only. |
| `public_creator_details` | profile_id, kind, secondary_kinds, founding_creator | joined to active creators |
| `public_profile_links` | profile_id, platform, canonical_url, label, is_verified, position | `safety_status = 'safe'` |
| `public_profile_tags` | profile_id, tag slug, label | creators only (scout interests are private) |
| `public_promos` | id, creator_profile_id, slug, title, description, duration, poster, has_perk, live_at, best_rank, public_view_bucket (null if creator hides) | `status in ('live','paused')` |
| `public_scout_stats` | profile_id, scout_score, level, called_it_count, accuracy (null if < 10 resolved), current_streak_weeks (null if < 2), best_weekly_rank (null if leaderboards off) | active scouts |
| `public_called_it` | scout_profile_id, promo_id, created_at, resolved_at, multiplier, score_delta | `is_called_it` and owner `show_calls` |
| `public_saves`, `public_following` | as named | only when the matching toggle is on |
| `public_profile_badges` | profile_id, badge slug, name, icon, awarded_at | not hidden, not revoked |

Views are created with `security_invoker = false`, owned by a dedicated `api_public` role that has select on the base tables, and anon and authenticated get `select` on the views only. All views also exclude rows where the viewer is in `blocks` with the profile (via `auth.uid()` lookup).

### 9.4 RLS notes (base tables)

| Table | Owner (authenticated) | Others | Service role |
|---|---|---|---|
| `account_private` | select own; update `timezone`, `marketing_opt_in`, `country_code` only (column grants) | none | all |
| `profiles` | select own rows; update `display_name`, `bio`, `avatar_media_id`, `banner_media_id`, `pinned_badge_ids` only (column grants); handle changes only via `change_handle()` RPC (security definer, enforces limits) | none (use views) | all |
| `profile_settings` | select, update own | none | all |
| `creator_details` | select own; update `secondary_kinds`, `contact_email` | none | all |
| `profile_links` | select own; insert, delete own via `upsert_link()` RPC (runs normalization and queues scan) | none | all |
| `media_assets` | insert own (upload via signed URL), select own | none | all |
| `follows` | insert, delete where follower is own scout profile; select own | none (public lists through views) | all |
| `calls` | insert own via `cast_call()` RPC; select own | none | all |
| `saves` | insert, delete, select own | none | all |
| `scout_stats`, `score_events`, `profile_badges`, `weekly_rankings` | select own (stats and ledger) | none (views) | all writes |
| `blocks` | insert, delete, select own | none | all |
| `reports` | insert own; select own (status only) | none | all |
| `verification_requests` | insert own, select own | none | all |
| `strikes` | select own | none | all |
| `moderation_actions`, `pii_access_log` | none | none | all; staff read via admin Edge Functions that check `staff_role` |
| `perk_codes` | none | none | all (claim RPC decrypts one code) |
| `perk_claims` | select own | none | all |

"Own" means `profiles.owner_user_id = auth.uid()` (resolved in a stable SQL helper `owns_profile(profile_id)`).

### 9.5 Jobs (pg_cron or Edge Function schedules)

* Every 10 min: resolve due promos (`resolves_at <= now()`), compute outcomes, write `score_events`, update `scout_stats`, award badges.
* Hourly: refresh `public_view_bucket`, follower_count reconciliation, `is_indexable`.
* Daily: link rescans for live CTA URLs, sitemap rebuild, handle hold expiry, deletion finalization.
* Weekly (Monday 00:00 UTC): `weekly_rankings`, top 10 badges, streak evaluation per timezone (run hourly, process users whose local week just ended).

---

## 10. Layout, states and accessibility

Visual language from the landing page: background `#0a0a0f`, surfaces `#15151f` and `#1c1c29`, hairlines `rgba(255,255,255,0.08)`, text `#f5f4f8`, muted `#a3a1b5`, pink `#ff5470`, violet `#8b5cff`, lime `#c6ff3d` (progress, perk, success), gradient `120deg #ff5470, #ff7a59, #8b5cff` (primary buttons, logo, highlight words). Radius 18 px for cards, pill buttons. Display font Bricolage Grotesque (names, numbers, headings), body Inter.

### 10.1 Creator profile, mobile (360 to 430 px wide), top to bottom

1. **Top bar** (56 px, sticky, transparent over banner, becomes `#0a0a0f` with blur after 120 px scroll): back, handle text appears after scroll, share icon, overflow icon.
2. **Banner** 2.5:1, full bleed, bottom gradient fade to background.
3. **Avatar** 88 px circle, 3 px `#0a0a0f` ring, overlaps banner by 44 px, left aligned 16 px.
4. **Name row:** display name (Bricolage 24/28, 1 line, ellipsis), verified badge (gradient check in a circle, 18 px, tap shows tooltip sheet). Below: `@handle` muted 14 px, then "Founding creator" chip if any.
5. **Kind and tags:** kind chip (filled `#1c1c29`), then up to 3 tags, "+2" overflow chip opens About.
6. **Bio:** Inter 15/22, max 4 lines collapsed with "More".
7. **Links row:** horizontal scroll of icon pills (icon + short label), verified pills show a small lime check.
8. **Stats row:** three columns: Followers, Promos, Best rank. Numbers Bricolage 20, labels muted 12.
9. **Action row:** Follow (gradient, full width minus share icon button 48 px). Following state: outlined, label "Following", long press or tap opens "Unfollow?" sheet.
10. **Pinned badges strip:** up to 3 pills.
11. **Perk card** (if any): lime 1 px border, gift icon, title, stock, "Get perk".
12. **Tabs** (sticky under top bar): Promos, Rankings, About.
13. **Owner only Studio strip** (above grid): horizontal cards for draft, in review, rejected, with status chips.
14. **Promos grid:** 2 columns, 8 px gap, 4:5 tiles, rounded 14 px.
15. **Footer:** "Promos on PromoVote are ads. Each is reviewed by a person." small muted text + Report link (DSA style labeling).

Owner view differences: Follow replaced by "Edit profile" (outlined) and "Upload promo" (gradient). Stats row shows exact followers with 7 day delta in lime ("+38 this week"). A small "Report data is private" note with lock icon under stats, linking to the creator panel.

### 10.2 Scout profile, mobile, top to bottom

1. **Top bar:** back (visitor) or settings gear (owner), share.
2. **Header card** (gradient glow behind, no banner in P0): avatar 96 px with lime level ring, display name, `@handle`, "Scout level 7" label, Early Scout chip.
3. **Scout Score block:** large number (Bricolage 48), label, owner sees progress bar to next level.
4. **Stats row:** Called it, Accuracy, Streak, Best rank (4 columns, hidden columns collapse).
5. **Actions:** owner: "Edit profile", "Share my card". Visitor: "Share".
6. **Pinned badges.**
7. **Owner cards:** Just resolved (if any), Today's drop, Pending calls carousel.
8. **Tabs** (sticky): Called it, Badges, Saved (owner or public), Following (owner or public).
9. **Called it list:** cards with thumbnail left (16:9, 96 px wide), creator name, "Called on Oct 3, revealed Oct 10", "+30 (3x early)" in lime.

### 10.3 Desktop differences (>= 1024 px)

* Max content width 1120 px. Two columns: left sticky profile card 340 px (identity, bio, links, stats, actions, badges, perk), right column tabs and content.
* Creator banner spans full content width at 3:1 above both columns, max height 320 px.
* Promos grid 3 columns (1024 to 1279) or 4 columns (>= 1280), tiles show a muted autoplay preview on hover (first 3 s, muted, only if `prefers-reduced-motion` is not set and on a fast connection).
* Promo click opens a centered modal player (URL changes to `/p/...`, back closes modal).
* Share opens a popover with Copy link, X, Reddit, Discord copy text, and the OG card preview.
* Keyboard: `f` follows (when focus is not in an input), `/` focuses search.

### 10.4 Micro interactions

* **Follow:** optimistic toggle, button morphs gradient to outline in 150 ms, follower count ticks by 1, light haptic on native. On server error, revert and toast "Could not follow. Try again."
* **Score count up** on the owner's first profile open of a session after a change: animate from old to new over 600 ms, ease out. Skipped with reduced motion.
* **Badge unlocked:** full screen sheet once, badge scales in, small confetti burst in brand colors. Reduced motion: fade only.
* **Copy link:** toast "Link copied" 2 s, `aria-live="polite"`.
* **Handle availability:** inline icon (spinner, lime check, pink cross) with text, never color only.
* **Pull to refresh** on native profile screens.

### 10.5 Loading, error and edge states

| State | Behavior |
|---|---|
| Loading | Skeletons in `#15151f` with a slow shimmer (1.5 s), matching final layout: banner block, avatar circle, 2 text lines, stats row, 4 grid tiles. Reduced motion: static skeleton. Show skeleton only after 200 ms to avoid flash. |
| Not found | "Profile not found." Button "Go to today's drop". 404 status on web. |
| Suspended | "This account is suspended." No content, no follow. `noindex`. |
| Blocked by you | "You blocked @handle." Button "Unblock". |
| Blocked you | Same as not found (do not reveal the block). |
| Offline | Cached profile (last 20 profiles cached on native) with banner "You are offline. Showing saved version." Actions disabled. |
| Error loading tab | Inline card "Could not load promos." Retry button. Rest of page stays usable. |
| Media under review (owner) | Avatar shows with a small clock badge and "Under review" tooltip. |
| Grid end | "That's everything from @handle." |

### 10.6 Accessibility (WCAG 2.2 AA target)

* Contrast: body text `#f5f4f8` and muted `#a3a1b5` on `#0a0a0f` pass AA. `#6f6d82` (dim) only for decorative or large text, never for information. Gradient text always has a solid fallback color and is never the only carrier of meaning. Text on lime uses `#0a0a0f`.
* Touch targets min 44 x 44 px (link pills, chips, overflow icon).
* Every icon only button has an accessible label ("Share profile", "More options", "Verified creator, tap for details").
* Numbers have full text for screen readers ("12.4 thousand followers" via `aria-label="12,400 followers"`).
* Tabs use `role="tablist"`, arrow key navigation, selected state announced.
* Status is never color only: promo status chips have text, verify status has icon + text.
* Video previews: muted, no autoplay with sound, captions shown when provided, pause control, respect `prefers-reduced-motion` (no autoplay at all).
* Focus visible ring: 2 px lime outline with 2 px offset.
* Dynamic type: layouts tested at 200% text size on iOS and Android. Names wrap to 2 lines at large sizes instead of truncating.
* Alt text: avatars "Avatar of {name}", banners decorative (`alt=""`), promo tiles use title.
* Skip link on web ("Skip to content"), consistent with landing.
* Language attribute `en`. All copy plain English, reading level about grade 7.

### 10.7 Performance budgets

* Profile LCP under 2.5 s on a mid range Android over 4G. Edge rendered head and first paint content.
* Avatar 96 px WebP under 12 KB, banner 750 px under 80 KB, grid posters via Cloudflare Stream thumbnails at 2x tile size.
* First grid page 12 tiles, next pages on scroll with cursor (`live_at`, `id`).

---

## 11. MVP vs later

### 11.1 Creator profile

| Item | Priority |
|---|---|
| Handle rules, reserved list, availability check, change limits, holds and redirects | P0 |
| Display name, avatar (required), bio, banner | P0 |
| Creator kind (primary) + tags (controlled list) | P0 |
| Secondary kinds | P1 |
| External links: 10 platform allow list, normalization, safety scan, rescans | P0 |
| Discord, itch.io, Reddit, Bluesky links | P1 |
| Link ownership: code in bio (API for YouTube, Twitch; manual for others), domain methods | P0 |
| OAuth ownership (YouTube, Twitch) | P1 |
| Verified creator badge with manual approval | P0 |
| Stats row (followers threshold, promos, best rank) | P0 |
| Follow, share, report, block | P0 |
| Launch notification to followers | P1 |
| Promos grid with public statuses, Studio strip for owner | P0 |
| Pinned promo, focal point picker | P1 |
| Public view buckets with owner toggle | P0 (pending open question 3) |
| Rankings tab, creator badges | P0 |
| Perks callout and claim | P1 (perks are Phase 1 per verdict; build after core loop works) |
| Public highlights card from report | P1 |
| Embed badge widget for creator websites | P1 |
| Profile visits and link click stats | P1 |
| Multiple creator pages per account, team members | P2 |
| Animated avatars, custom themes | P2 |

### 11.2 Scout profile

| Item | Priority |
|---|---|
| Handle, display name, avatar (monogram default), bio | P0 |
| Scout Score, level, accuracy, called it history | P0 |
| Weekly streak with freezes | P0 |
| P0 badge set | P0 |
| Owner cards: today's drop, pending calls, just resolved | P0 |
| Saved tab, Following tab with privacy toggles | P0 |
| Leaderboard opt out | P0 |
| Share card (1200 x 630) | P0 |
| Story card 1080 x 1920 and per call "I called it" card | P1 |
| Follow scouts, curator lists | P1 |
| Scout links (2) | P1 |
| Owner activity log in settings, clear history | P1 |
| Opt in indexing | P1 |
| Scout banner | P2 |
| Notable curator verification | P2 |

### 11.3 Platform, privacy and safety

| Item | Priority |
|---|---|
| 18+ gate, birth year only stored | P0 |
| Public views and RLS as in section 9 | P0 |
| Image moderation, EXIF strip, text filters, confusable check | P0 |
| Reports with reasons, auto hide threshold, moderation queue, strikes | P0 |
| Admin bar and admin console, audit logs, PII access log | P0 |
| Statements of reasons to users | P0 |
| Account deletion with 30 day grace | P0 |
| Data export by email | P0 |
| Self serve data export | P1 |
| Edge rendered SEO head, JSON-LD, sitemaps, OG images | P0 |
| Universal links and app links for `/@handle` | P0 for native beta |
| Inactive handle release policy | P2 (ToS text P0) |

---

## 12. Open questions for the founder (max 6)

1. **Account model.** I recommend one login with an always present scout profile and an optional creator page (two handles). Alternative: one account is either scout or creator, never both. Mine lets an indie dev also be a player, but it adds a profile switcher. Do you accept it?
2. **Creator kinds at launch.** The verdict says indie games first. The landing page also promises YouTubers, streamers and TikTok creators. Which kinds are on in wave 1: games only, or games plus streamers and YouTubers (channel trailers)?
3. **Public view counts.** Show bucketed view counts on promo tiles (only from 100 views, owner can hide), or no public numbers at all in P0 so small creators never look "empty"?
4. **What counts as "blew up".** I propose an internal Hit Score (top 20% of the week by real engagement, votes excluded). External growth (Steam wishlists, follower counts on YouTube or Twitch) is more exciting but hard to measure and easy to fake. Internal for P0, external signals later?
5. **Scout profiles default.** Public inside the app but `noindex` (my recommendation), or fully private until the scout opts in?
6. **More link types in P0.** Indie devs live on Discord and itch.io, but they are not on your list. Add Discord invite and itch.io to the allow list in P0, or keep them for P1?
