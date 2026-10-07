// Daily "Today's Drop is ready" reminder. Local only (no push server, no token leaves the phone).
// Asked after the first finished drop, never at launch. One scheduled reminder at most, at 6 pm local time.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { t } from './i18n';

const ID = 'daily-drop';

export async function reminderOn(): Promise<boolean> {
  if (Platform.OS === 'web') return true; // nothing to offer on web
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    return all.some((n) => n.identifier === ID);
  } catch { return true; }
}

/** Asks permission and schedules the daily reminder. Returns false if the user said no. */
export async function turnOnReminder(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
    if (status !== 'granted') return false;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('daily', { name: t('reminder_channel'), importance: Notifications.AndroidImportance.DEFAULT });
    }
    await Notifications.cancelScheduledNotificationAsync(ID).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: ID,
      content: { title: t('reminder_t'), body: t('reminder_p') },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 18, minute: 0, channelId: 'daily' },
    });
    return true;
  } catch { return false; }
}

export async function turnOffReminder() {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(ID).catch(() => {});
}
