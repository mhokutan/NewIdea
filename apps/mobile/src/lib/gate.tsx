// Account gate for scout actions (call, save, follow). Instead of failing silently it opens a sheet:
// guests sign in, signed in users without a profile finish onboarding, creators learn they cannot vote.
// The action the user wanted is kept and runs as soon as they are a scout.
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { t } from './i18n';
import { useMe } from './use-me';
import { clearViewerState, loadViewerState } from './viewer-state';
import { Sheet } from '@/ui/Sheet';

type Reason = 'guest' | 'onboarding' | 'creator';
// Module state lives in plain objects: the React Compiler mishandles reassigned module level variables.
const queue: { action: (() => void) | null; needsScout: boolean } = { action: null, needsScout: true };
const host: { open: ((r: Reason | null) => void) | null } = { open: null };
let current: { isScout: boolean; hasProfile: boolean; reason: Reason | null } = { isScout: false, hasProfile: false, reason: 'guest' };

/** Runs the action for scouts, otherwise explains what is needed and keeps the action for later. */
export function asScout(action: () => void) {
  if (current.isScout) return action();
  if (current.reason !== 'creator') { queue.action = action; queue.needsScout = true; }
  host.open?.(current.reason);
}

/** Same for actions any finished account can do (follow, report, block). */
export function asMember(action: () => void) {
  if (current.hasProfile) return action();
  queue.action = action; queue.needsScout = false;
  host.open?.(current.reason === 'creator' ? 'guest' : current.reason);
}

export function GateHost() {
  const { loading, me, isScout } = useMe();
  const [reason, setReason] = useState<Reason | null>(null);
  const handle = me?.profile?.handle;

  useEffect(() => {
    current = { isScout, hasProfile: !!me?.profile, reason: !me ? 'guest' : me.needsOnboarding ? 'onboarding' : isScout ? null : 'creator' };
    // Signed in but no profile yet, with an action waiting: ask to finish the profile right away.
    if (me?.needsOnboarding && queue.action) queueMicrotask(() => host.open?.('onboarding'));
  }, [me, isScout]);
  useEffect(() => { host.open = setReason; return () => { host.open = null; }; }, []);
  useEffect(() => {
    if (loading) return;
    if (handle) loadViewerState(); else clearViewerState();
  }, [handle, loading]);
  // Signed in and onboarded: run the call, save or follow the user tapped before.
  const hasProfile = !!me?.profile;
  useEffect(() => {
    const a = queue.action;
    if (!a || !hasProfile) return;
    queue.action = null;
    if (queue.needsScout && !isScout) return;
    queueMicrotask(() => { host.open?.(null); a(); });
  }, [isScout, hasProfile]);

  const close = () => { setReason(null); if (reason === 'creator') queue.action = null; };
  if (reason === 'guest') return (
    <Sheet visible title={t('gate_guest_t')} text={t('gate_guest_p')} onClose={() => { queue.action = null; close(); }}
      actions={[{ label: t('sign_in'), tone: 'primary', onPress: () => { setReason(null); router.push('/sign-in'); } }, { label: t('not_now'), onPress: () => { queue.action = null; close(); } }]} />
  );
  if (reason === 'onboarding') return (
    <Sheet visible title={t('gate_onb_t')} text={t('gate_onb_p')} onClose={() => { queue.action = null; close(); }}
      actions={[{ label: t('finish_profile'), tone: 'primary', onPress: () => { setReason(null); router.navigate('/me'); } }, { label: t('not_now'), onPress: () => { queue.action = null; close(); } }]} />
  );
  if (reason === 'creator') return (
    <Sheet visible title={t('gate_creator_t')} text={t('gate_creator_p')} onClose={close} actions={[{ label: t('ok'), onPress: close }]} />
  );
  return null;
}
