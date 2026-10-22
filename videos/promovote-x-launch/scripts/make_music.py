"""Procedural music bed + sound effects for the PromoVote X launch film.

Everything is synthesized here (no samples, no library tracks), so the audio is ours to use.
Cuts follow index.html: 3.2, 5.6, 8.0, 9.8 (logo), 12.6, 16.0, 19.4, 22.8, 26.0 (stats), 29.0 (end card), 33.0.
Run: python3 scripts/make_music.py  ->  assets/music.wav (48 kHz stereo)
"""
import wave
import numpy as np

SR = 48000
DUR = 33.0
N = int(SR * DUR)
BPM = 120
BEAT = 60 / BPM
rng = np.random.default_rng(7)  # fixed seed: the same file every run

L = np.zeros(N)
R = np.zeros(N)


def t_arr(sec):
    return np.arange(int(sec * SR)) / SR


def place(sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= N:
        return
    s = sig[: N - i] * gain
    L[i : i + len(s)] += s * (1 - max(pan, 0))
    R[i : i + len(s)] += s * (1 + min(pan, 0))


def env(n, a=0.005, d=0.2, curve=4.0):
    t = np.arange(n) / SR
    e = np.minimum(1, t / a) * np.exp(-t / d * curve / 4)
    return e


def kick(strength=1.0):
    t = t_arr(0.45)
    f = 45 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 7) * strength


def snare():
    t = t_arr(0.3)
    noise = rng.standard_normal(len(t))
    noise = np.diff(noise, prepend=0)  # brighter
    tone = np.sin(2 * np.pi * 190 * t)
    return (0.55 * noise * np.exp(-t * 18) + 0.4 * tone * np.exp(-t * 25))


def hat(open_=False):
    t = t_arr(0.25 if open_ else 0.06)
    n = np.diff(rng.standard_normal(len(t)), prepend=0)
    n = np.diff(n, prepend=0)
    return n * np.exp(-t * (14 if open_ else 70)) * 0.25


def saw(freq, sec, detune=0.0):
    t = t_arr(sec)
    out = np.zeros(len(t))
    for d in (-detune, 0, detune):
        ph = (t * freq * (1 + d)) % 1.0
        out += 2 * ph - 1
    return out / 3


def lowpass(x, cutoff):
    # one-pole low-pass, enough for warmth
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a) * x[i] + a * acc
        y[i] = acc
    return y


def lowpass_fast(x, cutoff):
    # vectorized approximation: repeated moving average
    k = max(1, int(SR / cutoff / 2))
    kernel = np.ones(k) / k
    y = np.convolve(x, kernel, mode="same")
    return np.convolve(y, kernel, mode="same")


def pad(freqs, sec, cutoff=1200, gain=0.12):
    t = t_arr(sec)
    sig = sum(saw(f, sec, 0.004) for f in freqs) / len(freqs)
    sig = lowpass_fast(sig, cutoff)
    fade = np.minimum(1, t / 0.6) * np.minimum(1, (sec - t) / 0.5)
    return sig * fade * gain


def whoosh(sec=0.55, up=True):
    t = t_arr(sec)
    n = rng.standard_normal(len(t))
    # sweep a moving-average band: narrow to wide
    out = np.zeros(len(t))
    steps = 12
    seg = len(t) // steps
    for s in range(steps):
        frac = s / steps if up else 1 - s / steps
        k = int(40 - 34 * frac) + 1
        chunk = n[s * seg : (s + 1) * seg]
        out[s * seg : (s + 1) * seg] = np.convolve(chunk, np.ones(k) / k, mode="same")
    shape = np.sin(np.pi * t / sec) ** 2
    return out * shape * 0.9


def riser(sec):
    t = t_arr(sec)
    f = 200 * (8 ** (t / sec))
    ph = 2 * np.pi * np.cumsum(f) / SR
    tone = np.sin(ph) * 0.25 + saw(1, sec) * 0  # placeholder keeps shape
    noise = rng.standard_normal(len(t))
    noise = np.convolve(noise, np.ones(6) / 6, mode="same")
    grow = (t / sec) ** 2.2
    return (tone + noise * 0.5) * grow * 0.6


def impact():
    t = t_arr(2.2)
    boom = np.sin(2 * np.pi * (38 + 60 * np.exp(-t * 6)) * t) * np.exp(-t * 2.2)
    n = rng.standard_normal(len(t))
    crash = np.diff(n, prepend=0) * np.exp(-t * 3.5) * 0.35
    return boom * 1.1 + crash


