---
name: domain-check
description: Check whether brand name candidates are registered on .com and .app using RDAP. Use when choosing or comparing product names.
---

# Domain Check

Run:

```bash
bash .claude/skills/domain-check/check.sh name1 name2 name3
```

Output per name: `com`, `app` as `taken` or `free?`.

* `free?` means no registration record was found. It does not mean it is for sale at normal price. Confirm at a registrar (Cloudflare, Namecheap) before deciding.
* .gg and other TLDs have no reliable public RDAP here; check them at a registrar.
* After picking a name, also check USPTO and EUIPO trademarks (classes 9, 35, 41, 42), App Store and Google Play name conflicts, and social handles.
* Naming rules from the team (see `docs/01-team-verdict.md`): no "only" (OnlyFans trademark risk), avoid "ads" (ad blocker lists, Apple review), short, works beyond games.
