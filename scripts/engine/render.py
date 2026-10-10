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

def parse_resolution(val):
    m = re.match(r'^(\d+)x(\d+)$', val)
    if not m:
        raise argparse.ArgumentTypeError(f"Invalid resolution: {val}, expected WxH")
    return int(m.group(1)), int(m.group(2))

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

def get_duration(args, spec):
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

    speed = args.speed if args.speed > 0 else 1.0
    effective_fps = fps
    num_frames = max(1, int(math.ceil(duration * effective_fps)))

    spec_json_str = json.dumps(spec, ensure_ascii=False) if spec else "null"
    solo_id = json.dumps(args.solo) if args.solo else "null"
    no_counter = "true" if args.no_counter else "false"
    long_scroll = "true" if args.long_scroll else "false"

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
            str(out_path),
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
        print(f"[render] Video saved: {out_path}")

    if temp_audio_path and os.path.exists(temp_audio_path):
        try:
            os.unlink(temp_audio_path)
        except Exception:
            pass

def main():
    args = parse_args()
    if not args.solo and not args.spec and not args.project:
        print("[WARNING] No --solo, --spec, or --project provided; will try default", file=sys.stderr)
    run_render(args)

if __name__ == "__main__":
    main()
