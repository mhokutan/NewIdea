// Fair rotation, same rules as the website feed (web/landing/public/feed.js):
// every round gives each creator the same number of slots, viewer language first, then English,
// then least seen, random inside ties, never the same creator twice in a row.
import type { Promo } from './api';

const SLOTS_PER_CREATOR = 2;
const shuffle = <T,>(a: T[]) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export function nextRound(all: Promo[], seen: Record<string, number>, lang: string, prevCreator?: string): Promo[] {
  const langRank = (p: Promo) => (p.lang === lang ? 0 : p.lang === 'en' ? 1 : 2);
  const byCreator = new Map<string, Promo[]>();
  for (const p of shuffle([...all])) {
    const list = byCreator.get(p.creator.handle) || [];
    list.push(p);
    byCreator.set(p.creator.handle, list);
  }
  for (const list of byCreator.values()) list.sort((a, b) => langRank(a) - langRank(b) || (seen[a.id] || 0) - (seen[b.id] || 0));
  const budget = byCreator.size * SLOTS_PER_CREATOR;
  // Fair skip: a creator with nothing new (unseen, viewer language or English) gives its slots to creators that
  // still have new promos, round robin, so the viewer meets a repeat only after every new promo was shown.
  const fresh = [...byCreator.values()].map((l) => shuffle(l.filter((p) => !seen[p.id] && langRank(p) < 2)));
  const out: Promo[] = [];
  for (let i = 0; out.length < budget && fresh.some((l) => l[i]); i++) {
    for (const l of shuffle([...fresh])) if (l[i] && out.length < budget) out.push(l[i]);
  }
  // Nothing new left: the usual fair round (same slots per creator, least seen first).
  if (!out.length) {
    for (let slot = 0; slot < SLOTS_PER_CREATOR; slot++) {
      for (const l of shuffle([...byCreator.values()])) if (l[slot]) out.push(l[slot]);
    }
  }
  // Never the same creator twice in a row when another order exists.
  let last = prevCreator;
  for (let i = 0; i < out.length; i++) {
    if (out[i].creator.handle !== last) { last = out[i].creator.handle; continue; }
    const j = out.findIndex((p, k) => k > i && p.creator.handle !== last);
    if (j > 0) [out[i], out[j]] = [out[j], out[i]];
    last = out[i].creator.handle;
  }
  return out;
}
