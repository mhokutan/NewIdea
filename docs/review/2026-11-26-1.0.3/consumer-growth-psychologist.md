# Consumer growth and behavioral design review: PromoVote 1.0.3 (2026-11-26)

Role: consumer-growth-psychologist. Domain score: habit strength.
Read: `brief.md`, `apps/mobile/src/lib/guest-calls.ts`, `guest-sync.ts`, `gate.tsx`, `reminder.ts`,
`src/ui/PromoReel.tsx`, `src/ui/ResultReveal.tsx`, `src/app/(tabs)/index.tsx` (strip, EndCard), `src/lib/i18n.ts`
(gate, drop, reminder strings), `services/api/src/index.js` (APP_EVENTS), `docs/review/2026-11-17-mac-test/REPORT.md`.
Strategy is not reopened; this judges execution.

## Expert 1: retention and habit loop specialist

Angle: does the daily loop (trigger, action, variable reward, investment) hold from D1 to D30 for a signed in scout?

| Score | Value | Evidence |
|---|---|---|
| Retention | 8 | Finite Today's Drop (7 promos, counter, end card) plus a 7 day result and a once per result reveal ticket (`ResultReveal.tsx`) is a real two speed loop: daily habit plus a D7 payoff. |
| Session time | 8 | End card offers "Keep watching" into the fair rotation and Explore, so a done day does not end the session, while the drop itself stays short and finishable. |
| Originality | 8 | Calling a promo as "Will blow up" with a locked ticket, rank and later verdict is not a like button; no copy of TikTok or Duolingo mechanics beyond the generic streak. |
| Trademark and trade dress | 9 | Own words (Today's Drop, call ticket, Scout Score, double chevron), monochrome plus one yellow; nothing borrowed from Duolingo flames or TikTok "For You". |
| Habit strength | 8 | Trigger is local only and asked after the first finished drop (good timing, no dark pattern); weekly streak needs 3 days, which is forgiving and has 2 saved weeks. Gap: no trigger on result day, the strongest D7 moment. |

## Expert 2: conversion specialist for guest calls

Angle: does "3 free calls, Keep your calls sheet, sign in from the 4th" turn watchers into scouts without breaking trust?

| Score | Value | Evidence |
|---|---|---|
| Retention | 8 | Guests now do the core action before any wall (endowed progress); calls show on the reel as tickets and survive a restart (`showGuestCalls`). |
| Session time | 8 | The 4th tap queues the call and runs it after sign in (`asScout` queue in `gate.tsx`), so sign in does not cost the moment. |
| Originality | 8 | "Keep your calls" frames sign in as protecting something already made, which fits the call game better than a generic sign up wall. |
| Trademark and trade dress | 9 | No borrowed copy or patterns; all text own. |
| Habit strength (conversion) | 8 | Honest loss aversion: the sheet says calls are gone after 24 hours, which is true (`MAX_AGE_MS`), and the 24 h cutoff stops waiting for results before signing in. Sync is idempotent and single flight with tests (`tests/guest-sync.test.mjs`). Weak spot: the guest end card still says "Sign in to make your calls" after the guest just made 3. |

No score is below 8. Nothing below blocks a TestFlight or closed testing build.

## P0 (before this build)

1. Check only, no code: confirm the live promovote-api (4d3c40f4) accepts `guest_first_call`, `guest_call`,
   `guest_sync` (they are in `APP_EVENTS` in `services/api/src/index.js:1565`). Why: the guest flow is the main thing
   this build tests; without these events the test cannot be read. Verify: one guest call on a dev build, then the
   rows appear in `app_events`.

## P1 (before public launch)

1. Guest end card copy. File: `apps/mobile/src/app/(tabs)/index.tsx` EndCard and `drop_done_guest` in all 6 languages
   in `src/lib/i18n.ts`. Why: a guest who used the free calls reads "Sign in to make your calls", which contradicts
   what just happened and wastes the best conversion moment. How: when `guestCallCount() > 0` show "You made {n}
   calls. Sign in to keep them, results in 7 days."; when 0, say the first 3 calls need no sign in. Verify: guest
   makes 3 calls, finishes the drop, reads the new line.
2. Measure the keep sheet. Files: `src/lib/gate.tsx`, `services/api/src/index.js` APP_EVENTS. Why: today we cannot
   tell sheet views and sign ins that came from it apart from other sign ins. How: event `guest_keep_view` on open
   and a `from=keep` flag on `sign_in_view`. Verify: funnel guest_first_call, guest_keep_view, sign_in_done,
   guest_sync in `app_events`.
3. Result day trigger. File: `src/lib/reminder.ts`. Why: the D7 reveal is the variable reward, but the only trigger
   is the generic 6 pm drop reminder. How: when a call is made (and the reminder is on), schedule one local
   notification at `resolvesAt` ("Your call on {title} has a result"), one per day at most, cancelled with the daily
   reminder. Verify: a call with a short test `resolvesAt` fires one notification and opens the reveal.
4. Reminder offer for guests. File: `index.tsx` EndCard (`if (guest ...) return`). Why: early users are mostly
   guests and get no trigger at all, so D1 depends on memory. A local reminder needs no account. Verify: guest
   finishes the drop and sees "Remind me".

## P2 (later)

1. Ticket date drift: a guest ticket shows `at + 7 days`, but the synced call resolves 7 days after sign in. Show
   the server date after sync (already set by `setCall(r.call)`), and say "result 7 days after you keep it" on guest
   tickets.
2. A guest who picks Creator in onboarding loses the kept calls silently; one line in the creator gate would explain
   it.
3. Guest quota is rolling (3 per 24 h). Watch `guest_call` volume per device; if many guests never sign in, test 3 per
   device lifetime instead.
