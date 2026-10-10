#!/usr/bin/env python3
import argparse
import json
import os
import re
import sys
import subprocess
import math
import tempfile
from pathlib import Path

def parse_args():
    p = argparse.ArgumentParser(description="Sand Painting Reference Video Breakdown Analysis")
    p.add_argument("--video", type=str, required=True, help="Input video file path")
    p.add_argument("--out", type=str, required=True, help="Output directory for analysis files")
    return p.parse_args()

def run_cmd(cmd, check=True, capture=True, cwd=None):
    proc = subprocess.run(
        cmd,
        shell=False,
        capture_output=capture,
        text=True if capture else False,
        cwd=cwd,
    )
    if check and proc.returncode != 0:
        stderr_tail = (proc.stderr or "")[-2000:] if capture else ""
        raise RuntimeError(f"Command failed ({' '.join(map(str, cmd[:3]))}...):\n{stderr_tail}")
    return proc

def get_video_info(video_path):
    cmd = ["ffprobe", "-v", "error", "-print_format", "json",
           "-show_format", "-show_streams", str(video_path)]
    r = run_cmd(cmd, capture=True)
    return json.loads(r.stdout)

def frame_to_time(frame_idx, fps):
    sec = frame_idx / fps if fps else 0.0
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = sec % 60
    return f"{h:02d}:{m:02d}:{s:06.3f}"

def detect_scene_changes(video_path, out_dir, threshold=0.3):
    scenes_file = out_dir / "镜头切分.txt"
    csv_file = out_dir / "_scenes_raw.csv"
    cmd = [
        "ffmpeg", "-y", "-i", str(video_path),
        "-filter:v", f"select='gt(scene,{threshold})',showinfo",
        "-vsync", "0", "-f", "null", "-",
    ]
    r = run_cmd(cmd, check=False, capture=True)
    log = (r.stderr or "") + (r.stdout or "")
    pts_times = []
    for line in log.splitlines():
        m = re.search(r'pts_time:([0-9.]+)', line)
        if m:
            try:
                pts_times.append(float(m.group(1)))
            except ValueError:
                pass
        m2 = re.search(r'lavfi\.showinfo\.time="?([0-9:.]+)"?', line)
    pts_times = sorted(set(pts_times))
    if not pts_times:
        cmd2 = [
            "ffprobe", "-v", "error", "-of", "csv=p=0",
            "-f", "lavfi", "-i", f"movie='{str(video_path)}',select='gt(scene,{threshold})',showinfo",
        ]
        try:
            r2 = run_cmd(cmd2, capture=True, check=False)
            for line in (r2.stdout or "").splitlines():
                m = re.search(r'pts_time:([0-9.]+)', line)
                if m:
                    pts_times.append(float(m.group(1)))
        except Exception:
            pass
    pts_times = sorted(set(pts_times))
    info = get_video_info(video_path)
    duration = 0.0
    try:
        duration = float(info["format"]["duration"])
    except Exception:
        pass
    fps = 30.0
    for s in info.get("streams", []):
        if s.get("codec_type") == "video":
            rate = s.get("r_frame_rate") or s.get("avg_frame_rate") or "30/1"
            if "/" in rate:
                a, b = rate.split("/")
                try:
                    fps = float(a) / float(b) if float(b) != 0 else 30.0
                except ValueError:
                    fps = 30.0
            break
    cuts = [0.0] + pts_times + ([duration] if duration > 0 else [])
    cuts = sorted(set(c for c in cuts if (duration == 0 or c <= duration + 0.1)))
    lines = []
    lines.append("# 镜头切分报告")
    lines.append(f"# 源视频: {video_path}")
    lines.append(f"# 视频时长: {duration:.3f}s, FPS: {fps:.2f}")
    lines.append(f"# 镜头数: {len(cuts)-1}")
    lines.append("")
    lines.append(f"{'编号':<4} {'起始(s)':>10} {'结束(s)':>10} {'时长(s)':>10} {'起始TC':>12} {'结束TC':>12}")
    lines.append("-" * 70)
    for i in range(len(cuts) - 1):
        start = cuts[i]
        end = cuts[i + 1]
        dur = end - start
        lines.append(f"{i+1:<4} {start:>10.3f} {end:>10.3f} {dur:>10.3f} {frame_to_time(start, fps):>12} {frame_to_time(end, fps):>12}")
    scenes_file.write_text("\n".join(lines), encoding="utf-8")
    return cuts, fps, duration

