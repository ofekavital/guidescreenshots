#!/usr/bin/env python3
"""
מיקס האודיו ומיזוג עם התמונה.

  python3 mix.py                       picture.mp4 + מיקס → $WORK/nofeshon_vN.mp4
  python3 mix.py --out /path/file.mp4

מקורות (כל מה שקיים נכנס למיקס):
  dialog.wav          אודיו ההרצאה, ממוקם על ציר הזמן (build.py)
  audio/music_open.*  פסקול הפתיחה — ברירת מחדל: הפסקול המקורי מ־reference/music (זמני)
  audio/music_main.*  הפסקול הראשי — כנ"ל
  audio/vo/*.wav      קריינות; שם הקובץ <segId>@<offset>.wav ממקם אותה על השוט
  audio/sfx/*.wav     אפקטים; אותה מוסכמת שמות
המוזיקה מונמכת אוטומטית (sidechain) מתחת לדיאלוג ולקריינות, והמיקס מנורמל ל־‎-16 LUFS.
"""
import glob, json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.environ.get("WORK", "/home/user/footage/work")
TL = json.load(open(os.path.join(HERE, "timeline.json")))
SEG = {s["id"]: s for s in TL["segments"]}
TOTAL = TL["duration"]
AUDIO = os.path.join(WORK, "audio")
REF = os.path.join(HERE, "..", "reference", "music")


def pick(name, fallback):
    found = sorted(glob.glob(os.path.join(AUDIO, name + ".*")))
    return found[0] if found else fallback


def placed(pattern):
    """קבצים בשם <segId>@<offset>.wav → (נתיב, זמן התחלה בשניות)."""
    out = []
    for f in sorted(glob.glob(os.path.join(AUDIO, pattern, "*.wav"))):
        stem = os.path.basename(f)[:-4]
        seg, _, off = stem.partition("@")
        seg = seg.split("~")[0]  # מאפשר כמה קבצים לאותו שוט: 16~a@0.4
        if seg in SEG:
            out.append((f, SEG[seg]["start"] + float(off or 0)))
    return out


def main():
    picture = os.path.join(WORK, "picture.mp4")
    out = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else None
    if not out:
        n = 1
        while os.path.exists(os.path.join(WORK, f"nofeshon_v{n}.mp4")):
            n += 1
        out = os.path.join(WORK, f"nofeshon_v{n}.mp4")

    clock = SEG["02"]["start"]
    m1 = pick("music_open", os.path.join(REF, "01_opening_Unproductive_Status_Update.mp3"))
    m2 = pick("music_main", os.path.join(REF, "02_main_Chasing_Horizons.mp3"))
    temp_main = m2.startswith(REF)

    inputs = ["-i", picture, "-i", os.path.join(WORK, "dialog.wav"), "-i", m1, "-i", m2]
    fc = []
    # פסקול הפתיחה: מההתחלה ועד השעון, עם יציאה רכה אל תוך השעון
    fc.append(f"[2:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:{clock + 1.5},"
              f"afade=t=out:st={clock - 0.3}:d=1.8,volume=0.9[m1]")
    if temp_main:
        # הפסקול הזמני קצר מהנדרש: שני עותקים בהצלבה של 3 שניות
        fc.append(f"[3:a]aresample=48000,aformat=channel_layouts=stereo,asplit=2[m2a][m2b0]")
        fc.append(f"[m2b0]atrim=start=8,asetpts=PTS-STARTPTS[m2b]")
        fc.append(f"[m2a][m2b]acrossfade=d=3[m2c]")
        main_src = "[m2c]"
    else:
        fc.append(f"[3:a]aresample=48000,aformat=channel_layouts=stereo[m2c]")
        main_src = "[m2c]"
    ms = round(clock * 1000)
    fc.append(f"{main_src}atrim=0:{TOTAL - clock},afade=t=in:d=0.4,afade=t=out:st={TOTAL - clock - 3}:d=3,"
              f"adelay={ms}|{ms},volume=0.85[m2]")
    fc.append("[m1][m2]amix=inputs=2:normalize=0[music]")

    # קריינות + דיאלוג = ערוץ "הדיבור" שמנמיך את המוזיקה
    voice = ["[1:a]aresample=48000,aformat=channel_layouts=stereo[dlg]"]
    k = 4
    vo_labels = ["[dlg]"]
    for f, t in placed("vo"):
        inputs += ["-i", f]
        d = round(t * 1000)
        voice.append(f"[{k}:a]aresample=48000,aformat=channel_layouts=stereo,adelay={d}|{d}[vo{k}]")
        vo_labels.append(f"[vo{k}]")
        k += 1
    fc += voice
    fc.append("".join(vo_labels) + f"amix=inputs={len(vo_labels)}:normalize=0,apad=whole_dur={TOTAL},asplit=2[speech][key]")
    fc.append("[music][key]sidechaincompress=threshold=0.03:ratio=6:attack=40:release=450:makeup=1[ducked]")

    sfx_labels = []
    for f, t in placed("sfx"):
        inputs += ["-i", f]
        d = round(t * 1000)
        fc.append(f"[{k}:a]aresample=48000,aformat=channel_layouts=stereo,adelay={d}|{d}[sx{k}]")
        sfx_labels.append(f"[sx{k}]")
        k += 1
    mix_in = ["[ducked]", "[speech]"] + sfx_labels
    fc.append("".join(mix_in) + f"amix=inputs={len(mix_in)}:normalize=0,atrim=0:{TOTAL},"
              "loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[a]")

    cmd = ["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(fc),
           "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", out]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        sys.exit(r.stderr[-3000:])
    print("→", out)


if __name__ == "__main__":
    main()
