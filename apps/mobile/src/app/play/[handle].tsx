// One creator's promos as a vertical player (opened from the creator page grid). iOS edge back works as usual.
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, type ViewToken } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setStatusBarStyle } from 'expo-status-bar';

import { api, type Promo } from '@/lib/api';
import { t } from '@/lib/i18n';
import { D, theme } from '@/lib/theme';
import { Icon } from '@/ui/Icon';
import { PromoReel } from '@/ui/PromoReel';
import { Fade } from '@/ui/Fade';

export default function CreatorPlayer() {
  const { handle, start } = useLocalSearchParams<{ handle: string; start?: string }>();
  const insets = useSafeAreaInsets();
  const [promos, setPromos] = useState<Promo[] | null>(null);
  const [name, setName] = useState('');
  const [height, setHeight] = useState(0);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  useFocusEffect(useCallback(() => { setStatusBarStyle('light'); return () => setStatusBarStyle(theme.scheme === 'light' ? 'dark' : 'light'); }, []));

  useEffect(() => {
    let alive = true;
    api.profile(handle).then((r) => {
      if (!alive) return;
      const list = r.profile.promos || [];
      const i = Math.max(0, list.findIndex((p) => p.slug === start || p.id === start));
      setName(r.profile.name);
      setPromos([...list.slice(i), ...list.slice(0, i)]);
    }).catch(() => { if (alive) setPromos([]); });
    return () => { alive = false; };
  }, [handle, start]);

  const onViewable = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems.find((x) => x.isViewable);
    if (first?.index != null) setActive(first.index);
  }, []);
  const onSeen = useCallback(() => {}, []);

  return (
    <View style={styles.root} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      {!promos || !height ? <View style={styles.center}><ActivityIndicator color={D.lime} /></View> : !promos.length ? (
        <View style={styles.center}><Text style={styles.msg}>{t('no_promos')}</Text></View>
      ) : (
        <FlatList
          data={promos}
          keyExtractor={(p) => p.id}
          renderItem={({ item, index }) => <PromoReel promo={item} active={index === active} height={height} muted={muted} onSeen={onSeen} bottomInset={insets.bottom} />}
          pagingEnabled
          snapToInterval={height}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          windowSize={3}
          initialNumToRender={2}
        />
      )}
      <Fade colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0)']} style={[styles.scrim, { height: insets.top + 90 }]} />
      <View style={[styles.top, { top: insets.top + 6 }]}>
        <Pressable onPress={() => router.back()} style={styles.round} accessibilityRole="button" accessibilityLabel={t('back')}><Icon name="back" size={20} /></Pressable>
        <Text style={styles.title} numberOfLines={1} maxFontSizeMultiplier={1.3}>{name}{promos?.length ? `  ·  ${active + 1} / ${promos.length}` : ''}</Text>
        <Pressable onPress={() => setMuted(!muted)} style={styles.round} accessibilityRole="button" accessibilityLabel={muted ? t('sound_on') : t('sound_off')}>
          <Icon name={muted ? 'mute' : 'sound'} size={20} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: D.bg },
  msg: { color: D.text2, fontSize: 16 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0 },
  top: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(20,20,31,0.72)', alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4 },
});
