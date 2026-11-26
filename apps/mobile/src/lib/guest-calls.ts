// Calls without signing in (founder 2026-11-17, Fable analysis item 3): a guest can make GUEST_FREE_CALLS calls.
// They are kept on the phone (SecureStore), shown on the reel like real calls, and sent to the account as soon as the
// person signs in as a scout. Sign in is only needed to keep calls and earn Scout Score: after the last free call a
// soft sheet says so, and the next call asks for sign in like before.
// A guest call older than 24 hours is dropped and never sent, so nobody can wait for results before keeping a call.
import * as SecureStore from 'expo-secure-store';

import { api, ApiError, type Call } from './api';
import { retryLater, sendAll, singleFlight } from './guest-sync';
import { setCall } from './viewer-state';

export const GUEST_FREE_CALLS = 3;
const KEY = 'pv_guest_calls_v1';
const MAX_AGE_MS = 24 * 3600 * 1000;

type GuestCall = { promoId: string; choice: Call['choice']; at: number };
// Module state lives in a plain object: the React Compiler mishandles reassigned module level variables.
const mem: { list: GuestCall[]; loaded: boolean } = { list: [], loaded: false };

const fresh = (g: GuestCall) => Date.now() - g.at < MAX_AGE_MS;
const asCall = (g: GuestCall): Call => ({ choice: g.choice, rank: null, resolvesAt: new Date(g.at + 7 * 864e5).toISOString() });

async function load() {
  if (!mem.loaded) {
    try {
      const raw = await SecureStore.getItemAsync(KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      mem.list = Array.isArray(parsed) ? parsed.filter((g) => g && typeof g.promoId === 'string' && typeof g.at === 'number') : [];
    } catch { mem.list = []; }
    mem.loaded = true;
  }
  mem.list = mem.list.filter(fresh);
  return mem.list;
}
async function save() {
  try { await SecureStore.setItemAsync(KEY, JSON.stringify(mem.list.slice(-GUEST_FREE_CALLS * 2))); } catch { /* keeps working in memory */ }
}

/** Calls this guest made in the last 24 hours (sync read; load() runs at start through showGuestCalls). */
export function guestCallCount() {
  return mem.list.filter(fresh).length;
}

/** Records a guest call, shows it on the reel and returns how many guest calls there are now. */
export async function addGuestCall(promoId: string, choice: Call['choice']) {
  await load();
  mem.list = [...mem.list.filter((g) => g.promoId !== promoId), { promoId, choice, at: Date.now() }];
  setCall(promoId, asCall(mem.list[mem.list.length - 1]));
  await save();
  return guestCallCount();
}

/** For guests: puts the kept calls back on the reels after a restart. */
export async function showGuestCalls() {
  for (const g of await load()) setCall(g.promoId, asCall(g));
}

/** After sign in as a scout: sends the kept calls to the account, then forgets them. Returns how many were saved.
 * A call that could not be sent (no connection, server error) stays kept and is tried again at the next sign in
 * check or app start, until it is 24 hours old. Overlapping runs (sign in plus a session refresh) share one run, so
 * a call is never sent twice at the same time. */
export const syncGuestCalls = singleFlight(async () => {
  const list = await load();
  const { saved, kept } = await sendAll(list, async (g) => {
    try {
      const r = await api.vote(g.promoId, g.choice);
      setCall(g.promoId, r.call);
      return 'saved';
    } catch (e) {
      if (e instanceof ApiError && e.code === 'already_voted' && e.body?.call) setCall(g.promoId, e.body.call);
      return retryLater(e instanceof ApiError ? e.status : null) ? 'retry' : 'settled';
    }
  });
  mem.list = kept;
  if (kept.length) await save();
  else { try { await SecureStore.deleteItemAsync(KEY); } catch { /* nothing kept */ } }
  if (saved) api.event('guest_sync');
  return saved;
});
