# Builds the weekly vertical PromoVote promo videos (one per founder product) with HyperFrames.
# Usage: WORK=<scratch dir> python3 make.py [product ...]
# WORK holds one folder per product with assets/s1.jpg..s6.jpg and assets/icon.jpg (never in git).
# Edit the hook, the three feature lines and the end card in P each week; only real features open to everyone.
# Then render in each folder: npx --yes hyperframes@0.8.186 render --quiet --output render.mp4
# Encoding and publishing steps: docs/social-media-playbook.md section 7.
import json, os, pathlib, shutil, subprocess, sys

W = pathlib.Path(os.environ.get("WORK", ".")).resolve()
NOV = pathlib.Path("/home/user/NewIdea/videos/promovote-x-nov")
GEIST = pathlib.Path("/home/user/NewIdea/videos/promovote-x-duel/assets/geist-latin.woff2")
FRAUNCES = pathlib.Path("/home/user/coupleapp/design/fonts/fraunces-latin-full-normal.woff2")

P = {
    "he": dict(
        ground="#0b1220", ink="#f5f5f7", muted="#9aa6bb", accent="#ff7a1a", pill_ink="#0b1220", font="geist", mode="cover",
        hook=["You don't drive.", "You run the", "<b>company.</b>"],
        items=[("Start with one van", "Pick loads, plan routes, hire people"),
               ("Land and sea", "Book deck space on Ro-Ro ferry lines"),
               ("Fair by design", "No gems, no energy bars")],
        name="Hauling Empire", sub="Truck Tycoon on iOS and Android", pill="Search Hauling Empire",
        beat=58, chord=(220, 261.63, 329.63)),
    "dropolis": dict(
        ground="#0a1a36", ink="#f5f5f7", muted="#9aa6bb", accent="#ffc233", pill_ink="#0a1a36", font="geist", mode="cover",
        hook=["One parcel shop.", "One day,", "<b>Mars.</b>"],
        items=[("Pack every order", "Couriers ride it to the door"),
               ("Build your own streets", "From cottages to skyscrapers"),
               ("Reach for Mars", "Launch a rocket, found a colony")],
        name="Dropolis", sub="Delivery City on Google Play", pill="Search Dropolis",
        beat=64, chord=(246.94, 293.66, 369.99)),
    "dovelet": dict(
        ground="#FBF2E3", ink="#46101C", muted="#7A4A50", accent="#D92B2F", pill_bg="#B81F2A", pill_ink="#FFF3E2", font="fraunces", mode="cover",
        hook=["Far apart?", "Their note, on", "<b>your home screen.</b>"],
        items=[("One touch", "Their phone buzzes"),
               ("Shared photos", "On both of your widgets"),
               ("No location tracking", "Only your city, if you both turn it on")],
        name="Dovelet", sub="For couples, on Google Play", pill="Search Dovelet",
        beat=0, chord=(261.63, 329.63, 392.0)),
    "poleris": dict(
        ground="#21424c", ink="#f3faf7", muted="#a9c6c0", accent="#9fdcc6", pill_ink="#16323a", font="geist", mode="card",
        hook=["Two minutes", "a day for", "<b>your intention.</b>"],
        items=[("Write one intention", "Then read it, give thanks, see it"),
               ("21 day journey", "One small ritual each day"),
               ("Breathe and rest", "Box breathing and guided meditation")],
        name="Poleris", sub="On the App Store and Google Play", pill="Search Poleris",
        beat=0, chord=(196.0, 246.94, 293.66)),
    "nicheable": dict(
        ground="#16181c", ink="#f5f5f7", muted="#a3a8b1", accent="#c8f560", pill_ink="#16181c", font="geist", mode="card",
        hook=["Plan it.", "Track it.", "<b>Done.</b>"],
        items=[("E-Ink planners", "Built for E-Ink tablets"),
               ("College grade tracker", "See where you actually stand"),
               ("Rental tax tracker", "Every trip counts")],
        name="Nicheable", sub="Digital planners and trackers on Etsy", pill="Find Nicheable on Etsy",
        beat=70, chord=(220, 277.18, 329.63)),
}

