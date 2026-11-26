// The pure part of the guest call sync (see guest-calls.ts), without Expo imports so `node --test` can run it
// (tests/guest-sync.test.mjs).

/** What happened to one kept call: saved to the account, settled (already called, promo gone), or try again later. */
export type SendOutcome = 'saved' | 'settled' | 'retry';

/** A failed send is tried again later only when the server never decided: no connection (status null), the session
 * changed under us (401, 403), too many requests (408, 429) or a server error. 400, 404 and 409 are final answers. */
export function retryLater(status: number | null) {
  return status === null || status === 401 || status === 403 || status === 408 || status === 429 || status >= 500;
}

/** Sends each kept call once. Returns how many were saved and the calls to keep for the next try. */
export async function sendAll<T>(list: T[], send: (g: T) => Promise<SendOutcome>) {
  let saved = 0;
  const kept: T[] = [];
  for (const g of list) {
    let r: SendOutcome;
    try { r = await send(g); } catch { r = 'retry'; }
    if (r === 'saved') saved++;
    else if (r === 'retry') kept.push(g);
  }
  return { saved, kept };
}

/** Wraps an async job so calls made while it runs share the same run instead of starting a second one. */
export function singleFlight<R>(job: () => Promise<R>) {
  const s: { p: Promise<R> | null } = { p: null };
  return () => {
    if (!s.p) s.p = job().finally(() => { s.p = null; });
    return s.p;
  };
}
