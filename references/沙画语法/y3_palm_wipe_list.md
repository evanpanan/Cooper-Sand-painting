# 沙画语法 y3 · 手掌扫列表型

> 手掌扫一行现一行，逐条揭示要点。
> 参考：`scripts/engine/examples/y3_palm_wipe_list.json`

## 何时用

4 点要点，手掌扫一行现一行。常见产品特性列表、流程 4 步、会议要点。

## 规格约束

1. 单段 ≤ 8s
2. 4 条 ≤ 条数 ≤ 6 条
3. 每条扫过用 t_wipe_palm 的迷你版 0.35s
4. 每条最多 10 字
5. 行与行间距 = 行高 × 1.3
6. 最后一条出完停 1.5s 给读；手掌方向从上到下，不是从左到右

## spec JSON 字段

| 字段名 | 类型 | 约束 | 示例值 |
|---|---|---|---|
| `grammar` | string | 固定 `y3_palm_wipe_list` | `"y3_palm_wipe_list"` |
| `version` | string | 版本号 | `"1.0"` |
| `theme` | string | 主题名 | `"classic_warm"` |
| `palette_name` | string | 调色板名 | `"暖沙标准-5色"` |
| `lightTable` | string | 光台色 HEX | `"#F5D080"` |
| `sandColors` | string[] | 沙色数组 5 色 | `["#8B5A2B","#C4915E","#E8C07A","#F5DEA5","#A67040"]` |
| `grainColor` | string | 颗粒色 HEX | `"#6B4520"` |
| `thinSandAlpha` | number | 薄沙透明度 0~1 | `0.55` |
| `thickSandAlpha` | number | 厚沙透明度 0~1 | `0.92` |
| `grainSize` | number | 颗粒尺寸 px | `2.5` |
| `duration` | number | 总时长秒 ≤8 | `8.0` |
| `resolution` | number[] | [宽,高] 像素 | `[1920, 1080]` |
| `fps` | number | 帧率 | `30` |
| `wipe_direction` | string | 扫动方向 `top_to_bottom`/`left_to_right` | `"left_to_right"` |
| `layout` | string | 布局方式 `center_stack` | `"center_stack"` |
| `item_layout` | object | 条目布局配置 | 见下 |
| `item_layout.start_y` | number | 首条目起始 y 坐标 px | `280` |
| `item_layout.spacing_y` | number | 条目间垂直间距 px | `180` |
| `item_layout.icon_x` | number | 图标 x 坐标 px | `640` |
| `item_layout.text_x` | number | 文字起始 x 坐标 px | `800` |
| `item_layout.item_width` | number | 单条目宽度 px | `640` |
| `item_dwell_sec` | number | 每条停留时间秒 | `2.0` |
| `wipe_transition_sec` | number | 扫过过渡时间秒 ≈0.35 | `0.4` |
| `items` | object[] | 条目数组 4~6 条 | 见下 |
| `items[].idx` | number | 条目索引 0 起 | `0` |
| `items[].icon` | string | 图标名 | `"rocket"` |
| `items[].icon_scale` | number | 图标缩放 | `1.0` |
| `items[].icon_sandColorIdx` | number | 图标沙色索引 | `2` |
| `items[].text` | string | 条目文字 ≤10字 | `"专注沙画"` |
| `items[].text_size` | number | 文字字号 px | `64` |
| `items[].text_weight` | number | 文字字重 | `600` |
| `items[].t_start` | number | 该条开始扫动时刻秒 | `0.2` |
| `items[].t_end` | number | 该条揭示完成时刻秒 | `2.0` |
| `items[].doodle` | string | 条目装饰涂鸦类型 | `"sparkle_trail"` |
| `motifs` | object[] | 装饰图案数组 | 见下 |

## 起手模板

```json
{
  "grammar": "y3_palm_wipe_list",
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
  "grainSize": 2.5,
  "duration": 8.0,
  "resolution": [1920, 1080],
  "fps": 30,
  "wipe_direction": "left_to_right",
  "layout": "center_stack",
  "item_layout": {
    "start_y": 280,
    "spacing_y": 180,
    "icon_x": 640,
    "text_x": 800,
    "item_width": 640
  },
  "item_dwell_sec": 2.0,
  "wipe_transition_sec": 0.4,
  "items": [
    {
      "idx": 0,
      "icon": "rocket",
      "icon_scale": 1.0,
      "icon_sandColorIdx": 2,
      "text": "要点一",
      "text_size": 64,
      "text_weight": 600,
      "t_start": 0.2,
      "t_end": 2.0,
      "doodle": "sparkle_trail"
    },
    {
      "idx": 1,
      "icon": "trophy",
      "icon_scale": 1.0,
      "icon_sandColorIdx": 1,
      "text": "要点二",
      "text_size": 64,
      "text_weight": 600,
      "t_start": 2.2,
      "t_end": 4.0,
      "doodle": "laurel_wreath"
    },
    {
      "idx": 2,
      "icon": "heart",
      "icon_scale": 1.0,
      "icon_sandColorIdx": 0,
      "text": "要点三",
      "text_size": 64,
      "text_weight": 600,
      "t_start": 4.2,
      "t_end": 6.0,
      "doodle": "pulse_line"
    },
    {
      "idx": 3,
      "icon": "star",
      "icon_scale": 1.0,
      "icon_sandColorIdx": 3,
      "text": "要点四",
      "text_size": 64,
      "text_weight": 600,
      "t_start": 6.2,
      "t_end": 7.8,
      "doodle": "orbit_rings"
    }
  ],
  "motifs": [
    {"id": "m6", "shape": "palm_ellipse", "t": 0},
    {"id": "m4", "area": [400, 200, 1520, 900], "freq": 10}
  ]
}
```

## 好例 vs 坏例

**好例**：4 条产品特性，手掌从左到右逐条扫过，每扫完一条图标和文字清晰浮现，最后一条出现后停留 1.5s 供阅读。

**坏例**：
- 手掌方向从左到右水平扫行（应该从上到下逐行）
- 每条文字超过 10 字，超出一行显示不下
- 行间距太窄（< 1.3×行高），上下两行粘连
- 最后一条出现后立刻切镜，没有 1.5s 停留
- 只有 3 条或超过 6 条，不符合条数规范

## QA 自检 5 条

1. 行数在 4~6 之间
2. 每行字 ≤ 10 字
3. t=1.8/3.2/4.6/6.0 四条出现时刻都有手掌痕迹（wipeTrail 画的半透明掌形叠加）
4. 行间距 ≥ 1.3×行高
5. 最后一条出来后停 1.5s，帧差 < 1.5%
