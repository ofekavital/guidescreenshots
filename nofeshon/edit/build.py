#!/usr/bin/env python3
"""
בונה את שכבת הווידאו של הסרטון מתוך edl.json.

  python3 build.py                 כל הסגמנטים + timeline.json + base.mp4
  python3 build.py --only 10-11    סגמנט אחד בלבד (לבדיקה)
  python3 build.py --preview       גם rough.mp4 עם מוזיקה זמנית ואודיו ההרצאה

הפלט נכתב ל־/home/user/footage/work (מחוץ לריפו). timeline.json נכתב ליד הסקריפט,
כי שכבת המושן והאודיו נשענות עליו.
"""
import json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.environ.get("WORK", "/home/user/footage/work")
EDL = json.load(open(os.path.join(HERE, "edl.json")))
FPS, W, H = EDL["fps"], EDL["width"], EDL["height"]
RAW = EDL["footage"]
MUSIC = os.path.join(HERE, "..", "reference", "music")

# מרכז הפריים (0..1) לחיתוך כל צד במסך המפוצל
SPLIT_CENTER = {"10.mp4": 0.30, "11.mp4": 0.34}


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        sys.exit(f"ffmpeg failed:\n{' '.join(cmd)}\n{r.stderr[-2000:]}")


def frames(seg):
    if "dur" in seg:
        return round(seg["dur"] * FPS)
    return round((seg["out"] - seg["in"]) / seg.get("speed", 1.0) * FPS)


def base_vf(src):
    chain = [EDL["crops"][src]] if src in EDL["crops"] else []
    chain += [f"scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos", f"crop={W}:{H}", "setsar=1"]
    return chain


ENC = ["-c:v", "libx264", "-preset", "fast", "-crf", "16", "-pix_fmt", "yuv420p", "-g", str(FPS), "-an"]


def render_segment(i, seg, out):
    n = frames(seg)
    kind = seg.get("type", "clip")
    if kind == "clip":
        speed = seg.get("speed", 1.0)
        vf = base_vf(seg["src"]) + [f"setpts=(PTS-STARTPTS)/{speed}", f"fps={FPS}"]
        run(["ffmpeg", "-v", "error", "-y", "-ss", str(seg["in"]), "-i", os.path.join(RAW, seg["src"]),
             "-vf", ",".join(vf), "-frames:v", str(n), *ENC, out])
    elif kind == "split":
        parts, inputs = [], []
        for k, side in enumerate(("left", "right")):
            s = seg[side]
            cx = SPLIT_CENTER.get(s["src"], 0.5)
            x = max(0, min(W - W // 2, round(cx * W - W // 4)))
            inputs += ["-ss", str(s["in"]), "-i", os.path.join(RAW, s["src"])]
            parts.append(f"[{k}:v]" + ",".join(base_vf(s["src"]) + [f"crop={W // 2}:{H}:{x}:0", "setpts=PTS-STARTPTS", f"fps={FPS}"]) + f"[{side}]")
        fc = ";".join(parts) + ";[left][right]hstack=2[v]"
        run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", fc, "-map", "[v]", "-frames:v", str(n), *ENC, out])
    elif kind == "card" and seg.get("bg") == "black":
        # שקף מלא שכולו מושן (שקף הפתיחה) — רקע שחור בלבד
        run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"color=c=black:s={W}x{H}:r={FPS}",
             "-frames:v", str(n), *ENC, out])
    elif kind == "card":
        # מקום שמור לכרטיס הסיום; שכבת המושן מציירת עליו את הכרטיס הסופי
        run(["ffmpeg", "-v", "error", "-y", "-loop", "1", "-i", os.path.join(RAW, "46.png"),
             "-vf", ",".join(base_vf("46.png") + [f"fps={FPS}"]), "-frames:v", str(n), *ENC, out])
    return n


