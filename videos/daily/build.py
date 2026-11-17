#!/usr/bin/env python3
"""Daily app video builder. Writes index.html for one app into a HyperFrames project.
Usage: build.py <project_dir> <app_key>   (assets s1..sN.jpg, icon.jpg already in <project_dir>/assets)
Configs below are per day. Edit APPS for the new day's angle."""
import sys, json, pathlib
from PIL import Image

APPS = {
 "hauling-empire": dict(ground="#0b1220", ink="#f5f5f7", muted="#9aa6bb", acc="#ff7a1a", accink="#0b1220",
   intro=["Did you", "know?"], intro_acc=1, sub="Team driving in Hauling Empire",
   slides=["s3","s4","s6","s7","s8"], mode="full",
   notes=[("Both drivers earn","Km and experience in team driving"),("Guild substitute","A temporary driver while yours is sick"),("Set a truck to Manual","You take its loads, then back to Auto")],
   name="Hauling Empire", store="Truck Tycoon for iOS and Android", hz=55),
 "poleris": dict(ground="#07141c", ink="#eef6f4", muted="#8fb0ae", acc="#7fe0c2", accink="#07141c",
   intro=["One calm", "ritual a day"], intro_acc=1, sub="",
   slides=["s1","s2","s3","s5","s6"], mode="full",
   notes=[("Write it","Your intentions and the 369 method"),("See it","A vision board for what you want"),("Say it","Daily affirmations, every morning")],
   name="Poleris", store="Manifestation Journal for iOS and Android", hz=49),
 "dovelet": dict(ground="#fbf1e6", ink="#3a0d12", muted="#8a4b50", acc="#c1121f", accink="#fff6ee",
   intro=["One touch.", "Their phone", "buzzes."], intro_acc=0, sub="",
   slides=["s2","s1","s3","s4","s5"], mode="full",
   notes=[("Touch","One tap and their phone buzzes"),("Home screen widget","Their latest note and your days together"),("Heart flower","It grows as you both stop by")],
   name="Dovelet", store="For couples, on iOS and Android", hz=65),
 "dropolis": dict(ground="#0a1a3a", ink="#f5f5f7", muted="#9fb2d6", acc="#ffc233", accink="#0a1a3a",
   intro=["Did you", "know?"], intro_acc=1, sub="",
   slides=["s3","s4","s5","s6","s2"], mode="full",
   notes=[("Build a colony on Mars","Rocky ground, craters and hills"),("Login streak to day 100","Rewards all the way up"),("City Festival","Plus a season bonus crate")],
   name="Dropolis", store="Delivery City, now on Google Play", hz=73),
 "promovote": dict(ground="#000000", ink="#ffffff", muted="#a1a1a6", acc="#FFD60A", accink="#000000",
   intro=["Call the", "next hit."], intro_acc=1, sub="",
   slides=["s1","s2","s3","s4","s5"], mode="card",
   caps=["7 short promos a day","Make your call","Right calls grow your score","Build your Scout Score","Follow the creators"],
   crop=(0.12,0.30,0.88,0.99),
   notes=[("Will blow up","Or Not for me. Your call"),("Seven days later","The crowd decides"),("Weekly streak","Keep your Scout Score growing")],
   name="PromoVote", store="Now on the App Store", hz=52),
}

