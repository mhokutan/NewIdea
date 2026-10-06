// Signed in state: Better Auth session plus the PromoVote account and profile from /v1/me.
import { useCallback, useEffect, useState } from 'react';
import { api, type Me } from './api';
import { authClient } from './auth';

type State = { loading: boolean; me: Me | null };
let state: State = { loading: true, me: null };
const listeners = new Set<(s: State) => void>();
const set = (s: State) => { state = s; listeners.forEach((l) => l(s)); };

export async function refreshMe() {
  try {
    set({ loading: false, me: await api.me() });
  } catch {
    set({ loading: false, me: null });
  }
}

export async function signOut() {
  await authClient.signOut().catch(() => {});
  set({ loading: false, me: null });
}

let started = false;
export function useMe() {
  const [s, setS] = useState(state);
  useEffect(() => {
    listeners.add(setS);
    if (!started) { started = true; refreshMe(); }
    return () => { listeners.delete(setS); };
  }, []);
  const refresh = useCallback(() => refreshMe(), []);
  return { ...s, refresh, isScout: s.me?.profile?.type === 'scout', isCreator: s.me?.profile?.type === 'creator' };
}
