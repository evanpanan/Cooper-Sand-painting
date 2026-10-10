#!/usr/bin/env python3
import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

CAPS_DIR_NAME = ".sand-painting-caps"
VOICE_CONFIG_FILE = "voice.json"
IMAGE_CONFIG_FILE = "image.json"
README_FILE = "README.txt"

VOICE_MODES = ["existing", "synth", "trained"]
IMAGE_MODES = ["existing", "generate", "none"]
CONFIG_VERSION = 1


def get_caps_dir() -> Path:
    home = Path.home()
    caps_dir = home / CAPS_DIR_NAME
    caps_dir.mkdir(parents=True, exist_ok=True)
    readme = caps_dir / README_FILE
    if not readme.exists():
        readme.write_text(
            "沙画动画 skill 能力配置目录\n"
            "==============================\n"
            "此目录存放按用户级别的语音 / 图像能力配置。\n"
            "配置文件中不应包含明文 API Key；需要密钥时请使用 shell 环境变量。\n"
            "不要把本目录提交到项目仓库的 git。\n",
            encoding="utf-8",
        )
    return caps_dir


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def load_json_or_none(path: Path):
    if not path.exists():
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return None


def validate_config(cfg, kind: str) -> list[str]:
    errors = []
    if not isinstance(cfg, dict):
        errors.append("顶层必须是 object")
        return errors
    if "version" not in cfg or not isinstance(cfg["version"], int):
        errors.append("缺少 version (int) 字段")
    if "mode" not in cfg or not isinstance(cfg["mode"], str):
        errors.append("缺少 mode (str) 字段")
    else:
        modes = VOICE_MODES if kind == "voice" else IMAGE_MODES
        if cfg["mode"] not in modes:
            errors.append(f"mode 必须是 {modes} 之一，当前是 {cfg['mode']!r}")
    if "options" in cfg and not isinstance(cfg["options"], dict):
        errors.append("options 必须是 object")
    if "updated_at" in cfg and not isinstance(cfg["updated_at"], str):
        errors.append("updated_at 必须是 ISO 字符串")
    return errors