def build(proj, key):
    c = APPS[key]; p = pathlib.Path(proj); a = p/"assets"
    slides = c["slides"]; n = len(slides)
    t_int = 2.2; per = 2.6; t_note = 3.8; t_end = 3.4
    t_img0 = t_int; t_note0 = t_img0 + per*n; t_end0 = t_note0 + t_note; total = round(t_end0 + t_end, 2)
    if c["mode"] == "card":
        for s in slides:
            im = Image.open(a/f"{s}.jpg").convert("RGB"); w,h = im.size; x0,y0,x1,y1 = c["crop"]
            im.crop((int(w*x0),int(h*y0),int(w*x1),int(h*y1))).save(a/f"{s}_c.jpg", quality=92)
    intro = "".join(f'<span class="line"><span{" class=o" if i==c["intro_acc"] else ""}>{t}</span></span>' for i,t in enumerate(c["intro"]))
    imgs = ""
    for i,s in enumerate(slides):
        st = round(t_img0+per*i,2)
        if c["mode"] == "full":
            imgs += f'<div id="i{i}" class="clip" data-start="{st}" data-duration="{per}" data-track-index="2"><img class="bgb" src="assets/{s}.jpg" alt=""><img class="fg" src="assets/{s}.jpg" alt=""></div>\n'
        else:
            imgs += f'<div id="i{i}" class="clip" data-start="{st}" data-duration="{per}" data-track-index="2"><div class="cap">{c["caps"][i]}</div><img class="card" src="assets/{s}_c.jpg" alt=""></div>\n'
    items = "".join(f'<div class="item">{t}<i>{d}</i></div>' for t,d in c["notes"])
    html = f'''<!doctype html>
<html lang="en" data-resolution="portrait"><head><meta charset="UTF-8" /><meta name="viewport" content="width=1080, height=1920" />
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
<style>
@font-face {{ font-family: "Geist"; src: url("assets/geist-latin.woff2") format("woff2"); font-weight: 100 900; font-display: block; }}
:root {{ --ground:{c["ground"]}; --ink:{c["ink"]}; --muted:{c["muted"]}; --acc:{c["acc"]}; --accink:{c["accink"]}; }}
* {{ margin:0; padding:0; box-sizing:border-box; }}
html, body {{ width:1080px; height:1920px; overflow:hidden; background:var(--ground); }}
#root {{ position:relative; width:1080px; height:1920px; font-family:"Geist",sans-serif; color:var(--ink); background:var(--ground); }}
.clip {{ position:absolute; inset:0; overflow:hidden; }}
.center {{ padding:0 90px 160px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; }}
.big {{ font-size:160px; font-weight:760; letter-spacing:-0.045em; line-height:1; }}
.mid {{ font-size:84px; font-weight:720; letter-spacing:-0.04em; line-height:1.05; }}
.small {{ font-size:42px; font-weight:500; color:var(--muted); }}
.o {{ color:var(--acc); }}
.line {{ display:block; overflow:hidden; padding-bottom:0.08em; }} .line > span {{ display:inline-block; }}
.bgb {{ position:absolute; left:-200px; top:-200px; width:1480px; height:2320px; object-fit:cover; filter:blur(50px) brightness(0.55); }}
.fg {{ position:absolute; left:0; top:0; width:1080px; height:1920px; object-fit:contain; }}
.cap {{ position:absolute; left:60px; right:60px; top:190px; text-align:center; font-size:92px; font-weight:740; letter-spacing:-0.04em; line-height:1.05; color:var(--acc); }}
.card {{ position:absolute; left:160px; top:470px; width:760px; height:1500px; object-fit:cover; object-position:top; border-radius:56px 56px 0 0; }}
.list {{ display:flex; flex-direction:column; gap:48px; text-align:left; align-items:flex-start; }}
.item {{ font-size:70px; font-weight:720; letter-spacing:-0.035em; line-height:1.08; }}
.item i {{ display:block; font-style:normal; font-size:40px; font-weight:500; color:var(--muted); letter-spacing:0; margin-top:8px; }}
.icon {{ width:300px; height:300px; border-radius:68px; }}
.url {{ margin-top:56px; padding:26px 60px; border-radius:999px; background:var(--acc); color:var(--accink); font-size:46px; font-weight:740; }}
</style></head><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{total}" data-width="1080" data-height="1920">
<audio id="music" src="assets/music.wav" data-start="0" data-duration="{total}" data-track-index="9" data-volume="0.7"></audio>
<div id="s1" class="clip center big" data-start="0" data-duration="{t_int}" data-track-index="1">{intro}</div>
{imgs}
<div id="s7" class="clip center" data-start="{t_note0}" data-duration="{t_note}" data-track-index="1"><div class="list">{items}</div></div>
<div id="s8" class="clip center" data-start="{round(t_end0,2)}" data-duration="{t_end}" data-track-index="1">
<img class="icon" src="assets/icon.jpg" alt="" /><div class="mid" style="margin-top:44px"><span class="line"><span>{c["name"]}</span></span></div>
<div class="small" style="margin-top:8px">{c["store"]}</div><div class="url">promovote.com</div></div>
</div>
<script>
const tl = gsap.timeline({{ paused:true }}); const E = "power4.out";
tl.from("#s1 .line > span", {{ yPercent:110, duration:0.7, ease:E, stagger:0.12 }}, 0.1);
for (let i=0;i<{n};i++) {{ const at={t_img0}+{per}*i;
  tl.from("#i"+i, {{ x: i%2?-120:120, opacity:0, duration:0.5, ease:E }}, at);
  tl.fromTo("#i"+i+" .fg, #i"+i+" .card", {{ scale:1 }}, {{ scale:1.04, duration:{per}, ease:"none" }}, at); }}
tl.from("#s7 .item", {{ opacity:0, y:50, duration:0.6, ease:E, stagger:0.5 }}, {t_note0}+0.1);
tl.from("#s8 .icon", {{ opacity:0, scale:0.6, duration:0.6, ease:E }}, {round(t_end0,2)}+0.05);
tl.from("#s8 .line > span", {{ yPercent:110, duration:0.7, ease:E }}, {round(t_end0,2)}+0.3);
tl.from("#s8 .small", {{ opacity:0, y:16, duration:0.5, ease:E }}, {round(t_end0,2)}+0.7);
tl.from("#s8 .url", {{ opacity:0, y:30, scale:0.92, duration:0.6, ease:"back.out(1.6)" }}, {round(t_end0,2)}+1.0);
window.__timelines = window.__timelines || {{}}; window.__timelines["main"] = tl; tl.seek(0);
</script></body></html>'''
    (p/"index.html").write_text(html)
    print(key, "total", total)

if __name__ == "__main__":
    build(sys.argv[1], sys.argv[2])
