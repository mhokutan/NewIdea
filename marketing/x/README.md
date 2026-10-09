# PromoVote on X

Founder idea 2026-10-09. The founder opens the account (phone and email verification), Claude writes the posts.
Scheduling: Metricool (founder has an account) with X connected, or X's own scheduler.

## Account
- **Handle:** @PromoVote. If taken: @PromoVoteApp, then @getpromovote.
- **Name:** PromoVote
- **Email:** hello@promovote.com (forwards to the founder).
- **Avatar:** `store/assets/social/x-avatar-800.png`
- **Banner:** `store/assets/social/x-banner-1500x500.png`
- **Bio (160 max):** The social network for promos. Watch short promos from new games, apps and shops, then call which ones will blow up. (No "18+" in social bios: it reads as adult content. The age limit lives in the stores and the app.)
- **Website:** https://promovote.com
- **Location:** (empty)

## Auto posting (built 2026-10-09, not live yet)
The API Worker (`services/api`) posts one due post per hour from D1 table `social_posts` (migration 0015) with the X API.
Queue draft: `marketing/x/queue.md`. Goes live only after the founder's OK: apply migration 0015, deploy the API, load the queue.
Founder setup (once):
1. developer.x.com, sign in with the PromoVote X account, sign up for the free tier (check the current post limit).
2. Create a Project and an App. App settings > User authentication: permissions **Read and write**.
3. Keys and tokens: copy API Key and Secret, then generate Access Token and Secret (after setting Read and write).
4. Cloudflare dashboard > Workers > promovote-api > Settings > Variables and Secrets > add 4 secrets:
   X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET. Never paste them in chat or in the repo.
Without the 4 secrets the job does nothing.
Cost (X pay per use, Oct 2026): a plain post about $0.015, a post with any link about $0.20. Auto posts carry no link (the link is in the bio and the pinned post); only the launch day post has the store link.
Status 2026-10-09: LIVE. First auto post published 14:27 UTC (credits 20.00 to 19.98). 17 more queued, one a day at 14:07 UTC.

## Rules
- Hashtags: 1 or 2 per post, never more (more looks like spam on X).
- Website: Profile > Edit profile > Website (not asked at signup).
- Honest: no fake numbers, no fake users, no "thousands of scouts" until it is true. Say "coming soon" until a store is live.
- No "earn", "watch ads", "For you". Points have no cash value; never promise rewards for follows, likes or reposts.
- Founder's own studios (Hauling Empire, Nicheable, Poleris) are always called "made by the PromoVote founder".
- Store links: App Store and Google Play only when live. Use promovote.com until then.
- No em dashes or en dashes.

## Posted log
- 2026-10-09: C1 posted by the founder. The rest (pinned, coming soon, first 10, C2 to C8) not yet.

## Pinned post
We built a place where promos are the content.
Watch 7 short promos a day from new games, apps and shops. Call "Will blow up" or "Not for me". 7 days later you see if you were right.
No paid spots in the charts. Ever.
promovote.com #indiegames #apps

## Coming soon (post right after the pinned post)
PromoVote is coming soon to iPhone and Android.
7 short promos a day from new games, apps and shops. One tap to call what will blow up. Results in 7 days.
Follow so you don't miss launch day.
promovote.com #indiegames #apps

## Who to follow (30 to 50 a day at most, a new account that follows too fast gets limited)
- Platforms: @AppStore, @GooglePlay, @itchio, @Steam, @ProductHunt
- The founder studios' own accounts (Hauling Empire, Poleris, Nicheable) if they exist
- Search #indiedev, #gamedev, #indiegames, #buildinpublic > People: active small and mid size accounts (1K to 50K followers) who posted in the last month. Future creators.
- Game discovery accounts (search "indie game showcase", "new mobile games")

## Creator call posts (streamers, game devs, new shops)
Honest: uploads are not open yet, no promised reach numbers. Mix these in between the first 10 posts.

C1. Indie devs: your trailer deserves more than 40 views and a Discord ping. On PromoVote, promos ARE the content. Get ready. promovote.com #indiedev #gamedev

