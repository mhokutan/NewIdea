// PromoVote colors, shared with the website (web/landing/public/styles.css). Light and dark themes
// (founder request 2026-10-07): the app follows the phone setting, or the choice in Settings.
// The video feed and the creator player always use the dark palette (D), because text sits on video.
import * as SecureStore from 'expo-secure-store';
import { Appearance, Platform, StyleSheet } from 'react-native';

export type Scheme = 'light' | 'dark';
export type SchemePref = 'system' | Scheme;

const DARK = {
  bg: '#0a0a0f',
  surface: '#14141f',
  surface2: '#1d1d2b',
  line: 'rgba(255,255,255,0.12)',
  text: '#ffffff',
  text2: '#dcd9e8',
  muted: '#a8a5b8',
  lime: '#c6ff3d', // fills (buttons, progress); text on it is always ink
  accent: '#c6ff3d', // lime used as text or icon color on the background
  ink: '#101014',
  pink: '#ff5470',
  violet: '#8b5cff',
  danger: '#ff6b6b',
};
type Palette = typeof DARK;
const LIGHT: Palette = {
  bg: '#ffffff',
  surface: '#f3f3f7',
  surface2: '#e7e7ee',
  line: 'rgba(16,16,20,0.12)',
  text: '#101014',
  text2: '#3b3a48',
  muted: '#6b6a7b',
  lime: '#c6ff3d',
  accent: '#3f7d00', // readable green on white (lime text would fail contrast)
  ink: '#101014',
  pink: '#e0244a',
  violet: '#6d3cf0',
  danger: '#d92d20',
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

// Brand display font (Bricolage Grotesque, SIL OFL, assets/fonts). Loaded in app/_layout.tsx.
// fontWeight stays normal: the weight is in the file, and Android falls back to the system font otherwise.
export const F = {
  display: { fontFamily: 'Bricolage-ExtraBold', fontWeight: 'normal' as const },
  displayBold: { fontFamily: 'Bricolage-Bold', fontWeight: 'normal' as const },
};
