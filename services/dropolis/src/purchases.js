// Dropolis in-app purchases (owner decision 2026-11-21, Dropolis 1.1): receipt check and gem ledger.
// The store is the judge (Apple JWS signature chain or App Store Server API, Google Play Developer API); D1 table
// `purchases` is the ledger, so one store transaction grants once and belongs to one player only. No dependencies:
// X.509 (DER) parsing, ECDSA / RSA and JWT signing use WebCrypto. Secrets are read from env by name only:
//   APPLE_IAP_KEY_ID, APPLE_IAP_ISSUER_ID, APPLE_IAP_PRIVATE_KEY (App Store Server API, only for the receipt fallback)
//   GOOGLE_PLAY_SERVICE_ACCOUNT (service account JSON with access to the Play Console app)
// Answers follow the game's contract (docs/prompts/iap-server.md in mhokutan/NewRoboticGame): { "error": "<code>" }.

export const BUNDLE_ID = "com.promovote.dropolis";
export const PACKAGE_NAME = "com.promovote.dropolis";
// SHA-256 of Apple's "Apple Root CA - G3" certificate (https://www.apple.com/certificateauthority/), the root of
// every StoreKit 2 JWS. The last x5c certificate must be exactly this one.
export const APPLE_ROOT_G3_SHA256 = "63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179";
const OID_APPLE_LEAF = "1.2.840.113635.100.6.11.1"; // Apple receipt signing leaf marker
const OID_APPLE_WWDR = "1.2.840.113635.100.6.2.1"; // Apple WWDR intermediate marker

// Grant table (the server is the source of truth; the game shows the same table but applies what we return).
// usd: catalog list price for revenue reports (before store fees), owner approved 2026-11-21. The real price is set in
// App Store Connect and Play Console; change both places together.
export const PRODUCTS = {
  "dropolis.starter_pack": { oneTime: true, gems: 150, skin: "sky", cityCard: false, item: "starterPack", usd: 1.99 },
  "dropolis.city_card": { oneTime: true, gems: 0, skin: null, cityCard: true, item: "cityCard", usd: 4.99 },
  "dropolis.gems_s": { oneTime: false, gems: 80, skin: null, cityCard: false, item: null, usd: 0.99 },
  "dropolis.gems_m": { oneTime: false, gems: 450, skin: null, cityCard: false, item: null, usd: 4.99 },
  "dropolis.gems_l": { oneTime: false, gems: 1000, skin: null, cityCard: false, item: null, usd: 9.99 },
  "dropolis.gems_xl": { oneTime: false, gems: 2200, skin: null, cityCard: false, item: null, usd: 19.99 },
};
const grantOf = (p) => ({ gems: p.gems, skin: p.skin, cityCard: p.cityCard });
const itemsOf = (p) => JSON.stringify({ ...(p.item ? { [p.item]: true } : {}), ...(p.skin ? { skin: p.skin } : {}) });

export class StoreError extends Error {
  // kind: "invalid" (store says no, 402) or "unreachable" (try later, 503)
  constructor(kind, reason) { super(reason); this.kind = kind; this.reason = reason; }
}
const invalid = (reason) => new StoreError("invalid", reason);
const unreachable = (reason) => new StoreError("unreachable", reason);

// ---------- small helpers ----------
const enc = new TextEncoder(), dec = new TextDecoder();
const b64urlBytes = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64urlText = (s) => b64urlBytes(enc.encode(s));
function fromB64(s, url) {
  let t = String(s);
  if (url) t = t.replace(/-/g, "+").replace(/_/g, "/");
  t = t.padEnd(Math.ceil(t.length / 4) * 4, "=");
  return Uint8Array.from(atob(t), (c) => c.charCodeAt(0));
}
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const sha256hex = async (bytes) => hex(await crypto.subtle.digest("SHA-256", bytes));
const sameBytes = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
function pemToDer(pem) {
  const body = String(pem).replace(/\\n/g, "\n").replace(/-----[A-Z ]+-----/g, "").replace(/\s+/g, "");
  return fromB64(body, false);
}
async function fetchWithTimeout(url, init = {}, ms = 8000) {
  try { return await fetch(url, { ...init, signal: AbortSignal.timeout(ms) }); }
  catch (e) { throw unreachable(`network: ${e?.name || "error"}`); }
}

