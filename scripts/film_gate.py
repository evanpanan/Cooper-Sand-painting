#!/usr/bin/env python3
"""
film_gate.py - 沙画视频质量门禁分析（6 道门禁）

六大门禁:
  1. motion_fast          - 快速运动帧比例 (< 3.5% 绿 / < 6% 黄 / 否则 红)
  2. empty_segment        - 中段无 >0.3s 空画面 (无空画面 绿 / 否则 红)
  3. blue_purple          - 蓝紫底色帧占比 (<=30% 绿 / 否则 红或豁免黄)
  4. hard_cut             - 硬切数 (=0 绿 / >0 红，零硬切铁律 P12)
  5. tone_cool_warm       - 冷调占比 / 暖调占比 (按 theme，C%>70 绿或 W%>70 绿，否则 黄或豁免)
  6. progressive_ratio    - 渐进时间比 scene/morph ∈ [0.25,0.35] (绿/否则 红 P13)
"""
import subprocess
import tempfile
import shutil
import json
import math
import sys
import os
import re
from pathlib import Path
from collections import deque

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False


def _ensure_numpy():
    """Ensure numpy is available, raise ImportError otherwise."""
    if not HAS_NUMPY:
        raise ImportError("numpy is required. Run: pip install numpy")


def _run_cmd(cmd, check=True, capture_output=True):
    """Run a subprocess command with error checking."""
    result = subprocess.run(cmd, capture_output=capture_output, text=True)
    if check and result.returncode != 0:
        stderr_tail = (result.stderr or "")[-2000:]
        raise RuntimeError(f"Command failed ({result.returncode}): {' '.join(cmd[:3])}...\n{stderr_tail}")
    return result


def _ffprobe_video_info(video_path):
    """
    Probe video metadata (width, height, duration, fps, frame count) via ffprobe.
    Returns dict with keys: width, height, duration, fps, nb_frames.
    """
    cmd = [
        "ffprobe", "-v", "error",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        "-select_streams", "v:0",
        str(video_path),
    ]
    result = _run_cmd(cmd)
    info = json.loads(result.stdout or "{}")
    streams = info.get("streams", [])
    fmt = info.get("format", {})
    if not streams:
        raise RuntimeError(f"No video stream found in {video_path}")
    s = streams[0]
    width = int(s.get("width", 0))
    height = int(s.get("height", 0))
    duration = float(fmt.get("duration", s.get("duration", 0)) or 0)
    fps_str = s.get("r_frame_rate", s.get("avg_frame_rate", "30/1"))
    if "/" in fps_str:
        num, den = fps_str.split("/", 1)
        try:
            fps = float(num) / max(1, float(den))
        except ValueError:
            fps = 30.0
    else:
        try:
            fps = float(fps_str)
        except ValueError:
            fps = 30.0
    return {
        "width": width,
        "height": height,
        "duration": duration,
        "fps": fps,
        "nb_frames": int(s.get("nb_frames", 0) or max(1, int(duration * fps))),
    }


def _extract_raw_frames(video_path, out_dir, scale_w=160, scale_h=90, fps=None, vframes=None):
    """
    Use ffmpeg to extract low-resolution RGB24 raw frames.
    Returns (frames_data, timestamps, scale_w, scale_h, eff_fps).
    frames_data is a list of np.uint8 (H, W, 3) arrays.
    """
    _ensure_numpy()
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    vf_parts = []
    if fps is not None:
        vf_parts.append(f"fps={fps}")
    vf_parts.append(f"scale={scale_w}:{scale_h}:flags=bilinear")
    vf_str = ",".join(vf_parts)

    cmd = [
        "ffmpeg", "-y", "-i", str(video_path),
        "-vf", vf_str,
        "-pix_fmt", "rgb24",
        "-f", "rawvideo",
    ]
    if vframes is not None:
        cmd += ["-vframes", str(vframes)]
    tmp_out = str(out_dir / "frames.raw")
    cmd += [tmp_out]
    _run_cmd(cmd)

    info = _ffprobe_video_info(video_path)
    eff_fps = fps if fps is not None else info["fps"]
    frame_size = scale_w * scale_h * 3

    raw_path = Path(tmp_out)
    if not raw_path.exists():
        return [], [], scale_w, scale_h, eff_fps

    file_size = raw_path.stat().st_size
    num_frames = file_size // frame_size
    if num_frames <= 0:
        return [], [], scale_w, scale_h, eff_fps

    frames_data = []
    timestamps = []
    with open(raw_path, "rb") as f:
        for i in range(num_frames):
            buf = f.read(frame_size)
            if len(buf) < frame_size:
                break
            arr = np.frombuffer(buf, dtype=np.uint8).reshape((scale_h, scale_w, 3))
            frames_data.append(arr)
            timestamps.append(i / eff_fps)
    try:
        raw_path.unlink()
    except Exception:
        pass
    return frames_data, timestamps, scale_w, scale_h, eff_fps


