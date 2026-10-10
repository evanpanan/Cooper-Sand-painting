#!/usr/bin/env python3
import argparse
import json
import math
import os
import shutil
import struct
import sys
from pathlib import Path

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False

CAPS_DIR_NAME = ".sand-painting-caps"
VOICE_CONFIG_FILE = "voice.json"

DEFAULT_SAMPLE_RATE = 22050

BUILTIN_VOICES = [
    {
        "name": "default_narrator",
        "label": "\u5185\u7f6e\u5408\u6210\uff08\u4e2d\u6587\u5360\u4f4d\u5171\u632f\u5cf0\u97f3\uff09",
        "base_f0": 130.0,
        "formants": {
            "a": (800, 1200, 2400),
            "e": (500, 1800, 2500),
            "i": (300, 2300, 3000),
            "o": (450, 800, 2400),
            "u": (350, 650, 2200),
        },
    },
    {
        "name": "deep_narrator",
        "label": "\u5185\u7f6e\u5408\u6210\uff08\u4f4e\u9891\uff0c\u7537\u58f0\u98ce\u683c\uff09",
        "base_f0": 95.0,
        "formants": {
            "a": (650, 1050, 2250),
            "e": (420, 1650, 2350),
            "i": (250, 2100, 2800),
            "o": (370, 720, 2250),
            "u": (290, 580, 2050),
        },
    },
    {
        "name": "light_narrator",
        "label": "\u5185\u7f6e\u5408\u6210\uff08\u9ad8\u9891\uff0c\u5973\u58f0\u98ce\u683c\uff09",
        "base_f0": 190.0,
        "formants": {
            "a": (900, 1350, 2600),
            "e": (580, 2000, 2700),
            "i": (380, 2550, 3200),
            "o": (520, 900, 2600),
            "u": (400, 750, 2400),
        },
    },
]

VOWEL_SET = set("aeiou\u0101\u00e1\u01ce\u00e0\u0113\u00e9\u011b\u00e8\u012b\u00ed\u01d0\u00ec\u014d\u00f3\u01d2\u00f2\u016b\u00fa\u01d4\u00f9")


def get_caps_dir() -> Path:
    return Path.home() / CAPS_DIR_NAME


def load_voice_config():
    p = get_caps_dir() / VOICE_CONFIG_FILE
    if not p.exists():
        return None
    try:
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return None


def find_builtin_voice(name: str):
    for v in BUILTIN_VOICES:
        if v["name"] == name:
            return v
    return None


def get_voice_by_name(name: str, cfg):
    if name:
        v = find_builtin_voice(name)
        if v is not None:
            return v, "builtin"
    if cfg:
        opts = cfg.get("options") or {}
        default = opts.get("default_voice", "default_narrator")
        v = find_builtin_voice(default)
        if v is not None:
            return v, "builtin"
    return BUILTIN_VOICES[0], "builtin"


def classify_char(ch: str):
    cl = ch.lower()
    if cl in VOWEL_SET:
        return ("vowel", cl)
    if ch.isspace():
        return ("space", ch)
    if cl in "bcdfghjklmnpqrstvwxyz":
        return ("consonant", cl)
    if ch in ".,;:!?":
        return ("punct", ch)
    if ord(ch) < 128 and ch.isdigit():
        return ("digit", ch)
    return ("hanzi", ch)


def gen_silence(seconds: float, sr: int):
    n = max(1, int(round(seconds * sr)))
    if HAS_NUMPY:
        return np.zeros(n, dtype=np.float64)
    return [0.0] * n


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


