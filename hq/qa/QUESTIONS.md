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

## Q-002 UPDATE (2026-10-28, CEO): the founder picked route A
Product: PromoVote
Decision, from the founder, verbatim intent: "route A, be social media". So route A is the plan. Route B stays on
the shelf only as a fallback if route A slips past the next submission. Questions 1 and 3 above are still open and
still useful; question 2 is now answered.

## Q-003 (2026-10-28, CEO): does the name "PromoVote" have to change?
Product: PromoVote
Question: the founder's follow-up was "route A, but then the name PromoVote has to change, I do not know, what
should we do?". My recommendation is **do not change the name**, change everything around it. I need you to
sanity check the three iOS specifics at the bottom before the founder acts on this.

### Why I recommend keeping the name
1. Apple did not reject the name. Guideline 3.2.2(i) is about what the app *does and displays*. The rejection
   message quotes filtering, bookmarking, searching and sharing recommendations, that is behaviour, not branding.
   A rename is therefore neither necessary nor sufficient: a renamed app with the same description and the same
   ranked grid gets the same rejection.
2. The word that actually caused this is not "Promo", it is the sentence "where new games, apps and shops get
   discovered first" plus the keywords `discover`, `new apps`, `indie games`. Those are free to change today.
3. "Vote" is the asset, not the liability. Route A's whole defence is that we are a prediction and reputation
   game, and the name already says the mechanic. "Promo" can be our content noun, the way Reel, Snap and Pin are
   content nouns for other platforms. Renaming away from "Vote" would make route A *harder* to tell.
4. The cost of a real rename is high and partly irreversible. Verified in the repo today:
   `apps/mobile/app.json` has `name: PromoVote`, `slug: promovote`, `scheme: promovote`, and
   `ios.bundleIdentifier` and `android.package` are both `com.miapera.promovote`. The Android app is already live
   under that package, and a published package name can never be changed; a new name at package level means a new
   Play listing and losing the existing installs and reviews. On top of that: the domain promovote.com, the
   privacy and terms URLs, support@promovote.com, review@promovote.com, the X account, the icons and the store
   assets. That is real money and real time, and it buys us nothing against 3.2.2(i).

### If the founder still wants a visible change, the cheap middle path
Keep the binary name, the bundle id, the package, the domain and the handles. Change only the App Store *display*
name to a "brand plus tagline" form, which also carries the route A signal:
* App Store name (30 char limit): `PromoVote: Call the Hits` (24)
* Subtitle (30 char limit), today empty as far as I can see: `Call the next big hit` (21)
This is cheap and reversible, and the iOS listing has never shipped, so the name field is still free to edit.
I would do this only if the founder wants it; my own recommendation is the plain name plus the new subtitle.

### The metadata rewrite this actually needs (route A, no rename)
Drafts, for you to refine and for the founder to approve before anything is entered. Every claim below is already
true in the product; nothing here invents a feature.
* App Store name: `PromoVote`, unchanged.
* Subtitle: `Call the next big hit`
* Keywords, replacing `indie games,game trailers,new apps,discover,predict,hits,promos,creators,scout,trends`:
  `predict,call,scout,streak,duel,creators,promos,game trailers,videos,community`
  (removed: `indie games`, `new apps`, `discover`, `trends`. 77 chars, inside the 100 limit.)
* Long description, first line, replacing "PromoVote is where new games, apps and shops get discovered first":
  `PromoVote is a prediction game for people who spot hits early.`
  Second paragraph: `Every day Today's Drop gives you 7 fresh promo videos. Watch, then make your call: Will`
  `blow up, or Not for me. Seven days later the crowd decides, right calls grow your Scout Score, and you can`
  `take any other scout head to head in a Duel.`
* Google Play short description (80 char limit), replacing "Discover new game trailers and app promos. Call which
  ones will blow up.": `Watch promos, call which ones blow up, and build your Scout Score.` (66)
* Promotional text, replacing "Today's Drop is 7 fresh promos a day. Call the next big hit.": keep it, it is
  already route A language.
* App Review notes: keep the honest facts (all promos in this build belong to the founder's three studios,
  creators cannot vote, upload is not open yet) and lead with the call and Duel loop rather than discovery.

### Three things I need you to check before the founder acts
1. Guideline 2.3.8: if the founder uses the "brand plus tagline" option, the App Store name becomes
   `PromoVote: Call the Hits` while the device home screen label stays `PromoVote` from `app.json`. That split is
   common and normally fine, but you own the build: do you see any reason to also change the Expo `name`, and
   would changing it break the scheme, deep links or the Sign in with Apple configuration?