def _rgb_to_luma(rgb_frame):
    """Convert RGB uint8 frame to luma (float32) using Rec. 601 coefficients."""
    _ensure_numpy()
    r = rgb_frame[:, :, 0].astype(np.float32)
    g = rgb_frame[:, :, 1].astype(np.float32)
    b = rgb_frame[:, :, 2].astype(np.float32)
    return 0.299 * r + 0.587 * g + 0.114 * b


def _rgb_to_hsv(rgb_frame):
    """Convert an RGB uint8 frame to HSV (H in [0,1], S in [0,1], V in [0,1])."""
    _ensure_numpy()
    rgb = rgb_frame.astype(np.float32) / 255.0
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    maxc = np.max(rgb, axis=2)
    minc = np.min(rgb, axis=2)
    v = maxc
    delt = maxc - minc
    s = np.where(maxc == 0, 0.0, delt / np.maximum(maxc, 1e-8))
    h = np.zeros_like(maxc)
    mask_r = (maxc == r) & (delt > 0)
    h[mask_r] = ((g[mask_r] - b[mask_r]) / delt[mask_r]) % 6
    mask_g = (maxc == g) & (delt > 0)
    h[mask_g] = (b[mask_g] - r[mask_g]) / delt[mask_g] + 2
    mask_b = (maxc == b) & (delt > 0)
    h[mask_b] = (r[mask_b] - g[mask_b]) / delt[mask_b] + 4
    h = h / 6.0
    h[h < 0] += 1.0
    return h, s, v


def _sobel_edge_count(luma_frame, threshold=30):
    """Approximate Sobel edge count for a luma frame (pixels with magnitude > threshold)."""
    _ensure_numpy()
    h, w = luma_frame.shape
    gx = np.zeros_like(luma_frame)
    gy = np.zeros_like(luma_frame)
    gx[:, 1:-1] = luma_frame[:, 2:] - luma_frame[:, :-2]
    gy[1:-1, :] = luma_frame[2:, :] - luma_frame[:-2, :]
    mag = np.sqrt(gx * gx + gy * gy)
    return int(np.sum(mag > threshold))


def measure_motion_ratio(video_path):
    """
    分析视频的运动特征（门禁1）。

    使用 ffmpeg 以低分辨率提取帧，计算相邻帧变化百分比。
    "快速"定义: 帧间变化像素 > 18% 或 帧间变化梯度 > 8%。

    Returns dict with fast_motion_ratio, worst_30s_{start,end}, per_frame stats.
    """
    _ensure_numpy()
    video_path = Path(video_path)
    if not video_path.exists():
        raise FileNotFoundError(f"Video not found: {video_path}")

    info = _ffprobe_video_info(video_path)
    analysis_fps = 10
    with tempfile.TemporaryDirectory(prefix="mg_motion_") as tmpd:
        frames, timestamps, sw, sh, eff_fps = _extract_raw_frames(
            video_path, tmpd, scale_w=160, scale_h=90, fps=analysis_fps
        )
        n = len(frames)
        if n < 2:
            return {
                "fast_motion_ratio": 0.0,
                "worst_30s_start": 0.0,
                "worst_30s_end": min(30.0, info["duration"]),
                "per_frame_changed_pct": [],
                "per_frame_timestamps": [],
                "fast_flags": [],
                "avg_motion_pct": 0.0,
                "max_motion_pct": 0.0,
            }

        total_pix = sw * sh
        changed_pcts = []
        ts_mid = []
        prev_luma = _rgb_to_luma(frames[0])
        for i in range(1, n):
            curr_luma = _rgb_to_luma(frames[i])
            diff = np.abs(curr_luma - prev_luma)
            changed = np.sum(diff > 18)
            pct = changed / total_pix * 100.0
            changed_pcts.append(float(pct))
            ts_mid.append((timestamps[i - 1] + timestamps[i]) / 2.0)
            prev_luma = curr_luma

        fast_flags = [False] * len(changed_pcts)
        for i in range(len(changed_pcts)):
            pct = changed_pcts[i]
            grad = 0.0
            if i > 0:
                grad = abs(changed_pcts[i] - changed_pcts[i - 1])
            if pct > 18.0 or grad > 8.0:
                fast_flags[i] = True

        fast_count = sum(1 for f in fast_flags if f)
        ratio = fast_count / max(1, len(fast_flags))

        window_sec = 30.0
        window_frames = max(1, int(window_sec * eff_fps))
        best_sum = -1.0
        best_start_idx = 0
        best_end_idx = min(len(changed_pcts), window_frames)

        cur_sum = 0.0
        cur_len = min(window_frames, len(changed_pcts))
        for i in range(cur_len):
            cur_sum += changed_pcts[i]
        best_sum = cur_sum
        best_start_idx = 0
        best_end_idx = cur_len

        for start in range(1, len(changed_pcts)):
            end = start + window_frames
            if end > len(changed_pcts):
                break
            cur_sum = cur_sum - changed_pcts[start - 1] + changed_pcts[end - 1]
            if cur_sum > best_sum:
                best_sum = cur_sum
                best_start_idx = start
                best_end_idx = end

        worst_start = ts_mid[best_start_idx] if ts_mid else 0.0
        worst_end = ts_mid[best_end_idx - 1] if (best_end_idx - 1) < len(ts_mid) else (worst_start + window_sec)
        if worst_end <= worst_start:
            worst_end = worst_start + window_sec

        return {
            "fast_motion_ratio": float(ratio),
            "worst_30s_start": float(worst_start),
            "worst_30s_end": float(worst_end),
            "per_frame_changed_pct": changed_pcts,
            "per_frame_timestamps": ts_mid,
            "fast_flags": fast_flags,
            "avg_motion_pct": float(sum(changed_pcts) / max(1, len(changed_pcts))),
            "max_motion_pct": float(max(changed_pcts) if changed_pcts else 0.0),
            "sample_fps": float(eff_fps),
            "total_duration_sec": float(info["duration"]),
        }