def synth_vowel(vowel_key: str, dur_sec: float, sr: int, voice_spec, f0_jitter: float = 3.0):
    formants = voice_spec["formants"].get(vowel_key, voice_spec["formants"]["a"])
    f1, f2, f3 = formants
    f0 = voice_spec["base_f0"]
    n = max(1, int(round(dur_sec * sr)))
    if HAS_NUMPY:
        t = np.arange(n, dtype=np.float64) / sr
        f0_arr = f0 + np.cumsum(np.random.uniform(-f0_jitter / sr, f0_jitter / sr, n))
        phase = 2.0 * math.pi * np.cumsum(f0_arr) / sr
        src = 0.6 * np.sin(phase) + 0.2 * np.sin(phase * 2) + 0.1 * np.sin(phase * 3)
        env = np.ones(n, dtype=np.float64)
        att = int(0.015 * sr)
        rel = int(0.03 * sr)
        if att > 0 and att < n:
            env[:att] = np.linspace(0.0, 1.0, att)
        if rel > 0 and rel < n:
            env[-rel:] = np.linspace(1.0, 0.0, rel)
        sig = np.zeros(n, dtype=np.float64)
        gains = [0.55, 0.25, 0.12, 0.08]
        center_freqs = [f0, f1, f2, f3]
        for g, cf in zip(gains, center_freqs):
            bw = max(50.0, cf * 0.04)
            band = np.sin(2.0 * math.pi * cf * t) * (1.0 / (1.0 + ((t - dur_sec * 0.5) / (dur_sec * 0.8)) ** 4))
            sig += g * band
        sig = sig * 0.7 * env
        return sig
    s = [0.0] * n
    for i in range(n):
        t = i / sr
        phase = 2.0 * math.pi * f0 * t
        samp = 0.55 * math.sin(phase)
        samp += 0.25 * math.sin(2.0 * math.pi * f1 * t)
        samp += 0.12 * math.sin(2.0 * math.pi * f2 * t)
        samp += 0.08 * math.sin(2.0 * math.pi * f3 * t)
        att_n = int(0.015 * sr)
        rel_n = int(0.03 * sr)
        env = 1.0
        if i < att_n and att_n > 0:
            env = i / att_n
        elif i > n - rel_n and rel_n > 0:
            env = (n - i) / rel_n
        s[i] = 0.6 * samp * env
    return s


def synth_noise(dur_sec: float, sr: int, amp: float = 0.08):
    n = max(1, int(round(dur_sec * sr)))
    if HAS_NUMPY:
        return np.random.uniform(-amp, amp, n)
    import random
    return [random.uniform(-amp, amp) for _ in range(n)]


def normalize_and_clip(sig, peak_target: float = 0.85):
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


def text_to_speech_segments(text: str, voice_spec, sr: int):
    if not text:
        return [gen_silence(0.2, sr)]
    parts = []
    for ch in text:
        kind, val = classify_char(ch)
        if kind == "vowel":
            base = val.lower()
            map_ = {
                "a": "a", "\u0101": "a", "\u00e1": "a", "\u01ce": "a", "\u00e0": "a",
                "e": "e", "\u0113": "e", "\u00e9": "e", "\u011b": "e", "\u00e8": "e",
                "i": "i", "\u012b": "i", "\u00ed": "i", "\u01d0": "i", "\u00ec": "i",
                "o": "o", "\u014d": "o", "\u00f3": "o", "\u01d2": "o", "\u00f2": "o",
                "u": "u", "\u016b": "u", "\u00fa": "u", "\u01d4": "u", "\u00f9": "u",
            }
            key = map_.get(base, "a")
            parts.append(synth_vowel(key, 0.12, sr, voice_spec))
        elif kind == "consonant":
            parts.append(synth_noise(0.06, sr, 0.06))
            parts.append(gen_silence(0.02, sr))
        elif kind == "punct":
            if val in "!?":
                parts.append(gen_silence(0.45, sr))
            elif val in ".,;":
                parts.append(gen_silence(0.28, sr))
            else:
                parts.append(gen_silence(0.15, sr))
        elif kind == "space":
            parts.append(gen_silence(0.08, sr))
        elif kind == "digit":
            parts.append(synth_vowel("a", 0.10, sr, voice_spec))
            parts.append(gen_silence(0.04, sr))
        elif kind == "hanzi":
            parts.append(synth_vowel("a", 0.12, sr, voice_spec))
            parts.append(gen_silence(0.06, sr))
        else:
            parts.append(gen_silence(0.06, sr))
    return parts


