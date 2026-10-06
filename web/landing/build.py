#!/usr/bin/env python3
"""Builds the feed (public/index.html), creator profiles (public/creators/*.html)
and translations (public/i18n.js) from content/promos.json and content/ui.json.

Run: python3 web/landing/build.py   (then deploy with npx wrangler deploy)
"""
import html
import json
from pathlib import Path

ROOT = Path(__file__).parent
PUB = ROOT / "public"
data = json.loads((ROOT / "content/promos.json").read_text())
ui = json.loads((ROOT / "content/ui.json").read_text())
EN = ui["en"]
creators = data["creators"]
promos = data["promos"]
e = html.escape

LOGO = """<span class="logo-mark" aria-hidden="true"><svg viewBox="0 0 64 64"><defs><linearGradient id="{gid}" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse"><stop stop-color="#ff5470"/><stop offset="1" stop-color="#8b5cff"/></linearGradient></defs><circle cx="32" cy="32" r="29" fill="#14141f" stroke="url(#{gid})" stroke-width="5"/><path d="M20 35 32 23 44 35M20 46 32 34 44 46" fill="none" stroke="#c6ff3d" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>"""

LANG_SELECT = """<label class="lang-pick"><span class="visually-hidden" data-i18n="lang_label">Language</span>
        <select class="lang-select" aria-label="Language">
          <option value="en">EN</option><option value="es">ES</option><option value="tr">TR</option>
        </select></label>"""


def t(key):
    return e(EN[key])


def head(title, desc, canonical, og_image, extra_css="", og_type="website"):
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>{e(title)}</title>
  <meta name="description" content="{e(desc)}">
  <link rel="canonical" href="{canonical}">
  <meta name="theme-color" content="#0a0a0f">
  <meta property="og:type" content="{og_type}">
  <meta property="og:url" content="{canonical}">
  <meta property="og:title" content="{e(title)}">
  <meta property="og:description" content="{e(desc)}">
  <meta property="og:image" content="{og_image}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="{og_image}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="preload" href="/fonts/bricolage-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/styles.css">
  <link rel="stylesheet" href="/feed.css">{extra_css}
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script>
  <script src="/i18n.js" defer></script>
  <script src="/feed.js" defer></script>