def detect_empty_segments(video_path):
    """
    检测空画面片段（门禁2）。

    连续 > 0.3s 的画面满足：亮度 std < 4.0 且 Sobel 边缘数 < 2000。
    仅返回中段 (duration 20% ~ 80%) 的空段。

    Returns [[start_sec, end_sec], ...]
    """
    _ensure_numpy()
    video_path = Path(video_path)
    if not video_path.exists():
        raise FileNotFoundError(f"Video not found: {video_path}")

    info = _ffprobe_video_info(video_path)
    analysis_fps = 15
    min_empty_sec = 0.3

    with tempfile.TemporaryDirectory(prefix="mg_empty_") as tmpd:
        frames, timestamps, sw, sh, eff_fps = _extract_raw_frames(
            video_path, tmpd, scale_w=240, scale_h=135, fps=analysis_fps
        )
        n = len(frames)
        if n == 0:
            return []

        empty_flags = []
        for i in range(n):
            luma = _rgb_to_luma(frames[i])
            luma_std = float(np.std(luma))
            edge_cnt = _sobel_edge_count(luma, threshold=20)
            is_empty = (luma_std < 4.0) and (edge_cnt < 2000)
            empty_flags.append(is_empty)

        segments = []
        run_start = None
        for i, flag in enumerate(empty_flags):
            if flag and run_start is None:
                run_start = i
            elif (not flag) and run_start is not None:
                start_t = timestamps[run_start]
                end_t = timestamps[i - 1] + (1.0 / eff_fps if (i - 1) < len(timestamps) - 1 else 0)
                if (end_t - start_t) > min_empty_sec:
                    segments.append([float(start_t), float(end_t)])
                run_start = None
        if run_start is not None:
            start_t = timestamps[run_start]
            end_t = timestamps[-1] + (1.0 / eff_fps)
            if (end_t - start_t) > min_empty_sec:
                segments.append([float(start_t), float(end_t)])

        if info["duration"] > 1.0 and len(segments) > 0:
            total_dur = info["duration"]
            mid_lo = total_dur * 0.2
            mid_hi = total_dur * 0.8
            mid_segments = []
            for seg in segments:
                s, e = seg
                seg_center = (s + e) * 0.5
                if mid_lo <= seg_center <= mid_hi:
                    mid_segments.append(seg)
            if mid_segments:
                return mid_segments
            return []
        return []


def measure_blue_purple_ratio(video_path):
    """
    测量蓝/紫底色帧比例（门禁3）。

    以 4 fps 采样，判断主导色相位于 H ∈ [200°, 320°] 且饱和度 > 25%。
    Returns dict with ratio, counts, per-frame HSV means.
    """
    _ensure_numpy()
    video_path = Path(video_path)
    if not video_path.exists():
        raise FileNotFoundError(f"Video not found: {video_path}")

    sample_fps = 4

    with tempfile.TemporaryDirectory(prefix="mg_bp_") as tmpd:
        frames, timestamps, sw, sh, eff_fps = _extract_raw_frames(
            video_path, tmpd, scale_w=80, scale_h=45, fps=sample_fps
        )
        n = len(frames)
        if n == 0:
            return {
                "ratio": 0.0,
                "total_sampled": 0,
                "flagged_frames": 0,
                "per_frame_hsv_mean": [],
                "flagged_indices": [],
            }

        per_frame_hsv = []
        flagged_indices = []
        for i in range(n):
            h, s, v = _rgb_to_hsv(frames[i])
            h_deg_mean = float(np.mean(h)) * 360.0
            sat_mean = float(np.mean(s)) * 100.0
            val_mean = float(np.mean(v)) * 100.0
            per_frame_hsv.append((h_deg_mean, sat_mean, val_mean))
            in_hue = (200.0 <= h_deg_mean <= 320.0)
            in_sat = sat_mean > 25.0
            if in_hue and in_sat:
                flagged_indices.append(i)

        ratio = len(flagged_indices) / max(1, n)
        return {
            "ratio": float(ratio),
            "total_sampled": int(n),
            "flagged_frames": int(len(flagged_indices)),
            "per_frame_hsv_mean": per_frame_hsv,
            "flagged_indices": flagged_indices,
            "sample_fps": float(eff_fps),
        }


