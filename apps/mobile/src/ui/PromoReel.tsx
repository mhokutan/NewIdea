// One full screen promo in the vertical feed. Plays only while it is the active item.
// PromoVote's own layout: a bottom call bar (Not for me / Will blow up) that turns into a call ticket after
// voting; save, share and the menu (report, block) stay on the right.
import { useEventListener } from 'expo';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Linking, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { api, ApiError, type Call, type Promo } from '@/lib/api';
import { asMember, asScout } from '@/lib/gate';
import { lang, t } from '@/lib/i18n';
import { C } from '@/lib/theme';
import { useMe } from '@/lib/use-me';
import { setBlocked, setCall, setSaved, useViewerState } from '@/lib/viewer-state';
import { Avatar } from './Avatar';
import { Icon, type IconName } from './Icon';
import { Sheet } from './Sheet';

const CTA_LABEL: Record<string, Parameters<typeof t>[0]> = {
  app_store: 'cta_app_store', shop: 'cta_shop', etsy: 'cta_etsy', notify: 'cta_notify', website: 'cta_website', watch: 'cta_watch', google_play: 'cta_website',
};
const REPORT_REASONS: [string, Parameters<typeof t>[0]][] = [
  ['spam_or_scam', 'r_spam'], ['hate_or_harassment', 'r_hate'], ['violence', 'r_violence'], ['nudity_or_sexual', 'r_sexual'],
  ['copyright', 'r_copyright'], ['minor', 'r_minor'], ['other', 'r_other'],
];
const tap = () => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); };
const shortDate = (iso: string) => new Date(iso).toLocaleDateString(lang, { day: 'numeric', month: 'short' });

