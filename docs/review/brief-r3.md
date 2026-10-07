# App review brief, round 3 (2026-10-07, night)

Same rules as `docs/review/brief.md`: every expert must score at least 8/10 on Retention, Session time, Originality, Trademark and trade dress safety, and their own domain. Your round 1 and round 2 sections are in `docs/review/<your-file>.md`.

## What changed since round 2

Commits on `claude/gracious-pasteur-nu8ssc`: c885a37, d6799eb, 96ee4da, e3ba08b, 5c65c36, 1bcb441, db91c30. Read the diffs and the code. API is deployed; iOS build 6 is finished (TestFlight upload waits for the founder's approval), a newer build follows with the later commits.

**Calls and scoring (economist, growth, product, CTO)**
* `resolveCalls` runs hourly. "Will blow up" is right only when the later share beats the crowd bar (median of recent resolved promos, at least 50%), and the early multiplier is by percentile, not absolute position. Only the first 7 calls a day are `score_eligible` (points); the rest still count for the crowd and creators. `job_runs` heartbeat, visible at `/health`.
* Today's Drop: server pool of 21 (hash rank per promo per day, fair across creators), the app takes the 7 the viewer has not called yet first, "N new for you today". Charts open after 20 scouts call in 7 days.
* Ticket shows the outcome (right +points, wrong "no points lost", void). Calls tab: Results with accuracy and points, then Open calls. One time "You called it" reveal sheet on the feed when results arrive.
* Forgiving weekly streak: calls on 3 different days per week, up to 2 saved weeks (earned every 4 weeks). Shown on the Scout profile with this week's dots.
* Daily local reminder ("Today's Drop is ready", 18:00), offered on the end card after the first finished drop, never at launch. Turn off in Settings. No push server.

**Engineering and platform (mobile engineer, designers)**
* Every sheet that leads to another screen waits for `onDismissed` (iOS one modal rule): gate, settings, report menu, gift sheet. Report and Block are one sheet with steps. The gate waits for session loading and returns to the tapped promo after onboarding.
* Swipe left or right on the feed moves between Today's Drop, New and Team picks. Creator page grid opens a vertical player of that creator's promos.
* Scrims are `expo-linear-gradient` (the CSS gradient prop never rendered on web, which is what round 2 screenshots showed). Team picks note sits on a solid backing, only on the first promo.
* Brand font Bricolage Grotesque (titles, names, Scout Score, ticket). Branded sign in (logo, three value lines, Not now). Lime is kept for the call, the primary button and progress.
* a11y: the video area is the reel summary with every action in the actions rotor; all labels localized; Dynamic Type caps on overlays; 44 pt targets on creator pages and hashtags; Android ripples; ticket springs in (respects Reduce Motion). Avatar falls back to a letter.

**Creators and business (adtech, creator economy)**
* Gifts: creator form (code, discount, beta invite, days, stock), studio card with claims and End, gift card on the creator page, gift chip on promos, scout wallet tab. Claim needs sign in only, never reads calls or follows.
* Public page: main button from the creator's links, Edit profile and Share for the owner, proper empty copy. UTM tags on outbound links (not on store links). Studio: saves, new followers, link taps per range, clicks exclude boost, friendly zero state.

**Trust and safety**
* Report reasons add impersonation, harmful link, trademark; guests can report by email. Names and bios cannot pose as PromoVote staff. Zero tolerance line in Terms and Guidelines, delete account steps fixed, "The social network for promos" replaces "The social media of ads". Google Play buttons and options hidden on iOS. Production holds only the 3 founder creators and the review account (no test data).

## Still not done (known)
* Video upload by creators and R2 photo upload (founder must enable R2 in the dashboard).
* More real content: still 3 founder creators. This is the main supply gap and needs the founder and outreach, not code.
* Apple token revoke (needs a Sign in with Apple key from the founder), universal links (needs the Associated Domains capability), server push.
* Trademark filing (founder decides later), store listings in many languages.

## Screens
`docs/review/screens-r3/01..18-*.png` (English, iPhone size web build, local data; the top Feed/Explore/Profile pill is the web tab bar, on iPhone it is a native bottom bar). 13 to 15 use two seeded resolved calls to show the reveal and Results.

## What to return
Re-score the same 5 areas (1 to 10, one sentence of evidence each, with the round 2 score next to it). Then list only what still keeps any score below 8, as P0 / P1 with file references, smallest change first, and say plainly if a gap can only close with real users or real content. Append a section "Round 3" to `docs/review/<your-file>.md` (English, no em or en dashes) and return the short summary (score table + remaining blockers).
