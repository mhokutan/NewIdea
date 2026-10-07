// Profile tab: guest card, onboarding in short steps, then the scout profile or the creator studio.
// Scouts see Scout Score (reputation only), open calls with result dates, saved promos and who they follow.
// Creators see a setup checklist, free stats and their promos. Settings (edit, sign out, delete) sit behind a gear.
import { Image } from 'expo-image';
import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as Clipboard from 'expo-clipboard';
import { api, type Perk, type ScoutSummary, type Studio, type WalletItem } from '@/lib/api';
import { CATEGORIES } from '@/lib/categories';
import { lang, outcomeText, t } from '@/lib/i18n';
import { C, F, themed, setThemePref, theme, type SchemePref } from '@/lib/theme';
import { openMail } from '@/lib/mail';
import { reminderOn, turnOffReminder, turnOnReminder } from '@/lib/reminder';
import { signOut, useMe } from '@/lib/use-me';
import { Avatar } from '@/ui/Avatar';
import { Icon } from '@/ui/Icon';
import { LegalLinks } from '@/ui/LegalLinks';
import { Button, Pill } from '@/ui/Pill';
import { Onboarding } from '@/ui/Onboarding';
import { Sheet } from '@/ui/Sheet';

const shortDate = (iso: string) => new Date(iso).toLocaleDateString(lang, { day: 'numeric', month: 'short' });
const fmt = (s: string, vars: Record<string, string | number>) => Object.entries(vars).reduce((a, [k, v]) => a.replace(`{${k}}`, String(v)), s);

export default function MeScreen() {
  const insets = useSafeAreaInsets();
  const { loading, me, refresh } = useMe();
  const [settings, setSettings] = useState(false);
  const next = useRef<(() => void) | null>(null);
  const closeSettings = (then?: () => void) => { next.current = then || null; setSettings(false); };
  const [reminder, setReminder] = useState(false);
  const [themeSheet, setThemeSheet] = useState(false);
  const pickTheme = (pref: SchemePref) => { setThemeSheet(false); setTimeout(() => { setThemePref(pref); setTimeout(() => router.navigate('/me'), 60); }, 350); };
  const openSettings = () => { reminderOn().then(setReminder).catch(() => {}); setSettings(true); };
  useEffect(() => { refresh(); }, [refresh]);

  let body;
  if (loading) body = <ActivityIndicator color={C.accent} style={{ marginTop: 80 }} />;
  else if (!me) body = (
    <View style={styles.card}>
      <Text style={styles.h1}>{t('guest_t')}</Text>
      <Text style={styles.text}>{t('guest_p')}</Text>
      <Button label={t('sign_in')} onPress={() => router.push('/sign-in')} />
    </View>
  );
  else if (me.needsOnboarding) body = <Onboarding onDone={refresh} />;
  else if (me.profile?.type === 'creator') body = <CreatorHome onSettings={openSettings} />;
  else body = <ScoutHome onSettings={openSettings} />;

  const confirmDelete = () => {
    Alert.alert(t('delete_account'), t('delete_q'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete_account'), style: 'destructive', onPress: async () => {
        try { await api.deleteAccount(); } catch { Alert.alert(t('delete_account'), t('delete_failed')); return; }
        Alert.alert(t('delete_account'), t('delete_done'));
        await signOut();
      } },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
      {body}
      {me?.needsOnboarding ? null : <LegalLinks />}
      <Sheet visible={settings} title={t('settings')} onClose={() => closeSettings()}
        onDismissed={() => { const n = next.current; next.current = null; n?.(); }} actions={[
        { label: t('edit_profile'), tone: 'primary', onPress: () => closeSettings(() => router.push('/edit-profile')) },
        ...(Platform.OS !== 'web' ? [{ label: reminder ? t('reminder_off') : t('reminder_turn_on'), onPress: () => closeSettings(() => { (reminder ? turnOffReminder() : turnOnReminder()).catch(() => {}); }) }] : []),
        { label: `${t('appearance')}: ${t(theme.pref === 'light' ? 'theme_light' : theme.pref === 'dark' ? 'theme_dark' : 'theme_system')}`, onPress: () => closeSettings(() => setThemeSheet(true)) },
        { label: t('sign_out'), onPress: () => closeSettings(async () => { await signOut(); refresh(); }) },
        { label: t('delete_account'), tone: 'danger', onPress: () => closeSettings(confirmDelete) },
        { label: t('cancel'), onPress: () => closeSettings() },
      ]} />
      <Sheet visible={themeSheet} title={t('appearance')} onClose={() => setThemeSheet(false)} actions={(['system', 'light', 'dark'] as const).map((k) => ({
        label: `${theme.pref === k ? '✓  ' : ''}${t(k === 'light' ? 'theme_light' : k === 'dark' ? 'theme_dark' : 'theme_system')}`,
        tone: theme.pref === k ? 'primary' as const : undefined,
        onPress: () => pickTheme(k),
      }))} />
    </ScrollView>
  );
}

