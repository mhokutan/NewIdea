// Uploads an .aab to a Google Play track with the Play Developer API (no extra packages).
// Usage: node play-upload.mjs <file.aab> <track> ; env GOOGLE_PLAY_SA_JSON = service account JSON, PACKAGE = app id.
// While the app has never been reviewed, Play accepts only draft releases from the API: then the release is saved as
// a draft and has to be sent for review in Play Console.
import crypto from 'node:crypto';
import fs from 'node:fs';

const [file, track = 'alpha'] = process.argv.slice(2);
const pkg = process.env.PACKAGE || 'com.miapera.promovote';
const sa = JSON.parse(process.env.GOOGLE_PLAY_SA_JSON || '{}');
if (!file || !sa.client_email || !sa.private_key) throw new Error('Need the .aab path and GOOGLE_PLAY_SA_JSON.');

const b64u = (x) => Buffer.from(x).toString('base64url');
async function token() {
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64u(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const sig = crypto.sign('RSA-SHA256', Buffer.from(`${head}.${claim}`), sa.private_key).toString('base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${claim}.${sig}` }) });
  const j = await r.json();
  if (!j.access_token) throw new Error('Google token failed: ' + (j.error_description || j.error));
  return j.access_token;
}

const auth = { Authorization: `Bearer ${await token()}` };
const base = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${pkg}`;
async function call(url, init = {}) {
  const r = await fetch(url, { ...init, headers: { ...auth, ...(init.headers || {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(`${r.status} ${j.error?.message || ''}`); e.msg = j.error?.message || ''; throw e; }
  return j;
}

async function release(status) {
  const edit = await call(`${base}/edits`, { method: 'POST' });
  const bundle = await call(`https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${pkg}/edits/${edit.id}/bundles?uploadType=media`,
    { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: fs.readFileSync(file) });
  console.log('Uploaded versionCode', bundle.versionCode);
  await call(`${base}/edits/${edit.id}/tracks/${track}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ track, releases: [{ versionCodes: [String(bundle.versionCode)], status,
      releaseNotes: [{ language: 'en-US', text: process.env.RELEASE_NOTES || 'Bug fixes and improvements.' }] }] }) });
  await call(`${base}/edits/${edit.id}:commit`, { method: 'POST' });
  console.log(`Release on track "${track}" saved as ${status}.`);
}

try {
  await release('completed');
} catch (e) {
  if (!/draft/i.test(e.msg)) throw e;
  console.log('Play accepts only a draft release for this app yet; saving as draft.');
  await release('draft');
}
