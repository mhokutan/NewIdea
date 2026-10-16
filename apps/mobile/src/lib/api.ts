// Small typed client for https://api.promovote.com (services/api).
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { API_URL, authClient } from './auth';
import { lang } from './i18n';

export type Creator = {
  handle: string; name: string; avatar: string | null; mono: string | null; kind: string | null;
  category: string; verified: boolean; releaseStatus?: string; androidStatus?: string | null;
  iosStatus?: string | null; founderOwned?: boolean; aiPersona?: boolean;
};
export type Promo = {
  id: string; slug: string; lang: string; title: string; description: string | null; tags: string[];
  video: { mp4: string | null; webm: string | null; poster: string | null; hls: string | null; durationMs: number };
  cta: { kind: string; url: string | null } | null; ctaAndroid?: { kind: string; url: string } | null; hasPerk: boolean; liveAt: string; creator: Creator;
  saves?: number; pinned?: boolean; views?: number | null; aiGenerated?: boolean;
};
export type Profile = {
  handle: string; type: 'scout' | 'creator'; name: string; bio: string | null; avatar: string | null;
  banner: string | null; mono: string | null; verified: boolean; kind?: string; category?: string;
  releaseStatus?: string; androidStatus?: string | null; iosStatus?: string | null; founderOwned?: boolean; aiPersona?: boolean; followers?: number | null;
  links?: Link[]; promos?: Promo[]; newCreator?: boolean; stats?: { score?: number; level?: number; calledIt?: number; followers?: number | null; saves?: number; calls?: number; promos?: number } | null;
  viewer?: { following: boolean; isMe: boolean }; primaryCta?: { kind: string; url: string | null } | null;
};
export type Me = {
  user: { id: string; email: string; name?: string | null };
  account: { type: 'scout' | 'creator'; language: string } | null;
  profile: { handle: string; name: string; type: 'scout' | 'creator'; status: string; interests?: string[] } | null;
  needsOnboarding: boolean;
};

export type Call = {
  choice: 'will_blow_up' | 'not_for_me'; rank: number | null; resolvesAt: string;
  outcome?: 'pending' | 'correct' | 'incorrect' | 'void'; split?: { total: number; blowUpPct: number };
  points?: number; finalBy?: string;
};
export type ViewerState = { calls: Record<string, Call>; saves: string[]; following: string[]; blocked: string[] };

export type Perk = { id: string; kind: 'code' | 'discount' | 'beta_invite'; title: string; description: string | null; redeemUrl: string | null; endsAt: string; stockLeft: number | null; status: string };
export type WalletItem = Perk & { creator: { handle: string; name: string; avatar: string | null }; claimedAt: string; code: string | null };
export type Link = { platform: string; url: string; label: string | null };
export type ScoutSummary = {
  score: number; level: number; nextLevelAt: number; streakWeeks: number; resolved: number; right: number; calledIt: number;
  open: { promo: Promo; choice: Call['choice']; rank: number | null; resolvesAt: string; finalBy?: string }[];
  accuracy: number | null;
  streak?: { weeks: number; best: number; freezes: number; daysThisWeek: number; daysNeeded: number };
  results: { promo: Promo; choice: Call['choice']; outcome: 'correct' | 'incorrect' | 'void'; points: number; resolvedAt: string | null }[];
  saved: Promo[]; following: { handle: string; name: string; avatar: string | null; mono: string | null }[];
};
type Stat = { views: number; completion: number; avgSeconds: number; clicks: number; ctr: number; saves: number; follows: number; linkTaps: number };
export type Studio = {
  profile: { name: string; bio: string | null; avatar: string | null; banner: string | null; followers: number; category: string;
    secondaryCategories: string[]; primaryCta: string | null; releaseStatus: string };
  links: Link[]; checklist: { logo: boolean; banner: boolean; bio: boolean; links: boolean; promo: boolean };
  stats: { d7: Stat; d28: Stat; saves: number; followers: number }; calls: { total: number; blowUpPct: number | null }; promos: Promo[];
};

export type MyPromo = {
  id: string; title: string; description: string | null; lang: string; status: 'draft' | 'in_review' | 'live' | 'rejected' | 'paused';
  ctaKind: string | null; aiGenerated: boolean; rejectionNote: string | null; canFix: boolean;
  video: { mp4: string; poster: string | null; durationMs: number } | null; createdAt: string; submittedAt: string | null; liveAt: string | null;
};
export type UploadQuota = { used: number; limit: number; left: number };

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public body?: any) { super(message); }
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
  if (!res.ok) throw new ApiError(res.status, body?.error?.code || 'error', body?.error?.message || 'Request failed', body);
  return body as T;
}