// ------------------------------------------------------------------ header shared by both profiles
function Header({ name, handle, avatar, sub, onSettings }: { name: string; handle: string; avatar: string | null; sub: string; onSettings: () => void }) {
  return (
    <View style={styles.header}>
      <Avatar uri={avatar} mono={name} size={64} radius={18} />
      <View style={{ flex: 1 }}>
        <Text style={styles.h1} numberOfLines={1}>{name}</Text>
        <Text style={styles.text} numberOfLines={1}>@{handle}  ·  {sub}</Text>
      </View>
      <Pressable onPress={onSettings} style={styles.gear} accessibilityRole="button" accessibilityLabel={t('settings')} hitSlop={6}>
        <Icon name="more" size={20} color={C.text} />
      </Pressable>
    </View>
  );
}

// ------------------------------------------------------------------ scout
function ScoutHome({ onSettings }: { onSettings: () => void }) {
  const { me } = useMe();
  const p = me!.profile!;
  const { width } = useWindowDimensions();
  const [data, setData] = useState<ScoutSummary | null>(null);
  const [tab, setTab] = useState<'open' | 'saved' | 'following' | 'gifts'>('open');
  const [wallet, setWallet] = useState<WalletItem[] | null>(null);
  useFocusEffect(useCallback(() => {
    api.scout().then(setData).catch(() => {});
    api.myPerks().then((r) => setWallet(r.wallet)).catch(() => setWallet([]));
  }, []));

  const progress = data ? Math.min(1, (data.score - (data.level - 1) * 100) / 100) : 0;
  const tileW = (width - 32 - 16) / 3;
  return (
    <View style={{ gap: 16 }}>
      <Header name={p.name} handle={p.handle} avatar={null} sub={t('scout')} onSettings={onSettings} />
      <View style={styles.scoreCard}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View>
            <Text style={styles.label}>{t('scout_score')}</Text>
            <Text style={styles.score}>{data?.score ?? 0}</Text>
          </View>
          <Text style={styles.levelChip}>{t('level')} {data?.level ?? 1}</Text>
        </View>
        <View style={styles.bar}><View style={[styles.barFill, { width: `${Math.round(progress * 100)}%` }]} /></View>
        <Text style={styles.small}>{data ? fmt(t('to_next'), { n: Math.max(0, data.nextLevelAt - data.score), l: data.level + 1 }) : ' '}</Text>
        <Text style={styles.small}>{t('score_note')}</Text>
        {data?.streak ? (
          <View style={styles.streak} accessible accessibilityLabel={`${fmt(t('streak_weeks'), { n: data.streak.weeks })}. ${fmt(t('streak_week'), { n: Math.min(data.streak.daysThisWeek, data.streak.daysNeeded), m: data.streak.daysNeeded })}`}>
            <Text style={styles.streakText}>{fmt(t('streak_weeks'), { n: data.streak.weeks })}{data.streak.freezes ? `  ·  ${fmt(t('streak_freezes'), { n: data.streak.freezes })}` : ''}</Text>
            <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
              {Array.from({ length: data.streak.daysNeeded }, (_, i) => <View key={i} style={[styles.streakDot, i < data.streak!.daysThisWeek && styles.streakDotOn]} />)}
              <Text style={styles.small}>  {fmt(t('streak_week'), { n: Math.min(data.streak.daysThisWeek, data.streak.daysNeeded), m: data.streak.daysNeeded })}</Text>
            </View>
          </View>
        ) : null}
        <View style={styles.statRow}>
          <Stat n={data?.open.length ?? 0} label={t('open_calls')} />
          <Stat n={data?.right ?? 0} label={t('right_calls')} />
          <Stat n={data?.calledIt ?? 0} label={t('called_it')} />
        </View>
      </View>

      <View style={styles.segment} accessibilityRole="tablist">
        {(['open', 'saved', 'following', 'gifts'] as const).map((k) => (
          <Pressable key={k} onPress={() => setTab(k)} style={[styles.segBtn, tab === k && styles.segOn]} accessibilityRole="tab" accessibilityState={{ selected: tab === k }}>
            <Text style={[styles.segText, tab === k && { color: C.bg }]}>{t(k === 'open' ? 'tab_calls' : k === 'saved' ? 'tab_saved' : k === 'gifts' ? 'tab_gifts' : 'tab_following')}</Text>
          </Pressable>
        ))}
      </View>

      {!data ? <ActivityIndicator color={C.accent} /> : tab === 'open' ? (<>
        {data.results.length ? <Text style={styles.h2}>{t('tab_results')}{data.accuracy != null ? `  ·  ${t('accuracy')} ${data.accuracy}%` : ''}</Text> : null}
        {data.results.map((o) => (
          <Pressable key={'r' + o.promo.id} onPress={() => router.push({ pathname: '/play/[handle]', params: { handle: o.promo.creator.handle, start: o.promo.slug } })} style={[styles.callRow, o.outcome === 'correct' && { borderColor: C.lime }]} accessibilityRole="button">
            {o.promo.video.poster ? <Image source={{ uri: o.promo.video.poster }} style={styles.callThumb} contentFit="cover" /> : <View style={styles.callThumb} />}
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>{o.promo.title}</Text>
              <Text style={styles.small} numberOfLines={1}>{t(o.choice)}</Text>
              <Text style={[styles.small, o.outcome === 'correct' && { color: C.accent, fontWeight: '700' }]} numberOfLines={2}>
                {outcomeText(o.outcome, o.points, o.resolvedAt || '', undefined)}
              </Text>
            </View>
          </Pressable>
        ))}
        {data.results.length && data.open.length ? <Text style={styles.h2}>{t('open_calls')}</Text> : null}
        {data.open.length ? data.open.map((o) => (
          <Pressable key={o.promo.id} onPress={() => router.push({ pathname: '/play/[handle]', params: { handle: o.promo.creator.handle, start: o.promo.slug } })} style={styles.callRow} accessibilityRole="button">
            {o.promo.video.poster ? <Image source={{ uri: o.promo.video.poster }} style={styles.callThumb} contentFit="cover" /> : <View style={styles.callThumb} />}
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>{o.promo.title}</Text>
              <Text style={styles.small} numberOfLines={1}>{o.promo.creator.name}</Text>
              <Text style={[styles.small, { color: o.choice === 'will_blow_up' ? C.lime : C.text2 }]}>{t(o.choice)}  ·  {outcomeText('pending', 0, o.resolvesAt, o.finalBy) || `${t('result_on')} ${shortDate(o.resolvesAt)}`}</Text>
            </View>
          </Pressable>
        )) : data.results.length ? null : <Empty text={t('no_open_calls')} />}
      </>) : tab === 'gifts' ? (
        !wallet ? <ActivityIndicator color={C.accent} /> : wallet.length ? wallet.map((w) => <WalletRow key={w.id} item={w} />) : <Empty text={t('no_gifts')} />
      ) : tab === 'saved' ? (
        data.saved.length ? (
          <View style={styles.grid}>
            {data.saved.map((pr) => (
              <Pressable key={pr.id} onPress={() => router.push({ pathname: '/play/[handle]', params: { handle: pr.creator.handle, start: pr.slug } })} style={[styles.tile, { width: tileW, height: tileW * 16 / 9 }]} accessibilityRole="button" accessibilityLabel={pr.title}>
                {pr.video.poster ? <Image source={{ uri: pr.video.poster }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
              </Pressable>
            ))}
          </View>
        ) : <Empty text={t('no_saved')} />
      ) : (
        data.following.length ? data.following.map((f) => (
          <Link key={f.handle} href={`/creator/${f.handle}`} asChild>
            <Pressable style={styles.followRow} accessibilityRole="link">
              <Avatar uri={f.avatar} mono={f.mono} size={44} radius={12} />
              <Text style={styles.rowTitle}>{f.name}</Text>
            </Pressable>
          </Link>
        )) : <Empty text={t('no_following')} />
      )}
    </View>
  );
}

function WalletRow({ item }: { item: WalletItem }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { if (!item.code) return; await Clipboard.setStringAsync(item.code); setCopied(true); setTimeout(() => setCopied(false), 1800); };
  const ended = item.status !== 'active' || new Date(item.endsAt) < new Date();
  return (
    <View style={[styles.callRow, { alignItems: 'flex-start' }]}>
      <Avatar uri={item.creator.avatar} mono={item.creator.name} size={44} radius={12} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.small}>{item.creator.name}</Text>
        <Text style={styles.rowTitle}>{item.title}</Text>
        {item.code ? (
          <Pressable onPress={copy} style={styles.walletCode} accessibilityRole="button" accessibilityLabel={`${t('your_code')} ${item.code}. ${t('copy')}`}>
            <Text style={styles.walletCodeText} selectable>{item.code}</Text>
            <Text style={{ color: C.accent, fontWeight: '700' }}>{copied ? t('copied') : t('copy')}</Text>
          </Pressable>
        ) : null}
        <Text style={styles.small}>{ended ? t('gift_none') : fmt(t('gift_ends'), { date: shortDate(item.endsAt) })}</Text>
        {item.redeemUrl && !ended ? <Pressable onPress={() => Linking.openURL(item.redeemUrl!)} accessibilityRole="link" hitSlop={8}><Text style={{ color: C.accent, fontWeight: '700' }}>{t('open_link')} ›</Text></Pressable> : null}
      </View>
    </View>
  );
}

// ------------------------------------------------------------------ creator studio
function CreatorHome({ onSettings }: { onSettings: () => void }) {
  const { me } = useMe();
  const p = me!.profile!;
  const { width } = useWindowDimensions();
  const [data, setData] = useState<Studio | null>(null);
  const [range, setRange] = useState<'d7' | 'd28'>('d7');
  const [gift, setGift] = useState<(Perk & { claims: number }) | null | undefined>(undefined);
  const loadGift = useCallback(() => {
    api.myPerks().then((r) => setGift(r.own.find((k) => k.status === 'active' && new Date(k.endsAt) > new Date()) || null)).catch(() => setGift(null));
  }, []);
  useFocusEffect(useCallback(() => { api.studio().then(setData).catch(() => {}); loadGift(); }, [loadGift]));
  const endGift = () => {
    if (!gift) return;
    Alert.alert(t('perk_end'), gift.title, [
      { text: t('cancel'), style: 'cancel' },
      { text: t('perk_end'), style: 'destructive', onPress: () => { api.endPerk(gift.id).then(loadGift).catch(() => Alert.alert(t('error'))); } },
    ]);
  };

  const steps: [boolean, Parameters<typeof t>[0], () => void][] = data ? [
    [data.checklist.logo, 'setup_logo', () => router.push('/edit-profile')],
    [data.checklist.banner, 'setup_banner', () => router.push('/edit-profile')],
    [data.checklist.bio, 'setup_bio', () => router.push('/edit-profile')],
    [data.checklist.links, 'setup_links', () => router.push('/edit-profile')],
    [data.checklist.promo, 'setup_promo', () => openMail('hello@promovote.com', 'My first promo @' + p.handle)],
  ] : [];
  const doneCount = steps.filter(([d]) => d).length;
  const s = data?.stats[range];
  const tileW = (width - 32 - 16) / 3;
  const cat = CATEGORIES.find((c) => c.id === data?.profile.category);

  return (
    <View style={{ gap: 16 }}>
      {data?.profile.banner ? <Image source={{ uri: data.profile.banner }} style={styles.banner} contentFit="cover" /> : null}
      <Header name={p.name} handle={p.handle} avatar={data?.profile.avatar ?? null} sub={cat ? t(cat.label) : t('creator')} onSettings={onSettings} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><Button label={t('edit_profile')} onPress={() => router.push('/edit-profile')} /></View>
        <View style={{ flex: 1 }}><Button label={t('view_page')} ghost onPress={() => router.push(`/creator/${p.handle}`)} /></View>
      </View>

      {data && doneCount < steps.length ? (
        <View style={styles.card}>
          <Text style={styles.h2}>{t('setup_t')}  ·  {doneCount}/{steps.length}</Text>
          <View style={styles.bar}><View style={[styles.barFill, { width: `${Math.round((100 * doneCount) / steps.length)}%` }]} /></View>
          {steps.map(([done, label, go]) => (
            <Pressable key={label} onPress={done ? undefined : go} style={styles.checkRow} accessibilityRole="button" accessibilityState={{ checked: done }}>
              <View style={[styles.checkDot, done && { backgroundColor: C.lime, borderColor: C.lime }]}>{done ? <Text style={{ color: C.ink, fontWeight: '800' }}>✓</Text> : null}</View>
              <Text style={[styles.text, done && { color: C.muted, textDecorationLine: 'line-through' }]}>{t(label)}</Text>
            </Pressable>
          ))}
          {!data.checklist.promo ? <Text style={styles.small}>{t('uploads_soon')}</Text> : null}
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.h2}>{t('stats_t')}</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Pill label={t('last7')} active={range === 'd7'} onPress={() => setRange('d7')} />
            <Pill label={t('last28')} active={range === 'd28'} onPress={() => setRange('d28')} />
          </View>
        </View>
        {!data ? <ActivityIndicator color={C.accent} /> : !data.stats.d28.views && !data.promos.length ? (
          <Text style={styles.text}>{t('stats_zero')}</Text>
        ) : (
          <>
            <View style={styles.statGrid}>
              <Stat n={s?.views ?? 0} label={t('st_views')} />
              <Stat n={`${s?.completion ?? 0}%`} label={t('st_completion')} />
              <Stat n={s?.avgSeconds ?? 0} label={t('st_avg')} />
              <Stat n={s?.clicks ?? 0} label={t('st_clicks')} />
              <Stat n={`${s?.ctr ?? 0}%`} label={t('st_ctr')} />
              <Stat n={s?.saves ?? 0} label={t('st_saves')} />
              <Stat n={s?.follows ?? 0} label={t('st_follows')} />
              <Stat n={s?.linkTaps ?? 0} label={t('st_link_taps')} />
            </View>
            <Text style={styles.small}>
              {data.calls.blowUpPct != null ? fmt(t('calls_split'), { p: data.calls.blowUpPct, n: data.calls.total }) : fmt(t('calls_wait'), { n: data.calls.total })}
            </Text>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>{gift ? t('perk_active') : t('perk_t')}</Text>
        {gift === undefined ? <ActivityIndicator color={C.accent} /> : gift ? (
          <>
            <Text style={styles.rowTitle}>{gift.title}</Text>
            <Text style={styles.small}>
              {fmt(t('perk_claims'), { n: gift.claims })}  ·  {fmt(t('gift_ends'), { date: shortDate(gift.endsAt) })}
              {gift.stockLeft != null ? `  ·  ${fmt(t('gift_left'), { n: gift.stockLeft })}` : ''}
            </Text>
            <Button label={t('perk_end')} ghost onPress={endGift} />
          </>
        ) : (
          <>
            <Text style={styles.text}>{t('perk_p')}</Text>
            <Button label={t('perk_t')} onPress={() => router.push('/perk')} />
          </>
        )}
      </View>

      {data?.promos.length ? (
        <>
          <Text style={styles.h2}>{t('your_promos')}</Text>
          <View style={styles.grid}>
            {data.promos.map((pr) => (
              <Pressable key={pr.id} onPress={() => router.push({ pathname: '/play/[handle]', params: { handle: pr.creator.handle, start: pr.slug } })} style={[styles.tile, { width: tileW, height: tileW * 16 / 9 }]} accessibilityRole="button" accessibilityLabel={pr.title}>
                {pr.video.poster ? <Image source={{ uri: pr.video.poster }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
              </Pressable>
            ))}
          </View>
        </>
      ) : data ? (
        <View style={styles.card}>
          <Text style={styles.text}>{t('uploads_soon')}</Text>
          <Button label={t('email_trailer')} ghost onPress={() => openMail('hello@promovote.com', 'My first promo @' + p.handle)} />
        </View>
      ) : null}
    </View>
  );
}

function Stat({ n, label }: { n: number | string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statN}>{n}</Text>
      <Text style={styles.statL} numberOfLines={2}>{label}</Text>
    </View>
  );
}
function Empty({ text }: { text: string }) {
  return <View style={styles.empty}><Text style={[styles.text, { textAlign: 'center' }]}>{text}</Text></View>;
}

// ------------------------------------------------------------------ onboarding: type, then details


const styles = themed(() => ({
  card: { backgroundColor: C.surface, borderRadius: 18, padding: 18, gap: 10, borderWidth: 1, borderColor: C.line },
  h1: { color: C.text, fontSize: 26, ...F.display },
  h2: { color: C.text, fontSize: 18, ...F.display },
  text: { color: C.text2, fontSize: 15, lineHeight: 21 },
  small: { color: C.muted, fontSize: 13, lineHeight: 18 },
  label: { color: C.text2, fontSize: 14, fontWeight: '600' },
  input: { backgroundColor: C.surface, color: C.text, fontSize: 16, borderRadius: 12, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, paddingVertical: 12 },
  dateField: { flex: 1, minWidth: 0 },
  dateBox: { alignSelf: 'flex-start', backgroundColor: C.surface, borderRadius: 12, padding: 6 },
  check: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 4 },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: C.muted, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  gear: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  banner: { height: 120, borderRadius: 16, marginBottom: -4 },
  scoreCard: { backgroundColor: C.surface, borderRadius: 20, padding: 18, gap: 6, borderWidth: 1, borderColor: 'rgba(198,255,61,0.25)' },
  score: { color: C.accent, fontSize: 44, ...F.display },
  levelChip: { color: C.text, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line, fontWeight: '800', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, overflow: 'hidden', marginBottom: 10 },
  bar: { height: 6, borderRadius: 3, backgroundColor: C.line, overflow: 'hidden', marginVertical: 4 },
  barFill: { height: 6, borderRadius: 3, backgroundColor: C.lime },
  statRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { flexGrow: 1, flexBasis: '30%', backgroundColor: C.surface2, borderRadius: 14, padding: 12, gap: 2 },
  statN: { color: C.text, fontSize: 22, ...F.display },
  statL: { color: C.muted, fontSize: 12 },
  streak: { marginTop: 4, gap: 6 },
  streakText: { color: C.text, fontSize: 14, fontWeight: '700' },
  streakDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: C.muted },
  streakDotOn: { backgroundColor: C.lime, borderColor: C.lime },
  walletCode: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.lime, borderRadius: 10, paddingHorizontal: 12, minHeight: 44, marginTop: 4 },
  walletCodeText: { color: C.text, fontSize: 17, fontWeight: '800', letterSpacing: 1.5 },
  segment: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 14, padding: 4, gap: 4 },
  segBtn: { flex: 1, minHeight: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  typeIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(198,255,61,0.12)', alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: C.text },
  segText: { color: C.text2, fontWeight: '700', fontSize: 13, textAlign: 'center' },
  callRow: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: C.surface, borderRadius: 14, padding: 10, borderWidth: 1, borderColor: 'transparent' },
  callThumb: { width: 54, height: 72, borderRadius: 10, backgroundColor: C.surface2 },
  rowTitle: { color: C.text, fontSize: 15, fontWeight: '700' },
  followRow: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 6, minHeight: 56 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { borderRadius: 12, overflow: 'hidden', backgroundColor: C.surface },
  empty: { padding: 24, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: C.line },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  checkDot: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: C.muted, alignItems: 'center', justifyContent: 'center' },
}));
