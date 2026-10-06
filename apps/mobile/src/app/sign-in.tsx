// Sign in: Apple (iOS) and Google (iOS and Android) with native sheets, both free.
// Email code sign in stays available behind EXPO_PUBLIC_EMAIL_LOGIN=1 until email sending is enabled.
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { authClient } from '@/lib/auth';
import { t } from '@/lib/i18n';
import { appleAvailable, EMAIL_LOGIN, googleAvailable, type Result, signInWithApple, signInWithGoogle } from '@/lib/social-sign-in';
import { C } from '@/lib/theme';
import { refreshMe } from '@/lib/use-me';
import { Button } from '@/ui/Pill';

export default function SignIn() {
  const [apple, setApple] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { appleAvailable().then(setApple); }, []);
  const google = googleAvailable();

  const done = async (r: Result) => {
    setBusy(false);
    if (r.ok) { await refreshMe(); router.replace('/me'); return; }
    if (!r.cancelled) setErr(r.message || t('error'));
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
      <View style={styles.box}>
        <Text style={styles.title}>{t('sign_in_t')}</Text>
        <Text style={styles.text}>{t('sign_in_p')}</Text>
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
            <Text style={styles.googleG}>G</Text>
            <Text style={styles.googleText}>{t('with_google')}</Text>
          </Pressable>
        ) : null}
        {EMAIL_LOGIN ? <EmailCode onDone={done} /> : null}
        {!apple && !google && !EMAIL_LOGIN ? <Text style={styles.text}>{t('soon_login')}</Text> : null}
        {err ? <Text style={styles.err} accessibilityLiveRegion="polite">{err}</Text> : null}
        <Text style={styles.fine}>{t('legal_note')}</Text>
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
    if (r.error) return setErr(r.error.message || t('error'));
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
  title: { color: C.text, fontSize: 30, fontWeight: '800' },
  text: { color: C.text2, fontSize: 16, lineHeight: 22, marginBottom: 6 },
  google: { height: 52, borderRadius: 14, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  googleG: { color: '#4285F4', fontWeight: '800', fontSize: 20 },
  googleText: { color: '#1f1f1f', fontWeight: '600', fontSize: 17 },
  input: { backgroundColor: C.surface, color: C.text, fontSize: 17, borderRadius: 14, borderWidth: 1, borderColor: C.line, paddingHorizontal: 16, paddingVertical: 14 },
  code: { letterSpacing: 8, fontSize: 24, textAlign: 'center' },
  err: { color: C.danger, fontSize: 14 },
  fine: { color: C.muted, fontSize: 12, lineHeight: 17, marginTop: 6 },
});
