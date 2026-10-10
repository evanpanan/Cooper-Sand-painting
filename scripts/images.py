#!/usr/bin/env python3
import argparse
import json
import math
import os
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

PROHIBIT_SUFFIX = "--no AI\u611f\u84dd\u7d2b \u9713\u8679\u8272 \u8d5b\u535a\u670b\u514b \u5851\u6599\u611f \u8fc7\u5ea6\u9510\u5316"

CAPS_DIR_NAME = ".sand-painting-caps"
IMAGE_CONFIG_FILE = "image.json"


def get_caps_dir() -> Path:
    return Path.home() / CAPS_DIR_NAME


def load_image_config():
    p = get_caps_dir() / IMAGE_CONFIG_FILE
    if not p.exists():
        return None
    try:
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return None


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def cmd_gen(args) -> None:
    prompt = args.prompt.strip()
    if not prompt:
        print("[images] ERROR: --prompt 不能为空", file=sys.stderr)
        sys.exit(2)
    count = args.count
    if count < 1 or count > 12:
        print("[images] ERROR: --count 必须在 1..12 之间", file=sys.stderr)
        sys.exit(2)

    cfg = load_image_config()
    cfg_mode = None
    cfg_size = "1024x1024"
    if cfg and isinstance(cfg, dict):
        cfg_mode = cfg.get("mode")
        opts = cfg.get("options") or {}
        if opts.get("default_size"):
            cfg_size = opts["default_size"]

    if cfg_mode == "none":
        print("[images] ERROR: 图像能力显式配置为 none，无法生成。请先运行 capabilities.py image enable --mode generate", file=sys.stderr)
        sys.exit(1)

    full_prompt = f"{prompt} {PROHIBIT_SUFFIX}"

    output_prefix = Path(args.out)
    ensure_parent(output_prefix)

    prompts = []
    for idx in range(1, count + 1):
        variant_prompt = full_prompt
        if count > 1:
            variant_prompt = f"{prompt} \u53d8\u4f53{idx} {PROHIBIT_SUFFIX}"
        prompts.append({
            "variant": idx,
            "full_prompt": variant_prompt,
            "size": cfg_size,
            "target_file": f"{output_prefix.name}_{idx:02d}.png",
        })

    job = {
        "job_id": f"img_gen_{utc_now_iso()}",
        "requested_count": count,
        "output_prefix": str(output_prefix),
        "output_dir": str(output_prefix.parent),
        "prompts": prompts,
        "tool_hint": "text_to_image",
        "capabilities_mode": cfg_mode or "unset",
        "requirements": {
            "min_resolution": "1024x1024",
            "color_mode": "RGB",
            "file_format": "PNG",
            "naming_rule": f"{output_prefix.name}_NN.png (NN 从 01 到 {count:02d})",
        },
        "next_steps": [
            "\u8c03\u7528\u73af\u5883\u4e2d\u53ef\u7528\u7684\u751f\u56fe\u5de5\u5177\uff08\u5982 text_to_image skill\uff09\u6309 prompts \u5217\u8868\u9010\u4e2a\u751f\u6210",
            f"\u4fdd\u5b58\u5230 {output_prefix.parent}/\uff0c\u6587\u4ef6\u540d\u5fc5\u987b\u7b26\u5408 naming_rule",
            "\u5bf9\u6bcf\u5f20\u56fe\u8fd0\u884c: python3 scripts/images.py validate --src <PNG>",
            f"\u9009\u5b9a\u4e00\u5f20\u540e\uff0c\u5728 {output_prefix.parent}/ \u4e0b\u5199\u5165 <\u540d>_\u5df2\u6279\u51c6.json\u6307\u5411\u6700\u7ec8\u6587\u4ef6",
        ],
    }

    print(json.dumps(job, ensure_ascii=False, indent=2))

    plan_path = output_prefix.parent / f"{output_prefix.name}_\u4f5c\u4e1a\u5355.json"
    ensure_parent(plan_path)
    with open(plan_path, "w", encoding="utf-8") as f:
        json.dump(job, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"\n[images] \u4f5c\u4e1a\u5355\u540c\u65f6\u4fdd\u5b58\u5230: {plan_path}", file=sys.stderr)

    if cfg_mode != "generate":
        print(
            f"[images] WARNING: 图像能力当前 mode={cfg_mode!r}，不是 'generate'。已输出作业单，但不会自动触发任何生图动作。",
            file=sys.stderr,
        )


