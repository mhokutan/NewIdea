// Better Auth client. Session cookie is kept in the device keychain (SecureStore).
import { expoClient } from '@better-auth/expo/client';
import { createAuthClient } from 'better-auth/react';
import { emailOTPClient } from 'better-auth/client/plugins';
import * as SecureStore from 'expo-secure-store';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.promovote.com';

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    expoClient({ scheme: 'promovote', storagePrefix: 'promovote', storage: SecureStore }),
    emailOTPClient(),
  ],
});
