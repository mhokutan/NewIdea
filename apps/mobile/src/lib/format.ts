// Short counts for profile stats and tiles: 999, 1.2K, 12K, 1.2M.
export function compact(n: number | null | undefined): string {
  const v = Math.max(0, Math.floor(n || 0));
  if (v < 1000) return String(v);
  const [d, s] = v < 1e6 ? [1e3, 'K'] : [1e6, 'M'];
  const x = v / d;
  return (x < 10 ? Math.floor(x * 10) / 10 : Math.floor(x)).toString().replace(/\.0$/, '') + s;
}