HOOK, SHOT, LIST, END = 2.4, 2.3, 3.2, 3.0
SHOTS0 = HOOK
LIST0 = HOOK + 6 * SHOT
END0 = LIST0 + LIST
DUR = round(END0 + END, 2)


def card_box(img):
    from PIL import Image
    w, h = Image.open(img).size
    maxw, maxh = 920, 1560
    s = min(maxw / w, maxh / h)
    cw, ch = round(w * s), round(h * s)
    return cw, ch, (1080 - cw) // 2, (1920 - ch) // 2 - 40


def html(k, c, d):
    fontface = ('@font-face { font-family: "Head"; src: url("assets/fraunces.woff2") format("woff2"); font-weight: 100 900; font-display: block; }'
                if c["font"] == "fraunces" else
                '@font-face { font-family: "Head"; src: url("assets/geist-latin.woff2") format("woff2"); font-weight: 100 900; font-display: block; }')
    head_w = 600 if c["font"] == "fraunces" else 760
    ls = "-0.01em" if c["font"] == "fraunces" else "-0.04em"
    shots = []
    for i in range(6):
        at = round(SHOTS0 + i * SHOT, 2)
        if c["mode"] == "cover":
            style = ""
            cls = "shot"
        else:
            cw, ch, x, y = card_box(d / "assets" / f"s{i+1}.jpg")
            style = f' style="left:{x}px;top:{y}px;width:{cw}px;height:{ch}px"'
            cls = "card"
        shots.append(f'<img id="i{i+1}" class="{cls}" src="assets/s{i+1}.jpg" alt=""{style} data-start="{at}" data-duration="{SHOT}" data-track-index="2" />')
    hook = "\n".join(f'<span class="line"><span>{t.replace("<b>", "<span class=o>").replace("</b>", "</span>")}</span></span>' for t in c["hook"])
    items = "\n".join(f'<div class="item">{a}<i>{b}</i></div>' for a, b in c["items"])
    pill_bg = c.get("pill_bg", c["accent"])
    shot_js = json.dumps([[f"i{i+1}", round(SHOTS0 + i * SHOT, 2)] for i in range(6)])
    return f"""<!doctype html>
<html lang="en" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      {fontface}
      :root {{ --ground: {c['ground']}; --ink: {c['ink']}; --muted: {c['muted']}; --accent: {c['accent']}; }}
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ width: 1080px; height: 1920px; overflow: hidden; background: var(--ground); }}
      #root {{ position: relative; width: 1080px; height: 1920px; font-family: "Head", sans-serif; color: var(--ink); background: var(--ground); }}
      .clip {{ position: absolute; inset: 0; }}
      .bg {{ background: radial-gradient(900px 760px at 50% 104%, color-mix(in srgb, var(--accent) 24%, transparent), transparent 70%), var(--ground); }}
      .center {{ padding: 0 90px 260px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }}
      .big {{ font-size: 124px; font-weight: {head_w}; letter-spacing: {ls}; line-height: 1.02; }}
      .mid {{ font-size: 92px; font-weight: {head_w}; letter-spacing: {ls}; line-height: 1.05; }}
      .small {{ font-size: 42px; font-weight: 500; color: var(--muted); max-width: 860px; line-height: 1.25; }}
      .o {{ color: var(--accent); }}
      .line {{ display: block; overflow: hidden; padding-bottom: 0.1em; }}
      .line > span {{ display: inline-block; }}
      .shot {{ position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; object-fit: cover; }}
      .card {{ position: absolute; object-fit: cover; border-radius: 44px; box-shadow: 0 40px 120px rgba(0,0,0,0.45); }}
      .list {{ display: flex; flex-direction: column; gap: 52px; text-align: left; align-items: flex-start; }}
      .item {{ font-size: 70px; font-weight: {head_w}; letter-spacing: {ls}; line-height: 1.08; }}
      .item i {{ display: block; font-style: normal; font-family: "Head", sans-serif; font-size: 40px; font-weight: 450; color: var(--muted); letter-spacing: 0; margin-top: 10px; }}
      .icon {{ width: 300px; height: 300px; border-radius: 68px; box-shadow: 0 30px 90px color-mix(in srgb, var(--accent) 40%, transparent); }}
      .pill {{ margin-top: 56px; padding: 26px 60px; border-radius: 999px; background: {pill_bg}; color: {c['pill_ink']}; font-size: 46px; font-weight: 700; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{DUR}" data-width="1080" data-height="1920">
      <audio id="music" src="assets/music.wav" data-start="0" data-duration="{DUR}" data-track-index="9" data-volume="0.7"></audio>
      <div id="ground" class="clip bg" data-start="0" data-duration="{DUR}" data-track-index="0"></div>
      <div id="s1" class="clip center big" data-start="0" data-duration="{HOOK}" data-track-index="1">
        {hook}
      </div>
      {chr(10).join(shots)}
      <div id="s7" class="clip center" data-start="{LIST0:.2f}" data-duration="{LIST}" data-track-index="1">
        <div class="list">
          {items}
        </div>
      </div>
      <div id="s8" class="clip center" data-start="{END0:.2f}" data-duration="{END}" data-track-index="1">
        <img class="icon" src="assets/icon.jpg" alt="" />
        <div class="mid" style="margin-top: 44px"><span class="line"><span>{c['name']}</span></span></div>
        <div class="small" style="margin-top: 12px">{c['sub']}</div>
        <div class="pill">{c['pill']}</div>
      </div>
    </div>
    <script>
      const tl = gsap.timeline({{ paused: true }});
      const E = "power4.out";
      const lines = (sel, at) => tl.from(`${{sel}} .line > span`, {{ yPercent: 110, duration: 0.7, ease: E, stagger: 0.14 }}, at);
      lines("#s1", 0.1);
      {shot_js}.forEach(([id, at], i) => {{
        tl.from(`#${{id}}`, {{ x: i % 2 ? -120 : 120, opacity: 0, scale: 1.04, duration: 0.5, ease: E }}, at);
        tl.to(`#${{id}}`, {{ scale: 1.06, duration: {SHOT - 0.5}, ease: "none" }}, at + 0.5);
      }});
      tl.from("#s7 .item", {{ opacity: 0, y: 50, duration: 0.6, ease: E, stagger: 0.45 }}, {LIST0 + 0.1:.2f});
      tl.from("#s8 .icon", {{ opacity: 0, scale: 0.6, duration: 0.6, ease: E }}, {END0 + 0.05:.2f});
      lines("#s8", {END0 + 0.3:.2f});
      tl.from("#s8 .small", {{ opacity: 0, y: 16, duration: 0.5, ease: E }}, {END0 + 0.7:.2f});
      tl.from("#s8 .pill", {{ opacity: 0, y: 30, scale: 0.92, duration: 0.6, ease: "back.out(1.6)" }}, {END0 + 1.0:.2f});
      window.__timelines = window.__timelines || {{}};
      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
"""


