#!/usr/bin/env python3
import argparse
import json
import re
import sys
from pathlib import Path

SAND_VERBS = ["撒", "划", "流", "抹", "散", "聚"]
OPENING_VERBS = SAND_VERBS + ["光台亮起"]
FORBIDDEN_LAST_LENS = ["抹平", "飘散", "擦除"]
REQUIRED_LAST_LENS = ["停", "淡出"]
SIGNATURE_TRANSITIONS = [
    "t_", "t_pour", "t_wipe", "t_flow", "t_scatter",
    "撒沙", "抹平", "流动", "飘散", "手掌", "沙粒",
]

def parse_args():
    p = argparse.ArgumentParser(description="Sand Painting Storyboard Lint")
    p.add_argument("storyboard", type=str, help="Path to storyboard markdown file")
    p.add_argument("--script", type=str, default=None, help="Path to narration script text file")
    p.add_argument("--align", type=str, default=None, help="Path to alignment JSON file")
    return p.parse_args()

def read_file(path, encoding_list=("utf-8", "gbk", "utf-8-sig")):
    last_err = None
    for enc in encoding_list:
        try:
            return Path(path).read_text(encoding=enc)
        except UnicodeDecodeError as e:
            last_err = e
    raise last_err

def parse_md_table(md_text):
    lines = md_text.splitlines()
    rows = []
    header = None
    in_table = False
    for raw_line in lines:
        line = raw_line.rstrip()
        if not line.strip():
            continue
        if "|" not in line:
            if in_table:
                break
            continue
        cells = [c.strip() for c in line.split("|")]
        if cells and cells[0] == "":
            cells = cells[1:]
        if cells and cells[-1] == "":
            cells = cells[:-1]
        if not cells:
            continue
        if header is None:
            header = cells
            in_table = True
            continue
        if in_table and all(re.match(r'^[-: ]+$', c) for c in cells if c):
            continue
        if in_table:
            while len(cells) < len(header):
                cells.append("")
            rows.append(cells[:len(header)])
    return header, rows

def find_col(headers, candidates, must=False):
    h_lower = [h.strip() for h in headers]
    for cand in candidates:
        for i, h in enumerate(h_lower):
            if cand in h or h in cand:
                return i
    if must:
        raise ValueError(f"找不到列 (候选: {candidates})，实际列头: {headers}")
    return None

def contains_any(text, keywords):
    return any(k in text for k in keywords)

def lint_op01_first_row(row_verbs, row_idx_display):
    errors = []
    joined = "".join(row_verbs) if isinstance(row_verbs, (list, tuple)) else str(row_verbs)
    if not contains_any(joined, OPENING_VERBS):
        errors.append({
            "row": row_idx_display,
            "type": "error",
            "rule": "OP01",
            "msg": f"第0行/首镜动词必须包含 {OPENING_VERBS} 之一，实际: '{joined}'",
        })
    return errors

def lint_last_row(row_lens_text, row_idx_display):
    errors = []
    warnings = []
    lens = str(row_lens_text)
    missing_req = [kw for kw in REQUIRED_LAST_LENS if kw not in lens]
    if missing_req:
        errors.append({
            "row": row_idx_display,
            "type": "error",
            "rule": "LAST_LENS",
            "msg": f"最后一镜镜头列需要包含 {REQUIRED_LAST_LENS}，缺少: {missing_req}，实际: '{lens}'",
        })
    found_forbidden = [kw for kw in FORBIDDEN_LAST_LENS if kw in lens]
    if found_forbidden:
        errors.append({
            "row": row_idx_display,
            "type": "error",
            "rule": "LAST_LENS",
            "msg": f"最后一镜镜头列禁止包含 {FORBIDDEN_LAST_LENS}，发现: {found_forbidden}",
        })
    return errors, warnings

def lint_objects_nonempty(rows, obj_col):
    errors = []
    for i, row in enumerate(rows):
        if obj_col is None or obj_col >= len(row):
            continue
        cell = str(row[obj_col]).strip()
        if cell == "" or cell == "-":
            errors.append({
                "row": i + 1,
                "type": "error",
                "rule": "OBJ_NONEMPTY",
                "msg": f"'画面里的物'列不能为空，行{i+1}是空的",
            })
    return errors

def lint_sand_verb_ratio(rows, verb_col, obj_col=None, lens_col=None):
    errors = []
    warnings = []
    total = len(rows)
    if total == 0:
        return errors, warnings
    count = 0
    for i, row in enumerate(rows):
        text_parts = []
        if verb_col is not None and verb_col < len(row):
            text_parts.append(str(row[verb_col]))
        if obj_col is not None and obj_col < len(row):
            text_parts.append(str(row[obj_col]))
        if lens_col is not None and lens_col < len(row):
            text_parts.append(str(row[lens_col]))
        joined = "".join(text_parts)
        if contains_any(joined, SAND_VERBS):
            count += 1
    ratio = count / total if total > 0 else 0
    if ratio <= 0.5:
        errors.append({
            "row": "ALL",
            "type": "error",
            "rule": "SAND_RATIO",
            "msg": f"含沙画行为动词({SAND_VERBS})的行占比 {ratio:.0%} ≤ 50% (共{count}/{total}行)，需要 >50%",
        })
    return errors, warnings

