// Bottom sheet used for sign in prompts, the promo menu and confirmations.
// iOS cannot present a new modal (sign in, edit profile) while this one is still closing, so navigation
// after a sheet goes through onDismissed, which fires once the sheet is fully gone.
import { useEffect, useRef } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@/lib/i18n';
import { C, R, F } from '@/lib/theme';

export type SheetAction = { label: string; onPress: () => void; tone?: 'primary' | 'danger' | 'plain' };

export function Sheet({ visible, title, text, actions, onClose, onDismissed }: {
  visible: boolean; title?: string; text?: string; actions: SheetAction[]; onClose: () => void; onDismissed?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const was = useRef(visible);
  const dismissed = useRef(onDismissed);
  useEffect(() => { dismissed.current = onDismissed; });
  // Android and web have no onDismiss; there the next screen can open right away.
  useEffect(() => {
    if (was.current && !visible && Platform.OS !== 'ios') dismissed.current?.();
    was.current = visible;
  }, [visible]);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent
      onDismiss={Platform.OS === 'ios' ? () => dismissed.current?.() : undefined}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('close')} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} accessibilityViewIsModal>
        <View style={styles.grab} />
        {title ? <Text style={styles.title} accessibilityRole="header">{title}</Text> : null}
        {text ? <Text style={styles.text}>{text}</Text> : null}
        <ScrollView style={{ maxHeight: height * 0.7 }} contentContainerStyle={{ gap: 10, marginTop: 8 }} bounces={false}>
          {actions.map((a) => (
            <Pressable key={a.label} onPress={a.onPress} accessibilityRole="button" android_ripple={{ color: 'rgba(255,255,255,0.12)' }}
              style={({ pressed }) => [styles.btn, a.tone === 'primary' && styles.primary, pressed && { opacity: 0.7 }]}>
              <Text maxFontSizeMultiplier={1.4} style={[styles.btnText, a.tone === 'primary' && { color: C.ink }, a.tone === 'danger' && { color: C.danger }]}>{a.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg, paddingHorizontal: 20, paddingTop: 10, gap: 6 },
  grab: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', marginBottom: 10 },
  title: { color: C.text, fontSize: 20, ...F.display },
  text: { color: C.text2, fontSize: 15, lineHeight: 21 },
  btn: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  primary: { backgroundColor: C.lime, borderColor: C.lime },
  btnText: { color: C.text, fontSize: 16, fontWeight: '700' },
});
