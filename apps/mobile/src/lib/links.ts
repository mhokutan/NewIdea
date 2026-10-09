// Opens a link that came from the API (creator links, promo buttons, gift links). Only https is allowed, so a bad row
// can never open javascript:, intent:, file: or another app's scheme (security review 2026-10-09).
import { Linking } from 'react-native';

export function safeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && !u.username && !u.password ? u.toString() : null;
  } catch { return null; }
}

export function openExternal(url: string | null | undefined) {
  const safe = safeUrl(url);
  if (safe) Linking.openURL(safe).catch(() => {});
}
