// Creator categories (expert review 2026-10-07). Same list as the API (services/api CATEGORIES).
// Local stays out of Explore until there are 20 local creators.
import type { t } from './i18n';

type Key = Parameters<typeof t>[0];
export const CATEGORIES: { id: string; label: Key }[] = [
  { id: 'games', label: 'games' }, { id: 'apps', label: 'apps' }, { id: 'streams', label: 'streams' },
  { id: 'videos', label: 'videos' }, { id: 'shops', label: 'shops' }, { id: 'brands', label: 'brands' }, { id: 'local', label: 'local' },
];
export const EXPLORE_CATEGORIES = CATEGORIES.filter((c) => c.id !== 'local');

export const CTA_OPTIONS: { id: string; label: Key }[] = [
  { id: 'website', label: 'cta_website' }, { id: 'app_store', label: 'cta_app_store' }, { id: 'google_play', label: 'cta_google_play' },
  { id: 'steam', label: 'cta_steam' }, { id: 'shop', label: 'cta_shop' }, { id: 'watch_live', label: 'cta_watch_live' }, { id: 'watch', label: 'cta_watch' },
];

// Display names for link platforms (brand names stay as their owners write them).
export const PLATFORM_NAMES: Record<string, string> = {
  youtube: 'YouTube', twitch: 'Twitch', kick: 'Kick', tiktok: 'TikTok', instagram: 'Instagram', x: 'X', steam: 'Steam',
  app_store: 'App Store', google_play: 'Google Play', etsy: 'Etsy', discord: 'Discord', itch: 'itch.io', amazon: 'Amazon',
  shopify: 'Shop', google_maps: 'Maps',
};
export const linkName = (platform: string, url: string, label: string | null) =>
  label || PLATFORM_NAMES[platform] || (() => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } })();
export const categoryLabel = (id?: string | null) => CATEGORIES.find((c) => c.id === id)?.label;

// Main button label for a CTA kind. Google Play buttons are hidden on iOS (App Store guideline 2.3.10).
const CTA_KEYS: Record<string, Key> = {
  website: 'cta_website', app_store: 'cta_app_store', google_play: 'cta_google_play', steam: 'cta_steam', itch: 'cta_itch',
  shop: 'cta_shop', etsy: 'cta_etsy', watch: 'cta_watch', watch_live: 'cta_watch_live', notify: 'cta_notify',
};
export const ctaLabel = (kind: string): Key => CTA_KEYS[kind] || 'cta_website';
export const ctaVisible = (kind: string, os: string) => !(kind === 'google_play' && os === 'ios');
