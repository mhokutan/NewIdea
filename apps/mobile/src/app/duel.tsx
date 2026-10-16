// Duel (founder request 2026-10-16): two promos at once, stacked, the viewer picks the one that blows up first.
// 7 duels a session. Picks are just for fun: they never change calls, points, charts or Hit Score,
// and nobody is ever shown that their promo "lost".
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api, type Promo } from '@/lib/api';
import { t } from '@/lib/i18n';
import { D, F, theme } from '@/lib/theme';
import { Icon } from '@/ui/Icon';
import { Button } from '@/ui/Pill';

const ROUNDS = 7;
const tap = () => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); };

const shuffle = <T,>(a: T[]) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// Up to 7 pairs, each promo used once, the two sides from different creators when possible.
function makePairs(all: Promo[]): [Promo, Promo][] {
  const pool = shuffle(all.filter((p) => p.video.mp4 || p.video.hls));
  const pairs: [Promo, Promo][] = [];
  while (pool.length >= 2 && pairs.length < ROUNDS) {
    const a = pool.shift()!;
    let j = pool.findIndex((p) => p.creator.handle !== a.creator.handle);
    if (j < 0) j = 0;
    const b = pool.splice(j, 1)[0];
    pairs.push(Math.random() < 0.5 ? [a, b] : [b, a]);
  }
  return pairs;
}

export default function Duel() {
  const insets = useSafeAreaInsets();
  const [pairs, setPairs] = useState<[Promo, Promo][] | null>(null);
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [sound, setSound] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [all, setAll] = useState<Promo[]>([]);

  useEffect(() => {
    setStatusBarStyle('light');
    return () => setStatusBarStyle(theme.scheme === 'light' ? 'dark' : 'light');
  }, []);
  useEffect(() => {
    api.explore({}).then((r) => { setAll(r.promos); setPairs(makePairs(r.promos)); }).catch(() => setPairs([]));
  }, []);

  const pair = pairs?.[round];
  const pick = (p: Promo) => {
    if (!pair || picked) return;
    tap();
    setPicked(p.id);
    api.duel(pair[0].id, pair[1].id, p.id).catch(() => {});
  };
  const next = () => {
    if (!pairs) return;
    setPicked(null); setSound(null);
    if (round + 1 < pairs.length) setRound(round + 1); else setDone(true);
  };
  const again = () => { setPairs(makePairs(all)); setRound(0); setPicked(null); setSound(null); setDone(false); };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 6, paddingBottom: insets.bottom + 10 }]}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('cancel')} style={styles.close}>
          <Icon name="back" size={22} color={D.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{t('d_sub')}</Text>
          {pairs && pairs.length && !done ? <Text style={styles.progress}>{t('d_progress').replace('{n}', String(round + 1)).replace('{total}', String(pairs.length))}</Text> : null}
        </View>
      </View>

      {pairs === null ? <ActivityIndicator color={D.accent} style={{ flex: 1 }} /> : done || !pair ? (
        <View style={styles.end}>
          <Text style={styles.endT}>{pair ? t('d_done_t') : t('nothing')}</Text>
          {pair ? <Text style={styles.endB}>{t('d_done_b')}</Text> : null}
          <View style={{ alignSelf: 'stretch', gap: 10 }}>
            {pair ? <Button label={t('d_again')} onPress={again} /> : null}
            <Button label={t('d_back')} ghost onDark onPress={() => router.back()} />
          </View>
        </View>
      ) : (
        <>
          {pair.map((p, i) => (
            <View key={`${round}-${p.id}`} style={{ flex: 1 }}>
              <Side promo={p} sound={sound === p.id} state={picked ? (picked === p.id ? 'picked' : 'other') : 'open'}
                onSound={() => setSound(sound === p.id ? null : p.id)} onPick={() => pick(p)} />
              {i === 0 ? <View style={styles.vsWrap} pointerEvents="none"><Text style={styles.vs}>{t('d_vs')}</Text></View> : null}
            </View>
          ))}
          <View style={styles.foot}>
            {picked ? <Button label={round + 1 < pairs.length ? t('d_next') : t('d_done_t')} onPress={next} /> : <Text style={styles.hint}>{t('d_sound')}</Text>}
          </View>
        </>
      )}
    </View>
  );
}

