# Vendored skills

Copied on 2026-10-09 after a manual security read (no install scripts run, test files removed). Each folder keeps its LICENSE.

| Skills | Source | Commit | License |
|---|---|---|---|
| hyperframes, hyperframes-core, hyperframes-cli, hyperframes-animation, hyperframes-creative, hyperframes-audio, hyperframes-keyframes, product-launch-video, motion-graphics, general-video, slideshow, embedded-captions | github.com/heygen-com/hyperframes `skills/` | 5ec2dd2 | Apache 2.0 |
| launch-video, apple-launch-film, loop-cover, milestone-reveal, motion-effects, motion-brief-writer, brand-intake, reel-export, title-sequence-3d, animated-chart | github.com/charlie947/motion-graphics-skills | 4cd156a | MIT |
| product-launch-motion | github.com/AbubakrChan/product-launch-motion | 951d614 | MIT (NOTICE: the example film belongs to its client) |
| motion-design | github.com/LottieFiles/motion-design-skill | f9a8a04 | MIT |

Notes:
* HyperFrames telemetry is off (`HYPERFRAMES_NO_TELEMETRY=1` in `.claude/settings.json`). Do not send the post render feedback reports.
* Helper scripts may ask to `npm install --ignore-scripts --no-save` pinned packages; that needs a yes each time.
* Cloud rendering (HeyGen API), paid TTS (ElevenLabs) and `motion-graphics/grounding` auto mode (Gemini key) are optional and need the founder's go. Local render needs Node 22+, FFmpeg and Chrome.
* To update: clone the source, diff against these folders, read the changes, then copy.
