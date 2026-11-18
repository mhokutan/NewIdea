#!/usr/bin/env python3
"""Daily founder videos: from the branch `videos/daily` to PromoVote, TikTok and X (founder 2026-11-17).

The video session ("Günlük Video (HyperFrames)") pushes videos/daily/out/<YYYY-MM-DD>/<app>.mp4 + <app>.json every day
(app = haulingempire, poleris, dovelet, dropolis, promovote; json: title <= 60, description <= 280, hashtags <= 2, no links).
This script, run from the repo root in the cloud session with CLOUDFLARE_API_TOKEN set:
  1. reads the day's files from origin/videos/daily (no checkout), checks them (H.264, 10 to 30 s, 9:16, no links),
  2. makes a 720x1280 copy and a poster, uploads all files to R2 promovote-media under daily/<date>/ through
     PUT https://api.promovote.com/v1/admin/ingest (one-time Worker secret INGEST_TOKEN, renewed before and after),
  3. adds one live promo per product app on its founder account in promovote-db (not for "promovote" itself),
  4. queues every video for TikTok (promovote-waitlist tiktok_queue; promovote-landing sends drafts at 21:17 UTC),
  5. queues one X video post at 22:00 UTC (product rotates by day).
Safe to run twice: products already added that day are skipped.

Usage: python3 scripts/daily_ingest.py [YYYY-MM-DD] [--dry-run]
"""
import json, os, re, secrets, subprocess, sys, tempfile, time, uuid
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API_DIR = ROOT / "services/api"
LANDING_DIR = ROOT / "web/landing"
NS = uuid.UUID("6f1c2b0e-5d1a-4c7e-9a43-70726f6d6f76")
APPS = {
    "haulingempire": ("app_store", "https://apps.apple.com/us/app/hauling-empire-truck-tycoon/id6815224121"),
    "poleris": ("app_store", "https://apps.apple.com/us/app/poleris-manifest-rituals/id6792844860"),
    "dovelet": ("app_store", "https://apps.apple.com/us/app/dovelet-for-couples/id6824002542"),  # Android gets Google Play from the profile link
    "dropolis": ("google_play", "https://play.google.com/store/apps/details?id=com.promovote.dropolis"),
    "promovote": None,  # TikTok and X only
}
ALIASES = {"hauling-empire": "haulingempire"}  # file names the video session uses
TIKTOK_ON = False  # founder 2026-11-18: no TikTok posting; the connection is paused (tiktok_auth id paused-2026-11-18)
GOOGLE_ONLY = {"dropolis"}  # not on the App Store (Dovelet is since 2026-11-16)
X_ROTATION = ["haulingempire", "dropolis", "poleris", "dovelet", "promovote"]
q = lambda v: "null" if v is None else "'" + str(v).replace("'", "''") + "'"
LINK = re.compile(r"https?://|www\.|\.com\b|\.app\b", re.I)


def sh(cmd, cwd=None, inp=None, check=True):
    r = subprocess.run(cmd, cwd=cwd, input=inp, capture_output=True, text=True)
    if check and r.returncode:
        raise RuntimeError(f"{' '.join(cmd[:4])}: {r.stderr[-400:]}")
    return r.stdout


def d1(db, sql_or_file, cwd, json_out=False):
    args = ["npx", "wrangler", "d1", "execute", db, "--remote"]
    args += ["--file", sql_or_file] if sql_or_file.endswith(".sql") else ["--command", sql_or_file]
    if json_out:
        args.append("--json")
    out = sh(args, cwd=cwd)
    return json.loads(out) if json_out else out


