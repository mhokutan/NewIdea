// The "More" menu on promos and creator pages: Report (with reasons) and Block, in one sheet whose content
// changes in place. iOS cannot stack a second modal while one closes, so a sign in step waits for onDismissed.
import { useRef, useState } from 'react';

import { api } from '@/lib/api';
import { asMember } from '@/lib/gate';
import { t } from '@/lib/i18n';
import { useMe } from '@/lib/use-me';
import { Sheet } from './Sheet';

type Key = Parameters<typeof t>[0];
const REASONS: [string, Key][] = [
  ['spam_or_scam', 'r_spam'], ['impersonation', 'r_impersonation'], ['hate_or_harassment', 'r_hate'], ['violence', 'r_violence'],
  ['nudity_or_sexual', 'r_sexual'], ['malicious_link', 'r_link'], ['copyright', 'r_copyright'], ['trademark', 'r_trademark'],
  ['minor', 'r_minor'], ['other', 'r_other'],
];
const PROFILE_REASONS = new Set(['spam_or_scam', 'impersonation', 'hate_or_harassment', 'nudity_or_sexual', 'malicious_link', 'trademark', 'minor', 'other']);

export function ReportMenu({ visible, onClose, kind, id, handle, onBlocked, onError }: {
  visible: boolean; onClose: () => void; kind: 'promo' | 'profile'; id: string; handle: string;
  onBlocked: () => void; onError?: () => void;
}) {
  const { me } = useMe();
  const [step, setStep] = useState<'menu' | 'report' | 'done'>('menu');
  const next = useRef<(() => void) | null>(null);
  const close = (then?: () => void) => { next.current = then || null; onClose(); };
  const dismissed = () => { setStep('menu'); const n = next.current; next.current = null; n?.(); };
  // Guests and users without a profile sign in first; the menu comes back afterwards on the same step.
  const member = (step2: 'report' | 'block', run: () => void) => {
    if (me?.profile) return run();
    close(() => asMember(step2 === 'report' ? () => {} : run));
  };
  const report = (reason: string) => member('report', async () => {
    try { await api.report(kind, id, reason); setStep('done'); } catch { close(onError); }
  });
  const block = () => member('block', () => close(async () => {
    try { await api.block(handle); onBlocked(); } catch { onError?.(); }
  }));

  const content = step === 'menu' ? {
    actions: [
      { label: t('report'), onPress: () => setStep('report') },
      { label: `${t('block')} @${handle}`, tone: 'danger' as const, onPress: block },
      { label: t('cancel'), onPress: () => close() },
    ],
  } : step === 'report' ? {
    title: t('report_t'),
    actions: [
      ...REASONS.filter(([code]) => kind === 'promo' || PROFILE_REASONS.has(code)).map(([code, key]) => ({ label: t(key), onPress: () => report(code) })),
      { label: t('cancel'), onPress: () => close() },
    ],
  } : {
    title: t('report_thanks_t'), text: t('report_thanks_p'),
    actions: [{ label: t('ok'), onPress: () => close() }],
  };
  return <Sheet visible={visible} {...content} onClose={() => close()} onDismissed={dismissed} />;
}
