#!/usr/bin/env python3
import argparse
import json
import os
import sys
import subprocess
import tempfile
import shutil
import hashlib
import math
from pathlib import Path
from collections import Counter

SAND_VERBS = ["撒", "划", "流", "抹", "散", "聚"]

WEIGHTS = {
    "hard_cut_count": 0.20,
    "tone_ratio": 0.20,
    "progressive_ratio": 0.15,
    "sand_recognition": 0.65 / 6,
    "grain_thickness": 0.65 / 6,
    "scratch_recovery": 0.65 / 6,
    "motion_diff": 0.65 / 6,
    "active_ratio": 0.65 / 6,
    "determinism": 0.65 / 6,
}

THEME_CHOICES = ["realistic_cool", "classic_warm", "colorful", "glow_night"]


def parse_args():
    p = argparse.ArgumentParser(description="Sand Painting QA - Quality Assurance (9 项指标)")
    p.add_argument("--project", type=str, default=None, help="Path to engine project directory")
    p.add_argument("--ids", type=str, default=None, help="Comma-separated scene IDs to render and QA")
    p.add_argument("--spec", type=str, default=None, help="Parameterized clip spec JSON file")
    p.add_argument("--determinism_only", action="store_true", help="Only run determinism check: same t twice, compare byte-level")
    p.add_argument("--schedule", type=str, default=None, help="schedule.js 路径（用于指标9渐进时间比）")
    p.add_argument("--theme", choices=THEME_CHOICES, default="realistic_cool",
                   help=f"主题调色板（默认 realistic_cool），用于指标8色调阈值判定")
    p.add_argument("--out", type=str, required=True, help="Output report directory")
    return p.parse_args()


def run_cmd(cmd, check=True, capture_output=True):
    result = subprocess.run(cmd, capture_output=capture_output, text=True)
    if check and result.returncode != 0:
        stderr = result.stderr[-2000:] if result.stderr else ""
        raise RuntimeError(f"Command failed {' '.join(cmd[:3])}...: {stderr}")
    return result


def get_pil_np():
    try:
        from PIL import Image
        import numpy as np
        return Image, np
    except ImportError:
        return None, None


def load_image(path):
    Image, np = get_pil_np()
    if Image is None:
        raise ImportError("Pillow not installed. Run: pip install pillow numpy")
    img = Image.open(path).convert("RGB")
    return np.array(img, dtype=np.float64)


def rgb_euclidean(c1, c2):
    return math.sqrt((c1[0]-c2[0])**2 + (c1[1]-c2[1])**2 + (c1[2]-c2[2])**2)


def extract_frames_ffmpeg(video_path, out_dir, fps=10):
    out_dir.mkdir(parents=True, exist_ok=True)
    pattern = str(out_dir / "frame_%04d.png")
    cmd = [
        "ffmpeg", "-y", "-i", str(video_path),
        "-vf", f"fps={fps}",
        pattern,
    ]
    run_cmd(cmd, capture_output=True)
    frames = sorted(out_dir.glob("frame_*.png"))
    return frames


def load_palette(project_path):
    palette = {
        "lightTable": (255, 235, 190),
        "sandColors": [
            (120, 80, 40),
            (160, 110, 60),
            (190, 145, 85),
            (215, 175, 115),
            (90, 55, 25),
        ],
    }
    palette_file = project_path / "references" / "色板.md" if project_path else None
    if not palette_file or not palette_file.exists():
        skill_root = Path(__file__).resolve().parent.parent / "references" / "色板.md"
        if skill_root.exists():
            palette_file = skill_root
    if palette_file and palette_file.exists():
        try:
            content = palette_file.read_text(encoding="utf-8", errors="replace")
            import re
            hex_colors = re.findall(r'#([0-9a-fA-F]{6})', content)
            if hex_colors:
                rgb_list = []
                for h in hex_colors[:6]:
                    r = int(h[0:2], 16); g = int(h[2:4], 16); b = int(h[4:6], 16)
                    rgb_list.append((r, g, b))
                if rgb_list:
                    palette["sandColors"] = rgb_list
                    palette["lightTable"] = rgb_list[-1] if len(rgb_list) >= 1 else (255, 235, 190)
        except Exception:
            pass
    return palette


