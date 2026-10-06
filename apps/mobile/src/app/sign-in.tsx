// Email code sign in. Apple and Google sign in come next (Apple requires Sign in with Apple
// as soon as any other social login is offered).
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { authClient } from '@/lib/auth';
import { t } from '@/lib/i18n';
import { C } from '@/lib/theme';
import { refreshMe } from '@/lib/use-me';
import { Button } from '@/ui/Pill';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const send = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr(t('email'));
    setBusy(true); setErr('');
    const r = await authClient.emailOtp.sendVerificationOtp({ email: email.trim().toLowerCase(), type: 'sign-in' });
    setBusy(false);
    if (r.error) return setErr(r.error.message || t('error'));
    setStep('code');
  };
  const verify = async () => {
    setBusy(true); setErr('');
    const r = await authClient.signIn.emailOtp({ email: email.trim().toLowerCase(), otp: code.trim() });
    setBusy(false);
    if (r.error) return setErr(r.error.message || t('error'));
    await refreshMe();
    router.replace('/me');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
      <View style={styles.box}>
        <Text style={styles.title}>{t('sign_in_t')}</Text>
        <Text style={styles.text}>{step === 'email' ? t('sign_in_p') : `${t('code_sent')} ${email}`}</Text>
        {step === 'email' ? (
          <TextInput value={email} onChangeText={setEmail} placeholder={t('email')} placeholderTextColor={C.muted} style={styles.input}
            autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" accessibilityLabel={t('email')} />
        ) : (
          <TextInput value={code} onChangeText={setCode} placeholder={t('code')} placeholderTextColor={C.muted} style={[styles.input, styles.code]}
            keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={6} accessibilityLabel={t('code')} />
        )}
        {err ? <Text style={styles.err} accessibilityLiveRegion="polite">{err}</Text> : null}
        <Button label={step === 'email' ? t('send_code') : t('verify')} onPress={step === 'email' ? send : verify} disabled={busy} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, justifyContent: 'center' },
  box: { padding: 24, gap: 14 },
  title: { color: C.text, fontSize: 30, fontWeight: '800' },
  text: { color: C.text2, fontSize: 16, lineHeight: 22 },
  input: { backgroundColor: C.surface, color: C.text, fontSize: 17, borderRadius: 14, borderWidth: 1, borderColor: C.line, paddingHorizontal: 16, paddingVertical: 14 },
  code: { letterSpacing: 8, fontSize: 24, textAlign: 'center' },
  err: { color: C.danger, fontSize: 14 },
});
