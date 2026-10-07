// Edit profile (modal). Everyone: photo, name, bio. Creators also: banner, category (+2), main button and up to
// 8 links. Photos are resized on the phone before upload (logo 512 px, banner 1500 x 500).
import { Image } from 'expo-image';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api, ApiError } from '@/lib/api';
import { CATEGORIES, CTA_OPTIONS } from '@/lib/categories';
import { t } from '@/lib/i18n';
import { C } from '@/lib/theme';
import { refreshMe, useMe } from '@/lib/use-me';
import { Avatar } from '@/ui/Avatar';
import { Button, Pill } from '@/ui/Pill';

type LinkRow = { url: string; label: string };

export default function EditProfile() {
  const insets = useSafeAreaInsets();
  const { me } = useMe();
  const isCreator = me?.profile?.type === 'creator';
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState(me?.profile?.name || '');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [secondary, setSecondary] = useState<string[]>([]);
  const [cta, setCta] = useState<string | null>(null);
  const [soon, setSoon] = useState(false);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [busy, setBusy] = useState<'' | 'avatar' | 'banner' | 'save'>('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!me?.profile) return;
    const handle = me.profile.handle;
    const load = isCreator
      ? api.studio().then((s) => {
        setName(s.profile.name || ''); setBio(s.profile.bio || ''); setAvatar(s.profile.avatar); setBanner(s.profile.banner); setCategory(s.profile.category);
        setSecondary(s.profile.secondaryCategories || []); setCta(s.profile.primaryCta); setSoon(s.profile.releaseStatus === 'soon');
        setLinks(s.links.map((l) => ({ url: l.url, label: l.label || '' })));
      })
      : api.profile(handle).then((r) => { setName(r.profile.name || ''); setBio(r.profile.bio || ''); setAvatar(r.profile.avatar); });
    load.catch(() => {}).finally(() => setLoaded(true));
  }, [me, isCreator]);

  const pick = async (kind: 'avatar' | 'banner') => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: kind === 'avatar' ? [1, 1] : [3, 1], quality: 1 });
    if (r.canceled || !r.assets[0]) return;
    setBusy(kind); setErr('');
    try {
      const size = kind === 'avatar' ? { width: 512, height: 512 } : { width: 1500, height: 500 };
      const out = await manipulateAsync(r.assets[0].uri, [{ resize: size }], { compress: 0.82, format: SaveFormat.JPEG });
      const up = await api.uploadMedia(kind, out.uri);
      if (kind === 'avatar') setAvatar(up.url); else setBanner(up.url);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('photo_failed'));
    } finally { setBusy(''); }
  };

  const save = async () => {
    setBusy('save'); setErr(''); setOk(false);
    try {
      const body: Record<string, unknown> = { displayName: name, bio };
      if (isCreator) Object.assign(body, { category, secondaryCategories: secondary, primaryCta: cta, releaseStatus: soon ? 'soon' : 'live' });
      await api.updateMe(body);
      if (isCreator) await api.setLinks(links.filter((l) => l.url.trim()).map((l) => ({ url: l.url.trim(), label: l.label.trim() || null })));
      await refreshMe();
      setOk(true);
      setTimeout(() => router.back(), 600);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('error'));
    } finally { setBusy(''); }
  };

  const toggleSecondary = (id: string) => setSecondary((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < 2 ? [...s, id] : s));

  if (!loaded) return <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator color={C.lime} /></View>;
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: Platform.OS === 'ios' ? 20 : insets.top + 16, paddingBottom: insets.bottom + 40, gap: 16 }} keyboardShouldPersistTaps="handled">
        <View style={styles.top}>
          <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button"><Text style={styles.cancel}>{t('cancel')}</Text></Pressable>
          <Text style={styles.title}>{t('edit_profile')}</Text>
          <View style={{ width: 60 }} />
        </View>

        {isCreator ? (
          <Pressable onPress={() => pick('banner')} style={styles.bannerBox} accessibilityRole="button" accessibilityLabel={`${t('photo_banner')}: ${t('change_photo')}`}>
            {banner ? <Image source={{ uri: banner }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
            <View style={styles.bannerHint}>{busy === 'banner' ? <ActivityIndicator color="#fff" /> : <Text style={styles.hintText}>{t('photo_banner')}  ·  {t('change_photo')}</Text>}</View>
          </Pressable>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Pressable onPress={() => pick('avatar')} accessibilityRole="button" accessibilityLabel={`${t('photo_logo')}: ${t('change_photo')}`}>
            <Avatar uri={avatar} mono={name} size={84} radius={22} />
            {busy === 'avatar' ? <View style={styles.avatarBusy}><ActivityIndicator color="#fff" /></View> : null}
          </Pressable>
          <Button label={`${isCreator ? t('photo_logo') : t('change_photo')}`} ghost onPress={() => pick('avatar')} />
        </View>

        <Field label={t('name')}><TextInput value={name} onChangeText={setName} maxLength={80} style={styles.input} accessibilityLabel={t('name')} /></Field>
        <Field label={t('bio')}>
          <TextInput value={bio} onChangeText={setBio} maxLength={isCreator ? 300 : 160} multiline style={[styles.input, { minHeight: 96, textAlignVertical: 'top' }]} accessibilityLabel={t('bio')} />
          <Text style={styles.small}>{bio.length} / {isCreator ? 300 : 160}</Text>
        </Field>

        {isCreator ? (
          <>
            <Field label={t('category')}>
              <View style={styles.wrap}>{CATEGORIES.map((k) => <Pill key={k.id} label={t(k.label)} active={category === k.id} onPress={() => { setCategory(k.id); setSecondary((s) => s.filter((x) => x !== k.id)); }} />)}</View>
            </Field>
            <Field label={t('cats_more')}>
              <View style={styles.wrap}>{CATEGORIES.filter((k) => k.id !== category).map((k) => <Pill key={k.id} label={t(k.label)} active={secondary.includes(k.id)} onPress={() => toggleSecondary(k.id)} />)}</View>
            </Field>
            <Field label={t('main_button')}>
              <View style={styles.wrap}>{CTA_OPTIONS.map((k) => <Pill key={k.id} label={t(k.label)} active={cta === k.id} onPress={() => setCta(cta === k.id ? null : k.id)} />)}</View>
            </Field>
            <Pressable onPress={() => setSoon(!soon)} style={styles.check} accessibilityRole="checkbox" accessibilityState={{ checked: soon }}>
              <View style={[styles.box, soon && { backgroundColor: C.lime, borderColor: C.lime }]}>{soon ? <Text style={{ color: C.ink, fontWeight: '800' }}>✓</Text> : null}</View>
              <Text style={[styles.text, { flex: 1 }]}>{t('release_soon')}</Text>
            </Pressable>
            <Field label={`${t('links')} (${links.length}/8)`}>
              {links.map((l, i) => (
                <View key={i} style={styles.linkRow}>
                  <View style={{ flex: 1, gap: 6 }}>
                    <TextInput value={l.url} onChangeText={(v) => setLinks((x) => x.map((y, j) => (j === i ? { ...y, url: v } : y)))} placeholder="https://" placeholderTextColor={C.muted}
                      autoCapitalize="none" autoCorrect={false} keyboardType="url" style={styles.input} accessibilityLabel={`${t('links')} ${i + 1}`} />
                    <TextInput value={l.label} onChangeText={(v) => setLinks((x) => x.map((y, j) => (j === i ? { ...y, label: v } : y)))} placeholder={t('link_label')} placeholderTextColor={C.muted}
                      maxLength={40} style={[styles.input, { paddingVertical: 9 }]} accessibilityLabel={t('link_label')} />
                  </View>
                  <Pressable onPress={() => setLinks((x) => x.filter((_, j) => j !== i))} style={styles.remove} accessibilityRole="button" accessibilityLabel={t('remove')} hitSlop={6}>
                    <Text style={{ color: C.danger, fontWeight: '700' }}>{t('remove')}</Text>
                  </Pressable>
                </View>
              ))}
              {links.length < 8 ? <Button label={`+ ${t('add_link')}`} ghost onPress={() => setLinks((x) => [...x, { url: '', label: '' }])} /> : null}
            </Field>
          </>
        ) : null}

        {err ? <Text style={{ color: C.danger }} accessibilityLiveRegion="polite">{err}</Text> : null}
        {ok ? <Text style={{ color: C.lime }} accessibilityLiveRegion="polite">{t('saved_ok')}</Text> : null}
        <Button label={busy === 'save' ? '...' : t('save_changes')} onPress={save} disabled={!!busy || !name.trim() || (isCreator && !category)} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <View style={{ gap: 8 }}><Text style={styles.label}>{label}</Text>{children}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cancel: { color: C.text2, fontSize: 16, width: 60 },
  title: { color: C.text, fontSize: 18, fontWeight: '800' },
  bannerBox: { height: 120, borderRadius: 16, overflow: 'hidden', backgroundColor: C.surface2, justifyContent: 'flex-end' },
  bannerHint: { backgroundColor: 'rgba(0,0,0,0.45)', padding: 10, alignItems: 'center' },
  hintText: { color: '#fff', fontWeight: '700' },
  avatarBusy: { position: 'absolute', inset: 0, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' } as any,
  label: { color: '#c9c6d8', fontSize: 14, fontWeight: '600' },
  input: { backgroundColor: C.surface, color: C.text, fontSize: 16, borderRadius: 12, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, paddingVertical: 12 },
  small: { color: C.muted, fontSize: 12, alignSelf: 'flex-end' },
  text: { color: C.text2, fontSize: 15, lineHeight: 21 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  check: { flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 44 },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: C.muted, alignItems: 'center', justifyContent: 'center' },
  linkRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: C.surface, borderRadius: 14, padding: 10 },
  remove: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
});
