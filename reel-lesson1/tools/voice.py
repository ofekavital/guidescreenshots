"""Assemble the narration track and the timing map for the animation.

Reads the chosen TTS takes (audio/raw), their word timestamps (audio/words)
and the scene/beat structure (build/scenes.json). Shortens long pauses,
inserts per-beat holds, speeds the whole track up by a constant factor and
writes:
  build/voice.wav     final narration
  build/timing.json   per-scene, per-beat and per-word times on the final timeline

Usage: python3 voice.py <target_seconds>
"""
import json
import subprocess
import sys
import wave
import numpy as np

SR = 44100
TAKES = ['c0_wmGO', 'c1_HlVO', 'c2_hYwL', 'c3_a0Qp', 'c4_vb19']
LEAD_IN = 0.35       # silence before the first word
CHUNK_GAP = 0.30     # pause between chunks (before atempo)
TAIL = 2.6           # end card after the last word (final timeline seconds)
MAX_TEMPO = 1.2
SCENE_GAP = 0.15   # extra pause at every scene change (before atempo)


def decode(path):
    raw = subprocess.run(
        ['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
        check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def pause_target(word):
    t = word.rstrip('"״')
    if t.endswith('...'):
        return 0.30
    if t[-1:] in '.?!':
        return 0.20
    if t[-1:] == ':':
        return 0.15
    if t[-1:] == ',':
        return 0.10
    return 0.05


def keep_total(target):
    return max(0.06, target * 0.5) + max(0.04, target - max(0.06, target * 0.5))


def silent_runs(x, thresh_db=-36.0, hop=0.01):
    n = int(hop * SR)
    frames = len(x) // n
    rms = np.sqrt(np.mean(x[:frames * n].reshape(frames, n) ** 2, axis=1) + 1e-12)
    db = 20 * np.log10(rms)
    quiet = db < thresh_db
    runs = []
    i = 0
    while i < frames:
        if quiet[i]:
            j = i
            while j < frames and quiet[j]:
                j += 1
            runs.append((i * hop, j * hop))
            i = j
        else:
            i += 1
    return runs


def process_chunk(x, words):
    """Return (segments, mapper). segments: list of np arrays; mapper maps
    source time -> output time (before atempo)."""
    runs = silent_runs(x)
    # edits: list of (src_start, src_end) to delete, and (src_time, seconds) holds
    cuts = []
    first, last = words[0]['start'], words[-1]['end']
    for (a, b) in runs:
        if b <= first or a >= last + 0.05:
            continue
        # which word precedes this silence
        prev = None
        for w in words:
            if w['start'] <= a + 0.02:
                prev = w
        if prev is None:
            continue
        target = pause_target(prev['text'])
        dur = b - a
        if dur > keep_total(target) + 0.02:
            # keep a little extra on both sides so soft word endings survive
            keep_a = max(0.06, target * 0.5)
            keep_b = max(0.04, target - keep_a)
            cuts.append((a + keep_a, b - keep_b))
    # trim head/tail outside speech
    head = max(0.0, first - 0.08)
    tail = min(len(x) / SR, last + 0.25)
    pieces = []
    t = head
    for (a, b) in sorted(cuts):
        if a <= t:
            continue
        pieces.append((t, a))
        t = b
    pieces.append((t, tail))

    out = []
    mapping = []  # (src_a, src_b, out_a)
    pos = 0.0
    fade = int(0.006 * SR)
    for (a, b) in pieces:
        seg = x[int(a * SR):int(b * SR)].copy()
        if len(seg) > 2 * fade:
            seg[:fade] *= np.linspace(0, 1, fade)
            seg[-fade:] *= np.linspace(1, 0, fade)
        out.append(seg)
        mapping.append((a, b, pos))
        pos += len(seg) / SR
    total = pos

    def mapper(ts):
        for (a, b, o) in mapping:
            if ts < a:
                return o
            if a <= ts <= b:
                return o + (ts - a)
        return total
    return out, mapping, mapper, total


def main():
    target = float(sys.argv[1])
    scenes = json.load(open('build/scenes.json', encoding='utf-8'))
    # flatten beats per chunk, attaching word ranges
    chunk_beats = {}
    for si, s in enumerate(scenes):
        for bi, b in enumerate(s['beats']):
            if bi == len(s['beats']) - 1 and si < len(scenes) - 1:
                b = dict(b, hold=b.get('hold', 0) + SCENE_GAP)
            chunk_beats.setdefault(s['chunk'], []).append((si, bi, b))

    all_audio = [np.zeros(int(LEAD_IN * SR), dtype=np.float32)]
    cursor = LEAD_IN
    words_out = []   # (scene, beat, idx_in_beat, text, start, end) pre-tempo
    for k, take in enumerate(TAKES):
        x = decode(f'audio/raw/{take}.mp3')
        words = [w for w in json.load(open(f'audio/words/c{k}.json', encoding='utf-8'))['words'] if w['type'] == 'word']
        segs, mapping, mapper, total = process_chunk(x, words)
        # assign words to beats in order
        wi = 0
        beat_words = []
        for (si, bi, b) in chunk_beats[k]:
            n = len(b['say'].split())
            beat_words.append((si, bi, b, words[wi:wi + n]))
            wi += n
        assert wi == len(words), (k, wi, len(words))
        # rebuild audio inserting holds after beats that request them
        chunk_audio = np.concatenate(segs)
        inserts = []  # (out_time, seconds)
        for (si, bi, b, ws) in beat_words:
            if b.get('hold'):
                inserts.append((mapper(ws[-1]['end']) + 0.12, b['hold']))
        pieces = []
        last = 0
        shift_pts = []
        acc = 0.0
        for (ot, hs) in sorted(inserts):
            i = int(ot * SR)
            pieces.append(chunk_audio[last:i])
            pieces.append(np.zeros(int(hs * SR), dtype=np.float32))
            shift_pts.append((ot, hs))
            last = i
        pieces.append(chunk_audio[last:])
        chunk_audio = np.concatenate(pieces)

        def shifted(t):
            s = 0.0
            for (ot, hs) in shift_pts:
                if t >= ot:
                    s += hs
            return t + s

        for (si, bi, b, ws) in beat_words:
            for j, w in enumerate(ws):
                words_out.append({
                    'scene': si, 'beat': bi, 'i': j, 'text': w['text'],
                    'start': cursor + shifted(mapper(w['start'])),
                    'end': cursor + shifted(mapper(w['end'])),
                })
        all_audio.append(chunk_audio.astype(np.float32))
        cursor += len(chunk_audio) / SR
        if k < len(TAKES) - 1:
            all_audio.append(np.zeros(int(CHUNK_GAP * SR), dtype=np.float32))
            cursor += CHUNK_GAP

    voice = np.concatenate(all_audio)
    pre = len(voice) / SR
    tempo = min(MAX_TEMPO, max(1.0, pre / (target - TAIL)))
    print(f'pre-tempo {pre:.2f}s -> tempo {tempo:.3f} -> {pre / tempo + TAIL:.2f}s')

    with wave.open('build/voice_pre.wav', 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(voice, -1, 1) * 32767).astype(np.int16).tobytes())
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', 'build/voice_pre.wav',
                    '-af', f'atempo={tempo:.4f},apad=pad_dur={TAIL}',
                    '-ar', str(SR), 'build/voice.wav'], check=True)

    for w in words_out:
        w['start'] = round(w['start'] / tempo, 3)
        w['end'] = round(w['end'] / tempo, 3)
    duration = round(pre / tempo + TAIL, 3)

    timing = {'duration': duration, 'tempo': tempo, 'scenes': []}
    for si, s in enumerate(scenes):
        beats = []
        for bi, b in enumerate(s['beats']):
            ws = [w for w in words_out if w['scene'] == si and w['beat'] == bi]
            beats.append({'start': ws[0]['start'], 'end': ws[-1]['end'],
                          'words': [[w['text'], w['start'], w['end']] for w in ws]})
        timing['scenes'].append({'id': s['id'], 'beats': beats})
    json.dump(timing, open('build/timing.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('duration', duration)


if __name__ == '__main__':
    main()
