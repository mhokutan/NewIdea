// Sign in: Apple (iOS) and Google (iOS and Android) with native sheets, both free.
// Email code sign in sits behind a "Continue with email" link. Until email sending is enabled the server
// only accepts it for the app review account; other emails get EMAIL_LOGIN_SOON.
import * as AppleAuthentication from 'expo-apple-authentication';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { api } from '@/lib/api';
import { authClient } from '@/lib/auth';
import { t } from '@/lib/i18n';
import { appleAvailable, EMAIL_LOGIN, googleAvailable, type Result, signInWithApple, signInWithGoogle } from '@/lib/social-sign-in';
import { C, F } from '@/lib/theme';
import { refreshMe } from '@/lib/use-me';
import { Icon } from '@/ui/Icon';
import { Button } from '@/ui/Pill';

export default function SignIn() {
  const [apple, setApple] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [emailOpen, setEmailOpen] = useState(EMAIL_LOGIN);
  useEffect(() => { appleAvailable().then(setApple); api.event('sign_in_view'); }, []);
  const google = googleAvailable();

  const done = async (r: Result) => {
    setBusy(false);
    // Close the modal instead of replacing it: replace stacked a second copy of the tabs (and its video
    // players) under the first one, which also broke the iOS share sheet.
    if (r.ok) {
      // Dismiss first, then load the account once the modal is gone: the account update can open the
      // onboarding sheet, and iOS refuses to show a sheet while this modal is still closing.
      api.event('sign_in_done');
      if (router.canDismiss()) router.dismiss(); else router.navigate('/');
      setTimeout(() => { refreshMe(); }, 600);
      return;
    }
    if (!r.cancelled) setErr(r.message || t('error'));
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
      <Pressable onPress={() => (router.canDismiss() ? router.dismiss() : router.navigate('/'))} style={styles.close} accessibilityRole="button" accessibilityLabel={t('not_now')} hitSlop={8}>
        <Text style={styles.closeText}>{t('not_now')}</Text>
      </Pressable>
      <View style={styles.box}>
        <Image source={require('../../assets/images/icon.png')} style={styles.logo} accessibilityIgnoresInvertColors accessibilityLabel="PromoVote" />
        <Text style={styles.title} accessibilityRole="header">{t('sign_in_t')}</Text>
        <View style={styles.values}>
          {([['chevrons', 'value_call'], ['ticket', 'value_result'], ['save', 'value_save']] as const).map(([icon, key]) => (
            <View key={key} style={styles.value}>
              <View style={styles.valueIcon}><Icon name={icon} size={16} color={C.lime} /></View>
              <Text style={styles.valueText}>{t(key)}</Text>
            </View>
          ))}
        </View>
        {apple ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
            cornerRadius={14}
            style={{ height: 52 }}
            onPress={async () => { setBusy(true); setErr(''); done(await signInWithApple()); }}
          />
        ) : null}
        {google ? (
          <Pressable onPress={async () => { setBusy(true); setErr(''); done(await signInWithGoogle()); }} disabled={busy}
            style={({ pressed }) => [styles.google, (pressed || busy) && { opacity: 0.7 }]} accessibilityRole="button">
            <Image source={require('../../assets/images/google-g.png')} style={{ width: 20, height: 20 }} accessibilityIgnoresInvertColors />
            <Text style={styles.googleText}>{t('with_google')}</Text>
          </Pressable>
        ) : null}
        {emailOpen ? <EmailCode onDone={done} /> : (
          <Pressable onPress={() => setEmailOpen(true)} style={styles.emailLink} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.emailLinkText}>{t('with_email')}</Text>
          </Pressable>
        )}
        {err ? <Text style={styles.err} accessibilityLiveRegion="polite">{err}</Text> : null}
        <Text style={styles.fine}>
          {t('legal_note')}{' '}
          <Text style={styles.fineLink} accessibilityRole="link" onPress={() => Linking.openURL('https://promovote.com/terms')}>{t('help_terms')}</Text>
          {'  ·  '}
          <Text style={styles.fineLink} accessibilityRole="link" onPress={() => Linking.openURL('https://promovote.com/privacy')}>{t('help_privacy')}</Text>
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

function EmailCode({ onDone }: { onDone: (r: Result) => void }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [err, setErr] = useState('');
  const clean = email.trim().toLowerCase();
  const send = async () => {
    if (!/^\S+@\S+\.\S+$/.test(clean)) return setErr(t('email'));
    const r = await authClient.emailOtp.sendVerificationOtp({ email: clean, type: 'sign-in' });
    if (r.error) return setErr(r.error.code === 'EMAIL_LOGIN_SOON' ? t('email_soon') : r.error.message || t('error'));
    setErr(''); setStep('code');
  };
  const verify = async () => {
    const r = await authClient.signIn.emailOtp({ email: clean, otp: code.trim() });
    onDone(r.error ? { ok: false, message: r.error.message } : { ok: true });
  };
  return (
    <View style={{ gap: 12, marginTop: 8 }}>
      {step === 'email' ? (
        <TextInput value={email} onChangeText={setEmail} placeholder={t('email')} placeholderTextColor={C.muted} style={styles.input}
          autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" accessibilityLabel={t('email')} />
      ) : (
        <TextInput value={code} onChangeText={setCode} placeholder={t('code')} placeholderTextColor={C.muted} style={[styles.input, styles.code]}
          keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={6} accessibilityLabel={t('code')} />
      )}
      {err ? <Text style={styles.err}>{err}</Text> : null}
      <Button label={step === 'email' ? t('send_code') : t('verify')} onPress={step === 'email' ? send : verify} ghost />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, justifyContent: 'center' },
  box: { padding: 24, gap: 14 },
  close: { position: 'absolute', top: Platform.OS === 'ios' ? 16 : 40, right: 16, minHeight: 44, justifyContent: 'center', paddingHorizontal: 8, zIndex: 2 },
  closeText: { color: C.text2, fontSize: 16, fontWeight: '600' },
  logo: { width: 64, height: 64, borderRadius: 16, marginBottom: 4 },
  values: { gap: 12, marginVertical: 8 },
  value: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  valueIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(198,255,61,0.12)', alignItems: 'center', justifyContent: 'center' },
  valueText: { color: C.text2, fontSize: 16, lineHeight: 22, flex: 1 },
  title: { color: C.text, fontSize: 30, ...F.display },
  text: { color: C.text2, fontSize: 16, lineHeight: 22, marginBottom: 6 },
  // Google branding guidelines: white button, #747775 border, standard G logo, "Continue with Google".
  google: { height: 52, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#747775', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  googleText: { color: '#1f1f1f', fontWeight: '500', fontSize: 17 },
  input: { backgroundColor: C.surface, color: C.text, fontSize: 17, borderRadius: 14, borderWidth: 1, borderColor: C.line, paddingHorizontal: 16, paddingVertical: 14 },
  code: { letterSpacing: 8, fontSize: 24, textAlign: 'center' },
  err: { color: C.danger, fontSize: 14 },
  emailLink: { alignSelf: 'center', paddingVertical: 10 },
  emailLinkText: { color: C.text2, fontSize: 15, fontWeight: '600', textDecorationLine: 'underline' },
  fineLink: { color: C.text2, textDecorationLine: 'underline' },
  fine: { color: C.muted, fontSize: 12, lineHeight: 17, marginTop: 6 },
});