</head>"""


SHEET = f"""  <div class="sheet-backdrop" hidden></div>
  <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" hidden>
    <button type="button" class="sheet-close" aria-label="Close"><svg><use href="/icons.svg#i-x"/></svg></button>
    <div class="sheet-body">
      <h2 id="sheet-title" class="sheet-title">{t('s_join_t')}</h2>
      <p class="sheet-text">{t('s_join_p')}</p>
      <form class="sheet-form" novalidate>
        <label class="field">
          <span data-i18n="f_email">{t('f_email')}</span>
          <input type="email" name="email" required autocomplete="email" placeholder="{t('f_placeholder')}" data-i18n-placeholder="f_placeholder">
        </label>
        <div class="sheet-turnstile"></div>
        <button type="submit" class="btn btn-wide" data-i18n="f_submit">{t('f_submit')}</button>
        <p class="form-msg" role="status" aria-live="polite"></p>
        <p class="fine"><span data-i18n="f_fine">{t('f_fine')}</span> <a href="/privacy" data-i18n="f_privacy">{t('f_privacy')}</a></p>
      </form>
      <div class="sheet-done" hidden>
        <p class="done-title"><svg><use href="/icons.svg#i-check-circle"/></svg><span data-i18n="d_title">{t('d_title')}</span></p>
        <div class="perk-reveal" hidden>
          <p class="sheet-text" data-i18n="p_text">{t('p_text')}</p>
          <div class="code-row">
            <code class="perk-code"></code>
            <button type="button" class="btn btn-small btn-ghost" data-copy data-i18n="p_copy">{t('p_copy')}</button>
          </div>
          <a class="btn btn-wide perk-link" target="_blank" rel="sponsored noopener" data-i18n="p_shop">{t('p_shop')}</a>
          <p class="fine" data-i18n="p_fine">{t('p_fine')}</p>
        </div>
        <p class="sheet-text done-default" data-i18n="d_default">{t('d_default')}</p>
      </div>
    </div>
  </div>"""


def avatar(c, cls="who-avatar", size=40):
    a = c["avatar"]
    if "img" in a:
        return f'<img src="{a["img"]}" width="{size}" height="{size}" alt="" class="{cls}">'
    mono = "who-mono" if cls == "who-avatar" else f"{cls}-mono"
    return f'<span class="{cls} {mono}" aria-hidden="true">{e(a["mono"])}</span>'


def reel(p, first):
    cid = p["creator"]
    c = creators[cid]
    v = p["video"]
    tags = []
    if c.get("status") == "soon":
        tags.append(f'<span class="tag-soon" data-i18n="tag_soon">{t("tag_soon")}</span>')
    if c.get("perk"):
        tags.append(f'<button type="button" class="tag-perk" data-sheet="perk"><svg><use href="/icons.svg#i-gift"/></svg><span data-i18n="perk_tag">{t("perk_tag")}</span></button>')
    tags.append(f'<span class="tag-lang" data-lang-chip hidden>{e(ui[p["lang"]]["lang_name"])}</span>')
    if c.get("cta", {}).get("android") == "soon":
        tags.append(f'<span class="tag-soon" data-i18n="tag_android_soon">{t("tag_android_soon")}</span>')
    if p.get("link"):
        key = {"shop": "cta_shop", "appstore": "cta_appstore"}.get(p.get("linkKind"), "cta_etsy")
        cta = f'<a class="btn btn-small btn-ghost" href="{e(p["link"])}" target="_blank" rel="sponsored noopener"><span data-i18n="{key}">{t(key)}</span> <svg class="ext"><use href="/icons.svg#i-arrow-up-right"/></svg></a>'
    elif c.get("cta", {}).get("type") == "notify":
        cta = f'<button type="button" class="btn btn-small" data-sheet="notify" data-i18n="cta_notify">{t("cta_notify")}</button>'
    else:
        cta = ""
    disc = "disc_" + c["disclosure"]
    return f"""    <article class="reel" data-reel data-id="{p['id']}" data-creator="{cid}" data-lang="{p['lang']}" aria-label="{e(p['title']['en'])}">
      <div class="reel-bg" style="background-image:url(/media/{v}-poster.jpg)" aria-hidden="true"></div>
      <div class="stage">
        <video class="reel-video" poster="/media/{v}-poster.jpg" muted loop playsinline preload="{'metadata' if first else 'none'}" aria-label="{e(p['title']['en'])}">
          <source src="/media/{v}.mp4" type="video/mp4">
          <source src="/media/{v}.webm" type="video/webm">
        </video>
        <div class="paused-badge" aria-hidden="true"><svg><use href="/icons.svg#i-play"/></svg></div>
        <div class="reel-info">
          <a class="who" href="/@{cid}" aria-label="{e(c['name'])}">
            {avatar(c)}
            <span>
              <span class="who-name">{e(c['name'])}</span>
              <span class="who-kind" data-ct="kind">{e(c['kind']['en'])}</span>
            </span>
          </a>
          <h2 class="reel-title" data-t="title">{e(p['title']['en'])}</h2>
          <p class="reel-desc" data-t="desc">{e(p['desc']['en'])}</p>
          <div class="reel-tags">{''.join(tags)}</div>
          <div class="reel-cta">{cta}</div>
          <p class="reel-disclosure" data-i18n="{disc}">{t(disc)}</p>
        </div>
        <div class="progress" aria-hidden="true"><i></i></div>
      </div>
      <div class="rail">
        <button type="button" class="rail-btn rail-up" data-sheet="vote"><svg><use href="/icons.svg#i-fire"/></svg><span data-i18n="rail_up">{t('rail_up')}</span></button>
        <button type="button" class="rail-btn" data-sheet="vote"><svg><use href="/icons.svg#i-thumbs-down"/></svg><span data-i18n="rail_down">{t('rail_down')}</span></button>
        <button type="button" class="rail-btn" data-sheet="save"><svg><use href="/icons.svg#i-bookmark-simple"/></svg><span data-i18n="rail_save">{t('rail_save')}</span></button>
        <button type="button" class="rail-btn" data-share><svg><use href="/icons.svg#i-share-fat"/></svg><span data-i18n="rail_share">{t('rail_share')}</span></button>
      </div>
    </article>"""


def topbar(gid, nav_feed=False):
    left = '<a href="/" class="topnav-link" data-i18n="nav_feed">' + t("nav_feed") + "</a>" if nav_feed else '<a href="/about" class="topnav-link" data-i18n="nav_how">' + t("nav_how") + "</a>"
    cls = "topbar topbar-solid" if nav_feed else "topbar"
    return f"""  <header class="{cls}">
    <a href="/" class="logo" aria-label="PromoVote home">
      {LOGO.format(gid=gid)}
      <span>PromoVote</span>
    </a>
    <nav class="topnav" aria-label="Main">
      {left}
      {LANG_SELECT}
      <button type="button" class="btn btn-small" data-sheet="join" data-i18n="nav_join">{t('nav_join')}</button>
    </nav>
  </header>"""


def build_feed():
    reels = "\n\n".join(reel(p, i == 0) for i, p in enumerate(promos))
    page = f"""{head(EN['meta_title'], EN['meta_desc'], 'https://promovote.com/', 'https://promovote.com/og.png')}
<body class="feed-page">
  <a class="skip-link" href="#feed" data-i18n="skip_feed">{t('skip_feed')}</a>

{topbar('lgf')}

  <main id="feed" class="feed" tabindex="-1" aria-label="Promo feed">

{reels}
  </main>

