#!/bin/bash
# Makes a 1080x1920 "Duel" clip for X: two promos stacked, question on top, VS badge in the middle.
# Usage: make-duel.sh <promoA> <promoB> <out.mp4> "<Creator A>" "<Creator B>"
set -euo pipefail
M=/home/user/NewIdea/web/landing/public/media
F=/usr/share/fonts/opentype/inter
A="$1"; B="$2"; OUT="$3"; NA="$4"; NB="$5"
ffmpeg -y -loglevel error -stream_loop -1 -i "$M/$A.mp4" -stream_loop -1 -i "$M/$B.mp4" -f lavfi -i anullsrc=r=44100:cl=stereo -t 10 -filter_complex "
color=c=0x0a0a0f:s=1080x1920:d=10[bg];
[0:v]scale=1080:840:force_original_aspect_ratio=increase,crop=1080:840,setsar=1,
 drawtext=fontfile=$F/Inter-Bold.otf:text='$NA':fontcolor=white:fontsize=40:x=36:y=h-70:shadowcolor=black@0.7:shadowx=2:shadowy=2[a];
[1:v]scale=1080:840:force_original_aspect_ratio=increase,crop=1080:840,setsar=1,
 drawtext=fontfile=$F/Inter-Bold.otf:text='$NB':fontcolor=white:fontsize=40:x=36:y=h-70:shadowcolor=black@0.7:shadowx=2:shadowy=2[b];
[bg][a]overlay=0:130[t1];[t1][b]overlay=0:1030[t2];
[t2]drawtext=fontfile=$F/Inter-ExtraBold.otf:text='Which one blows up first?':fontcolor=white:fontsize=60:x=(w-tw)/2:y=36,
 drawbox=x=0:y=970:w=1080:h=60:color=0x0a0a0f:t=fill,
 drawtext=fontfile=$F/Inter-Black.otf:text=' VS ':fontcolor=0x0a0a0f:fontsize=64:box=1:boxcolor=0xc6ff3d:boxborderw=22:x=(w-tw)/2:y=1000-th/2,
 drawtext=fontfile=$F/Inter-SemiBold.otf:text='promovote.com/duel':fontcolor=0xc6ff3d:fontsize=34:x=(w-tw)/2:y=1905-th,format=yuv420p[v]" \
 -map "[v]" -map 2:a -c:v libx264 -profile:v high -preset medium -crf 23 -r 30 -movflags +faststart -c:a aac -b:a 64k -shortest "$OUT"
