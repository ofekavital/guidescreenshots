#!/usr/bin/env python3
"""
ליפסינק לסצנה 1 עם LatentSync (רץ על CPU, ‎/home/user/latentsync).

  python3 lipsync.py              כל הטווחים ב־lipsync.json שעוד לא רונדרו, ואז הרכבה
  python3 lipsync.py --only s3    טווח אחד
  python3 lipsync.py --splice     רק הרכבה מחדש של הקובץ מהטווחים הקיימים

הקול שהשפתיים מסונכרנות אליו הוא בדיוק מה שנשמע בסרט: הקבצים של סצנה 1
ש־place_audio.py הכין (audio/vo/01~*.wav), ממוקמים על זמן המקור.
הפלט: raw/1_ls.mp4. זה המקור עם הטווחים שסונכרנו, באותה רזולוציה ובאותו קצב פריימים.
"""
import glob, json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.environ.get("WORK", "/home/user/footage/work")
LS = os.environ.get("LATENTSYNC", "/home/user/latentsync")
CFG = json.load(open(os.path.join(HERE, "lipsync.json")))
SRC = CFG["src"]
OUT = CFG["out"]
DIR = os.path.join(WORK, "ls")
FPS_NUM, FPS_DEN = 24000, 1001


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode:
        sys.exit(f"failed: {' '.join(cmd)[:300]}\n{r.stderr[-3000:]}")
    return r.stdout


def frame(t):
    return round(t * FPS_NUM / FPS_DEN)


def voice_stem(r=None):
    """כל הקולות של סצנה 1 (בלי אפקטים ומוזיקה) על זמן המקור, 16kHz מונו.
    drive בטווח: קול שמניע את השפתיים במקום אחד הקולות (למשל גרסה מדוברת של לחישה, באותו תזמון);
    בסרט נשמע הקול המקורי, והשפתיים זזות לפי ההיגוי של הגרסה המדוברת."""
    drive = (r or {}).get("drive")
    files = sorted(glob.glob(os.path.join(WORK, "audio", "vo", "01~*.wav")))
    placed = [(f, float(os.path.basename(f)[:-4].split("@")[1])) for f in files]
    if drive:
        placed = [(f, at) for f, at in placed if os.path.basename(f).split("~")[1].split("@")[0] != drive["instead_of"]]
        placed.append((drive["src"], drive["at"]))
    out = os.path.join(DIR, f"voice_01{'_' + r['name'] if drive else ''}.wav")
    ins, fc = [], []
    for k, (f, at) in enumerate(placed):
        ins += ["-i", f]
        ms = round(at * 1000)
        fc.append(f"[{k}:a]adelay={ms}|{ms}[v{k}]")
    fc.append("".join(f"[v{k}]" for k in range(len(placed))) + f"amix=inputs={len(placed)}:normalize=0,apad=whole_dur=45[m]")
    run(["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", ";".join(fc), "-map", "[m]", "-ac", "1", "-ar", "16000", out])
    return out


def render(r, stem):
    a, b = frame(r["start"]), frame(r["end"])
    t0, dur = a * FPS_DEN / FPS_NUM, (b - a) * FPS_DEN / FPS_NUM
    v = os.path.join(DIR, f"{r['name']}_in.mp4")
    au = os.path.join(DIR, f"{r['name']}_in.wav")
    out = os.path.join(DIR, f"{r['name']}_ls.mp4")
    run(["ffmpeg", "-v", "error", "-y", "-i", SRC, "-vf", f"trim=start_frame={a}:end_frame={b},setpts=PTS-STARTPTS",
         "-an", "-c:v", "libx264", "-crf", "10", "-preset", "fast", v])
    run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t0:.4f}", "-t", f"{dur:.4f}", "-i", stem, "-ac", "1", "-ar", "16000", au])
    env = dict(os.environ, OMP_NUM_THREADS=str(os.cpu_count()))
    if "ref" in r:
        env["LS_REF_FRAME"] = str(r["ref"])
    py = os.path.join(LS, ".venv", "bin", "python")
    log = os.path.join(DIR, f"{r['name']}.log")
    with open(log, "w") as fh:
        rc = subprocess.run([py, "-m", "scripts.inference", "--unet_config_path", "configs/unet/stage2_512.yaml",
                             "--inference_ckpt_path", "checkpoints/latentsync_unet.pt", "--inference_steps", str(CFG.get("steps", 20)),
                             "--guidance_scale", str(CFG.get("guidance", 1.5)), "--enable_deepcache", "--seed", str(CFG.get("seed", 1247)),
                             "--video_path", v, "--audio_path", au, "--video_out_path", out,
                             "--temp_dir", os.path.join(DIR, f"tmp_{r['name']}")],
                            cwd=LS, env=env, stdout=fh, stderr=subprocess.STDOUT).returncode
    if rc or not os.path.exists(out):
        sys.exit(f"LatentSync failed on {r['name']} (exit {rc}), see {log}")
    print(f"{r['name']}: frames {a}-{b} → {out}", flush=True)


def splice():
    """המקור, ובכל טווח: הפלט של LatentSync מוחזר ל־23.976 ונחתך בדיוק למספר הפריימים."""
    parts, fc, k, pos = [], [], 0, 0
    ins = ["-i", SRC]
    ready = [r for r in CFG["ranges"] if os.path.exists(os.path.join(DIR, f"{r['name']}_ls.mp4"))]
    for r in sorted(ready, key=lambda r: r["start"]):
        a, b = frame(r["start"]), frame(r["end"])
        if a > pos:
            fc.append(f"[0:v]trim=start_frame={pos}:end_frame={a},setpts=PTS-STARTPTS[p{k}]"); parts.append(f"[p{k}]"); k += 1
        ins += ["-i", os.path.join(DIR, f"{r['name']}_ls.mp4")]
        i = len(ins) // 2 - 1
        fc.append(f"[{i}:v]fps={FPS_NUM}/{FPS_DEN},trim=end_frame={b - a},setpts=PTS-STARTPTS,"
                  f"tpad=stop_mode=clone:stop={b - a},trim=end_frame={b - a}[p{k}]")
        parts.append(f"[p{k}]"); k += 1
        pos = b
    fc.append(f"[0:v]trim=start_frame={pos},setpts=PTS-STARTPTS[p{k}]"); parts.append(f"[p{k}]")
    fc.append("".join(parts) + f"concat=n={len(parts)}:v=1:a=0,setsar=1[v]")
    run(["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", ";".join(fc), "-map", "[v]", "-map", "0:a?",
         "-c:v", "libx264", "-crf", "10", "-preset", "slow", "-r", f"{FPS_NUM}/{FPS_DEN}", "-c:a", "copy", OUT])
    print("→", OUT)


def main():
    os.makedirs(DIR, exist_ok=True)
    only = sys.argv[sys.argv.index("--only") + 1] if "--only" in sys.argv else None
    if "--splice" not in sys.argv:
        stem = voice_stem()
        for r in CFG["ranges"]:
            done = os.path.exists(os.path.join(DIR, f"{r['name']}_ls.mp4"))
            if (only and r["name"] == only) or (not only and not done):
                render(r, voice_stem(r) if r.get("drive") else stem)
        if only:
            return
    splice()


if __name__ == "__main__":
    main()