// ---------- DER / X.509 (only what the Apple chain needs) ----------
function tlv(b, off) {
  if (off + 2 > b.length) throw new Error("der_eof");
  const tag = b[off];
  let len = b[off + 1], p = off + 2;
  if (len & 0x80) {
    const n = len & 0x7f;
    if (n < 1 || n > 4 || p + n > b.length) throw new Error("der_len");
    len = 0;
    for (let i = 0; i < n; i++) len = len * 256 + b[p + i];
    p += n;
  }
  if (p + len > b.length) throw new Error("der_eof");
  return { tag, start: off, body: p, end: p + len };
}
function children(b, node) {
  const out = [];
  for (let p = node.body; p < node.end;) { const c = tlv(b, p); out.push(c); p = c.end; }
  return out;
}
function oidString(b, node) {
  const v = b.subarray(node.body, node.end);
  const parts = [Math.floor(v[0] / 40), v[0] % 40];
  let n = 0;
  for (let i = 1; i < v.length; i++) { n = n * 128 + (v[i] & 0x7f); if (!(v[i] & 0x80)) { parts.push(n); n = 0; } }
  return parts.join(".");
}
function derTime(b, node) {
  const s = dec.decode(b.subarray(node.body, node.end));
  const m = node.tag === 0x17 ? /^(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)Z$/.exec(s) : /^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)Z$/.exec(s);
  if (!m) throw new Error("der_time");
  let y = Number(m[1]);
  if (node.tag === 0x17) y += y < 50 ? 2000 : 1900;
  return Date.UTC(y, Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6]));
}
const CURVES = { "1.2.840.10045.3.1.7": { name: "P-256", size: 32 }, "1.3.132.0.34": { name: "P-384", size: 48 } };
const SIG_HASH = { "1.2.840.10045.4.3.2": "SHA-256", "1.2.840.10045.4.3.3": "SHA-384" };

