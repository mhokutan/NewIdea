// Profile tab: guest card, onboarding (account type, username, birth date) or the signed in account.
import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api, ApiError } from '@/lib/api';
import { lang, t } from '@/lib/i18n';
import { C } from '@/lib/theme';
import { signOut, useMe } from '@/lib/use-me';
import { Button, Pill } from '@/ui/Pill';

export default function MeScreen() {
  const insets = useSafeAreaInsets();
  const { loading, me, refresh } = useMe();
  useEffect(() => { refresh(); }, [refresh]);

  let body;
  if (loading) body = <ActivityIndicator color={C.lime} style={{ marginTop: 80 }} />;
  else if (!me) body = (
    <View style={styles.card}>
      <Text style={styles.h1}>{t('guest_t')}</Text>
      <Text style={styles.text}>{t('guest_p')}</Text>
      <Button label={t('sign_in')} onPress={() => router.push('/sign-in')} />
    </View>
  );
  else if (me.needsOnboarding) body = <Onboarding onDone={refresh} />;
  else body = <Account />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      {body}
    </ScrollView>
  );
}

function Account() {
  const { me, refresh } = useMe();
  const p = me!.profile!;
  const confirmDelete = () => Alert.alert(t('delete_account'), t('delete_q'), [
    { text: t('cancel'), style: 'cancel' },
    { text: t('delete_account'), style: 'destructive', onPress: async () => { await api.deleteAccount().catch(() => {}); await signOut(); } },
  ]);
  return (
    <View style={{ gap: 14 }}>
      <Text style={styles.h1}>{p.name}</Text>
      <Text style={styles.text}>@{p.handle}  ·  {p.type === 'scout' ? t('scout') : t('creator')}</Text>
      {p.type === 'creator' ? (
        <Link href={`/creator/${p.handle}`} asChild><Pressable style={styles.row}><Text style={styles.rowText}>promovote.com/@{p.handle}</Text></Pressable></Link>
      ) : null}
      <View style={{ height: 12 }} />
      <Button label={t('sign_out')} ghost onPress={async () => { await signOut(); refresh(); }} />
      <Pressable onPress={confirmDelete} accessibilityRole="button" style={{ paddingVertical: 12 }}>
        <Text style={{ color: C.danger, fontWeight: '600', textAlign: 'center' }}>{t('delete_account')}</Text>
      </Pressable>
    </View>
  );
}

