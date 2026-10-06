// Home feed: endless vertical promos with the same fair rotation as the website.
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, type ViewToken } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api, type Promo } from '@/lib/api';
import { nextRound } from '@/lib/fair-queue';
import { lang, t } from '@/lib/i18n';
import { C } from '@/lib/theme';
import { Button } from '@/ui/Pill';
import { Icon } from '@/ui/Icon';
import { PromoReel } from '@/ui/PromoReel';

type Item = { key: string; promo: Promo };

export default function Feed() {
  const { v } = useLocalSearchParams<{ v?: string }>();
  const insets = useSafeAreaInsets();
  const [all, setAll] = useState<Promo[] | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState(false);
  const [height, setHeight] = useState(0);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
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

  // Loads live promos, then builds the first fair round. A deep link (?v=slug) plays first.
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    api.feed().then(({ promos }) => {
      if (!alive) return;
      setAll(promos);
      setItems([]);
      setActive(0);
      append(promos, promos.find((p) => p.slug === v || p.id === v));
    }).catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [append, v, attempt]);

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
      ) : (
        <FlatList
          key={v || 'feed'}
          data={items}
          keyExtractor={(i) => i.key}
          renderItem={({ item, index }) => (
            <PromoReel promo={item.promo} active={index === active} height={height} muted={muted} onSeen={onSeen} />
          )}
          pagingEnabled
          snapToInterval={height}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          onEndReached={() => all && append(all)}
          onEndReachedThreshold={2}
          windowSize={3}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          removeClippedSubviews
        />
      )}
      <View style={[styles.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <Text style={styles.logo} accessibilityRole="header">PromoVote</Text>
        <Pressable onPress={() => setMuted(!muted)} style={styles.sound} accessibilityRole="button" accessibilityLabel={muted ? 'Sound on' : 'Sound off'}>
          <Icon name={muted ? 'mute' : 'sound'} size={20} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg, padding: 24 },
  msg: { color: C.text2, fontSize: 16, textAlign: 'center' },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
  logo: { color: '#fff', fontWeight: '800', fontSize: 20, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4 },
  sound: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(20,20,31,0.72)', alignItems: 'center', justifyContent: 'center' },
});