export function parseCert(der) {
  const b = der;
  const cert = tlv(b, 0);
  if (cert.tag !== 0x30 || cert.end !== b.length) throw new Error("cert_shape");
  const [tbs, sigAlg, sigVal] = children(b, cert);
  if (!tbs || tbs.tag !== 0x30 || !sigAlg || !sigVal || sigVal.tag !== 0x03) throw new Error("cert_shape");
  const f = children(b, tbs);
  let i = f[0]?.tag === 0xa0 ? 1 : 0; // optional version
  const [, , issuer, validity, subject, spki] = f.slice(i, i + 6);
  if (!spki || spki.tag !== 0x30 || issuer.tag !== 0x30 || subject.tag !== 0x30) throw new Error("cert_shape");
  const [nb, na] = children(b, validity);
  const [spkiAlg] = children(b, spki);
  const [keyOid, curveOid] = children(b, spkiAlg);
  if (oidString(b, keyOid) !== "1.2.840.10045.2.1") throw new Error("cert_not_ec");
  const curve = CURVES[curveOid ? oidString(b, curveOid) : ""];
  if (!curve) throw new Error("cert_curve");
  const extOids = [];
  let isCA = false;
  const extWrap = f.find((x) => x.tag === 0xa3);
  if (extWrap) {
    for (const ext of children(b, children(b, extWrap)[0])) {
      const parts = children(b, ext);
      const oid = oidString(b, parts[0]);
      extOids.push(oid);
      if (oid === "2.5.29.19") { // basicConstraints: OCTET STRING { SEQUENCE { BOOLEAN cA ... } }
        const oct = parts[parts.length - 1];
        const seq = tlv(b, oct.body);
        const inner = children(b, seq);
        isCA = !!(inner[0] && inner[0].tag === 0x01 && b[inner[0].body] !== 0);
      }
    }
  }
  const bits = b.subarray(sigVal.body + 1, sigVal.end); // skip "unused bits" byte
  return {
    tbs: b.subarray(tbs.start, tbs.end),
    issuer: b.subarray(issuer.start, issuer.end),
    subject: b.subarray(subject.start, subject.end),
    notBefore: derTime(b, nb), notAfter: derTime(b, na),
    spki: b.subarray(spki.start, spki.end), curve,
    sigHash: SIG_HASH[oidString(b, children(b, sigAlg)[0])] || null,
    sigDer: bits, extOids, isCA,
  };
}
// ECDSA-Sig-Value (DER SEQUENCE of two INTEGERs) to the raw r||s WebCrypto wants.
function derSigToRaw(sig, size) {
  const seq = tlv(sig, 0);
  if (seq.tag !== 0x30 || seq.end !== sig.length) throw new Error("sig_shape");
  const ints = children(sig, seq);
  if (ints.length !== 2 || ints.some((x) => x.tag !== 0x02)) throw new Error("sig_shape");
  const out = new Uint8Array(size * 2);
  ints.forEach((x, k) => {
    let v = sig.subarray(x.body, x.end);
    while (v.length > size && v[0] === 0) v = v.subarray(1);
    if (v.length > size) throw new Error("sig_shape");
    out.set(v, k * size + (size - v.length));
  });
  return out;
}
async function issuedBy(child, parent) {
  if (!sameBytes(child.issuer, parent.subject) || !child.sigHash) return false;
  const key = await crypto.subtle.importKey("spki", parent.spki, { name: "ECDSA", namedCurve: parent.curve.name }, false, ["verify"]);
  return crypto.subtle.verify({ name: "ECDSA", hash: child.sigHash }, key, derSigToRaw(child.sigDer, parent.curve.size), child.tbs);
}

// StoreKit 2 JWS (jwsRepresentation, or signedTransactionInfo from the App Store Server API). Checks: ES256, x5c is
// leaf, intermediate, root; the root is pinned by SHA-256; each certificate signs the next one down; Apple's marker
// extensions are on the leaf and intermediate; all three are valid at the time Apple signed the JWS (signedDate),
// so an old but genuine transaction still restores after a leaf certificate rotates. Returns the payload.
export async function verifyAppleJWS(jws, { rootSha256 = APPLE_ROOT_G3_SHA256, now = Date.now() } = {}) {
  const parts = String(jws || "").split(".");
  if (parts.length !== 3) throw invalid("jws_shape");
  let header, payload;
  try {
    header = JSON.parse(dec.decode(fromB64(parts[0], true)));
    payload = JSON.parse(dec.decode(fromB64(parts[1], true)));
  } catch { throw invalid("jws_shape"); }
  const isObj = (o) => o !== null && typeof o === "object" && !Array.isArray(o);
  if (!isObj(header) || !isObj(payload)) throw invalid("jws_shape");
  if (header.alg !== "ES256" || !Array.isArray(header.x5c) || header.x5c.length !== 3) throw invalid("jws_header");
  let leaf, mid, root, rootDer;
  try {
    const ders = header.x5c.map((c) => fromB64(c, false));
    rootDer = ders[2];
    [leaf, mid, root] = ders.map(parseCert);
  } catch { throw invalid("jws_cert"); }
  if (await sha256hex(rootDer) !== rootSha256) throw invalid("jws_root");
  if (!mid.isCA || !root.isCA) throw invalid("jws_chain");
  if (!leaf.extOids.includes(OID_APPLE_LEAF) || !mid.extOids.includes(OID_APPLE_WWDR)) throw invalid("jws_chain");
  try {
    if (!await issuedBy(mid, root) || !await issuedBy(leaf, mid)) throw invalid("jws_chain");
  } catch (e) { throw e instanceof StoreError ? e : invalid("jws_chain"); }
  const at = Number(payload.signedDate);
  if (!Number.isFinite(at) || at > now + 5 * 60e3) throw invalid("jws_date");
  for (const c of [leaf, mid, root]) if (at < c.notBefore || at > c.notAfter) throw invalid("jws_cert_expired");
  if (leaf.curve.name !== "P-256") throw invalid("jws_chain");
  const key = await crypto.subtle.importKey("spki", leaf.spki, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  let sig;
  try { sig = fromB64(parts[2], true); } catch { throw invalid("jws_signature"); }
  if (sig.length !== 64) throw invalid("jws_signature");
  const ok = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, sig, enc.encode(`${parts[0]}.${parts[1]}`));
  if (!ok) throw invalid("jws_signature");
  return payload;
}

