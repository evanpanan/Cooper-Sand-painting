#!/usr/bin/env python3
"""
film_gate.py - 沙画视频质量门禁分析
三个核心分析函数:
  1. measure_motion_ratio  - 快速运动帧比例 + 最差30秒窗口
  2. detect_empty_segments - 空画面检测(无沙粒/近乎纯色)
  3. measure_blue_purple_ratio - 蓝紫底色帧占比
"""
import subprocess
import tempfile
import shutil
import json
import math
import sys
import os
from pathlib import Path
from collections import deque

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False


def _ensure_numpy():
    if not HAS_NUMPY:
        raise ImportError("numpy is required. Run: pip install numpy")


def _run_cmd(cmd, check=True, capture_output=True):
    result = subprocess.run(cmd, capture_output=capture_output, text=True)
    if check and result.returncode != 0:
        stderr_tail = (result.stderr or "")[-2000:]
        raise RuntimeError(f"Command failed ({result.returncode}): {' '.join(cmd[:3])}...\n{stderr_tail}")
    return result


def _ffprobe_video_info(video_path):
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
    使用 ffmpeg 提取低分辨率 RGB24 原始帧到目录下，
    返回帧列表 (每个帧是 np.uint8 shape=(H,W,3) 的文件路径)，以及每帧时间
    """
    _ensure_numpy()
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    pattern = str(out_dir / "frame_%06d.rgb")

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
    pattern_glob = str(out_dir / "frame_%06d.rgb")
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
    _ensure_numpy()
    r = rgb_frame[:, :, 0].astype(np.float32)
    g = rgb_frame[:, :, 1].astype(np.float32)
    b = rgb_frame[:, :, 2].astype(np.float32)
    return 0.299 * r + 0.587 * g + 0.114 * b


def _rgb_to_hsv(rgb_frame):
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
    分析视频的运动特征。
    使用 ffmpeg 以低分辨率提取帧，计算相邻帧变化百分比。
    "快速"定义:
      - 帧间变化像素 > 18% 或
      - 帧间变化梯度 > 8% (即 连续两帧的变化率之差 > 8%)
    返回 dict:
      {
        fast_motion_ratio: float,  (0~1)
        worst_30s_start: float 秒,
        worst_30s_end:   float 秒,
        per_frame_changed_pct: [float],  (每个帧的%变化, 长度=N-1)
        per_frame_timestamps: [float],
        fast_flags: [bool],
        avg_motion_pct: float,
        max_motion_pct: float,
      }
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
    检测空画面片段: 连续 > 0.3s 的画面, 满足:
      - 亮度 std < 4.0   (近乎纯色)
      - Sobel 边缘数 < 2000 (低分辨率下几乎没有沙粒边缘)
    返回 [[start_sec, end_sec], ...]
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
    测量蓝/紫底色帧比例。
    以 4 fps 采样, 判断:
      - 主导色 H 位于 [200°, 320°] (即 H 在 200/360 ~ 320/360 之间, 约蓝-紫-品红范围)
      - 且 饱和度 > 25% (不是灰调)
    返回 dict:
      {
        ratio: float,  (0~1)
        total_sampled: int,
        flagged_frames: int,
        per_frame_hsv_mean: [(h_deg, sat_pct, val_pct)],
        flagged_indices: [int],
      }
    """
    _ensure_numpy()
    video_path = Path(video_path)
    if not video_path.exists():
        raise FileNotFoundError(f"Video not found: {video_path}")

    info = _ffprobe_video_info(video_path)
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


def run_all_checks(video_path, allow_blue_purple=False, allow_blue_purple_reason=None):
    """
    综合执行所有门禁检查。返回:
      {
        status: "green" | "yellow" | "red",
        gates: {
          motion_fast:   { pass: bool, level: "green"/"yellow"/"red", value, threshold, detail },
          empty_segment: { pass: bool, level: "green"/"yellow"/"red", value, threshold, detail },
          blue_purple:   { pass: bool, level: "green"/"yellow"/"red", value, threshold, detail },
        },
        motion_result: {...},
        empty_result: [...],
        bp_result: {...},
        remediation: [str],
      }
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
        "remediation": remediation,
    }


def main_check(video_path, allow_blue_purple=False, allow_blue_purple_reason=None, verbose=True):
    """
    被 deliver.py 调用的主入口。run_all_checks 的包装。
    """
    result = run_all_checks(video_path, allow_blue_purple, allow_blue_purple_reason)
    if verbose:
        print(f"\n[film_gate] 综合门禁结果: {'🔴红灯' if result['status']=='red' else '🟡黄灯' if result['status']=='yellow' else '🟢绿灯'}")
        for name, g in result["gates"].items():
            mark = "✅" if g["pass"] else "❌"
            print(f"  {mark} {name:14s} [{g['level'].upper():6s}] {g['detail']}")
        if result["remediation"]:
            print(f"\n[film_gate] 🔴 红灯修复建议:")
            for idx, line in enumerate(result["remediation"], 1):
                print(f"  {idx}. {line}")
    return result


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser(description="Sand Painting Film Gate - 视频质量门禁")
    p.add_argument("video", help="输入视频路径 (.mp4)")
    p.add_argument("--allow-blue-purple", type=str, default=None, metavar="理由", help="豁免蓝紫底为黄灯, 需给理由")
    p.add_argument("--dump", action="store_true", help="输出详细 JSON 结果")
    args = p.parse_args()

    allow_bp = args.allow_blue_purple is not None
    reason = args.allow_blue_purple
    res = main_check(args.video, allow_blue_purple=allow_bp, allow_blue_purple_reason=reason, verbose=True)
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
        print("\n" + json.dumps(out, ensure_ascii=False, indent=2))
    sys.exit(0 if res["status"] != "red" else 1)
