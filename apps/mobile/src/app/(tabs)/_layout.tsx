import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { t } from '@/lib/i18n';
import { C } from '@/lib/theme';

export default function TabsLayout() {
  return (
    <NativeTabs backgroundColor={C.bg} indicatorColor={C.surface2} tintColor={C.lime} labelStyle={{ color: C.muted, selected: { color: C.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{t('tab_feed')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'play.rectangle', selected: 'play.rectangle.fill' }} md="smart_display" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>{t('tab_explore')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="me">
        <NativeTabs.Trigger.Label>{t('tab_me')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} md="account_circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
