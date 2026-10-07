import { Pressable, Text } from 'react-native';
import { C, themed } from '@/lib/theme';

export function Pill({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!active }} android_ripple={{ color: C.line, borderless: false }}
      style={({ pressed }) => [styles.pill, active && styles.on, pressed && { opacity: 0.8 }]}>
      <Text style={[styles.text, active && styles.textOn]} maxFontSizeMultiplier={1.4}>{label}</Text>
    </Pressable>
  );
}

// onDark: the button sits on the always dark video feed, so the ghost style stays white in the light theme too.
export function Button({ label, onPress, ghost, disabled, onDark }: { label: string; onPress?: () => void; ghost?: boolean; disabled?: boolean; onDark?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} android_ripple={{ color: 'rgba(0,0,0,0.12)' }}
      style={({ pressed }) => [styles.btn, ghost && styles.ghost, ghost && onDark && { borderColor: 'rgba(255,255,255,0.22)' }, (pressed || disabled) && { opacity: 0.6 }]}>
      <Text style={[styles.btnText, ghost && { color: onDark ? '#fff' : C.text }]} maxFontSizeMultiplier={1.4}>{label}</Text>
    </Pressable>
  );
}

const styles = themed(() => ({
  pill: { minHeight: 40, justifyContent: 'center', overflow: 'hidden', paddingVertical: 9, paddingHorizontal: 16, borderRadius: 99, borderWidth: 1, borderColor: C.line },
  on: { backgroundColor: C.text, borderColor: C.text },
  text: { color: C.text2, fontWeight: '600', fontSize: 14 },
  textOn: { color: C.bg },
  btn: { overflow: 'hidden', minHeight: 48, justifyContent: 'center', backgroundColor: C.lime, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center' },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.line },
  btnText: { color: C.ink, fontWeight: '700', fontSize: 16 },
}));