def is_hard_cut(cell_text):
    t = str(cell_text).strip()
    if not t:
        return True
    if contains_any(t, SIGNATURE_TRANSITIONS):
        return False
    if "硬切" in t or "切" == t or ("切" in t and "划" not in t):
        return True
    if t in {"-", "无", "none", "None"}:
        return True
    return False

def lint_hard_cut_ratio(rows, lens_col, trans_col=None):
    errors = []
    warnings = []
    total = len(rows) - 1
    if total <= 0:
        return errors, warnings
    hard = 0
    for i in range(len(rows) - 1):
        row_cur = rows[i]
        row_nxt = rows[i + 1]
        texts = []
        if lens_col is not None and lens_col < len(row_nxt):
            texts.append(str(row_nxt[lens_col]))
        if trans_col is not None and trans_col < len(row_cur):
            texts.append(str(row_cur[trans_col]))
        if lens_col is not None and lens_col < len(row_cur):
            texts.append(str(row_cur[lens_col]))
        joined = " | ".join(texts)
        if is_hard_cut(joined):
            hard += 1
    ratio = hard / total if total > 0 else 0
    if ratio >= 0.20:
        errors.append({
            "row": "ALL",
            "type": "error",
            "rule": "HARD_CUT_RATIO",
            "msg": f"相邻转场硬切占比 {ratio:.0%} ≥ 20% ({hard}/{total})，必须用签名 t_* 转场 (<20%)",
        })
    return errors, warnings

def lint_on_screen_text(rows, text_col):
    errors = []
    warnings = []
    if text_col is None:
        return errors, warnings
    for i, row in enumerate(rows):
        if text_col >= len(row):
            continue
        cell = str(row[text_col]).strip()
        if not cell:
            continue
        lines = re.split(r'[\\n/|;；，,、]|<br\s*/?>|\n', cell)
        lines = [l.strip() for l in lines if l.strip()]
        if len(lines) > 3:
            errors.append({
                "row": i + 1,
                "type": "error",
                "rule": "TEXT_LINES",
                "msg": f"屏上字行数 {len(lines)} > 3 行 (行{i+1})",
            })
        for li, ln in enumerate(lines):
            clean = re.sub(r'\s+', '', ln)
            if len(clean) > 8:
                errors.append({
                    "row": i + 1,
                    "type": "error",
                    "rule": "TEXT_WIDTH",
                    "msg": f"屏上字第{li+1}行 {len(clean)}字 > 8字: '{clean}' (行{i+1})",
                })
    return errors, warnings

def extract_numbers(text):
    text = str(text)
    nums = []
    for m in re.finditer(r'(\d+\.\d+|\d+)', text):
        try:
            nums.append(float(m.group(1)))
        except ValueError:
            pass
    return nums

def lint_alignment(rows, script_path, align_path, time_col, text_col, obj_col, verb_col):
    errors = []
    warnings = []
    try:
        script_text = read_file(script_path)
    except Exception as e:
        errors.append({
            "row": "GLOBAL",
            "type": "error",
            "rule": "ALIGN_IO",
            "msg": f"无法读取 script 文件 {script_path}: {e}",
        })
        return errors, warnings
    try:
        align_text = read_file(align_path)
        align_data = json.loads(align_text)
    except Exception as e:
        errors.append({
            "row": "GLOBAL",
            "type": "error",
            "rule": "ALIGN_IO",
            "msg": f"无法读取/解析 align JSON {align_path}: {e}",
        })
        return errors, warnings

    script_lines = script_text.splitlines()
    alignments = align_data if isinstance(align_data, list) else align_data.get("alignments", [])

    for i, row in enumerate(rows):
        cells_for_nums = []
        if text_col is not None and text_col < len(row):
            cells_for_nums.append(str(row[text_col]))
        if obj_col is not None and obj_col < len(row):
            cells_for_nums.append(str(row[obj_col]))
        if verb_col is not None and verb_col < len(row):
            cells_for_nums.append(str(row[verb_col]))
        if time_col is not None and time_col < len(row):
            cells_for_nums.append(str(row[time_col]))
        row_numbers = extract_numbers(" ".join(cells_for_nums))
        if not row_numbers:
            continue
        related_script = ""
        if i < len(alignments):
            entry = alignments[i]
            if isinstance(entry, dict):
                s = entry.get("script_idx", entry.get("line_idx", entry.get("start_line", i)))
                e = entry.get("end_line", entry.get("end_idx", s))
                try:
                    s_i = int(s); e_i = int(e)
                    related_script = " ".join(script_lines[s_i:min(e_i + 1, len(script_lines))])
                except Exception:
                    related_script = " ".join(script_lines) if script_lines else ""
            else:
                related_script = " ".join(script_lines) if script_lines else ""
        elif i < len(script_lines):
            related_script = script_lines[i]
        else:
            related_script = " ".join(script_lines) if script_lines else ""

        script_nums = extract_numbers(related_script)
        if not script_nums:
            continue
        for rn in row_numbers:
            matched = False
            for sn in script_nums:
                if abs(rn - sn) <= 0.05:
                    matched = True
                    break
                if rn != 0 and abs(rn - sn) / max(abs(rn), 1e-9) < 0.01:
                    matched = True
                    break
            if not matched:
                errors.append({
                    "row": i + 1,
                    "type": "error",
                    "rule": "ALIGN_NUMBERS",
                    "msg": f"行{i+1} 表格数字 {rn} 在对应口播行未找到 (±0.05容差)。表格数: {row_numbers}, 口播数: {script_nums}",
                })
    return errors, warnings

