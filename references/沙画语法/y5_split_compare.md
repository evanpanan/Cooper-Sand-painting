# 沙画语法 y5 · 分屏对比型

> 左右分屏 Before/After 对比，中间亮分线。
> 参考：`scripts/engine/examples/y5_split_compare.json`

## 何时用

Before / After，2018 vs 2026，方案 A vs 方案 B 的对比。

## 规格约束

1. 单段 ≤ 7s
2. 分屏线在 0.45~0.55 画布宽，不偏
3. 左标题+右标题各 ≤ 8 字 2 行
4. 左半右半先各用沙画独立图形再对比，不是文字对比
5. 中间分界用 scratchLine 画一条亮分线
6. 两边画面出现有时间差（左早 0.4s）

## spec JSON 字段

| 字段名 | 类型 | 约束 | 示例值 |
|---|---|---|---|
| `grammar` | string | 固定 `y5_split_compare` | `"y5_split_compare"` |
| `version` | string | 版本号 | `"1.0"` |
| `theme` | string | 主题名 | `"classic_warm"` |
| `palette_name` | string | 调色板名 | `"暖沙标准-5色"` |
| `lightTable` | string | 光台色 HEX | `"#F5D080"` |
| `sandColors` | string[] | 沙色数组 5 色 | `["#8B5A2B","#C4915E","#E8C07A","#F5DEA5","#A67040"]` |
| `grainColor` | string | 颗粒色 HEX | `"#6B4520"` |
| `thinSandAlpha` | number | 薄沙透明度 0~1 | `0.55` |
| `thickSandAlpha` | number | 厚沙透明度 0~1 | `0.92` |
| `grainSize` | number | 颗粒尺寸 px | `2.5` |
| `duration` | number | 总时长秒 ≤7 | `7.0` |
| `resolution` | number[] | [宽,高] 像素 | `[1920, 1080]` |
| `fps` | number | 帧率 | `30` |
| `split_at_x` | number | 分屏线 x 坐标 px | `960` |
| `split_line_style` | string | 分屏线样式 `thick_scratch` | `"thick_scratch"` |
| `split_line_width` | number | 分屏线宽度 px | `8` |
| `reveal_order` | string | 揭晓顺序 `left_first`/`together`/`right_first` | `"together"` |
| `reveal_startAt` | number | 揭晓起始秒 | `0.4` |
| `reveal_duration` | number | 揭晓时长秒 | `1.2` |
| `left` | object | 左侧配置 | 见下 |
| `left.sandColorIdx` | number | 左侧沙色索引（厚沙偏暗） | `0` |
| `left.title` | string | 左侧标题 ≤8字 | `"2018"` |
| `left.title_pos` | number[] | 左标题中心 [x,y] | `[480, 220]` |
| `left.title_size` | number | 左标题字号 px | `96` |
| `left.title_weight` | number | 左标题字重 | `800` |
| `left.body` | object[] | 左侧正文行 1~2 行 | 见下 |
| `left.body[].text` | string | 正文文字 ≤8字 | `"3人小团队"` |
| `left.body[].pos` | number[] | 正文位置 [x,y] | `[480, 500]` |
| `left.body[].size` | number | 正文字号 px | `48` |
| `left.body[].weight` | number | 正文字重 | `500` |
| `left.icon` | string | 左侧图标名 | `"old_tv"` |
| `left.icon_pos` | number[] | 左图标中心 [x,y] | `[480, 380]` |
| `left.icon_scale` | number | 左图标缩放 | `1.2` |
| `left.doodle` | string | 左侧涂鸦类型 | `"sketch_lines"` |
| `left.doodle_density` | number | 左侧涂鸦密度 0~1 | `0.7` |
| `right` | object | 右侧配置（结构同 left） | 见下 |
| `right.sandColorIdx` | number | 右侧沙色索引（薄沙偏亮） | `2` |
| `right.title` | string | 右侧标题 ≤8字 | `"2026"` |
| `right.title_pos` | number[] | 右标题中心 [x,y] | `[1440, 220]` |
| `right.title_size` | number | 右标题字号 px | `96` |
| `right.title_weight` | number | 右标题字重 | `800` |
| `right.body` | object[] | 右侧正文行 1~2 行 | 见下 |
| `right.icon` | string | 右侧图标名 | `"rocket"` |
| `right.icon_pos` | number[] | 右图标中心 [x,y] | `[1440, 380]` |
| `right.icon_scale` | number | 右图标缩放 | `1.2` |
| `right.doodle` | string | 右侧涂鸦类型 | `"stars"` |
| `right.doodle_density` | number | 右侧涂鸦密度 0~1 | `0.8` |
| `vs_label` | object | 中间 VS 标签 | 见下 |
| `vs_label.text` | string | VS 文字 | `"VS"` |
| `vs_label.pos` | number[] | VS 位置 [x,y] | `[960, 540]` |
| `vs_label.size` | number | VS 字号 px | `100` |
| `vs_label.weight` | number | VS 字重 | `900` |
| `vs_label.appearedAt` | number | VS 出现时刻秒 | `1.8` |
| `vs_label.animation` | string | VS 动画类型 | `"slam"` |
| `vs_label.animationDuration` | number | VS 动画时长秒 | `0.4` |
| `motifs` | object[] | 装饰图案数组 | 见下 |

