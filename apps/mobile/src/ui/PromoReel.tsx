// One full screen promo in the vertical feed. Plays only while it is the active item.
import { useEventListener } from 'expo';
import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { api, type Promo } from '@/lib/api';
import { t } from '@/lib/i18n';
import { C } from '@/lib/theme';
import { useMe } from '@/lib/use-me';
import { Avatar } from './Avatar';
import { Icon, type IconName } from './Icon';

const CTA_LABEL: Record<string, Parameters<typeof t>[0]> = {
  app_store: 'cta_app_store', shop: 'cta_shop', etsy: 'cta_etsy', notify: 'cta_notify', website: 'cta_website', watch: 'cta_watch', google_play: 'cta_website',
};

export function PromoReel({ promo, active, height, muted, onSeen }: {
  promo: Promo; active: boolean; height: number; muted: boolean; onSeen: (id: string) => void;
}) {
  const { me, isScout } = useMe();
  const source = Platform.OS === 'web' ? promo.video.webm || promo.video.mp4 : promo.video.hls || promo.video.mp4;
  const player = useVideoPlayer(source ? { uri: source } : null, (p) => { p.loop = true; p.muted = true; });
  const [paused, setPaused] = useState(false);
  const [voted, setVoted] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);
  const watched = useRef(0);
  const reported = useRef(false);

  // expo-video players are configured by setting properties (see expo-video docs).
  // eslint-disable-next-line react-hooks/immutability
  useEffect(() => { player.muted = muted; }, [muted, player]);
  useEffect(() => {
    if (active && !paused) player.play(); else player.pause();
    if (!active) { watched.current = 0; reported.current = false; }
  }, [active, paused, player]);

  // A view counts after 3 seconds on screen, once per promo per session.
  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    if (!active) return;
    watched.current = Math.max(watched.current, currentTime);
    if (!reported.current && watched.current >= 3) {
      reported.current = true;
      onSeen(promo.id);
      api.view(promo.id, Math.floor(watched.current), false).catch(() => {});
    }
  });

  const needAccount = () => { router.push(me ? '/me' : '/sign-in'); };
  const vote = async (choice: 'will_blow_up' | 'not_for_me') => {
    if (!isScout) return needAccount();
    setVoted(choice);
    api.vote(promo.id, choice).catch(() => {});
  };
  const toggleSave = () => {
    if (!isScout) return needAccount();
    setSaved(!saved);
    api.save(promo.id, !saved).catch(() => setSaved(saved));
  };
  const share = () => Share.share({ message: `${promo.title} https://promovote.com/?v=${promo.slug}` }).catch(() => {});
  const openCta = () => {
    if (!promo.cta?.url) return;
    api.click(promo.id).catch(() => {});
    Linking.openURL(promo.cta.url);
  };

  const c = promo.creator;
  return (
    <View style={{ height, backgroundColor: '#000' }}>
      {/* The whole video always fits. Spare space shows a blurred, dimmed copy of the poster, like Reels and TikTok. */}
      {promo.video.poster ? (
        <>
          <Image source={{ uri: promo.video.poster }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={40} />
          <View style={[StyleSheet.absoluteFill, styles.dim]} />
          <Image source={{ uri: promo.video.poster }} style={StyleSheet.absoluteFill} contentFit="contain" />
        </>
      ) : null}
      <VideoView player={player} style={styles.video} contentFit="contain" nativeControls={false} surfaceType="textureView" />
      <Pressable style={StyleSheet.absoluteFill} onPress={() => setPaused(!paused)} accessibilityLabel={paused ? 'Play' : 'Pause'} />
      {paused ? <View style={styles.paused} pointerEvents="none"><Icon name="play" size={34} /></View> : null}

      <View style={[styles.shade, open && styles.shadeOpen]} pointerEvents="none" />
      <View style={styles.info} pointerEvents="box-none">
        <Link href={`/creator/${c.handle}`} asChild>
          <Pressable style={styles.who} accessibilityRole="link">
            <Avatar uri={c.avatar} mono={c.mono} size={40} />
            <View>
              <Text style={styles.whoName}>{c.name}</Text>
              {c.kind ? <Text style={styles.whoKind}>{c.kind}</Text> : null}
            </View>
          </Pressable>
        </Link>
        {/* Collapsed by default so the video stays visible. Tapping the text opens the full details. */}
        <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityState={{ expanded: open }}
          accessibilityHint={open ? t('less') : t('more')}>
          <Text style={styles.title} numberOfLines={open ? undefined : 1}>{promo.title}</Text>
          {promo.description ? (
            <Text style={styles.desc} numberOfLines={open ? undefined : 1}>{promo.description}</Text>
          ) : null}
          <Text style={styles.more}>{open ? t('less') : t('more')}</Text>
        </Pressable>
        {open && promo.tags.length ? (
          <View style={styles.tags}>
            {promo.tags.map((tag) => (
              <Link key={tag} href={{ pathname: '/explore', params: { tag } }} style={styles.hashtag}>#{tag}</Link>
            ))}
          </View>
        ) : null}
        {open && (c.releaseStatus === 'soon' || c.androidStatus === 'soon') ? (
          <View style={styles.chips}>
            {c.releaseStatus === 'soon' ? <Text style={styles.chip}>{t('soon')}</Text> : null}
            {c.androidStatus === 'soon' ? <Text style={styles.chip}>{t('android_soon')}</Text> : null}
          </View>
        ) : null}
        {promo.cta?.url ? (
          <Pressable onPress={openCta} style={styles.cta} accessibilityRole="link">
            <Text style={styles.ctaText}>{t(CTA_LABEL[promo.cta.kind] || 'cta_website')}</Text>
          </Pressable>
        ) : null}
        {open && c.founderOwned ? <Text style={styles.disc}>{t('founder_made')}</Text> : null}
      </View>

      <View style={styles.rail}>
        <RailButton icon="fire" label={t('will_blow_up')} on={voted === 'will_blow_up'} lime onPress={() => vote('will_blow_up')} />
        <RailButton icon="down" label={t('not_for_me')} on={voted === 'not_for_me'} onPress={() => vote('not_for_me')} />
        <RailButton icon={saved ? 'saved' : 'save'} label={t('save')} on={saved} onPress={toggleSave} />
        <RailButton icon="share" label={t('share')} onPress={share} />
      </View>
    </View>
  );
}