def main():
    args = parse_args()
    storyboard_path = Path(args.storyboard)
    if not storyboard_path.exists():
        print(f"[lint] ERROR: storyboard file not found: {storyboard_path}", file=sys.stderr)
        sys.exit(2)
    try:
        md_text = read_file(str(storyboard_path))
    except Exception as e:
        print(f"[lint] ERROR: cannot read storyboard: {e}", file=sys.stderr)
        sys.exit(2)

    header, rows = parse_md_table(md_text)
    if not header or not rows:
        print("[lint] ERROR: 未找到 markdown 表格", file=sys.stderr)
        sys.exit(2)

    time_col = find_col(header, ["时间段", "时间", "时长", "Time", "time"], must=False)
    obj_col = find_col(header, ["画面里的物", "物", "画面", "画面元素", "Object"], must=False)
    verb_col = find_col(header, ["它在做什么", "做什么", "动词", "动作", "Action", "Verb", "做法"], must=False)
    lens_col = find_col(header, ["镜头", "转场", "Lens", "镜头/转场", "Transition"], must=False)
    text_col = find_col(header, ["屏上字", "字幕", "文字", "Text", "On-screen"], must=False)
    trans_col = find_col(header, ["转场", "Transition", "过渡"], must=False)
    if trans_col == lens_col:
        trans_col = None

    if obj_col is None and len(header) >= 2:
        obj_col = 1
    if verb_col is None and len(header) >= 3:
        verb_col = 2
    if lens_col is None and len(header) >= 4:
        lens_col = 3
    if text_col is None and len(header) >= 5:
        text_col = 4

    errors = []
    warnings = []

    if len(rows) > 0:
        first_verbs = []
        for col in (verb_col, obj_col, lens_col):
            if col is not None and col < len(rows[0]):
                first_verbs.append(str(rows[0][col]))
        errors.extend(lint_op01_first_row(" ".join(first_verbs), 1))

    if len(rows) > 0:
        last_lens_text = ""
        if lens_col is not None and lens_col < len(rows[-1]):
            last_lens_text = str(rows[-1][lens_col])
        le, lw = lint_last_row(last_lens_text, len(rows))
        errors.extend(le); warnings.extend(lw)

    errors.extend(lint_objects_nonempty(rows, obj_col))

    e2, w2 = lint_sand_verb_ratio(rows, verb_col, obj_col, lens_col)
    errors.extend(e2); warnings.extend(w2)

    e3, w3 = lint_hard_cut_ratio(rows, lens_col, trans_col)
    errors.extend(e3); warnings.extend(w3)

    e4, w4 = lint_on_screen_text(rows, text_col)
    errors.extend(e4); warnings.extend(w4)

    if args.script and args.align:
        e5, w5 = lint_alignment(rows, args.script, args.align, time_col, text_col, obj_col, verb_col)
        errors.extend(e5); warnings.extend(w5)
    elif args.script or args.align:
        warnings.append({
            "row": "GLOBAL",
            "type": "warning",
            "rule": "ALIGN_ARG",
            "msg": "--script 与 --align 需要同时提供才能校验数字对齐 (已忽略)",
        })

    def by_row(item):
        r = item.get("row", "ALL")
        if isinstance(r, int):
            return (0, r)
        if isinstance(r, str) and r.isdigit():
            return (0, int(r))
        return (1, str(r))

    errors.sort(key=by_row)
    warnings.sort(key=by_row)

    print("=" * 72)
    print(f"Storyboard Lint: {storyboard_path}")
    print(f"列: {header}")
    print(f"表格行数: {len(rows)}")
    print("-" * 72)
    if errors:
        print(f"❌ ERRORS ({len(errors)}):")
        for e in errors:
            print(f"  [行{e['row']}] [{e['rule']}] {e['msg']}")
    else:
        print("✅ 无错误")
    if warnings:
        print(f"⚠️  WARNINGS ({len(warnings)}):")
        for w in warnings:
            print(f"  [行{w['row']}] [{w['rule']}] {w['msg']}")
    else:
        print("✅ 无警告")
    print("-" * 72)
    print(f"✅通过项数 (非错非警行无法逐条，表格合规)")
    print(f"结果: {'PASS' if not errors else 'FAIL'} ({len(errors)} errors, {len(warnings)} warnings)")
    print("=" * 72)

    sys.exit(0 if not errors else 1)

if __name__ == "__main__":
    main()
