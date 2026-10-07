// "You called it" reveal: when calls resolved since the last visit, the feed greets the scout once with the
// result (the variable reward of the loop). Counts are kept on the device; nothing is sent anywhere.
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { t } from '@/lib/i18n';
import { getLocal, setLocal } from '@/lib/store';
import { useMe } from '@/lib/use-me';
import { useViewerState } from '@/lib/viewer-state';
import { Sheet } from './Sheet';

const KEY = 'pv_results_seen';

export function ResultReveal({ enabled }: { enabled: boolean }) {
  const { me } = useMe();
  const vs = useViewerState();
  const [news, setNews] = useState<{ right: number; total: number } | null>(null);
  const next = useRef<(() => void) | null>(null);
  const calls = Object.values(vs.calls);
  const total = calls.filter((c) => c.outcome && c.outcome !== 'pending').length;
  const right = calls.filter((c) => c.outcome === 'correct').length;
  const handle = me?.profile?.handle;

  useEffect(() => {
    if (!enabled || !handle || !total) return;
    let alive = true;
    getLocal(`${KEY}:${handle}`).then((raw) => {
      if (!alive) return;
      const seen = (() => { try { return raw ? JSON.parse(raw) as { right: number; total: number } : null; } catch { return null; } })();
      if (!seen) { setLocal(`${KEY}:${handle}`, JSON.stringify({ right, total })); return; } // first run: no backlog reveal
      if (total > seen.total) setNews({ right: Math.max(0, right - seen.right), total: total - seen.total });
    });
    return () => { alive = false; };
  }, [enabled, handle, total, right]);

  const close = (then?: () => void) => {
    if (handle) setLocal(`${KEY}:${handle}`, JSON.stringify({ right, total }));
    next.current = then || null;
    setNews(null);
  };
  const title = news?.right ? t('reveal_right_t').replace('{n}', String(news.right)) : t('reveal_t');
  const text = (news?.right ? t('reveal_right_p') : t('reveal_p')).replace('{n}', String(news?.total ?? 0));
  return (
    <Sheet visible={!!news} title={title} text={text} onClose={() => close()}
      onDismissed={() => { const n = next.current; next.current = null; n?.(); }}
      actions={[{ label: t('reveal_see'), tone: 'primary', onPress: () => close(() => router.navigate('/me')) }, { label: t('not_now'), onPress: () => close() }]} />
  );
}