// ---------- Apple ----------
async function appleServerToken(env) {
  if (!env.APPLE_IAP_KEY_ID || !env.APPLE_IAP_ISSUER_ID || !env.APPLE_IAP_PRIVATE_KEY) throw unreachable("apple_not_configured");
  const key = await crypto.subtle.importKey("pkcs8", pemToDer(env.APPLE_IAP_PRIVATE_KEY), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const t = Math.floor(Date.now() / 1000);
  const head = b64urlText(JSON.stringify({ alg: "ES256", kid: env.APPLE_IAP_KEY_ID, typ: "JWT" }));
  const claims = b64urlText(JSON.stringify({ iss: env.APPLE_IAP_ISSUER_ID, iat: t, exp: t + 600, aud: "appstoreconnect-v1", bid: BUNDLE_ID }));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(`${head}.${claims}`));
  return `${head}.${claims}.${b64urlBytes(sig)}`;
}
// App Store Server API: production first, then sandbox (App Review and TestFlight buy in sandbox).
async function appleLookup(env, transactionId, opts) {
  const token = await appleServerToken(env);
  for (const host of ["https://api.storekit.itunes.apple.com", "https://api.storekit-sandbox.itunes.apple.com"]) {
    const r = await fetchWithTimeout(`${host}/inApps/v1/transactions/${encodeURIComponent(transactionId)}`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.status === 200) {
      const j = await r.json().catch(() => null);
      if (!j || !j.signedTransactionInfo) throw unreachable("apple_bad_answer");
      return verifyAppleJWS(j.signedTransactionInfo, opts);
    }
    if (r.status === 404) continue;
    if (r.status === 400) throw invalid("apple_bad_transaction_id");
    throw unreachable(`apple_http_${r.status}`); // 401 (key problem), 429, 5xx: keep and retry later
  }
  throw invalid("apple_not_found");
}
export async function checkApple(env, b, opts = {}) {
  const tx = b.jws ? await verifyAppleJWS(b.jws, opts) : await appleLookup(env, b.transactionId, opts);
  if (tx.bundleId !== BUNDLE_ID) throw invalid("bundle_id");
  if (tx.productId !== b.productId) throw invalid("product_id");
  if (String(tx.transactionId) !== b.transactionId) throw invalid("transaction_id");
  if (tx.revocationDate) throw invalid("revoked");
  if (tx.environment !== "Production" && tx.environment !== "Sandbox") throw invalid("environment");
  return {
    key: String(tx.transactionId), orderId: null,
    originalTransactionId: tx.originalTransactionId ? String(tx.originalTransactionId) : null,
    sandbox: tx.environment === "Sandbox", promo: false,
    accountToken: tx.appAccountToken ? String(tx.appAccountToken) : null, viaReceipt: !b.jws,
    familyShared: tx.inAppOwnershipType === "FAMILY_SHARED",
  };
}

