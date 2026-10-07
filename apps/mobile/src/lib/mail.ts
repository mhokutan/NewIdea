// Opens the mail app. Phones without a mail account (common on test devices) get the address copied instead.
import * as Clipboard from 'expo-clipboard';
import { Alert, Linking } from 'react-native';
import { t } from './i18n';

export async function openMail(to: string, subject?: string) {
  const url = `mailto:${to}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
  try {
    await Linking.openURL(url);
  } catch {
    await Clipboard.setStringAsync(to).catch(() => {});
    Alert.alert(t('mail_copied_t'), t('mail_copied_p').replace('{email}', to));
  }
}
