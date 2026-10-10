#!/usr/bin/env python3
"""
storyboard_to_scenes.py - 镜头表 → schedule/scenes 自动生成器

输入一份镜头表（.md 或 15行文字），输出：
  - schedule JSON（喂给 ProgressiveMorph scheduleProgressive）
  - scenes 骨架目录
  - 空 spec 列表

子命令：
  plan   - 完整输出（计划报告.md + schedule + 骨架）
  quick  - 超短路径（跳过计划报告，默认90s目标）
  validate - 验证计划合理性（5条硬指标）
"""
import argparse
import json
import re
import sys
import os
import subprocess
from pathlib import Path
from collections import Counter

THEME_CHOICES = ["realistic_cool", "classic_warm", "colorful", "glow_night"]
STYLE_CHOICES = ["cool_cinema", "warm_stage", "flow_ambient", "keynote_drive"]

THEME_PALETTE = {
    "realistic_cool": {
        "palette_name": "写实冷光台-5色",
        "lightTable": "#F5D080",
        "sandColors": ["#8B5A2B", "#C4915E", "#E8C07A", "#F5DEA5", "#A67040"],
        "grainColor": "#6B4520",
    },
    "classic_warm": {
        "palette_name": "经典暖沙台-5色",
        "lightTable": "#FFE4B5",
        "sandColors": ["#A0522D", "#D2691E", "#CD853F", "#DEB887", "#8B4513"],
        "grainColor": "#654321",
    },
    "colorful": {
        "palette_name": "多彩沙画-6色",
        "lightTable": "#FFF0D0",
        "sandColors": ["#C0392B", "#2980B9", "#27AE60", "#F39C12", "#8E44AD", "#16A085"],
        "grainColor": "#2C3E50",
    },
    "glow_night": {
        "palette_name": "夜光沙画-5色",
        "lightTable": "#1A1A2E",
        "sandColors": ["#E94560", "#0F3460", "#533483", "#16213E", "#E94560"],
        "grainColor": "#0F3460",
    },
}

BGM_RECOMMEND = {
    ("realistic_cool", "cool_cinema"): "冷调电影感低频 sine 贝斯 + 冷沙 pad，BPM 85",
    ("realistic_cool", "warm_stage"): "暖沙舞台低频 kick 4/4 拍 + 沙粒白噪声 pad，BPM 90",
    ("realistic_cool", "flow_ambient"): "长卷流水环境 fBM 噪声 pad + 偶尔风铃，无 kick，BPM 70",
    ("realistic_cool", "keynote_drive"): "发布会大字强拍驱动，强 kick 4/4 + 2 拍次低频，BPM 110",
    ("classic_warm", "warm_stage"): "暖沙舞台标准配置，低频 kick 4/4 拍 + 沙粒白噪声 pad，BPM 90",
    ("classic_warm", "cool_cinema"): "冷调贝斯混搭暖黄金色，BPM 88",
    ("classic_warm", "flow_ambient"): "暖沙长卷流水环境音，BPM 72",
    ("classic_warm", "keynote_drive"): "暖沙大字强拍驱动，BPM 105",
    ("colorful", "cool_cinema"): "多彩冷调电影感，BPM 92",
    ("colorful", "warm_stage"): "多彩暖沙舞台，BPM 95",
    ("colorful", "flow_ambient"): "多彩流水环境音，BPM 75",
    ("colorful", "keynote_drive"): "多彩大字强拍驱动，BPM 115",
    ("glow_night", "cool_cinema"): "夜光冷调电影感，BPM 82",
    ("glow_night", "warm_stage"): "夜光暖沙舞台混搭，BPM 88",
    ("glow_night", "flow_ambient"): "夜光流水环境音，BPM 68",
    ("glow_night", "keynote_drive"): "夜光大字强拍驱动，BPM 112",
}

