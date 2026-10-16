// Duel tab (founder request 2026-10-16): between Feed and Explore. Opens straight into two promos at once,
// no card or start button. Logic and rules live in ui/DuelView.
import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/lib/theme';
import { useViewerState } from '@/lib/viewer-state';
import { DuelView } from '@/ui/DuelView';

// Same offsets as the feed: the web menu floats at the top, the iOS tab bar floats at the bottom.
const WEB_MENU = Platform.OS === 'web' ? 64 : 0;
const TAB_BAR = Platform.OS === 'ios' ? 49 : 0;

export default function DuelTab() {
  const insets = useSafeAreaInsets();
  const vs = useViewerState();
  const [focused, setFocused] = useState(true);
  useFocusEffect(useCallback(() => {
    setFocused(true); setStatusBarStyle('light');
    return () => { setFocused(false); setStatusBarStyle(theme.scheme === 'light' ? 'dark' : 'light'); };
  }, []));
  return <DuelView active={focused} topInset={insets.top + WEB_MENU + 8} bottomInset={TAB_BAR ? TAB_BAR + insets.bottom : 0} blocked={vs.blocked} />;
}
