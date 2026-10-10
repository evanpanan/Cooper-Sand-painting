#!/usr/bin/env python3
"""
deliver.py - 沙画成片交付脚本
流程:
  1) film_gate 三项门禁 (运动 / 空画面 / 蓝紫AI味)
  2) 红灯 -> 打印修复建议 -> exit 1 (不复制文件)
  3) 黄灯/绿灯 -> 复制 mp4 到 output/
  4) 写 output/交付说明.md (结构化信息 + 事实指纹)
  5) 支持 --verify 模式校验文件未被篡改
"""
import argparse
import hashlib
import json
import math
import os
import re
import shutil
import subprocess
import sys
import hashlib
from datetime import datetime
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

FACT_VERSION = "1.0"


def parse_args():
    p = argparse.ArgumentParser(
        description="沙画成片交付脚本 · 门禁 + 打包 + 指纹",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = p.add_subparsers(dest="command", help="子命令")

    p_verify = sub.add_parser("verify", help="校验 output/交付说明.md 与 mp4 的一致性")
    p_verify.add_argument("deliver_md", help="交付说明.md 的路径")
    p_verify.add_argument("--mp4", default=None, help="若 mp4 不在同目录, 显式指定路径")

    p_main = sub.add_parser("deliver", help="执行交付 (默认子命令)")
    p_main.add_argument("mp4", help="成片 final.mp4 路径")
    p_main.add_argument("--project", required=True, help="引擎工程路径 (含 index.html)")
    p_main.add_argument("--spec", default=None, help="使用的 spec.json 路径 (可选)")
    p_main.add_argument("--qa", required=True, help="QA 报告目录 (含 qa_report.md)")
    p_main.add_argument("--out", required=True, help="输出目录 (如 output/)")
    p_main.add_argument(
        "--allow-blue-purple",
        type=str,
        default=None,
        metavar="理由",
        help="蓝紫底超阈值时豁免为黄灯, 必须注明理由",
    )

    args = p.parse_args()
    if args.command is None:
        if len(sys.argv) >= 2 and sys.argv[1] in ("-h", "--help"):
            p.print_help()
            sys.exit(0)
        p.print_usage(sys.stderr)
        print("\n错误: 请指定子命令 verify 或 deliver\n", file=sys.stderr)
        sys.exit(2)
    return args


def sha256_file(path, chunk=1024 * 1024):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            buf = f.read(chunk)
            if not buf:
                break
            h.update(buf)
    return h.hexdigest()


def _run_cmd(cmd, check=True, capture_output=True):
    result = subprocess.run(cmd, capture_output=capture_output, text=True)
    if check and result.returncode != 0:
        stderr_tail = (result.stderr or "")[-2000:]
        raise RuntimeError(f"Command failed: {' '.join(cmd[:3])}...\n{stderr_tail}")
    return result


def ffprobe_info(mp4_path):
    cmd = [
        "ffprobe", "-v", "error",
        "-print_format", "json",
        "-show_format", "-show_streams",
        "-select_streams", "v:0",
        str(mp4_path),
    ]
    r = _run_cmd(cmd)
    data = json.loads(r.stdout or "{}")
    fmt = data.get("format", {})
    streams = data.get("streams", [])
    if not streams:
        raise RuntimeError(f"无视频流: {mp4_path}")
    s = streams[0]
    w = int(s.get("width", 0))
    h = int(s.get("height", 0))
    dur_sec = float(fmt.get("duration", s.get("duration", 0)) or 0)
    fps_str = s.get("r_frame_rate", s.get("avg_frame_rate", "30/1"))
    if "/" in fps_str:
        n, d = fps_str.split("/", 1)
        try:
            fps = float(n) / max(1, float(d))
        except ValueError:
            fps = 30.0
    else:
        try:
            fps = float(fps_str)
        except ValueError:
            fps = 30.0
    return {
        "width": w,
        "height": h,
        "duration_sec": dur_sec,
        "fps": fps,
        "bitrate": int(fmt.get("bit_rate", 0) or 0),
        "size_bytes": int(fmt.get("size", 0) or 0),
    }


def format_duration(sec):
    if sec < 0:
        sec = 0
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = sec - h * 3600 - m * 60
    return f"{h:02d}:{m:02d}:{s:06.3f}"


def parse_qa_report(qa_dir):
    qa_dir = Path(qa_dir)
    report = qa_dir / "qa_report.md"
    result = {"red": 0, "yellow": 0, "green": 0, "items": [], "status_text": "未找到报告"}
    if not report.exists():
        return result
    content = report.read_text(encoding="utf-8", errors="replace")
    m = re.search(r"\*\*总体状态\*\*:\s*([🟢🟡🔴]+[^\n]*)", content)
    if m:
        result["status_text"] = m.group(1).strip()
    if "🟢" in result["status_text"] or result["status_text"].endswith("绿灯"):
        result["green"] += 1
    elif "🟡" in result["status_text"] or result["status_text"].endswith("黄灯"):
        result["yellow"] += 1
    elif "🔴" in result["status_text"] or result["status_text"].endswith("红灯"):
        result["red"] += 1
    rows = re.findall(r"\|\s*([^|]+?)\s*\|\s*([✅❌][^|]*?)\s*\|\s*([^|]*?)\s*\|", content)
    for name, ok_str, detail in rows:
        name = name.strip()
        if name in ("检查项", "---") or name.startswith("-"):
            continue
        result["items"].append({"name": name, "result": ok_str.strip(), "detail": detail.strip()})
        if "❌" in ok_str:
            result["red"] += 1
        elif "✅" in ok_str:
            result["green"] += 1
    return result


def list_review_records(project_root):
    project_root = Path(project_root)
    skill_root = Path(__file__).resolve().parent.parent
    candidates = [
        project_root / "审片",
        project_root.parent / "审片",
        skill_root / "审片",
    ]
    review_dir = None
    for c in candidates:
        if c.exists() and c.is_dir():
            review_dir = c
            break
    if review_dir is None:
        return None
    md_files = sorted(review_dir.glob("*.md"))
    if not md_files:
        return []
    results = []
    for mf in md_files:
        try:
            text = mf.read_text(encoding="utf-8", errors="replace")
        except Exception:
            text = ""
        clean = re.sub(r"[#>*\-\s]+", " ", text).strip()
        summary = clean[:200]
        if len(clean) > 200:
            summary += "…"
        results.append({"filename": mf.name, "summary": summary})
    return results


def build_fingerprint(mp4_path, facts):
    """
    事实指纹 = sha256( mp4_sha256 + FACT_VERSION + 所有门禁数值 + QA 统计 )
    """
    h = hashlib.sha256()
    h.update(facts["mp4_sha256"].encode("utf-8"))
    h.update(b"|v" + FACT_VERSION.encode("utf-8"))
    for gk in ["motion_fast", "empty_segment", "blue_purple"]:
        g = facts["gates"].get(gk, {})
        val = g.get("value", 0)
        if isinstance(val, float):
            s = f"{val:.6f}"
        else:
            s = str(val)
        h.update(f"|{gk}={s}".encode("utf-8"))
    h.update(f"|qa_r={facts['qa_red']}y={facts['qa_yellow']}g={facts['qa_green']}".encode("utf-8"))
    h.update(f"|dur={facts['duration_sec']:.3f}|{facts['width']}x{facts['height']}@{facts['fps']:.2f}".encode("utf-8"))
    return h.hexdigest()


def write_delivery_md(out_dir, mp4_filename, facts):
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / "交付说明.md"

    short_sha = facts["mp4_sha256"][:16]
    stamp = datetime.now().strftime("%Y-%m-%d %H:%M")

    lines = []
    lines.append(f"# 交付说明 · {stamp} · 文件指纹 `{short_sha}`\n")
    lines.append(f"> 成片文件: `{mp4_filename}`\n")

    lines.append("## 1. 基础参数\n")
    lines.append(f"- **时长**: `{format_duration(facts['duration_sec'])}`")
    lines.append(f"- **分辨率**: `{facts['width']}×{facts['height']} @ {facts['fps']:.3f} fps`")
    br = facts.get("bitrate", 0)
    if br > 0:
        lines.append(f"- **码率**: `{br/1_000_000:.2f} Mbps`")
    sz = facts.get("size_bytes", 0)
    if sz > 0:
        lines.append(f"- **文件大小**: `{sz/1024/1024:.2f} MB`")
    lines.append("")

    lines.append("## 2. 门禁项\n")
    lines.append("| 门禁 | 等级 | 判定 | 数值 / 阈值 | 说明 |")
    lines.append("|---|---|---|---|---|")
    gate_names = {
        "motion_fast": "快速运动帧占比",
        "empty_segment": "中段空画面检测",
        "blue_purple": "蓝紫底色占比",
    }
    for gk in ["motion_fast", "empty_segment", "blue_purple"]:
        g = facts["gates"].get(gk, {})
        level_cn = {"green": "🟢绿灯", "yellow": "🟡黄灯", "red": "🔴红灯"}.get(g.get("level", "red"), "❓")
        pass_cn = "PASS" if g.get("pass") else "FAIL"
        val = g.get("value", 0)
        if isinstance(val, float):
            val_str = f"{val:.4f}"
            if gk == "motion_fast":
                val_str += f" ({val*100:.2f}%)"
            elif gk == "blue_purple":
                val_str += f" ({val*100:.2f}%)"
        else:
            val_str = str(val)
        thr = g.get("threshold", "")
        detail = g.get("detail", "")
        lines.append(f"| {gate_names.get(gk, gk)} | {level_cn} | **{pass_cn}** | {val_str} / {thr} | {detail} |")
    lines.append("")

    lines.append("## 3. 运动最差 30 秒窗口\n")
    ws = facts.get("worst_30s_start", 0)
    we = facts.get("worst_30s_end", 0)
    if we > ws:
        lines.append(f"- **窗口时间**: `{format_duration(ws)}`  →  `{format_duration(we)}`")
        lines.append(f"- **平均运动能量参考**: avg={facts.get('avg_motion_pct', 0):.2f}%  max={facts.get('max_motion_pct', 0):.2f}%")
    else:
        lines.append("- 样本不足, 无法计算。")
    lines.append("")

    lines.append("## 4. QA 结果\n")
    lines.append(f"- **QA 状态**: {facts['qa_status']}")
    lines.append(f"- **红灯项**: `{facts['qa_red']}` · **黄灯项**: `{facts['qa_yellow']}` · **绿灯项**: `{facts['qa_green']}`")
    if facts["qa_items"]:
        lines.append("\n| 检查项 | 结果 | 说明 |")
        lines.append("|---|---|---|")
        for it in facts["qa_items"]:
            lines.append(f"| {it['name']} | {it['result']} | {it['detail']} |")
    lines.append("")

    lines.append("## 5. 审片记录\n")
    review = facts["review_records"]
    if review is None:
        lines.append("未派审片 (工程下无 `审片/*.md`)")
    elif len(review) == 0:
        lines.append("审片目录存在, 但尚无审片记录 md 文件。")
    else:
        for rec in review:
            lines.append(f"### 📝 {rec['filename']}\n")
            lines.append(f"> {rec['summary']}\n")
    lines.append("")

    lines.append("## 6. 制作说明 (Agent 手填区)\n")
    lines.append("> ⚠️ 此区为可编辑说明区; **修改后不会破坏指纹校验**, 但交付前请完整填写以避免返工。\n")
    lines.append("### 6.1 语法与风格\n")
    lines.append("- **使用的沙画语法 (翻页/撒/流/聚/散…)**: *请填写所用到的核心语法清单, 并附对应时间码示例*\n")
    lines.append("- **风格配方 (色板/颗粒密度/光箱色温)**: *请填写风格来源 references/风格配方/*.md 名称或自定义参数*\n")
    lines.append("- **转场方案列表**: *请按 era 顺序列出所用转场类型及原因*\n")
    lines.append("### 6.2 未通过 QA 项及整改说明\n")
    lines.append("> 若存在黄灯/红灯, 请逐条说明未通过原因、已做的修复或保留理由:\n")
    lines.append("- *(示例) 颗粒粗细依赖 黄灯: 因艺术表达需要, 特写段落故意使用统一细颗粒, 已在 ××s–××s 补入粗颗粒区域, 阈值差异 2.8 → 3.1*\n")
    lines.append("- …\n")
    lines.append("### 6.3 六路复核 (交付前自查清单)\n")
    lines.append("- [ ] **翻页PPT** : 确认画面不是生硬切页, 存在沙画连续形变过程\n")
    lines.append("- [ ] **照搬示范** : 确认与 references/示例 的构图/节奏相似性 <40%, 具有原创表达\n")
    lines.append("- [ ] **无具体物** : 确认主体造型具体可辨识, 未出现无法识别的抽象色块冒充内容\n")
    lines.append("- [ ] **死背景** : 确认背景存在呼吸/流动/渐变等动态, 并非一成不变的静态图\n")
    lines.append("- [ ] **照片冒充沙画** : 确认不存在未经沙化的图像贴入, 全片由 canvas 颗粒绘制\n")
    lines.append("- [ ] **AI 味蓝紫** : 确认未出现大面积蓝紫色光效, 色系符合色板; 若豁免, 已填 `--allow-blue-purple`\n")
    lines.append("")

    lines.append("## 7. 事实指纹区\n")
    lines.append("> 此区用于验证成片 + 事实数据是否被篡改; 不可手动编辑。\n")
    lines.append(f"- **事实版本**: `FACT_VERSION={FACT_VERSION}`")
    lines.append(f"- **mp4 SHA256**: `{facts['mp4_sha256']}`")
    lines.append(f"- **指纹 (sha256 of facts)**: `{facts['fact_fingerprint']}`")
    lines.append("")
    lines.append("**校验命令**:\n")
    lines.append("```bash")
    lines.append(f"python3 {Path(__file__).name} verify \"{path.name}\" --mp4 \"{mp4_filename}\"")
    lines.append("```\n")

    content = "\n".join(lines)
    path.write_text(content, encoding="utf-8")
    return path


def run_deliver(args):
    mp4_path = Path(args.mp4).resolve()
    if not mp4_path.exists():
        print(f"[deliver] 🔴 找不到 mp4 文件: {mp4_path}", file=sys.stderr)
        sys.exit(2)

    project_path = Path(args.project).resolve()
    qa_dir = Path(args.qa).resolve()
    out_dir = Path(args.out).resolve()

    if not project_path.exists():
        print(f"[deliver] 🔴 --project 路径不存在: {project_path}", file=sys.stderr)
        sys.exit(2)
    if not qa_dir.exists():
        print(f"[deliver] 🔴 --qa 报告目录不存在: {qa_dir}", file=sys.stderr)
        sys.exit(2)

    import film_gate

    allow_bp = args.allow_blue_purple is not None
    bp_reason = args.allow_blue_purple

    print("[deliver] Step 1/4: 运行 film_gate 三项门禁…")
    gate_result = film_gate.main_check(
        mp4_path,
        allow_blue_purple=allow_bp,
        allow_blue_purple_reason=bp_reason,
        verbose=True,
    )

    if gate_result["status"] == "red":
        print("\n[deliver] 🔴 综合门禁未通过, 终止交付。文件未被复制。")
        print("\n修复建议:")
        for i, line in enumerate(gate_result.get("remediation", []), 1):
            print(f"  {i}. {line}")
        sys.exit(1)

    print(f"\n[deliver] 门禁通过: {'🟢绿灯' if gate_result['status']=='green' else '🟡黄灯'}, 继续交付。")

    print("[deliver] Step 2/4: 复制 mp4 到输出目录…")
    out_dir.mkdir(parents=True, exist_ok=True)
    dest_mp4 = out_dir / mp4_path.name
    if dest_mp4.exists() and dest_mp4.resolve() == mp4_path:
        pass
    else:
        shutil.copy2(mp4_path, dest_mp4)
    print(f"  → {dest_mp4}")

    print("[deliver] Step 3/4: 采集 ffprobe / QA / 审片 数据…")
    info = ffprobe_info(mp4_path)
    mp4_sha = sha256_file(mp4_path)
    qa_stats = parse_qa_report(qa_dir)
    review_recs = list_review_records(project_path)

    motion = gate_result["motion_result"]
    facts = {
        "mp4_sha256": mp4_sha,
        "duration_sec": info["duration_sec"],
        "width": info["width"],
        "height": info["height"],
        "fps": info["fps"],
        "bitrate": info["bitrate"],
        "size_bytes": info["size_bytes"],
        "gates": gate_result["gates"],
        "worst_30s_start": motion.get("worst_30s_start", 0),
        "worst_30s_end": motion.get("worst_30s_end", 0),
        "avg_motion_pct": motion.get("avg_motion_pct", 0),
        "max_motion_pct": motion.get("max_motion_pct", 0),
        "qa_status": qa_stats["status_text"],
        "qa_red": qa_stats["red"],
        "qa_yellow": qa_stats["yellow"],
        "qa_green": qa_stats["green"],
        "qa_items": qa_stats["items"],
        "review_records": review_recs,
    }
    facts["fact_fingerprint"] = build_fingerprint(mp4_path, facts)

    print("[deliver] Step 4/4: 写 交付说明.md …")
    md_path = write_delivery_md(out_dir, mp4_path.name, facts)
    print(f"  → {md_path}")

    print("\n[deliver] ✅ 交付完成。")
    print(f"  mp4        : {dest_mp4}")
    print(f"  说明文档   : {md_path}")
    print(f"  文件指纹   : {facts['fact_fingerprint'][:24]}…")
    return 0


def run_verify(args):
    md_path = Path(args.deliver_md).resolve()
    if not md_path.exists():
        print(f"[verify] 🔴 找不到交付说明: {md_path}", file=sys.stderr)
        sys.exit(2)
    md_dir = md_path.parent
    md_text = md_path.read_text(encoding="utf-8", errors="replace")

    mp4_path = None
    if args.mp4:
        mp4_path = Path(args.mp4).resolve()
    else:
        m = re.search(r"成片文件:\s*`([^`]+)`", md_text)
        if m:
            mp4_path = (md_dir / m.group(1)).resolve()
    if mp4_path is None or not mp4_path.exists():
        print(f"[verify] 🔴 找不到 mp4 文件。请用 --mp4 指定路径。", file=sys.stderr)
        sys.exit(2)

    m_mp4_sha = re.search(r"mp4 SHA256`?:\s*`([0-9a-f]{64})`", md_text)
    m_fact_fp = re.search(r"指纹 \(sha256 of facts\)`?:\s*`([0-9a-f]{64})`", md_text)
    m_ver = re.search(r"FACT_VERSION=([0-9.]+)", md_text)

    if not m_mp4_sha or not m_fact_fp or not m_ver:
        print("[verify] 🔴 交付说明.md 缺少指纹字段, 无法校验。", file=sys.stderr)
        sys.exit(1)

    print(f"[verify] mp4        : {mp4_path}")
    print(f"[verify] 交付说明   : {md_path}")
    print(f"[verify] 事实版本   : {m_ver.group(1)}")

    actual_mp4_sha = sha256_file(mp4_path)
    expected_mp4_sha = m_mp4_sha.group(1)
    if actual_mp4_sha != expected_mp4_sha:
        print("[verify] 🔴 mp4 SHA256 不匹配, 文件已被篡改或替换。")
        print(f"  期望: {expected_mp4_sha}")
        print(f"  实际: {actual_mp4_sha}")
        sys.exit(1)
    print("[verify] ✅ mp4 SHA256 匹配。")

    info = ffprobe_info(mp4_path)

    qa_red = qa_yellow = qa_green = 0
    m_qa = re.search(r"\*\*红灯项\*\*:\s*`(\d+)`\s*·\s*\*\*黄灯项\*\*:\s*`(\d+)`\s*·\s*\*\*绿灯项\*\*:\s*`(\d+)`", md_text)
    if m_qa:
        qa_red = int(m_qa.group(1))
        qa_yellow = int(m_qa.group(2))
        qa_green = int(m_qa.group(3))

    def parse_gate_val(name_cn):
        rows = re.findall(
            r"\|\s*" + re.escape(name_cn) + r"\s*\|\s*[🟢🟡🔴绿黄红]+\s*\|\s*(\w+)\s*\|\s*([^/\|]*?)\s*/([^|]*?)\|",
            md_text,
        )
        if rows:
            vstr = rows[0][1].strip()
            m_pct = re.search(r"([0-9.]+)\s*\(", vstr)
            if m_pct:
                try:
                    return float(m_pct.group(1))
                except ValueError:
                    pass
            try:
                return float(vstr)
            except ValueError:
                try:
                    return int(vstr)
                except ValueError:
                    return 0
        return 0

    import film_gate as fg
    import tempfile
    with tempfile.TemporaryDirectory() as tmpd:
        tmpd_p = Path(tmpd)
        mot = fg.measure_motion_ratio(mp4_path)
        empties = fg.detect_empty_segments(mp4_path)
        bp = fg.measure_blue_purple_ratio(mp4_path)

    gates = {
        "motion_fast": {"value": mot["fast_motion_ratio"]},
        "empty_segment": {"value": len(empties)},
        "blue_purple": {"value": bp["ratio"]},
    }

    facts_local = {
        "mp4_sha256": actual_mp4_sha,
        "duration_sec": info["duration_sec"],
        "width": info["width"],
        "height": info["height"],
        "fps": info["fps"],
        "gates": gates,
        "qa_red": qa_red,
        "qa_yellow": qa_yellow,
        "qa_green": qa_green,
    }

    recomputed_fp = build_fingerprint(mp4_path, facts_local)
    expected_fp = m_fact_fp.group(1)

    if recomputed_fp != expected_fp:
        print("[verify] 🔴 事实指纹不匹配, 门禁或QA数据可能被篡改。")
        print(f"  期望: {expected_fp}")
        print(f"  实际: {recomputed_fp}")
        sys.exit(1)
    print("[verify] ✅ 事实指纹匹配, 未被篡改。")
    print("[verify] 🟢 全部校验通过。")
    return 0


def main():
    args = parse_args()
    if args.command == "verify":
        return run_verify(args)
    else:
        return run_deliver(args)


if __name__ == "__main__":
    sys.exit(main())