def music(c, out):
    a, b, e = c["chord"]
    pad = f"0.06*(sin(2*PI*{a}*t)+sin(2*PI*{b}*t)+sin(2*PI*{e}*t))*(0.75+0.25*sin(2*PI*0.25*t))"
    if c["beat"]:
        expr = (f"0.45*sin(2*PI*{c['beat']}*mod(t,0.5))*exp(-9*mod(t,0.5))"
                f"+0.08*(random(0)*2-1)*exp(-70*mod(t+0.25,0.5))+{pad}")
    else:
        expr = f"{pad}+0.05*sin(2*PI*{2*b}*t)*exp(-3*mod(t,2))"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"aevalsrc='{expr}':s=48000:d={DUR}",
                    "-af", f"afade=t=in:d=0.4,afade=t=out:st={DUR-1.6}:d=1.5", str(out)], check=True)


def build(k):
    c = P[k]
    d = W / k
    for f in ("hyperframes.json", "package.json"):
        shutil.copy(NOV / f, d / f)
    (d / "meta.json").write_text(json.dumps({"id": f"pv-w47-{k}", "name": f"pv-w47-{k}"}))
    shutil.copy(GEIST, d / "assets/geist-latin.woff2")
    if c["font"] == "fraunces":
        shutil.copy(FRAUNCES, d / "assets/fraunces.woff2")
    music(c, d / "assets/music.wav")
    (d / "index.html").write_text(html(k, c, d))


if __name__ == "__main__":
    for k in sys.argv[1:] or P:
        build(k)
        print("built", k, DUR)
