// Upload a promo (modal, creators only; founder decision 2026-10-16). Pick a 10 to 30 s video, add a title, the
// main button, the AI question and the rights confirmation, then it goes to our review queue (never straight live).
// iOS exports the pick as 720p H.264 (smaller upload); Android sends the file as it is, so the 50 MB cap applies.
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { createVideoPlayer, useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api, ApiError, type Link, type UploadQuota } from '@/lib/api';
import { ctaLabel, ctaVisible } from '@/lib/categories';
import { lang as appLang, t } from '@/lib/i18n';
import { C, F, themed } from '@/lib/theme';
import { Button, Pill } from '@/ui/Pill';

const MIN_MS = 10000, MAX_MS = 30500, MAX_BYTES = 50 * 1024 * 1024;
const LANGS = [['en', 'English'], ['es', 'Español'], ['tr', 'Türkçe']] as const;
// Which profile link platforms can back each main button (same table as the API's CTA_PLATFORMS).
const CTA_FROM: Record<string, string[]> = {
  app_store: ['app_store'], google_play: ['google_play'], steam: ['steam'], itch: ['itch'], etsy: ['etsy'],
  shop: ['shopify', 'amazon', 'etsy', 'website'], watch: ['youtube', 'tiktok', 'instagram'], watch_live: ['twitch', 'kick', 'youtube'], website: ['website'],
};
const fmt = (s: string, vars: Record<string, string | number>) => Object.entries(vars).reduce((a, [k, v]) => a.replace(`{${k}}`, String(v)), s);

type Picked = { uri: string; durationMs: number; width?: number; height?: number };

