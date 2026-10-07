// Native Apple and Google sign in. The app gets an ID token and Better Auth verifies it on the server.
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

import { authClient } from './auth';

export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
export const EMAIL_LOGIN = process.env.EXPO_PUBLIC_EMAIL_LOGIN === '1';

export type Result = { ok: true } | { ok: false; cancelled?: boolean; message?: string };

export async function appleAvailable() {
  return Platform.OS === 'ios' && (await AppleAuthentication.isAvailableAsync().catch(() => false));
}

export async function signInWithApple(): Promise<Result> {
  try {
    const cred = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
    });
    if (!cred.identityToken) return { ok: false, message: 'No token from Apple' };
    // Apple shares the name only on the very first sign in, so it is passed along to prefill the profile.
    const name = cred.fullName?.givenName || cred.fullName?.familyName
      ? { firstName: cred.fullName?.givenName || undefined, lastName: cred.fullName?.familyName || undefined } : undefined;
    const r = await authClient.signIn.social({ provider: 'apple', idToken: { token: cred.identityToken, user: name ? { name } : undefined } });
    return r.error ? { ok: false, message: r.error.message } : { ok: true };
  } catch (e: any) {
    return { ok: false, cancelled: e?.code === 'ERR_REQUEST_CANCELED', message: e?.message };
  }
}

export const googleAvailable = () => Platform.OS !== 'web' && !!GOOGLE_WEB_CLIENT_ID;

export async function signInWithGoogle(): Promise<Result> {
  try {
    // Loaded lazily so builds without the Google config still start.
    const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
    GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, iosClientId: GOOGLE_IOS_CLIENT_ID || undefined });
    if (Platform.OS === 'android') await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res = await GoogleSignin.signIn();
    if (res.type !== 'success') return { ok: false, cancelled: true };
    if (!res.data.idToken) return { ok: false, message: 'No token from Google' };
    const r = await authClient.signIn.social({ provider: 'google', idToken: { token: res.data.idToken } });
    return r.error ? { ok: false, message: r.error.message } : { ok: true };
  } catch (e: any) {
    return { ok: false, message: e?.message };
  }
}
