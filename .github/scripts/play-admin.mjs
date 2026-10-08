// Google Play status and release tools for GitHub Actions (no extra packages).
// node play-admin.mjs status            prints every track and release as GitHub notices (readable in the run's annotations)
// node play-admin.mjs release <code> <track>   puts versionCode <code> on <track> as a full release (falls back to draft
//                                               while Play only accepts drafts for this app)
// env GOOGLE_PLAY_SA_JSON = service account JSON, PACKAGE = app id.
import crypto from 'node:crypto';

const [cmd = 'status', code, track = 'alpha'] = process.argv.slice(2);
const pkg = process.env.PACKAGE || 'com.miapera.promovote';
const sa = JSON.parse(process.env.GOOGLE_PLAY_SA_JSON || '{}');
if (!sa.client_email || !sa.private_key) throw new Error('GOOGLE_PLAY_SA_JSON is missing.');
const note = (m) => console.log(`::notice::${m}`);

const b64u = (x) => Buffer.from(x).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const head = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
const claim = b64u(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
const sig = crypto.sign('RSA-SHA256', Buffer.from(`${head}.${claim}`), sa.private_key).toString('base64url');
const tok = await (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${claim}.${sig}` }) })).json();
if (!tok.access_token) throw new Error('Google token failed: ' + (tok.error_description || tok.error));
const base = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${pkg}`;
async function call(url, init = {}) {
  const r = await fetch(url, { ...init, headers: { Authorization: `Bearer ${tok.access_token}`, 'Content-Type': 'application/json', ...(init.headers || {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(`${r.status} ${j.error?.message || ''}`); e.msg = j.error?.message || ''; throw e; }
  return j;
}

const edit = await call(`${base}/edits`, { method: 'POST' });
if (cmd === 'status') {
  const { tracks = [] } = await call(`${base}/edits/${edit.id}/tracks`);
  for (const t of tracks) {
    if (!t.releases?.length) { note(`track ${t.track}: empty`); continue; }
    for (const r of t.releases) note(`track ${t.track}: release "${r.name || ''}" versionCodes ${(r.versionCodes || []).join(',')} status ${r.status}`);
  }
  await call(`${base}/edits/${edit.id}`, { method: 'DELETE' });
} else if (cmd === 'release') {
  const put = (status) => call(`${base}/edits/${edit.id}/tracks/${track}`, { method: 'PUT',
    body: JSON.stringify({ track, releases: [{ versionCodes: [String(code)], status }] }) });
  let status = 'completed';
  try { await put(status); } catch (e) { if (!/draft/i.test(e.msg)) throw e; status = 'draft'; await put(status); }
  try { await call(`${base}/edits/${edit.id}:commit`, { method: 'POST' }); }
  catch (e) { note(`commit failed: ${e.message}`); throw e; }
  note(`versionCode ${code} on track ${track} saved as ${status}` + (status === 'draft' ? ' (Play accepts only drafts for this app yet: send it for review in Play Console)' : ' (sent for review automatically)'));
} else throw new Error('Unknown command ' + cmd);
