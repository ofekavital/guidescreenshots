#!/usr/bin/env bash
# אחרי הליפסינק (raw/1_ls.mp4): מרנדר את סצנה 1 מחדש, מחליף רק אותה בשכבת המושן, ומערבב גרסה חדשה.
#   bash finish_scene1.sh nofeshon_v8
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
WORK="${WORK:-/home/user/footage/work}"
OUT="${1:-nofeshon_v8}"
cd "$HERE"

python3 build.py
# הקטע של סצנה 1 בעריכה: מתחילת 01 ועד סוף 01z (01z לא השתנה, אבל נכנס כדי שהגבול יהיה נקי)
read -r T0 T1 < <(python3 -c "
import json; t = {s['id']: s for s in json.load(open('timeline.json'))['segments']}
print(t['01']['start'], t['01z']['end'])")
(cd ../motion && node render.mjs --from "$T0" --to "$T1")
python3 patch_picture.py "$T0"
python3 place_audio.py > /dev/null
python3 mix.py --out "$WORK/$OUT.mp4"
echo "done → $WORK/$OUT.mp4"
