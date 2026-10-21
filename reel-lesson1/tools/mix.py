"""Mix narration, music bed and SFX into build/mix.wav (loudness-normalised).

Usage: python3 mix.py
Needs build/voice.wav, build/sfx.json and audio/sfx/*.wav (from music.py).
"""
import json
import subprocess
import wave
import numpy as np

SR = 44100


def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


def db(x):
    return 10 ** (x / 20)


def rms(x):
    return float(np.sqrt(np.mean(x ** 2) + 1e-12))


def main():
    cues = json.load(open('build/sfx.json'))
    dur = cues['duration']
    n = int(dur * SR)

    # light voice polish: high-pass + gentle compression
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', 'build/voice.wav', '-af',
                    'highpass=f=70,acompressor=threshold=-22dB:ratio=2.5:attack=5:release=90:makeup=2',
                    'build/voice_fx.wav'], check=True)
    voice = load('build/voice_fx.wav')[:n]
    voice = np.pad(voice, ((0, n - len(voice)), (0, 0)))
    speech = voice[np.abs(voice[:, 0]) > 0.01]
    voice *= db(-18) / rms(speech)

    bed = load('audio/sfx/bed.wav')[:n]
    bed = np.pad(bed, ((0, n - len(bed)), (0, 0)))
    # side-chain duck: follow the voice envelope (~80 ms), dip the bed by up to 7 dB
    env = np.abs(voice[:, 0])
    k = int(0.08 * SR)
    env = np.convolve(env, np.ones(k) / k, mode='same')
    env = np.clip(env / (np.percentile(env[env > 1e-4], 70) + 1e-9), 0, 1)
    att = int(0.25 * SR)
    env = np.convolve(env, np.hanning(att) / np.hanning(att).sum(), mode='same')
    duck = 1 - 0.55 * np.clip(env, 0, 1)
    bed *= (db(-31) / rms(bed)) * duck[:, None]

    fx = np.zeros((n, 2), dtype=np.float32)
    lib = {name: load(f'audio/sfx/{name}.wav') for name in ('whoosh', 'pop', 'impact', 'riser')}
    level = {'whoosh': db(-27), 'pop': db(-30), 'impact': db(-24), 'riser': db(-30)}
    for c in cues['sfx']:
        s = lib[c['name']]
        s = s * (level[c['name']] / rms(s)) * c['gain']
        i = int(c['t'] * SR)
        j = min(n, i + len(s))
        if i < n:
            fx[i:j] += s[:j - i]

    mix = voice + bed + fx
    # fade out the last 0.6 s
    mix[-int(0.6 * SR):] *= np.linspace(1, 0, int(0.6 * SR))[:, None]
    with wave.open('build/mix_raw.wav', 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())

    # two-pass loudnorm to -14 LUFS / -1.5 dBTP (social platforms)
    first = subprocess.run(['ffmpeg', '-hide_banner', '-i', 'build/mix_raw.wav', '-af',
                            'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'],
                           capture_output=True, text=True).stderr
    js = json.loads(first[first.rindex('{'):first.rindex('}') + 1])
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', 'build/mix_raw.wav', '-af',
                    'loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={input_i}:measured_TP={input_tp}:measured_LRA={input_lra}:'
                    'measured_thresh={input_thresh}:offset={target_offset}:linear=true'.format(**js),
                    '-ar', str(SR), 'build/mix.wav'], check=True)
    print('mix ok', dur)


if __name__ == '__main__':
    main()
