# 沙画语法 y8 · 发布会大字型

> 超级大字 Slogan 从中心向两头长出，冲击点题。
> 参考：`scripts/engine/examples/y8_keynote_bigtype.json`

## 何时用

发布会金句大字，段末 Slogan 冲击，全篇点题句。

## 规格约束

1. 单段 ≤ 4.5s
2. 字 4~8 字，一行
3. 字号 0.22~0.30 画布宽（超级大）
4. 进入用 t_pour_in + scratchGrowing 从中心往两头长字
5. 退出时停 1.0s 不平抹（P10 硬要求）

## spec JSON 字段

| 字段名 | 类型 | 约束 | 示例值 |
|---|---|---|---|
| `grammar` | string | 固定 `y8_keynote_bigtype` | `"y8_keynote_bigtype"` |
| `version` | string | 版本号 | `"1.0"` |
| `theme` | string | 主题名 | `"classic_warm"` |
| `palette_name` | string | 调色板名 | `"暖沙米金-5色"` |
| `lightTable` | string | 光台色 HEX | `"#F9E5B0"` |
| `sandColors` | string[] | 沙色数组 5 色 | `["#9C7A48","#C4A068","#E0C088","#F0D8A8","#B89058"]` |
| `grainColor` | string | 颗粒色 HEX | `"#785838"` |
| `thinSandAlpha` | number | 薄沙透明度 0~1 | `0.52` |
| `thickSandAlpha` | number | 厚沙透明度 0~1 | `0.93` |
| `grainSize` | number | 颗粒尺寸 px | `2.8` |
| `duration` | number | 总时长秒 ≤4.5 | `4.5` |
| `resolution` | number[] | [宽,高] 像素 | `[1920, 1080]` |
| `fps` | number | 帧率 | `30` |
| `main_word` | string | 主大字 4~8字一行 | `"长期主义"` |
| `main_size` | number | 主大字字号 px ≈ 画布宽×0.22~0.30 | `260` |
| `main_weight` | number | 主大字字重 通常 900 | `900` |
| `main_pos` | number[] | 主大字中心 [x,y] | `[960, 480]` |
| `main_color_sandIdx` | number | 主大字沙色索引 | `0` |
| `slam_t` | number | 砸入冲击时刻秒 | `0.5` |
| `slam_scale` | number | 砸入瞬间放大倍数 | `1.6` |
| `slam_bounce_count` | number | 砸入弹跳次数 | `3` |
| `slam_bounce_decay` | number | 弹跳衰减系数 0~1 | `0.4` |
| `dwell_breath` | boolean | 停留期间是否轻微呼吸动效 | `true` |
| `breath_amp` | number | 呼吸动画幅度 | `0.03` |
| `breath_freq` | number | 呼吸动画频率 Hz | `0.4` |
| `sub_word` | string | 副标题文字 | `"做时间的朋友"` |
| `sub_size` | number | 副标题字号 px | `64` |
| `sub_weight` | number | 副标题字重 | `500` |
| `sub_pos` | number[] | 副标题中心 [x,y] | `[960, 720]` |
| `sub_color_sandIdx` | number | 副标题沙色索引 | `2` |
| `sub_appearedAt` | number | 副标题出现时刻秒 | `2.2` |
| `sub_animation` | string | 副标题动画类型 | `"fade_in_up"` |
| `sub_animationDuration` | number | 副标题动画时长秒 | `0.7` |
| `accent_decoration` | object | 横线装饰配置 | 见下 |
| `accent_decoration.type` | string | 装饰类型 | `"horizontal_rules"` |
| `accent_decoration.sandColorIdx` | number | 装饰线沙色索引 | `1` |
| `accent_decoration.rule_width` | number | 装饰线宽度 px | `480` |
| `accent_decoration.rule_thickness` | number | 装饰线厚度 px | `4` |
| `accent_decoration.gap_from_main` | number | 与主字间距 px | `80` |
| `accent_decoration.appearedAt` | number | 装饰出现时刻秒 | `1.6` |
| `corner_doodle` | object | 四角装饰 | 见下 |
| `corner_doodle.enabled` | boolean | 是否启用四角涂鸦 | `true` |
| `corner_doodle.type` | string | 四角涂鸦类型 | `"hourglass_branches"` |
| `corner_doodle.posTL` | number[] | 左上角位置 [x,y] | `[180, 180]` |
| `corner_doodle.posBR` | number[] | 右下角位置 [x,y] | `[1740, 900]` |
| `corner_doodle.scale` | number | 四角涂鸦缩放 | `0.7` |
| `corner_doodle.sandColorIdx` | number | 四角涂鸦沙色索引 | `3` |
| `corner_doodle.alpha` | number | 四角涂鸦透明度 | `0.5` |
| `corner_doodle.appearedAt` | number | 四角涂鸦出现秒 | `2.8` |
| `impact_shockwave` | object | 冲击波纹配置 | 见下 |
| `impact_shockwave.enabled` | boolean | 是否启用冲击波纹 | `true` |
| `impact_shockwave.t` | number | 波纹触发时刻秒 | `0.5` |
| `impact_shockwave.rings` | number | 波纹圈数 | `3` |
| `impact_shockwave.max_radius` | number | 波纹最大半径 px | `900` |
| `impact_shockwave.thickness` | number | 波纹线厚度 px | `6` |
| `impact_shockwave.sandColorIdx` | number | 波纹沙色索引 | `2` |
| `impact_shockwave.alpha_decay` | number | 波纹透明度衰减 | `0.7` |
| `motifs` | object[] | 装饰图案数组 | 见下 |

