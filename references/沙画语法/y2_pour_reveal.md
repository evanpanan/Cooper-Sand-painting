# 沙画语法 y2 · 撒沙揭晓型

> 撒沙落下 → 底下藏着的标题被揭晓。
> 参考：`scripts/engine/examples/y2_pour_reveal.json`

## 何时用

用「撒沙落下→底下藏着的标题被揭晓」的效果，适合开头 Slogan、章节标题、品牌名揭示。

## 规格约束

1. 单段 ≤ 5s；沙从顶部落 2.0s + 揭晓字 1.5s + 停留 1.5s
2. 字不能 > 8 字
3. 字号对应画布宽度的 0.14~0.22
4. 沙色必须是厚沙+薄沙两层（上层先落厚沙遮字，底层后落薄沙被字顶起）
5. 字的亮边用 scratchLine 刮出两侧，不能直接描边

## spec JSON 字段

| 字段名 | 类型 | 约束 | 示例值 |
|---|---|---|---|
| `grammar` | string | 固定 `y2_pour_reveal` | `"y2_pour_reveal"` |
| `version` | string | 版本号 | `"1.0"` |
| `theme` | string | 主题名 | `"classic_warm"` |
| `palette_name` | string | 调色板名 | `"暖沙标准-5色"` |
| `lightTable` | string | 光台色 HEX | `"#F5D080"` |
| `sandColors` | string[] | 沙色数组 5 色 | `["#8B5A2B","#C4915E","#E8C07A","#F5DEA5","#A67040"]` |
| `grainColor` | string | 颗粒色 HEX | `"#6B4520"` |
| `thinSandAlpha` | number | 薄沙透明度 0~1 | `0.55` |
| `thickSandAlpha` | number | 厚沙透明度 0~1 | `0.92` |
| `grainSize` | number | 颗粒尺寸 px | `2.5` |
| `duration` | number | 总时长秒 ≤5 | `5.0` |
| `resolution` | number[] | [宽,高] 像素 | `[1920, 1080]` |
| `fps` | number | 帧率 | `30` |
| `pour_from` | string | 撒沙方向 `top`/`left`/`right` | `"top"` |
| `pour_endAt` | number | 撒沙结束时刻(比例 0~1) | `0.6` |
| `pour_sandColorIdx` | number | 撒沙颜色索引 sandColors 下标 | `0` |
| `pour_amount` | number | 撒沙量 0~1 | `0.75` |
| `pour_speed` | number | 撒沙速度倍率 | `1.0` |
| `reveal_target` | string | 揭晓目标标识 | `"s01_classic scene flower composition"` |
| `reveal_type` | string | 揭晓方式 | `"scratch_under_pour"` |
| `reveal_startAt` | number | 揭晓开始时刻(比例 0~1) | `0.5` |
| `text_main` | object | 主文字对象 | 见下 |
| `text_main.content` | string | 主文字内容 ≤8字 | `"Cooper Sand Art"` |
| `text_main.pos` | number[] | 主文字中心 [x,y] | `[960, 480]` |
| `text_main.size` | number | 主文字字号 px | `120` |
| `text_main.weight` | number | 主文字字重 | `700` |
| `text_main.align` | string | 对齐方式 `center`/`left`/`right` | `"center"` |
| `text_main.appearedAt` | number | 主文字出现时刻秒 | `2.6` |
| `text_main.animation` | string | 主文字动画 | `"scratch"` |
| `text_main.animationDuration` | number | 主文字动画时长秒 | `0.8` |
| `text_sub` | object | 副文字对象 | 见下 |
| `text_sub.content` | string | 副文字内容 | `"2018 – 2026 从沙中诞生"` |
| `text_sub.pos` | number[] | 副文字中心 [x,y] | `[960, 620]` |
| `text_sub.size` | number | 副文字字号 px | `48` |
| `text_sub.weight` | number | 副文字字重 | `400` |
| `text_sub.align` | string | 对齐方式 | `"center"` |
| `text_sub.appearedAt` | number | 副文字出现时刻秒 | `3.6` |
| `text_sub.animation` | string | 副文字动画 | `"fade"` |
| `text_sub.animationDuration` | number | 副文字动画时长秒 | `0.6` |
| `doodle_under` | object | 底图涂鸦对象 | 见下 |
| `doodle_under.type` | string | 涂鸦类型 | `"flower_bloom"` |
| `doodle_under.scale` | number | 涂鸦缩放 | `0.8` |
| `doodle_under.pos` | number[] | 涂鸦中心 [x,y] | `[960, 540]` |
| `doodle_under.appearedAt` | number | 涂鸦出现时刻秒 | `3.0` |
| `motifs` | object[] | 装饰图案数组 | 见下 |

## 起手模板

```json
{
  "grammar": "y2_pour_reveal",
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
  "duration": 5.0,
  "resolution": [1920, 1080],
  "fps": 30,
  "pour_from": "top",
  "pour_endAt": 0.6,
  "pour_sandColorIdx": 0,
  "pour_amount": 0.75,
  "pour_speed": 1.0,
  "reveal_target": "custom_title_reveal",
  "reveal_type": "scratch_under_pour",
  "reveal_startAt": 0.5,
  "text_main": {
    "content": "你的标题",
    "pos": [960, 480],
    "size": 120,
    "weight": 700,
    "align": "center",
    "appearedAt": 2.6,
    "animation": "scratch",
    "animationDuration": 0.8
  },
  "text_sub": {
    "content": "副标题 / 日期占位",
    "pos": [960, 620],
    "size": 48,
    "weight": 400,
    "align": "center",
    "appearedAt": 3.6,
    "animation": "fade",
    "animationDuration": 0.6
  },
  "doodle_under": {
    "type": "flower_bloom",
    "scale": 0.8,
    "pos": [960, 540],
    "appearedAt": 3.0
  },
  "motifs": [
    {"id": "m1", "x": 960, "y": 60, "amount": 0.7, "t": 0},
    {"id": "m5", "amp": 0.05, "freq": 0.3}
  ]
}
```

## 好例 vs 坏例

**好例**：字『Long March』，先被沙盖住，沙从四周向中心收，字慢慢露出，沙堆边缘有被推开的沙垄。

**坏例**：
- 字直接淡入，没有撒沙动作
- 撒完沙字还没出来
- 字超过 8 字导致字号太小看不清楚
- 用粗体描边代替 scratchLine 刮出的亮边

## QA 自检 5 条

1. t=1.0s 时画布顶部 1/2 区域沙厚 > 0.7（查 pixel）
2. t=3.0s 时字 80% 面积露出，透光线亮
3. 字中心 RGB 距光台色 < 20
4. 字 ≤ 8 字，一行
5. 字描边宽 = 4~6px，不是粗体字体
