# 沙画语法 y6 · 逐行高亮型

> 一段 4~8 行文字，亮划痕从左扫到右逐行高亮。
> 参考：`scripts/engine/examples/y6_line_highlight.json`

## 何时用

一段 4~8 行文字，逐行高亮，经典诗词、金句、段落旁白配合口播。

## 规格约束

1. 单段 ≤ 7.5s
2. 每行高亮用时 = 行字数 × 0.12s + 0.10s
3. 高亮是「亮划痕沿字行从左扫到右」，不是换颜色
4. 行间距 ≥ 行高 × 1.4
5. 整段不超过 7 行
6. 字每行 ≤ 10 字；未高亮行沙厚 0.6 半暗，高亮行透光 0.9 亮

## spec JSON 字段

| 字段名 | 类型 | 约束 | 示例值 |
|---|---|---|---|
| `grammar` | string | 固定 `y6_line_highlight` | `"y6_line_highlight"` |
| `version` | string | 版本号 | `"1.0"` |
| `theme` | string | 主题名 | `"classic_warm"` |
| `palette_name` | string | 调色板名 | `"暖沙标准-5色"` |
| `lightTable` | string | 光台色 HEX | `"#F5D080"` |
| `sandColors` | string[] | 沙色数组 5 色 | `["#8B5A2B","#C4915E","#E8C07A","#F5DEA5","#A67040"]` |
| `grainColor` | string | 颗粒色 HEX | `"#6B4520"` |
| `thinSandAlpha` | number | 薄沙透明度 0~1 | `0.55` |
| `thickSandAlpha` | number | 厚沙透明度 0~1 | `0.92` |
| `grainSize` | number | 颗粒尺寸 px | `3.0` |
| `duration` | number | 总时长秒 ≤7.5 | `7.5` |
| `resolution` | number[] | [宽,高] 像素 | `[1920, 1080]` |
| `fps` | number | 帧率 | `30` |
| `poem_title` | object | 标题+作者对象 | 见下 |
| `poem_title.text` | string | 标题文字 | `"静夜思"` |
| `poem_title.author` | string | 作者名 | `"李白"` |
| `poem_title.pos` | number[] | 标题中心 [x,y] | `[960, 160]` |
| `poem_title.title_size` | number | 标题字号 px | `56` |
| `poem_title.author_size` | number | 作者字号 px | `32` |
| `poem_title.appearedAt` | number | 标题出现时刻秒 | `0.3` |
| `base_text` | object[] | 基础文字行数组 4~7 行 | 见下 |
| `base_text[].line_idx` | number | 行索引 0 起 | `0` |
| `base_text[].text` | string | 该行文字 ≤10字 | `"床前明月光，"` |
| `base_text[].pos` | number[] | 该行位置 [x,y] | `[960, 340]` |
| `base_text[].size` | number | 该行字号 px | `72` |
| `base_text[].weight` | number | 该行字重 | `500` |
| `base_text[].align` | string | 对齐方式 `center`/`left`/`right` | `"center"` |
| `base_text[].base_sandColorIdx` | number | 未高亮沙色索引（半暗） | `4` |
| `base_text[].base_alpha` | number | 未高亮透明度 ≈0.45~0.6 | `0.45` |
| `highlight` | object[] | 高亮配置数组（与 base_text 行数一致） | 见下 |
| `highlight[].line_idx` | number | 对应行索引 | `0` |
| `highlight[].t_start` | number | 该行高亮开始秒 | `1.0` |
| `highlight[].t_end` | number | 该行高亮结束秒 | `2.2` |
| `highlight[].highlight_sandColorIdx` | number | 高亮沙色索引（透光） | `0` |
| `highlight[].scratch_animation` | boolean | 是否启用划痕扫动动画 | `true` |
| `highlight[].glow_boost` | number | 高亮发光增强 0~0.5 | `0.3` |
| `background_doodle` | object | 背景涂鸦配置 | 见下 |
| `background_doodle.type` | string | 背景涂鸦类型 | `"moon_and_window"` |
| `background_doodle.pos` | number[] | 背景涂鸦位置 [x,y] | `[1600, 220]` |
| `background_doodle.scale` | number | 背景涂鸦缩放 | `0.9` |
| `background_doodle.alpha` | number | 背景涂鸦透明度 | `0.35` |
| `background_doodle.appearedAt` | number | 背景涂鸦出现秒 | `0.5` |
| `motifs` | object[] | 装饰图案数组 | 见下 |

