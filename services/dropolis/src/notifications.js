// Dropolis refund notifications from the stores (Dropolis 1.1 in-app purchases).
//   Apple: App Store Server Notifications V2, POST /v1/store/apple/notifications, body { signedPayload }.
//   Google: Play Real-time developer notifications through a Pub/Sub push, POST /v1/store/google/rtdn.
// A refunded purchase is marked in the ledger (table `purchases`, status 'refunded'). Nothing here takes gems away
// from the game state; the row only records the refund so reports and the purchase list stay honest.
// Both endpoints answer 2xx for any well authenticated message we do not act on, because the stores retry on errors.
// No dependencies. The Apple check reuses verifyAppleJWS from purchases.js (certificate chain pinned to Apple's root).
// Secrets and settings are read from env by name only:
//   GOOGLE_RTDN_AUDIENCE (the audience set on the Pub/Sub push subscription), GOOGLE_RTDN_SA_EMAIL (the service
//   account email the push subscription signs with).
import { verifyAppleJWS, BUNDLE_ID, PACKAGE_NAME } from "./purchases.js";

const MAX_BODY = 64 * 1024;
const dec = new TextDecoder();

const ERR = (json, status, error) => json({ error }, status);

// Reads the body as JSON with a size cap. Returns the parsed value, or null when it is too big or not valid JSON.
async function readJson(req) {
  if (Number(req.headers.get("Content-Length") || 0) > MAX_BODY) return null; // refuse before reading it
  let text;
  try { text = await req.text(); } catch { return null; }
  if (text.length > MAX_BODY) return null;
  try { return JSON.parse(text); } catch { return null; }
}
const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

// Every refund is also remembered by transaction, so a purchase that reaches /v1/purchases/verify only after its
// refund (an old signed JWS from the phone) is refused there.
const rememberRefund = (db, platform, id, at) =>
  db.prepare("insert or ignore into purchase_store_refunds (platform, transaction_id, at) values (?, ?, ?)").bind(platform, id, at).run();

// ---------- Apple ----------
const APPLE_REFUND_TYPES = new Set(["REFUND", "REVOKE"]);

export async function appleNotification(req, env, { json, appleOpts } = {}) {
  const body = await readJson(req);
  if (!isObject(body) || typeof body.signedPayload !== "string" || !body.signedPayload) return ERR(json, 400, "bad_request");

  // Apple signs the whole notification. Anything that does not verify against Apple's chain is rejected.
  let note;
  try { note = await verifyAppleJWS(body.signedPayload, appleOpts); }
  catch { return ERR(json, 401, "bad_signature"); }

  const type = typeof note?.notificationType === "string" ? note.notificationType : "";
  const data = isObject(note?.data) ? note.data : {};
  // Another app's notification (or a malformed one): answer 200 so Apple stops retrying.
  if (data.bundleId !== BUNDLE_ID) return json({ ok: true, ignored: "bundle_id" });

  const isRefund = APPLE_REFUND_TYPES.has(type);
  if (!isRefund && type !== "REFUND_REVERSED") return json({ ok: true, ignored: type || "unknown" });

  // The transaction itself is a second signed JWS inside the notification.
  if (typeof data.signedTransactionInfo !== "string" || !data.signedTransactionInfo) return ERR(json, 400, "bad_request");
  let tx;
  try { tx = await verifyAppleJWS(data.signedTransactionInfo, appleOpts); }
  catch { return ERR(json, 401, "bad_signature"); }
  if (tx.bundleId !== BUNDLE_ID) return json({ ok: true, ignored: "bundle_id" });
  const id = tx.transactionId == null ? "" : String(tx.transactionId);
  if (!id) return ERR(json, 400, "bad_request");

  const now = new Date().toISOString();
  if (isRefund) {
    const r = await env.DB.prepare("update purchases set status = 'refunded', refunded_at = ? where platform = 'ios' and transaction_id = ? and status = 'granted'").bind(now, id).run();
    await rememberRefund(env.DB, "ios", id, now);
    return json({ ok: true, refunded: r.meta?.changes ?? 0 });
  }
  await env.DB.prepare("delete from purchase_store_refunds where platform = 'ios' and transaction_id = ?").bind(id).run();
  const r = await env.DB.prepare("update purchases set status = 'granted', refunded_at = null where platform = 'ios' and transaction_id = ? and status = 'refunded'").bind(id).run();
  return json({ ok: true, restored: r.meta?.changes ?? 0 });
}

// ---------- Google ----------
function decodeBase64Json(s) {
  if (typeof s !== "string" || !s) return null;
  try {
    const t = s.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(t.padEnd(Math.ceil(t.length / 4) * 4, "="));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return JSON.parse(dec.decode(bytes));
  } catch { return null; }
}

export async function googleNotification(req, env, { json, verifyGoogleToken } = {}) {
  if (!env.GOOGLE_RTDN_AUDIENCE || !env.GOOGLE_RTDN_SA_EMAIL) return ERR(json, 503, "not_configured");

  // Pub/Sub signs each push with an OIDC token of the service account set on the subscription.
  const m = /^Bearer\s+(\S+)$/i.exec(req.headers.get("Authorization") || "");
  if (!m) return ERR(json, 401, "unauthorized");
  let claims;
  try { claims = await verifyGoogleToken(m[1], [env.GOOGLE_RTDN_AUDIENCE]); }
  catch { return ERR(json, 401, "unauthorized"); }
  const verified = claims?.email_verified === true || claims?.email_verified === "true";
  if (!claims || claims.email !== env.GOOGLE_RTDN_SA_EMAIL || !verified) return ERR(json, 401, "unauthorized");

  const body = await readJson(req);
  if (!isObject(body) || !isObject(body.message)) return ERR(json, 400, "bad_request");
  const msg = decodeBase64Json(body.message.data);
  if (!isObject(msg)) return ERR(json, 400, "bad_request");

  if (msg.packageName !== PACKAGE_NAME) return json({ ok: true, ignored: "package_name" });
  const v = msg.voidedPurchaseNotification;
  if (!isObject(v)) return json({ ok: true, ignored: msg.testNotification ? "test" : "type" });
  const token = typeof v.purchaseToken === "string" ? v.purchaseToken : "";
  if (!token) return ERR(json, 400, "bad_request");

  const now = new Date().toISOString();
  const r = await env.DB.prepare("update purchases set status = 'refunded', refunded_at = ? where platform = 'android' and transaction_id = ? and status = 'granted'").bind(now, token).run();
  await rememberRefund(env.DB, "android", token, now);
  return json({ ok: true, refunded: r.meta?.changes ?? 0 });
}
