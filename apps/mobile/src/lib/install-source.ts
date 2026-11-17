// Where an Android install came from (CEO and founder 2026-11-17: the Hauling Empire card opens 20 Nov, measure it).
// Google Play passes the store link's referrer (the card uses utm_source=hauling_empire) to the app; we read it once
// on the first open and count one event. iOS cannot read this: installs from the card show in App Store Connect,
// App Analytics, campaign "he-ingame". Only the source name leaves the phone, never the full referrer.
import * as Application from 'expo-application';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { api } from './api';

const KEY = 'pv_install_source_v1';

export function sourceEvent(referrer: string): 'install_from_he' | 'install_from_other' | 'install_organic' {
  const src = (new URLSearchParams(referrer).get('utm_source') || '').toLowerCase();
  if (src === 'hauling_empire' || src === 'haulingempire') return 'install_from_he';
  if (src && src !== 'google-play' && src !== '(not set)') return 'install_from_other';
  return 'install_organic';
}

export async function reportInstallSource() {
  if (Platform.OS !== 'android') return;
  try {
    if (await SecureStore.getItemAsync(KEY)) return;
    const referrer = await Application.getInstallReferrerAsync();
    api.event(sourceEvent(referrer || ''));
    await SecureStore.setItemAsync(KEY, '1');
  } catch { /* try again on the next open */ }
}