def concat_segments(segments):
    if not segments:
        return []
    if HAS_NUMPY:
        arrs = [np.array(s, dtype=np.float64) for s in segments if len(s) > 0]
        if not arrs:
            return np.zeros(1, dtype=np.float64)
        return np.concatenate(arrs)
    out = []
    for s in segments:
        out.extend(s)
    return out


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


def print_voice_config_required_and_exit():
    print("[koubo] ERROR: \u8bed\u97f3\u80fd\u529b\u672a\u914d\u7f6e\u3002", file=sys.stderr)
    print("[koubo] \u8bf7\u5148\u8fd0\u884c\u4e4b\u4e00\u542f\u7528:", file=sys.stderr)
    print("  python3 scripts/capabilities.py voice enable --mode synth", file=sys.stderr)
    print("  python3 scripts/capabilities.py voice enable --mode existing --recording-dir <DIR>", file=sys.stderr)
    print("  python3 scripts/capabilities.py voice enable --mode trained --voice-model-dir <DIR> --voice-name <NAME>", file=sys.stderr)
    print("[koubo] \u8be6\u89c1: references/capabilities.md", file=sys.stderr)
    sys.exit(1)


def list_recordings(cfg):
    opts = cfg.get("options") or {}
    rd = opts.get("recording_dir")
    rows = []
    if rd and Path(rd).is_dir():
        for p in sorted(Path(rd).iterdir()):
            if p.is_file() and p.suffix.lower() in (".wav", ".mp3", ".aac", ".flac", ".m4a"):
                rows.append((p.name, str(p)))
    return rows


def cmd_say(args) -> None:
    cfg = load_voice_config()
    if cfg is None:
        print_voice_config_required_and_exit()
        return

    if args.file:
        src = Path(args.file).expanduser()
        if not src.exists():
            print(f"[koubo] ERROR: --file \u4e0d\u5b58\u5728: {src}", file=sys.stderr)
            sys.exit(2)
        out = Path(args.out).expanduser()
        out.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, out)
        print(f"[koubo] existing 模式: 复制 {src} -> {out}")
        return

    mode = cfg.get("mode")
    opts = cfg.get("options") or {}
    sr = int(opts.get("sample_rate", DEFAULT_SAMPLE_RATE))

    text = args.text or ""

    if mode == "existing":
        rows = list_recordings(cfg)
        matched = None
        for name, full in rows:
            stem = Path(name).stem
            if stem and stem in text:
                matched = Path(full)
                break
        if matched is None and rows:
            print(f"[koubo] WARNING: \u672a\u627e\u5230\u4e0e\u6587\u672c\u5339\u914d\u7684\u5f55\u97f3\u6587\u4ef6\uff0c\u964d\u7ea7\u4f7f\u7528 synth \u5360\u4f4d\u97f3\uff0c\u6216\u8005\u7528 --file \u663e\u5f0f\u6307\u5b9a", file=sys.stderr)
            mode = "synth"
        else:
            out = Path(args.out).expanduser()
            out.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(matched, out)
            print(f"[koubo] existing 模式: 匹配录音 {matched} -> {out}")
            return

    if mode == "trained":
        model_dir = opts.get("voice_model_dir")
        ext_script = None
        if model_dir and Path(model_dir).is_dir():
            for cand in ["synthesize.py", "run_synth.sh", "infer.sh"]:
                if (Path(model_dir) / cand).is_file():
                    ext_script = str(Path(model_dir) / cand)
                    break
        if ext_script is None:
            print(
                f"[koubo] WARNING: trained 模式配置了但未找到外部合成脚本，降级使用 synth 占位音。",
                file=sys.stderr,
            )
            mode = "synth"
        else:
            print(f"[koubo] trained 模式: 检测到合成脚本 {ext_script}")
            print(f"[koubo] 请手动调用该脚本以实际训练音色合成（尊重用户隐私 & 计算资源）。本次降级 synth 出占位音。", file=sys.stderr)
            mode = "synth"

    voice_spec, src_kind = get_voice_by_name(args.voice, cfg)
    if mode == "synth" or True:
        if not HAS_NUMPY:
            print(
                "[koubo] WARNING: numpy 未安装，将使用纯 Python 数学合成（速度较慢但可用）。推荐: pip install numpy",
                file=sys.stderr,
            )
        segs = text_to_speech_segments(text, voice_spec, sr)
        if not text.strip():
            segs = [gen_silence(0.5, sr)]
        lead = gen_silence(0.05, sr)
        tail = gen_silence(0.1, sr)
        combined = concat_segments([lead] + segs + [tail])
        combined = apply_fade(combined, sr, 0.02, 0.05)
        final = normalize_and_clip(combined, 0.85)
        out = Path(args.out).expanduser()
        write_wav(out, final, sr)
        n = len(final) if not HAS_NUMPY else int(final.shape[0])
        dur = n / sr
        print(f"[koubo] synth 模式 (voice={voice_spec['name']}, sr={sr}Hz)")
        print(f"[koubo] 文本长度: {len(text)} 字符")
        print(f"[koubo] 输出时长: {dur:.2f}s")
        print(f"[koubo] 写入文件: {out}")


