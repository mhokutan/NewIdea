// Offer a gift (modal, creators only): a code, a discount or a beta invite for scouts.
// One active gift per creator; starting a new one ends the old one. Gifts can never ask for votes or follows.
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api, ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { C } from '@/lib/theme';
import { Button, Pill } from '@/ui/Pill';

const KINDS = [['code', 'k_code'], ['discount', 'k_discount'], ['beta_invite', 'k_beta']] as const;
const DAYS = [7, 14, 30, 60];

export default function PerkScreen() {
  const insets = useSafeAreaInsets();
  const [kind, setKind] = useState<(typeof KINDS)[number][0]>('discount');
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [link, setLink] = useState('');
  const [days, setDays] = useState(30);
  const [stock, setStock] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const ready = title.trim().length >= 3 && code.trim().length >= 2;

  const submit = async () => {
    setBusy(true); setErr('');
    try {
      await api.createPerk({ kind, title: title.trim(), code: code.trim(), redeemUrl: link.trim() || undefined, days, stock: stock ? +stock : undefined });
      router.back();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('error'));
    } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: Platform.OS === 'ios' ? 20 : insets.top + 16, paddingBottom: insets.bottom + 40, gap: 16 }} keyboardShouldPersistTaps="handled">
        <View style={styles.top}>
          <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}><Text style={styles.cancel}>{t('cancel')}</Text></Pressable>
          <Text style={styles.title} accessibilityRole="header">{t('perk_t')}</Text>
          <View style={{ width: 60 }} />
        </View>
        <Text style={styles.text}>{t('perk_p')}</Text>
        <View style={styles.wrap}>{KINDS.map(([id, key]) => <Pill key={id} label={t(key)} active={kind === id} onPress={() => setKind(id)} />)}</View>
        <Field label={t('perk_title')}><TextInput value={title} onChangeText={setTitle} maxLength={60} style={styles.input} accessibilityLabel={t('perk_title')} /></Field>
        <Field label={t('perk_code')}><TextInput value={code} onChangeText={setCode} maxLength={64} autoCapitalize="characters" autoCorrect={false} style={styles.input} accessibilityLabel={t('perk_code')} /></Field>
        <Field label={t('perk_link')}><TextInput value={link} onChangeText={setLink} placeholder="https://" placeholderTextColor={C.muted} autoCapitalize="none" keyboardType="url" autoCorrect={false} style={styles.input} accessibilityLabel={t('perk_link')} /></Field>
        <Field label={t('perk_days')}><View style={styles.wrap}>{DAYS.map((d) => <Pill key={d} label={String(d)} active={days === d} onPress={() => setDays(d)} />)}</View></Field>
        <Field label={t('perk_stock')}><TextInput value={stock} onChangeText={(v) => setStock(v.replace(/\D/g, '').slice(0, 5))} keyboardType="number-pad" style={styles.input} accessibilityLabel={t('perk_stock')} /></Field>
        {err ? <Text style={{ color: C.danger }}>{err}</Text> : null}
        <Button label={t('perk_create')} onPress={submit} disabled={!ready || busy} />
        <Text style={styles.small}>{t('gift_rule')}</Text>
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
  label: { color: '#c9c6d8', fontSize: 14, fontWeight: '600' },
  input: { backgroundColor: C.surface, color: C.text, fontSize: 16, borderRadius: 12, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, paddingVertical: 12 },
  text: { color: C.text2, fontSize: 15, lineHeight: 21 },
  small: { color: C.muted, fontSize: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
