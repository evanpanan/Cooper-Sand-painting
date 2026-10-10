#!/usr/bin/env python3
import argparse
import json
import os
import sys
import subprocess
import tempfile
import time
import math
import re
from pathlib import Path

THEME_TO_STYLE = {
    "realistic_cool": "cool_cinema",
    "classic_warm": "warm_stage",
    "colorful": "keynote_drive",
    "glow_night": "flow_ambient",
}

BGM_STYLES = ["warm_stage", "cool_cinema", "flow_ambient", "keynote_drive"]

PROGRESSIVE_SCHEDULE = [
    {"name": "wipe_palm_half_1", "mode": "wipe_palm_half", "dur": 18.0},
    {"name": "flow_gather_scatter_1", "mode": "flow_gather_scatter", "dur": 8.0},
    {"name": "scratch_reveal_slow_1", "mode": "scratch_reveal_slow", "dur": 6.0},
    {"name": "pour_rewrite_1", "mode": "pour_rewrite", "dur": 6.0},
]


def parse_resolution(val):
    m = re.match(r'^(\d+)x(\d+)$', val)
    if not m:
        raise argparse.ArgumentTypeError(f"Invalid resolution: {val}, expected WxH")
    return int(m.group(1)), int(m.group(2))


def parse_bgm_mode(val):
    if val in ("auto", "none"):
        return val
    p = Path(val).expanduser()
    return str(p)


def parse_args():
    p = argparse.ArgumentParser(description="Sand Painting Headless Renderer (Playwright + ffmpeg)")
    p.add_argument("--solo", type=str, default=None, help="Render a single scene by ID")
    p.add_argument("--spec", type=str, default=None, help="Render parameterized clip from JSON spec file")
    p.add_argument("--stills", type=str, default=None, help="Extract stills at comma-separated times (e.g. 0,0.5,1.0) instead of video")
    p.add_argument("--from", dest="from_sec", type=float, default=0.0, help="Start time in seconds (default 0)")
    p.add_argument("--to", dest="to_sec", type=float, default=None, help="End time in seconds (default: scene duration or spec duration or 2s)")
    p.add_argument("--fps", type=int, default=30, help="Frames per second (default 30)")
    p.add_argument("--out", type=str, required=True, help="Output path: .mp4 for video, prefix for stills")
    p.add_argument("--audio", type=str, default=None, help="WAV audio file path to mix")
    p.add_argument("--audio_mix", type=float, default=0.8, help="Audio mix volume 0-1 (default 0.8)")
    p.add_argument("--sfx_only", action="store_true", help="Only render SFX audio track (no video)")
    p.add_argument("--no-counter", action="store_true", help="Disable frame counter overlay")
    p.add_argument("--long_scroll", action="store_true", help="Enable long scroll mode")
    p.add_argument("--speed", type=float, default=1.0, help="Playback speed multiplier (default 1.0)")
    p.add_argument("--resolution", type=parse_resolution, default=(1920, 1080), help="Resolution WxH (default 1920x1080)")
    p.add_argument("--project", type=str, default=None, help="Path to project engine directory (containing index.html)")
    p.add_argument("--progressive_demo", action="store_true",
                   help="启用 PROGRESSIVE_DEMO 38 秒渐进转场演示时间表；不传和原来一致（默认 false）")
    p.add_argument("--startup_demo", action="store_true",
                   help="创业题材 6 段 100s 整片演示（萌芽→首单→招人→危机→融资→品牌），真实冷光台灰沙 + 四模式渐进 + cool_cinema BGM auto")
    p.add_argument("--bgm", type=parse_bgm_mode, default="none", metavar="auto|path.wav|none",
                   help="背景音乐：none（默认不混）/ path.wav 用户指定 WAV / auto 按 spec.theme 自动选 style 并生成 BGM")
    p.add_argument("--style", choices=BGM_STYLES, default=None,
                   help=f"当 --bgm auto 时强制指定风格，不写则按 theme 推断：{' / '.join(BGM_STYLES)}")
    p.add_argument("--bpm", type=float, default=90.0, help="BGM 生成的 BPM（默认 90，仅 auto 生效）")
    p.add_argument("--sfx", nargs="*", default=[], metavar="path1.wav path2.wav",
                   help="追加 0 或多个 SFX wav 路径，混音音量 0.3 单轨")
    return p.parse_args()