def write_config(path: Path, cfg, kind: str) -> None:
    errors = validate_config(cfg, kind)
    if errors:
        print(f"[capabilities] 配置校验失败 ({path.name}):", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        sys.exit(2)
    tmp = path.with_suffix(path.suffix + ".tmp")
    try:
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(cfg, f, ensure_ascii=False, indent=2)
            f.write("\n")
        os.replace(tmp, path)
    finally:
        if tmp.exists():
            try:
                tmp.unlink()
            except OSError:
                pass


def load_voice_config(caps_dir: Path):
    return load_json_or_none(caps_dir / VOICE_CONFIG_FILE)


def load_image_config(caps_dir: Path):
    return load_json_or_none(caps_dir / IMAGE_CONFIG_FILE)


def describe_config(cfg, kind: str) -> str:
    if cfg is None:
        modes = VOICE_MODES if kind == "voice" else IMAGE_MODES
        return f"\u274c \u672a\u914d\u7f6e\uff08\u53ef\u7528\u6a21\u5f0f: {' / '.join(modes)}\uff09"
    lines = [f"\u2705 \u5df2\u914d\u7f6e"]
    lines.append(f"              mode   = {cfg.get('mode', '?')}")
    opts = cfg.get("options") or {}
    if kind == "voice":
        if opts.get("default_voice"):
            lines.append(f"              voice  = {opts['default_voice']}")
        if opts.get("recording_dir"):
            lines.append(f"              dir    = {opts['recording_dir']}")
        if opts.get("voice_model_dir"):
            lines.append(f"              model  = {opts['voice_model_dir']}")
    else:
        if opts.get("library_dir"):
            lines.append(f"              lib    = {opts['library_dir']}")
        if opts.get("default_size"):
            lines.append(f"              size   = {opts['default_size']}")
    caps_dir = get_caps_dir()
    file_name = VOICE_CONFIG_FILE if kind == "voice" else IMAGE_CONFIG_FILE
    lines.append(f"              path   = {(caps_dir / file_name)}")
    return "\n".join(lines)


def explain_mode(kind: str, mode: str) -> str:
    if kind == "voice":
        tbl = {
            "existing": "A) existing_recording: 仅引用用户已有录音，不做合成。--recording-dir 下的 wav 作为音色列表。",
            "synth": "B) system_synth: 内置 numpy 共振峰合成，离线生成可听占位音 (22050Hz mono WAV)。无需任何外部依赖或联网。",
            "trained": "C) trained_voice_replica: 用户自行训练好的音色模型。koubo.py train 仅输出素材收集指引，不在本机执行训练。",
        }
        return tbl.get(mode, "(未定义说明)")
    else:
        tbl = {
            "existing": "A) import_existing: 引用用户已有图片库（照片、手绘稿、已生成素材），images.py import / validate。",
            "generate": "B) generation_by_tool: images.py gen 输出结构化生成作业单 JSON，由上层 agent 调用环境中可用的生图工具执行。脚本本身不直接调用任何模型。",
            "none": "C) none: 显式禁用图像能力，避免误用。遇到需要 F3/F4 角色的镜头会报错提示。",
        }
        return tbl.get(mode, "(未定义说明)")


def cmd_status(args) -> None:
    caps_dir = get_caps_dir()
    v = load_voice_config(caps_dir)
    i = load_image_config(caps_dir)
    print(f"[capabilities] \u8bed\u97f3\u80fd\u529b: {describe_config(v, 'voice')}")
    print(f"[capabilities] \u56fe\u50cf\u80fd\u529b: {describe_config(i, 'image')}")
    if v is None and i is None:
        print("[capabilities] \u63d0\u793a: \u8fd0\u884c capabilities.py --help \u67e5\u770b\u542f\u7528\u65b9\u5f0f")
    if args.explain:
        print()
        print("[capabilities] === 模式说明 ===")
        if v is not None:
            print(f"  语音 mode={v['mode']}: {explain_mode('voice', v['mode'])}")
        else:
            print("  语音: 未配置，可任选一种模式启用")
        if i is not None:
            print(f"  图像 mode={i['mode']}: {explain_mode('image', i['mode'])}")
        else:
            print("  图像: 未配置，可任选一种模式启用")


def cmd_voice_enable(args) -> None:
    caps_dir = get_caps_dir()
    mode = args.mode
    options = {}
    if mode == "existing":
        if not args.recording_dir:
            print("[capabilities] ERROR: existing 模式必须传 --recording-dir", file=sys.stderr)
            sys.exit(2)
        rd = Path(args.recording_dir).expanduser().resolve()
        if not rd.is_dir():
            print(f"[capabilities] WARNING: recording dir {rd} 不存在或不是目录（继续写入配置，后续使用时会再检查）", file=sys.stderr)
        options["recording_dir"] = str(rd)
        options["default_voice"] = "user_recording"
    elif mode == "synth":
        options["sample_rate"] = 22050
        options["default_voice"] = "default_narrator"
    elif mode == "trained":
        if args.voice_model_dir:
            md = Path(args.voice_model_dir).expanduser().resolve()
            if not md.is_dir():
                print(f"[capabilities] WARNING: model dir {md} 不存在或不是目录（继续写入配置）", file=sys.stderr)
            options["voice_model_dir"] = str(md)
        if args.voice_name:
            options["default_voice"] = args.voice_name
        else:
            options["default_voice"] = "trained_voice"
    cfg = {
        "version": CONFIG_VERSION,
        "mode": mode,
        "updated_at": utc_now_iso(),
        "options": options,
    }
    out_path = caps_dir / VOICE_CONFIG_FILE
    write_config(out_path, cfg, "voice")
    print(f"[capabilities] \u8bed\u97f3\u80fd\u529b\u5df2\u5199\u5165 mode={mode}")
    print(f"[capabilities]   文件: {out_path}")
    print(f"[capabilities]   说明: {explain_mode('voice', mode)}")


def cmd_image_enable(args) -> None:
    caps_dir = get_caps_dir()
    mode = args.mode
    options = {}
    if mode == "existing":
        if not args.library_dir:
            print("[capabilities] ERROR: existing 模式必须传 --library-dir", file=sys.stderr)
            sys.exit(2)
        ld = Path(args.library_dir).expanduser().resolve()
        if not ld.is_dir():
            print(f"[capabilities] WARNING: library dir {ld} 不存在或不是目录（继续写入配置）", file=sys.stderr)
        options["library_dir"] = str(ld)
        options["default_size"] = "1024x1024"
    elif mode == "generate":
        options["default_size"] = args.size or "1024x1024"
        options["tool_hint"] = "text_to_image"
    elif mode == "none":
        options["reason"] = args.reason or "explicit_disabled"
    cfg = {
        "version": CONFIG_VERSION,
        "mode": mode,
        "updated_at": utc_now_iso(),
        "options": options,
    }
    out_path = caps_dir / IMAGE_CONFIG_FILE
    write_config(out_path, cfg, "image")
    print(f"[capabilities] \u56fe\u50cf\u80fd\u529b\u5df2\u5199\u5165 mode={mode}")
    print(f"[capabilities]   文件: {out_path}")
    print(f"[capabilities]   说明: {explain_mode('image', mode)}")


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="capabilities.py",
        description="沙画动画 skill · 语音 / 图像能力管理 CLI",
    )
    sub = p.add_subparsers(dest="cmd", required=True)

    p_status = sub.add_parser("status", help="检查当前语音/图像能力配置状态")
    p_status.add_argument("--explain", action="store_true", help="额外打印每种已启用模式的说明")
    p_status.set_defaults(func=cmd_status)

    p_voice = sub.add_parser("voice", help="语音能力管理（子命令: enable）")
    voice_sub = p_voice.add_subparsers(dest="voice_cmd", required=True)
    p_voice_en = voice_sub.add_parser("enable", help="启用/覆盖语音能力配置")
    p_voice_en.add_argument("--mode", required=True, choices=VOICE_MODES,
                            help="existing / synth / trained")
    p_voice_en.add_argument("--recording-dir", default=None,
                            help="existing 模式：已有录音目录路径")
    p_voice_en.add_argument("--voice-model-dir", default=None,
                            help="trained 模式：用户自行训练的模型所在目录")
    p_voice_en.add_argument("--voice-name", default=None,
                            help="trained 模式：默认音色名")
    p_voice_en.set_defaults(func=cmd_voice_enable)

    p_image = sub.add_parser("image", help="图像能力管理（子命令: enable）")
    image_sub = p_image.add_subparsers(dest="image_cmd", required=True)
    p_image_en = image_sub.add_parser("enable", help="启用/覆盖图像能力配置")
    p_image_en.add_argument("--mode", required=True, choices=IMAGE_MODES,
                            help="existing / generate / none")
    p_image_en.add_argument("--library-dir", default=None,
                            help="existing 模式：图片素材库目录")
    p_image_en.add_argument("--size", default=None,
                            help="generate 模式：默认生图尺寸 (WxH)，默认 1024x1024")
    p_image_en.add_argument("--reason", default=None,
                            help="none 模式：显式关闭的原因，供排查")
    p_image_en.set_defaults(func=cmd_image_enable)

    return p


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