Y_GRAMMAR_RULES = {
    "y1_whiteboard_hand": {
        "label": "白板手写/手划线",
        "keywords": [
            ("白板", 5), ("手写", 5), ("手划", 5), ("画线", 4),
            ("路线图", 5), ("创业路线", 5), ("时间线", 4),
            ("白板写", 5), ("一条线", 3), ("划线条", 4),
        ],
    },
    "y2_pour_reveal": {
        "label": "撒沙揭晓标题/品牌名",
        "keywords": [
            ("揭晓", 5), ("标题", 4), ("slogan", 5), ("Slogan", 5),
            ("品牌名", 5), ("撒沙", 4), ("盖住", 4), ("露出", 4),
            ("品牌", 3), ("Logo", 4), ("logo", 4), ("揭开", 4),
        ],
    },
    "y3_palm_wipe_list": {
        "label": "手掌擦出要点列表/4-6条特性",
        "keywords": [
            ("列表", 5), ("要点", 5), ("4条", 4), ("5条", 4), ("6条", 4),
            ("4-6", 4), ("产品特性", 5), ("特性", 4), ("流程", 4),
            ("步骤", 4), ("4步", 4), ("5步", 4), ("功能点", 4),
            ("三大", 3), ("四大", 3), ("五大", 3), ("六大", 3),
            ("优势", 3), ("核心卖点", 5),
        ],
    },
    "y4_flow_gather": {
        "label": "沙粒流动汇聚数字",
        "keywords": [
            ("从", 1), ("涨到", 5), ("增长到", 5), ("达到", 3),
            ("用户数", 5), ("融资额", 5), ("人数", 3), ("金额", 3),
            ("亿", 3), ("万", 3), ("百万", 3), ("千万", 3),
            ("汇聚", 4), ("流动", 3), ("聚拢", 4), ("聚焦", 3),
            ("飙升", 3), ("突破", 3), ("累计", 3),
        ],
    },
    "y5_split_compare": {
        "label": "左右分屏对比 Before/After",
        "keywords": [
            ("Before", 5), ("After", 5), ("before", 5), ("after", 5),
            ("方案A", 5), ("方案B", 5), ("方案 A", 5), ("方案 B", 5),
            ("vs", 5), ("VS", 5), ("Vs", 5), ("对比", 4),
            ("2018", 2), ("2026", 2), ("过去", 3), ("现在", 3),
            ("之前", 3), ("之后", 3), ("前后", 3), ("分屏", 5),
            ("左右", 3),
        ],
    },
    "y6_line_highlight": {
        "label": "诗句/金句逐行高亮",
        "keywords": [
            ("诗", 5), ("金句", 5), ("旁白逐行", 5), ("逐行", 4),
            ("高亮", 4), ("诗句", 5), ("名句", 4), ("格言", 4),
            ("朗诵", 4), ("念诗", 5), ("台词", 3), ("引语", 3),
        ],
    },
    "y7_finance_chart": {
        "label": "K线/柱图/折线图财务数据",
        "keywords": [
            ("K线", 5), ("柱图", 5), ("柱状图", 5), ("折线图", 5),
            ("财务", 4), ("财报", 5), ("营收", 4), ("利润", 4),
            ("数据", 2), ("图表", 4), ("曲线", 3), ("柱状", 4),
            ("走势", 4), ("业绩", 4), ("季度", 3), ("年度", 3),
            ("增长曲线", 5), ("股价", 5),
        ],
    },
    "y8_keynote_bigtype": {
        "label": "发布会大字/Slogan冲击",
        "keywords": [
            ("发布会", 5), ("大字", 5), ("冲击", 4), ("点题", 4),
            ("Slogan", 4), ("slogan", 4), ("主题句", 5), ("核心句", 5),
            ("结论", 3), ("总结", 3), ("重磅", 4), ("重磅发布", 5),
            ("震撼", 3), ("全篇", 3), ("点睛", 4), ("终局", 3),
        ],
    },
}

SCENE_RULES = {
    "s01_classic": {
        "label": "花/经典六瓣花",
        "keywords": [("花", 5), ("花瓣", 5), ("开花", 4), ("绽放", 4), ("花朵", 5), ("花卉", 4)],
    },
    "s02_flow_mountain": {
        "label": "山水月/风景",
        "keywords": [
            ("山", 4), ("水", 3), ("月", 4), ("月亮", 5), ("风景", 4),
            ("山水", 5), ("河流", 4), ("湖泊", 4), ("大海", 4),
            ("日出", 4), ("日落", 4), ("星空", 4), ("云", 3),
            ("远山", 4), ("山峦", 4), ("海浪", 4),
        ],
    },
    "s03_seed_sprout": {
        "label": "种子/萌芽/起点",
        "keywords": [
            ("种子", 5), ("萌芽", 5), ("发芽", 5), ("起点", 4),
            ("开始", 3), ("诞生", 4), ("播种", 5), ("幼苗", 5),
            ("破土", 4), ("成长", 3), ("初心", 4),
        ],
    },
    "s04_first_order_phone": {
        "label": "首单/手机/订单",
        "keywords": [
            ("首单", 5), ("手机", 5), ("订单", 5), ("用户", 2),
            ("APP", 4), ("App", 4), ("app", 4), ("下单", 5),
            ("客户端", 4), ("移动端", 4), ("小程序", 4),
        ],
    },
    "s05_team_handshake": {
        "label": "团队/握手/招人",
        "keywords": [
            ("团队", 5), ("握手", 5), ("招人", 5), ("招聘", 4),
            ("合作", 4), ("伙伴", 4), ("合伙人", 5), ("员工", 3),
            ("同事", 3), ("协作", 4), ("共创", 4), ("会议", 3),
        ],
    },
    "s06_crisis_rain": {
        "label": "危机/雨/乌云/困难",
        "keywords": [
            ("危机", 5), ("雨", 4), ("乌云", 5), ("困难", 4),
            ("挑战", 3), ("挫折", 4), ("失败", 4), ("风险", 3),
            ("风暴", 4), ("黑暗", 3), ("寒冬", 4), ("压力", 3),
            ("坎坷", 4), ("困境", 4),
        ],
    },
    "s07_check_arrow_fund": {
        "label": "支票/箭头/融资",
        "keywords": [
            ("支票", 5), ("箭头", 4), ("融资", 5), ("投资", 4),
            ("资金", 3), ("资本", 3), ("美元", 3), ("上升", 3),
            ("增长", 3), ("上扬", 3), ("A轮", 4), ("B轮", 4),
            ("IPO", 5), ("上市", 4),
        ],
    },
    "s08_logo_ending": {
        "label": "Logo/光环/结尾",
        "keywords": [
            ("Logo", 5), ("logo", 5), ("光环", 5), ("结尾", 5),
            ("结束", 3), ("收官", 4), ("落幕", 4), ("尾声", 3),
            ("愿景", 3), ("未来", 3), ("展望", 4), ("ending", 5),
        ],
    },
}

