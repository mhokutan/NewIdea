# Writes index.html for one November duel clip (template: videos/promovote-x-duel/index.html) and renders it.
# Usage: python3 make.py   (renders all four into renders/)
import re, subprocess, pathlib
base = pathlib.Path("../promovote-x-duel/index.html").read_text()
V = [
  ("nov-duel-1", ("Game or planner?", "You call it."), "Which one <span class=\"y\">blows up</span> first?",
   ("hauling-empire-border-night.mp4", "Hauling Empire", "Truck tycoon game"), ("nicheable-eink-planner.mp4", "Nicheable", "Digital planners"), ("Trust your gut.", "Pick fast.")),
  ("nov-duel-2", ("Night shift", "vs 21 days."), "Who wins the <span class=\"y\">feed</span>?",
   ("hauling-empire-depot-night.mp4", "Hauling Empire", "Truck tycoon game"), ("poleris-21-day.mp4", "Poleris", "A 21 day ritual"), ("One tap.", "No account.")),
  ("nov-duel-3", ("Two creators.", "One spot."), "Which one would you <span class=\"y\">stop</span> for?",
   ("nicheable-grade-tracker.mp4", "Nicheable", "Grade tracker"), ("poleris.mp4", "Poleris", "Breathe, visualize, rest"), ("Spot it", "before it trends.")),
  ("nov-duel-4", ("Seven duels.", "One minute."), "Which one <span class=\"y\">blows up</span> first?",
   ("hauling-empire-first-truck.mp4", "Hauling Empire", "Your first truck"), ("nicheable-rental-tax.mp4", "Nicheable", "Rental tax sheet"), ("Your pick,", "one tap.")),
]
for name, s1, q, L, R, s3 in V:
    h = base
    h = h.replace("<span class=\"line\"><span>Two promos.</span></span>\n        <span class=\"line\"><span class=\"y\">One call.</span></span>",
                  f"<span class=\"line\"><span>{s1[0]}</span></span>\n        <span class=\"line\"><span class=\"y\">{s1[1]}</span></span>")
    h = h.replace("Which one <span class=\"y\">blows up</span> first?", q, 1)
    h = h.replace("assets/hauling-empire-deliveries.mp4", "assets/" + L[0]).replace("Hauling Empire<small>Truck tycoon game</small>", f"{L[1]}<small>{L[2]}</small>")
    h = h.replace("assets/poleris-calm.mp4", "assets/" + R[0]).replace("Poleris<small>Breathe, visualize, rest</small>", f"{R[1]}<small>{R[2]}</small>")
    h = h.replace("<span class=\"line\"><span>Call it before</span></span><span class=\"line\"><span class=\"y\">everyone else.</span></span>",
                  f"<span class=\"line\"><span>{s3[0]}</span></span><span class=\"line\"><span class=\"y\">{s3[1]}</span></span>")
    assert s1[0] in h and q in h and L[0] in h and R[0] in h and s3[0] in h, name
    pathlib.Path("index.html").write_text(h)
    subprocess.run(["npx", "--yes", "hyperframes@0.8.186", "render", "--quiet", "--output", f"renders/{name}.mp4"], check=True)