{SHEET}
</body>
</html>
"""
    (PUB / "index.html").write_text(page)


def build_profile(cid, c):
    mine = [p for p in promos if p["creator"] == cid]
    tiles = "\n".join(
        f"""        <a class="ptile" href="/?v={p['id']}" data-id="{p['id']}">
          <img src="/media/{p['video']}-poster.jpg" alt="" loading="lazy" width="360" height="640">
          <span class="ptile-dur">0:{p['dur']:02d}</span>
          <span class="ptile-title" data-t="title">{e(p['title']['en'])}</span>
        </a>"""
        for p in mine
    )
    if c.get("perk"):
        box = f"""      <div class="pperk">
        <div>
          <p class="pperk-title"><svg aria-hidden="true"><use href="/icons.svg#i-gift"/></svg><span data-i18n="perk_tag">{t('perk_tag')}</span></p>
          <p class="pperk-sub" data-i18n="pr_perk_p">{t('pr_perk_p')}</p>
        </div>
        <button type="button" class="btn btn-small" data-sheet="perk" data-i18n="pr_perk_b">{t('pr_perk_b')}</button>
      </div>"""
    elif c.get("cta", {}).get("type") == "notify":
        box = f"""      <div class="pperk">
        <div>
          <p class="pperk-title" data-i18n="pr_notify_t">{t('pr_notify_t')}</p>
          <p class="pperk-sub" data-i18n="pr_notify_p">{t('pr_notify_p')}</p>
        </div>
        <button type="button" class="btn btn-small" data-sheet="notify" data-i18n="pr_notify_b">{t('pr_notify_b')}</button>
      </div>"""
    else:
        box = ""
    if c.get("link"):
        links = f'<a class="plink" href="{e(c["link"]["url"])}" target="_blank" rel="sponsored noopener">{e(c["link"]["label"])} <svg aria-hidden="true"><use href="/icons.svg#i-arrow-up-right"/></svg></a>'
        if c.get("cta", {}).get("android") == "soon":
            links += f'<span class="plink plink-soon" data-i18n="tag_android_soon">{t("tag_android_soon")}</span>'
    elif c.get("status") == "soon":
        links = f'<span class="plink plink-soon" data-i18n="tag_soon">{t("tag_soon")}</span>'
    else:
        links = ""
    disc = "pr_" + c["disclosure"]
    title = f"{c['name']} (@{cid}) | PromoVote"
    desc = c["bio"]["en"]
    page = f"""{head(title, desc, f'https://promovote.com/@{cid}', f'https://promovote.com/media/{c["banner"]}', chr(10) + '  <link rel="stylesheet" href="/profile.css">', 'profile')}
<body class="profile-page" data-creator-page="{cid}">
  <a class="skip-link" href="#main" data-i18n="skip">{t('skip')}</a>
{topbar('lgp', nav_feed=True)}

  <main id="main" class="cprofile">
    <div class="pbanner" style="background-image:url(/media/{c['banner']})" aria-hidden="true"></div>
    <div class="pwrap">
      <section class="phead" aria-labelledby="pname">
        {avatar(c, 'pavatar', 112)}
        <div class="pid">
          <h1 id="pname">{e(c['name'])}</h1>
          <p class="phandle">@{cid}</p>
          <div class="pchips">
            <span class="pchip" data-ct="kind">{e(c['kind']['en'])}</span>
            <span class="pchip pchip-new" data-i18n="pr_new">{t('pr_new')}</span>
          </div>
        </div>
        <div class="pactions">
          <button type="button" class="btn" data-sheet="follow" data-i18n="pr_follow">{t('pr_follow')}</button>
          <button type="button" class="btn btn-ghost picon" data-share aria-label="{t('pr_share')}" data-i18n-aria="pr_share"><svg aria-hidden="true"><use href="/icons.svg#i-share-fat"/></svg></button>
        </div>
      </section>

      <p class="pbio" data-ct="bio">{e(c['bio']['en'])}</p>
      <div class="plinks">{links}</div>
{box}
      <p class="pdisclosure" data-i18n="{disc}">{t(disc)}</p>

      <section class="pgrid-wrap" aria-labelledby="promos-title">
        <h2 id="promos-title" class="ptab" data-i18n="pr_promos">{t('pr_promos')}</h2>
        <div class="pgrid">
{tiles}
        </div>
      </section>
    </div>
  </main>

{SHEET}
</body>
</html>
"""
    (PUB / "creators").mkdir(exist_ok=True)
    (PUB / "creators" / f"{cid}.html").write_text(page)


def build_i18n():
    out = {
        "ui": ui,
        "promos": {p["id"]: {"title": p["title"], "desc": p["desc"]} for p in promos},
        "creators": {cid: {"kind": c["kind"], "bio": c["bio"]} for cid, c in creators.items()},
    }
    (PUB / "i18n.js").write_text("window.PV_I18N = " + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n")


if __name__ == "__main__":
    build_feed()
    for cid, c in creators.items():
        build_profile(cid, c)
    build_i18n()
    text = "".join(p.read_text() for p in [PUB / "index.html", PUB / "i18n.js", *(PUB / "creators").glob("*.html")])
    assert "—" not in text and "–" not in text, "em or en dash found"
    print(f"built feed ({len(promos)} promos), {len(creators)} profiles, i18n for {', '.join(ui)}")
