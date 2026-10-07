// Logo or profile photo. Falls back to the first letter when there is no photo or it fails to load.
import { Image } from 'expo-image';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { C, themed } from '@/lib/theme';

export function Avatar({ uri, mono, size = 40, radius }: { uri: string | null; mono?: string | null; size?: number; radius?: number }) {
  const r = radius ?? Math.round(size * 0.3);
  const [failed, setFailed] = useState<string | null>(null);
  if (uri && failed !== uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: r }} contentFit="cover" accessibilityIgnoresInvertColors onError={() => setFailed(uri)} />;
  }
  return (
    <View style={[styles.mono, { width: size, height: size, borderRadius: r }]}>
      <Text style={[styles.monoText, { fontSize: size * 0.46 }]} maxFontSizeMultiplier={1}>{(mono || '?').trim().slice(0, 1).toUpperCase()}</Text>
    </View>
  );
}

const styles = themed(() => ({
  mono: { backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  monoText: { color: C.text, fontWeight: '800' },
}));