export default function UploadScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ fix?: string }>();
  const fixId = typeof params.fix === 'string' ? params.fix : null;
  const [video, setVideo] = useState<Picked | null>(null);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [cta, setCta] = useState<string | null>(null);
  const [vlang, setVlang] = useState<string>(LANGS.some(([l]) => l === appLang) ? appLang : 'en');
  const [ai, setAi] = useState<boolean | null>(null);
  const [rights, setRights] = useState(false);
  const [links, setLinks] = useState<Link[]>([]);
  const [quota, setQuota] = useState<UploadQuota | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.studio().then((s) => { setLinks(s.links); if (s.profile.primaryCta) setCta(s.profile.primaryCta); }).catch(() => {});
    api.myPromos().then((r) => {
      setQuota(r.quota);
      const f = fixId ? r.promos.find((p) => p.id === fixId) : null;
      if (f) { setTitle(f.title); setDesc(f.description || ''); setAi(f.aiGenerated); setVlang(f.lang); setCta(f.ctaKind); }
    }).catch(() => {});
  }, [fixId]);

  const ctaChoices = useMemo(() => Object.keys(CTA_FROM).filter((k) => ctaVisible(k, Platform.OS) && links.some((l) => CTA_FROM[k].includes(l.platform))), [links]);
  // A saved main button without a matching profile link falls back to no button.
  const ctaPick = cta && ctaChoices.includes(cta) ? cta : null;

  const player = useVideoPlayer(video?.uri ?? null, (p) => { p.loop = true; p.muted = true; p.play(); });

  const pick = async () => {
    setErr('');
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'], allowsEditing: true, videoMaxDuration: 30, quality: 1,
      videoExportPreset: ImagePicker.VideoExportPreset.H264_1280x720,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.IFrame1280x720,
    });
    if (r.canceled || !r.assets[0]) return;
    const a = r.assets[0];
    const ms = a.duration ?? 0;
    if (ms && ms < MIN_MS) return setErr(t('up_short'));
    if (ms > MAX_MS) return setErr(t('up_long'));
    if (a.fileSize && a.fileSize > MAX_BYTES) return setErr(t('up_big'));
    setVideo({ uri: a.uri, durationMs: ms || 15000, width: a.width, height: a.height });
  };

  // A poster from the first second keeps the feed from showing a black frame while the video loads. Optional.
  const makePoster = async (uri: string) => {
    try {
      const p = createVideoPlayer(uri);
      const [thumb] = await p.generateThumbnailsAsync([1]);
      p.release();
      if (!thumb) return null;
      const img = await ImageManipulator.manipulate(thumb).resize({ width: 720 }).renderAsync();
      const out = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.75 });
      return out.uri;
    } catch { return null; }
  };

  const noQuota = !fixId && quota !== null && quota.left <= 0;
  const ready = !!video && title.trim().length >= 3 && ai !== null && rights && !busy && !noQuota;

  const send = async () => {
    if (!video || ai === null) return;
    setBusy(true); setErr('');
    try {
      let id = fixId;
      if (id) await api.updatePromo(id, { title: title.trim(), description: desc.trim() || null, aiGenerated: ai });
      if (!id) id = (await api.createPromo({ title: title.trim(), description: desc.trim() || undefined, lang: vlang, ctaKind: ctaPick, aiGenerated: ai, rightsConfirmed: true })).id;
      await api.uploadPromoVideo(id, video.uri, video.durationMs, video.width, video.height);
      const poster = await makePoster(video.uri);
      if (poster) await api.uploadPromoPoster(id, poster).catch(() => {});
      await api.submitPromo(id);
      setDone(true);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('up_failed'));
    } finally { setBusy(false); }
  };

  const top = Platform.OS === 'ios' ? 20 : insets.top + 16;
  if (done) {
    return (
      <View style={[styles.root, { padding: 24, paddingTop: top + 40, gap: 16, alignItems: 'center' }]}>
        <Text style={[styles.title, { fontSize: 26, textAlign: 'center' }]} accessibilityRole="header">{t('up_done_t')}</Text>
        <Text style={[styles.text, { textAlign: 'center' }]}>{t('up_done_p')}</Text>
        <View style={{ alignSelf: 'stretch' }}><Button label={t('up_back')} onPress={() => router.back()} /></View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: top, paddingBottom: insets.bottom + 40, gap: 16 }} keyboardShouldPersistTaps="handled">
        <View style={styles.top}>
          <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}><Text style={styles.cancel}>{t('cancel')}</Text></Pressable>
          <Text style={styles.title} accessibilityRole="header">{t('up_t')}</Text>
          <View style={{ width: 60 }} />
        </View>

        {quota ? <Text style={styles.small}>{noQuota ? fmt(t('up_none_left'), { limit: quota.limit }) : fmt(t('up_left'), { n: quota.left, limit: quota.limit })}</Text> : null}

        {video ? (
          <View style={styles.preview}>
            <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="cover" nativeControls={false} />
          </View>
        ) : null}
        <Button label={video ? t('up_change') : t('up_pick')} ghost={!!video} onPress={pick} disabled={busy || noQuota} />
        <Text style={styles.small}>{t('up_rules')}</Text>

        <Field label={t('up_title')}><TextInput value={title} onChangeText={setTitle} maxLength={60} style={styles.input} accessibilityLabel={t('up_title')} /></Field>
        <Field label={t('up_desc')}><TextInput value={desc} onChangeText={setDesc} maxLength={280} multiline style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]} accessibilityLabel={t('up_desc')} /></Field>

        <Field label={t('up_cta')}>
          <View style={styles.wrap}>
            <Pill label={t('up_cta_none')} active={ctaPick === null} onPress={() => setCta(null)} />
            {ctaChoices.map((k) => <Pill key={k} label={t(ctaLabel(k))} active={ctaPick === k} onPress={() => setCta(k)} />)}
          </View>
          <Text style={styles.small}>{t('up_cta_hint')}</Text>
        </Field>

        <Field label={t('up_lang')}>
          <View style={styles.wrap}>{LANGS.map(([id, name]) => <Pill key={id} label={name} active={vlang === id} onPress={() => setVlang(id)} />)}</View>
        </Field>

        <Field label={t('up_ai')}>
          <View style={styles.wrap}>
            <Pill label={t('up_ai_no')} active={ai === false} onPress={() => setAi(false)} />
            <Pill label={t('up_ai_yes')} active={ai === true} onPress={() => setAi(true)} />
          </View>
        </Field>

        <Pressable onPress={() => setRights(!rights)} style={styles.check} accessibilityRole="checkbox" accessibilityState={{ checked: rights }}>
          <View style={[styles.box, rights && { backgroundColor: C.lime, borderColor: C.lime }]}>{rights ? <Text style={{ color: C.ink, fontWeight: '800' }}>✓</Text> : null}</View>
          <Text style={[styles.text, { flex: 1 }]}>{t('up_rights')}</Text>
        </Pressable>

        {err ? <Text style={{ color: C.danger }}>{err}</Text> : null}
        {busy ? <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><ActivityIndicator color={C.accent} /><Text style={styles.text}>{t('up_sending')}</Text></View> : null}
        <Button label={t('up_send')} onPress={send} disabled={!ready} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <View style={{ gap: 8 }}><Text style={styles.label}>{label}</Text>{children}</View>;
}

const styles = themed(() => ({
  root: { flex: 1, backgroundColor: C.bg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cancel: { color: C.text2, fontSize: 16, width: 60 },
  title: { color: C.text, fontSize: 18, ...F.display },
  label: { color: C.text2, fontSize: 14, fontWeight: '600' },
  input: { backgroundColor: C.surface, color: C.text, fontSize: 16, borderRadius: 12, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, paddingVertical: 12 },
  text: { color: C.text2, fontSize: 15, lineHeight: 21 },
  small: { color: C.muted, fontSize: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preview: { alignSelf: 'center', width: 200, height: 356, borderRadius: 18, overflow: 'hidden', backgroundColor: C.surface },
  check: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', minHeight: 44 },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: C.line, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
}));
