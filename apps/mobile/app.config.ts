// Extends app.json. Google sign in is added only when its iOS URL scheme exists
// (the reversed iOS OAuth client id from Google Cloud, set as GOOGLE_IOS_URL_SCHEME in EAS env).
import type { ConfigContext, ExpoConfig } from 'expo/config';
import { withEntitlementsPlist, type ConfigPlugin } from 'expo/config-plugins';

// expo-notifications adds the iOS push entitlement on its own. The app only schedules local reminders for now,
// so the entitlement is removed and the provisioning profile does not need the Push capability.
// Remove this plugin when server push ("your call resolved") ships.
const withoutPush: ConfigPlugin = (config) => withEntitlementsPlist(config, (c) => {
  delete c.modResults['aps-environment'];
  return c;
});

export default ({ config }: ConfigContext): ExpoConfig => {
  const plugins = [...(config.plugins || [])];
  const iosUrlScheme = process.env.GOOGLE_IOS_URL_SCHEME;
  if (iosUrlScheme) plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme }]);
  return withoutPush({ ...(config as ExpoConfig), plugins });
};
