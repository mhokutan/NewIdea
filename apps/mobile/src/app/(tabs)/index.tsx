// Home feed: vertical promos with tabs (founder decision 2026-10-07).
// Today's Drop: the same 7 promos for everyone today, a progress counter and an end card, then optional
// "keep watching" into the fair rotation (same rules as the website). New and Team picks are server lists.
// Team picks are chosen by the PromoVote team and never paid. Charts live in Explore.
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ActivityIndicator, FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, View, type ViewToken } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api, type Promo } from '@/lib/api';
import { nextRound } from '@/lib/fair-queue';
import { lang, t } from '@/lib/i18n';
import { C, F } from '@/lib/theme';
import { reminderOn, turnOnReminder } from '@/lib/reminder';
import { useMe } from '@/lib/use-me';
import { useViewerState, viewerStateLoaded } from '@/lib/viewer-state';
import { Button } from '@/ui/Pill';
import { Icon } from '@/ui/Icon';
import { PromoReel } from '@/ui/PromoReel';
import { ResultReveal } from '@/ui/ResultReveal';
import { Fade } from '@/ui/Fade';

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
  const { me, loading: meLoading } = useMe();
  const blocked = vs.blocked;
  const callsNow = useRef(vs.calls);
  useEffect(() => { callsNow.current = vs.calls; }, [vs.calls]);
  // -1 = first visit (no calls yet), 0 = nothing new for this scout today, n = new promos in today's drop.
  const [fresh, setFresh] = useState(-1);
  const stateReady = !meLoading && (!me?.profile || viewerStateLoaded());
  const bottomInset = TAB_BAR ? TAB_BAR + insets.bottom : 0;
  const seen = useRef<Record<string, number>>({});
  const interestsRef = useRef<string[]>([]);
  useEffect(() => { interestsRef.current = me?.profile?.interests || []; }, [me]);
  const round = useRef(0);

  const append = useCallback((pool: Promo[], first?: Promo) => {
    setItems((prev) => {
      const last = prev[prev.length - 1]?.promo?.creator.handle;
      let next = nextRound(pool, seen.current, lang, last, interestsRef.current);
      if (first) next = [first, ...next.filter((p) => p.id !== first.id)];
      round.current += 1;
      return [...prev, ...next.map((p) => ({ key: `${round.current}-${p.id}`, promo: p }))];
    });
  }, []);

  // Loads the selected tab. A deep link (?v=slug) plays first.
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    // Signed in: wait for the viewer's calls so "uncalled first" is right on a normal app open.
    if (!stateReady) return;
    let alive = true;
    const load = tab === 'drop'
      ? Promise.all([api.drop(), api.feed()]).then(([d, f]) => {
        // The server sends a pool of up to 21. Returning scouts get the ones they have not called yet first,
        // so tomorrow's drop is not mostly yesterday's promos.
        const uncalled = d.promos.filter((p) => !callsNow.current[p.id]);
        const pick = [...uncalled, ...d.promos.filter((p) => callsNow.current[p.id])].slice(0, d.size || 7);
        setFresh(Object.keys(callsNow.current).length ? Math.min(uncalled.length, d.size || 7) : -1);
        return { drop: pick, pool: f.promos };
      })
      : api.home(tab === 'picks' ? 'featured' : 'new').then((r) => ({ drop: r.promos, pool: r.promos }));
    load.then(({ drop, pool }) => {
      if (!alive) return;
      setAll(pool);
      setActive(0);
      const linked = v ? pool.find((p) => p.slug === v || p.id === v) : undefined;
      const list = linked ? [linked, ...drop.filter((p) => p.id !== linked.id)] : drop;
      const mapped: Item[] = list.map((p) => ({ key: `${tab}-${p.id}`, promo: p }));
      if (tab === 'drop') { api.event('drop_view'); setDropSize(list.length); mapped.push({ key: 'drop-end', end: true }); }
      setItems(mapped);
    }).catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [v, attempt, tab, stateReady]);

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

  // Swipe left on a promo plays the same creator's other promos (founder rule, CLAUDE.md); tabs change by tap.
  // Vertical moves fail the gesture right away, and the screen edges are left to the system back gesture.
  const swipe = Gesture.Pan().runOnJS(true).activeOffsetX([-24, 24]).failOffsetY([-14, 14]).hitSlop({ left: -24, right: -24 }).onEnd((e) => {
    if (!(e.translationX < -60 || e.velocityX < -600)) return;
    const item = items.filter((x) => !x.promo || !blocked.includes(x.promo.creator.handle))[active];
    if (!item?.promo) return;
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
    router.push({ pathname: '/play/[handle]', params: { handle: item.promo.creator.handle, start: item.promo.slug } });
  });

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
    <GestureDetector gesture={swipe}>
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
            <EndCard height={height} calls={dropCalls} size={dropSize} guest={!me} onMore={keepWatching} onExplore={() => router.navigate('/explore')} />
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
      <ResultReveal enabled={focused} />
      <Fade colors={['rgba(0,0,0,0.82)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0)']} locations={[0, 0.55, 1]} style={[styles.scrim, { height: insets.top + WEB_MENU + 150 }]} />
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
                  <Text style={[styles.tabText, on && styles.tabOn]} maxFontSizeMultiplier={1.3}>{t(x.label)}</Text>
                  <View style={[styles.dot, on && styles.dotOn]} />
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable onPress={() => setMuted(!muted)} style={styles.sound} accessibilityRole="button" accessibilityLabel={muted ? t('sound_on') : t('sound_off')}>
            <Icon name={muted ? 'mute' : 'sound'} size={20} />
          </Pressable>
        </View>
        {tab === 'picks' && items.length > 0 && active === 0 ? <Text style={styles.note} maxFontSizeMultiplier={1.3}>{t('featured_note')}</Text> : null}
        {tab === 'drop' && fresh > 0 && active === 0 ? <Text style={styles.note} maxFontSizeMultiplier={1.3}>{t('drop_fresh').replace('{n}', String(fresh))}</Text> : null}
        {tab === 'drop' && fresh === 0 && active === 0 ? <Text style={styles.note} maxFontSizeMultiplier={1.3}>{t('drop_nothing_new')}</Text> : null}
        {tab === 'drop' && dropSize > 0 && active < dropSize ? (
          <View style={styles.progress} accessibilityLabel={`${active + 1} / ${dropSize}`}>
            {Array.from({ length: dropSize }, (_, i) => <View key={i} style={[styles.seg, i <= active && styles.segOn]} />)}
          </View>
        ) : null}
      </View>
    </View>
    </GestureDetector>
  );
}