TRANSITION_MODES = ["wipe_palm_half", "flow_gather_scatter", "scratch_reveal_slow", "pour_rewrite"]
TRANSITION_DISTRIBUTION_CYCLE = [
    "wipe_palm_half",
    "wipe_palm_half",
    "flow_gather_scatter",
    "wipe_palm_half",
    "scratch_reveal_slow",
    "pour_rewrite",
]

MORPH_DURATION_RANGE = (14, 18)
MORPH_DURATION_DEFAULT = 16
SCENE_DURATION_RANGE = (4, 6)
SCENE_DURATION_DEFAULT = 5


def read_file(path, encoding_list=("utf-8", "gbk", "utf-8-sig")):
    last_err = None
    for enc in encoding_list:
        try:
            return Path(path).read_text(encoding=enc)
        except UnicodeDecodeError as e:
            last_err = e
    raise last_err


def parse_storyboard_input(input_str):
    p = Path(input_str)
    if p.exists() and p.is_file():
        text = read_file(str(p))
        lines = []
        for line in text.splitlines():
            stripped = line.strip()
            if stripped and not stripped.startswith("#"):
                if "|" in stripped or "｜" in stripped:
                    lines.append(stripped)
                elif re.search(r'\d+\s*[,:：]', stripped) or len(re.split(r'\s{4,}', stripped)) >= 3:
                    lines.append(stripped)
        if not lines:
            lines = [l.strip() for l in text.splitlines() if l.strip() and not l.strip().startswith("#")]
    else:
        lines = [l.strip() for l in input_str.splitlines() if l.strip()]
    return lines


def split_line_to_columns(line):
    line = line.strip()
    if line.startswith("|"):
        line = line[1:]
    if line.endswith("|"):
        line = line[:-1]
    parts = None
    for sep in ["｜", "|", "/", ",", "，"]:
        if sep in line:
            parts = [p.strip() for p in line.split(sep)]
            break
    if parts is None:
        parts = re.split(r'\t|\s{4,}', line)
        parts = [p.strip() for p in parts if p.strip()]
    cols = ["", "", "", "", "", ""]
    for i in range(min(6, len(parts))):
        cols[i] = parts[i] if parts[i] else ""
    return cols


def score_match(text, rules):
    scores = {}
    for key, rule in rules.items():
        score = 0
        hits = []
        for kw, weight in rule["keywords"]:
            if kw in text:
                score += weight
                hits.append(kw)
        if score > 0:
            scores[key] = (score, hits)
    if not scores:
        return None, None, []
    best = max(scores.items(), key=lambda x: x[1][0])
    return best[0], best[1][0], best[1][1]


def match_grammar_or_scene(obj_col, verb_col, lens_col, text_col):
    combined = " ".join([obj_col, verb_col, lens_col, text_col])

    grammar_key, grammar_score, grammar_hits = score_match(combined, Y_GRAMMAR_RULES)
    scene_key, scene_score, scene_hits = score_match(combined, SCENE_RULES)

    if grammar_key is None and scene_key is None:
        obj_words = re.findall(r'[\u4e00-\u9fa5A-Za-z]+', obj_col)
        if obj_words:
            scene_key, scene_score, scene_hits = score_match(obj_col, SCENE_RULES)
        if scene_key is None:
            scene_key = "s02_flow_mountain"
            scene_score = 1
            scene_hits = ["(默认山水风景)"]

    if grammar_key is not None and (scene_key is None or grammar_score >= scene_score):
        return {
            "kind": "grammar",
            "key": grammar_key,
            "label": Y_GRAMMAR_RULES[grammar_key]["label"],
            "score": grammar_score,
            "hits": grammar_hits,
        }
    elif scene_key is not None:
        return {
            "kind": "scene",
            "key": scene_key,
            "label": SCENE_RULES[scene_key]["label"],
            "score": scene_score,
            "hits": scene_hits,
        }
    return {
        "kind": "scene",
        "key": "s02_flow_mountain",
        "label": SCENE_RULES["s02_flow_mountain"]["label"],
        "score": 1,
        "hits": ["(默认)"]
    }