export type ActivityItem =
  | { kind: 'result'; at: string; outcome: string; choice: 'will_blow_up' | 'not_for_me'; points: number; promo: Promo }
  | { kind: 'new_promo'; at: string; promo: Promo }
  | { kind: 'week_followers' | 'week_saves' | 'week_calls'; at: string; n: number };
export const api = {
  feed: () => call<{ promos: Promo[] }>('/v1/feed'),
  drop: () => call<{ day: string; size: number; promos: Promo[] }>('/v1/drop'),
  home: (tab: 'following' | 'new' | 'top' | 'featured') => call<{ promos: Promo[]; progress?: { scouts: number; goal: number } }>('/v1/home?tab=' + tab),
  explore: (p: { q?: string; cat?: string; tag?: string }) =>
    call<{ promos: Promo[] }>('/v1/explore?' + new URLSearchParams(Object.entries(p).filter(([, v]) => v) as [string, string][])),
  hashtags: () => call<{ hashtags: { tag: string; count: number }[] }>('/v1/hashtags'),
  creators: (cat?: string) => call<{ creators: Creator[] }>('/v1/creators' + (cat ? '?cat=' + cat : '')),
  profile: (handle: string) => call<{ profile: Profile }>('/v1/profiles/' + encodeURIComponent(handle)),
  me: () => call<Me>('/v1/me'),
  scout: () => call<ScoutSummary>('/v1/me/scout'),
  creatorPerk: (handle: string) => call<{ perk: Perk | null }>('/v1/creators/' + encodeURIComponent(handle) + '/perk'),
  claimPerk: (id: string) => call<{ ok: true; perk: Perk; code: string | null }>('/v1/perks/' + encodeURIComponent(id) + '/claim', { method: 'POST' }),
  myPerks: () => call<{ wallet: WalletItem[]; own: (Perk & { claims: number })[] }>('/v1/me/perks'),
  createPerk: (b: Record<string, unknown>) => call<{ ok: true; id: string }>('/v1/me/perks', { method: 'POST', body: JSON.stringify(b) }),
  endPerk: (id: string) => call('/v1/me/perks/' + id, { method: 'DELETE' }),
  studio: () => call<Studio>('/v1/me/studio'),
  activity: () => call<{ items: ActivityItem[] }>('/v1/me/activity'),
  updateMe: (b: Record<string, unknown>) => call<{ ok: true }>('/v1/me', { method: 'PATCH', body: JSON.stringify(b) }),
  setLinks: (links: { url: string; label?: string | null }[]) => call<{ ok: true; links: Link[] }>('/v1/me/links', { method: 'PUT', body: JSON.stringify({ links }) }),
  uploadMedia: (kind: 'avatar' | 'banner', uri: string) => uploadMedia(kind, uri),
  onboarding: (b: Record<string, unknown>) => call<{ ok: true; handle: string }>('/v1/onboarding', { method: 'POST', body: JSON.stringify(b) }),
  handle: (h: string) => call<{ available: boolean; reason: string | null }>('/v1/handles/' + encodeURIComponent(h)),
  follow: (h: string, on: boolean, source: 'feed' | 'profile' | 'explore' = 'feed') => call<{ ok: true; following: boolean; followers: number | null }>('/v1/follows/' + encodeURIComponent(h), { method: on ? 'POST' : 'DELETE', body: JSON.stringify({ source }) }),
  state: () => call<ViewerState>('/v1/me/state'),
  vote: (promoId: string, choice: 'will_blow_up' | 'not_for_me') => call<{ ok: true; call: Call }>('/v1/calls', { method: 'POST', body: JSON.stringify({ promoId, choice }) }),
  block: (handle: string) => call('/v1/blocks/' + encodeURIComponent(handle), { method: 'POST' }),
  save: (promoId: string, on: boolean) => call('/v1/saves/' + encodeURIComponent(promoId), { method: on ? 'POST' : 'DELETE' }),
  view: async (promoId: string, seconds: number, completed: boolean) =>
    call('/v1/events/view', { method: 'POST', body: JSON.stringify({ promoId, seconds, completed, deviceId: await deviceId() }) }),
  /** Funnel step, fire and forget (one row per step per viewer per day on the server). */
  event: (name: string) => { deviceId().then((d) => call('/v1/events/app', { method: 'POST', body: JSON.stringify({ name, deviceId: d }) })).catch(() => {}); },
  linkTap: async (handle: string, url: string) => call('/v1/events/link', { method: 'POST', body: JSON.stringify({ handle, url, deviceId: await deviceId() }) }),
  click: async (promoId: string) => call('/v1/events/click', { method: 'POST', body: JSON.stringify({ promoId, deviceId: await deviceId() }) }),
  report: (targetType: string, targetId: string, reason: string) => call('/v1/reports', { method: 'POST', body: JSON.stringify({ targetType, targetId, reason }) }),
  deleteAccount: () => call('/v1/me', { method: 'DELETE' }),
  myPromos: () => call<{ quota: UploadQuota; promos: MyPromo[] }>('/v1/me/promos'),
  createPromo: (b: { title: string; description?: string; lang: string; ctaKind?: string | null; aiGenerated: boolean; rightsConfirmed: true }) =>
    call<{ ok: true; id: string }>('/v1/me/promos', { method: 'POST', body: JSON.stringify(b) }),
  uploadPromoVideo: (id: string, uri: string, durationMs: number, width?: number, height?: number) =>
    uploadFile(`/v1/me/promos/${id}/video?duration_ms=${Math.round(durationMs)}${width ? `&width=${Math.round(width)}` : ''}${height ? `&height=${Math.round(height)}` : ''}`, uri, 'video/mp4'),
  uploadPromoPoster: (id: string, uri: string) => uploadFile(`/v1/me/promos/${id}/poster`, uri, 'image/jpeg'),
  updatePromo: (id: string, b: { title: string; description?: string | null; aiGenerated: boolean }) => call<{ ok: true }>(`/v1/me/promos/${id}`, { method: 'PATCH', body: JSON.stringify(b) }),
  submitPromo: (id: string) => call<{ ok: true; status: string }>(`/v1/me/promos/${id}/submit`, { method: 'POST' }),
  deletePromo: (id: string) => call<{ ok: true }>(`/v1/me/promos/${id}`, { method: 'DELETE' }),
};

