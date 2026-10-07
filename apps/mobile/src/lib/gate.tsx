// Account gate for scout actions (call, save, follow). Instead of failing silently it opens a sheet:
// guests sign in, signed in users without a profile finish onboarding, creators learn they cannot vote.
// The action the user wanted is kept and runs as soon as they are a scout.
import { router, usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { t } from './i18n';
import { useMe } from './use-me';
import { clearViewerState, loadViewerState } from './viewer-state';
import { Sheet } from '@/ui/Sheet';

type Reason = 'guest' | 'onboarding' | 'creator';
// Module state lives in plain objects: the React Compiler mishandles reassigned module level variables.
const queue: { action: (() => void) | null; needsScout: boolean; from: string | null } = { action: null, needsScout: true, from: null };
const host: { open: ((r: Reason | null) => void) | null } = { open: null };
const current: { loading: boolean; isScout: boolean; hasProfile: boolean; reason: Reason | null } = { loading: true, isScout: false, hasProfile: false, reason: 'guest' };

/** Runs the action for scouts, otherwise explains what is needed and keeps the action for later. */
export function asScout(action: () => void) {
  if (current.isScout) return action();
  // Still loading the session: keep the tap and decide once we know who this is.
  if (current.loading) { queue.action = action; queue.needsScout = true; return; }
  if (current.reason !== 'creator') { queue.action = action; queue.needsScout = true; }
  host.open?.(current.reason);
}

/** Same for actions any finished account can do (follow, report, block). */
export function asMember(action: () => void) {
  if (current.hasProfile) return action();
  queue.action = action; queue.needsScout = false;
  if (current.loading) return;
  host.open?.(current.reason === 'creator' ? 'guest' : current.reason);
}

export function GateHost() {
  const { loading, me, isScout } = useMe();
  const pathname = usePathname();
  const [reason, setReason] = useState<Reason | null>(null);
  // The sheet keeps its last content while it slides away, and the next screen opens only after it is gone.
  const [shown, setShown] = useState<Reason>('guest');
  const next = useRef<(() => void) | null>(null);
  const where = useRef(pathname);
  useEffect(() => { where.current = pathname; }, [pathname]);
  const handle = me?.profile?.handle;
  const hasProfile = !!me?.profile;

  useEffect(() => {
    host.open = (r) => {
      if (r) { setShown(r); queue.from = where.current; }
      setReason(r);
    };
    return () => { host.open = null; };
  }, []);
  useEffect(() => {
    Object.assign(current, { loading, isScout, hasProfile, reason: !me ? 'guest' : me.needsOnboarding ? 'onboarding' : isScout ? null : 'creator' });
    if (loading || !queue.action) return;
    // A tap made while loading, or while signed in without a profile, now gets its answer.
    if (hasProfile && (isScout || !queue.needsScout)) return;
    if (current.reason === 'creator' && queue.needsScout) { queue.action = null; setTimeout(() => host.open?.('creator'), 500); return; }
    if (current.reason) { const r = current.reason; setTimeout(() => host.open?.(r), 500); }
  }, [me, isScout, loading, hasProfile]);
  useEffect(() => {
    if (loading) return;
    if (handle) loadViewerState(); else clearViewerState();
  }, [handle, loading]);
  // Signed in and onboarded: go back to where the tap happened and run the call, save or follow.
  useEffect(() => {
    const a = queue.action;
    if (!a || !hasProfile || loading) return;
    queue.action = null;
    if (queue.needsScout && !isScout) return;
    const from = queue.from;
    queue.from = null;
    queueMicrotask(() => {
      host.open?.(null);
      if (from && from !== where.current) router.navigate(from as never);
      setTimeout(a, from && from !== where.current ? 350 : 0);
    });
  }, [isScout, hasProfile, loading]);

  const close = (then?: () => void) => {
    if (!then) queue.action = null;
    next.current = then || null;
    setReason(null);
  };
  const runNext = () => { const n = next.current; next.current = null; n?.(); };
  const content = {
    guest: { title: t('gate_guest_t'), text: t('gate_guest_p'), actions: [
      { label: t('sign_in'), tone: 'primary' as const, onPress: () => close(() => router.push('/sign-in')) },
      { label: t('not_now'), onPress: () => close() },
    ] },
    onboarding: { title: t('gate_onb_t'), text: t('gate_onb_p'), actions: [
      { label: t('finish_profile'), tone: 'primary' as const, onPress: () => close(() => router.navigate('/me')) },
      { label: t('not_now'), onPress: () => close() },
    ] },
    creator: { title: t('gate_creator_t'), text: t('gate_creator_p'), actions: [{ label: t('ok'), onPress: () => close() }] },
  }[shown];
  return <Sheet visible={!!reason} title={content.title} text={content.text} actions={content.actions} onClose={() => close()} onDismissed={runNext} />;
}