def cmd_import(args) -> None:
    src = Path(args.src).expanduser()
    if not src.exists():
        print(f"[images] ERROR: --src 不存在: {src}", file=sys.stderr)
        sys.exit(1)
    if not src.is_file():
        print(f"[images] ERROR: --src 不是文件: {src}", file=sys.stderr)
        sys.exit(1)

    out = Path(args.out).expanduser()
    if out.suffix == "":
        out = out / src.name
    ensure_parent(out)

    if HAS_PIL:
        try:
            with Image.open(src) as im:
                w, h = im.size
                if w < 1024 or h < 1024:
                    print(
                        f"[images] WARNING: 导入图像尺寸 {w}x{h} < 1024x1024，后续 validate 将失败（但本次 import 继续复制）",
                        file=sys.stderr,
                    )
                if im.mode not in ("RGB", "RGBA", "L"):
                    print(
                        f"[images] WARNING: 图像 mode={im.mode}，建议转为 RGB（继续复制）",
                        file=sys.stderr,
                    )
        except Exception as e:
            print(f"[images] WARNING: Pillow 无法打开 {src}: {e}（继续复制原始文件）", file=sys.stderr)
    else:
        print("[images] WARNING: Pillow 未安装，跳过预检查。运行: pip install pillow", file=sys.stderr)

    try:
        shutil.copy2(src, out)
    except OSError as e:
        print(f"[images] ERROR: 复制失败: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"[images] import OK")
    print(f"  src : {src}")
    print(f"  dst : {out}")
    if out.exists():
        sz = out.stat().st_size
        print(f"  size: {sz} bytes ({sz / 1024:.1f} KB)")
    print(f"  next: python3 scripts/images.py validate --src {out}")


def quick_image_stats(src: Path):
    if not HAS_PIL:
        return None
    from PIL import Image as _I
    use_np = False
    try:
        import numpy as _np
        use_np = True
    except ImportError:
        use_np = False
    with _I.open(src) as im:
        im_rgb = im.convert("RGB")
        w, h = im_rgb.size
        if use_np:
            arr = _np.asarray(im_rgb, dtype=_np.float64)
            if arr.ndim != 3 or arr.shape[2] != 3:
                return {"w": w, "h": h, "mean_bright": 0, "std_r": 0, "std_g": 0, "std_b": 0, "solid": True}
            r_mean = float(arr[:, :, 0].mean())
            g_mean = float(arr[:, :, 1].mean())
            b_mean = float(arr[:, :, 2].mean())
            r_std = float(arr[:, :, 0].std())
            g_std = float(arr[:, :, 1].std())
            b_std = float(arr[:, :, 2].std())
        else:
            raw = im_rgb.tobytes()
            n = w * h
            if n == 0:
                return {"w": w, "h": h, "mean_bright": 0, "std_r": 0, "std_g": 0, "std_b": 0, "solid": True}
            r_sum = g_sum = b_sum = 0.0
            step = 3
            for i in range(0, len(raw), step):
                r_sum += raw[i]
                g_sum += raw[i + 1]
                b_sum += raw[i + 2]
            r_mean = r_sum / n
            g_mean = g_sum / n
            b_mean = b_sum / n
            r_ss = g_ss = b_ss = 0.0
            for i in range(0, len(raw), step):
                dr = raw[i] - r_mean
                dg = raw[i + 1] - g_mean
                db = raw[i + 2] - b_mean
                r_ss += dr * dr
                g_ss += dg * dg
                b_ss += db * db
            r_std = math.sqrt(r_ss / n)
            g_std = math.sqrt(g_ss / n)
            b_std = math.sqrt(b_ss / n)
        mean_bright = (r_mean + g_mean + b_mean) / 3.0
        max_std = max(r_std, g_std, b_std)
        solid = max_std < 10.0
        return {
            "w": w,
            "h": h,
            "mean_bright": mean_bright,
            "r_mean": r_mean,
            "g_mean": g_mean,
            "b_mean": b_mean,
            "std_r": r_std,
            "std_g": g_std,
            "std_b": b_std,
            "max_std": max_std,
            "solid": solid,
        }


def save_sand_preview(src: Path, stats) -> Path:
    if not HAS_PIL:
        raise RuntimeError("Pillow 未安装，无法生成 preview")
    from PIL import Image as _I, ImageEnhance as _E
    preview_path = src.with_name(src.stem + "_sandpreview.png")
    with _I.open(src) as im:
        im_rgb = im.convert("RGB")
        w, h = im_rgb.size
        gr = im_rgb.convert("L")
        grain = _E.Brightness(gr).enhance(0.75)
        contrast = _E.Contrast(grain).enhance(1.4)
        rgb = contrast.convert("RGB")
        warm = _I.new("RGB", (w, h), (255, 230, 180))
        out = _I.blend(rgb, warm, 0.25)
        out.save(preview_path, "PNG")
    return preview_path


def cmd_validate(args) -> None:
    src = Path(args.src).expanduser()
    if not src.exists():
        print(f"[validate] ERROR: 文件不存在: {src}", file=sys.stderr)
        sys.exit(1)
    if not src.is_file():
        print(f"[validate] ERROR: 不是文件: {src}", file=sys.stderr)
        sys.exit(1)

    print(f"[validate] {src}")
    if not HAS_PIL:
        print("  Pillow 未安装，无法执行 validate。运行: pip install pillow numpy")
        print("  结论: SKIP (工具缺失，非图像本身问题)")
        sys.exit(0)

    stats = quick_image_stats(src)
    if stats is None:
        print("  无法读取图像元数据")
        print("  结论: FAIL")
        sys.exit(1)

    failures = []
    checks = []

    w, h = stats["w"], stats["h"]
    size_ok = (w >= 1024) and (h >= 1024)
    checks.append(("\u5c3a\u5bf8", f"{w}x{h}", size_ok, ">= 1024x1024"))
    if not size_ok:
        failures.append("size")

    max_std = stats.get("max_std", 0.0)
    solid = stats.get("solid", True)
    non_solid_ok = not solid
    checks.append(("\u975e\u7eaf\u8272 (std)", f"{max_std:.1f}", non_solid_ok, "max(RGB std) > 10"))
    if not non_solid_ok:
        failures.append("solid")

    mb = stats.get("mean_bright", 0.0)
    bright_ok = 50.0 <= mb <= 230.0
    checks.append(("\u5e73\u5747\u4eae\u5ea6", f"{mb:.1f}", bright_ok, "50 .. 230"))
    if not bright_ok:
        failures.append("bright")

    for name, value, ok, threshold in checks:
        mark = "\u2705" if ok else "\u274c"
        line = f"  {name}: {value}  {mark}"
        if not ok:
            line += f"  ({threshold})"
        print(line)

    if args.sand_preview:
        try:
            p = save_sand_preview(src, stats)
            print(f"  preview -> {p}")
        except Exception as e:
            print(f"  preview: FAIL ({e})")

    if failures:
        print(f"  结论: FAIL ({len(failures)} \u9879\u672a\u901a\u8fc7: {', '.join(failures)})")
        sys.exit(1)
    else:
        print("  结论: PASS")
        sys.exit(0)


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="images.py",
        description="沙画动画 skill · 图像作业 CLI（生成作业单 / 导入 / 校验）",
    )
    sub = p.add_subparsers(dest="cmd", required=True)

    p_gen = sub.add_parser("gen", help="输出图像生成作业单 JSON（不直接生图，除非 capabilities 已挂具体生成器）")
    p_gen.add_argument("--prompt", required=True, help="中文提示词")
    p_gen.add_argument("--count", type=int, default=3, help="变体数量 (1-12)，默认 3")
    p_gen.add_argument("--out", required=True, help="输出前缀路径，例如 project/assets/角色_主角；会生成 前缀_NN.png 和 前缀_作业单.json")
    p_gen.set_defaults(func=cmd_gen)

    p_imp = sub.add_parser("import", help="导入已有图片到项目 assets 并做初步检查")
    p_imp.add_argument("--src", required=True, help="源图片路径")
    p_imp.add_argument("--out", required=True, help="目标路径（文件或目录；目录则用源文件名）")
    p_imp.set_defaults(func=cmd_import)

    p_val = sub.add_parser("validate", help="快速校验图像尺寸、非纯色、亮度范围")
    p_val.add_argument("--src", required=True, help="图片路径")
    p_val.add_argument("--sand-preview", action="store_true",
                       help="额外生成一张简化沙化预览图 *_sandpreview.png 辅助人工判断颗粒厚度")
    p_val.set_defaults(func=cmd_validate)

    return p


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