function Onboarding({ onDone }: { onDone: () => void }) {
  const [type, setType] = useState<'scout' | 'creator' | null>(null);
  const [handle, setHandle] = useState('');
  const [handleState, setHandleState] = useState<'idle' | 'ok' | 'bad'>('idle');
  const [name, setName] = useState('');
  const [d, setD] = useState({ day: '', month: '', year: '' });
  const [category, setCategory] = useState('');
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (handle.length < 3) return;
    const id = setTimeout(() => api.handle(handle).then((r) => setHandleState(r.available ? 'ok' : 'bad')).catch(() => {}), 300);
    return () => clearTimeout(id);
  }, [handle]);

  const handleStatus = handle.length < 3 ? 'idle' : handleState;

  const submit = async () => {
    setBusy(true); setErr('');
    try {
      await api.onboarding({
        accountType: type, handle, displayName: name, birthDay: +d.day, birthMonth: +d.month, birthYear: +d.year,
        category: type === 'creator' ? category : undefined, acceptTerms: terms, language: lang,
      });
      onDone();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('error'));
    } finally { setBusy(false); }
  };

  if (!type) return (
    <View style={{ gap: 14 }}>
      <Text style={styles.h1}>{t('sign_in_t')}</Text>
      <TypeCard title={t('scout')} text={t('scout_p')} onPress={() => setType('scout')} />
      <TypeCard title={t('creator')} text={t('creator_p')} onPress={() => setType('creator')} />
    </View>
  );
  return (
    <View style={{ gap: 14 }}>
      <Text style={styles.h1}>{type === 'scout' ? t('scout') : t('creator')}</Text>
      <Field label={t('handle')}>
        <TextInput value={handle} onChangeText={(v) => setHandle(v.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24))} style={styles.input}
          autoCapitalize="none" autoCorrect={false} placeholder="yourname" placeholderTextColor={C.muted} accessibilityLabel={t('handle')} />
        {handleStatus !== 'idle' ? <Text style={{ color: handleStatus === 'ok' ? C.lime : C.danger, marginTop: 6 }}>{handleStatus === 'ok' ? '✓' : '✗'} @{handle}</Text> : null}
      </Field>
      <Field label={t('name')}>
        <TextInput value={name} onChangeText={setName} style={styles.input} maxLength={80} accessibilityLabel={t('name')} />
      </Field>
      <Field label={t('birth')}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput value={d.day} onChangeText={(v) => setD({ ...d, day: v })} placeholder="DD" placeholderTextColor={C.muted} keyboardType="number-pad" maxLength={2} style={[styles.input, { flex: 1 }]} accessibilityLabel="Day" />
          <TextInput value={d.month} onChangeText={(v) => setD({ ...d, month: v })} placeholder="MM" placeholderTextColor={C.muted} keyboardType="number-pad" maxLength={2} style={[styles.input, { flex: 1 }]} accessibilityLabel="Month" />
          <TextInput value={d.year} onChangeText={(v) => setD({ ...d, year: v })} placeholder="YYYY" placeholderTextColor={C.muted} keyboardType="number-pad" maxLength={4} style={[styles.input, { flex: 1.6 }]} accessibilityLabel="Year" />
        </View>
      </Field>
      {type === 'creator' ? (
        <Field label={t('category')}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(['games', 'apps', 'shops'] as const).map((k) => <Pill key={k} label={t(k)} active={category === k} onPress={() => setCategory(k)} />)}
          </View>
        </Field>
      ) : null}
      <Pressable onPress={() => setTerms(!terms)} style={styles.check} accessibilityRole="checkbox" accessibilityState={{ checked: terms }}>
        <View style={[styles.box, terms && { backgroundColor: C.lime, borderColor: C.lime }]}>{terms ? <Text style={{ color: C.ink, fontWeight: '800' }}>✓</Text> : null}</View>
        <Text style={[styles.text, { flex: 1 }]}>{t('terms')}</Text>
      </Pressable>
      {err ? <Text style={{ color: C.danger }}>{err}</Text> : null}
      <Button label={t('create')} onPress={submit} disabled={busy || handleStatus !== 'ok' || !name || !terms || (type === 'creator' && !category)} />
      <Pressable onPress={() => setType(null)} style={{ paddingVertical: 8 }}><Text style={{ color: C.muted, textAlign: 'center' }}>{t('cancel')}</Text></Pressable>
    </View>
  );
}

function TypeCard({ title, text, onPress }: { title: string; text: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]} accessibilityRole="button">
      <Text style={styles.h2}>{title}</Text>
      <Text style={styles.text}>{text}</Text>
    </Pressable>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <View style={{ gap: 6 }}><Text style={styles.label}>{label}</Text>{children}</View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: 18, padding: 20, gap: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  h1: { color: C.text, fontSize: 28, fontWeight: '800' },
  h2: { color: C.text, fontSize: 20, fontWeight: '800' },
  text: { color: C.text2, fontSize: 15, lineHeight: 21 },
  label: { color: '#c9c6d8', fontSize: 14, fontWeight: '600' },
  input: { backgroundColor: C.surface, color: C.text, fontSize: 16, borderRadius: 12, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, paddingVertical: 12 },
  row: { backgroundColor: C.surface, borderRadius: 12, padding: 14 },
  rowText: { color: C.text, fontWeight: '600' },
  check: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: C.muted, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
});
