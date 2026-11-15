# Daily app video (HyperFrames)

One 15 to 30 s vertical (1080x1920) video a day for the founder's apps. Founder decision 2026-11-15: sample style approved, daily.
Templates here: `hauling.index.html` (orange), `dropolis.index.html` (yellow on navy). Copy one, change colors, text and images.

Structure (25 s): intro text card (2.2 s), 6 store images full screen (2.6 s each, slide in, slow zoom), a text card with 3 real release note lines (3.8 s), end card with app icon, store line and promovote.com (3.4 s).

Build (in the scratchpad, never in git):
1. `npm i hyperframes@0.9.47` then `npx hyperframes init <name> --example blank --resolution portrait --non-interactive --skip-skills`
2. Put the template as `index.html`, images in `assets/` (s1..s6.jpg, icon.jpg), `geist-latin.woff2` (from `videos/promovote-x-duel/assets/`) and a generated `music.wav` (ffmpeg aevalsrc beat, see below).
3. `npm run check` (0 errors), `npx hyperframes snapshot --at 1,3.5,19.5,23`, read the frames, then `npm run render`.
4. Compress: `ffmpeg -i render.mp4 -c:v libx264 -crf 25 -preset slow -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart out.mp4` (about 4 MB).

Notes
* The gsap tag must be `gsap@3.15.0` on jsdelivr (the sandbox serves the vendored copy; other versions fail).
* Videos must not sit inside a timed wrapper (use top-level `<video data-start ...>`).
* Music: `ffmpeg -f lavfi -i "aevalsrc='0.5*sin(2*PI*58*mod(t,0.5))*exp(-9*mod(t,0.5))+0.10*(random(0)*2-1)*exp(-70*mod(t+0.25,0.5))+0.05*(sin(2*PI*220*t)+sin(2*PI*261.63*t)+sin(2*PI*329.63*t))':s=48000:d=25" -af "afade=t=in:d=0.4,afade=t=out:st=23.5:d=1.5" music.wav` (our own, no copyright).
* Sources of truth: Hauling Empire = `mhokutan/nakliye-patronu` branch `release/<version>` (`docs/release/<version>/YENILIKLER.md`, `store/play/en-US/phone-0N.jpg`); Dropolis = `mhokutan/NewRoboticGame` branch `claude/robo-v5` (`docs/store/listing.en.json` whatsNew, `docs/store/screenshots/googleplay/en/`). Use only features that are open to every player. Never claim store availability that is not true.
* Never commit videos, images or secrets here.