def detect_hard_cuts(video_path):
    """
    检测硬切次数与时间码（门禁4 · P12 零硬切铁律）。

    算法: 遍历帧计算相邻帧 MAD，如果瞬时 MAD>25 且前后 3 帧该位置是峰值，记为 1 次硬切。
    Returns dict: { count, timestamps_sec, per_frame_mad, peak_flags }
    """
    _ensure_numpy()
    video_path = Path(video_path)
    if not video_path.exists():
        raise FileNotFoundError(f"Video not found: {video_path}")

    info = _ffprobe_video_info(video_path)
    analysis_fps = 10

    with tempfile.TemporaryDirectory(prefix="mg_hc_") as tmpd:
        frames, timestamps, sw, sh, eff_fps = _extract_raw_frames(
            video_path, tmpd, scale_w=160, scale_h=90, fps=analysis_fps
        )
        n = len(frames)
        if n < 7:
            return {
                "count": 0,
                "timestamps_sec": [],
                "per_frame_mad": [],
                "peak_flags": [],
            }

        prev = frames[0].astype(np.float32)
        mads = []
        for i in range(1, n):
            curr = frames[i].astype(np.float32)
            diff = np.abs(curr - prev)
            mad = float(np.mean(diff))
            mads.append(mad)
            prev = curr

        peak_flags = [False] * len(mads)
        for i in range(len(mads)):
            if mads[i] > 25.0:
                lo = max(0, i - 3)
                hi = min(len(mads), i + 4)
                window = mads[lo:hi]
                if window and mads[i] == max(window):
                    peak_flags[i] = True

        timestamps_sec = []
        for idx, flag in enumerate(peak_flags):
            if flag:
                ts = (idx + 1) / eff_fps
                timestamps_sec.append(round(ts, 2))

        return {
            "count": len(timestamps_sec),
            "timestamps_sec": timestamps_sec,
            "per_frame_mad": mads,
            "peak_flags": peak_flags,
            "analysis_fps": float(eff_fps),
            "max_mad": float(max(mads) if mads else 0.0),
            "avg_mad": float(sum(mads) / max(1, len(mads))),
        }


def measure_tone_cw_ratio(video_path, theme="realistic_cool"):
    """
    测量冷/中/暖像素占比（门禁5 · P11 沙画识别核心）。

    冷像素: B > R + 18 且 G > R + 10
    暖像素: R > B + 18 且 R > G + 8
    否则为中像素。
    theme=realistic_cool: C%>70 绿，否则黄
    theme=classic_warm: 反过来 W%>70 绿

    Returns dict: { C_pct, M_pct, W_pct, pass_level, detail }
    """
    _ensure_numpy()
    video_path = Path(video_path)
    if not video_path.exists():
        raise FileNotFoundError(f"Video not found: {video_path}")

    sample_fps = 3

    with tempfile.TemporaryDirectory(prefix="mg_cw_") as tmpd:
        frames, timestamps, sw, sh, eff_fps = _extract_raw_frames(
            video_path, tmpd, scale_w=120, scale_h=68, fps=sample_fps
        )
        n = len(frames)
        if n == 0:
            return {
                "C_pct": 0.0,
                "M_pct": 0.0,
                "W_pct": 0.0,
                "theme": theme,
                "total_pixels": 0,
                "sampled_frames": 0,
            }

        cold_total = 0
        warm_total = 0
        mid_total = 0
        total_pixels = 0

        for f in frames:
            arr = f.astype(np.int16)
            R = arr[:, :, 0]
            G = arr[:, :, 1]
            B = arr[:, :, 2]
            cold_mask = (B > R + 18) & (G > R + 10)
            warm_mask = (R > B + 18) & (R > G + 8)
            mid_mask = ~(cold_mask | warm_mask)
            cold_total += int(np.sum(cold_mask))
            warm_total += int(np.sum(warm_mask))
            mid_total += int(np.sum(mid_mask))
            total_pixels += cold_mask.size

        if total_pixels == 0:
            return {
                "C_pct": 0.0,
                "M_pct": 0.0,
                "W_pct": 0.0,
                "theme": theme,
                "total_pixels": 0,
                "sampled_frames": n,
            }

        c_pct = round(cold_total / total_pixels * 100, 2)
        w_pct = round(warm_total / total_pixels * 100, 2)
        m_pct = round(mid_total / total_pixels * 100, 2)

        return {
            "C_pct": c_pct,
            "M_pct": m_pct,
            "W_pct": w_pct,
            "theme": theme,
            "total_pixels": total_pixels,
            "sampled_frames": n,
        }


