// Fair rotation, same rules as the website feed (web/landing/public/feed.js):
// every round gives each creator the same number of slots, least seen first,
// viewer language first, then English, random inside ties, never the same creator twice in a row.
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
  const picks = [...byCreator.values()].map((list) =>
    list.sort((a, b) => (seen[a.id] || 0) - (seen[b.id] || 0) || langRank(a) - langRank(b)).slice(0, SLOTS_PER_CREATOR),
  );
  const out: Promo[] = [];
  let last = prevCreator;
  for (let slot = 0; slot < SLOTS_PER_CREATOR; slot++) {
    const layer = shuffle(picks.map((l) => l[slot]).filter(Boolean));
    if (layer.length > 1 && layer[0].creator.handle === last) layer.push(layer.shift()!);
    for (const p of layer) { out.push(p); last = p.creator.handle; }
  }
  return out;
}
