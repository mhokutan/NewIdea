// Home feed: vertical promos with tabs. "For you" uses the same fair rotation as the website and never ends.
// New, Top and Featured are server ordered lists (services/api /v1/home). Featured is a team pick, never paid.
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, View, type ViewToken } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api, type Promo } from '@/lib/api';
import { nextRound } from '@/lib/fair-queue';
import { lang, t } from '@/lib/i18n';
import { C } from '@/lib/theme';
import { useViewerState } from '@/lib/viewer-state';
import { Button } from '@/ui/Pill';
import { Icon } from '@/ui/Icon';
import { PromoReel } from '@/ui/PromoReel';

type Item = { key: string; promo: Promo };
// On web, NativeTabs draws the app menu as a floating bar at the top; keep the home tabs below it.
const WEB_MENU = Platform.OS === 'web' ? 64 : 0;
// On iOS the native tab bar floats over the screen (about 49 pt plus the home indicator), so the call bar
// and buttons are lifted above it. Android's bottom navigation sits below the content.
const TAB_BAR = Platform.OS === 'ios' ? 49 : 0;
type Tab = 'for_you' | 'new' | 'top' | 'featured';

const TABS: { id: Tab; label: Parameters<typeof t>[0] }[] = [
  { id: 'for_you', label: 'home_for_you' },
  { id: 'new', label: 'home_new' },
  { id: 'top', label: 'home_top' },
  { id: 'featured', label: 'home_featured' },
];
const EMPTY: Record<Tab, Parameters<typeof t>[0]> = { for_you: 'new_empty', new: 'new_empty', top: 'top_empty', featured: 'featured_empty' };

export default function Feed() {
  const { v } = useLocalSearchParams<{ v?: string }>();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('for_you');
  const [all, setAll] = useState<Promo[] | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState(false);
  const [height, setHeight] = useState(0);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [focused, setFocused] = useState(true);
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
  const blocked = useViewerState().blocked;
  const bottomInset = TAB_BAR ? TAB_BAR + insets.bottom : 0;
  const seen = useRef<Record<string, number>>({});
  const round = useRef(0);

  const append = useCallback((pool: Promo[], first?: Promo) => {
    setItems((prev) => {
      const last = prev[prev.length - 1]?.promo.creator.handle;
      let next = nextRound(pool, seen.current, lang, last);
      if (first) next = [first, ...next.filter((p) => p.id !== first.id)];
      round.current += 1;
      return [...prev, ...next.map((p) => ({ key: `${round.current}-${p.id}`, promo: p }))];
    });
  }, []);

  // Loads the selected tab. For you builds the first fair round; a deep link (?v=slug) plays first.
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = tab === 'for_you' ? api.feed() : api.home(tab);
    load.then(({ promos }) => {
      if (!alive) return;
      setAll(promos);
      setItems([]);
      setActive(0);
      if (tab === 'for_you') append(promos, promos.find((p) => p.slug === v || p.id === v));
      else setItems(promos.map((p) => ({ key: `${tab}-${p.id}`, promo: p })));
    }).catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [append, v, attempt, tab]);

  // Resets the list right away so the old tab never flashes while the new one loads.
  const selectTab = (next: Tab) => {
    if (next === tab) return;
    setAll(null);
    setItems([]);
    setActive(0);
    setTab(next);
  };

  const onViewable = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems.find((x) => x.isViewable);
    if (first?.index != null) setActive(first.index);
  }, []);

  const onSeen = useCallback((id: string) => { seen.current[id] = (seen.current[id] || 0) + 1; }, []);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.msg}>{t('error')}</Text>
        <View style={{ width: 200, marginTop: 16 }}><Button label={t('retry')} onPress={() => { setError(false); setAttempt((n) => n + 1); }} /></View>
      </View>
    );
  }
  return (
    <View style={styles.root} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      {!all || !height ? (
        <View style={styles.center}><ActivityIndicator color={C.lime} /></View>
      ) : !items.length ? (
        <View style={styles.center}><Text style={styles.msg}>{t(EMPTY[tab])}</Text></View>
      ) : (
        <FlatList
          key={`${tab}-${v || 'feed'}`}
          data={blocked.length ? items.filter((i) => !blocked.includes(i.promo.creator.handle)) : items}
          keyExtractor={(i) => i.key}
          renderItem={({ item, index }) => (
            <PromoReel promo={item.promo} active={focused && index === active} height={height} muted={muted} onSeen={onSeen} bottomInset={bottomInset} />
          )}
          pagingEnabled
          snapToInterval={height}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          onEndReached={() => tab === 'for_you' && all && append(all)}
          onEndReachedThreshold={2}
          windowSize={3}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
        />
      )}
      <View style={[styles.top, { paddingTop: insets.top + 6 + WEB_MENU }]} pointerEvents="box-none">
        <View style={styles.bar} pointerEvents="box-none">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs} accessibilityRole="tablist">
            {TABS.map((x) => {
              const on = x.id === tab;
              return (
                <Pressable
                  key={x.id}
                  onPress={() => selectTab(x.id)}
                  style={styles.tab}
                  hitSlop={6}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[styles.tabText, on && styles.tabOn]}>{t(x.label)}</Text>
                  <View style={[styles.dot, on && styles.dotOn]} />
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable onPress={() => setMuted(!muted)} style={styles.sound} accessibilityRole="button" accessibilityLabel={muted ? 'Sound on' : 'Sound off'}>
            <Icon name={muted ? 'mute' : 'sound'} size={20} />
          </Pressable>
        </View>
        {tab === 'featured' && items.length > 0 && <Text style={styles.note}>{t('featured_note')}</Text>}
      </View>
    </View>
  );
}

const shadow = { textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4 } as const;
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg, padding: 32 },
  msg: { color: C.text2, fontSize: 16, lineHeight: 23, textAlign: 'center', maxWidth: 320 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 12 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tabs: { gap: 18, paddingHorizontal: 4, alignItems: 'center' },
  tab: { alignItems: 'center', paddingVertical: 6 },
  tabText: { color: 'rgba(255,255,255,0.68)', fontSize: 16, fontWeight: '600', ...shadow },
  tabOn: { color: '#fff', fontWeight: '800' },
  dot: { marginTop: 5, width: 18, height: 3, borderRadius: 2, backgroundColor: 'transparent' },
  dotOn: { backgroundColor: C.lime },
  sound: { marginLeft: 'auto', width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(20,20,31,0.72)', alignItems: 'center', justifyContent: 'center' },
  note: { marginTop: 2, marginLeft: 4, color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600', ...shadow },
});