// Shown after the 7th promo of Today's Drop: a finite day, results in 7 days, then optional endless watching.
function EndCard({ height, calls, size, guest, onMore, onExplore }: {
  height: number; calls: number; size: number; guest: boolean; onMore: () => void; onExplore: () => void;
}) {
  useEffect(() => { api.event('drop_complete'); }, []);
  // After a finished drop (signed in), offer the daily reminder once. Local notification only.
  const [remind, setRemind] = useState<'hidden' | 'offer' | 'on' | 'denied'>('hidden');
  useEffect(() => {
    if (guest || Platform.OS === 'web') return;
    let alive = true;
    reminderOn().then((on) => { if (alive && !on) setRemind('offer'); });
    return () => { alive = false; };
  }, [guest]);
  const line = guest ? t('drop_done_guest') : calls ? t('drop_done_calls').replace('{n}', String(calls)).replace('{size}', String(size)) : t('drop_done_zero');
  return (
    <View style={[styles.end, { height }]}>
      <Icon name="chevrons" size={44} color={C.lime} />
      <Text style={styles.endTitle} accessibilityRole="header">{t('drop_done_t')}</Text>
      <Text style={styles.endText}>{line}</Text>
      {!guest && calls ? <Text style={styles.endText}>{t('drop_done_p')}</Text> : null}
      <View style={{ width: '100%', maxWidth: 320, gap: 10, marginTop: 18 }}>
        {guest ? <Button label={t('sign_in')} onPress={() => router.push('/sign-in')} /> : null}
        {remind === 'offer' ? <Button label={t('remind_me')} onPress={() => turnOnReminder().then((ok) => { setRemind(ok ? 'on' : 'denied'); if (ok) api.event('reminder_on'); })} /> : null}
        {remind === 'on' ? <Text style={styles.endText}>{t('remind_on')}</Text> : null}
        {remind === 'denied' ? <Text style={styles.endText}>{t('remind_denied')}</Text> : null}
        <Button label={t('keep_watching')} ghost={guest || remind === 'offer'} onPress={onMore} />
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
  tabText: { color: 'rgba(255,255,255,0.85)', fontSize: 16, fontWeight: '600', ...shadow },
  tabOn: { color: '#fff', fontWeight: '800' },
  dot: { marginTop: 5, width: 18, height: 3, borderRadius: 2, backgroundColor: 'transparent' },
  dotOn: { backgroundColor: C.lime },
  sound: { marginLeft: 'auto', width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(20,20,31,0.72)', alignItems: 'center', justifyContent: 'center' },
  progress: { flexDirection: 'row', gap: 4, marginTop: 6, paddingHorizontal: 4 },
  seg: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.28)' },
  segOn: { backgroundColor: C.lime },
  end: { alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg, padding: 32, gap: 8 },
  endTitle: { color: C.text, fontSize: 28, ...F.display, textAlign: 'center', marginTop: 8 },
  endText: { color: C.text2, fontSize: 16, lineHeight: 23, textAlign: 'center', maxWidth: 320 },
  note: { alignSelf: 'flex-start', marginTop: 8, marginLeft: 4, maxWidth: 320, color: '#fff', fontSize: 12, fontWeight: '600', backgroundColor: 'rgba(10,10,15,0.78)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, overflow: 'hidden' },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0 },
});
