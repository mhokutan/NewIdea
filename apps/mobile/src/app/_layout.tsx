import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { api } from '@/lib/api';
import { GateHost } from '@/lib/gate';
import { C, onThemeChange, theme } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();


export default function RootLayout() {
  // Brand font; if it fails to load the app still opens with the system font.
  const [fontsLoaded, fontError] = useFonts({
    'Bricolage-Bold': require('../../assets/fonts/BricolageGrotesque-Bold.ttf'),
    'Bricolage-ExtraBold': require('../../assets/fonts/BricolageGrotesque-ExtraBold.ttf'),
  });
  const ready = fontsLoaded || !!fontError;
  useEffect(() => { if (ready) SplashScreen.hideAsync(); }, [ready]);
  useEffect(() => { api.event('app_open'); }, []);
  // Light or dark: the whole tree remounts with the new palette (styles are built per scheme in lib/theme.ts).
  const [scheme, setScheme] = useState(theme.scheme);
  useEffect(() => onThemeChange(() => setScheme(theme.scheme)), []);
  if (!ready) return null;
  const base = scheme === 'light' ? DefaultTheme : DarkTheme;
  const navTheme = { ...base, colors: { ...base.colors, background: C.bg, card: C.bg, primary: C.lime, text: C.text, border: C.line } };
  return (
    <GestureHandlerRootView key={scheme} style={{ flex: 1, backgroundColor: C.bg }}>
    <ThemeProvider value={navTheme}>
      <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="creator/[handle]" />
        <Stack.Screen name="play/[handle]" />
        <Stack.Screen name="sign-in" options={{ presentation: 'modal' }} />
        <Stack.Screen name="edit-profile" options={{ presentation: 'modal' }} />
        <Stack.Screen name="perk" options={{ presentation: 'modal' }} />
        <Stack.Screen name="activity" />
      </Stack>
      <GateHost />
    </ThemeProvider>
    </GestureHandlerRootView>
  );
}