def parse_schedule_js(schedule_path):
    """
    简易 JS eval：读 schedule.js，用 node 子进程取 USER_SCHEDULE 返回数组（门禁6 用）。
    失败返回 None。
    """
    if not schedule_path:
        return None
    p = Path(schedule_path)
    if not p.exists():
        return None
    try:
        text = p.read_text(encoding="utf-8")
    except Exception:
        return None
    try:
        m = re.search(r'window\.(USER_SCHEDULE|PROGRESSIVE_DEMO)\s*=\s*function\s*\(\s*\)\s*\{([\s\S]*?)\};?\s*$', text)
        if m:
            body = m.group(2).strip()
            node_code = f"process.stdout.write(JSON.stringify((function(){{{body}}})()));"
            result = subprocess.run(
                ["node", "-e", node_code],
                capture_output=True, text=True, timeout=10
            )
            if result.returncode == 0 and result.stdout.strip():
                return json.loads(result.stdout.strip())
        arr_m = re.search(r'return\s*(\[[\s\S]*?\])\s*;', text)
        if arr_m:
            arr_text = arr_m.group(1)
            arr_text = re.sub(r'//.*$', '', arr_text, flags=re.MULTILINE)
            arr_text = re.sub(r"'", '"', arr_text)
            return json.loads(arr_text)
    except Exception:
        return None
    return None


def measure_progressive_ratio(schedule_path):
    """
    测量渐进时间比（门禁6 · P13 作画:渐进=0.3:1 铁律）。

    scene 总长 / morph 总长 → ratio。
    理想 [0.25, 0.35]；warn [0.2, 0.45]；否则 fail。
    无 schedule 返回 na=True。
    """
    sched = parse_schedule_js(schedule_path)
    if sched is None:
        return {
            "na": True,
            "ratio": None,
            "scene_total": 0.0,
            "morph_total": 0.0,
            "seg_count": 0,
        }
    scene_total = 0.0
    morph_total = 0.0
    seg_count = 0
    for seg in sched:
        if not isinstance(seg, dict):
            continue
        if "scene" in seg:
            scene_total += float(seg.get("duration", 0))
            seg_count += 1
        elif "morph" in seg:
            morph_total += float(seg["morph"].get("duration", 0))
            seg_count += 1
    if seg_count <= 1 or morph_total <= 0:
        return {
            "na": True,
            "ratio": None,
            "scene_total": round(scene_total, 1),
            "morph_total": round(morph_total, 1),
            "seg_count": seg_count,
            "reason": "只有单 scene 或无 morph 段",
        }
    ratio = round(scene_total / morph_total, 4)
    return {
        "na": False,
        "ratio": ratio,
        "scene_total": round(scene_total, 1),
        "morph_total": round(morph_total, 1),
        "seg_count": seg_count,
    }