def extract_all_frames(video_path, frames_dir, fps=1):
    frames_dir.mkdir(parents=True, exist_ok=True)
    pattern = str(frames_dir / "%06d.png")
    cmd = [
        "ffmpeg", "-y", "-i", str(video_path),
        "-vf", f"fps={fps}",
        pattern,
    ]
    run_cmd(cmd, capture=True)
    return sorted(frames_dir.glob("*.png"))

def extract_keyframes(video_path, key_dir):
    key_dir.mkdir(parents=True, exist_ok=True)
    pattern = str(key_dir / "%03d.jpg")
    cmd = [
        "ffmpeg", "-y", "-i", str(video_path),
        "-vf", "fps=1",
        "-q:v", "3",
        pattern,
    ]
    run_cmd(cmd, capture=True)
    return sorted(key_dir.glob("*.jpg"))

def load_image_pil(path):
    try:
        from PIL import Image
        import numpy as np
        img = Image.open(path).convert("RGB")
        return np.array(img), Image, np
    except ImportError:
        return None, None, None

def compute_histogram(img_arr, bins=32):
    import numpy as np
    h, w = img_arr.shape[:2]
    hist_r, _ = np.histogram(img_arr[:, :, 0].flatten(), bins=bins, range=(0, 256))
    hist_g, _ = np.histogram(img_arr[:, :, 1].flatten(), bins=bins, range=(0, 256))
    hist_b, _ = np.histogram(img_arr[:, :, 2].flatten(), bins=bins, range=(0, 256))
    hist = np.concatenate([hist_r, hist_g, hist_b]).astype(np.float64)
    s = hist.sum()
    if s > 0:
        hist = hist / s
    return hist

def hist_correlation(h1, h2):
    import numpy as np
    return float(np.corrcoef(h1, h2)[0, 1]) if (h1.std() > 0 and h2.std() > 0) else 0.0

def hist_chi_square(h1, h2):
    import numpy as np
    mask = (h1 + h2) > 0
    if not np.any(mask):
        return 0.0
    return float(np.sum((h1[mask] - h2[mask]) ** 2 / (h1[mask] + h2[mask])))

