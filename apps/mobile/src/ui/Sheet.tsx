// Bottom sheet used for sign in prompts, the promo menu and confirmations.
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, R } from '@/lib/theme';

export type SheetAction = { label: string; onPress: () => void; tone?: 'primary' | 'danger' | 'plain' };

export function Sheet({ visible, title, text, actions, onClose }: {
  visible: boolean; title?: string; text?: string; actions: SheetAction[]; onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} accessibilityViewIsModal>
        <View style={styles.grab} />
        {title ? <Text style={styles.title} accessibilityRole="header">{title}</Text> : null}
        {text ? <Text style={styles.text}>{text}</Text> : null}
        <View style={{ gap: 10, marginTop: 8 }}>
          {actions.map((a) => (
            <Pressable key={a.label} onPress={a.onPress} accessibilityRole="button"
              style={({ pressed }) => [styles.btn, a.tone === 'primary' && styles.primary, pressed && { opacity: 0.7 }]}>
              <Text style={[styles.btnText, a.tone === 'primary' && { color: C.ink }, a.tone === 'danger' && { color: C.danger }]}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg, paddingHorizontal: 20, paddingTop: 10, gap: 6 },
  grab: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', marginBottom: 10 },
  title: { color: C.text, fontSize: 20, fontWeight: '800' },
  text: { color: C.text2, fontSize: 15, lineHeight: 21 },
  btn: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  primary: { backgroundColor: C.lime, borderColor: C.lime },
  btnText: { color: C.text, fontSize: 16, fontWeight: '700' },
});