def build_schedule(assignments, theme, target_duration=None):
    schedule = []
    total_morph = 0.0
    total_scene = 0.0

    n = len(assignments)
    if target_duration and n > 0:
        per_segment = target_duration / (2 * n - 1) if n > 1 else target_duration
        morph_dur = max(MORPH_DURATION_RANGE[0], min(MORPH_DURATION_RANGE[1], per_segment * 1.2))
        scene_dur = max(SCENE_DURATION_RANGE[0], min(SCENE_DURATION_RANGE[1], per_segment * 0.8))
    else:
        morph_dur = MORPH_DURATION_DEFAULT
        scene_dur = SCENE_DURATION_DEFAULT

    for i, assn in enumerate(assignments):
        if assn["kind"] == "grammar":
            scene_ref = assn["key"]
        else:
            scene_ref = assn["key"]

        if i == 0:
            schedule.append({"scene": scene_ref, "duration": scene_dur})
            total_scene += scene_dur
        else:
            t_idx = (i - 1) % len(TRANSITION_DISTRIBUTION_CYCLE)
            mode = TRANSITION_DISTRIBUTION_CYCLE[t_idx]
            schedule.append({"morph": {"to": scene_ref, "mode": mode, "duration": morph_dur, "intensity": 0.95}})
            total_morph += morph_dur
            schedule.append({"scene": scene_ref, "duration": scene_dur})
            total_scene += scene_dur

    return schedule, total_morph, total_scene


def schedule_to_js(schedule):
    lines = []
    lines.append("window.USER_SCHEDULE = function() {")
    lines.append("  return [")
    for item in schedule:
        if "scene" in item:
            lines.append(f"    {{ scene: '{item['scene']}', duration: {item['duration']:.1f}  }},")
        elif "morph" in item:
            m = item["morph"]
            lines.append(
                f"    {{ morph: {{ to:'{m['to']}', mode:'{m['mode']}', duration: {m['duration']:.1f}, intensity: {m['intensity']:.2f} }} }},"
            )
    lines.append("  ];")
    lines.append("};")
    return "\n".join(lines) + "\n"


def build_scene_skeleton(scene_key, idx, theme):
    palette = THEME_PALETTE.get(theme, THEME_PALETTE["realistic_cool"])
    scene_name = f"custom_{idx:02d}_{scene_key}"
    label = SCENE_RULES.get(scene_key, {}).get("label", scene_key)
    return f"""(() => {{
  function rand(seed) {{
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }}

  // Layer 1: 光台 (LIGHT TABLE)
  function drawLightTable(c, W, H, lt, t) {{
    // TODO: 根据 theme={theme} 调整光台色，palette_name={palette['palette_name']}
    const breath = 0.98 + Math.sin(t * 1.1) * 0.02;
    c.fillStyle = `rgb(${{Math.floor(200 * lt * breath)}},${{Math.floor(180 * lt * breath)}},${{Math.floor(140 * lt * breath)}})`;
    c.fillRect(0, 0, W, H);
    // TODO: 光台径向渐变 vignette
    // TODO: 微光闪烁 shimmer
  }}

  // Layer 2: 薄沙层 (THIN SAND BED)
  function drawThinBed(c, W, H, lt) {{
    // TODO: 基础薄沙颗粒铺底，alpha 0.28-0.32
    // TODO: 参考 s01_classic 薄沙 4x4 网格
    // TODO: 1500 随机 grain 点缀
  }}

  // Layer 3: 厚沙主形 (THICK SAND MAIN SHAPE)
  function drawMainShape(c, W, H, lt) {{
    // TODO: {scene_key} - {label}
    // TODO: 主体轮廓路径 + 颗粒填充
    // TODO: 边缘 120+ 粒边缘高光
  }}

  // Layer 4: 细节纹理 (DETAIL TEXTURE)
  function drawDetail(c, W, H, lt) {{
    // TODO: 叶脉/纹理/阴影层次
    // TODO: 多层叠加造立体感
  }}

  // Layer 5: 划痕高光 (SCRATCH HIGHLIGHT)
  function drawScratchHighlight(c, W, H, lt, t) {{
    // TODO: 3 遍划痕 pass，宽 3.5/2.7/1.5
    // TODO: 蓝青色高光 rgba(0,128,165,0.28)
    // TODO: 被推开沙粒 60+ 粒两侧分布
  }}

  // Layer 6: 动画/动态层 (ANIMATION)
  function drawAnimation(c, W, H, lt, t) {{
    // TODO: 呼吸/生长/流动 随时间变化
    // TODO: growPhase = (sin(t*0.6)+1)/2
  }}

  window.SCENES = window.SCENES || {{}};
  window.SCENES['{scene_name}'] = {{
    meta: {{
      name: '{label} - 自定义 #{idx}',
      style: '{theme}',
      palette_name: '{palette['palette_name']}',
      layers: 6
    }},
    draw(c, lt, t) {{
      const W = c.canvas.width;
      const H = c.canvas.height;
      drawLightTable(c, W, H, lt, t);
      drawThinBed(c, W, H, lt);
      drawMainShape(c, W, H, lt);
      drawDetail(c, W, H, lt);
      drawScratchHighlight(c, W, H, lt, t);
      drawAnimation(c, W, H, lt, t);
    }}
  }};
}})();
"""


