#!/usr/bin/env bash
# Chuyển ảnh HEIC trong images/ sang JPG (1600px) vào images/jpg/ để tiện đối chiếu khi số hoá đề.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/images/jpg"
for f in "$ROOT"/images/*.HEIC; do
  name="$(basename "${f%.HEIC}")"
  sips -s format jpeg -Z 1600 "$f" --out "$ROOT/images/jpg/$name.jpg" >/dev/null
done
# IMG_9186 chụp xoay 90° → xoay lại cho thẳng
sips -r -90 "$ROOT/images/jpg/IMG_9186.jpg" >/dev/null
echo "Done: $(ls "$ROOT"/images/jpg | wc -l | tr -d ' ') files"
