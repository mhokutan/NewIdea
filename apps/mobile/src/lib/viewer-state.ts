// What the signed in scout already did (calls, saves, follows), loaded from /v1/me/state and kept in sync
// locally, so buttons show the right state everywhere and after a restart.
import { useEffect, useState } from 'react';
import { api, type Call, type ViewerState } from './api';

let state: ViewerState = { calls: {}, saves: [], following: [], blocked: [] };
// True once the signed in state arrived (or there is nobody signed in), so screens that pick content by it can wait.
const meta = { loaded: false };
export const viewerStateLoaded = () => meta.loaded;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export async function loadViewerState() {
  try { state = await api.state(); } catch { state = { calls: {}, saves: [], following: [], blocked: [] }; }
  meta.loaded = true;
  emit();
}
export function clearViewerState() { state = { calls: {}, saves: [], following: [], blocked: [] }; meta.loaded = true; emit(); }

export function setCall(promoId: string, call: Call | null) {
  const calls = { ...state.calls };
  if (call) calls[promoId] = call; else delete calls[promoId];
  state = { ...state, calls }; emit();
}
export function setSaved(promoId: string, on: boolean) {
  const saves = state.saves.filter((x) => x !== promoId);
  state = { ...state, saves: on ? [promoId, ...saves] : saves }; emit();
}
export function setFollowing(handle: string, on: boolean) {
  const following = state.following.filter((x) => x !== handle);
  state = { ...state, following: on ? [handle, ...following] : following }; emit();
}

export function setBlocked(handle: string) {
  state = { ...state, blocked: [handle, ...state.blocked.filter((x) => x !== handle)], following: state.following.filter((x) => x !== handle) }; emit();
}

/** True once the signed in state arrived. A hook (not a plain read) so the React Compiler re-renders on change. */
export function useViewerStateLoaded() {
  const [loaded, setLoaded] = useState(meta.loaded);
  useEffect(() => {
    const l = () => setLoaded(meta.loaded);
    listeners.add(l);
    l();
    return () => { listeners.delete(l); };
  }, []);
  return loaded;
}

export function useViewerState() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return state;
}
