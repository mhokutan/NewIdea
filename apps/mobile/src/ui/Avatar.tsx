import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { C } from '@/lib/theme';

export function Avatar({ uri, mono, size = 40, radius }: { uri: string | null; mono?: string | null; size?: number; radius?: number }) {
  const r = radius ?? Math.round(size * 0.3);
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: r }} contentFit="cover" accessibilityIgnoresInvertColors />;
  return (
    <View style={[styles.mono, { width: size, height: size, borderRadius: r }]}>
      <Text style={[styles.monoText, { fontSize: size * 0.48 }]}>{(mono || '?').slice(0, 1)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mono: { backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center' },
  monoText: { color: C.ink, fontWeight: '800' },
});