def parse_schedule_js(schedule_path):
    p = Path(schedule_path)
    if not p.exists():
        return None
    try:
        text = p.read_text(encoding="utf-8")
        m = re.search(r'window\.(USER_SCHEDULE|PROGRESSIVE_DEMO)\s*=\s*function\s*\(\s*\)\s*\{([\s\S]*?)\};?\s*$', text)
        if not m:
            return None
        body = m.group(2).strip()
        try:
            node_code = f"process.stdout.write(JSON.stringify((function(){{{body}}})()));"
            result = subprocess.run(
                ["node", "-e", node_code],
                capture_output=True, text=True, timeout=10
            )
            if result.returncode == 0 and result.stdout.strip():
                return json.loads(result.stdout.strip())
        except Exception:
            pass
        arr_m = re.search(r'return\s*(\[[\s\S]*?\])\s*;', body)
        if arr_m:
            arr_text = arr_m.group(1)
            arr_text = re.sub(r'//.*$', '', arr_text, flags=re.MULTILINE)
            arr_text = re.sub(r"'", '"', arr_text)
            try:
                return json.loads(arr_text)
            except Exception:
                pass
    except Exception:
        pass
    return None


def metric_sand_recognition(frames, palette):
    if len(frames) == 0:
        return {"pass": False, "value": float("inf"), "detail": "No frames", "score": 0, "level": "red"}
    Image, np = get_pil_np()
    light = np.array(palette["lightTable"], dtype=np.float64)
    mid_frame_path = frames[len(frames) // 2]
    img = load_image(mid_frame_path)
    h, w = img.shape[:2]
    edge_mask = np.zeros(img.shape[:2], dtype=bool)
    edge_w = max(1, min(h, w) // 20)
    edge_mask[:edge_w, :] = True
    edge_mask[-edge_w:, :] = True
    edge_mask[:, :edge_w] = True
    edge_mask[:, -edge_w:] = True
    corner_samples = []
    for y in [0, h-1]:
        for x in [0, w-1, w//4, w//2, 3*w//4]:
            yy = min(max(y, edge_w//2), h-1-edge_w//2)
            xx = min(max(x, edge_w//2), w-1-edge_w//2)
            corner_samples.append(img[yy, xx])
    if not corner_samples:
        flat = img.reshape(-1, 3)
        perms = np.random.permutation(len(flat))[:1000]
        corner_samples = flat[perms]
    samples = np.array(corner_samples, dtype=np.float64)
    diffs = np.linalg.norm(samples - light, axis=1)
    avg_diff = float(np.mean(diffs))
    passed = avg_diff < 15.0
    if passed:
        score = 100
        level = "green"
    elif avg_diff < 25.0:
        score = 60
        level = "yellow"
        passed = False
    else:
        score = 0
        level = "red"
    return {
        "pass": passed,
        "value": avg_diff,
        "threshold": 15.0,
        "detail": f"Avg RGB Euclidean diff of no-sand regions vs lightTable: {avg_diff:.2f} (threshold <15)",
        "score": score,
        "level": level,
    }


def count_grain_particles(img_arr, dark_thresh=180):
    Image, np = get_pil_np()
    gray = np.mean(img_arr, axis=2)
    binary = gray < dark_thresh
    h, w = binary.shape
    visited = np.zeros_like(binary, dtype=bool)
    count = 0
    min_size = 2
    for y in range(h):
        for x in range(w):
            if binary[y, x] and not visited[y, x]:
                stack = [(y, x)]
                size = 0
                while stack:
                    cy, cx = stack.pop()
                    if cy < 0 or cy >= h or cx < 0 or cx >= w:
                        continue
                    if visited[cy, cx] or not binary[cy, cx]:
                        continue
                    visited[cy, cx] = True
                    size += 1
                    stack.append((cy+1, cx))
                    stack.append((cy-1, cx))
                    stack.append((cy, cx+1))
                    stack.append((cy, cx-1))
                if size >= min_size and size <= 500:
                    count += 1
    return count


def metric_grain_thickness(frames):
    if len(frames) == 0:
        return {"pass": False, "value": 0, "detail": "No frames", "score": 0, "level": "red"}
    Image, np = get_pil_np()
    mid_frame_path = frames[len(frames) // 2]
    img = load_image(mid_frame_path)
    h, w = img.shape[:2]
    gray = np.mean(img, axis=2)
    left_half = img[:, :w//2, :]
    right_half = img[:, w//2:, :]
    left_gray = gray[:, :w//2]
    right_gray = gray[:, w//2:]
    left_dark = np.mean(left_gray)
    right_dark = np.mean(right_gray)
    if left_dark <= right_dark:
        thick_region = left_half
        thin_region = right_half
    else:
        thick_region = right_half
        thin_region = left_half
    thick_count = count_grain_particles(thick_region, dark_thresh=190)
    thin_count = count_grain_particles(thin_region, dark_thresh=200)
    if thin_count == 0:
        thin_count = 1
    ratio = thick_count / thin_count
    passed = ratio >= 3.0
    if passed:
        score = 100
        level = "green"
    elif ratio >= 2.0:
        score = 60
        level = "yellow"
        passed = False
    else:
        score = 0
        level = "red"
    return {
        "pass": passed,
        "value": ratio,
        "threshold": 3.0,
        "detail": f"Grain particle count ratio (thick/thin) = {thick_count}/{thin_count} = {ratio:.2f} (threshold >=3)",
        "thick_count": thick_count,
        "thin_count": thin_count,
        "score": score,
        "level": level,
    }


def metric_scratch_recovery(frames, palette):
    if len(frames) < 2:
        return {"pass": False, "value": float("inf"), "detail": "Need >=2 frames", "score": 0, "level": "red"}
    Image, np = get_pil_np()
    light = np.array(palette["lightTable"], dtype=np.float64)
    light_rgb = palette["lightTable"]
    first = load_image(frames[0])
    last = load_image(frames[-1])
    diff = np.abs(first - last)
    changed_mask = np.mean(diff, axis=2) > 30
    if not np.any(changed_mask):
        return {"pass": True, "value": 0.0, "threshold": 15.0, "detail": "No scratch pixels detected (skipped)", "score": 100, "level": "green"}
    last_changed = last[changed_mask]
    if len(last_changed) == 0:
        return {"pass": True, "value": 0.0, "threshold": 15.0, "detail": "No scratch pixels", "score": 100, "level": "green"}
    distances = np.linalg.norm(last_changed - light, axis=1)
    avg_dist = float(np.mean(distances))
    passed = avg_dist < 15.0
    if passed:
        score = 100
        level = "green"
    elif avg_dist < 25.0:
        score = 60
        level = "yellow"
        passed = False
    else:
        score = 0
        level = "red"
    return {
        "pass": passed,
        "value": avg_dist,
        "threshold": 15.0,
        "detail": f"Scratch recovery avg RGB diff from lightTable: {avg_dist:.2f} (threshold <15)",
        "score": score,
        "level": level,
    }


def metric_motion_frame_diff(frames):
    if len(frames) < 2:
        return {"pass": True, "min": 0, "max": 0, "avg": 0, "flicker": False, "detail": "Need >=2 frames", "score": 100, "level": "green"}
    Image, np = get_pil_np()
    prev = load_image(frames[0])
    diffs = []
    h, w = prev.shape[:2]
    total_pix = h * w
    for i in range(1, len(frames)):
        curr = load_image(frames[i])
        diff = np.abs(curr - prev)
        changed = np.sum(np.mean(diff, axis=2) > 20)
        pct = changed / total_pix * 100
        diffs.append(pct)
        prev = curr
    if not diffs:
        return {"pass": True, "min": 0, "max": 0, "avg": 0, "flicker": False, "detail": "No diffs", "score": 100, "level": "green"}
    d_min = min(diffs)
    d_max = max(diffs)
    d_avg = sum(diffs) / len(diffs)
    flicker = d_max > 10.0
    passed = not flicker
    if passed:
        score = 100
        level = "green"
    elif d_max < 15.0:
        score = 60
        level = "yellow"
        passed = False
    else:
        score = 0
        level = "red"
    return {
        "pass": passed,
        "min": d_min,
        "max": d_max,
        "avg": d_avg,
        "flicker": flicker,
        "threshold": 10.0,
        "detail": f"Frame diff %: min={d_min:.2f}%, max={d_max:.2f}%, avg={d_avg:.2f}% (flicker if max>10%)",
        "score": score,
        "level": level,
    }


def metric_active_frames(frames):
    if len(frames) < 2:
        return {"pass": False, "ratio": 0, "detail": "Need >=2 frames", "score": 0, "level": "red"}
    Image, np = get_pil_np()
    prev = load_image(frames[0])
    h, w = prev.shape[:2]
    total_pix = h * w
    active = 0
    motion_percents = []
    for i in range(1, len(frames)):
        curr = load_image(frames[i])
        diff = np.abs(curr - prev)
        changed = np.sum(np.mean(diff, axis=2) > 15)
        pct = changed / total_pix * 100
        motion_percents.append(pct)
        if 3.5 <= pct <= 8.0:
            active += 1
        prev = curr
    total = len(frames) - 1
    ratio = active / total if total > 0 else 0.0
    passed = 0.3 <= ratio <= 0.9
    if passed:
        score = 100
        level = "green"
    elif 0.2 <= ratio <= 0.95:
        score = 60
        level = "yellow"
        passed = False
    else:
        score = 0
        level = "red"
    return {
        "pass": passed,
        "ratio": ratio,
        "count_active": active,
        "count_total": total,
        "target": "3.5-8% motion per frame",
        "detail": f"Active frames ratio: {active}/{total} = {ratio:.2%} (target 30-90% of frames in 3.5-8% motion range)",
        "histogram": motion_percents[:50],
        "score": score,
        "level": level,
    }


def determinism_check(project_path, spec_path, scene_id, report_dir):
    engine_dir = Path(project_path) if project_path else Path(__file__).resolve().parent
    render_script = engine_dir / "render.py"
    if not render_script.exists():
        render_script = Path(__file__).resolve().parent / "engine" / "render.py"
    t_val = 1.0
    out_a = report_dir / "det_render_a.png"
    out_b = report_dir / "det_render_b.png"
    cmd_common = ["python3", str(render_script)]
    if scene_id:
        cmd_common += ["--solo", scene_id]
    if spec_path:
        cmd_common += ["--spec", spec_path]
    cmd_a = cmd_common + [
        "--stills", str(t_val),
        "--from", "0", "--to", str(t_val + 0.1),
        "--out", str(out_a),
    ]
    if project_path:
        cmd_a += ["--project", project_path]
    run_cmd(cmd_a, check=True)
    generated_a = sorted(report_dir.glob(f"{out_a.name}_*_t{t_val:.2f}.png"))
    if not generated_a:
        generated_a = sorted(report_dir.glob(f"{out_a.name}_*.png"))
    cmd_b = cmd_common + [
        "--stills", str(t_val),
        "--from", "0", "--to", str(t_val + 0.1),
        "--out", str(out_b),
    ]
    if project_path:
        cmd_b += ["--project", project_path]
    run_cmd(cmd_b, check=True)
    generated_b = sorted(report_dir.glob(f"{out_b.name}_*_t{t_val:.2f}.png"))
    if not generated_b:
        generated_b = sorted(report_dir.glob(f"{out_b.name}_*.png"))
    if not generated_a or not generated_b:
        return {"pass": False, "detail": "Failed to produce rendered frames", "score": 0, "level": "red"}
    fa = generated_a[0]
    fb = generated_b[0]
    data_a = fa.read_bytes()
    data_b = fb.read_bytes()
    hash_a = hashlib.sha256(data_a).hexdigest()
    hash_b = hashlib.sha256(data_b).hexdigest()
    identical = (data_a == data_b)
    if identical:
        score = 100
        level = "green"
    else:
        score = 60
        level = "yellow"
    return {
        "pass": identical,
        "file_a": str(fa),
        "file_b": str(fb),
        "hash_a": hash_a,
        "hash_b": hash_b,
        "detail": f"Determinism check at t={t_val}s: {'IDENTICAL' if identical else 'DIFFERENT'} (sha256 A={hash_a[:12]}..., B={hash_b[:12]}...)",
        "score": score,
        "level": level,
    }


def render_scene_video(project_path, scene_id, report_dir):
    engine_dir = Path(project_path) if project_path else Path(__file__).resolve().parent
    render_script = engine_dir / "render.py"
    if not render_script.exists():
        render_script = Path(__file__).resolve().parent / "engine" / "render.py"
    video_path = report_dir / f"scene_{scene_id}.mp4"
    cmd = [
        "python3", str(render_script),
        "--solo", scene_id,
        "--from", "0", "--to", "2",
        "--fps", "30",
        "--no-counter",
        "--out", str(video_path),
    ]
    if project_path:
        cmd += ["--project", project_path]
    run_cmd(cmd, check=True)
    return video_path


def render_spec_video(spec_path, report_dir):
    engine_dir = Path(__file__).resolve().parent / "engine"
    render_script = engine_dir / "render.py"
    with open(spec_path, 'r', encoding='utf-8') as f:
        spec = json.load(f)
    duration = spec.get("duration", 2.0)
    video_path = report_dir / "spec_clip.mp4"
    cmd = [
        "python3", str(render_script),
        "--spec", str(Path(spec_path).resolve()),
        "--from", "0", "--to", str(duration),
        "--no-counter",
        "--out", str(video_path),
    ]
    run_cmd(cmd, check=True)
    return video_path


def metric_hard_cut_count(frames, fps=8):
    """指标7：硬切数（P12 零硬切铁律）"""
    if len(frames) < 7:
        return {"pass": True, "count": 0, "timestamps": [], "detail": "Frames too few, skipped", "score": 100, "level": "green"}
    Image, np = get_pil_np()
    prev = load_image(frames[0])
    h, w = prev.shape[:2]
    total_pix = h * w
    mads = []
    for i in range(1, len(frames)):
        curr = load_image(frames[i])
        diff = np.abs(curr - prev)
        mad = float(np.mean(diff))
        mads.append(mad)
        prev = curr

    hard_cut_indices = []
    for i in range(len(mads)):
        if mads[i] > 25.0:
            window_start = max(0, i - 3)
            window_end = min(len(mads), i + 4)
            window = mads[window_start:window_end]
            if window and mads[i] == max(window):
                hard_cut_indices.append(i)

    timestamps_sec = [round((idx + 1) / fps, 2) for idx in hard_cut_indices]
    count = len(hard_cut_indices)

    if count == 0:
        score = 100
        level = "green"
        passed = True
        detail = f"硬切数 = 0，零硬切铁律通过 (P12)"
    elif count == 1:
        score = 60
        level = "yellow"
        passed = False
        detail = f"硬切数 = 1 次（时间码: {timestamps_sec[0]}s），零硬切铁律不通过 (P12)"
    else:
        score = 0
        level = "red"
        passed = False
        detail = f"硬切数 = {count} 次（时间码: {', '.join(f'{t}s' for t in timestamps_sec)}），零硬切铁律严重不通过 (P12)"

    return {
        "pass": passed,
        "count": count,
        "timestamps": timestamps_sec,
        "threshold": "0 硬切",
        "detail": detail,
        "score": score,
        "level": level,
    }


def metric_tone_ratio(frames, theme="realistic_cool"):
    """指标8：色调冷调/暖调占比（P11 沙画识别核心）"""
    if len(frames) == 0:
        return {"pass": False, "C%": 0, "M%": 0, "W%": 0, "detail": "No frames", "score": 0, "level": "red"}
    Image, np = get_pil_np()
    sample_count = min(5, len(frames))
    step = max(1, len(frames) // sample_count)
    sampled_frames = frames[::step][:sample_count]

    cold_total = 0
    warm_total = 0
    mid_total = 0
    pixel_total = 0

    for fp in sampled_frames:
        img = load_image(fp)
        h, w = img.shape[:2]
        stride_h = max(1, h // 60)
        stride_w = max(1, w // 100)
        sampled = img[::stride_h, ::stride_w, :]
        R = sampled[:, :, 0]
        G = sampled[:, :, 1]
        B = sampled[:, :, 2]

        cold_mask = (B > R + 18) & (G > R + 10)
        warm_mask = (R > B + 18) & (R > G + 8)
        mid_mask = ~(cold_mask | warm_mask)

        cold_total += int(np.sum(cold_mask))
        warm_total += int(np.sum(warm_mask))
        mid_total += int(np.sum(mid_mask))
        pixel_total += cold_mask.size

    if pixel_total == 0:
        return {"pass": False, "C%": 0, "M%": 0, "W%": 0, "detail": "No pixels sampled", "score": 0, "level": "red"}

    c_pct = cold_total / pixel_total * 100
    w_pct = warm_total / pixel_total * 100
    m_pct = mid_total / pixel_total * 100

    bench = f"（成品样片参考: C=73.8%）"
    if theme == "classic_warm":
        target_name = "暖 W%"
        value_pct = w_pct
        if w_pct > 70:
            score = 100
            level = "green"
            passed = True
        elif 50 <= w_pct <= 69:
            score = 60
            level = "yellow"
            passed = False
        else:
            score = 0
            level = "red"
            passed = False
        detail = f"theme=classic_warm，暖像素占比 W%={w_pct:.1f}% 中 M%={m_pct:.1f}% 冷 C%={c_pct:.1f}% (阈值 W%>70 绿) {bench}"
    else:
        target_name = "冷 C%"
        value_pct = c_pct
        if c_pct > 70:
            score = 100
            level = "green"
            passed = True
        elif 50 <= c_pct <= 69:
            score = 60
            level = "yellow"
            passed = False
        else:
            score = 0
            level = "red"
            passed = False
        detail = f"冷像素占比 C%={c_pct:.1f}% 中 M%={m_pct:.1f}% 暖 W%={w_pct:.1f}% (阈值 C%>70 绿) {bench}"

    return {
        "pass": passed,
        "C%": round(c_pct, 2),
        "M%": round(m_pct, 2),
        "W%": round(w_pct, 2),
        "theme": theme,
        "target": target_name,
        "value_pct": round(value_pct, 2),
        "detail": detail,
        "score": score,
        "level": level,
    }


def metric_progressive_ratio(schedule_path):
    """指标9：渐进时间比（P13 作画:渐进=0.3:1 铁律）"""
    if not schedule_path:
        return {
            "pass": False, "ratio": None, "scene_total": 0, "morph_total": 0,
            "detail": "未提供 --schedule，N/A 跳过打灰分 50",
            "score": 50, "level": "gray", "na": True,
        }
    sched = parse_schedule_js(schedule_path)
    if sched is None:
        return {
            "pass": False, "ratio": None, "scene_total": 0, "morph_total": 0,
            "detail": "无法解析 schedule.js（需 window.USER_SCHEDULE 返回数组），N/A 跳过打灰分 50",
            "score": 50, "level": "gray", "na": True,
        }

    scene_total = 0.0
    morph_total = 0.0
    seg_count = 0
    for seg in sched:
        if isinstance(seg, dict):
            if "scene" in seg:
                scene_total += float(seg.get("duration", 0))
                seg_count += 1
            elif "morph" in seg:
                morph_total += float(seg["morph"].get("duration", 0))
                seg_count += 1

    if seg_count <= 1 or morph_total <= 0:
        return {
            "pass": False, "ratio": None, "scene_total": round(scene_total, 1), "morph_total": round(morph_total, 1),
            "detail": "只有单 scene 无法计算比例（N/A 灰分 50）",
            "score": 50, "level": "gray", "na": True,
        }

    ratio = scene_total / morph_total
    if 0.25 <= ratio <= 0.35:
        score = 100
        level = "green"
        passed = True
    elif 0.20 <= ratio <= 0.45:
        score = 60
        level = "yellow"
        passed = False
    else:
        score = 0
        level = "red"
        passed = False

    detail = (f"scene 总长 {scene_total:.1f}s / morph 总长 {morph_total:.1f}s = ratio {ratio:.3f} "
              f"(理想 [0.25, 0.35]，约 0.3:1 作画过程比；偏 <0.25 像 PPT，>0.45 作画过程太少)")

    return {
        "pass": passed,
        "ratio": round(ratio, 4),
        "scene_total": round(scene_total, 1),
        "morph_total": round(morph_total, 1),
        "threshold": "[0.25, 0.35]",
        "detail": detail,
        "score": score,
        "level": level,
    }


def calc_weighted_total(results):
    total = 0.0
    weight_sum = 0.0
    for key, r in results.items():
        w = WEIGHTS.get(key, 0)
        s = r.get("score", 0)
        if r.get("na"):
            continue
        total += w * s
        weight_sum += w
    if weight_sum <= 0:
        return 0.0
    return round(total / weight_sum, 1)


def has_any_red(results):
    return any(r.get("level") == "red" for r in results.values())


def check_result_status(results):
    if has_any_red(results):
        return "red", "🔴红灯"
    if any(r.get("level") == "yellow" for r in results.values()):
        return "yellow", "🟡黄灯"
    return "green", "🟢绿灯"


def write_report(report_dir, results, status, weighted_total=None):
    report_dir.mkdir(parents=True, exist_ok=True)
    status_code, status_cn = status
    lines = []
    lines.append(f"# 沙画 QA 报告（9 项指标）\n")
    lines.append(f"**总体状态**: {status_cn}")
    lines.append(f"**生成时间**: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    if weighted_total is not None:
        lines.append(f"**加权总分**: {weighted_total:.1f} / 100  (硬切 20% / 色调 20% / 渐进比 15% + 原6项各 {(0.65/6)*100:.1f}%)")
    lines.append("")
    lines.append("## 检查项汇总 (9 项红绿黄灯)\n")
    lines.append("| # | 检查项 | 权重 | 灯 | 分数 | 数值/说明 |")
    lines.append("|---|---|---|---|---|---|")
    names = {
        "hard_cut_count": "指标7·硬切数",
        "tone_ratio": "指标8·色调冷/暖占比",
        "progressive_ratio": "指标9·渐进时间比",
        "sand_recognition": "指标1·沙画识别度",
        "grain_thickness": "指标2·颗粒粗细依赖",
        "scratch_recovery": "指标3·划痕恢复验证",
        "motion_diff": "指标4·运动帧差%",
        "active_ratio": "指标5·活跃帧比例",
        "determinism": "指标6·渲染确定性",
    }
    lights = {"green": "🟢绿", "yellow": "🟡黄", "red": "🔴红", "gray": "⚪灰"}
    key_order = [
        "hard_cut_count", "tone_ratio", "progressive_ratio",
        "sand_recognition", "grain_thickness", "scratch_recovery",
        "motion_diff", "active_ratio", "determinism",
    ]
    display_idx = 0
    for key in key_order:
        if key not in results:
            continue
        r = results[key]
        display_idx += 1
        name = names.get(key, key)
        w = WEIGHTS.get(key, 0)
        light = lights.get(r.get("level", "gray"), "⚪?")
        score = r.get("score", 0)
        detail = r.get("detail", "")
        lines.append(f"| {display_idx} | {name} | {w*100:.0f}% | {light} | {score} | {detail[:90]} |")

    lines.append("\n## 详细检查结果\n")
    for key in key_order:
        if key not in results:
            continue
        r = results[key]
        name = names.get(key, key)
        light = lights.get(r.get("level", "gray"), "⚪?")
        lines.append(f"### {name} - {light} (分数 {r.get('score', 0)})\n")
        lines.append(f"{r.get('detail', '')}\n")
        extra = {k: v for k, v in r.items() if k not in {"pass", "detail", "score", "level"}}
        if extra:
            lines.append("```json")
            lines.append(json.dumps(extra, ensure_ascii=False, indent=2))
            lines.append("```\n")

    if has_any_red(results):
        red_items = [names.get(k, k) for k, r in results.items() if r.get("level") == "red"]
        lines.append("---\n")
        lines.append("## ❌ 不通过，不许交付\n")
        lines.append(f"检测到 🔴红项: **{', '.join(red_items)}**\n")
        lines.append("> 根据 P11/P12/P13 铁律与沙画 QA 规范，**存在任一红项不得交付**。")
        lines.append("> 请先修复上述红项后重新运行 `qa.py` 再通过 lint/deliver 流水线。\n")

    report_path = report_dir / "qa_report.md"
    report_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"[qa] Report written: {report_path}")
    return report_path


def main():
    args = parse_args()
    report_dir = Path(args.out).resolve()
    report_dir.mkdir(parents=True, exist_ok=True)

    project_path = Path(args.project).resolve() if args.project else None

    if args.determinism_only:
        print("[qa] Running DETERMINISM ONLY check")
        scene_id = None
        if args.ids:
            scene_id = args.ids.split(",")[0].strip()
        result = determinism_check(project_path, args.spec, scene_id, report_dir)
        results = {"determinism": result}
        status = check_result_status(results)
        wt = calc_weighted_total(results)
        write_report(report_dir, results, status, weighted_total=wt)
        print(f"[qa] Determinism: {'PASS' if result['pass'] else 'FAIL'}")
        sys.exit(0 if result["pass"] else 1)

    palette = load_palette(project_path)
    video_paths = []

    if args.spec:
        print(f"[qa] Rendering spec: {args.spec}")
        try:
            video_paths.append(render_spec_video(args.spec, report_dir))
        except Exception as e:
            print(f"[qa] Warning: spec render failed: {e}", file=sys.stderr)
            results = {"error": {"pass": False, "detail": f"Render failed: {e}", "score": 0, "level": "red"}}
            write_report(report_dir, results, ("red", "🔴红灯"), weighted_total=0)
            sys.exit(1)

    if args.ids and project_path:
        for sid in args.ids.split(","):
            sid = sid.strip()
            if not sid:
                continue
            print(f"[qa] Rendering scene: {sid}")
            try:
                video_paths.append(render_scene_video(project_path, sid, report_dir))
            except Exception as e:
                print(f"[qa] Warning: scene {sid} render failed: {e}", file=sys.stderr)

    if not video_paths:
        print("[qa] ERROR: no video rendered (need --spec or --project/--ids)", file=sys.stderr)
        sys.exit(1)

    all_frames = []
    for vp in video_paths:
        fd = report_dir / f"frames_{vp.stem}"
        frames = extract_frames_ffmpeg(vp, fd, fps=8)
        all_frames.extend(frames)

    if not all_frames:
        print("[qa] ERROR: no frames extracted", file=sys.stderr)
        sys.exit(1)

    print(f"[qa] Extracted {len(all_frames)} frames, running 9 metrics...")

    results = {}

    results["hard_cut_count"] = metric_hard_cut_count(all_frames, fps=8)
    hc = results["hard_cut_count"]
    print(f"  [指标7 P12] hard_cut_count: {hc['level'].upper()} count={hc.get('count', '?')} score={hc['score']}")

    results["tone_ratio"] = metric_tone_ratio(all_frames, theme=args.theme)
    tr = results["tone_ratio"]
    print(f"  [指标8 P11] tone_ratio (theme={args.theme}): {tr['level'].upper()} C%={tr.get('C%','?')} W%={tr.get('W%','?')} score={tr['score']}")

    results["progressive_ratio"] = metric_progressive_ratio(args.schedule)
    pr = results["progressive_ratio"]
    pr_detail = "N/A" if pr.get("na") else f"ratio={pr.get('ratio','?')}"
    print(f"  [指标9 P13] progressive_ratio: {pr['level'].upper()} {pr_detail} score={pr['score']}")

    results["sand_recognition"] = metric_sand_recognition(all_frames, palette)
    print(f"  [原1/6] sand_recognition: {results['sand_recognition']['level'].upper()} ({results['sand_recognition'].get('value', 'N/A')}) score={results['sand_recognition']['score']}")

    results["grain_thickness"] = metric_grain_thickness(all_frames)
    print(f"  [原2/6] grain_thickness: {results['grain_thickness']['level'].upper()} ({results['grain_thickness'].get('value', 'N/A')}) score={results['grain_thickness']['score']}")

    results["scratch_recovery"] = metric_scratch_recovery(all_frames, palette)
    print(f"  [原3/6] scratch_recovery: {results['scratch_recovery']['level'].upper()} ({results['scratch_recovery'].get('value', 'N/A')}) score={results['scratch_recovery']['score']}")

    results["motion_diff"] = metric_motion_frame_diff(all_frames)
    print(f"  [原4/6] motion_diff: {results['motion_diff']['level'].upper()} (max={results['motion_diff'].get('max', 'N/A')}) score={results['motion_diff']['score']}")

    results["active_ratio"] = metric_active_frames(all_frames)
    print(f"  [原5/6] active_ratio: {results['active_ratio']['level'].upper()} ({results['active_ratio'].get('ratio', 'N/A')}) score={results['active_ratio']['score']}")

    scene_id_det = None
    if args.ids:
        scene_id_det = args.ids.split(",")[0].strip()
    results["determinism"] = determinism_check(project_path, args.spec, scene_id_det, report_dir)
    print(f"  [原6/6] determinism: {results['determinism']['level'].upper()} score={results['determinism']['score']}")

    status = check_result_status(results)
    wt = calc_weighted_total(results)
    print(f"[qa] 加权总分: {wt:.1f}/100 | 总体: {status[1]}")
    write_report(report_dir, results, status, weighted_total=wt)
    sys.exit(0 if status[0] != "red" else 1)


if __name__ == "__main__":
    main()