function RailButton({ icon, label, onPress, on, lime }: { icon: IconName; label: string; onPress: () => void; on?: boolean; lime?: boolean }) {
  return (
    <Pressable onPress={onPress} style={styles.railBtn} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: !!on }} hitSlop={6}>
      <View style={[styles.railIcon, on && { backgroundColor: C.lime }]}>
        <Icon name={icon} color={on ? C.ink : lime ? C.lime : '#fff'} />
      </View>
      <Text style={styles.railLabel} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dim: { backgroundColor: 'rgba(0,0,0,0.45)' },
  // Explicit size: on web the <video> element ignores left/right/top/bottom and would draw at its natural size.
  video: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  paused: { position: 'absolute', top: '50%', left: '50%', width: 76, height: 76, marginLeft: -38, marginTop: -38, borderRadius: 38, backgroundColor: 'rgba(8,8,12,0.55)', alignItems: 'center', justifyContent: 'center' },
  shade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '34%', backgroundColor: 'transparent', experimental_backgroundImage: 'linear-gradient(to top, rgba(6,6,10,0.94) 15%, rgba(6,6,10,0))' } as any,
  shadeOpen: { height: '70%' },
  info: { position: 'absolute', left: 16, right: 84, bottom: 20 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start' },
  whoName: { color: '#fff', fontWeight: '700', fontSize: 16 },
  whoKind: { color: '#c9c6d8', fontSize: 13 },
  title: { color: '#fff', fontWeight: '800', fontSize: 18, marginTop: 10, marginBottom: 2 },
  desc: { color: C.text2, fontSize: 14, lineHeight: 20 },
  more: { color: '#fff', fontSize: 13, fontWeight: '700', marginTop: 2, opacity: 0.85 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  hashtag: { color: '#fff', fontWeight: '600', fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { color: C.lime, fontSize: 12, fontWeight: '600', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 99, borderWidth: 1, borderColor: 'rgba(198,255,61,0.45)', overflow: 'hidden' },
  cta: { alignSelf: 'flex-start', marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', paddingVertical: 9, paddingHorizontal: 14, backgroundColor: 'rgba(20,20,31,0.6)' },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  disc: { color: C.muted, fontSize: 12, marginTop: 10 },
  rail: { position: 'absolute', right: 8, bottom: 110, gap: 14, alignItems: 'center' },
  railBtn: { width: 68, alignItems: 'center', gap: 4 },
  railIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(20,20,31,0.72)', alignItems: 'center', justifyContent: 'center' },
  railLabel: { color: '#fff', fontSize: 11, fontWeight: '600', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 2 },
});