2. Is the App Store subtitle currently empty, or is something already in it? `store/README.md` section G1 lists
   name, promotional text, description, keywords and URLs, but I found no subtitle line.
3. Does any part of the API, the web site or the Play listing hardcode the string "PromoVote" in a way that would
   have to move in lockstep if the display name changes? I am trying to keep this to store metadata only.
Needed by: 2026-10-29, the Thursday reset meeting. Nothing is blocked today, and no store field has been touched.

## Q-003 ANSWERED (2026-10-28, CEO): the name stays, nothing is renamed
Product: PromoVote
Decision, from the founder, verbatim intent: "fine, keep the name, we will just turn it into social media."

So, binding for this work:
* **No rename of any kind.** App Store display name stays the plain `PromoVote`. The "brand plus tagline" middle
  path (`PromoVote: Call the Hits`) is **declined** and should not be entered anywhere. Bundle id, Android
  package, `slug`, `scheme`, domain, support and review e-mail addresses, X handle, icons: all unchanged.
* My three check questions above are **withdrawn**, items 1 and 3 included, because they only existed to protect
  a rename that is not happening. Do not spend a wake on them.
* The one field that is still open is the **subtitle**. It is a new, currently empty App Store field, not a name
  change, so "keep the name" does not settle it. Treat `Call the next big hit` as a draft for the founder to
  approve or drop at the same moment he approves the description. If he says nothing, ship with the subtitle
  empty rather than guessing; an empty subtitle costs us a little ASO, a wrong one costs us another round.
* Everything else in the Q-003 metadata rewrite stands and is now the plan: new first line, new keywords, new
  Play short description, route A review notes.

## Q-004 (2026-10-28, CEO): route A build spec, so you do not have to re-derive it
Product: PromoVote
This is not a question, it is the assignment as I understand it, written down so your first wake on it is cheap.
Correct anything that is wrong, you own this code. Priority order is mine; the reasoning for each item is the
rejection text, not taste.

### The acceptance test to design against
One sentence, and every item below serves it: **a reviewer who opens the app cold and scrolls for thirty seconds
should be looking at people making predictions, not at a browsable list of apps with download buttons.** If a
change does not move that sentence, it is not part of this job.

### P0, the four that answer the rejection directly
1. **First screen is the call loop, not a grid.** On iOS the landing surface leads with Today's Drop as a
   one-at-a-time watch-and-call flow (watch, then `Will blow up` / `Not for me`), with the user's streak,
   accuracy and Scout Score visible. The ranked chart strip and the `games` / `apps` category pills move below
   the fold or behind a secondary tab. Do **not** rename or delete the categories to disguise them, that is a
   worse problem than the one we are fixing; demote them.
2. **Store links move one level deeper.** A promo card's primary action becomes the creator page or follow, not
   a store button. The `app_store` CTA lives on the creator's profile, link-in-bio style. Keep the existing
   `ctaVisible` rule that hides `google_play` on iOS (2.3.10) exactly as it is.
3. **Make the outcome visible, because it is our real differentiator.** The seven-day resolution, right and wrong
   calls, Scout Score movement and the Duel are the things the App Store does not have. Today they exist but are
   not what the app shows first. A reviewer needs to be able to find a resolved call and see that it cost or
   earned something.
4. **Store metadata.** The Q-003 drafts above, founder-approved before entry. This one is free and does not need
   a build, but it must land in the **same** submission as the build, otherwise the words and the app disagree
   again.

### P1, strengthens the same argument if it is cheap
5. Creator identity: profile, follower or follow count, the creator's own promos together. Social shape, and it
   is where the store link now lives anyway.
6. Anything that makes a promo feel authored rather than listed: creator handle on the card, a caption, a
   comment or reaction surface if one already exists. Do not build a new comment system for this submission.

### Out of scope, explicitly
* Any rename, any new paid service, any change to the Android build or the Play listing in this round.
* Opening creator upload to third parties before this submission is approved. The honest line in the review notes
  ("all promos in this build belong to the founder's three studios") is one of our strongest facts; do not break
  it in the same week we rely on it.

### What I still need back from you
1. Your estimate: which of P0 1 to 3 are realistic for the next submission, and what breaks if we ship only
   some of them. If only one is possible, I would take item 1.
2. The two facts from Q-002 that are still unverified: my reading of `ctaVisible` (fact 3), and whether any
   third-party creator is already queued for the live catalog (Q-002 item 3). The second one decides whether
   route B still exists as a fallback at all.
3. Nothing goes to App Review and no store field is entered without the founder. I have not touched either, and
   I will not.
Needed by: 2026-10-29, the Thursday reset meeting.
