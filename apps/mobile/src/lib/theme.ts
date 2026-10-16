// PromoVote colors, shared with the website (web/landing/public/styles.css). Light and dark themes
// (founder request 2026-10-07): the app follows the phone setting, or the choice in Settings.
// Brand (founder pick 2026-10-16, design/brand/renk-yonleri.html): black, white and one yellow. The app itself is
// monochrome, color comes from the videos. Yellow (`lime`, kept as the key name) only on the call button, story ring,
// picks, progress and the logo. Generic buttons and selected states are black or white. No purple, no neon.
// The video feed and the creator player always use the dark palette (D), because text sits on video.
import * as SecureStore from 'expo-secure-store';
import { Appearance, Platform, StyleSheet } from 'react-native';

export type Scheme = 'light' | 'dark';
export type SchemePref = 'system' | Scheme;

const DARK = {
  bg: '#0a0a0a',
  surface: '#1c1c1e',
  surface2: '#2c2c2e',
  line: 'rgba(255,255,255,0.12)',
  text: '#f5f5f7',
  text2: '#d1d1d6',
  muted: '#98989d',
  lime: '#ffd60a', // brand yellow fill (call button, story ring, progress); text on it is always ink
  accent: '#ffd60a', // brand yellow used as text or icon color on the background
  ink: '#1d1d1f',
  pink: '#ff453a',
  violet: '#ffd60a',
  danger: '#ff6961',
};
type Palette = typeof DARK;
const LIGHT: Palette = {
  bg: '#ffffff',
  surface: '#f2f2f7',
  surface2: '#e5e5ea',
  line: 'rgba(0,0,0,0.1)',
  text: '#0a0a0a',
  text2: '#3a3a3c',
  muted: '#6e6e73',
  lime: '#ffd60a',
  accent: '#7a5c00', // readable dark yellow on white (yellow text would fail contrast)
  ink: '#1d1d1f',
  pink: '#d70015',
  violet: '#7a5c00',
  danger: '#d70015',
};

/** Fixed dark palette for screens drawn over video. */
export const D: Palette = DARK;

const PREF_KEY = 'pv_theme';
const readPref = (): SchemePref => {
  try {
    const v = Platform.OS === 'web' ? globalThis.localStorage?.getItem(PREF_KEY) : SecureStore.getItem(PREF_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch { return 'system'; }
};
const resolve = (pref: SchemePref): Scheme => (pref === 'system' ? (Appearance.getColorScheme() === 'light' ? 'light' : 'dark') : pref);

// Module state lives in an object: the React Compiler mishandles reassigned module level variables.
export const theme = { pref: readPref() as SchemePref, scheme: 'dark' as Scheme };
theme.scheme = resolve(theme.pref);

/** Current palette. Values are swapped in place when the theme changes; the root then remounts the app. */
export const C: Palette = { ...(theme.scheme === 'light' ? LIGHT : DARK) };

const listeners = new Set<() => void>();
function apply() {
  const next = resolve(theme.pref);
  if (next === theme.scheme && C.bg === (next === 'light' ? LIGHT : DARK).bg) return;
  theme.scheme = next;
  Object.assign(C, next === 'light' ? LIGHT : DARK);
  listeners.forEach((l) => l());
}
export function setThemePref(pref: SchemePref) {
  theme.pref = pref;
  try {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(PREF_KEY, pref);
    else SecureStore.setItem(PREF_KEY, pref);
  } catch {}
  apply();
}
export function onThemeChange(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }
Appearance.addChangeListener(() => { if (theme.pref === 'system') apply(); });

/**
 * Styles that follow the theme. Use like StyleSheet.create: `const styles = themed(() => ({ ... }))`, then
 * `styles.box` as usual. The sheet is built from the current palette, once per scheme.
 */
export function themed<T extends StyleSheet.NamedStyles<T>>(make: () => T): T {
  const cache: Partial<Record<Scheme, T>> = {};
  return new Proxy({} as T, {
    get: (_, key) => {
      const sheet = (cache[theme.scheme] ||= StyleSheet.create(make()));
      return sheet[key as keyof T];
    },
  });
}

export const R = { sm: 10, md: 14, lg: 22 };

// Brand display font (Geist by Vercel, SIL OFL, assets/fonts). Loaded in app/_layout.tsx. Body text stays the system font.
// fontWeight stays normal: the weight is in the file, and Android falls back to the system font otherwise.
export const F = {
  display: { fontFamily: 'Geist-Bold', fontWeight: 'normal' as const, letterSpacing: -0.6 },
  displayBold: { fontFamily: 'Geist-SemiBold', fontWeight: 'normal' as const, letterSpacing: -0.3 },
};