## 起手模板

```json
{
  "grammar": "y5_split_compare",
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
  "duration": 7.0,
  "resolution": [1920, 1080],
  "fps": 30,
  "split_at_x": 960,
  "split_line_style": "thick_scratch",
  "split_line_width": 8,
  "reveal_order": "left_first",
  "reveal_startAt": 0.4,
  "reveal_duration": 1.2,
  "left": {
    "sandColorIdx": 0,
    "title": "方案A",
    "title_pos": [480, 220],
    "title_size": 96,
    "title_weight": 800,
    "body": [
      {"text": "左标题一行", "pos": [480, 500], "size": 48, "weight": 500},
      {"text": "左标题二行", "pos": [480, 600], "size": 48, "weight": 500}
    ],
    "icon": "old_tv",
    "icon_pos": [480, 380],
    "icon_scale": 1.2,
    "doodle": "sketch_lines",
    "doodle_density": 0.7
  },
  "right": {
    "sandColorIdx": 2,
    "title": "方案B",
    "title_pos": [1440, 220],
    "title_size": 96,
    "title_weight": 800,
    "body": [
      {"text": "右标题一行", "pos": [1440, 500], "size": 48, "weight": 500},
      {"text": "右标题二行", "pos": [1440, 600], "size": 48, "weight": 500}
    ],
    "icon": "rocket",
    "icon_pos": [1440, 380],
    "icon_scale": 1.2,
    "doodle": "stars",
    "doodle_density": 0.8
  },
  "vs_label": {
    "text": "VS",
    "pos": [960, 540],
    "size": 100,
    "weight": 900,
    "appearedAt": 1.8,
    "animation": "slam",
    "animationDuration": 0.4
  },
  "motifs": [
    {"id": "m3", "line": "vertical_center", "growth": 1.0, "t": 0},
    {"id": "m4", "area": [200, 150, 1720, 900], "freq": 11}
  ]
}
```

## 好例 vs 坏例

**好例**：左半『2018』厚沙暗调配旧电视图标+3人小团队，右半『2026』薄沙亮调配火箭图标+3亿用户，中间亮分线垂直居中，左侧先出 0.4s 再出右侧，视觉对比强烈自然。

**坏例**：
- 分屏线偏到 0.3 或 0.7，一边大一边小
- 两边同时出现，没有 0.4s 时间差
- 左右两边直接堆文字对比，没有独立沙画图形
- 中间分线用普通黑线描边，没有 scratchLine 亮分线
- 左标题 12 字，超出 8 字限制

## QA 自检 5 条

1. t=3.5s 分屏线在 0.5±0.05 宽
2. 左画面领先右画面 0.35~0.45s 出现
3. 中间亮分线 RGBΔ光台 < 20
4. 左右标题总字各 ≤ 16 字（每行 ≤8，2 行）
5. 两边厚度独立，冷光台下左用厚沙暗、右用薄沙亮，自然对比