def resolve_project_path(args):
    if args.project:
        return Path(args.project).resolve()
    return Path(__file__).resolve().parent


def find_index_html(project_path):
    candidates = [
        project_path / "index.html",
        project_path / "clip.html",
    ]
    for c in candidates:
        if c.exists():
            return c
    raise FileNotFoundError(f"No index.html or clip.html found in {project_path}")


def load_spec(spec_path):
    with open(spec_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def auto_style_from_theme(spec):
    theme = None
    if isinstance(spec, dict):
        theme = spec.get("theme")
        if not theme and "sand" in spec and isinstance(spec["sand"], dict):
            theme = spec["sand"].get("theme")
    if theme and theme in THEME_TO_STYLE:
        return THEME_TO_STYLE[theme]
    return "cool_cinema"


def generate_bgm_auto(style: str, duration: float, bpm: float, out_path: Path):
    script_dir = Path(__file__).resolve().parent.parent.parent / "scripts" / "audio" / "bgm.py"
    if not script_dir.exists():
        script_dir = Path(__file__).resolve().parent.parent / "audio" / "bgm.py"
    if not script_dir.exists():
        alt = list(Path(__file__).resolve().parent.rglob("bgm.py"))
        if alt:
            script_dir = alt[0]
    if not script_dir.exists():
        return None
    cmd = [
        sys.executable, str(script_dir), "generate",
        "--duration", f"{duration:.3f}",
        "--bpm", f"{bpm}",
        "--style", style,
        "--out", str(out_path),
    ]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=3600)
        if r.returncode != 0:
            print(f"[render] WARNING: bgm.py generate 失败: {r.stderr[-500:]}", file=sys.stderr)
            return None
        return out_path
    except Exception as e:
        print(f"[render] WARNING: 调用 bgm.py generate 异常: {e}", file=sys.stderr)
        return None


def mix_audio_ffmpeg(video_path: Path, bgm_path: Path, sfx_paths, out_path: Path):
    if not video_path.exists():
        return False
    inputs = []
    filter_parts = []

    check_has_audio_cmd = [
        "ffprobe", "-v", "error", "-select_streams", "a:0",
        "-show_entries", "stream=codec_type", "-of", "default=noprint_wrappers=1:nokey=1",
        str(video_path),
    ]
    try:
        probe = subprocess.run(check_has_audio_cmd, capture_output=True, text=True, timeout=15)
        has_video_audio = (probe.stdout or "").strip() == "audio"
    except Exception:
        has_video_audio = False

    anull_added = False
    if not has_video_audio:
        inputs += ["-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono"]
        anull_added = True
    inputs += ["-i", str(video_path)]
    if bgm_path and bgm_path.exists():
        inputs += ["-i", str(bgm_path)]
    for s in sfx_paths:
        sp = Path(s)
        if sp.exists():
            inputs += ["-i", str(sp)]

    vid_idx = 1 if anull_added else 0
    aud_idx = 0 if anull_added else vid_idx
    next_idx = vid_idx + 1

    labels = []
    filter_parts.append(f"[{aud_idx}:a]volume=0.0[in_v]")
    labels.append("in_v")

    if bgm_path and bgm_path.exists():
        filter_parts.append(f"[{next_idx}:a]volume=0.7[in_bgm]")
        labels.append("in_bgm")
        next_idx += 1

    for i, s in enumerate(sfx_paths):
        sp = Path(s)
        if not sp.exists():
            continue
        lb = f"in_sfx{i}"
        filter_parts.append(f"[{next_idx}:a]volume=0.3[{lb}]")
        labels.append(lb)
        next_idx += 1

    n_amix = len(labels)
    inputs_str = "".join(f"[{l}]" for l in labels)
    filter_parts.append(f"{inputs_str}amix=inputs={n_amix}:duration=first:normalize=0[aout]")

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
    try:
        result = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, timeout=7200)
        if result.returncode != 0:
            err = result.stderr.decode("utf-8", errors="replace")[-3000:]
            print(f"[render] WARNING: 混音阶段 ffmpeg 失败: {err}", file=sys.stderr)
            return False
        return True
    except FileNotFoundError:
        print("[render] ERROR: 未找到 ffmpeg，请先安装并加入 PATH。", file=sys.stderr)
        return False
    except Exception as e:
        print(f"[render] WARNING: 混音阶段异常: {e}", file=sys.stderr)
        return False