// Uploads a resized JPEG from the photo picker.
async function uploadMedia(kind: 'avatar' | 'banner', uri: string) {
  const cookie = Platform.OS === 'web' ? '' : await authClient.getCookie().catch(() => '');
  const blob = await (await fetch(uri)).blob();
  const res = await fetch(`${API_URL}/v1/me/media?kind=${kind}`, {
    method: 'POST', body: blob, credentials: Platform.OS === 'web' ? 'include' : 'omit',
    headers: { 'Content-Type': 'image/jpeg', ...(cookie ? { Cookie: cookie } : {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body?.error?.code || 'error', body?.error?.message || 'Upload failed', body);
  return body as { ok: true; url: string };
}

// Uploads a local file (video or poster) with PUT. The body is the raw file, not a form.
// On phones the file is streamed from disk (a 50 MB video never sits in JS memory); the web build uses a Blob.
async function uploadFile(path: string, uri: string, type: string) {
  const cookie = Platform.OS === 'web' ? '' : await authClient.getCookie().catch(() => '');
  const headers: Record<string, string> = { 'Content-Type': type, ...(cookie ? { Cookie: cookie } : {}) };
  let status: number, text: string;
  if (Platform.OS === 'web') {
    const res = await fetch(API_URL + path, { method: 'PUT', body: await (await fetch(uri)).blob(), credentials: 'include', headers });
    status = res.status; text = await res.text();
  } else {
    const res = await FileSystem.uploadAsync(API_URL + path, uri, { httpMethod: 'PUT', uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT, headers });
    status = res.status; text = res.body;
  }
  let body: any = {};
  try { body = JSON.parse(text); } catch {}
  if (status < 200 || status >= 300) throw new ApiError(status, body?.error?.code || 'error', body?.error?.message || 'Upload failed', body);
  return body as { ok: true; url: string };
}

/** Size of a local file in bytes (null when unknown, for example on the web). */
export async function fileSize(uri: string): Promise<number | null> {
  if (Platform.OS === 'web') return null;
  const info = await FileSystem.getInfoAsync(uri).catch(() => null);
  return info && info.exists && typeof info.size === 'number' ? info.size : null;
}

// Random id for guest view counting. Not linked to the person, reset by reinstalling.
let cachedDevice: string | null = null;
async function deviceId() {
  if (cachedDevice) return cachedDevice;
  if (Platform.OS === 'web') return (cachedDevice = Crypto.randomUUID());
  let id = await SecureStore.getItemAsync('pv_device');
  if (!id) { id = Crypto.randomUUID(); await SecureStore.setItemAsync('pv_device', id); }
  return (cachedDevice = id);
}
