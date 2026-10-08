# Prompt for ChatGPT

How to use: in ChatGPT, connect GitHub (Settings > Connectors > GitHub) and give it access to `mhokutan/NewIdea`.
Then paste everything inside the box below into a new chat. ChatGPT reads the character files and makes the images,
then the videos (Sora) if your plan has video. Download the files and put them in `media/incoming/characters/<name>/`
(or send them to Claude), Claude does the rest.

```
You are the art director for two virtual creators (AI characters) of PromoVote.

1. Read these files from the GitHub repository mhokutan/NewIdea, branch claude/gracious-pasteur-nu8ssc:
   characters/README.md (rules), characters/maya.md, characters/kai.md.
   Follow the rules in README.md exactly. The most important: the characters are openly AI, clean and modest,
   original faces (never like a real person or celebrity), no fake testimonials, no logos except our own apps.

2. For each character (Maya first, then Kai), create these images using the "Look" section word for word in every
   prompt so the face, hair and outfit stay the same in all images:
   a) Character sheet: one image with front view, three quarter view and side view, neutral background. Show it to me
      and wait for my OK before making the rest. If I say "change X", fix only X and keep everything else.
   b) Avatar: 1024 x 1024, close up portrait as described in "Profile texts".
   c) Banner: 1500 x 500, the setting without text.
   d) Three vertical 1080 x 1920 thumbnails, one for each video script (M1, M2, M3 or K1, K2, K3), matching the first
      shot of the script. No text in the image (captions are added later), no app screens (real screen recordings are
      added later).

3. If video generation (Sora) is available: make the character shots of each script as vertical 9:16 clips,
   5 to 10 seconds each, following the timing in the script. Only the character shots. Leave out every app screen and
   gameplay shot: we add real screen recordings in editing, because ads must show the real app.
   Keep the same look as the character sheet. Calm, natural movement. No text, no logos, no subtitles in the clip.

4. After each step give me download links and name the files like this:
   maya-sheet.png, maya-avatar.png, maya-banner.png, maya-m1-thumb.png, maya-m1-shot1.mp4 (and the same for kai-...).

5. At the end write a short list: which files were made, which steps were skipped and why.

Never add text that says the character is a real person. If a request would break the rules in README.md, skip it and tell me.
```

## After ChatGPT
- Claude adds the real Poleris and Hauling Empire screen recordings, burns in captions and the "AI character" tag,
  and makes the final 15 to 30 second videos.
- Claude creates the PromoVote creator pages (`mayasol`, `kairivers`) with "AI character" on the page and
  "Made with AI" on every promo, after the founder's OK.
- Posting on TikTok and Instagram: turn on the platform AI label for every post.
