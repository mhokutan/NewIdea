// "Right call" reveal: when calls resolved since the last visit, the feed greets the scout once with the result,
// in the shape of the call ticket (the variable reward of the loop). Counts are kept on the device only.
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, Share, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api, type ScoutSummary } from '@/lib/api';
import { outcomeText, t } from '@/lib/i18n';
import { getLocal, setLocal } from '@/lib/store';
import { C, F, R, themed } from '@/lib/theme';
import { useMe } from '@/lib/use-me';
import { useViewerState, viewerStateLoaded } from '@/lib/viewer-state';
import { Icon } from './Icon';
import { Button } from './Pill';

const KEY = 'pv_results_seen';
type Seen = { right: number; total: number };
type Result = ScoutSummary['results'][number];

export function ResultReveal({ enabled }: { enabled: boolean }) {
  const insets = useSafeAreaInsets();
  const { me } = useMe();
  const vs = useViewerState();
  const [news, setNews] = useState<{ right: number; total: number; top: Result | null } | null>(null);
  const next = useRef<(() => void) | null>(null);
  const calls = Object.values(vs.calls);
  const total = calls.filter((c) => c.outcome && c.outcome !== 'pending').length;
  const right = calls.filter((c) => c.outcome === 'correct').length;
  const handle = me?.profile?.handle;
  const loaded = viewerStateLoaded();

  useEffect(() => {
    if (!enabled || !handle || !loaded) return;
    let alive = true;
    getLocal(`${KEY}:${handle}`).then(async (raw) => {
      if (!alive) return;
      const seen = (() => { try { return raw ? (JSON.parse(raw) as Seen) : null; } catch { return null; } })();
      // First time on this device: remember where we are (zero for a new scout), so the next result is revealed.
      if (!seen) { setLocal(`${KEY}:${handle}`, JSON.stringify({ right, total })); return; }
      if (total <= seen.total) return;
      const fresh = total - seen.total;
      const summary = await api.scout().catch(() => null);
      if (!alive) return;
      const recent = (summary?.results || []).slice(0, fresh);
      setNews({ right: Math.max(0, right - seen.right), total: fresh, top: recent.find((r) => r.outcome === 'correct') || recent[0] || null });
    });
    return () => { alive = false; };
  }, [enabled, handle, loaded, total, right]);

  const close = (then?: () => void) => {
    if (handle) setLocal(`${KEY}:${handle}`, JSON.stringify({ right, total }));
    next.current = then || null;
    setNews(null);
  };
  const dismissed = () => { const n = next.current; next.current = null; n?.(); };
  // Android and web have no onDismiss: run the next step as soon as the sheet hides.
  const open = !!news;
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open && Platform.OS !== 'ios') dismissed();
    wasOpen.current = open;
  });
  const share = () => {
    const top = news?.top;
    if (!top) return;
    const url = `https://promovote.com/?v=${top.promo.slug}`;
    const message = t('reveal_share').replace('{title}', top.promo.title);
    Share.share(Platform.OS === 'ios' ? { message, url } : { message: `${message} ${url}` }).catch(() => {});
  };

  const top = news?.top;
  const won = top?.outcome === 'correct';
  const title = news?.right ? t('reveal_right_t').replace('{n}', String(news.right)) : t('reveal_t');
  return (
    <Modal visible={!!news} transparent animationType="slide" onRequestClose={() => close()} statusBarTranslucent
      onDismiss={Platform.OS === 'ios' ? dismissed : undefined}
      onShow={() => { api.event('reveal_view'); }}>
      <Pressable style={styles.backdrop} onPress={() => close()} accessibilityRole="button" accessibilityLabel={t('close')} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} accessibilityViewIsModal>
        <View style={styles.grab} />
        <Text style={styles.title} accessibilityRole="header">{title}</Text>
        {top ? (
          <View style={[styles.ticket, won && styles.ticketWin]}>
            {top.promo.video.poster ? <Image source={{ uri: top.promo.video.poster }} style={styles.thumb} contentFit="cover" /> : <View style={styles.thumb} />}
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.small} numberOfLines={1}>{top.promo.creator.name}</Text>
              <Text style={styles.promo} numberOfLines={2}>{top.promo.title}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name={top.choice === 'will_blow_up' ? 'chevrons' : 'down'} size={14} color={won ? C.lime : C.text2} />
                <Text style={styles.small}>{t(top.choice)}</Text>
              </View>
            </View>
            {won && top.points > 0 ? <Text style={styles.points}>+{top.points}</Text> : null}
          </View>
        ) : null}
        <Text style={styles.text}>{top ? outcomeText(top.outcome, top.points, '', undefined) : (news?.right ? t('reveal_right_p') : t('reveal_p')).replace('{n}', String(news?.total ?? 0))}</Text>
        {news && news.total > 1 ? <Text style={styles.small}>{t('reveal_more').replace('{n}', String(news.total))}</Text> : null}
        <View style={{ gap: 10, marginTop: 6 }}>
          <Button label={t('reveal_see')} onPress={() => close(() => router.navigate('/me'))} />
          {won ? <Button label={t('share')} ghost onPress={share} /> : null}
          <Button label={t('not_now')} ghost onPress={() => close()} />
        </View>
      </View>
    </Modal>
  );
}

const styles = themed(() => ({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg, paddingHorizontal: 20, paddingTop: 10, gap: 12 },
  grab: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: C.line },
  title: { color: C.text, fontSize: 24, ...F.display },
  ticket: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.line, backgroundColor: C.surface2 },
  ticketWin: { borderColor: C.lime },
  thumb: { width: 56, height: 84, borderRadius: 10, backgroundColor: C.bg },
  promo: { color: C.text, fontSize: 16, ...F.displayBold },
  points: { color: C.accent, fontSize: 30, ...F.display },
  small: { color: C.muted, fontSize: 13 },
  text: { color: C.text2, fontSize: 15, lineHeight: 21 },
}));