def pluck(freq, sec=0.35):
    t = t_arr(sec)
    return (np.sin(2 * np.pi * freq * t) + 0.3 * np.sin(4 * np.pi * freq * t)) * np.exp(-t * 9) * 0.35


def note(n):  # MIDI to Hz
    return 440 * 2 ** ((n - 69) / 12)


# ---- Part A: the problem (0 to 9.8): low pad, ticking hats, sparse kick, riser into the logo
A_MINOR = [note(45), note(52), note(57), note(60)]
place(pad(A_MINOR, 5.6, cutoff=700, gain=0.16), 0.0)
F_MAJ7 = [note(41), note(48), note(53), note(57)]
place(pad(F_MAJ7, 4.4, cutoff=900, gain=0.16), 5.4)
b = 0.0
while b < 9.6:
    place(hat(), b + BEAT / 2, 0.6, pan=0.25)
    if int(round(b / BEAT)) % 4 == 0:
        place(kick(0.75), b)
    b += BEAT
place(riser(1.8), 8.0, 0.55)

# ---- Logo impact
place(impact(), 9.8, 0.9)

# ---- Part B: the beat (9.8 to 29): four on the floor, claps, bass, stabs
prog = [  # chord roots and voicings per bar (2 s per bar at 120 bpm)
    (note(45), [57, 60, 64]),  # Am
    (note(41), [57, 60, 65]),  # F
    (note(36), [55, 60, 64]),  # C
    (note(43), [55, 59, 62]),  # G
]
t0 = 9.8
bar = 0
while t0 < 29.0:
    root, chord = prog[bar % 4]
    for beat in range(4):
        tb = t0 + beat * BEAT
        if tb >= 29.0:
            break
        place(kick(1.0), tb)
        place(hat(), tb + BEAT / 2, 0.8, pan=-0.2)
        place(hat(), tb + BEAT / 4 * 3, 0.35, pan=0.3)
        if beat in (1, 3):
            place(snare(), tb, 0.55)
        # bass: root on 1 and the offbeats
        for off in (0, 0.5 * BEAT):
            bs = saw(root, 0.22)
            bs = lowpass_fast(bs, 420) * env(len(bs), 0.003, 0.18)
            place(bs, tb + off, 0.5)
    stab = sum(saw(note(m), 0.3, 0.003) for m in chord) / 3
    stab = lowpass_fast(stab, 2600) * env(len(stab), 0.004, 0.25)
    place(stab, t0, 0.22, pan=-0.15)
    place(stab, t0 + 1.5 * BEAT, 0.16, pan=0.15)
    t0 += 4 * BEAT
    bar += 1

# soft pad under the feature beats
place(pad([note(57), note(60), note(64), note(69)], 16.4, cutoff=1600, gain=0.07), 12.6)

# ---- Whooshes into every cut
for cut in (3.2, 5.6, 8.0, 12.6, 16.0, 19.4, 22.8, 26.0, 29.0):
    place(whoosh(0.5), cut - 0.38, 0.35)

# ---- Stat pops (26.05 + 0.28 each), rising notes
for i, m in enumerate((69, 72, 76, 81)):
    place(pluck(note(m)), 26.1 + 0.28 * i, 0.9, pan=(-0.3 + 0.2 * i))

# ---- End card: final hit and a ringing chord that fades out
place(impact(), 29.0, 0.7)
END = [note(45), note(57), note(60), note(64), note(69)]
place(pad(END, 4.0, cutoff=2000, gain=0.16), 29.0)
for i, m in enumerate((69, 76, 81)):
    place(pluck(note(m), 1.2), 30.0 + 0.12 * i, 0.6)

# ---- Simple room: two feedback delays
mix_L, mix_R = L.copy(), R.copy()
for d, g in ((0.031, 0.25), (0.047, 0.2), (0.089, 0.12)):
    k = int(d * SR)
    mix_L[k:] += R[:-k] * g
    mix_R[k:] += L[:-k] * g

# fade in/out and normalize
t = np.arange(N) / SR
fade = np.minimum(1, t / 0.08) * np.minimum(1, (DUR - t) / 1.5)
mix_L *= fade
mix_R *= fade
peak = max(np.abs(mix_L).max(), np.abs(mix_R).max())
mix_L /= peak / 0.89
mix_R /= peak / 0.89
stereo = np.stack([mix_L, mix_R], axis=1)
pcm = (np.tanh(stereo * 1.15) / np.tanh(1.15) * 32767 * 0.95).astype(np.int16)

with wave.open("assets/music.wav", "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("wrote assets/music.wav", round(DUR, 1), "s")