def cmd_voices(args) -> None:
    cfg = load_voice_config()
    if cfg is None:
        mode = "(未配置)"
    else:
        mode = cfg.get("mode", "?")
    print(f"[koubo] \u5f53\u524d\u6a21\u5f0f: {mode}")

    view_mode = args.mode or (cfg.get("mode") if cfg else None)
    if view_mode in (None, "synth", "trained"):
        print(f"\n  {'NAME':<22} LABEL")
        for v in BUILTIN_VOICES:
            print(f"  {v['name']:<22} {v['label']}")
        total = len(BUILTIN_VOICES)
        print(f"\n共 {total} 个内置音色 (synth 模式可用)")

    if view_mode == "existing" or (cfg and cfg.get("mode") == "existing"):
        if cfg:
            opts = cfg.get("options") or {}
            rd = opts.get("recording_dir")
            if rd:
                print(f"\n  录音目录 = {rd}")
        rows = list_recordings(cfg) if cfg else []
        print(f"\n  {'NAME (文件名)':<40} 路径")
        for name, full in rows:
            print(f"  {name:<40} {full}")
        if not rows:
            print("  (暂无录音文件)")
        print(f"\n共 {len(rows)} 个录音")


def cmd_list(args) -> None:
    for v in BUILTIN_VOICES:
        print(f"{v['name']}\t{v['label']}")