def main():
    only = sys.argv[sys.argv.index("--only") + 1] if "--only" in sys.argv else None
    segdir = os.path.join(WORK, "segs")
    os.makedirs(segdir, exist_ok=True)
    timeline, t = [], 0
    for i, seg in enumerate(EDL["segments"]):
        out = os.path.join(segdir, f"{seg['id']}.mp4")
        n = frames(seg)
        # סגמנט שלא השתנה מאז הרינדור הקודם לא מרונדר שוב
        key = json.dumps({k: v for k, v in seg.items() if k not in ("note", "mute")}, sort_keys=True)
        stamp = out + ".key"
        fresh = os.path.exists(out) and os.path.exists(stamp) and open(stamp).read() == key
        if (only is None and not fresh) or seg["id"] == only:
            render_segment(i, seg, out)
            open(stamp, "w").write(key)
            print(f"{seg['id']:>7}  {n / FPS:5.2f}s  @ {t / FPS:6.2f}s")
        timeline.append({**seg, "file": out, "start": t / FPS, "end": (t + n) / FPS, "startFrame": t, "frames": n})
        t += n
    json.dump({"fps": FPS, "width": W, "height": H, "duration": t / FPS, "frames": t, "segments": timeline},
              open(os.path.join(HERE, "timeline.json"), "w"), ensure_ascii=False, indent=1)
    print(f"total {t / FPS:.2f}s ({t} frames)")
    if only:
        return
    lst = os.path.join(WORK, "concat.txt")
    with open(lst, "w") as f:
        f.writelines(f"file '{s['file']}'\n" for s in timeline)
    base = os.path.join(WORK, "base.mp4")
    run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", base])
    dialog = build_dialog(timeline, t / FPS)
    if "--preview" in sys.argv:
        build_preview(base, dialog, timeline, t / FPS)


def build_dialog(timeline, total):
    """אודיו ההרצאה, ממוקם בדיוק על ציר הזמן."""
    inputs, chains = [], []
    for k, s in enumerate(x for x in timeline if x.get("audio")):
        inputs += ["-ss", str(s["in"]), "-t", str(s["end"] - s["start"]), "-i", os.path.join(RAW, s["src"])]
        ms = round(s["start"] * 1000)
        # mute: קטעים בזמן המקור שמושתקים (למשל שיעולים שמוחלפים באפקטים מסונכרנים)
        mute = "".join(f"volume=0:enable='between(t,{a - s['in']},{b - s['in']})'," for a, b in s.get("mute", []))
        chains.append(f"[{k}:a]aresample=48000,{mute}afade=t=in:d=0.04,afade=t=out:st={s['end'] - s['start'] - 0.06}:d=0.06,adelay={ms}|{ms}[a{k}]")
    n = len(chains)
    out = os.path.join(WORK, "dialog.wav")
    if not n:
        # אין סגמנט עם אודיו מקורי: ערוץ שקט באורך הסרט (כל הקולות מגיעים מ־audio_cues.json)
        run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"anullsrc=r=48000:cl=stereo", "-t", str(total), out])
        return out
    fc = ";".join(chains) + ";" + "".join(f"[a{k}]" for k in range(n)) + f"amix=inputs={n}:normalize=0,apad=whole_dur={total}[a]"
    run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", fc, "-map", "[a]", "-ac", "2", "-ar", "48000", out])
    return out


def build_preview(base, dialog, timeline, total):
    """תצוגה גסה: מוזיקה זמנית מהפסקולים ששלחת, בלי מיקס סופי."""
    music_start = next(s["start"] for s in timeline if s["id"] == "02")
    m1 = os.path.join(MUSIC, "01_opening_Unproductive_Status_Update.mp3")
    m2 = os.path.join(MUSIC, "02_main_Chasing_Horizons.mp3")
    ms = round(music_start * 1000)
    fc = (
        f"[2:a]atrim=0:{music_start + 0.5},afade=t=out:st={music_start - 0.5}:d=1,volume=0.35[m1];"
        f"[3:a]aloop=loop=1:size={98 * 44100},atrim=0:{total - music_start},afade=t=out:st={total - music_start - 3}:d=3,adelay={ms}|{ms},volume=0.8[m2];"
        f"[1:a][m1][m2]amix=inputs=3:normalize=0,alimiter=limit=0.9[a]"
    )
    out = os.path.join(WORK, "rough.mp4")
    run(["ffmpeg", "-v", "error", "-y", "-i", base, "-i", dialog, "-i", m1, "-i", m2, "-filter_complex", fc,
         "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", str(total), out])
    print("preview:", out)


if __name__ == "__main__":
    main()
