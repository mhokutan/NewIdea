// Extends app.json. Google sign in is added only when its iOS URL scheme exists
// (the reversed iOS OAuth client id from Google Cloud, set as GOOGLE_IOS_URL_SCHEME in EAS env).
import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const plugins = [...(config.plugins || [])];
  const iosUrlScheme = process.env.GOOGLE_IOS_URL_SCHEME;
  if (iosUrlScheme) plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme }]);
  return { ...(config as ExpoConfig), plugins };
};
