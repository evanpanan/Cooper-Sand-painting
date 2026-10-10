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

def parse_args():
    p = argparse.ArgumentParser(description="Sand Painting QA - Quality Assurance")
    p.add_argument("--project", type=str, default=None, help="Path to engine project directory")
    p.add_argument("--ids", type=str, default=None, help="Comma-separated scene IDs to render and QA")
    p.add_argument("--spec", type=str, default=None, help="Parameterized clip spec JSON file")
    p.add_argument("--determinism_only", action="store_true", help="Only run determinism check: same t twice, compare byte-level")
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

def metric_sand_recognition(frames, palette):
    if len(frames) == 0:
        return {"pass": False, "value": float("inf"), "detail": "No frames"}
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
    return {
        "pass": passed,
        "value": avg_diff,
        "threshold": 15.0,
        "detail": f"Avg RGB Euclidean diff of no-sand regions vs lightTable: {avg_diff:.2f} (threshold <15)",
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
        return {"pass": False, "value": 0, "detail": "No frames"}
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
    return {
        "pass": passed,
        "value": ratio,
        "threshold": 3.0,
        "detail": f"Grain particle count ratio (thick/thin) = {thick_count}/{thin_count} = {ratio:.2f} (threshold >=3)",
        "thick_count": thick_count,
        "thin_count": thin_count,
    }

def metric_scratch_recovery(frames, palette):
    if len(frames) < 2:
        return {"pass": False, "value": float("inf"), "detail": "Need >=2 frames"}
    Image, np = get_pil_np()
    light = np.array(palette["lightTable"], dtype=np.float64)
    light_rgb = palette["lightTable"]
    first = load_image(frames[0])
    last = load_image(frames[-1])
    diff = np.abs(first - last)
    changed_mask = np.mean(diff, axis=2) > 30
    if not np.any(changed_mask):
        return {"pass": True, "value": 0.0, "threshold": 15.0, "detail": "No scratch pixels detected (skipped)"}
    last_changed = last[changed_mask]
    if len(last_changed) == 0:
        return {"pass": True, "value": 0.0, "threshold": 15.0, "detail": "No scratch pixels"}
    distances = np.linalg.norm(last_changed - light, axis=1)
    avg_dist = float(np.mean(distances))
    passed = avg_dist < 15.0
    return {
        "pass": passed,
        "value": avg_dist,
        "threshold": 15.0,
        "detail": f"Scratch recovery avg RGB diff from lightTable: {avg_dist:.2f} (threshold <15)",
    }

def metric_motion_frame_diff(frames):
    if len(frames) < 2:
        return {"pass": True, "min": 0, "max": 0, "avg": 0, "flicker": False, "detail": "Need >=2 frames"}
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
        return {"pass": True, "min": 0, "max": 0, "avg": 0, "flicker": False, "detail": "No diffs"}
    d_min = min(diffs)
    d_max = max(diffs)
    d_avg = sum(diffs) / len(diffs)
    flicker = d_max > 10.0
    passed = not flicker
    return {
        "pass": passed,
        "min": d_min,
        "max": d_max,
        "avg": d_avg,
        "flicker": flicker,
        "threshold": 10.0,
        "detail": f"Frame diff %: min={d_min:.2f}%, max={d_max:.2f}%, avg={d_avg:.2f}% (flicker if max>10%)",
    }

def metric_active_frames(frames):
    if len(frames) < 2:
        return {"pass": False, "ratio": 0, "detail": "Need >=2 frames"}
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
    return {
        "pass": passed,
        "ratio": ratio,
        "count_active": active,
        "count_total": total,
        "target": "3.5-8% motion per frame",
        "detail": f"Active frames ratio: {active}/{total} = {ratio:.2%} (target 30-90% of frames in 3.5-8% motion range)",
        "histogram": motion_percents[:50],
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
        return {"pass": False, "detail": "Failed to produce rendered frames"}
    fa = generated_a[0]
    fb = generated_b[0]
    data_a = fa.read_bytes()
    data_b = fb.read_bytes()
    hash_a = hashlib.sha256(data_a).hexdigest()
    hash_b = hashlib.sha256(data_b).hexdigest()
    identical = (data_a == data_b)
    return {
        "pass": identical,
        "file_a": str(fa),
        "file_b": str(fb),
        "hash_a": hash_a,
        "hash_b": hash_b,
        "detail": f"Determinism check at t={t_val}s: {'IDENTICAL' if identical else 'DIFFERENT'} (sha256 A={hash_a[:12]}..., B={hash_b[:12]}...)",
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

def check_result_status(results):
    all_passed = all(r.get("pass", False) for r in results.values())
    any_fail = any(not r.get("pass", False) for r in results.values())
    if not any_fail:
        return "green", "🟢绿灯"
    fail_count = sum(1 for r in results.values() if not r.get("pass", False))
    if fail_count <= 1:
        return "yellow", "🟡黄灯"
    return "red", "🔴红灯"

def write_report(report_dir, results, status):
    report_dir.mkdir(parents=True, exist_ok=True)
    status_code, status_cn = status
    lines = []
    lines.append(f"# 沙画 QA 报告\n")
    lines.append(f"**总体状态**: {status_cn}\n")
    lines.append(f"**生成时间**: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    lines.append("## 检查项汇总\n")
    lines.append("| 检查项 | 结果 | 数值/说明 |")
    lines.append("|---|---|---|")
    names = {
        "sand_recognition": "沙画识别度",
        "grain_thickness": "颗粒粗细依赖",
        "scratch_recovery": "划痕恢复验证",
        "motion_diff": "运动帧差%",
        "active_ratio": "活跃帧比例",
        "determinism": "渲染确定性",
    }
    for key, r in results.items():
        name = names.get(key, key)
        ok = "✅通过" if r.get("pass") else "❌失败"
        detail = r.get("detail", str(r.get("value", "")))
        lines.append(f"| {name} | {ok} | {detail} |")
    lines.append("\n## 详细检查结果\n")
    for key, r in results.items():
        name = names.get(key, key)
        ok = "✅ 通过" if r.get("pass") else "❌ 失败"
        lines.append(f"### {name} - {ok}\n")
        lines.append(f"{r.get('detail', '')}\n")
        extra = {k: v for k, v in r.items() if k not in {"pass", "detail"}}
        if extra:
            lines.append("```json")
            lines.append(json.dumps(extra, ensure_ascii=False, indent=2))
            lines.append("```\n")
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
        write_report(report_dir, results, status)
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
            results = {"error": {"pass": False, "detail": f"Render failed: {e}"}}
            write_report(report_dir, results, ("red", "🔴红灯"))
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

    print(f"[qa] Extracted {len(all_frames)} frames, running metrics...")

    results = {}
    results["sand_recognition"] = metric_sand_recognition(all_frames, palette)
    print(f"  [1/5] sand_recognition: {results['sand_recognition']['pass']} ({results['sand_recognition'].get('value', 'N/A')})")

    results["grain_thickness"] = metric_grain_thickness(all_frames)
    print(f"  [2/5] grain_thickness: {results['grain_thickness']['pass']} ({results['grain_thickness'].get('value', 'N/A')})")

    results["scratch_recovery"] = metric_scratch_recovery(all_frames, palette)
    print(f"  [3/5] scratch_recovery: {results['scratch_recovery']['pass']} ({results['scratch_recovery'].get('value', 'N/A')})")

    results["motion_diff"] = metric_motion_frame_diff(all_frames)
    print(f"  [4/5] motion_diff: {results['motion_diff']['pass']} (max={results['motion_diff'].get('max', 'N/A')})")

    results["active_ratio"] = metric_active_frames(all_frames)
    print(f"  [5/5] active_ratio: {results['active_ratio']['pass']} ({results['active_ratio'].get('ratio', 'N/A')})")

    status = check_result_status(results)
    print(f"[qa] Overall: {status[1]}")
    write_report(report_dir, results, status)
    sys.exit(0 if status[0] != "red" else 1)

if __name__ == "__main__":
    main()
