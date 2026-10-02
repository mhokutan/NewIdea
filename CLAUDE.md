# CLAUDE.md

## Project

Name: **PromoVote** (chosen by founder on 2026-10-02; promovote.com and promovote.app looked unregistered, buy at a registrar and do a USPTO/EUIPO trademark check). Old working names: OnlyAds / WatchAds.
Vision: **"The social media of ads."** A platform where ads are the content, advertisers are creators with profiles and followers, and users are curators who discover, vote and rank.

Status: idea and validation stage. No code yet.

## Read first
1. `docs/00-idea-brief.md`: original idea, ChatGPT model, founder's answers.
2. `docs/01-team-verdict.md`: decisions of the 8-expert team. **This is the current source of truth.**
3. `docs/debate/`: full round 1 and round 2 texts.

## Current decisions (short)
* First niche: indie game trailers. Users: players who like discovering new games.
* OPEN: founder wants to include new creators on YouTube, Instagram, TikTok, Kick, Twitch too (channel trailers). Never reward users for following/subscribing (platform ToS, fake engagement).
* Paid product: "Trailer Test" report (creative test + real audience feedback), not cheap views.
* Skip is free. Points = "Kaşif Puanı" (reputation, no cash value, not spent).
* Advertiser offers (Steam keys, codes, beta) are optional and never tied to votes or reviews.
* $50/$150/$250 subscriptions come back only in Phase 3.
* 18+, English first, restricted categories closed.
* Planned stack: Expo + React Native Web (web, iOS, Android from one codebase), Next.js advertiser panel, Supabase, Cloudflare Stream, Stripe. Web public first, app stores after the checklist in the verdict.
* Before building: 3 week validation test (paid concierge reports + weekly trailer list).

## Team and skills
* Agents: `.claude/agents/` (product-strategist, adtech-expert, consumer-growth-psychologist, marketplace-economist, trust-safety-legal, cto-architect, creator-economy-expert, skeptical-investor).
* Skills: `team-debate`, `domain-check`, `ad-review`, `unit-economics` in `.claude/skills/`.

## Writing style
* Talk to the founder in Turkish, simple and clear.
* Never use em dashes or en dashes.
* Legal notes are not legal advice.
