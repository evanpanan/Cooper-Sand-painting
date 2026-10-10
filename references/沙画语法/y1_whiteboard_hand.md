# 沙画语法 y1 · 白板手划型

> 一只手在沙台上划，沿线揭示步骤/时间线。
> 参考：`scripts/engine/examples/y1_whiteboard_hand.json`

## 适用

时间线、步骤型讲解（Step1→Step2→Step3）、产品功能介绍（Feature A→B→C）、里程碑。 ≤8 个分段。

## 视觉机制

沙台从上到下/从左到右有一条主路径，手沿路径移动，手后面的沙被划开露出内容（图标+字），手前面的沙还是厚沙未揭示。每划完一个分段停 1–2 秒看内容。

## JSON 字段

| 字段 | 必写 | 默认值 | 说明 |
|---|---|---|---|
| `segments[]` | ✅ | — | 每段一步的数组 |
| `segments[].t_start` | ✅ | — | 该分段开始划的时间（秒，spec 全局时间轴） |
| `segments[].t_end` | ✅ | — | 该分段划完 + 内容揭示完成的时间 |
| `segments[].from`, `.to` | ✅ | — | 该分段划线的起点/终点坐标 [x,y] 像素（1920×1080） |
| `segments[].icon` | ✅ | — | 图标名：`calendar` `chart` `rocket` `user` `coin` `star` `heart` `trophy` `target` `flame` `globe` `puzzle` `bulb` `gift`；自定义图用 `svg_d:"<path d string>"` 字段替代 icon |
| `segments[].icon_pos` | ⚠️ | `[to_x, to_y-60]` | 图标中心 [x,y] |
| `segments[].text` | ✅ | — | 屏上字，**单条 ≤8 字**。多写数组 ["Step 1", "起步"]，最多 2 行 |
| `segments[].text_pos` | ⚠️ | `[to_x, to_y+40]` | 文字基线左点 [x,y] |
| `segments[].text_size` | ⚠️ | 36 | px |
| `path_style` | ❌ | `'horizontal'` | `'horizontal'` 从左到右、`'vertical'` 从上到下、`'custom'` 每段自定义 from/to |
| `hand_style` | ❌ | `'dark_silhouette'` | 手的画法：`'dark_silhouette'` 深沙剪影（默认）、`'scratch_trace'` 划痕手形（只看得到轮廓亮线）、`'none'` 不画手（手的位置用「正在划」的划痕末端代替） |
| `line_width_px` | ❌ | 6 | 主路径划痕的宽度 px |
| `theme`/`palette_name` | ✅ | — | 顶层必填，和 spec 其他部分一致 |

## 起手必查

1. 所有 `segments[].text` 单条 ≤8 字。超过 → 拆两行。lint 查。
2. `segments` 个数 ≤8。超过 → 拆成两段 spec。
3. 每个分段的 `t_start` ≥ 上一个分段的 `t_end`。重叠 → 手会瞬移。
4. 划痕总长度（各段距离之和） ≤ 画面宽/高的 1.5 倍。太长的话手移动速度太快观众跟不上。

## 时间分配建议

每段 = 手在划（`dist/speed`，speed≈600px/s） + 停住看内容（1.2s）。一个 Step 的总时长 ≈ 1.5–2.0s。

例：4 段白板手划总时长 = 4 × 1.75s ≈ 7s（在 8s 上限内）。

## 踩坑

- 图标和字放在划痕末端的正上方/正下方，不要偏离主路径。观众的眼睛跟着手走，偏离了会看不到内容。
- 手移动太快（>800 px/s）时划出来的划痕会断。speed 限 400–700 内。
- 路径太弯的话手穿进内容里。路径尽量是直线/大弧线，图标和字放在路径两侧的安全区。
