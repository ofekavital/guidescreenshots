#!/usr/bin/env python3
"""
מחליף קטע ב־picture.mp4 בקטע שרונדר מחדש, בלי לרנדר את כל שכבת המושן.

  node ../motion/render.mjs --from <t0> --to <t1>     → $WORK/picture_part.mp4
  python3 patch_picture.py <t0>                         → picture.mp4 מעודכן (הישן נשמר כ־picture_prev.mp4)

t0 הוא זמן ההתחלה של הקטע בעריכה, בשניות; הוא מעוגל לפריים.
"""
import json, os, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.environ.get("WORK", "/home/user/footage/work")
TL = json.load(open(os.path.join(HERE, "timeline.json")))
FPS = TL["fps"]


def frames(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-count_packets", "-select_streams", "v:0", "-show_entries",
                          "stream=nb_read_packets", "-of", "csv=p=0", path], capture_output=True, text=True).stdout
    return int(out.strip()) if out.strip().isdigit() else -1  # קובץ שנקטע באמצע הכתיבה


def main():
    a = round(float(sys.argv[1]) * FPS)
    pic, part = os.path.join(WORK, "picture.mp4"), os.path.join(WORK, "picture_part.mp4")
    n = frames(part)
    b = a + n
    prev = os.path.join(WORK, "picture_prev.mp4")
    # שומרים את הקודם רק כשהוא שלם; אם ריצה קודמת נקטעה, picture_prev.mp4 הוא המקור
    if not os.path.exists(prev) or (os.path.exists(pic) and frames(pic) == TL["frames"]):
        shutil.copy(pic, prev)
    # שלושה קלטים נפרדים (ולא אותו קלט פעמיים): אחרת ffmpeg צובר בזיכרון את כל הפריימים של החלק השלישי
    fc = (f"[0:v]trim=end_frame={a},setpts=PTS-STARTPTS[x];"
          f"[1:v]setpts=PTS-STARTPTS[y];"
          f"[2:v]trim=start_frame={b},setpts=PTS-STARTPTS[z];"
          "[x][y][z]concat=n=3:v=1:a=0[v]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", prev, "-i", part, "-i", prev, "-filter_complex", fc, "-map", "[v]",
                    "-c:v", "libx264", "-preset", "medium", "-crf", "15", "-pix_fmt", "yuv420p", "-r", str(FPS), pic], check=True)
    total = frames(pic)
    if total != TL["frames"]:
        sys.exit(f"frame count {total} != timeline {TL['frames']}")
    print(f"→ {pic}: frames {a}–{b} replaced ({n}), total {total}")


if __name__ == "__main__":
    main()
