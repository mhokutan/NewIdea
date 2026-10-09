// Gift sheet: shows a creator's active gift and, after sign in, the code. Claiming never depends on calls
// or follows (server rule in services/api, "perks").
import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { openExternal } from '@/lib/links';
import { api, type Perk } from '@/lib/api';
import { asMember } from '@/lib/gate';
import { lang, t } from '@/lib/i18n';
import { C, R, F, themed } from '@/lib/theme';
import { useMe } from '@/lib/use-me';
import { Button } from './Pill';

const fmt = (s: string, v: Record<string, string | number>) => Object.entries(v).reduce((a, [k, x]) => a.replace(`{${k}}`, String(x)), s);

export function PerkSheet({ handle, name, visible, onClose, onReopen }: { handle: string; name: string; visible: boolean; onClose: () => void; onReopen?: () => void }) {
  const insets = useSafeAreaInsets();
  const { me } = useMe();
  const [perk, setPerk] = useState<Perk | null | undefined>(undefined);
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    api.creatorPerk(handle).then((r) => { if (alive) setPerk(r.perk); }).catch(() => { if (alive) setPerk(null); });
    return () => { alive = false; };
  }, [visible, handle]);

  const claim = async () => {
    if (!perk) return;
    // Guests sign in first. The gate sheet can only open once this sheet is gone (iOS stacks one modal at a time).
    if (!me?.profile) { signInNext.current = true; onClose(); return; }
    setErr('');
    try { const r = await api.claimPerk(perk.id); setCode(r.code); api.event('gift_claim'); } catch (e: any) { setErr(e?.message || t('error')); }
  };
  const signInNext = useRef(false);
  const afterClose = () => { if (signInNext.current) { signInNext.current = false; asMember(() => onReopen?.()); } };
  const was = useRef(visible);
  useEffect(() => {
    if (was.current && !visible && Platform.OS !== 'ios') afterClose();
    was.current = visible;
  });
  const copy = async () => { if (!code) return; await Clipboard.setStringAsync(code); setCopied(true); setTimeout(() => setCopied(false), 1800); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent onDismiss={Platform.OS === 'ios' ? afterClose : undefined}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('close')} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} accessibilityViewIsModal>
        <View style={styles.grab} />
        <Text style={styles.kicker}>{fmt(t('gift_t'), { name })}</Text>
        {perk === undefined ? <ActivityIndicator color={C.accent} style={{ marginVertical: 24 }} /> : !perk ? (
          <Text style={styles.text}>{t('gift_none')}</Text>
        ) : (
          <>
            <Text style={styles.title}>{perk.title}</Text>
            {perk.description ? <Text style={styles.text}>{perk.description}</Text> : null}
            <Text style={styles.small}>
              {fmt(t('gift_ends'), { date: new Date(perk.endsAt).toLocaleDateString(lang, { day: 'numeric', month: 'short' }) })}
              {perk.stockLeft != null ? `  ·  ${fmt(t('gift_left'), { n: perk.stockLeft })}` : ''}
            </Text>
            {code ? (
              <View style={{ gap: 10, marginTop: 6 }}>
                <Text style={styles.small}>{t('your_code')}</Text>
                <Pressable onPress={copy} style={styles.code} accessibilityRole="button" accessibilityLabel={`${t('your_code')} ${code}. ${t('copy')}`}>
                  <Text style={styles.codeText} selectable>{code}</Text>
                  <Text style={styles.copy}>{copied ? t('copied') : t('copy')}</Text>
                </Pressable>
                {perk.redeemUrl ? <Button label={t('open_link')} onPress={() => openExternal(perk.redeemUrl)} /> : null}
              </View>
            ) : (
              <View style={{ marginTop: 6 }}><Button label={t('get_code')} onPress={claim} /></View>
            )}
            {err ? <Text style={{ color: C.danger }}>{err}</Text> : null}
            <Text style={styles.rule}>{t('gift_rule')}</Text>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = themed(() => ({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg, paddingHorizontal: 20, paddingTop: 10, gap: 8 },
  grab: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: C.line, marginBottom: 10 },
  kicker: { color: C.accent, fontWeight: '700', fontSize: 13 },
  title: { color: C.text, fontSize: 22, ...F.display },
  text: { color: C.text2, fontSize: 15, lineHeight: 21 },
  small: { color: C.muted, fontSize: 13 },
  code: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, borderStyle: 'dashed', borderColor: C.lime, borderRadius: 14, paddingHorizontal: 16, minHeight: 56 },
  codeText: { color: C.text, fontSize: 22, fontWeight: '800', letterSpacing: 2 },
  copy: { color: C.accent, fontWeight: '700' },
  rule: { color: C.muted, fontSize: 12, marginTop: 8 },
}));