def get_duration(args, spec):
    if args.progressive_demo:
        total = sum(x.get("dur", 0) for x in PROGRESSIVE_SCHEDULE)
        if args.to_sec is not None:
            return min(args.to_sec, total) - args.from_sec
        return total - args.from_sec
    if args.startup_demo:
        total = 104.0
        if args.to_sec is not None:
            return min(args.to_sec, total) - args.from_sec
        return total - args.from_sec
    if args.to_sec is not None:
        return args.to_sec - args.from_sec
    if spec and "duration" in spec:
        return spec["duration"] - args.from_sec
    if args.solo:
        return 2.0
    return 2.0


def build_file_url(path):
    return path.resolve().as_uri()


def run_render(args):
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("[ERROR] playwright not installed. Run: pip install playwright && playwright install chromium", file=sys.stderr)
        sys.exit(1)

    project_path = resolve_project_path(args)
    index_html = find_index_html(project_path)
    url = build_file_url(index_html)

    width, height = args.resolution
    fps = args.fps

    spec = None
    if args.spec:
        spec = load_spec(args.spec)
        if "fps" in spec and args.fps == 30:
            fps = spec["fps"]
        if "resolution" in spec and args.resolution == (1920, 1080):
            w, h = spec["resolution"]
            width, height = int(w), int(h)

    duration = get_duration(args, spec)
    if duration <= 0:
        print("[ERROR] Invalid duration", file=sys.stderr)
        sys.exit(1)

    need_bgm_work = args.bgm != "none" or len(args.sfx) > 0
    tmp_bgm_path = None
    bgm_final_path = None

    if args.bgm not in ("none", "auto") and args.bgm:
        user_p = Path(args.bgm).expanduser()
        if user_p.exists():
            bgm_final_path = user_p
        else:
            print(f"[render] WARNING: --bgm 指定路径不存在: {user_p}", file=sys.stderr)

    if args.bgm == "auto":
        style = args.style or auto_style_from_theme(spec)
        if style not in BGM_STYLES:
            style = "cool_cinema"
        tmp = tempfile.NamedTemporaryFile(suffix="_bgm.wav", delete=False)
        tmp.close()
        tmp_bgm_path = Path(tmp.name)
        print(f"[render] --bgm=auto：按 style={style}, bpm={args.bpm}, duration={duration:.2f}s 生成 BGM …")
        got = generate_bgm_auto(style, duration, args.bpm, tmp_bgm_path)
        if got and got.exists():
            bgm_final_path = got
        else:
            print("[render] WARNING: auto BGM 生成失败，继续无 BGM 输出", file=sys.stderr)

    speed = args.speed if args.speed > 0 else 1.0
    effective_fps = fps
    num_frames = max(1, int(math.ceil(duration * effective_fps)))

    spec_json_str = json.dumps(spec, ensure_ascii=False) if spec else "null"
    solo_id = json.dumps(args.solo) if args.solo else "null"
    no_counter = "true" if args.no_counter else "false"
    long_scroll = "true" if args.long_scroll else "false"
    progressive_demo = "true" if args.progressive_demo else "false"
    startup_demo = "true" if args.startup_demo else "false"
    progressive_schedule_json = json.dumps(PROGRESSIVE_SCHEDULE, ensure_ascii=False)

    out_path = Path(args.out)
    if not args.stills:
        out_path.parent.mkdir(parents=True, exist_ok=True)
    else:
        out_path.parent.mkdir(parents=True, exist_ok=True)

    still_times = None
    if args.stills:
        still_times = [float(t.strip()) for t in args.stills.split(",") if t.strip()]

    ffmpeg_proc = None
    temp_audio_path = None
    first_pass_out = out_path
    need_second_pass = need_bgm_work and not args.stills and not args.sfx_only
    if need_second_pass:
        tmp_vid = tempfile.NamedTemporaryFile(suffix="_noaudio.mp4", delete=False)
        tmp_vid.close()
        first_pass_out = Path(tmp_vid.name)

    if not args.stills and not args.sfx_only:
        ffmpeg_cmd = [
            "ffmpeg", "-y",
            "-f", "image2pipe",
            "-vcodec", "png",
            "-r", str(fps),
            "-i", "-",
        ]
        if args.audio:
            temp_audio_path = tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name
            ffmpeg_cmd += [
                "-i", args.audio,
                "-filter_complex",
                f"[1:a]volume={args.audio_mix}[a1];[a1]atrim=0:{duration},asetpts=N/SR/TB[aout]",
                "-map", "0:v", "-map", "[aout]",
                "-c:a", "aac", "-b:a", "192k",
                "-shortest",
            ]
        ffmpeg_cmd += [
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "16",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            str(first_pass_out),
        ]
        ffmpeg_proc = subprocess.Popen(
            ffmpeg_cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
        )

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": width, "height": height},
            device_scale_factor=1,
        )
        page = context.new_page()
        page.set_viewport_size({"width": width, "height": height})

        print(f"[render] Loading {url} ...")
        page.goto(url, wait_until="domcontentloaded", timeout=60000)

        page.wait_for_function("typeof window.renderFrame === 'function' || typeof window.SAND !== 'undefined'", timeout=30000)

        init_js = f"""
        (function() {{
            window.__renderState = {{
                soloId: {solo_id},
                spec: {spec_json_str},
                noCounter: {no_counter},
                longScroll: {long_scroll},
                progressiveDemo: {progressive_demo},
                startupDemo: {startup_demo},
                progressiveSchedule: {progressive_schedule_json},
                width: {width},
                height: {height},
                fps: {fps},
                initialized: false,
            }};
            if (typeof window.initSandRender === 'function') {{
                window.initSandRender(window.__renderState);
                window.__renderState.initialized = true;
            }} else if (typeof window.SAND !== 'undefined' && typeof window.SAND.init === 'function') {{
                window.SAND.init(window.__renderState);
                window.__renderState.initialized = true;
            }}
            return window.__renderState.initialized;
        }})()
        """
        try:
            page.evaluate(init_js)
        except Exception as e:
            print(f"[render] Warning: init function call failed: {e}", file=sys.stderr)

        if args.progressive_demo:
            try:
                page.evaluate(f"if (typeof setProgressiveSchedule === 'function') {{ setProgressiveSchedule({progressive_schedule_json}); }}")
            except Exception as e:
                print(f"[render] Info: setProgressiveSchedule 未定义 (页面未实现渐进演示函数): {e}", file=sys.stderr)

        if args.startup_demo:
            try:
                page.evaluate("if (typeof setProgressiveSchedule === 'function' && typeof window.STARTUP_DEMO === 'function') { setProgressiveSchedule(window.STARTUP_DEMO()); }")
            except Exception as e:
                print(f"[render] Info: setProgressiveSchedule / STARTUP_DEMO 未定义 (页面未实现创业演示函数): {e}", file=sys.stderr)

        time.sleep(0.5)

        def render_frame_at(t):
            js = f"""
            (function() {{
                const t = {t};
                if (typeof window.renderFrame === 'function') {{
                    window.renderFrame(t);
                }} else if (typeof window.SAND !== 'undefined' && typeof window.SAND.renderFrame === 'function') {{
                    window.SAND.renderFrame(t);
                }}
                return true;
            }})()
            """
            try:
                page.evaluate(js)
            except Exception as e:
                print(f"[render] Warning: renderFrame({t}) failed: {e}", file=sys.stderr)

        canvas_sel = "canvas, #canvas, .sand-canvas, body"

        if still_times is not None:
            for idx, t in enumerate(still_times):
                render_frame_at(t)
                time.sleep(0.05)
                try:
                    canvas_el = page.query_selector("canvas")
                    if canvas_el:
                        img_bytes = canvas_el.screenshot(type="png")
                    else:
                        img_bytes = page.screenshot(type="png", full_page=False)
                except Exception as e:
                    print(f"[render] Screenshot at t={t} failed: {e}", file=sys.stderr)
                    img_bytes = page.screenshot(type="png", full_page=False)
                still_path = out_path.parent / f"{out_path.name}_{idx:03d}_t{t:.2f}.png"
                with open(still_path, "wb") as f:
                    f.write(img_bytes)
                print(f"[render] Still saved: {still_path}")
        elif args.sfx_only:
            print("[render] sfx_only mode: rendering audio placeholder")
            silence_path = out_path
            cmd = [
                "ffmpeg", "-y", "-f", "lavfi",
                "-i", f"anullsrc=r=44100:cl=stereo:d={duration}",
                "-c:a", "pcm_s16le", str(silence_path),
            ]
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        else:
            for i in range(num_frames):
                t = args.from_sec + (i / effective_fps) * speed
                render_frame_at(t)
                try:
                    canvas_el = page.query_selector("canvas")
                    if canvas_el:
                        img_bytes = canvas_el.screenshot(type="png")
                    else:
                        img_bytes = page.screenshot(type="png", full_page=False)
                except Exception as e:
                    print(f"[render] Screenshot frame {i} failed: {e}", file=sys.stderr)
                    img_bytes = page.screenshot(type="png", full_page=False)
                try:
                    ffmpeg_proc.stdin.write(img_bytes)
                except (BrokenPipeError, OSError) as e:
                    print(f"[render] ffmpeg pipe broken at frame {i}: {e}", file=sys.stderr)
                    break
                if i % (fps * 2) == 0 or i == num_frames - 1:
                    pct = (i + 1) / num_frames * 100
                    print(f"[render] frame {i+1}/{num_frames} ({pct:.1f}%) t={t:.3f}s")

        browser.close()

    if ffmpeg_proc is not None:
        try:
            ffmpeg_proc.stdin.close()
        except Exception:
            pass
        ret = ffmpeg_proc.wait(timeout=120)
        if ret != 0:
            stderr_out = ffmpeg_proc.stderr.read().decode("utf-8", errors="replace")[-2000:]
            print(f"[render] ffmpeg failed (code {ret}):\n{stderr_out}", file=sys.stderr)
            sys.exit(1)
        print(f"[render] Video first pass saved: {first_pass_out}")

    if temp_audio_path and os.path.exists(temp_audio_path):
        try:
            os.unlink(temp_audio_path)
        except Exception:
            pass

    if need_second_pass and first_pass_out.exists():
        sfx_abs = []
        for s in args.sfx:
            p = Path(s).expanduser()
            if p.exists():
                sfx_abs.append(p)
            else:
                print(f"[render] WARNING: SFX 路径不存在，跳过: {p}", file=sys.stderr)
        print(f"[render] 第二遍混音：BGM={bgm_final_path}, SFX 数量={len(sfx_abs)}")
        ok = mix_audio_ffmpeg(first_pass_out, bgm_final_path, sfx_abs, out_path)
        if not ok:
            if first_pass_out != out_path:
                try:
                    import shutil as _shutil
                    _shutil.copy2(str(first_pass_out), str(out_path))
                    print(f"[render] WARNING: 混音失败，已把无混音视频复制到目标 {out_path}", file=sys.stderr)
                except Exception as e2:
                    print(f"[render] ERROR: 复制兜底也失败: {e2}", file=sys.stderr)
        else:
            print(f"[render] Final output saved: {out_path}")
        try:
            if first_pass_out != out_path and first_pass_out.exists():
                first_pass_out.unlink()
        except Exception:
            pass
    else:
        if first_pass_out != out_path:
            try:
                import shutil as _shutil
                if first_pass_out.exists():
                    _shutil.copy2(str(first_pass_out), str(out_path))
            except Exception:
                pass

    if tmp_bgm_path and tmp_bgm_path.exists():
        try:
            tmp_bgm_path.unlink()
            sidecar = tmp_bgm_path.parent / f"{tmp_bgm_path.stem}.bgm.json"
            if sidecar.exists():
                sidecar.unlink()
        except Exception:
            pass


def main():
    args = parse_args()
    if not args.solo and not args.spec and not args.project and not args.progressive_demo and not args.startup_demo:
        print("[WARNING] No --solo, --spec, --progressive_demo, --startup_demo, or --project provided; will try default", file=sys.stderr)
    run_render(args)


if __name__ == "__main__":
    main()