export function PromoReel({ promo, active, height, muted, onSeen, bottomInset = 0 }: {
  promo: Promo; active: boolean; height: number; muted: boolean; onSeen: (id: string) => void; bottomInset?: number;
}) {
  const { me } = useMe();
  const vs = useViewerState();
  const call: Call | undefined = vs.calls[promo.id];
  const saved = vs.saves.includes(promo.id);
  const source = Platform.OS === 'web' ? promo.video.webm || promo.video.mp4 : promo.video.hls || promo.video.mp4;
  const player = useVideoPlayer(source ? { uri: source } : null, (p) => {
    p.loop = true; p.muted = true;
    p.timeUpdateEventInterval = 0.5; // timeUpdate never fires without this, and views would not be counted
  });
  const [paused, setPaused] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState<null | 'menu' | 'report' | 'done'>(null);
  const [note, setNote] = useState('');
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

  const flash = (msg: string) => { setNote(msg); AccessibilityInfo.announceForAccessibility(msg); setTimeout(() => setNote(''), 2600); };
  const c = promo.creator;

  const vote = (choice: Call['choice']) => {
    tap();
    asScout(async () => {
      if (busy) return;
      setBusy(true);
      setCall(promo.id, { choice, rank: null, resolvesAt: new Date(Date.now() + 7 * 864e5).toISOString() });
      try {
        const r = await api.vote(promo.id, choice);
        setCall(promo.id, r.call);
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        AccessibilityInfo.announceForAccessibility(`${t('called')}. ${t('result_on')} ${shortDate(r.call.resolvesAt)}`);
      } catch (e) {
        if (e instanceof ApiError && e.code === 'already_voted' && e.body?.call) { setCall(promo.id, e.body.call); flash(t('already_called')); }
        else { setCall(promo.id, null); flash(t('error')); }
      } finally { setBusy(false); }
    });
  };
  const toggleSave = () => {
    tap();
    asScout(async () => {
      const on = !saved;
      setSaved(promo.id, on);
      flash(on ? t('saved_toast') : t('unsaved_toast'));
      try { await api.save(promo.id, on); } catch { setSaved(promo.id, !on); flash(t('error')); }
    });
  };
  const share = () => {
    tap();
    const url = `https://promovote.com/?v=${promo.slug}`;
    Share.share(Platform.OS === 'ios' ? { message: promo.title, url } : { message: `${promo.title} ${url}` }).catch((e) => console.warn('share_failed', e));
  };
  const openCta = () => {
    if (!promo.cta?.url) return;
    tap();
    api.click(promo.id).catch(() => {});
    Linking.openURL(promo.cta.url);
  };
  const report = async (reason: string) => {
    if (!me) { setMenu(null); return asMember(() => setMenu('report')); }
    try { await api.report('promo', promo.id, reason); setMenu('done'); } catch { setMenu(null); flash(t('error')); }
  };
  const block = async () => {
    setMenu(null);
    if (!me?.profile) return asMember(() => {});
    try { await api.block(c.handle); setBlocked(c.handle); flash(t('blocked_toast')); } catch { flash(t('error')); }
  };

  const showAndroidSoon = Platform.OS === 'android' && c.androidStatus === 'soon';
  const bottom = 14 + bottomInset;
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

      <View style={[styles.info, { bottom: bottom + 64 }]} pointerEvents="box-none">
        <Link href={`/creator/${c.handle}`} asChild>
          <Pressable style={styles.who} accessibilityRole="link" hitSlop={6}>
            <Avatar uri={c.avatar} mono={c.mono} size={40} />
            <View style={{ flexShrink: 1 }}>
              <Text style={styles.whoName} numberOfLines={1}>{c.name}</Text>
              <Text style={styles.whoKind} numberOfLines={1}>{c.founderOwned ? t('founder_made') : c.kind}</Text>
            </View>
          </Pressable>
        </Link>
        {/* Collapsed by default so the video stays visible. Tapping the text opens the full details. */}
        <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityState={{ expanded: open }} hitSlop={4}>
          <Text style={styles.title} numberOfLines={open ? undefined : 1}>{promo.title}</Text>
          {promo.description ? <Text style={styles.desc} numberOfLines={open ? undefined : 1}>{promo.description}</Text> : null}
          <Text style={styles.more}>{open ? t('less') : t('more')}</Text>
        </Pressable>
        {open && promo.tags.length ? (
          <View style={styles.tags}>
            {promo.tags.map((tag) => (
              <Link key={tag} href={{ pathname: '/explore', params: { tag } }} style={styles.hashtag}>#{tag}</Link>
            ))}
          </View>
        ) : null}
        {open && (c.releaseStatus === 'soon' || showAndroidSoon) ? (
          <View style={styles.chips}>
            {c.releaseStatus === 'soon' ? <Text style={styles.chip}>{t('soon')}</Text> : null}
            {showAndroidSoon ? <Text style={styles.chip}>{t('android_soon')}</Text> : null}
          </View>
        ) : null}
        {promo.cta?.url ? (
          <Pressable onPress={openCta} style={({ pressed }) => [styles.cta, pressed && styles.pressed]} accessibilityRole="link">
            <Text style={styles.ctaText}>{t(CTA_LABEL[promo.cta.kind] || 'cta_website')}</Text>
            <Icon name="link" size={14} color={C.ink} />
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.rail, { bottom: bottom + 76 }]}>
        <RailButton icon={saved ? 'saved' : 'save'} label={saved ? t('saved') : t('save')} on={saved} onPress={toggleSave} />
        <RailButton icon="share" label={t('share')} onPress={share} />
        <RailButton icon="more" label={t('more_actions')} onPress={() => { tap(); setMenu('menu'); }} />
      </View>

      {/* Call bar: the core PromoVote action. After a call it becomes a ticket with the result date. */}
      <View style={[styles.callBar, { bottom }]}>
        {call ? (
          <View style={styles.ticket} accessible accessibilityLabel={`${t('called')}: ${t(call.choice)}. ${t('result_on')} ${shortDate(call.resolvesAt)}`}>
            <View style={[styles.ticketIcon, call.choice === 'will_blow_up' ? styles.ticketUp : styles.ticketDown]}>
              <Icon name={call.choice === 'will_blow_up' ? 'chevrons' : 'down'} size={18} color={call.choice === 'will_blow_up' ? C.ink : '#fff'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ticketTitle} numberOfLines={1}>{t('called')}: {t(call.choice)}</Text>
              <Text style={styles.ticketSub} numberOfLines={1}>
                {t('result_on')} {shortDate(call.resolvesAt)}{call.rank ? `  ·  ${t('scout_n')}${call.rank}` : ''}
                {call.split && call.split.total >= 5 ? `  ·  ${call.split.blowUpPct}% ${t('say_blow_up')}` : ''}
              </Text>
            </View>
          </View>
        ) : (
          <>
            <Pressable onPress={() => vote('not_for_me')} disabled={busy} accessibilityRole="button" accessibilityLabel={t('not_for_me')}
              style={({ pressed }) => [styles.callBtn, styles.callNo, pressed && styles.pressed]}>
              <Text style={styles.callNoText}>{t('not_for_me')}</Text>
            </Pressable>
            <Pressable onPress={() => vote('will_blow_up')} disabled={busy} accessibilityRole="button" accessibilityLabel={t('will_blow_up')}
              style={({ pressed }) => [styles.callBtn, styles.callYes, pressed && styles.pressed]}>
              <Icon name="chevrons" size={18} color={C.ink} />
              <Text style={styles.callYesText}>{t('will_blow_up')}</Text>
            </Pressable>
          </>
        )}
      </View>

      {note ? <View style={[styles.toast, { bottom: bottom + 70 }]} pointerEvents="none"><Text style={styles.toastText}>{note}</Text></View> : null}

      <Sheet visible={menu === 'menu'} onClose={() => setMenu(null)} actions={[
        { label: t('report'), onPress: () => setMenu('report') },
        { label: `${t('block')} @${c.handle}`, tone: 'danger', onPress: block },
        { label: t('cancel'), onPress: () => setMenu(null) },
      ]} />
      <Sheet visible={menu === 'report'} title={t('report_t')} onClose={() => setMenu(null)}
        actions={[...REPORT_REASONS.map(([code, key]) => ({ label: t(key), onPress: () => report(code) })), { label: t('cancel'), onPress: () => setMenu(null) }]} />
      <Sheet visible={menu === 'done'} title={t('report_thanks_t')} text={t('report_thanks_p')} onClose={() => setMenu(null)} actions={[{ label: t('ok'), onPress: () => setMenu(null) }]} />
    </View>
  );
}