function Side({ promo, sound, state, onSound, onPick }: { promo: Promo; sound: boolean; state: 'open' | 'picked' | 'other'; onSound: () => void; onPick: () => void }) {
  const source = Platform.OS === 'web' ? promo.video.webm || promo.video.mp4 : promo.video.hls || promo.video.mp4;
  const player = useVideoPlayer(source ? { uri: source } : null, (p) => { p.loop = true; p.muted = true; p.play(); });
  // expo-video players are configured by setting properties (see expo-video docs).
  // eslint-disable-next-line react-hooks/immutability
  useEffect(() => { player.muted = !sound; }, [sound, player]);
  return (
    <View style={[styles.card, state === 'picked' && { borderColor: D.lime }, state === 'other' && { opacity: 0.45 }]}>
      <Pressable onPress={onSound} style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={`${promo.title}. ${t('d_sound')}`}>
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} surfaceType="textureView" />
      </Pressable>
      <View style={styles.mute} pointerEvents="none"><Icon name={sound ? 'sound' : 'mute'} size={18} color="#fff" /></View>
      {state === 'picked' ? <View style={styles.badge}><Text style={styles.badgeT}>{t('d_called')}</Text></View> : null}
      <View style={styles.info} pointerEvents="box-none">
        <View style={{ flex: 1 }} pointerEvents="none">
          <Text style={styles.who} numberOfLines={1}>{promo.creator.name}</Text>
          <Text style={styles.name} numberOfLines={1}>{promo.title}</Text>
        </View>
        <Pressable onPress={onPick} disabled={state !== 'open'} accessibilityRole="button" accessibilityLabel={`${t('d_pick')}: ${promo.title}`}
          style={({ pressed }) => [styles.pick, state === 'picked' && styles.pickOn, pressed && { transform: [{ scale: 0.97 }] }]}>
          <Icon name="chevrons" size={18} color={state === 'picked' ? D.ink : D.lime} />
          <Text style={[styles.pickT, state === 'picked' && { color: D.ink }]}>{t('d_pick')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.bg, paddingHorizontal: 12, gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  close: { width: 40, height: 44, justifyContent: 'center' },
  title: { color: D.text, fontSize: 17, ...F.display },
  progress: { color: D.accent, fontSize: 13, fontWeight: '700', marginTop: 2, fontVariant: ['tabular-nums'] },
  card: { flex: 1, borderRadius: 18, overflow: 'hidden', backgroundColor: D.surface, borderWidth: 2, borderColor: D.line, justifyContent: 'flex-end' },
  mute: { position: 'absolute', top: 10, right: 10, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,10,15,0.55)' },
  badge: { position: 'absolute', top: 10, left: 10, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8, backgroundColor: D.lime },
  badgeT: { color: D.ink, fontWeight: '800', fontSize: 13 },
  info: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, backgroundColor: 'rgba(10,10,15,0.6)' },
  who: { color: '#fff', fontWeight: '700', fontSize: 14 },
  name: { color: D.text2, fontSize: 13, marginTop: 1 },
  pick: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1.5, borderColor: D.lime, backgroundColor: 'rgba(10,10,15,0.5)' },
  pickOn: { backgroundColor: D.lime },
  pickT: { color: '#fff', fontWeight: '800', fontSize: 14 },
  vsWrap: { position: 'absolute', left: 0, right: 0, bottom: -17, alignItems: 'center', zIndex: 2 },
  vs: { color: D.ink, backgroundColor: D.lime, fontWeight: '900', fontSize: 13, textTransform: 'uppercase', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10, overflow: 'hidden' },
  foot: { minHeight: 52, justifyContent: 'center' },
  hint: { color: D.muted, textAlign: 'center', fontSize: 14 },
  end: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, paddingHorizontal: 12 },
  endT: { color: D.text, fontSize: 28, textAlign: 'center', ...F.display },
  endB: { color: D.text2, fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
