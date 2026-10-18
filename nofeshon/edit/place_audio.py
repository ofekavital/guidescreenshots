#!/usr/bin/env python3
"""
מכין את קבצי הקריינות והאפקטים למיקס לפי audio_cues.json.

  python3 place_audio.py      → $WORK/audio/vo/*.wav, $WORK/audio/sfx/*.wav

כל פריט נחתך (ss/to), מהודק (cut), מקבל פייד קצר בקצוות ומיושר לעוצמת היעד:
lufs, או peak (dBFS) לקטעים קצרים. af מוסיף פילטר (למשל חדר).
שם הקובץ <segId>~<name>@<at>.wav הוא המוסכמה ש־mix.py קורא.
"""
import glob, json, os, re, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.environ.get("WORK", "/home/user/footage/work")
CFG = json.load(open(os.path.join(HERE, "audio_cues.json")))


def chain(it):
    """שרשרת הפילטרים לפני הגברה: חיתוך, הידוק ופיידים."""
    f = []
    if "ss" in it or "to" in it:
        f.append(f"atrim={it.get('ss', 0)}" + (f":{it['to']}" if "to" in it else "") + ",asetpts=PTS-STARTPTS")
    for a, b in it.get("cut", []):
        f.append(f"aselect='not(between(t\\,{a}\\,{b}))',asetpts=N/SR/TB")
    f.append("aresample=48000,aformat=channel_layouts=stereo,afade=t=in:d=0.005,areverse,afade=t=in:d=0.06,areverse")
    if "af" in it:
        f.append(it["af"])
    return ",".join(f)


def loudness(src, af):
    r = subprocess.run(["ffmpeg", "-v", "info", "-i", src, "-af", af + ",ebur128", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    m = re.findall(r"I:\s+(-?[\d.]+) LUFS", r)
    return float(m[-1]) if m else None


def peak(src, af):
    """לקטעים קצרים מ־0.4 שניות, שבהם מדידת LUFS לא עובדת."""
    r = subprocess.run(["ffmpeg", "-v", "info", "-i", src, "-af", af + ",volumedetect", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    return float(re.findall(r"max_volume: (-?[\d.]+) dB", r)[-1])


def main():
    for kind in ("vo", "sfx"):
        d = os.path.join(WORK, "audio", kind)
        os.makedirs(d, exist_ok=True)
        for f in glob.glob(os.path.join(d, "*.wav")):
            os.remove(f)
    for it in CFG["items"]:
        src = os.path.join(CFG["src"], it["src"])
        af = chain(it)
        if "peak" in it:
            gain = it["peak"] - peak(src, af)
        else:
            i = loudness(src, af)
            gain = 0 if i is None or i < -60 else it["lufs"] - i
        out = os.path.join(WORK, "audio", it["kind"], f"{it['seg']}~{it['name']}@{it['at']}.wav")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-af", f"{af},volume={gain:.2f}dB,alimiter=limit=0.95",
                        "-c:a", "pcm_s16le", out], check=True)
        print(f"{it['kind']:3} {it['seg']:6} {it['name']:9} @{it['at']:<5} {gain:+6.1f}dB")


if __name__ == "__main__":
    main()
