// Explore in app style (docs/04 section 2.1): search, creator circles, category pills,
// hashtags and a two column masonry grid. Tapping a tile opens it in the feed.
import { Image } from 'expo-image';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api, type Creator, type Promo } from '@/lib/api';
import { EXPLORE_CATEGORIES } from '@/lib/categories';
import { t } from '@/lib/i18n';
import { C, F, themed } from '@/lib/theme';
import { Avatar } from '@/ui/Avatar';
import { Icon } from '@/ui/Icon';
import { Pill } from '@/ui/Pill';
import { Fade } from '@/ui/Fade';

const CATS = [{ id: 'all', label: 'all' as const }, ...EXPLORE_CATEGORIES];

export default function Explore() {
  const params = useLocalSearchParams<{ tag?: string; cat?: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>(params.cat || 'all');
  const [tag, setTag] = useState<string>(params.tag || '');
  const [promos, setPromos] = useState<Promo[] | null>(null);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [charts, setCharts] = useState<{ promos: Promo[]; progress?: { scouts: number; goal: number } } | null>(null);

  // A hashtag tapped in the feed arrives as a route param; adopt it when it changes.
  const [paramTag, setParamTag] = useState(params.tag);
  if (params.tag !== paramTag) { setParamTag(params.tag); setTag(params.tag || ''); }
  useEffect(() => { api.home('top').then(setCharts).catch(() => {}); }, []);
  useEffect(() => {
    api.hashtags().then((r) => setTags(r.hashtags.map((h) => h.tag))).catch(() => {});
  }, []);
  useEffect(() => {
    api.creators(cat === 'all' ? undefined : cat).then((r) => setCreators(r.creators)).catch(() => {});
  }, [cat]);
  useEffect(() => {
    const id = setTimeout(() => {
      api.explore({ q, cat: cat === 'all' ? '' : cat, tag }).then((r) => setPromos(r.promos)).catch(() => setPromos([]));
    }, 200);
    return () => clearTimeout(id);
  }, [q, cat, tag]);

  // Two columns, every third tile in a column is tall, so the grid feels like Instagram Explore.
  const colW = (width - 16 * 2 - 8) / 2;
  const columns = useMemo(() => {
    const cols: { p: Promo; h: number }[][] = [[], []];
    const heights = [0, 0];
    (promos || []).forEach((p, i) => {
      const c = heights[0] <= heights[1] ? 0 : 1;
      const h = (i % 3 === 0 ? 1.78 : 1.25) * colW;
      cols[c].push({ p, h });
      heights[c] += h + 8;
    });
    return cols;
  }, [promos, colW]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <View style={styles.pad}>
        <View style={styles.search}>
          <Icon name="search" size={18} color={C.muted} />
          <TextInput value={q} onChangeText={setQ} placeholder={t('search')} placeholderTextColor={C.muted} style={styles.input}
            returnKeyType="search" autoCorrect={false} autoCapitalize="none" accessibilityLabel={t('search')} />
        </View>
      </View>

      {/* Charts: real ranks only. Until enough scouts call promos this week, an honest progress card. */}
      <View style={[styles.pad, { marginTop: 14 }]}>
        <View style={styles.charts}>
          <Text style={styles.h2}>{t('home_top')}</Text>
          {charts && charts.promos.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, marginTop: 10 }}>
              {charts.promos.slice(0, 10).map((p, i) => (
                <Pressable key={p.id} onPress={() => router.push({ pathname: '/play/[handle]', params: { handle: p.creator.handle, start: p.slug } })} style={styles.rank} accessibilityRole="button" accessibilityLabel={`${i + 1}. ${p.title}`}>
                  <Text style={styles.rankNo}>{i + 1}</Text>
                  <Text style={styles.rankTitle} numberOfLines={2}>{p.title}</Text>
                  {p.creator.founderOwned ? <Text style={styles.rankFounder} numberOfLines={1}>{t('founder_made')}</Text> : null}
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <>
              <Text style={styles.chartsText}>{t('charts_progress').replace('{goal}', String(charts?.progress?.goal ?? 50)).replace('{n}', String(charts?.progress?.scouts ?? 0))}</Text>
              <View style={styles.bar}><View style={[styles.barFill, { width: `${Math.min(100, Math.round(100 * (charts?.progress?.scouts ?? 0) / (charts?.progress?.goal ?? 50)))}%` }]} /></View>
              <Text style={[styles.chartsText, { fontSize: 13 }]}>{t('charts_soon')}</Text>
            </>
          )}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {creators.map((c) => (
          <Link key={c.handle} href={`/creator/${c.handle}`} asChild>
            <Pressable style={styles.story} accessibilityRole="link" accessibilityLabel={c.name}>
              <Avatar uri={c.avatar} mono={c.mono} size={64} radius={18} />
              <Text style={styles.storyName} numberOfLines={1}>{c.name}</Text>
            </Pressable>
          </Link>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {CATS.map((k) => <Pill key={k.id} label={t(k.label)} active={cat === k.id} onPress={() => setCat(k.id)} />)}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.row, { paddingTop: 0 }]}>
        {tags.map((k) => (
          <Pressable key={k} onPress={() => setTag(tag === k ? '' : k)} style={[styles.tag, tag === k && styles.tagOn]} accessibilityRole="button" accessibilityState={{ selected: tag === k }}>
            <Text style={[styles.tagText, tag === k && { color: C.ink }]}>#{k}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={[styles.pad, styles.grid]}>
        {promos === null ? <ActivityIndicator color={C.accent} style={{ marginTop: 40, flex: 1 }} /> : promos.length === 0 ? (
          <Text style={styles.empty}>{t('nothing')}</Text>
        ) : columns.map((col, ci) => (
          <View key={ci} style={{ width: colW, gap: 8 }}>
            {col.map(({ p, h }) => (
              <Pressable key={p.id} onPress={() => router.push({ pathname: '/play/[handle]', params: { handle: p.creator.handle, start: p.slug } })} style={[styles.tile, { height: h }]} accessibilityRole="button" accessibilityLabel={p.title}>
                {p.video.poster ? <Image source={{ uri: p.video.poster }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} /> : null}
                <Fade colors={['rgba(6,6,10,0)', 'rgba(6,6,10,0)', 'rgba(6,6,10,0.92)']} locations={[0, 0.45, 1]} style={styles.tileShade} />
                <Text style={styles.tileWho} numberOfLines={1}>{p.creator.name}</Text>
                <Text style={styles.tileTitle} numberOfLines={2}>{p.title}</Text>
              </Pressable>
            ))}
          </View>
        ))}
      </View>

    </ScrollView>
  );
}

const styles = themed(() => ({
  pad: { paddingHorizontal: 16 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface, borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: C.line },
  input: { flex: 1, color: C.text, fontSize: 16, paddingVertical: 13 },
  row: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4, gap: 8 },
  story: { width: 76, alignItems: 'center', gap: 6 },
  storyName: { color: C.text2, fontSize: 12, fontWeight: '600' },
  tag: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  tagOn: { backgroundColor: C.lime, borderColor: C.lime },
  tagText: { color: C.text2, fontWeight: '600', fontSize: 14 },
  grid: { flexDirection: 'row', gap: 8, marginTop: 14 },
  empty: { color: C.text2, paddingVertical: 28 },
  tile: { borderRadius: 14, overflow: 'hidden', backgroundColor: C.surface, justifyContent: 'flex-end', padding: 10 },
  tileShade: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  tileWho: { color: C.text2, fontSize: 12, fontWeight: '600' },
  tileTitle: { color: '#fff', fontSize: 14, fontWeight: '700', marginTop: 2 },
  charts: { padding: 16, borderRadius: 18, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  bar: { height: 6, borderRadius: 3, backgroundColor: C.line, marginTop: 10, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: C.lime },
  rank: { width: 150, padding: 12, borderRadius: 14, backgroundColor: C.surface2, gap: 4 },
  rankNo: { color: C.accent, fontSize: 22, ...F.display },
  rankFounder: { color: C.muted, fontSize: 11, marginTop: 2 },
  rankTitle: { color: C.text, fontSize: 14, fontWeight: '700' },
  h2: { color: C.text, fontSize: 20, ...F.display },
  chartsText: { color: C.text2, fontSize: 15, marginTop: 6 },
}));