def cmd_train(args) -> None:
    out_dir = Path(args.out).expanduser().resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest = out_dir / "素材清单.md"
    content = f"""# 音色复刻训练素材清单（沙画动画 skill）

生成时间: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
目标输出目录: {out_dir}

> 合规提醒: 仅允许对 **用户本人的声音** 且获得用户明确同意后进行素材收集和训练。
> 严禁用于未经授权的第三人声音克隆。请遵守所在地区关于声音权、肖像权、数据保护的法律法规。

## 目录结构

```
{out_dir}/
├── 素材清单.md              ← 本文件
├── recordings/              ← 用户自行放入录音 wav（以下命名仅为建议）
│   ├── clean_read_01.wav
│   ├── clean_read_02.wav
│   └── ...
├── transcript.csv           ← 逐句稿（CSV，UTF-8 无 BOM）
│   # 每行格式：文件名,逐字稿（逗号是英文逗号；文字稿里若有逗号请转义或改用 TSV 自行处理）
│   clean_read_01.wav,第一句原文内容……
│   clean_read_02.wav,第二句原文内容……
└── consent.txt              ← 用户同意声明（必须存在；koubo.py 不对内容做验真，仅做存在性提示）
    建议内容如下（由用户手写/打字并签名或填写日期）：
    "我确认 recordings/ 目录下的所有音频都出自我本人，
     同意将上述音频及其衍生的音色模型用于沙画动画的个人解说配音，
     不用于除本人沙画动画项目之外的其他用途。
     签名 / 昵称: _______________
     日期: _______________"
```

## 素材最低要求

### 数量
- 勉强可用: **10 分钟** 干净朗读（环境噪声 < -45dB，无混响，无背景音乐）
- 建议起步: **30 分钟**（覆盖 0-9 数字、常见词汇、3 种以上语速：正常 / 稍慢 / 稍快）
- 高质量: **2 小时 +**，包括平静、兴奋、严肃、温柔等情绪段落

### 录音技术规格
- 采样率: 48000 Hz (44.1 kHz 可接受，48k 优先)
- 声道: 1 (mono，单声道)
- 编码: PCM 16-bit little-endian (.wav)
- 响度: -24 LUFS (句子峰值不超过 -1 dBTP，无削波)
- 环境: 安静室内，距离麦克风 10-20 cm，嘴巴不喷麦，不踩房间驻波点
- 开头/结尾静音: 每句 0.3s 左右

### 文本内容建议
- 覆盖所有声韵组合：数字、日期、专有名词、英文缩略词（如项目中要念 "API" 就要在素材里有）
- 尽量匹配目标应用：如果目标是财经解说，素材就念财经稿；童话解说就念童话稿
- 语速贴近目标成片语速：不要训练时慢吞吞，成片要快嘴

## 训练执行

koubo.py 不负责训练。素材收集完毕后，用户需在 **自己的机器 / 云账号** 上运行训练流程（以保障隐私和算力归属）。可选训练方案（不构成技术推荐，仅为常见方向列举）：
- 开源语音克隆框架（用户自行选型、安装、合规自查）
- 商用语音合成平台提供的"自定义音色上传"服务（由用户管理密钥与账单）

## 训练完成后

将训练导出的模型目录填入沙画能力配置：

```bash
python3 scripts/capabilities.py voice enable \\
  --mode trained \\
  --voice-model-dir "<你的模型导出目录>" \\
  --voice-name "my_voice"
```

然后用 `koubo.py voices` 和 `koubo.py say "测试句子" --voice my_voice --out test.wav` 验证。
"""
    manifest.write_text(content, encoding="utf-8")

    print("[koubo] train 模式：已写出素材收集指引（不执行训练、不上传任何数据、不读取任何音频）")
    print(f"[koubo]   清单文件: {manifest}")
    print(f"[koubo]   步骤概览:")
    print(f"         1. 在 {out_dir}/recordings/ 放入 10+ 分钟干净朗读 wav（48kHz 单声道）")
    print(f"         2. 写 {out_dir}/transcript.csv 逐句对齐稿")
    print(f"         3. 在 {out_dir}/consent.txt 里放用户同意声明")
    print(f"         4. 用户在自己的机器/云上执行训练（koubo.py 不替你跑）")
    print(f"         5. 训练完成后 capabilities.py voice enable --mode trained 注册模型")


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="koubo.py",
        description="沙画动画 skill · 口播语音 CLI（synth 占位合成 / 录音引用 / 训练指引）",
    )
    sub = p.add_subparsers(dest="cmd", required=True)

    p_say = sub.add_parser("say", help="生成/引用一句话的 WAV 音频")
    p_say.add_argument("text", nargs="?", default="", help="口播文字（若使用 --file 可传空串）")
    p_say.add_argument("--voice", default=None, help="音色名（对应 koubo.py voices）；synth 模式默认 default_narrator")
    p_say.add_argument("--out", required=True, help="输出 WAV 路径")
    p_say.add_argument("--file", default=None, help="直接用该已有音频文件，跳过合成；优先级最高")
    p_say.set_defaults(func=cmd_say)

    p_voices = sub.add_parser("voices", help="列出当前模式下可用音色/录音")
    p_voices.add_argument("--mode", choices=["synth", "existing", "trained"], default=None,
                          help="临时切换视角查看（不会改变实际配置）")
    p_voices.set_defaults(func=cmd_voices)

    p_list = sub.add_parser("list", help="voices 的纯文本别名（适合脚本 grep/cut）；不打印前缀")
    p_list.set_defaults(func=cmd_list)

    p_train = sub.add_parser("train", help="仅输出用户音色训练的素材收集清单，不执行训练（尊重隐私 & 算力）")
    p_train.add_argument("--out", required=True, help="素材清单/录音目录的输出目录（会自动创建）")
    p_train.set_defaults(func=cmd_train)

    return p


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