## 起手模板

```json
{
  "grammar": "y6_line_highlight",
  "version": "1.0",
  "theme": "classic_warm",
  "palette_name": "暖沙标准-5色",
  "lightTable": "#F5D080",
  "sandColors": [
    "#8B5A2B",
    "#C4915E",
    "#E8C07A",
    "#F5DEA5",
    "#A67040"
  ],
  "grainColor": "#6B4520",
  "thinSandAlpha": 0.55,
  "thickSandAlpha": 0.92,
  "grainSize": 3.0,
  "duration": 7.5,
  "resolution": [1920, 1080],
  "fps": 30,
  "poem_title": {
    "text": "段落标题",
    "author": "作者/出处",
    "pos": [960, 160],
    "title_size": 56,
    "author_size": 32,
    "appearedAt": 0.3
  },
  "base_text": [
    {
      "line_idx": 0,
      "text": "金句第一行，",
      "pos": [960, 340],
      "size": 72,
      "weight": 500,
      "align": "center",
      "base_sandColorIdx": 4,
      "base_alpha": 0.45
    },
    {
      "line_idx": 1,
      "text": "金句第二行，",
      "pos": [960, 460],
      "size": 72,
      "weight": 500,
      "align": "center",
      "base_sandColorIdx": 4,
      "base_alpha": 0.45
    },
    {
      "line_idx": 2,
      "text": "金句第三行，",
      "pos": [960, 580],
      "size": 72,
      "weight": 500,
      "align": "center",
      "base_sandColorIdx": 4,
      "base_alpha": 0.45
    },
    {
      "line_idx": 3,
      "text": "金句第四行。",
      "pos": [960, 700],
      "size": 72,
      "weight": 500,
      "align": "center",
      "base_sandColorIdx": 4,
      "base_alpha": 0.45
    }
  ],
  "highlight": [
    {
      "line_idx": 0,
      "t_start": 1.0,
      "t_end": 2.2,
      "highlight_sandColorIdx": 0,
      "scratch_animation": true,
      "glow_boost": 0.3
    },
    {
      "line_idx": 1,
      "t_start": 2.4,
      "t_end": 3.6,
      "highlight_sandColorIdx": 0,
      "scratch_animation": true,
      "glow_boost": 0.3
    },
    {
      "line_idx": 2,
      "t_start": 3.8,
      "t_end": 5.0,
      "highlight_sandColorIdx": 0,
      "scratch_animation": true,
      "glow_boost": 0.3
    },
    {
      "line_idx": 3,
      "t_start": 5.2,
      "t_end": 6.8,
      "highlight_sandColorIdx": 0,
      "scratch_animation": true,
      "glow_boost": 0.4
    }
  ],
  "background_doodle": {
    "type": "moon_and_window",
    "pos": [1600, 220],
    "scale": 0.9,
    "alpha": 0.35,
    "appearedAt": 0.5
  },
  "motifs": [
    {"id": "m5", "amp": 0.04, "freq": 0.25},
    {"id": "m4", "area": [300, 280, 1620, 780], "freq": 8}
  ]
}
```

## 好例 vs 坏例

**好例**：《静夜思》4 行诗句，先以半暗沙色全部铺出，然后亮划痕从左至右逐行扫过，每扫一行该行沙被刮开露出光台色，高亮时长 = 字数×0.12s+0.1s，最后一行高亮完停留 1.2s 再整体淡出。

**坏例**：
- 高亮只是换颜色深浅，没有 scratch 划痕从左扫到右的动画
- 行间距太窄（< 1.4×行高），扫动时上一行的划痕误碰到下一行
- 每行 15 字超出 10 字限制，挤压字号太小看不清
- 只有 3 行或超过 7 行，不符合行数规范
- 高亮时像素亮度提升不足 50%，和未高亮区分不开

## QA 自检 5 条

1. 4 ≤ 行数 ≤ 7
2. 每行高亮时长 = 0.12s×字数 + 0.1s ± 0.05
3. 高亮扫过时刻像素亮于未高亮 50% 以上
4. 每行 ≤ 10 字
5. 最后一行高亮完停 1.2s 后淡出
