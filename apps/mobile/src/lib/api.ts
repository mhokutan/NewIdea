// Small typed client for https://api.promovote.com (services/api).
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { API_URL, authClient } from './auth';
import { lang } from './i18n';

export type Creator = {
  handle: string; name: string; avatar: string | null; mono: string | null; kind: string | null;
  category: string; verified: boolean; releaseStatus?: string; androidStatus?: string | null;
  iosStatus?: string | null; founderOwned?: boolean;
};
export type Promo = {
  id: string; slug: string; lang: string; title: string; description: string | null; tags: string[];
  video: { mp4: string | null; webm: string | null; poster: string | null; hls: string | null; durationMs: number };
  cta: { kind: string; url: string | null } | null; hasPerk: boolean; liveAt: string; creator: Creator;
};
export type Profile = {
  handle: string; type: 'scout' | 'creator'; name: string; bio: string | null; avatar: string | null;
  banner: string | null; mono: string | null; verified: boolean; kind?: string; category?: string;
  releaseStatus?: string; androidStatus?: string | null; founderOwned?: boolean; followers?: number | null;
  links?: { platform: string; url: string; label: string | null }[]; promos?: Promo[];
  viewer?: { following: boolean; isMe: boolean };
};
export type Me = {
  user: { id: string; email: string };
  account: { type: 'scout' | 'creator'; language: string } | null;
  profile: { handle: string; name: string; type: 'scout' | 'creator'; status: string } | null;
  needsOnboarding: boolean;
};

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  // Native apps send the stored session cookie; the web build relies on the browser's own cookies.
  const cookie = Platform.OS === 'web' ? '' : await authClient.getCookie().catch(() => '');
  const res = await fetch(API_URL + path + (path.includes('?') ? '&' : '?') + 'lang=' + lang, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...(init.headers || {}) },
    credentials: Platform.OS === 'web' ? 'include' : 'omit',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body?.error?.code || 'error', body?.error?.message || 'Request failed');
  return body as T;
}

export const api = {
  feed: () => call<{ promos: Promo[] }>('/v1/feed'),
  home: (tab: 'new' | 'top' | 'featured') => call<{ promos: Promo[] }>('/v1/home?tab=' + tab),
  explore: (p: { q?: string; cat?: string; tag?: string }) =>
    call<{ promos: Promo[] }>('/v1/explore?' + new URLSearchParams(Object.entries(p).filter(([, v]) => v) as [string, string][])),
  hashtags: () => call<{ hashtags: { tag: string; count: number }[] }>('/v1/hashtags'),
  creators: (cat?: string) => call<{ creators: Creator[] }>('/v1/creators' + (cat ? '?cat=' + cat : '')),
  profile: (handle: string) => call<{ profile: Profile }>('/v1/profiles/' + encodeURIComponent(handle)),
  me: () => call<Me>('/v1/me'),
  onboarding: (b: Record<string, unknown>) => call<{ ok: true; handle: string }>('/v1/onboarding', { method: 'POST', body: JSON.stringify(b) }),
  handle: (h: string) => call<{ available: boolean; reason: string | null }>('/v1/handles/' + encodeURIComponent(h)),
  follow: (h: string, on: boolean) => call('/v1/follows/' + h, { method: on ? 'POST' : 'DELETE', body: JSON.stringify({ source: 'feed' }) }),
  vote: (promoId: string, choice: 'will_blow_up' | 'not_for_me') => call('/v1/calls', { method: 'POST', body: JSON.stringify({ promoId, choice }) }),
  save: (promoId: string, on: boolean) => call('/v1/saves/' + promoId, { method: on ? 'POST' : 'DELETE' }),
  view: async (promoId: string, seconds: number, completed: boolean) =>
    call('/v1/events/view', { method: 'POST', body: JSON.stringify({ promoId, seconds, completed, deviceId: await deviceId() }) }),
  click: async (promoId: string) => call('/v1/events/click', { method: 'POST', body: JSON.stringify({ promoId, deviceId: await deviceId() }) }),
  report: (targetType: string, targetId: string, reason: string) => call('/v1/reports', { method: 'POST', body: JSON.stringify({ targetType, targetId, reason }) }),
  deleteAccount: () => call('/v1/me', { method: 'DELETE' }),
};

// Random id for guest view counting. Not linked to the person, reset by reinstalling.
let cachedDevice: string | null = null;
async function deviceId() {
  if (cachedDevice) return cachedDevice;
  if (Platform.OS === 'web') return (cachedDevice = crypto.randomUUID());
  let id = await SecureStore.getItemAsync('pv_device');
  if (!id) { id = crypto.randomUUID(); await SecureStore.setItemAsync('pv_device', id); }
  return (cachedDevice = id);
}
