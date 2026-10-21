"""Synthesize a soft lo-fi bed and a few UI sound effects with numpy.

Usage: python3 music.py <duration_seconds> <out_dir>
Writes bed.wav, whoosh.wav, pop.wav, riser.wav, impact.wav into out_dir.
"""
import sys
import wave
import numpy as np

SR = 44100
rng = np.random.default_rng(7)


def write_wav(path, x):
    x = np.clip(x, -1, 1)
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    data = (x * 32767).astype(np.int16)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


def midi_hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def lowpass(x, cutoff):
    # windowed-sinc FIR, vectorized via FFT convolution
    n = 255
    t = np.arange(n) - (n - 1) / 2
    h = np.sinc(2 * cutoff / SR * t) * np.hanning(n)
    h /= h.sum()
    return fft_conv(x, h)


def fft_conv(x, h):
    n = len(x) + len(h) - 1
    nfft = 1 << (n - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(x, nfft) * np.fft.rfft(h, nfft), nfft)[:n]
    off = (len(h) - 1) // 2
    return y[off:off + len(x)]


def pad_note(freq, dur, amp=1.0):
    t = np.arange(int(dur * SR)) / SR
    sig = np.zeros_like(t)
    for det in (-0.0018, 0.0, 0.0021):
        f = freq * (1 + det)
        sig += np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) + 0.12 * np.sin(2 * np.pi * 3 * f * t)
    att, rel = 0.6, 0.9
    env = np.minimum(1, t / att) * np.minimum(1, (dur - t) / rel).clip(0, 1)
    return sig * env * amp / 3


def pluck(freq, dur=0.5, amp=1.0):
    t = np.arange(int(dur * SR)) / SR
    sig = np.sin(2 * np.pi * freq * t) + 0.25 * np.sin(2 * np.pi * 2 * freq * t)
    env = np.exp(-t * 7) * np.minimum(1, t / 0.004)
    return sig * env * amp


def kick():
    t = np.arange(int(0.35 * SR)) / SR
    f = 45 + 85 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 9) * np.minimum(1, t / 0.002)


def hat():
    t = np.arange(int(0.06 * SR)) / SR
    n = rng.standard_normal(len(t))
    n = np.diff(np.diff(n, prepend=0), prepend=0)
    return n * np.exp(-t * 70) * 0.25


def snare():
    t = np.arange(int(0.22 * SR)) / SR
    n = np.diff(rng.standard_normal(len(t)), prepend=0)
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30)
    return (n * 0.35 * np.exp(-t * 22) + tone * 0.5)


def add(buf, sig, at):
    i = int(at * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[:j - i]


def bed(duration):
    bpm = 92
    beat = 60 / bpm
    bar = beat * 4
    n = int((duration + 2) * SR)
    pad = np.zeros(n)
    bass = np.zeros(n)
    drums = np.zeros(n)
    keys = np.zeros(n)
    # A minor: Am - F - C - G (two bars each) with 7ths for a softer colour
    prog = [
        (57, [57, 60, 64, 67]),
        (53, [53, 57, 60, 64]),
        (48, [55, 60, 64, 67]),
        (55, [55, 59, 62, 65]),
    ]
    pent = [69, 72, 74, 76, 79, 81]
    t = 0.0
    k = 0
    while t < duration + 1:
        root, chord = prog[k % 4]
        dur = bar * 2
        for m in chord:
            add(pad, pad_note(midi_hz(m), dur + 0.6, 0.16), t)
        for b in range(8):
            bt = t + b * beat
            if b % 4 in (0, 2) or b == 7:
                add(bass, pluck(midi_hz(root - 12), 0.6, 0.5), bt)
        # drums come in after the intro
        if t >= bar * 2:
            for b in range(8):
                bt = t + b * beat
                if b % 2 == 0:
                    add(drums, kick() * 0.55, bt)
                else:
                    add(drums, snare() * 0.22, bt)
                for e in range(2):
                    swing = 0.0 if e == 0 else beat * 0.56
                    add(drums, hat() * (0.5 if e else 0.35), bt + swing)
        # sparse keys sparkle
        for s in range(16):
            if rng.random() < 0.22:
                add(keys, pluck(midi_hz(int(rng.choice(pent))), 0.7, 0.12), t + s * beat / 2)
        t += dur
        k += 1
    pad = lowpass(pad, 1800)
    keys = lowpass(keys, 3500)
    mix = pad + bass * 0.8 + drums * 0.9 + keys
    mix = mix[:int(duration * SR)]
    # fades
    tt = np.arange(len(mix)) / SR
    mix *= np.minimum(1, tt / 1.5) * np.clip((duration - tt) / 2.5, 0, 1)
    mix /= np.max(np.abs(mix)) + 1e-9
    return mix * 0.8


def whoosh():
    d = 0.55
    t = np.arange(int(d * SR)) / SR
    n = rng.standard_normal(len(t))
    lo = lowpass(n, 900)
    hi = n - lowpass(n, 2500)
    sweep = np.sin(np.pi * t / d) ** 2
    mix = lo * (1 - t / d) + hi * (t / d) * 0.6
    out = mix * sweep
    return out / np.max(np.abs(out)) * 0.6


def pop():
    t = np.arange(int(0.09 * SR)) / SR
    f = 700 + 900 * np.exp(-t * 60)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 45) * 0.5


def riser():
    d = 1.2
    t = np.arange(int(d * SR)) / SR
    n = rng.standard_normal(len(t))
    hi = n - lowpass(n, 1500)
    f = 200 + 900 * (t / d) ** 2
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.3
    env = (t / d) ** 2
    out = (hi * 0.4 + tone) * env
    return out / np.max(np.abs(out)) * 0.5


def impact():
    t = np.arange(int(0.9 * SR)) / SR
    f = 38 + 70 * np.exp(-t * 16)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 4)
    n = lowpass(rng.standard_normal(len(t)), 1200) * np.exp(-t * 12) * 0.6
    out = boom + n
    return out / np.max(np.abs(out)) * 0.7


if __name__ == '__main__':
    dur = float(sys.argv[1])
    out = sys.argv[2]
    write_wav(f'{out}/bed.wav', bed(dur))
    write_wav(f'{out}/whoosh.wav', whoosh())
    write_wav(f'{out}/pop.wav', pop())
    write_wav(f'{out}/riser.wav', riser())
    write_wav(f'{out}/impact.wav', impact())
    print('ok')
