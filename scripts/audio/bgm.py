#!/usr/bin/env python3
import argparse
import json
import math
import struct
import sys
import subprocess
from pathlib import Path

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False

DEFAULT_SAMPLE_RATE = 44100
FADE_IN_SEC = 2.0
FADE_OUT_SEC = 3.0

STYLES = {
    "warm_stage": {
        "label": "暖沙舞台风（默认）",
        "desc": "低频 kick 4/4 拍 + 沙粒白噪声 pad + 每拍 8 分音符 palm muted，暖沙舞台现场感",
        "kick_amp": 0.45,
        "pad_amp": 0.28,
        "palm_amp": 0.18,
        "bass_amp": 0.0,
        "pad_cool": False,
        "palm_mute_prob": 0.0,
        "has_kick": True,
        "has_palm": True,
        "has_bass": False,
        "has_windchime": False,
    },
    "cool_cinema": {
        "label": "冷调写实电影感（推荐冷光台）",
        "desc": "冷感低频 sine 贝斯 + 冷沙 pad + 轻 kick，适配冷光台灰沙写实风格",
        "kick_amp": 0.22,
        "pad_amp": 0.32,
        "palm_amp": 0.10,
        "bass_amp": 0.30,
        "pad_cool": True,
        "palm_mute_prob": 0.20,
        "has_kick": True,
        "has_palm": True,
        "has_bass": True,
        "has_windchime": False,
    },
    "flow_ambient": {
        "label": "长卷流水环境音",
        "desc": "无 kick，纯环境沙粒流 fBM 噪声 pad + 偶尔风铃高频，长卷/流水题材",
        "kick_amp": 0.0,
        "pad_amp": 0.42,
        "palm_amp": 0.0,
        "bass_amp": 0.0,
        "pad_cool": True,
        "palm_mute_prob": 0.0,
        "has_kick": False,
        "has_palm": False,
        "has_bass": False,
        "has_windchime": True,
    },
    "keynote_drive": {
        "label": "发布会大字强拍驱动",
        "desc": "强 kick 4/4 + 2 拍次低频，适合 y8 大字冲击发布会风格",
        "kick_amp": 0.55,
        "pad_amp": 0.20,
        "palm_amp": 0.12,
        "bass_amp": 0.25,
        "pad_cool": False,
        "palm_mute_prob": 0.0,
        "has_kick": True,
        "has_palm": True,
        "has_bass": True,
        "has_windchime": False,
    },
}