// ---------- Google ----------
let googleToken = null; // { token, exp, email } cached per isolate
async function googleAccessToken(env) {
  let sa;
  try { sa = JSON.parse(env.GOOGLE_PLAY_SERVICE_ACCOUNT || ""); } catch { sa = null; }
  if (!sa || !sa.client_email || !sa.private_key) throw unreachable("google_not_configured");
  if (googleToken && googleToken.email === sa.client_email && googleToken.exp > Date.now() + 60e3) return googleToken.token;
  const tokenUri = sa.token_uri || "https://oauth2.googleapis.com/token";
  const key = await crypto.subtle.importKey("pkcs8", pemToDer(sa.private_key), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const t = Math.floor(Date.now() / 1000);
  const head = b64urlText(JSON.stringify({ alg: "RS256", typ: "JWT", ...(sa.private_key_id ? { kid: sa.private_key_id } : {}) }));
  const claims = b64urlText(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/androidpublisher", aud: tokenUri, iat: t, exp: t + 3600 }));
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(`${head}.${claims}`));
  const r = await fetchWithTimeout(tokenUri, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${head}.${claims}.${b64urlBytes(sig)}`,
  });
  const j = r.ok ? await r.json().catch(() => null) : null;
  if (!j || !j.access_token) throw unreachable(`google_token_http_${r.status}`);
  googleToken = { token: j.access_token, exp: Date.now() + (Number(j.expires_in) || 3600) * 1000, email: sa.client_email };
  return googleToken.token;
}
export const resetGoogleTokenCache = () => { googleToken = null; };

export async function checkGoogle(env, b) {
  const token = await googleAccessToken(env);
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/purchases/products/${encodeURIComponent(b.productId)}/tokens/${encodeURIComponent(b.purchaseToken)}`;
  const r = await fetchWithTimeout(url, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 400 || r.status === 404 || r.status === 410) throw invalid(`google_http_${r.status}`);
  if (r.status === 401) resetGoogleTokenCache();
  if (r.status !== 200) throw unreachable(`google_http_${r.status}`); // 401/403 (access not set up), 429, 5xx
  const p = await r.json().catch(() => null);
  if (!p) throw unreachable("google_bad_answer");
  if (p.purchaseState !== 0) throw invalid(p.purchaseState === 2 ? "pending" : "not_purchased");
  const orderId = p.orderId ? String(p.orderId) : null;
  // The game sends the order id, or the token itself when Google gave no order id.
  if (b.transactionId !== (orderId || b.purchaseToken) && b.transactionId !== b.purchaseToken) throw invalid("transaction_id");
  return {
    key: b.purchaseToken, orderId, originalTransactionId: null, sandbox: p.purchaseType === 0, promo: p.purchaseType === 1,
    accountToken: p.obfuscatedExternalAccountId ? String(p.obfuscatedExternalAccountId) : null, viaReceipt: false,
  };
}

// ---------- ledger ----------
const ERR = (json, status, error, reason) => json({ error, ...(reason ? { reason } : {}) }, status);
const str = (v, max) => (typeof v === "string" && v.length > 0 && v.length <= max ? v : null);

// Sandbox policy: App Review buys with sandbox accounts on the production build and TestFlight cannot be told apart
// from a sandbox build on the server, so the default accepts sandbox for everyone and stores it with sandbox = 1
// (never counted as revenue). IAP_SANDBOX = "testers" accepts it only for players with is_test = 1.
const sandboxAllowed = (env, me) => (env.IAP_SANDBOX || "all") === "all" || me.is_test === 1;

function answer(json, row, product, again) {
  return json({ ok: true, transactionId: row.client_transaction_id, productId: row.product_id, again, grant: grantOf(product), sandbox: row.sandbox === 1 });
}

export async function verifyPurchase(req, env, me, { json, readBody, appleOpts } = {}) {
  const db = env.DB;
  let b;
  try { b = await readBody(req, 256 * 1024); } catch { return ERR(json, 400, "bad_request"); }
  if (!b || typeof b !== "object" || Array.isArray(b)) return ERR(json, 400, "bad_request");
  const platform = b.platform === "ios" || b.platform === "android" ? b.platform : null;
  const product = PRODUCTS[b.productId] && Object.hasOwn(PRODUCTS, b.productId) ? PRODUCTS[b.productId] : null;
  const transactionId = str(b.transactionId, 200);
  const purchaseToken = str(b.purchaseToken, 2000);
  const jws = str(b.jws, 32 * 1024);
  const receipt = str(b.receipt, 200 * 1024);
  if (!platform || !product || !transactionId) return ERR(json, 400, "bad_request");
  if (platform === "android" && !purchaseToken) return ERR(json, 400, "bad_request");
  if (platform === "ios" && !jws && !receipt) return ERR(json, 400, "bad_request");
  const input = { platform, productId: b.productId, transactionId, purchaseToken, jws };
  const installId = str(b.installId, 100);

  // 1. Already in the ledger: the same answer again, or 409 when another player owns it. No store call needed, so a
  //    restore works even while the store is down.
  const key0 = platform === "android" ? purchaseToken : transactionId;
  const known = await db.prepare("select * from purchases where platform = ? and transaction_id = ?").bind(platform, key0).first();
  if (known) return ledgerAnswer(json, known, me, b.productId);

  // 2. Ask the store.
  let v;
  try { v = platform === "ios" ? await checkApple(env, input, appleOpts) : await checkGoogle(env, input); }
  catch (e) {
    if (e instanceof StoreError && e.kind === "invalid") return ERR(json, 402, "not_valid", e.reason);
    console.error("iap_store_unreachable", platform, e?.reason || e?.message);
    return ERR(json, 503, "store_unreachable");
  }
  if (v.sandbox && !sandboxAllowed(env, me)) return ERR(json, 402, "not_valid", "sandbox_not_allowed");
  // The store already told us (refund notification) that this transaction was refunded: never grant it.
  if (await db.prepare("select 1 as x from purchase_store_refunds where platform = ? and transaction_id = ?").bind(platform, v.key).first()) {
    return ERR(json, 402, "not_valid", "refunded");
  }
  const tomb = await tombstoneHash(platform, v.key);
  // iOS one time items are also tombstoned by original transaction id (a StoreKit 1 style restore makes a new id).
  const orig = platform === "ios" && v.originalTransactionId ? await tombstoneHash("ios-orig", v.originalTransactionId) : null;
  const tombstoned = !!await db.prepare("select 1 as x from purchase_tombstones where tx_hash = ? or (? is not null and tx_hash = ?)")
    .bind(tomb, product.oneTime ? orig : null, orig).first();

  // Account binding: the game passes the player id (user.id, a UUID) as appAccountToken (StoreKit) or
  // obfuscatedAccountId (Play Billing), so the store signs who bought it. A token for another player means the
  // purchase is that player's: 409. The receipt path (no JWS from the phone) only trusts a transactionId, so there the
  // token is required. A transaction whose first owner deleted the account can still be restored, without gems.
  const bound = v.accountToken ? v.accountToken.toLowerCase() === String(me.id).toLowerCase() : null;
  if (bound === false && !tombstoned) return ERR(json, 409, "owned_by_other");
  if (bound === null && v.viaReceipt && !tombstoned && env.IAP_RECEIPT_TOKEN !== "optional") return ERR(json, 402, "not_valid", "account_token_required");

  // 3. Write once. A one time item this player already owns (or an Apple transaction of the same original purchase,
  //    or a transaction whose owner deleted the account) is stored without gems and answered as "again".
  let restored = 0;
  if (v.originalTransactionId) {
    const sib = await db.prepare("select user_id from purchases where platform = 'ios' and original_transaction_id = ? and product_id = ? limit 1").bind(v.originalTransactionId, b.productId).first();
    if (sib && sib.user_id !== me.id) return ERR(json, 409, "owned_by_other");
    if (sib) restored = 1;
  }
  if (product.oneTime && !restored) {
    if (await db.prepare("select 1 as x from purchases where user_id = ? and product_id = ? and status = 'granted' limit 1").bind(me.id, b.productId).first()) restored = 1;
  }
  if (tombstoned) restored = 1;
  // Family Sharing: a family member gets the item, never the gems.
  if (v.familyShared) restored = 1;

  const price = v.sandbox || v.promo ? 0 : product.usd;
  const ins = await db.prepare(`insert into purchases (platform, transaction_id, client_transaction_id, order_id, original_transaction_id, user_id, product_id,
      gems, items, sandbox, status, price_usd, restored, install_id, created_at, tx_hash, orig_hash)
    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'granted', ?, ?, ?, ?, ?, ?) on conflict (platform, transaction_id) do nothing`)
    .bind(platform, v.key, transactionId, v.orderId, v.originalTransactionId, me.id, b.productId,
      restored ? 0 : product.gems, itemsOf(product), v.sandbox ? 1 : 0, price ?? null, restored, installId, new Date().toISOString(), tomb, orig).run();
  // Read back: when two requests race, only one insert wins and both answer from the stored row.
  const row = await db.prepare("select * from purchases where platform = ? and transaction_id = ?").bind(platform, v.key).first();
  if (row.user_id !== me.id) return ERR(json, 409, "owned_by_other");
  const won = ins.meta.changes === 1;
  return answer(json, row, product, restored === 1 || !won);
}

function ledgerAnswer(json, row, me, productId) {
  if (row.user_id !== me.id) return ERR(json, 409, "owned_by_other");
  if (row.product_id !== productId) return ERR(json, 402, "not_valid", "product_id");
  if (row.status !== "granted") return ERR(json, 402, "not_valid", row.status);
  return answer(json, row, PRODUCTS[row.product_id], true);
}

export async function listPurchases(env, me, { json }) {
  const { results } = await env.DB.prepare("select product_id, gems, client_transaction_id from purchases where user_id = ? and status = 'granted' order by created_at").bind(me.id).all();
  const items = { starterPack: false, cityCard: false };
  let gemsBought = 0;
  for (const r of results) {
    const p = PRODUCTS[r.product_id];
    if (p && p.item) items[p.item] = true;
    gemsBought += r.gems;
  }
  // accountToken: what the game passes to the store as appAccountToken / obfuscatedAccountId (the player id).
  return json({ items, gemsBought, transactions: results.map((r) => r.client_transaction_id), accountToken: me.id });
}

const tombstoneHash = (platform, key) => sha256hex(enc.encode(`dropolis-purchase:${platform}:${key}`));

// Account deletion: keep an anonymous total per day, product and platform for accounting, keep a hash of each
// transaction (so a deleted and recreated account can restore the item but never refill the gems), then delete the
// rows. Returns D1 statements for the deletion batch (one transaction).
export async function purchaseDeleteStatements(db, me) {
  const t = new Date().toISOString();
  const stmts = [
    db.prepare(`insert into purchase_deleted_totals (day, platform, product_id, sandbox, is_test, purchases, gems, usd)
      select substr(created_at, 1, 10), platform, product_id, sandbox, ?, count(*), sum(gems), sum(coalesce(price_usd, 0))
      from purchases where user_id = ? and status = 'granted' and restored = 0 group by 1, 2, 3, 4
      on conflict (day, platform, product_id, sandbox, is_test) do update set purchases = purchases + excluded.purchases,
        gems = gems + excluded.gems, usd = usd + excluded.usd`).bind(me.is_test === 1 ? 1 : 0, me.id),
  ];
  // Hashes come from the rows themselves inside this one batch (one transaction), so a purchase verified while the
  // account is being deleted is either tombstoned and deleted together, or not deleted at all.
  stmts.push(db.prepare("insert or ignore into purchase_tombstones (tx_hash, created_at) select tx_hash, ? from purchases where user_id = ?").bind(t, me.id));
  stmts.push(db.prepare("insert or ignore into purchase_tombstones (tx_hash, created_at) select orig_hash, ? from purchases where user_id = ? and orig_hash is not null").bind(t, me.id));
  stmts.push(db.prepare("delete from purchases where user_id = ?").bind(me.id));
  return stmts;
}