## 起手模板

```json
{
  "grammar": "y8_keynote_bigtype",
  "version": "1.0",
  "theme": "classic_warm",
  "palette_name": "暖沙米金-5色",
  "lightTable": "#F9E5B0",
  "sandColors": [
    "#9C7A48",
    "#C4A068",
    "#E0C088",
    "#F0D8A8",
    "#B89058"
  ],
  "grainColor": "#785838",
  "thinSandAlpha": 0.52,
  "thickSandAlpha": 0.93,
  "grainSize": 2.8,
  "duration": 4.5,
  "resolution": [1920, 1080],
  "fps": 30,
  "main_word": "长期主义",
  "main_size": 260,
  "main_weight": 900,
  "main_pos": [960, 480],
  "main_color_sandIdx": 0,
  "slam_t": 0.5,
  "slam_scale": 1.6,
  "slam_bounce_count": 3,
  "slam_bounce_decay": 0.4,
  "dwell_breath": true,
  "breath_amp": 0.03,
  "breath_freq": 0.4,
  "sub_word": "做时间的朋友",
  "sub_size": 64,
  "sub_weight": 500,
  "sub_pos": [960, 720],
  "sub_color_sandIdx": 2,
  "sub_appearedAt": 2.2,
  "sub_animation": "fade_in_up",
  "sub_animationDuration": 0.7,
  "accent_decoration": {
    "type": "horizontal_rules",
    "sandColorIdx": 1,
    "rule_width": 480,
    "rule_thickness": 4,
    "gap_from_main": 80,
    "appearedAt": 1.6
  },
  "corner_doodle": {
    "enabled": true,
    "type": "hourglass_branches",
    "posTL": [180, 180],
    "posBR": [1740, 900],
    "scale": 0.7,
    "sandColorIdx": 3,
    "alpha": 0.5,
    "appearedAt": 2.8
  },
  "impact_shockwave": {
    "enabled": true,
    "t": 0.5,
    "rings": 3,
    "max_radius": 900,
    "thickness": 6,
    "sandColorIdx": 2,
    "alpha_decay": 0.7
  },
  "motifs": [
    {"id": "m5", "amp": 0.08, "freq": 0.45},
    {"id": "m4", "area": [200, 200, 1720, 900], "freq": 12}
  ]
}
```

## 好例 vs 坏例

**好例**：字『长期主义』4 字，字号 260px（画布宽 1920×0.135 实际 0.22+ 更冲击），t=0.5s 从中心砸入带 3 圈冲击波+弹跳，scratchGrowing 从中心向两头逐笔长字，边缘亮线透光清晰，末尾有堆沙，停留 1.0s 期间呼吸动效，无平抹退出。

**坏例**：
- 字只有 2 字或超过 8 字，不在规范内
- 字号 180px < 画布宽×0.22，不够冲击
- t=2.0s 字还没长完，只露出 60% 面积
- 最后一镜停 0.5s 就平抹切换（P10 要求 ≥1.0s）
- 字末端是平切，没有 scratchGrowing 的堆沙痕迹（沙厚>0.8 在末尾±10）

## QA 自检 5 条

1. 字 4~8 字，一行
2. 字号 ≥ 画布宽 × 0.22
3. t=2.0s 字 100% 露出且边缘亮线透光
4. 最后一镜停 ≥ 1.0s（帧差 < 1.5% 持续时间）
5. 字末端有 scratchGrowing 的堆沙（pixels 沙厚 > 0.8 在末尾 x,y±10 范围内）