C2. Streamers and creators: one short clip, a page with all your links, and an audience that is here to discover new people. Coming soon to iPhone and Android. #streamer #contentcreator

C3. Just opened an Etsy shop or a small online store? Your first customers are out there. PromoVote puts new shops in front of people who want to find them first. #smallbusiness #etsyseller

C4. Built an app nobody has heard of yet? Good. That is exactly who PromoVote is for. Free creator page, real stats for every promo. promovote.com #buildinpublic #indieapps

C5. No algorithm that buries you because you have 12 followers. Every creator gets fair turns in Today's Drop. Paid boosts are labeled and never touch the charts. #indiedev #creators

C6. What you get as a creator: a page with your logo, banner and links, a main button (store, shop or channel), gifts for scouts, and stats for views, saves and link taps. Free. #contentcreator #gamedev

C7. Game devs: scouts call "Will blow up" or "Not for me" on your trailer. That is real feedback from players before you spend on ads. #gamedev #indiegames

C8. Creators, game studios, new shops: get your promo ready. 10 to 30 seconds, vertical, your best moment first. Uploads open soon. Join the list: promovote.com #creators #indiedev

## AI and store posts (use these hashtags only where the post is really about them)
Rule: #AI #Claude #ChatGPT only on posts about building PromoVote with AI (true: the founder builds with Claude).
#GooglePlay #AppStore #AppleDeveloper only on posts about the store submission or launch. Never on unrelated posts
(X treats unrelated hashtags as spam) and never in a way that suggests a partnership with Apple, Google, Anthropic or OpenAI.

A1. One founder, a day job, and AI. I am building PromoVote, a social network for promos, with Claude as my dev team: the app, the API, store screenshots, even the review checklists. #AI #Claude #buildinpublic

A2. Things AI did for PromoVote this week: fixed a video loading bug, wrote the App Store screenshots, and caught a Google bot hitting our server 31,000 times a day. Things it did not do: decide what the product is. #AI #Claude #indiedev

A3. Ask ChatGPT or Claude for a good new indie game and you get the same famous names. PromoVote is where the ones nobody knows yet show up first. #AI #ChatGPT #indiegames

S1. Submitted PromoVote to Apple and Google Play this week. First time through Apple's review for a social app: privacy forms, age rating, a review account. Fingers crossed. #AppleDeveloper #GooglePlay #buildinpublic

S2. Lesson from shipping on Google Play: a new production track has no countries until you add them in Play Console. Our first release bounced with "targeting no countries". #GooglePlay #androiddev

## First 10 posts (one a day, about 9:00 to 11:00 a.m. ET)
1. Every app, game and shop starts with zero fans. PromoVote is where you find them first. promovote.com #indiedev #startup
2. How it works: 7 promos a day. One tap to call it. Results in 7 days. Your Scout Score grows when you are right. (Reputation only, no cash value.) #buildinpublic
3. Hot take: the best indie games of next year are already out there with 40 downloads. Who is calling them early? #indiegames #gamedev
4. Today's Drop example: a truck tycoon where one van becomes a logistics empire. Would you call it? (Hauling Empire, made by the PromoVote founder) #indiegame #tycoon [attach the hauling-empire.mp4 promo]
5. We never sell chart spots. Boosted promos are labeled and never count toward the charts. Fair by design. #buildinpublic
6. Creators: a free page with your logo, links, gifts for scouts and real stats for every promo. Coming soon. promovote.com #creators #indiedev
7. "Not for me" is a valid call. Being right about what will NOT blow up counts too. #predictions
8. Box breathing in 20 seconds: 4 in, 4 hold, 4 out, 4 hold. (Poleris, made by the PromoVote founder) #breathwork #selfcare [attach poleris.mp4]
9. What was the last app you found before everyone else? Reply, we are collecting early scout stories. #apps
10. Android first: PromoVote is in review on Google Play. iPhone review is in progress too. Follow for the launch day. #android #buildinpublic

## Launch day (when a store approves)
PromoVote is live on [Google Play / the App Store]. 7 promos a day, one tap to call it, results in 7 days. Who will spot the next big hit first? [store link] #indiegames #apps
