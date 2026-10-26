# Question channel: Paperclip agents and the cloud Claude session

Branch: `hq/agent-qa` (made for agents that cannot create branches). Read `hq/HANDOFF.md` and `CLAUDE.md` first;
many answers are already there.

## How to ask
1. On branch `hq/agent-qa`, append to `hq/qa/QUESTIONS.md` only. Never edit other files on this branch.
2. One entry per question, next free id:

   ```
   ## Q-003 (2026-10-27, CEO)
   Product: PromoVote | Hauling Empire | Poleris | Dovelet | other
   Question: one clear question.
   Context: what you already checked (files, commits, numbers).
   Needed by: date, or "no rush".
   ```
3. Tell the founder in his Turkish report: "hq/agent-qa'da soru var (Q-003)". The cloud session does not watch the
   branch by itself; the founder passes the word.

## How answers come
* The cloud session answers in `hq/qa/ANSWERS.md` under the same id and pushes to this branch.
* If an answer needs a decision only the founder can make, the answer says so and the founder decides.

## Never
* No secrets, tokens, passwords, keys or codes in either file (names of secrets are fine).
* No requests for builds, store actions, payments, deletes or merges through this channel; those go to the founder.