def run_all_checks(video_path, allow_blue_purple=False, allow_blue_purple_reason=None,
                   theme="realistic_cool", allow_warm_sand=False, allow_warm_sand_reason=None,
                   schedule_path=None):
    """
    综合执行全部 6 道门禁检查。

    Returns dict with status ("green"/"yellow"/"red"), gates (6 项), remediation list,
      plus raw results for each check.
    """
    remediation = []
    gates = {}

    motion_res = measure_motion_ratio(video_path)
    fast_ratio = motion_res["fast_motion_ratio"]
    if fast_ratio < 0.035:
        gates["motion_fast"] = {
            "pass": True, "level": "green",
            "value": fast_ratio, "threshold": "< 0.035 PASS / < 0.06 WARN",
            "detail": f"快速运动帧占比 = {fast_ratio:.4f} ({fast_ratio*100:.2f}%)",
        }
    elif fast_ratio < 0.06:
        gates["motion_fast"] = {
            "pass": True, "level": "yellow",
            "value": fast_ratio, "threshold": "< 0.035 PASS / < 0.06 WARN",
            "detail": f"快速运动帧占比 = {fast_ratio:.4f} ({fast_ratio*100:.2f}%) · 🟡黄灯",
        }
    else:
        gates["motion_fast"] = {
            "pass": False, "level": "red",
            "value": fast_ratio, "threshold": "< 0.035 PASS / < 0.06 WARN",
            "detail": f"快速运动帧占比 = {fast_ratio:.4f} ({fast_ratio*100:.2f}%) · 🔴红灯 (>= 0.06)",
        }
        remediation.append(
            f"[运动过快] 快速运动帧占比 {fast_ratio*100:.2f}% 超过 6%。"
            f"建议: ①降低转场速度, 延长转场时长到 1.8s 以上; "
            f"②减少大面积画面同时变化, 分批绘制; "
            f"③最差 30s 窗口 {motion_res['worst_30s_start']:.2f}s - {motion_res['worst_30s_end']:.2f}s 需重点调整。"
        )

    empty_res = detect_empty_segments(video_path)
    has_empty_mid = len(empty_res) > 0
    if not has_empty_mid:
        gates["empty_segment"] = {
            "pass": True, "level": "green",
            "value": 0, "threshold": "中段无 >0.3s 空画面",
            "detail": "中段未检测到连续 >0.3s 的空(纯色无颗粒)画面",
        }
    else:
        codes = []
        for seg in empty_res:
            codes.append(f"{seg[0]:.2f}s-{seg[1]:.2f}s")
        gates["empty_segment"] = {
            "pass": False, "level": "red",
            "value": len(empty_res),
            "threshold": "中段无 >0.3s 空画面",
            "detail": f"中段检测到 {len(empty_res)} 段空画面: " + ", ".join(codes),
        }
        for seg in empty_res:
            remediation.append(
                f"[空画面] 时间码 {seg[0]:.2f}s - {seg[1]:.2f}s 为空白沙台/近乎纯色。"
                f"建议: 补入过渡画面或基础颗粒层, 确保画面始终有沙粒纹理。"
            )

    bp_res = measure_blue_purple_ratio(video_path)
    bp_ratio = bp_res["ratio"]
    if bp_ratio <= 0.30:
        gates["blue_purple"] = {
            "pass": True, "level": "green",
            "value": bp_ratio, "threshold": "<= 30% PASS",
            "detail": f"蓝紫底色帧占比 = {bp_ratio*100:.2f}% (采样 {bp_res['total_sampled']} 帧)",
        }
    else:
        if allow_blue_purple:
            reason_str = f" (豁免理由: {allow_blue_purple_reason or '未说明'})"
            gates["blue_purple"] = {
                "pass": True, "level": "yellow",
                "value": bp_ratio, "threshold": "<= 30% PASS (允许时仅警告)",
                "detail": f"蓝紫底色帧占比 = {bp_ratio*100:.2f}% · 🟡黄灯{reason_str}",
            }
        else:
            gates["blue_purple"] = {
                "pass": False, "level": "red",
                "value": bp_ratio, "threshold": "<= 30% PASS",
                "detail": f"蓝紫底色帧占比 = {bp_ratio*100:.2f}% · 🔴红灯 (> 30%)",
            }
            remediation.append(
                f"[蓝紫AI味] 蓝紫底色帧占比 {bp_ratio*100:.2f}% 超过 30%。"
                f"建议: ①严格按色板使用暖棕/金/褐色系; "
                f"②检查背景渐变是否混入冷蓝紫色调; "
                f"③将高光部分替换为暖米黄色而非冷白色。"
                f" (若此为风格需求可使用 --allow-blue-purple 理由 豁免为黄灯)"
            )

    hc_res = detect_hard_cuts(video_path)
    hc_count = hc_res["count"]
    if hc_count == 0:
        gates["hard_cut"] = {
            "pass": True, "level": "green",
            "value": 0, "threshold": "=0 零硬切 (P12)",
            "detail": f"硬切数 = 0 · 零硬切铁律通过 (P12) · MAD 峰值 max={hc_res.get('max_mad', 0):.1f}",
        }
    else:
        ts_str = ", ".join(f"{t}s" for t in hc_res["timestamps_sec"])
        gates["hard_cut"] = {
            "pass": False, "level": "red",
            "value": hc_count, "threshold": "=0 零硬切 (P12)",
            "detail": f"硬切数 = {hc_count} 次（时间码：{ts_str}）· 🔴红灯 · 零硬切铁律 (P12)",
        }
        remediation.append(
            f"[硬切P12] 检测到 {hc_count} 次硬切（时间码：{ts_str}）。"
            f"沙画表演零硬切铁律（P12），修法：把硬切处改成 wipe_palm_half 14~18s 渐进转场"
            f"（四模式首选半抹保留下半截重画上半截）。"
        )

    cw_res = measure_tone_cw_ratio(video_path, theme=theme)
    c_pct = cw_res["C_pct"]
    w_pct = cw_res["W_pct"]
    bench = "成品样片参考 C=73.8%"
    if theme == "classic_warm":
        if w_pct > 70:
            gates["tone_cool_warm"] = {
                "pass": True, "level": "green",
                "value": w_pct, "threshold": "W% > 70% 绿 (theme=classic_warm)",
                "detail": f"theme=classic_warm · 暖 W%={w_pct:.1f}% 中 M%={cw_res['M_pct']:.1f}% 冷 C%={c_pct:.1f}% · {bench}",
            }
        else:
            if allow_warm_sand:
                reason_str = f" (豁免理由: {allow_warm_sand_reason or '未说明'})"
                gates["tone_cool_warm"] = {
                    "pass": True, "level": "yellow",
                    "value": w_pct, "threshold": "W% > 70% (豁免时仅警告)",
                    "detail": f"W%={w_pct:.1f} 低于暖沙 70% 线 · 🟡黄灯{reason_str}",
                }
            else:
                gates["tone_cool_warm"] = {
                    "pass": True, "level": "yellow",
                    "value": c_pct, "threshold": "C% > 70% 默认 (realistic_cool)",
                    "detail": (
                        f"C%={c_pct:.1f}，低于真实沙画 73.8% 成品线。"
                        f"修法：确保 palette_name=写实冷光台-5色 / realistic_cool_standard，不能混入暖黄金色。"
                        f"如果用户明确指定暖沙 classic_warm，用 --allow-warm-sand \"理由\" 降到提示。"
                    ),
                }
    else:
        if c_pct > 70:
            gates["tone_cool_warm"] = {
                "pass": True, "level": "green",
                "value": c_pct, "threshold": "C% > 70% 绿 (theme=realistic_cool 默认)",
                "detail": f"冷 C%={c_pct:.1f}% 中 M%={cw_res['M_pct']:.1f}% 暖 W%={w_pct:.1f}% · {bench}",
            }
        else:
            if allow_warm_sand:
                reason_str = f" (豁免理由: {allow_warm_sand_reason or '未说明'})"
                gates["tone_cool_warm"] = {
                    "pass": True, "level": "yellow",
                    "value": c_pct, "threshold": "C% > 70% (豁免时仅警告)",
                    "detail": f"C%={c_pct:.1f} 低于真实沙画 73.8% 成品线 · 🟡黄灯{reason_str}",
                }
            else:
                gates["tone_cool_warm"] = {
                    "pass": True, "level": "yellow",
                    "value": c_pct, "threshold": "C% > 70% 默认 (realistic_cool)",
                    "detail": (
                        f"C%={c_pct:.1f}，低于真实沙画 73.8% 成品线。"
                        f"修法：确保 palette_name=写实冷光台-5色 / realistic_cool_standard，不能混入暖黄金色。"
                        f"如果用户明确指定暖沙 classic_warm，用 --allow-warm-sand \"理由\" 降到提示。"
                    ),
                }

    prog_res = measure_progressive_ratio(schedule_path)
    if prog_res.get("na"):
        gates["progressive_ratio"] = {
            "pass": True, "level": "green",
            "value": None, "threshold": "scene/morph ∈ [0.25, 0.35] (无 schedule 跳过)",
            "detail": f"未提供或无法解析 schedule，门禁6 跳过 (scene_total={prog_res.get('scene_total',0)}, morph_total={prog_res.get('morph_total',0)})",
            "na": True,
        }
    else:
        ratio = prog_res["ratio"]
        scene_t = prog_res["scene_total"]
        morph_t = prog_res["morph_total"]
        if 0.25 <= ratio <= 0.35:
            gates["progressive_ratio"] = {
                "pass": True, "level": "green",
                "value": ratio, "threshold": "[0.25, 0.35] PASS (P13 0.3:1)",
                "detail": f"scene {scene_t}s / morph {morph_t}s = ratio {ratio:.3f} · 落在 [0.25,0.35] 理想区间 (P13)",
            }
        else:
            gates["progressive_ratio"] = {
                "pass": False, "level": "red",
                "value": ratio, "threshold": "[0.25, 0.35] PASS (P13)",
                "detail": f"scene {scene_t}s / morph {morph_t}s = ratio {ratio:.3f} · 🔴红灯 不在 [0.25,0.35] (P13)",
            }
            if ratio < 0.25:
                remediation.append(
                    f"[渐进比P13] ratio={ratio:.3f} 渐进时间太少，观众看不到作画过程；"
                    f"修法：把 morph 时长从 14s 拉到 18s 或 20s，scene 展示从 6s 降到 4s，把比例拉到 0.3。"
                )
            else:
                remediation.append(
                    f"[渐进比P13] ratio={ratio:.3f} 展示时间太长像 PPT；"
                    f"修法：把纯 scene 展示砍到 4~5s，渐进时长不变，把比例拉回 [0.25, 0.35]。"
                )

    any_red = any(g["level"] == "red" for g in gates.values())
    any_yellow = any(g["level"] == "yellow" for g in gates.values())
    if any_red:
        overall = "red"
    elif any_yellow:
        overall = "yellow"
    else:
        overall = "green"

    return {
        "status": overall,
        "gates": gates,
        "motion_result": motion_res,
        "empty_result": empty_res,
        "bp_result": bp_res,
        "hard_cut_result": hc_res,
        "tone_cw_result": cw_res,
        "progressive_result": prog_res,
        "remediation": remediation,
    }