def probe(path):
    j = json.loads(sh(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height:format=duration", "-of", "json", str(path)]))
    v = next((s for s in j["streams"] if s["codec_type"] == "video"), None)
    return v, float(j["format"]["duration"]), any(s["codec_type"] == "audio" for s in j["streams"])


def normalize(meta):
    """Accepts {title, description} or the video session's {caption}; hashtags with or without #."""
    m = dict(meta)
    cap = str(m.get("caption") or "").strip()
    if not m.get("description") and cap:
        m["description"] = cap
    if not m.get("title") and cap:
        first = re.split(r"(?<=[.?!])\s", cap, maxsplit=1)[0].strip()
        if first.lower().startswith("did you know?") and len(cap) > len(first):
            first = re.split(r"(?<=[.?!])\s", cap[len(first):].strip(), maxsplit=1)[0].strip()
        if len(first) > 60:
            head = first[:60]
            cut = max(head.rfind(","), head.rfind(":"), head.rfind(";"))
            first = head[:cut].strip() if cut >= 15 else head[:59].rsplit(" ", 1)[0].rstrip(",;:") + "…"
        m["title"] = first
    m["hashtags"] = [str(t).lstrip("#") for t in (m.get("hashtags") or [])]
    return m


def check(app, meta, mp4):
    errs = []
    if ALIASES.get(meta.get("app"), meta.get("app")) not in (None, app):
        errs.append("app name mismatch")
    t, d, tags = str(meta.get("title", "")).strip(), str(meta.get("description", "")).strip(), meta.get("hashtags") or []
    if not t or len(t) > 60: errs.append("title length")
    if not d or len(d) > 280: errs.append("description length")
    if len(tags) > 2 or any(not re.fullmatch(r"[A-Za-z0-9_]{2,30}", str(x).lstrip("#")) for x in tags): errs.append("hashtags")
    if LINK.search(t + " " + d): errs.append("link in text")
    if app in GOOGLE_ONLY and re.search(r"app store|iphone|ios", t + " " + d, re.I): errs.append("App Store claim for a Google Play only app")
    v, dur, audio = probe(mp4)
    if not v or v["codec_name"] != "h264": errs.append("not H.264")
    elif abs(v["width"] / v["height"] - 9 / 16) > 0.02: errs.append(f"not 9:16 ({v['width']}x{v['height']})")
    if not 10 <= dur <= 30.5: errs.append(f"duration {dur:.1f} s")
    if mp4.stat().st_size > 60 * 1024 * 1024: errs.append("file over 60 MB")
    return errs, dur


def upload(token, key, path):
    # curl, not urllib: it already uses the session proxy and its CA bundle.
    for attempt in range(6):
        r = subprocess.run(["curl", "-sS", "-X", "PUT", "--data-binary", f"@{path}", "-H", f"X-Ingest-Token: {token}",
                            "-H", "Content-Type: application/octet-stream", "-o", "/dev/null", "-w", "%{http_code}",
                            f"https://api.promovote.com/v1/admin/ingest?key={key}"], capture_output=True, text=True)
        code = r.stdout.strip()
        if code == "201":
            return f"https://api.promovote.com/media/{key}"
        if code in ("401", "000", "502", "503", "504") and attempt < 5:  # new secret still spreading, or a network blip
            time.sleep(8)
            continue
        raise RuntimeError(f"upload {key}: {code} {r.stderr[-200:]}")


def set_token(value):
    sh(["npx", "wrangler", "secret", "put", "INGEST_TOKEN"], cwd=API_DIR, inp=value)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry-run" in sys.argv
    day = args[0] if args else date.today().isoformat()
    assert re.fullmatch(r"\d{4}-\d{2}-\d{2}", day)
    sh(["git", "fetch", "-q", "origin", "videos/daily"], cwd=ROOT)
    names = sh(["git", "ls-tree", "--name-only", "FETCH_HEAD", f"videos/daily/out/{day}/"], cwd=ROOT).split()
    stems = {Path(n).stem for n in names if n.endswith(".mp4")} & {Path(n).stem for n in names if n.endswith(".json")}
    src = {ALIASES.get(x, x): x for x in stems if ALIASES.get(x, x) in APPS}  # app id -> file stem
    apps = sorted(src)
    print(f"{day}: found {apps or 'nothing'}")
    if not apps:
        return 0
    have = d1("promovote-db", "SELECT slug FROM promos WHERE slug LIKE '%-daily-" + day + "'", API_DIR, json_out=True)[0]["results"]
    done = {r["slug"].split("-daily-")[0] for r in have}
    d1("promovote-waitlist", "CREATE TABLE IF NOT EXISTS tiktok_queue (id INTEGER PRIMARY KEY AUTOINCREMENT, r2_key TEXT NOT NULL UNIQUE, caption TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), sent_at TEXT)", LANDING_DIR)
    queued = d1("promovote-waitlist", f"SELECT r2_key AS slug FROM tiktok_queue WHERE r2_key LIKE 'daily/{day}/%'", LANDING_DIR, json_out=True)[0]["results"]
    done |= {Path(r["slug"]).stem for r in queued}
    # TikTok is off, so PromoVote's own video (X only) counts as done once today's X video post exists.
    if d1("promovote-db", f"SELECT id AS slug FROM social_posts WHERE id = '{day}-2200-daily'", API_DIR, json_out=True)[0]["results"]:
        done.add("promovote")
    work = Path(tempfile.mkdtemp(prefix=f"daily-{day}-"))
    ok, report = [], []
    for app in apps:
        if app in done:
            report.append(f"{app}: already added, skipped")
            continue
        mp4, js = work / f"{app}.mp4", work / f"{app}.json"
        mp4.write_bytes(subprocess.run(["git", "show", f"FETCH_HEAD:videos/daily/out/{day}/{src[app]}.mp4"], cwd=ROOT, capture_output=True, check=True).stdout)
        meta = normalize(json.loads(subprocess.run(["git", "show", f"FETCH_HEAD:videos/daily/out/{day}/{src[app]}.json"], cwd=ROOT, capture_output=True, check=True).stdout))
        errs, dur = check(app, meta, mp4)
        if errs:
            report.append(f"{app}: SKIPPED ({', '.join(errs)})")
            continue
        sh(["ffmpeg", "-v", "error", "-y", "-i", str(mp4), "-vf", "scale=720:1280:flags=lanczos", "-c:v", "libx264", "-crf", "25", "-preset", "slow",
            "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", str(work / f"{app}-720.mp4")])
        sh(["ffmpeg", "-v", "error", "-y", "-ss", "1.7", "-i", str(mp4), "-frames:v", "1", "-vf", "scale=720:1280", "-q:v", "3", str(work / f"{app}-poster.jpg")])
        ok.append((app, meta, dur))
    if not ok:
        print("\n".join(report))
        return 0
    if dry:
        print("dry run, ready:", [a for a, _, _ in ok], "\n" + "\n".join(report))
        return 0

    token = secrets.token_urlsafe(36)
    set_token(token)
    try:
        for app, meta, dur in ok:
            for f in (f"{app}.mp4", f"{app}-720.mp4", f"{app}-poster.jpg"):
                upload(token, f"daily/{day}/{f}", work / f)
    finally:
        set_token(secrets.token_urlsafe(36))  # the token used above stops working

    base = f"https://api.promovote.com/media/daily/{day}"
    app_sql, tt_sql = [], ["CREATE TABLE IF NOT EXISTS tiktok_queue (id INTEGER PRIMARY KEY AUTOINCREMENT, r2_key TEXT NOT NULL UNIQUE, caption TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), sent_at TEXT);"]
    for app, meta, dur in ok:
        title, desc = meta["title"].strip(), meta["description"].strip()
        tags = [str(t).lstrip("#").lower() for t in meta.get("hashtags") or []]
        caption = f"{title.rstrip('.!?')}. {desc} " + " ".join(f"#{t}" for t in tags)
        tt_sql.append(f"INSERT INTO tiktok_queue (r2_key, caption) VALUES ({q(f'daily/{day}/{app}.mp4')}, {q(caption.strip()[:2200])}) ON CONFLICT (r2_key) DO NOTHING;")
        if APPS[app] is None:
            report.append(f"{app}: X only")
            continue
        slug = f"{app}-daily-{day}"
        pid, vid = str(uuid.uuid5(NS, f"promo/{slug}")), str(uuid.uuid5(NS, f"video/{slug}"))
        i18n = json.dumps({"title": {"en": title}, "desc": {"en": desc}}, ensure_ascii=False, separators=(",", ":"))
        kind, url = APPS[app]
        app_sql.append(
            "insert into promos (id, creator_profile_id, slug, lang, title, description, i18n, status, cta_kind, cta_url, cta_safety_status, has_perk, rights_confirmed_at, submitted_at, approved_at, live_at) "
            f"select {q(pid)}, id, {q(slug)}, 'en', {q(title[:60])}, {q(desc[:280])}, {q(i18n)}, 'live', {q(kind)}, {q(url)}, 'safe', 0, "
            "strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now') "
            f"from profiles where handle = {q(app)} on conflict do nothing;")
        app_sql.append(f"insert into promo_videos (id, promo_id, label, mp4_url, webm_url, poster_url, duration_ms, width, height) select {q(vid)}, id, 'A', "
                       f"{q(f'{base}/{app}-720.mp4')}, null, {q(f'{base}/{app}-poster.jpg')}, {int(dur * 1000)}, 720, 1280 from promos where id = {q(pid)} on conflict do nothing;")
        if tags:
            app_sql.append("insert into hashtags (tag, use_count) values " + ", ".join(f"({q(t)}, 1)" for t in tags) + " on conflict (tag) do update set use_count = use_count + 1;")
            app_sql.append("insert into promo_hashtags (promo_id, tag, position) select id, t.tag, t.pos from promos, (" + " union all ".join(f"select {q(t)} as tag, {i} as pos" for i, t in enumerate(tags)) + f") t where promos.id = {q(pid)} on conflict do nothing;")
        report.append(f"{app}: PromoVote ({dur:.0f} s)")

    # One X video post at 22:00 UTC, product rotates by day of year (the first available one from that point).
    start = datetime.strptime(day, "%Y-%m-%d").timetuple().tm_yday % len(X_ROTATION)
    avail = [a for a, _, _ in ok]
    pick = next((X_ROTATION[(start + i) % len(X_ROTATION)] for i in range(len(X_ROTATION)) if X_ROTATION[(start + i) % len(X_ROTATION)] in avail), None)
    if pick:
        meta = next(m for a, m, _ in ok if a == pick)
        tags = " ".join(f"#{str(t).lstrip('#')}" for t in (meta.get("hashtags") or []))
        store = {"haulingempire": "Search Hauling Empire on the App Store or Google Play.", "poleris": "Search Poleris on the App Store or Google Play.",
                 "dovelet": "Search Dovelet on the App Store or Google Play.", "dropolis": "Search Dropolis on Google Play.", "promovote": "Search PromoVote on the App Store or Google Play."}[pick]
        body = f"{meta['title'].strip().rstrip('.!?')}. {meta['description'].strip()}"
        tail = f" {store} {tags}".rstrip()
        body = (body[: 280 - len(tail) - 1].rsplit(" ", 1)[0] + "…" if len(body) + len(tail) > 280 else body) + tail
        assert not LINK.search(body.replace(".com", "")) and len(body) <= 280
        app_sql.append(f"INSERT INTO social_posts (id, network, body, scheduled_at, status, media_url) VALUES ({q(f'{day}-2200-daily')}, 'x', {q(body)}, "
                       f"{q(f'{day}T22:00:00.000Z')}, 'queued', {q(f'{base}/{pick}.mp4')}) ON CONFLICT (id) DO NOTHING;")
        report.append(f"X: {pick} video post at 22:00 UTC")

    (work / "app.sql").write_text("\n".join(app_sql) + "\n")
    (work / "tiktok.sql").write_text("\n".join(tt_sql) + "\n")
    d1("promovote-db", str(work / "app.sql"), API_DIR)
    if TIKTOK_ON:
        d1("promovote-waitlist", str(work / "tiktok.sql"), LANDING_DIR)
    print("\n".join(report))
    return 0


if __name__ == "__main__":
    sys.exit(main())