function RailButton({ icon, label, onPress, on }: { icon: IconName; label: string; onPress: () => void; on?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.railBtn, pressed && styles.pressed]} accessibilityRole="button"
      accessibilityLabel={label} accessibilityState={{ selected: !!on }} hitSlop={6} android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }}>
      <View style={[styles.railIcon, on && { backgroundColor: C.lime }]}>
        <Icon name={icon} color={on ? C.ink : '#fff'} />
      </View>
      <View style={styles.railLabelPill}><Text style={styles.railLabel} numberOfLines={1}>{label}</Text></View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dim: { backgroundColor: 'rgba(0,0,0,0.45)' },
  // Explicit size: on web the <video> element ignores left/right/top/bottom and would draw at its natural size.
  video: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  paused: { position: 'absolute', top: '50%', left: '50%', width: 76, height: 76, marginLeft: -38, marginTop: -38, borderRadius: 38, backgroundColor: 'rgba(8,8,12,0.55)', alignItems: 'center', justifyContent: 'center' },
  shade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '40%', backgroundColor: 'transparent', experimental_backgroundImage: 'linear-gradient(to top, rgba(6,6,10,0.95) 25%, rgba(6,6,10,0))' } as any,
  shadeOpen: { height: '75%' },
  pressed: { transform: [{ scale: 0.94 }], opacity: 0.85 },
  info: { position: 'absolute', left: 16, right: 84 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start', minHeight: 44 },
  whoName: { color: '#fff', fontWeight: '700', fontSize: 16 },
  whoKind: { color: '#d4d1e2', fontSize: 13 },
  title: { color: '#fff', fontWeight: '800', fontSize: 18, marginTop: 8, marginBottom: 2 },
  desc: { color: C.text2, fontSize: 14, lineHeight: 20 },
  more: { color: '#fff', fontSize: 13, fontWeight: '700', marginTop: 2, opacity: 0.85 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  hashtag: { color: '#fff', fontWeight: '600', fontSize: 13, paddingVertical: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { color: C.lime, fontSize: 12, fontWeight: '600', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 99, borderWidth: 1, borderColor: 'rgba(198,255,61,0.45)', overflow: 'hidden' },
  cta: { alignSelf: 'flex-start', marginTop: 10, borderRadius: 12, backgroundColor: '#fff', minHeight: 44, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6 },
  ctaText: { color: C.ink, fontWeight: '700', fontSize: 14 },
  rail: { position: 'absolute', right: 8, gap: 12, alignItems: 'center' },
  railBtn: { width: 68, alignItems: 'center', gap: 4 },
  railIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(20,20,31,0.72)', alignItems: 'center', justifyContent: 'center' },
  railLabelPill: { backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  railLabel: { color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  callBar: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', gap: 10, minHeight: 52 },
  callBtn: { flex: 1, minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  callNo: { backgroundColor: 'rgba(20,20,31,0.82)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  callNoText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  callYes: { backgroundColor: C.lime },
  callYesText: { color: C.ink, fontWeight: '800', fontSize: 15 },
  ticket: { flex: 1, minHeight: 52, borderRadius: 16, backgroundColor: 'rgba(20,20,31,0.9)', borderWidth: 1, borderColor: 'rgba(198,255,61,0.45)', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 },
  ticketIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ticketUp: { backgroundColor: C.lime },
  ticketDown: { backgroundColor: 'rgba(255,255,255,0.15)' },
  ticketTitle: { color: '#fff', fontWeight: '800', fontSize: 14 },
  ticketSub: { color: '#c9c6d8', fontSize: 12, marginTop: 1 },
  toast: { position: 'absolute', alignSelf: 'center', backgroundColor: 'rgba(20,20,31,0.95)', borderRadius: 99, paddingHorizontal: 16, paddingVertical: 9 },
  toastText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