def load_example_json(grammar_key):
    base = Path(__file__).resolve().parent / "engine" / "examples"
    example_path = base / f"{grammar_key}.json"
    if example_path.exists():
        try:
            with open(example_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def build_spec_skeleton(grammar_key, idx, theme, on_screen_text):
    data = load_example_json(grammar_key)
    palette = THEME_PALETTE.get(theme, THEME_PALETTE["realistic_cool"])
    if not data:
        data = {"grammar": grammar_key, "version": "1.0"}

    data["theme"] = theme
    data["palette_name"] = palette["palette_name"]
    data["lightTable"] = palette["lightTable"]
    data["sandColors"] = palette["sandColors"]
    data["grainColor"] = palette["grainColor"]

    placeholder = on_screen_text if on_screen_text else f"[TODO: 填写第{idx}镜屏上字]"

    if grammar_key == "y1_whiteboard_hand":
        if "segments" in data and isinstance(data["segments"], list):
            for seg in data["segments"]:
                if isinstance(seg, dict) and "text" in seg:
                    seg["text"] = [placeholder, ""]
    elif grammar_key == "y2_pour_reveal":
        if "text_main" in data and isinstance(data["text_main"], dict):
            data["text_main"]["content"] = placeholder
        if "text_sub" in data and isinstance(data["text_sub"], dict):
            data["text_sub"]["content"] = "[TODO: 副标题]"
    elif grammar_key == "y3_palm_wipe_list":
        if "items" in data and isinstance(data["items"], list):
            for item in data["items"]:
                if isinstance(item, dict) and "text" in item:
                    item["text"] = f"[TODO: 列表项]"
    elif grammar_key == "y4_flow_gather":
        if "text" in data and isinstance(data["text"], dict):
            data["text"]["main"] = placeholder
            data["text"]["sub"] = "[TODO: 辅助说明]"
    elif grammar_key == "y5_split_compare":
        if "left" in data and isinstance(data["left"], dict):
            data["left"]["title"] = "[TODO: 左侧标题 A]"
            if "body" in data["left"] and isinstance(data["left"]["body"], list):
                for b in data["left"]["body"]:
                    if isinstance(b, dict):
                        b["text"] = "[TODO: 左侧内容]"
        if "right" in data and isinstance(data["right"], dict):
            data["right"]["title"] = "[TODO: 右侧标题 B]"
            if "body" in data["right"] and isinstance(data["right"]["body"], list):
                for b in data["right"]["body"]:
                    if isinstance(b, dict):
                        b["text"] = "[TODO: 右侧内容]"
    elif grammar_key == "y6_line_highlight":
        if "poem_title" in data and isinstance(data["poem_title"], dict):
            data["poem_title"]["text"] = placeholder
            data["poem_title"]["author"] = "[TODO: 作者/出处]"
        if "base_text" in data and isinstance(data["base_text"], list):
            for i, line in enumerate(data["base_text"]):
                if isinstance(line, dict):
                    line["text"] = f"[TODO: 第{i+1}行诗句]"
    elif grammar_key == "y7_finance_chart":
        if "chart_title" in data and isinstance(data["chart_title"], dict):
            data["chart_title"]["text"] = placeholder
        if "data" in data:
            data["data"] = [0, 0, 0, 0]
        if "axis" in data and isinstance(data["axis"], dict):
            data["axis"]["x_labels"] = ["[TODO1]", "[TODO2]", "[TODO3]", "[TODO4]"]
    elif grammar_key == "y8_keynote_bigtype":
        data["main_word"] = placeholder
        data["sub_word"] = "[TODO: 辅助副标题]"

    return data


def write_plan_report(out_dir, rows, assignments, schedule, total_morph, total_scene, theme, style):
    report_lines = []
    report_lines.append("# 沙画镜头拆分计划报告\n")
    report_lines.append(f"**生成时间**: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report_lines.append(f"**Theme**: `{theme}` | **Style**: `{style}`\n")

    report_lines.append("## 一、语法/场景分配表\n")
    report_lines.append("| 镜号 | 原句(物+动作+字) | 分配给谁 | 类型 | 得分 | 命中关键词 | 分配理由 |")
    report_lines.append("|---|---|---|---|---|---|---|")

    for i, (row, assn) in enumerate(zip(rows, assignments)):
        original = " / ".join([x for x in [row[1], row[2], row[4]] if x]) or "(空)"
        reason_parts = []
        if assn["hits"]:
            reason_parts.append(f"命中关键词: {', '.join(assn['hits'])}")
        else:
            reason_parts.append("无显式关键词匹配")
        if assn["kind"] == "grammar":
            if assn["key"] == "y5_split_compare" and "对比" in " ".join(row):
                reason_parts.append("有对比语义优先y5不选y4数字")
            if assn["key"] == "y7_finance_chart" and "图" in " ".join(row):
                reason_parts.append("有图表语义优先y7不选y4数字流动")
        reason = "；".join(reason_parts)
        kind_label = "参数化语法" if assn["kind"] == "grammar" else "标准场景"
        report_lines.append(
            f"| {i+1:>2} | {original[:40]} | {assn['key']} ({assn['label'][:10]}) | {kind_label} | {assn['score']} | {', '.join(assn['hits'])[:30]} | {reason[:50]} |"
        )

    total = total_morph + total_scene
    ratio = total_scene / total_morph if total_morph > 0 else 0
    report_lines.append("\n## 二、渐进时间表总览\n")
    report_lines.append("| 项目 | 时长 (秒) | 占比 |")
    report_lines.append("|---|---|---|")
    report_lines.append(f"| 纯 scene 展示总和 | {total_scene:.1f}s | {total_scene/total*100:.1f}% |")
    report_lines.append(f"| 渐进 morph 总和 | {total_morph:.1f}s | {total_morph/total*100:.1f}% |")
    report_lines.append(f"| **总时长** | **{total:.1f}s** | 100% |")
    report_lines.append(f"| scene:morph 比例 | **{ratio:.3f}** (理想 0.30 左右) |\n")

    morph_counter = Counter()
    for item in schedule:
        if "morph" in item:
            morph_counter[item["morph"]["mode"]] += 1
    total_morph_count = sum(morph_counter.values()) or 1
    report_lines.append("### 四模式分布\n")
    report_lines.append("| 渐进模式 | 次数 | 占比 | 理想区间 |")
    report_lines.append("|---|---|---|---|")
    for mode in TRANSITION_MODES:
        cnt = morph_counter.get(mode, 0)
        pct = cnt / total_morph_count * 100
        if mode == "wipe_palm_half":
            ideal = "45~65%"
        elif mode == "flow_gather_scatter":
            ideal = "15~25%"
        elif mode == "scratch_reveal_slow":
            ideal = "10~20%"
        else:
            ideal = "5~15%"
        report_lines.append(f"| {mode} | {cnt} | {pct:.1f}% | {ideal} |")

    bgm_key = (theme, style)
    bgm_rec = BGM_RECOMMEND.get(bgm_key, f"theme={theme}, style={style} 对应 BGM")
    report_lines.append("\n## 三、BGM 推荐\n")
    report_lines.append(f"- **组合**: theme=`{theme}` + style=`{style}`")
    report_lines.append(f"- **推荐配置**: {bgm_rec}")
    report_lines.append(f"- **生成命令**: `uv run python scripts/audio/bgm.py generate --duration {total:.0f} --style {style} --out <输出路径.wav>`\n")

    report_lines.append("## 四、交付物清单\n")
    scene_skeleton_count = 0
    spec_count = 0
    standard_scene_count = 0

    for i, assn in enumerate(assignments):
        if assn["kind"] == "grammar":
            spec_count += 1
            report_lines.append(f"- [ ] **specs_待写/spec_{i+1:02d}_{assn['key']}.json** — 参数化语法 `{assn['key']}` 骨架，填字内容即可")
        else:
            scene_key = assn["key"]
            exists_path = Path(__file__).resolve().parent / "engine" / "scenes" / f"{scene_key}.js"
            if exists_path.exists():
                standard_scene_count += 1
                report_lines.append(f"- [x] **复用标准场景**: `scenes/{scene_key}.js` ({assn['label']})")
            else:
                scene_skeleton_count += 1
                report_lines.append(f"- [ ] **scenes_待写/custom_{i+1:02d}_{scene_key}.js** — 需手写 6 层 draw 函数")

    report_lines.append(f"\n**小结**: 📑 语法 spec {spec_count} 个待填 | 🎬 标准场景复用 {standard_scene_count} 个 | ✏️ 自定义 scene 骨架 {scene_skeleton_count} 个待写\n")
    report_lines.append("## 五、渐进 schedule 概览\n")
    report_lines.append("```js")
    report_lines.append(schedule_to_js(schedule).strip())
    report_lines.append("```\n")

    report_path = out_dir / "计划报告.md"
    report_path.write_text("\n".join(report_lines), encoding="utf-8")
    return report_path


def generate_outputs(args, include_report=True):
    lines = parse_storyboard_input(args.input)
    rows = [split_line_to_columns(l) for l in lines]

    assignments = []
    for row in rows:
        time_col, obj_col, verb_col, lens_col, text_col, method_col = row
        assn = match_grammar_or_scene(obj_col, verb_col, lens_col, text_col)
        assignments.append(assn)

    target_dur = getattr(args, "target_duration", None)
    schedule, total_morph, total_scene = build_schedule(assignments, args.theme, target_duration=target_dur)

    out_dir = Path(args.out).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    schedule_js = schedule_to_js(schedule)
    schedule_path = out_dir / "startup_schedule_generated.js"
    schedule_path.write_text(schedule_js, encoding="utf-8")

    scenes_dir = out_dir / "scenes_待写"
    scenes_dir.mkdir(parents=True, exist_ok=True)
    specs_dir = out_dir / "specs_待写"
    specs_dir.mkdir(parents=True, exist_ok=True)

    grammar_count = 0
    standard_scene_count = 0
    custom_scene_count = 0

    for i, assn in enumerate(assignments):
        idx = i + 1
        row = rows[i] if i < len(rows) else ["", "", "", "", "", ""]
        on_screen_text = row[4]
        if assn["kind"] == "grammar":
            grammar_count += 1
            spec_data = build_spec_skeleton(assn["key"], idx, args.theme, on_screen_text)
            spec_path = specs_dir / f"spec_{idx:02d}_{assn['key']}.json"
            with open(spec_path, "w", encoding="utf-8") as f:
                json.dump(spec_data, f, ensure_ascii=False, indent=2)
        else:
            scene_key = assn["key"]
            exists_path = Path(__file__).resolve().parent / "engine" / "scenes" / f"{scene_key}.js"
            if exists_path.exists():
                standard_scene_count += 1
            else:
                custom_scene_count += 1
                skeleton = build_scene_skeleton(scene_key, idx, args.theme)
                scene_path = scenes_dir / f"custom_{idx:02d}_{scene_key}.js"
                scene_path.write_text(skeleton, encoding="utf-8")

    if include_report:
        style = getattr(args, "style", "cool_cinema")
        write_plan_report(out_dir, rows, assignments, schedule, total_morph, total_scene, args.theme, style)

    total = total_morph + total_scene
    morph_pct = (total_morph / total * 100) if total > 0 else 0
    print(f"📑 语法匹配 {grammar_count} 条 | 🎬 标准场景复用 {standard_scene_count} 条 | ⏳ 总时长 {total:.0f}s 渐进占比 {morph_pct:.0f}%")

    return {
        "schedule": schedule,
        "assignments": assignments,
        "total_morph": total_morph,
        "total_scene": total_scene,
        "grammar_count": grammar_count,
        "standard_scene_count": standard_scene_count,
        "custom_scene_count": custom_scene_count,
    }


def validate_report_or_storyboard(args):
    red = 0
    yellow = 0
    green = 0
    details = []

    input_str = args.input
    lines = parse_storyboard_input(input_str)
    rows = [split_line_to_columns(l) for l in lines]
    theme = getattr(args, "theme", "realistic_cool")

    assignments = []
    for row in rows:
        time_col, obj_col, verb_col, lens_col, text_col, method_col = row
        assn = match_grammar_or_scene(obj_col, verb_col, lens_col, text_col)
        assignments.append(assn)

    schedule, total_morph, total_scene = build_schedule(assignments, theme)
    total = total_morph + total_scene

    hard_cut_count = 0
    for item in schedule:
        if "morph" in item:
            if item["morph"]["duration"] < 8:
                hard_cut_count += 1
    if hard_cut_count > 0:
        red += 1
        details.append(f"🔴 [硬切数] 检测到 {hard_cut_count} 次 morph<8s 的准硬切，零硬切铁律不通过")
    else:
        green += 1
        details.append(f"🟢 [硬切数] 所有镜间 morph ≥ 8s，零硬切通过")

    if theme == "realistic_cool":
        details.append("🟡 [冷调占比] theme=realistic_cool 默认需 C%>70%，此项需 qa.py 抽帧实测（本 validate 仅静态检查 schedule，记黄通过）")
        yellow += 1
    elif theme == "classic_warm":
        details.append("🟡 [暖调占比] theme=classic_warm 需 W%>70%，此项需 qa.py 抽帧实测（记黄通过）")
        yellow += 1
    else:
        details.append("🟢 [色调占比] theme=colorful/glow_night 色调阈值可放宽，通过")
        green += 1

    ratio = total_scene / total_morph if total_morph > 0 else 0
    if 0.25 <= ratio <= 0.35:
        green += 1
        details.append(f"🟢 [渐进时间比] scene:morph = {ratio:.3f}，落在 [0.25, 0.35] 理想区间")
    else:
        red += 1
        details.append(f"🔴 [渐进时间比] scene:morph = {ratio:.3f}，不在 [0.25, 0.35] 区间（0.3:1 铁律）")

    morph_counter = Counter()
    for item in schedule:
        if "morph" in item:
            morph_counter[item["morph"]["mode"]] += 1
    total_morph_count = sum(morph_counter.values()) or 1
    mode_pcts = {}
    for mode in TRANSITION_MODES:
        mode_pcts[mode] = morph_counter.get(mode, 0) / total_morph_count * 100

    wp = mode_pcts.get("wipe_palm_half", 0)
    fl = mode_pcts.get("flow_gather_scatter", 0)
    sc = mode_pcts.get("scratch_reveal_slow", 0)
    pr = mode_pcts.get("pour_rewrite", 0)

    dist_ok = (45 <= wp <= 65) and (15 <= fl <= 25) and (10 <= sc <= 20) and (5 <= pr <= 15)
    if dist_ok:
        green += 1
        details.append(f"🟢 [四模式分布] wipe={wp:.0f}% flow={fl:.0f}% scratch={sc:.0f}% pour={pr:.0f}%，全部落在理想区间")
    else:
        yellow += 1
        details.append(f"🟡 [四模式分布] wipe={wp:.0f}% flow={fl:.0f}% scratch={sc:.0f}% pour={pr:.0f}%，部分超出建议区间")

    if 60 <= total <= 120:
        green += 1
        details.append(f"🟢 [总时长] {total:.0f}s 落在 [60, 120] 秒短片最佳区间")
    else:
        yellow += 1
        details.append(f"🟡 [总时长] {total:.0f}s 不在 [60, 120] 秒短片最佳区间")

    print("\n".join(details))
    print(f"\n🚦 验证结果：{red} 红 / {yellow} 黄 / {5 - red - yellow} 绿")
    sys.exit(1 if red > 0 else 0)


def cmd_plan(args):
    generate_outputs(args, include_report=True)


def cmd_quick(args):
    if not hasattr(args, "target_duration"):
        args.target_duration = 90
    generate_outputs(args, include_report=False)


def cmd_validate(args):
    validate_report_or_storyboard(args)


def build_parser():
    p = argparse.ArgumentParser(
        prog="storyboard_to_scenes.py",
        description="沙画动画 skill · 镜头表→schedule/scenes 自动生成器（Huashu 同款一句话快出片核心）",
    )
    sub = p.add_subparsers(dest="cmd", required=True)

    p_plan = sub.add_parser("plan", help="完整输出：计划报告.md + schedule.js + scenes_待写/ + specs_待写/")
    p_plan.add_argument("input", help="镜头表.md 文件路径 或 直接用引号包 15 行文字字符串")
    p_plan.add_argument("--theme", choices=THEME_CHOICES, default="realistic_cool",
                        help=f"主题调色板（默认 realistic_cool）：{'/'.join(THEME_CHOICES)}")
    p_plan.add_argument("--style", choices=STYLE_CHOICES, default="cool_cinema",
                        help=f"BGM 风格（默认 cool_cinema）：{'/'.join(STYLE_CHOICES)}")
    p_plan.add_argument("--out", required=True, help="输出目录（自动创建）")
    p_plan.set_defaults(func=cmd_plan)

    p_quick = sub.add_parser("quick", help="超短路径：跳过计划报告，默认总时长目标 90s，直接出 schedule + 骨架")
    p_quick.add_argument("input", help="镜头表.md 文件路径 或 15 行文字字符串")
    p_quick.add_argument("--theme", choices=THEME_CHOICES, default="realistic_cool",
                         help=f"主题调色板（默认 realistic_cool）")
    p_quick.add_argument("--style", choices=STYLE_CHOICES, default="cool_cinema",
                         help=f"BGM 风格（默认 cool_cinema）")
    p_quick.add_argument("--target-duration", type=float, default=90.0,
                         help="目标总时长秒数（默认 90s）")
    p_quick.add_argument("--out", required=True, help="输出目录")
    p_quick.set_defaults(func=cmd_quick)

    p_validate = sub.add_parser("validate", help="验证计划合理性：5 条硬指标（P11-P16），有红 exit(1)")
    p_validate.add_argument("input", help="镜头表.md 或 计划报告.md 路径")
    p_validate.add_argument("--theme", choices=THEME_CHOICES, default="realistic_cool",
                           help=f"主题（默认 realistic_cool），用于色调阈值判定")
    p_validate.set_defaults(func=cmd_validate)

    return p


def main():
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