def main_check(video_path, allow_blue_purple=False, allow_blue_purple_reason=None, verbose=True,
               theme="realistic_cool", allow_warm_sand=False, allow_warm_sand_reason=None,
               schedule_path=None):
    """被 deliver.py 调用的主入口。run_all_checks 的包装。返回结果 dict。"""
    result = run_all_checks(
        video_path,
        allow_blue_purple=allow_blue_purple,
        allow_blue_purple_reason=allow_blue_purple_reason,
        theme=theme,
        allow_warm_sand=allow_warm_sand,
        allow_warm_sand_reason=allow_warm_sand_reason,
        schedule_path=schedule_path,
    )
    if verbose:
        print(f"\n[film_gate] 综合门禁结果(6项): {'🔴红灯' if result['status']=='red' else '🟡黄灯' if result['status']=='yellow' else '🟢绿灯'}")
        for name, g in result["gates"].items():
            mark = "✅" if g["pass"] else "❌"
            level_up = g["level"].upper()
            if g.get("na"):
                level_up = "SKIP"
            print(f"  {mark} {name:18s} [{level_up:6s}] {g['detail'][:100]}")
        if result["remediation"]:
            print(f"\n[film_gate] 🔴 红灯修复建议:")
            for idx, line in enumerate(result["remediation"], 1):
                print(f"  {idx}. {line}")
    return result


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser(
        description="Sand Painting Film Gate - 视频质量门禁 (6道: 快速运动/中段空画面/蓝紫占比/硬切数P12/色调占比P11/渐进比P13)"
    )
    p.add_argument("video", help="输入视频路径 (.mp4)")
    p.add_argument("--allow-blue-purple", type=str, default=None, metavar="理由",
                   help="豁免蓝紫底为黄灯, 需给理由")
    p.add_argument("--allow-warm-sand", type=str, default=None, metavar="理由",
                   help="豁免冷调占比<70%%为黄灯 (用户明确指定暖沙classic_warm时用), 需给理由")
    p.add_argument("--theme", choices=["realistic_cool", "classic_warm", "colorful", "glow_night"],
                   default="realistic_cool", help="主题调色板 (默认 realistic_cool，用于P11色调阈值)")
    p.add_argument("--schedule", type=str, default=None,
                   help="schedule.js 路径 (用于P13渐进时间比，能解析 USER_SCHEDULE 返回数组)")
    p.add_argument("--dump", action="store_true", help="输出详细 JSON 结果")
    args = p.parse_args()

    allow_bp = args.allow_blue_purple is not None
    reason_bp = args.allow_blue_purple
    allow_ws = args.allow_warm_sand is not None
    reason_ws = args.allow_warm_sand

    res = main_check(
        args.video,
        allow_blue_purple=allow_bp,
        allow_blue_purple_reason=reason_bp,
        verbose=True,
        theme=args.theme,
        allow_warm_sand=allow_ws,
        allow_warm_sand_reason=reason_ws,
        schedule_path=args.schedule,
    )
    if args.dump:
        out = {
            k: v for k, v in res.items()
            if k in {"status", "gates", "remediation"}
        }
        out["motion_summary"] = {
            "fast_motion_ratio": res["motion_result"]["fast_motion_ratio"],
            "worst_30s_start": res["motion_result"]["worst_30s_start"],
            "worst_30s_end": res["motion_result"]["worst_30s_end"],
            "avg_motion_pct": res["motion_result"]["avg_motion_pct"],
            "max_motion_pct": res["motion_result"]["max_motion_pct"],
        }
        out["empty_segments"] = res["empty_result"]
        out["blue_purple_summary"] = {
            "ratio": res["bp_result"]["ratio"],
            "flagged": res["bp_result"]["flagged_frames"],
            "total_sampled": res["bp_result"]["total_sampled"],
        }
        out["hard_cut_summary"] = {
            "count": res["hard_cut_result"]["count"],
            "timestamps_sec": res["hard_cut_result"]["timestamps_sec"],
            "max_mad": res["hard_cut_result"].get("max_mad"),
        }
        out["tone_cw_summary"] = {
            "C_pct": res["tone_cw_result"]["C_pct"],
            "M_pct": res["tone_cw_result"]["M_pct"],
            "W_pct": res["tone_cw_result"]["W_pct"],
            "theme": res["tone_cw_result"]["theme"],
        }
        out["progressive_summary"] = {
            "na": res["progressive_result"].get("na", False),
            "ratio": res["progressive_result"].get("ratio"),
            "scene_total": res["progressive_result"].get("scene_total"),
            "morph_total": res["progressive_result"].get("morph_total"),
            "seg_count": res["progressive_result"].get("seg_count"),
        }
        print("\n" + json.dumps(out, ensure_ascii=False, indent=2))
    sys.exit(0 if res["status"] != "red" else 1)
