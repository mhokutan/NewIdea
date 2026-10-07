// Home feed: vertical promos with tabs (founder decision 2026-10-07).
// Today's Drop: the same 7 promos for everyone today, a progress counter and an end card, then optional
// "keep watching" into the fair rotation (same rules as the website). New and Team picks are server lists.
// Team picks are chosen by the PromoVote team and never paid. Charts live in Explore.
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
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

type Item = { key: string; promo: Promo; end?: false } | { key: string; end: true; promo?: undefined };
// On web, NativeTabs draws the app menu as a floating bar at the top; keep the home tabs below it.
const WEB_MENU = Platform.OS === 'web' ? 64 : 0;
// On iOS the native tab bar floats over the screen (about 49 pt plus the home indicator), so the call bar
// and buttons are lifted above it. Android's bottom navigation sits below the content.
const TAB_BAR = Platform.OS === 'ios' ? 49 : 0;
type Tab = 'drop' | 'new' | 'picks';

const TABS: { id: Tab; label: Parameters<typeof t>[0] }[] = [
  { id: 'drop', label: 'home_drop' },
  { id: 'new', label: 'home_new' },
  { id: 'picks', label: 'home_picks' },
];
const EMPTY: Record<Tab, Parameters<typeof t>[0]> = { drop: 'new_empty', new: 'new_empty', picks: 'featured_empty' };

export default function Feed() {
  const { v } = useLocalSearchParams<{ v?: string }>();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('drop');
  const [dropSize, setDropSize] = useState(0);
  const [all, setAll] = useState<Promo[] | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState(false);
  const [height, setHeight] = useState(0);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [focused, setFocused] = useState(true);
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
  const vs = useViewerState();
  const blocked = vs.blocked;
  const bottomInset = TAB_BAR ? TAB_BAR + insets.bottom : 0;
  const seen = useRef<Record<string, number>>({});
  const round = useRef(0);

  const append = useCallback((pool: Promo[], first?: Promo) => {
    setItems((prev) => {
      const last = prev[prev.length - 1]?.promo?.creator.handle;
      let next = nextRound(pool, seen.current, lang, last);
      if (first) next = [first, ...next.filter((p) => p.id !== first.id)];
      round.current += 1;
      return [...prev, ...next.map((p) => ({ key: `${round.current}-${p.id}`, promo: p }))];
    });
  }, []);

  // Loads the selected tab. A deep link (?v=slug) plays first.
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = tab === 'drop'
      ? Promise.all([api.drop(), api.feed()]).then(([d, f]) => ({ drop: d.promos, pool: f.promos }))
      : api.home(tab === 'picks' ? 'featured' : 'new').then((r) => ({ drop: r.promos, pool: r.promos }));
    load.then(({ drop, pool }) => {
      if (!alive) return;
      setAll(pool);
      setActive(0);
      const linked = v ? pool.find((p) => p.slug === v || p.id === v) : undefined;
      const list = linked ? [linked, ...drop.filter((p) => p.id !== linked.id)] : drop;
      const mapped: Item[] = list.map((p) => ({ key: `${tab}-${p.id}`, promo: p }));
      if (tab === 'drop') { setDropSize(list.length); mapped.push({ key: 'drop-end', end: true }); }
      setItems(mapped);
    }).catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [v, attempt, tab]);

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

  const keepWatching = () => { if (all) append(all); };
  const dropCalls = items.filter((i) => i.promo && vs.calls[i.promo.id]).length;

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
          data={blocked.length ? items.filter((i) => !i.promo || !blocked.includes(i.promo.creator.handle)) : items}
          keyExtractor={(i) => i.key}
          renderItem={({ item, index }) => item.end ? (
            <EndCard height={height} calls={dropCalls} size={dropSize} onMore={keepWatching} onExplore={() => router.navigate('/explore')} />
          ) : (
            <PromoReel promo={item.promo} active={focused && index === active} height={height} muted={muted} onSeen={onSeen} bottomInset={bottomInset} />
          )}
          pagingEnabled
          snapToInterval={height}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          onEndReached={() => { if (tab === 'drop' && items.length > dropSize + 1) keepWatching(); }}
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
        {tab === 'picks' && items.length > 0 && <Text style={styles.note}>{t('featured_note')}</Text>}
        {tab === 'drop' && dropSize > 0 && active < dropSize ? (
          <View style={styles.progress} accessibilityLabel={`${active + 1} / ${dropSize}`}>
            {Array.from({ length: dropSize }, (_, i) => <View key={i} style={[styles.seg, i <= active && styles.segOn]} />)}
          </View>
        ) : null}
      </View>
    </View>
  );
}

// Shown after the 7th promo of Today's Drop: a finite day, results in 7 days, then optional endless watching.
function EndCard({ height, calls, size, onMore, onExplore }: { height: number; calls: number; size: number; onMore: () => void; onExplore: () => void }) {
  return (
    <View style={[styles.end, { height }]}>
      <Icon name="chevrons" size={44} color={C.lime} />
      <Text style={styles.endTitle} accessibilityRole="header">{t('drop_done_t')}</Text>
      <Text style={styles.endText}>{t('drop_done_calls').replace('{n}', String(calls)).replace('{size}', String(size))}</Text>
      <Text style={styles.endText}>{t('drop_done_p')}</Text>
      <View style={{ width: '100%', maxWidth: 320, gap: 10, marginTop: 18 }}>
        <Button label={t('keep_watching')} onPress={onMore} />
        <Button label={t('tab_explore')} ghost onPress={onExplore} />
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
  progress: { flexDirection: 'row', gap: 4, marginTop: 6, paddingHorizontal: 4 },
  seg: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.28)' },
  segOn: { backgroundColor: C.lime },
  end: { alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg, padding: 32, gap: 8 },
  endTitle: { color: C.text, fontSize: 28, fontWeight: '800', textAlign: 'center', marginTop: 8 },
  endText: { color: C.text2, fontSize: 16, lineHeight: 23, textAlign: 'center', maxWidth: 320 },
  note: { marginTop: 2, marginLeft: 4, color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600', ...shadow },
});
