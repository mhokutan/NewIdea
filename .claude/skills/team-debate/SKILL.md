---
name: team-debate
description: Run a structured 2-round debate with the 8 expert agents in .claude/agents/ on any product, pricing, legal or tech question, then write a verdict document. Use when the founder asks the team to evaluate, discuss or decide something.
---

# Team Debate

The team lives in `.claude/agents/`:
product-strategist, adtech-expert, consumer-growth-psychologist, marketplace-economist, trust-safety-legal, cto-architect, creator-economy-expert, skeptical-investor.

## Steps

1. **Brief.** Write the question and all context to `docs/debate/<topic>/00-brief.md`. Always link `docs/01-team-verdict.md` so the team knows past decisions.
2. **Round 1 (independent).** Spawn one general-purpose agent per role, all in parallel. Each reads its role file and the brief, writes `round1-<role>.md`. Ask for: verdict, reasoning, agree/disagree, top 3 recommendations, questions for others. Only pick the roles that matter for the question (at least 4, always include skeptical-investor).
3. **Find conflicts.** Read all round 1 files. Write `round2-topics.md` with consensus points and numbered open conflicts.
4. **Round 2 (debate).** Spawn the same roles again in parallel. Each reads every round 1 file and the topics, takes ONE clear position per conflict, names who they agree/disagree with, and says if they changed their mind.
5. **Verdict.** Write `verdict.md`: consensus table, decisions, open items for the founder. Update `docs/01-team-verdict.md` or `CLAUDE.md` if a core decision changed.

## Rules for all agents

* Write in Turkish, simple and clear. No em dashes or en dashes.
* Be concrete, use numbers, name real competitors. Mark guesses as guesses.
* Legal content is not legal advice.
