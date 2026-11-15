#!/usr/bin/env bash
# Make a milestone video web-ready: H.264/AAC MP4 (faststart), WebM, and a poster frame from ~2 s in.
#   scripts/prepare_video.sh <input video> [output dir, default public/videos/milestone-2] [name, default input's name]
# Keep originals over 50 MB outside public/ (they'd be shipped with the site). Put a <name>.vtt next to the outputs
# to add captions, then add the entry to `milestones` in content/site.ts (the script prints it).
# Uses ffmpeg from PATH, or set FFMPEG=/path/to/ffmpeg.
set -euo pipefail

in="${1:?usage: prepare_video.sh <input> [outdir] [name]}"
out="${2:-public/videos/milestone-2}"
name="${3:-$(basename "${in%.*}" | tr '[:upper:] ' '[:lower:]-')}"
ff="${FFMPEG:-ffmpeg}"
mkdir -p "$out"

size=$(du -m "$in" | cut -f1)
echo "Original: $in (${size} MB)"
case "$(cd "$(dirname "$in")" && pwd)" in
  */public/*) [ "$size" -gt 50 ] && echo "Warning: original is over 50 MB and inside public/; move it out." ;;
esac

scale="scale='min(1920,iw)':-2"
"$ff" -y -loglevel error -i "$in" -vf "$scale" -c:v libx264 -crf 23 -preset veryfast -pix_fmt yuv420p \
  -c:a aac -b:a 128k -movflags +faststart "$out/$name.mp4"
"$ff" -y -loglevel error -i "$in" -vf "$scale" -c:v libvpx-vp9 -crf 34 -b:v 0 -row-mt 1 -deadline good -cpu-used 4 \
  -c:a libopus -b:a 96k "$out/$name.webm"
"$ff" -y -loglevel error -ss 2 -i "$in" -frames:v 1 -vf "$scale" -q:v 3 "$out/$name-poster.jpg"

# (ffmpeg with no output file exits non-zero after printing the stream info)
dims=$({ "$ff" -i "$out/$name.mp4" 2>&1 || true; } | grep -oE 'Video:.*' | grep -oE '[0-9]{2,5}x[0-9]{2,5}' | head -1)
w=${dims%x*}; h=${dims#*x}
du -h "$out/$name.mp4" "$out/$name.webm" "$out/$name-poster.jpg"

pub="/${out#public/}"
captions=""
[ -f "$out/$name.vtt" ] && captions=", captions: \"$pub/$name.vtt\""
cat <<ENTRY

Add to the milestone's media in content/site.ts:
{ type: "video", src: "$pub/$name.mp4", srcWebm: "$pub/$name.webm", poster: "$pub/$name-poster.jpg", width: $w, height: $h, title: "<title>"$captions },
ENTRY