def write_wav(path: Path, samples, sr: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if HAS_NUMPY:
        arr = np.asarray(samples, dtype=np.float64)
        n = arr.shape[0]
        pcm = (arr * 32767.0).astype("<i2").tobytes()
    else:
        n = len(samples)
        pcm = b"".join(struct.pack("<h", max(-32768, min(32767, int(s * 32767)))) for s in samples)
    channels = 1
    byte_rate = sr * channels * 2
    block_align = channels * 2
    data_size = len(pcm)
    riff_size = 36 + data_size
    header = b"RIFF"
    header += struct.pack("<I", riff_size)
    header += b"WAVE"
    header += b"fmt "
    header += struct.pack("<I", 16)
    header += struct.pack("<H", 1)
    header += struct.pack("<H", channels)
    header += struct.pack("<I", sr)
    header += struct.pack("<I", byte_rate)
    header += struct.pack("<H", block_align)
    header += struct.pack("<H", 16)
    header += b"data"
    header += struct.pack("<I", data_size)
    with open(path, "wb") as f:
        f.write(header)
        f.write(pcm)


def gen_silence(n: int):
    if HAS_NUMPY:
        return np.zeros(n, dtype=np.float64)
    return [0.0] * n


def synth_kick(sr: int, dur_sec: float = 0.4, amp: float = 0.45):
    n = max(1, int(round(dur_sec * sr)))
    if HAS_NUMPY:
        t = np.arange(n, dtype=np.float64) / sr
        f = 160.0 * np.exp(-t * 4.5) + 60.0 * (1.0 - np.exp(-t * 4.5))
        phase = 2.0 * math.pi * np.cumsum(f) / sr
        env = np.exp(-t * 6.0)
        sig = amp * np.sin(phase) * env
        return sig
    s = [0.0] * n
    f_prev = 160.0
    phase = 0.0
    for i in range(n):
        t = i / sr
        f_cur = 160.0 * math.exp(-t * 4.5) + 60.0 * (1.0 - math.exp(-t * 4.5))
        phase += 2.0 * math.pi * (f_prev + f_cur) * 0.5 / sr
        f_prev = f_cur
        env = math.exp(-t * 6.0)
        s[i] = amp * math.sin(phase) * env
    return s


def synth_fbm_noise(sr: int, dur_sec: float, octaves: int = 5, amp: float = 0.3, cool: bool = False):
    n = max(1, int(round(dur_sec * sr)))
    if HAS_NUMPY:
        rng = np.random.default_rng(42)
        noise = rng.uniform(-1.0, 1.0, n)
        fbm = np.zeros(n, dtype=np.float64)
        weight_sum = 0.0
        for o in range(octaves):
            scale = 2 ** o
            freq_ratio = 1.0 / scale
            pad = int(scale * 2)
            padded = np.pad(noise, (pad, pad), mode="reflect")
            smoothed = np.convolve(padded, np.ones(scale) / scale, mode="same")
            smoothed = smoothed[pad:pad + n]
            w = 1.0 / (2 ** o)
            fbm += w * smoothed
            weight_sum += w
        fbm /= max(1e-6, weight_sum)
        if cool:
            fbm = np.sign(fbm) * (np.abs(fbm) ** 1.3)
        cutoff = 1800.0 if cool else 2200.0
        alpha = 1.0 - math.exp(-2.0 * math.pi * cutoff / sr)
        out = np.zeros(n, dtype=np.float64)
        prev = 0.0
        for i in range(n):
            prev = alpha * fbm[i] + (1.0 - alpha) * prev
            out[i] = prev
        return amp * out
    import random
    rng = random.Random(42)
    noise = [rng.uniform(-1.0, 1.0) for _ in range(n)]
    fbm = [0.0] * n
    weight_sum = 0.0
    for o in range(octaves):
        scale = 2 ** o
        w = 1.0 / (2 ** o)
        weight_sum += w
        smoothed = [0.0] * n
        for i in range(n):
            s = 0.0
            cnt = 0
            for j in range(max(0, i - scale), min(n, i + scale + 1)):
                s += noise[j]
                cnt += 1
            smoothed[i] = s / max(1, cnt)
        for i in range(n):
            fbm[i] += w * smoothed[i]
    ws = max(1e-6, weight_sum)
    for i in range(n):
        fbm[i] /= ws
        if cool:
            fbm[i] = (1 if fbm[i] >= 0 else -1) * (abs(fbm[i]) ** 1.3)
    cutoff = 1800.0 if cool else 2200.0
    alpha = 1.0 - math.exp(-2.0 * math.pi * cutoff / sr)
    out = [0.0] * n
    prev = 0.0
    for i in range(n):
        prev = alpha * fbm[i] + (1.0 - alpha) * prev
        out[i] = amp * prev
    return out


def apply_lfo_breath(sig, sr: int, lfo_period: float = 1.5, min_amp: float = 0.82, max_amp: float = 0.98):
    n = len(sig)
    if HAS_NUMPY:
        t = np.arange(n, dtype=np.float64) / sr
        lfo = 0.5 + 0.5 * np.sin(2.0 * math.pi * t / lfo_period)
        env = min_amp + (max_amp - min_amp) * lfo
        return np.asarray(sig, dtype=np.float64) * env
    out = [0.0] * n
    for i in range(n):
        t = i / sr
        lfo = 0.5 + 0.5 * math.sin(2.0 * math.pi * t / lfo_period)
        env = min_amp + (max_amp - min_amp) * lfo
        out[i] = sig[i] * env
    return out


def synth_palm(sr: int, dur_sec: float = 0.09, amp: float = 0.18, freq: float = 250.0):
    n = max(1, int(round(dur_sec * sr)))
    if HAS_NUMPY:
        t = np.arange(n, dtype=np.float64) / sr
        env = np.exp(-t * 45.0)
        sig = amp * np.cos(2.0 * math.pi * freq * t) * env
        return sig
    s = [0.0] * n
    for i in range(n):
        t = i / sr
        env = math.exp(-t * 45.0)
        s[i] = amp * math.cos(2.0 * math.pi * freq * t) * env
    return s


def synth_bass(sr: int, dur_sec: float, amp: float = 0.3, cool: bool = True):
    n = max(1, int(round(dur_sec * sr)))
    base_f = 55.0 if cool else 65.0
    if HAS_NUMPY:
        t = np.arange(n, dtype=np.float64) / sr
        sig = amp * np.sin(2.0 * math.pi * base_f * t)
        env = np.ones(n, dtype=np.float64)
        atk = int(0.02 * sr)
        rel = int(0.15 * sr)
        if atk > 0 and atk < n:
            env[:atk] = np.linspace(0.0, 1.0, atk)
        if rel > 0 and rel < n:
            env[-rel:] = np.linspace(1.0, 0.0, rel)
        return sig * env
    s = [0.0] * n
    atk = int(0.02 * sr)
    rel = int(0.15 * sr)
    for i in range(n):
        t = i / sr
        env = 1.0
        if i < atk and atk > 0:
            env = i / atk
        elif i > n - rel and rel > 0:
            env = (n - i) / rel
        s[i] = amp * math.sin(2.0 * math.pi * base_f * t) * env
    return s


def synth_windchime(sr: int, amp: float = 0.08):
    freqs = [1320.0, 1760.0, 2110.0, 2640.0]
    dur_sec = 1.2
    n = max(1, int(round(dur_sec * sr)))
    if HAS_NUMPY:
        t = np.arange(n, dtype=np.float64) / sr
        sig = np.zeros(n, dtype=np.float64)
        rng = np.random.default_rng(77)
        for f in freqs:
            delay = rng.uniform(0.0, 0.3)
            d_samples = int(delay * sr)
            env = np.exp(-np.maximum(0.0, t - delay) * 3.5)
            tone = np.sin(2.0 * math.pi * f * np.maximum(0.0, t - delay))
            sig += amp * 0.35 * tone * env
        return sig
    import random
    rng = random.Random(77)
    s = [0.0] * n
    for f in freqs:
        delay = rng.uniform(0.0, 0.3)
        d_samples = int(delay * sr)
        for i in range(n):
            t = i / sr
            if t < delay:
                continue
            env = math.exp(-(t - delay) * 3.5)
            s[i] += amp * 0.35 * math.sin(2.0 * math.pi * f * (t - delay)) * env
    return s


def apply_fade(sig, sr: int, fade_in: float, fade_out: float):
    n = len(sig)
    fi = min(int(fade_in * sr), n // 2)
    fo = min(int(fade_out * sr), n // 2)
    if HAS_NUMPY:
        s = np.array(sig, dtype=np.float64)
        if fi > 0:
            ramp = np.linspace(0.0, 1.0, fi)
            s[:fi] *= ramp
        if fo > 0:
            ramp = np.linspace(1.0, 0.0, fo)
            s[-fo:] *= ramp
        return s
    s = list(sig)
    for i in range(fi):
        s[i] = s[i] * (i / max(1, fi))
    for i in range(fo):
        s[-(i + 1)] = s[-(i + 1)] * (i / max(1, fo))
    return s


def normalize_and_clip(sig, peak_target: float = 0.88):
    if HAS_NUMPY:
        s = np.array(sig, dtype=np.float64)
        if len(s) == 0:
            return s
        mx = float(np.max(np.abs(s)))
        if mx < 1e-6:
            return s
        g = peak_target / mx
        out = s * g
        return np.clip(out, -1.0, 1.0)
    if not sig:
        return []
    mx = max(abs(x) for x in sig)
    if mx < 1e-6:
        return sig
    g = peak_target / mx
    return [max(-1.0, min(1.0, x * g)) for x in sig]


def add_at(sig, offset: int, snippet):
    n = len(sig)
    m = len(snippet)
    end = min(offset + m, n)
    if HAS_NUMPY:
        if offset >= 0 and offset < n:
            take = end - offset
            sig[offset:end] += np.asarray(snippet, dtype=np.float64)[:take]
    else:
        for i in range(max(0, offset), end):
            sig[i] += snippet[i - offset]


def get_beat_times(duration: float, bpm: float):
    beat_dur = 60.0 / bpm
    beats = []
    t = 0.0
    while t < duration + 1e-6:
        beats.append(round(t, 6))
        t += beat_dur
    return beats


def cmd_generate(args) -> None:
    if not HAS_NUMPY:
        print("[bgm] WARNING: numpy 未安装，纯 Python 合成会较慢。推荐: pip install numpy", file=sys.stderr)

    sr = DEFAULT_SAMPLE_RATE
    duration = float(args.duration)
    bpm = float(args.bpm)
    style_name = args.style
    out_path = Path(args.out).expanduser()

    if style_name not in STYLES:
        print(f"[bgm] ERROR: 未知 style: {style_name}", file=sys.stderr)
        sys.exit(2)

    cfg = STYLES[style_name]
    n = max(1, int(round(duration * sr)))
    mix = gen_silence(n)

    pad = synth_fbm_noise(sr, duration, octaves=5, amp=cfg["pad_amp"], cool=cfg["pad_cool"])
    pad = apply_lfo_breath(pad, sr)
    if HAS_NUMPY:
        mix = mix + np.asarray(pad, dtype=np.float64)
    else:
        for i in range(n):
            mix[i] += pad[i]

    beat_dur = 60.0 / bpm
    beats = get_beat_times(duration, bpm)

    if cfg["has_kick"]:
        kick_sig = synth_kick(sr, dur_sec=0.4, amp=cfg["kick_amp"])
        for bt in beats:
            off = int(round(bt * sr))
            add_at(mix, off, kick_sig)

    if cfg["has_palm"]:
        palm_sig = synth_palm(sr, amp=cfg["palm_amp"])
        palm_mute_rng = np.random.default_rng(1234) if HAS_NUMPY else __import__("random").Random(1234)
        for bt in beats:
            for eighth in [0.0, 0.5]:
                t = bt + eighth * beat_dur
                if t >= duration:
                    continue
                mute = False
                if cfg["palm_mute_prob"] > 0:
                    if HAS_NUMPY:
                        mute = palm_mute_rng.uniform(0.0, 1.0) < cfg["palm_mute_prob"]
                    else:
                        mute = palm_mute_rng.uniform(0.0, 1.0) < cfg["palm_mute_prob"]
                if not mute:
                    off = int(round(t * sr))
                    add_at(mix, off, palm_sig)

    if cfg["has_bass"]:
        bass_beat = beat_dur * 2.0
        t = 0.0
        while t < duration:
            bass_sig = synth_bass(sr, dur_sec=min(bass_beat * 0.95, duration - t), amp=cfg["bass_amp"], cool=cfg["pad_cool"])
            off = int(round(t * sr))
            add_at(mix, off, bass_sig)
            t += bass_beat

    if cfg["has_windchime"]:
        wc_sig = synth_windchime(sr)
        wc_period = 9.0
        t = 3.0
        while t < duration:
            off = int(round(t * sr))
            add_at(mix, off, wc_sig)
            t += wc_period

    mix = apply_fade(mix, sr, FADE_IN_SEC, FADE_OUT_SEC)
    mix = normalize_and_clip(mix, 0.88)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    write_wav(out_path, mix, sr)

    sidecar = out_path.parent / f"{out_path.stem}.bgm.json"
    sidecar_data = {
        "bpm": bpm,
        "duration": duration,
        "style": style_name,
        "beats": beats,
        "sample_rate": sr,
    }
    with open(sidecar, "w", encoding="utf-8") as f:
        json.dump(sidecar_data, f, ensure_ascii=False, indent=2)

    print(f"[bgm] generate 模式 (style={style_name}, bpm={bpm}, sr={sr}Hz)")
    print(f"[bgm] 输出时长: {duration:.2f}s, 拍数: {len(beats)}")
    print(f"[bgm] 写入 WAV: {out_path}")
    print(f"[bgm] 写入 sidecar: {sidecar}")


def cmd_mix(args) -> None:
    video_in = Path(args.video).expanduser()
    bgm_in = Path(args.bgm).expanduser()
    sfx_list = [Path(p).expanduser() for p in (args.sfx or [])]
    out_path = Path(args.out).expanduser()

    if not video_in.exists():
        print(f"[bgm] ERROR: 视频不存在: {video_in}", file=sys.stderr)
        sys.exit(2)
    if not bgm_in.exists():
        print(f"[bgm] ERROR: BGM 不存在: {bgm_in}", file=sys.stderr)
        sys.exit(2)
    for s in sfx_list:
        if not s.exists():
            print(f"[bgm] ERROR: SFX 不存在: {s}", file=sys.stderr)
            sys.exit(2)

    out_path.parent.mkdir(parents=True, exist_ok=True)

    inputs = []
    filter_parts = []

    inputs += ["-i", str(video_in)]
    inputs += ["-i", str(bgm_in)]
    for s in sfx_list:
        inputs += ["-i", str(s)]

    video_vol = 0.0
    bgm_vol = 0.7
    sfx_vol = 0.3

    check_has_audio_cmd = [
        "ffprobe", "-v", "error", "-select_streams", "a:0",
        "-show_entries", "stream=codec_type", "-of", "default=noprint_wrappers=1:nokey=1",
        str(video_in),
    ]
    try:
        probe = subprocess.run(check_has_audio_cmd, capture_output=True, text=True, timeout=15)
        has_video_audio = (probe.stdout or "").strip() == "audio"
    except Exception:
        has_video_audio = False

    total_inputs = 1 + 1 + len(sfx_list)
    anull_added = False
    if not has_video_audio:
        inputs = ["-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono"] + inputs
        total_inputs += 1
        anull_added = True

    vid_idx = 1 if anull_added else 0
    aud_idx = 0 if anull_added else vid_idx
    bgm_idx = vid_idx + 1
    sfx_start_idx = bgm_idx + 1

    labels = []
    vol_v = video_vol
    filter_parts.append(f"[{aud_idx}:a]volume={vol_v:.3f}[in_v]")
    labels.append("in_v")
    filter_parts.append(f"[{bgm_idx}:a]volume={bgm_vol:.3f}[in_bgm]")
    labels.append("in_bgm")
    for i, _ in enumerate(sfx_list):
        idx = sfx_start_idx + i
        lb = f"in_sfx{i}"
        filter_parts.append(f"[{idx}:a]volume={sfx_vol:.3f}[{lb}]")
        labels.append(lb)

    n_inputs_amix = len(labels)
    inputs_str = "".join(f"[{l}]" for l in labels)
    filter_parts.append(f"{inputs_str}amix=inputs={n_inputs_amix}:duration=first:normalize=0[aout]")

    cmd = ["ffmpeg", "-y"] + inputs + [
        "-filter_complex", ";".join(filter_parts),
        "-map", f"{vid_idx}:v:0",
        "-map", "[aout]",
        "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k",
        "-shortest",
        "-movflags", "+faststart",
        str(out_path),
    ]

    print(f"[bgm] mix 模式：视频 {video_in.name} + BGM {bgm_in.name}" + (f" + {len(sfx_list)} SFX" if sfx_list else ""))
    print(f"[bgm]   音量比 视频原音:{video_vol}  BGM:{bgm_vol}  SFX单轨:{sfx_vol}")
    print(f"[bgm]   输出: {out_path}")

    try:
        result = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, timeout=3600)
        if result.returncode != 0:
            err = result.stderr.decode("utf-8", errors="replace")[-3000:]
            print(f"[bgm] ERROR: ffmpeg 失败 (code {result.returncode}):\n{err}", file=sys.stderr)
            sys.exit(1)
    except FileNotFoundError:
        print("[bgm] ERROR: 未找到 ffmpeg 命令，请先安装 ffmpeg 并加入 PATH。", file=sys.stderr)
        sys.exit(3)

    print(f"[bgm] 混音完成: {out_path}")


def cmd_list(args) -> None:
    print(f"{'STYLE':<20} {'LABEL':<28} 说明")
    print("-" * 78)
    for name, cfg in STYLES.items():
        print(f"{name:<20} {cfg['label']:<28} {cfg['desc']}")
    print(f"\n共 {len(STYLES)} 种风格。generate 默认 --style warm_stage。")


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="bgm.py",
        description="沙画动画 skill · 背景音乐 CLI（numpy 离线合成 44.1kHz WAV + ffmpeg 混音）",
    )
    sub = p.add_subparsers(dest="cmd", required=True)

    p_gen = sub.add_parser("generate", help="按 style/BPM/时长 离线合成沙画专用 BGM（WAV + .bgm.json sidecar）")
    p_gen.add_argument("--duration", type=float, required=True, help="总时长（秒）")
    p_gen.add_argument("--bpm", type=float, default=90.0, help="BPM（默认 90）")
    p_gen.add_argument("--style", choices=list(STYLES.keys()), default="warm_stage",
                       help=f"风格（默认 warm_stage）：{' / '.join(STYLES.keys())}")
    p_gen.add_argument("--out", required=True, help="输出 WAV 路径（同路径同名 .bgm.json sidecar 自动生成）")
    p_gen.set_defaults(func=cmd_generate)

    p_mix = sub.add_parser("mix", help="用 ffmpeg amix 把视频原音 + BGM + SFX 按比例混进输出 mp4")
    p_mix.add_argument("video", help="主视频 mp4 路径")
    p_mix.add_argument("bgm", help="BGM wav 路径")
    p_mix.add_argument("--sfx", nargs="*", default=[], help="0 或多个 SFX wav 路径，按音量 0.3 单轨叠加")
    p_mix.add_argument("--out", required=True, help="输出 mp4 路径（H.264 + AAC faststart）")
    p_mix.set_defaults(func=cmd_mix)

    p_list = sub.add_parser("list", help="列出所有可用 style 名 + 简要说明")
    p_list.set_defaults(func=cmd_list)

    return p


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