def classify_transition(hist_before, hist_after):
    import numpy as np
    corr = hist_correlation(hist_before, hist_after)
    chi = hist_chi_square(hist_before, hist_after)
    mean_change = float(np.mean(np.abs(hist_after - hist_before)))
    before_dark = float(np.sum(hist_before[:len(hist_before)//6]))
    after_dark = float(np.sum(hist_after[:len(hist_after)//6]))
    before_bright = float(np.sum(hist_before[-len(hist_before)//6:]))
    after_bright = float(np.sum(hist_after[-len(hist_after)//6:]))
    dark_ratio = (after_dark + 1e-6) / (before_dark + 1e-6)
    bright_ratio = (after_bright + 1e-6) / (before_bright + 1e-6)
    if corr < 0.2:
        if dark_ratio > 1.5 and bright_ratio < 0.7:
            return "pour", "撒沙切入"
        if dark_ratio < 0.6 and bright_ratio > 1.5:
            return "wipe", "手掌抹平"
        if mean_change > 0.01 and corr < 0.15:
            return "scatter", "沙粒飘散"
        return "hard-cut", "硬切"
    elif 0.2 <= corr < 0.6:
        if 0.7 < dark_ratio < 1.3 and 0.7 < bright_ratio < 1.3:
            return "flow", "沙粒流动"
        return "wipe", "手掌抹平"
    else:
        if mean_change > 0.003:
            return "flow", "沙粒流动"
        return "hard-cut", "硬切"

def analyze_transitions(video_path, cuts, out_dir, fps):
    transitions_file = out_dir / "转场类型.txt"
    frames_dir = out_dir / "_frames_trans"
    frames = extract_all_frames(video_path, frames_dir, fps=max(2, fps / 4))
    import numpy as np
    Image, np_ = load_image_pil(str(frames[0]))[:2] if frames else (None, None)
    if Image is None:
        try:
            from PIL import Image
            import numpy as np_
        except ImportError:
            transitions_file.write_text("# 转场类型分析 (Pillow/numpy 未安装，跳过)", encoding="utf-8")
            return []
    classifications = []
    lines = []
    lines.append("# 转场类型分析报告")
    lines.append("")
    lines.append(f"{'切分点#':<6} {'时间(s)':>10} {'转场类型':<12} {'说明':<16} {'中心帧x,y':<16}")
    lines.append("-" * 70)
    for ci in range(1, len(cuts)):
        cut_t = cuts[ci]
        idx_before = min(len(frames) - 1, max(0, int((cut_t - 0.2) * max(2, fps / 4))))
        idx_after = min(len(frames) - 1, max(0, int((cut_t + 0.2) * max(2, fps / 4))))
        p_before = frames[idx_before]
        p_after = frames[idx_after]
        img_b = None
        img_a = None
        try:
            img_b = np.array(Image.open(p_before).convert("RGB"), dtype=np.float64)
            img_a = np.array(Image.open(p_after).convert("RGB"), dtype=np.float64)
        except Exception:
            classifications.append(("hard-cut", "硬切", cut_t))
            continue
        h_b = compute_histogram(img_b)
        h_a = compute_histogram(img_a)
        t_type, t_desc = classify_transition(h_b, h_a)
        h, w = img_b.shape[:2]
        diff = np.mean(np.abs(img_a - img_b), axis=2)
        yy, xx = np.where(diff > 30)
        if len(xx) > 0:
            cx = int(np.mean(xx))
            cy = int(np.mean(yy))
        else:
            cx = w // 2
            cy = h // 2
        center_str = f"({cx}, {cy})"
        classifications.append((t_type, t_desc, cut_t, (cx, cy)))
        lines.append(f"{ci:<6} {cut_t:>10.3f} {t_type:<12} {t_desc:<16} {center_str:<16}")
    transitions_file.write_text("\n".join(lines), encoding="utf-8")
    return classifications

def analyze_beats(video_path, out_dir, default_bpm=100.0):
    beats_file = out_dir / "节拍网格.txt"
    audio_wav = out_dir / "_audio_mono.wav"
    cmd = [
        "ffmpeg", "-y", "-i", str(video_path),
        "-vn", "-ac", "1", "-ar", "44100",
        str(audio_wav),
    ]
    run_cmd(cmd, capture=True, check=False)
    info = get_video_info(video_path)
    duration = 0.0
    try:
        duration = float(info["format"]["duration"])
    except Exception:
        pass
    has_audio = audio_wav.exists() and audio_wav.stat().st_size > 1024
    bpm = default_bpm
    beats = []
    if has_audio:
        try:
            import wave
            import numpy as np
            with wave.open(str(audio_wav), 'rb') as wf:
                rate = wf.getframerate()
                n = wf.getnframes()
                raw = wf.readframes(n)
                channels = wf.getnchannels()
                sampwidth = wf.getsampwidth()
            if sampwidth == 2:
                audio = np.frombuffer(raw, dtype=np.int16).astype(np.float64)
            else:
                audio = np.frombuffer(raw, dtype=np.uint8).astype(np.float64)
            if channels > 1:
                audio = audio.reshape(-1, channels).mean(axis=1)
            audio = audio / max(1.0, np.max(np.abs(audio)) + 1e-9)
            win = int(rate * 0.05)
            hop = int(rate * 0.02)
            energy = []
            t_axis = []
            for i in range(0, len(audio) - win, hop):
                frame = audio[i:i + win]
                energy.append(float(np.sqrt(np.mean(frame ** 2))))
                t_axis.append(i / rate)
            if not energy:
                raise ValueError("no frames")
            e_arr = np.array(energy)
            if e_arr.std() > 0:
                e_arr = (e_arr - e_arr.mean()) / (e_arr.std() + 1e-9)
            smooth = np.convolve(e_arr, np.ones(5) / 5, mode="same")
            onsets = []
            for i in range(1, len(smooth) - 1):
                if smooth[i] > smooth[i - 1] and smooth[i] > smooth[i + 1] and smooth[i] > 0.3:
                    onsets.append(t_axis[i])
            if len(onsets) >= 2:
                intervals = np.diff(onsets)
                intervals = intervals[(intervals > 0.2) & (intervals < 2.0)]
                if len(intervals) > 0:
                    median_int = float(np.median(intervals))
                    bpm = 60.0 / max(0.1, median_int)
                    bpm = max(40, min(240, bpm))
            beats = onsets[:]
        except Exception as e:
            print(f"[breakdown] Warning: audio beat analysis failed, using default BPM {default_bpm}: {e}", file=sys.stderr)
    if not beats:
        beat_interval = 60.0 / bpm
        t = 0
        while t <= duration + beat_interval:
            beats.append(t)
            t += beat_interval
    cuts_aligned = []
    for b_t in beats:
        cuts_aligned.append(b_t)
    lines = []
    lines.append("# 节拍网格报告")
    lines.append(f"# 视频时长: {duration:.2f}s")
    lines.append(f"# 检测/默认 BPM: {bpm:.1f}")
    lines.append(f"# 节拍点数量: {len(beats)}")
    lines.append("")
    lines.append("## 节拍点 (秒)")
    lines.append(", ".join(f"{b:.3f}" for b in beats[:200]))
    if len(beats) > 200:
        lines.append(f"... (共 {len(beats)} 个，前 200 显示)")
    lines.append("")
    lines.append("## 推荐卡节拍切分点")
    lines.append(", ".join(f"{c:.3f}" for c in cuts_aligned[:200]))
    beats_file.write_text("\n".join(lines), encoding="utf-8")
    return beats, bpm

def extract_palette_per_shot(video_path, cuts, out_dir):
    palette_png = out_dir / "色板提取.png"
    shots_dir = out_dir / "_shot_palette"
    shots_dir.mkdir(parents=True, exist_ok=True)
    import numpy as np
    try:
        from PIL import Image
    except ImportError:
        palette_png.write_bytes(b"")
        return []
    palettes = []
    for i in range(len(cuts) - 1):
        start = cuts[i]
        end = cuts[i + 1]
        mid_t = (start + end) / 2
        shot_frame = shots_dir / f"shot_{i+1:03d}.png"
        cmd = [
            "ffmpeg", "-y", "-ss", f"{mid_t:.3f}", "-i", str(video_path),
            "-vframes", "1", "-s", "256x144", str(shot_frame),
        ]
        run_cmd(cmd, capture=True, check=False)
        if not shot_frame.exists():
            palettes.append([])
            continue
        try:
            img = np.array(Image.open(shot_frame).convert("RGB"), dtype=np.float64)
        except Exception:
            palettes.append([])
            continue
        h, w = img.shape[:2]
        pixels = img.reshape(-1, 3)
        try:
            from sklearn.cluster import MiniBatchKMeans
            n_colors = min(5, max(2, len(pixels) // 200))
            km = MiniBatchKMeans(n_clusters=n_colors, n_init=3, max_iter=50, random_state=0)
            km.fit(pixels)
            colors = km.cluster_centers_.astype(int)
            counts = np.bincount(km.labels_, minlength=n_colors)
            order = np.argsort(-counts)
            colors_sorted = colors[order].tolist()
        except ImportError:
            try:
                quantized = (pixels // 32 * 32).astype(int)
                unique, counts = np.unique(quantized, axis=0, return_counts=True)
                top = np.argsort(-counts)[:5]
                colors_sorted = unique[top].tolist()
            except Exception:
                flat_idx = np.linspace(0, len(pixels) - 1, 5).astype(int)
                colors_sorted = pixels[flat_idx].astype(int).tolist()
        palettes.append(colors_sorted)
    n_shots = len(palettes)
    if n_shots == 0:
        palette_png.write_bytes(b"")
        return palettes
    cell_w = 120
    cell_h = 60
    padding = 20
    top_info = 60
    max_cols = 5
    rows = int(math.ceil(n_shots / max_cols))
    cols = min(max_cols, n_shots)
    img_w = cols * cell_w + (cols + 1) * padding
    img_h = top_info + rows * (cell_h + 30) + padding
    canvas = np.full((img_h, img_w, 3), 255, dtype=np.uint8)
    try:
        from PIL import ImageDraw, ImageFont
        pil_img = Image.fromarray(canvas)
        draw = ImageDraw.Draw(pil_img)
        try:
            font = ImageFont.truetype("/System/Library/Fonts/PingFang.ttc", 18)
            font_sm = ImageFont.truetype("/System/Library/Fonts/PingFang.ttc", 12)
        except Exception:
            font = ImageFont.load_default()
            font_sm = font
        draw.text((padding, 15), "沙画色板提取 / Color Palette per Shot", fill=(60, 60, 60), font=font)
        for i, shot_colors in enumerate(palettes):
            r = i // max_cols
            c = i % max_cols
            x0 = padding + c * (cell_w + padding)
            y0 = top_info + padding + r * (cell_h + 30)
            n_colors = len(shot_colors) or 1
            per_w = cell_w // n_colors
            draw.text((x0, y0 - 15), f"Shot {i+1}", fill=(40, 40, 40), font=font_sm)
            for ci, col in enumerate(shot_colors[:n_colors]):
                cr = max(0, min(255, int(col[0])))
                cg = max(0, min(255, int(col[1])))
                cb = max(0, min(255, int(col[2])))
                bx0 = x0 + ci * per_w
                draw.rectangle([bx0, y0, bx0 + per_w, y0 + cell_h], fill=(cr, cg, cb))
        pil_img.save(str(palette_png))
    except Exception as e:
        try:
            Image.fromarray(canvas).save(str(palette_png))
        except Exception:
            pass
    return palettes

def compute_motion_heatmaps(video_path, cuts, out_dir):
    heatmap_dir = out_dir / "heatmaps"
    heatmap_dir.mkdir(parents=True, exist_ok=True)
    frames_dir = out_dir / "_frames_heat"
    info = get_video_info(video_path)
    fps = 30.0
    for s in info.get("streams", []):
        if s.get("codec_type") == "video":
            rate = s.get("r_frame_rate") or "30/1"
            if "/" in rate:
                a, b = rate.split("/")
                try:
                    fps = float(a) / float(b) if float(b) else 30.0
                except ValueError:
                    pass
            break
    extract_fps = min(8, max(2, fps / 4))
    frames = extract_all_frames(video_path, frames_dir, fps=extract_fps)
    import numpy as np
    try:
        from PIL import Image
    except ImportError:
        return []
    heatmap_paths = []
    for i in range(len(cuts) - 1):
        start = cuts[i]
        end = cuts[i + 1]
        i0 = max(0, min(len(frames) - 1, int(start * extract_fps)))
        i1 = max(0, min(len(frames) - 1, int(end * extract_fps)))
        if i1 - i0 < 2:
            i1 = min(len(frames) - 1, i0 + 2)
        prev_img = None
        cum_diff = None
        for fi in range(i0, i1 + 1):
            p = frames[fi]
            try:
                img = np.array(Image.open(p).convert("RGB").resize((320, 180)), dtype=np.float64)
            except Exception:
                continue
            if prev_img is None:
                prev_img = img
                continue
            diff = np.mean(np.abs(img - prev_img), axis=2)
            if cum_diff is None:
                cum_diff = diff
            else:
                cum_diff = np.maximum(cum_diff, diff)
            prev_img = img
        out_path = heatmap_dir / f"heatmap_shot_{i+1:03d}.png"
        if cum_diff is None:
            try:
                Image.new("L", (320, 180), 0).save(str(out_path))
            except Exception:
                pass
            heatmap_paths.append(out_path)
            continue
        try:
            norm = cum_diff.copy()
            mx = float(norm.max())
            if mx > 0:
                norm = norm / mx * 255.0
            norm = norm.astype(np.uint8)
            hmap_img = Image.fromarray(norm, mode="L")
            hmap_img = hmap_img.resize((640, 360))
            hm_rgb = np.zeros((360, 640, 3), dtype=np.uint8)
            arr = np.array(hmap_img).astype(np.float64) / 255.0
            hm_rgb[:, :, 0] = (np.clip(arr * 3.0 - 0.5, 0, 1) * 255).astype(np.uint8)
            hm_rgb[:, :, 1] = (np.clip(np.sin(arr * 3.14159), 0, 1) * 255).astype(np.uint8)
            hm_rgb[:, :, 2] = (np.clip(1.0 - arr * 2.0, 0, 1) * 255).astype(np.uint8)
            Image.fromarray(hm_rgb, mode="RGB").save(str(out_path))
        except Exception as e:
            try:
                Image.fromarray(norm, mode="L").save(str(out_path))
            except Exception:
                pass
        heatmap_paths.append(out_path)
    return heatmap_paths

def main():
    args = parse_args()
    video_path = Path(args.video).resolve()
    if not video_path.exists():
        print(f"[breakdown] ERROR: video not found: {video_path}", file=sys.stderr)
        sys.exit(2)
    out_dir = Path(args.out).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"[breakdown] Input:  {video_path}")
    print(f"[breakdown] Output: {out_dir}")

    try:
        run_cmd(["ffmpeg", "-version"], capture=True)
    except Exception:
        print("[breakdown] ERROR: ffmpeg not available on PATH", file=sys.stderr)
        sys.exit(2)

    print("[1/6] 镜头切分 Scene detection")
    cuts, fps, duration = detect_scene_changes(video_path, out_dir)
    print(f"      -> {len(cuts)-1} shots detected, {duration:.2f}s total")

    print("[2/6] 转场类型 Transition classification")
    transitions = analyze_transitions(video_path, cuts, out_dir, fps)
    print(f"      -> {len(transitions)} transitions classified")

    print("[3/6] 节拍网格 Beat grid")
    beats, bpm = analyze_beats(video_path, out_dir)
    print(f"      -> BPM={bpm:.1f}, {len(beats)} beat points")

    print("[4/6] 色板提取 Palette extraction")
    palettes = extract_palette_per_shot(video_path, cuts, out_dir)
    print(f"      -> {len(palettes)} shot palettes extracted")

    print("[5/6] 运动热图 Motion heatmaps")
    heatmaps = compute_motion_heatmaps(video_path, cuts, out_dir)
    print(f"      -> {len(heatmaps)} heatmaps generated")

    print("[6/6] 关键帧 Keyframes (1 per second)")
    key_dir = out_dir / "关键帧"
    keys = extract_keyframes(video_path, key_dir)
    print(f"      -> {len(keys)} keyframes in 关键帧/")

    summary = out_dir / "breakdown_summary.json"
    summary.write_text(json.dumps({
        "video": str(video_path),
        "duration": duration,
        "fps": fps,
        "shots": [
            {
                "index": i + 1,
                "start": cuts[i],
                "end": cuts[i + 1],
                "duration": cuts[i + 1] - cuts[i],
                "transition_type": transitions[i][0] if i < len(transitions) else None,
                "transition_desc": transitions[i][1] if i < len(transitions) else None,
                "transition_center": list(transitions[i][3]) if i < len(transitions) and len(transitions[i]) > 3 else None,
                "palette": palettes[i] if i < len(palettes) else [],
                "heatmap": f"heatmaps/heatmap_shot_{i+1:03d}.png",
            }
            for i in range(len(cuts) - 1)
        ],
        "beat_bpm": bpm,
        "beat_points_count": len(beats),
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    print("=" * 72)
    print(f"[breakdown] 完成 ✓")
    print(f"  - 镜头切分.txt       ({len(cuts)-1} shots)")
    print(f"  - 转场类型.txt       ({len(transitions)} transitions)")
    print(f"  - 节拍网格.txt       (BPM={bpm:.1f})")
    print(f"  - 色板提取.png       (per-shot palettes)")
    print(f"  - heatmaps/          ({len(heatmaps)} heatmaps)")
    print(f"  - 关键帧/            ({len(keys)} keyframes)")
    print(f"  - breakdown_summary.json")
    print("=" * 72)

if __name__ == "__main__":
    main()
