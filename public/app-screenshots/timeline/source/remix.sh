#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
MUSIC="${1:-$DIR/music-calm.wav}"
LUFS="${2:--30}"
OUT="${3:-$DIR/../timeline-features-v5.mp4}"
DUR="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$DIR/video.mp4")"
FADE_OUT="$(awk -v d="$DUR" 'BEGIN { print d - 3 }')"
ffmpeg -loglevel error -y \
  -i "$DIR/video.mp4" -i "$DIR/sfx.wav" -stream_loop -1 -i "$MUSIC" \
  -filter_complex "[2:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:${DUR},loudnorm=I=${LUFS}:TP=-6:LRA=11,afade=t=in:d=1.5,afade=t=out:st=${FADE_OUT}:d=3[m];[1:a]aresample=48000[s];[s][m]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.84:level=false[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 96k -t "$DUR" -movflags +faststart "$OUT"
ls -lh "$OUT"
