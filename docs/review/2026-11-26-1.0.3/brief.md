# Expert review brief: PromoVote 1.0.3 (2026-11-26)

Founder rule (2026-10-07): before a build ships, every expert must score at least 8/10 on retention, session time,
originality and trademark safety. Each role is a team of at least two experts with different angles. The founder
asked on 2026-11-26 to run this review first and build only if every score is at least 8.

## What changed since the live 1.0.2 (build 18, approved 2026-11-07, Explore Route A)

See `git log --since=2026-11-07 --oneline -- apps/mobile services/api`. Main items:
* Calls without sign in: a guest gets 3 calls kept on the phone (`apps/mobile/src/lib/guest-calls.ts`,
  `guest-sync.ts`), a soft "Keep your calls" sheet after the 3rd, sign in from the 4th; synced on sign in as a scout.
* App languages en, es, tr, pt (Brazil), de, fr (`apps/mobile/src/lib/i18n.ts`, reviewed 2026-11-26), photo
  permission text in all 6 (`apps/mobile/locales/`).
* Install source on Android (`apps/mobile/src/lib/install-source.ts`).
* Version 1.0.3 (`apps/mobile/app.json`). Explore stays Route A; Route B (branch fli-17) is a fallback.
* API (already live, promovote-api 4d3c40f4): calls only on promos of active creators, idempotent call resolver.
* Store: new English screenshots on branch `origin/store/aso-2026-11`; review notes `store/review-notes-1.0.3.md`;
  age rating proposal `docs/store/apple-age-rating-2026-11.md` (18+).

Mac simulator test of the next build with screenshots in 6 languages: `docs/review/2026-11-17-mac-test/REPORT.md` (look at its PNGs).
Earlier review reports for context: `docs/review/*.md`. Product rules: `CLAUDE.md`, `docs/01-team-verdict.md`.
Decided product strategy is not reopened; judge execution.

## Scoring

Each role reports TWO experts with different angles (name the angle). Each expert scores 1 to 10 with one sentence
of evidence: Retention, Session time, Originality, Trademark and trade dress safety, plus one domain score.
Then list the minimum changes to bring any score below 8 up to 8: P0 (must before this build), P1 (before public
launch), P2 (later); each with file, why, and how to verify. Only P0 items block the build: keep P0 to real
blockers for a TestFlight / closed testing build of 1.0.3.

Write the report to `docs/review/2026-11-26-1.0.3/<role>.md` (English, no em dashes or en dashes). Do not edit any
other file, do not commit, do not build, deploy or call any store or Cloudflare API.
