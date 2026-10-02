---
name: unit-economics
description: Assumptions and formulas for pricing, margins, inventory (DAU needed) and break-even. Use when calculating cost per view, package margins, or how many users / advertisers are needed.
---

# Unit Economics

Source of the numbers: `docs/debate/round1-marketplace-economist.md` and `docs/01-team-verdict.md`. Update this file when real data comes in.

## Base assumptions (guesses until measured)
* Cloudflare Stream: delivery $1 per 1,000 minutes, storage $5 per 1,000 minutes.
* Stripe: 2.9% + $0.30 per card payment, Billing +0.7%.
* 1 qualified view needs about 1.6 impressions, about 18 sec watched per impression.
* Delivery cost per qualified view: about $0.0005.
* Moderation: about $1 per reviewed video. Support: about 5% of revenue.
* Frequency + targeting factor for DAU need: x2.5.

## Formulas
* `daily_views_needed = monthly_views_sold / 30`
* `DAU_needed = daily_views_needed / views_per_user_per_day * 2.5`
* `gross_margin = (price - stripe - delivery - moderation - support) / price`
* `cost_per_view_from_paid_users = CPI / lifetime_views_per_user` (if this is higher than price per view, paid acquisition loses money)

## Key insight
Infra cost is small (around 80% gross margin). The real risk is demand: users must come organically and return. Never sell guaranteed view quotas before DAU supports them (subscriptions only in Phase 3, about 4,000 DAU).

Use Bash (python or awk) to compute tables. Show math in small tables, in Turkish.
