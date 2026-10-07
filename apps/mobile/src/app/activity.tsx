// Activity (founder request 2026-10-07): call results and new promos from followed creators for scouts,
// weekly totals for creators (never who followed or saved). Opened from the bell on the profile.
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api, type ActivityItem } from '@/lib/api';
import { lang, outcomeText, t } from '@/lib/i18n';
import { ACTIVITY_SEEN, setLocal } from '@/lib/store';
import { C, F, themed } from '@/lib/theme';
import { Icon } from '@/ui/Icon';
import { Button } from '@/ui/Pill';

function ago(iso: string) {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return t('ago_m').replace('{n}', String(m));
  if (m < 1440) return t('ago_h').replace('{n}', String(Math.round(m / 60)));
  if (m < 7 * 1440) return t('ago_d').replace('{n}', String(Math.round(m / 1440)));
  return new Date(iso).toLocaleDateString(lang, { day: 'numeric', month: 'short' });
}

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const [error, setError] = useState(false);
  const load = useCallback(() => {
    setError(false);
    api.activity().then((r) => {
      setItems(r.items);
      setLocal(ACTIVITY_SEEN, new Date().toISOString());
    }).catch(() => setError(true));
  }, []);
  useFocusEffect(load);

  const row = ({ item }: { item: ActivityItem }) => {
    if ('n' in item) {
      const key = item.kind === 'week_followers' ? 'act_week_followers' : item.kind === 'week_saves' ? 'act_week_saves' : 'act_week_calls';
      return (
        <View style={styles.row}>
          <View style={styles.badge}><Icon name={item.kind === 'week_saves' ? 'saved' : item.kind === 'week_calls' ? 'chevrons' : 'bell'} size={20} color={C.accent} /></View>
          <Text style={[styles.text, { flex: 1 }]}>{t(key).replace('{n}', String(item.n))}</Text>
        </View>
      );
    }
    const pr = item.promo;
    const won = item.kind === 'result' && item.outcome === 'correct';
    const line = item.kind === 'result'
      ? `${t('act_result').replace('{title}', pr.title)} ${outcomeText(item.outcome, item.points, '', undefined) || ''}`
      : t('act_new_promo').replace('{name}', pr.creator.name).replace('{title}', pr.title);
    return (
      <Pressable onPress={() => router.push({ pathname: '/play/[handle]', params: { handle: pr.creator.handle, start: pr.slug } })}
        style={[styles.row, won && { borderColor: C.lime }]} accessibilityRole="button" accessibilityLabel={`${line}. ${ago(item.at)}`}>
        {pr.video.poster ? <Image source={{ uri: pr.video.poster }} style={styles.thumb} contentFit="cover" /> : <View style={styles.thumb} />}
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.text} numberOfLines={3}>{line}</Text>
          <Text style={styles.small}>{ago(item.at)}</Text>
        </View>
        {won && item.points > 0 ? <Text style={styles.points}>+{item.points}</Text> : null}
      </Pressable>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: Platform.OS === 'ios' ? 12 : insets.top + 8 }]}>
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel={t('back')} hitSlop={6}>
          <Icon name="back" size={20} color={C.text} />
        </Pressable>
        <Text style={styles.h1} accessibilityRole="header">{t('activity')}</Text>
      </View>
      {error ? (
        <View style={styles.center}><Text style={styles.text}>{t('error')}</Text><View style={{ width: 200, marginTop: 16 }}><Button label={t('retry')} onPress={load} /></View></View>
      ) : !items ? (
        <View style={styles.center}><ActivityIndicator color={C.accent} /></View>
      ) : (
        <FlatList data={items} keyExtractor={(i, n) => `${i.kind}-${'promo' in i ? i.promo.id : n}`} renderItem={row}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 40 }}
          ListEmptyComponent={<Text style={[styles.text, { textAlign: 'center', marginTop: 40 }]}>{t('act_empty')}</Text>} />
      )}
    </View>
  );
}

const styles = themed(() => ({
  root: { flex: 1, backgroundColor: C.bg },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  h1: { color: C.text, fontSize: 24, ...F.display },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface },
  thumb: { width: 48, height: 72, borderRadius: 8, backgroundColor: C.surface2 },
  badge: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface2 },
  text: { color: C.text, fontSize: 15, lineHeight: 21 },
  small: { color: C.muted, fontSize: 12 },
  points: { color: C.accent, fontSize: 22, ...F.display },
}));
