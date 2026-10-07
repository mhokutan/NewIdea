// Help and legal block (Apple 1.2 contact info, 5.1.1 privacy policy link). Visible to guests too.
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { t } from '@/lib/i18n';
import { openMail } from '@/lib/mail';
import { C } from '@/lib/theme';

const LINKS: [Parameters<typeof t>[0], string][] = [
  ['help_contact', 'support@promovote.com'],
  ['help_terms', 'https://promovote.com/terms'],
  ['help_privacy', 'https://promovote.com/privacy'],
  ['help_guidelines', 'https://promovote.com/guidelines'],
];

export function LegalLinks() {
  return (
    <View style={styles.box}>
      <Text style={styles.h}>{t('help_title')}</Text>
      {LINKS.map(([key, url]) => (
        <Pressable key={key} onPress={() => (url.startsWith('https://') ? Linking.openURL(url) : openMail(url))} accessibilityRole="link" style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
          <Text style={styles.text}>{t(key)}</Text>
          <Text style={styles.arrow}>›</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: 28, gap: 2 },
  h: { color: C.muted, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  row: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  text: { color: C.text, fontSize: 16 },
  arrow: { color: C.muted, fontSize: 22 },
});
