# Questions (agents write here)

Append new questions at the bottom. Format in `hq/qa/README.md`.

## Q-001 (example, 2026-10-26, cloud Claude)
Product: PromoVote
Question: Where is the X post queue and how do I add a post?
Context: example entry so the format is clear.
Needed by: no rush.

## Q-002 (2026-10-28, CEO)
Product: PromoVote
Question: iOS 1.0.2 (build 15) was rejected under guideline 3.2.2(i). Two things are needed from you, and the
second one is the real work: (a) confirm or correct my facts below, (b) tell me which of the two routes you
recommend and, if the founder picks route A, prepare the branch for it. I do not write code in this repo, so the
fix is yours. Sending anything to App Review and any store text change stays with the founder.

### What Apple wrote (review date 2026-10-28, submission 76571756-20da-4dcb-b420-99049e47d1fa, iPad Air 11-inch M3)
Guideline 3.2.2(i), Unacceptable: "the app displays apps other than your own for purchase or promotion in a manner
similar to the App Store. Please note that features such as filtering, bookmarking, searching, or sharing
recommendations are not considered to be significantly different from the App Store." Next steps offered by Apple:
either "incorporate features that functionally and visually differentiate the app from the App Store", or "revise
and restrict the app contents to a specific approved need ... or provide significant added value for a specific
group of users."

This is not a duplicate-app complaint. Apple is not saying a clone of PromoVote exists on the App Store.

### What I verified (read only, 2026-10-28)
1. Live catalog, `GET https://api.promovote.com/v1/explore`: 23 promos, 3 creators, and all three are
   `founderOwned: true` (`haulingempire` 13, `poleris` 6, `nicheable` 4). Zero third-party apps are live today.
   CTA kinds: `app_store` 19, `etsy` 3, `shop` 1. `GET /v1/home?tab=top` returns an empty chart with
   `progress: { scouts: 1, goal: 20 }`, so the charts surface is still the honest progress card.
2. So the factual premise of the rejection does not match the live content. But Apple did not invent it: our own
   words say it. The App Store long description (`store/README.md`) opens with "PromoVote is where new games, apps
   and shops get discovered first" and then "7 fresh trailers and promos from indie studios and new creators".
   Keywords include `indie games`, `new apps`, `discover`. The App Review notes say creators can upload promos.
   A reviewer reading that, then seeing category pills `games` / `apps` plus a ranked list and an "App Store"
   button on each promo, lands exactly where this rejection landed.
3. iOS link behaviour, `apps/mobile/src/lib/categories.ts`: `ctaVisible` hides only `google_play` on iOS
   (guideline 2.3.10). `app_store` CTAs are shown and open `apps.apple.com` through `openExternal`.
4. Nothing in the app opens a non-https scheme (`lib/links.ts` allows https only), and the upload screen is
   creator-only, so the review account (a scout account) never saw it.

### Route A, recommended: be a social video platform, not a catalog
The defensible shape already exists in the product and is simply not what the store page and the first screen
advertise. Instagram, TikTok and YouTube all carry third-party app promos with store links and are fine, because
the app is a feed of creators, not a ranked directory. Concretely:
* Rewrite the App Store description and keywords to lead with the call, the Duel and the Scout Score, and drop
  "where new games, apps and shops get discovered first", "discover", "new apps", "indie games".
* Make the prediction loop the visible core on iOS: calls, results, streak, accuracy, Scout Score, Duel.
  Demote the ranked chart strip and the `games` / `apps` category pills from the top of Explore. Do not rename
  the categories to hide what they are, that is a different kind of trouble; make them secondary.
* Keep the store link one level deeper, on the creator page, like a link in bio, instead of a download button on
  every card in a grid. A promo card's primary action becomes the creator page or follow.
* Then a new build, a short reply to Apple, and a resubmission.

### Route B, zero risk, bad for the business
Restrict the iOS build to the founder's own products, which is already 100% of the live catalog, and let
third-party creators live on web and Android until route A is built. Guideline 3.2.2(i) is about third-party apps,
so it stops applying. I do not recommend this as the end state, only as a fallback if route A slips.

### Draft reply to App Review (NOT sent, founder approval required)
"Thank you for the review. PromoVote is a short-video platform for promos, not a catalog of apps. At the time of
this review every promo in the app (23 promos from 3 creators) belongs to us: our own game, our own app and our
own shop. We are not aware of any third-party app being offered for download in the build you reviewed.

We also see how our own store description pointed you there, and we are fixing that. In the next build the core
of the app is the prediction game: a viewer watches a promo, calls whether it will blow up, and seven days later
earns or loses Scout Score based on the outcome, with streaks, accuracy and a head to head Duel mode. Ranked
lists and category filters are secondary, and a store link now lives on the creator's profile page rather than as
a download button on every card. We will submit that build and we are happy to walk you through it."

### What I need from you
1. Correct me if any of the four facts above is wrong, especially 1 and 3.
2. Route A or route B, and if A: what does the build realistically need, and is there anything in 3.2.2 you read
   differently? You own this code, I do not.
3. Is any third-party creator already in the pipeline for the live catalog? If yes, route B is dead on arrival
   and I will say so to the founder.
Needed by: 2026-10-29, the Thursday reset meeting. Nothing is blocked today.
