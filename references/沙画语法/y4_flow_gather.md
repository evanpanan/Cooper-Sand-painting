# 沙画语法 y4 · 沙粒流动聚合型

> 沙粒从四面八方流向画面中心，聚合成一个关键物件/人像/数字。聚完停一下看。
> 参考：`scripts/engine/examples/y4_flow_gather.json`

## 适用

- 主题揭晓（「今年的关键数字是__」）
- 核心产品/人像出场（「这就是 Cooper」）
- 关键 Logo/图形亮相
- 片中点睛的那一个画面

时长 4–7s。单片段上限 8s。

## 视觉机制

1. 0 → `gatherEndAt × duration`：沙台先是厚沙床。多层沙（按 `layers[]` 里的 `flowFrom`）从画面边缘或某角落流进来，朝目标形状聚。途中沙粒是动态的，每秒位置变。流动结束时刚好堆满目标形状。
2. `gatherEndAt × dur` → `text.appearedAt`：目标形状的沙慢慢稳定下来，颗粒跳动停止。
3. `text.appearedAt` → 结束：划痕字法画出主文字（比如数字），停住看。

## JSON 字段

| 字段 | 必写 | 默认 | 说明 |
|---|---|---|---|
| `target_shape` | ✅ | — | 目标形状。支持三种写法：① `circle_at_<cx>_<cy>_r_<r>`；② `rect_<x>_<y>_<w>_<h>`；③ `path_<svg_d>`（SVG path 的 d 字符串，把双引号换成单引号） |
| `layers[]` | ✅ | — | 流动层。按顺序从上（最后画）到下（先画）。多层 = 彩色或多来源聚合，单层 = 单色 |
| `layers[].sandColorIdx` | ✅ | — | 指向 palette 的 `sandColors[i]`（经典暖沙 i=0..4；彩沙 i=0..5）。**所有层的颜色加起来暖色占 ≥70%**（彩沙风格时） |
| `layers[].flowFrom` | ✅ | — | 这层沙从哪里流进来：`'left'` `'right'` `'top'` `'bottom'` `'top-left'` `'top-right'` `'all-sides'` `'random'` |
| `layers[].delayPct` | ❌ | 0 | 这层流动比 gatherEndAt 晚多少（0..1 比例）。想让第一层先流 20% 再让第二层跟上：第二层 `delayPct: 0.2` |
| `layers[].particleCount` | ❌ | `3000` | 这层有多少粒沙流进来。越细越多。彩沙每层 ≤2000，不然画面花 |
| `gatherEndAt` | ✅ | — | 流动结束的时间比例（0..1，相对总 duration）。推荐 0.65–0.75，给后面停和出字留时间 |
| `text` | ❌ | null | 聚完之后出的字。null 就不出字（目标形状本身就是字时用这个） |
| `text.main` | ✅（有 text 时） | — | 主字，**≤8 字** |
| `text.sub` | ❌ | — | 副字，**≤12 字** |
| `text.pos` | ✅ | — | 主字中心 [x,y] |
| `text.size` | ✅ | — | 主字大小 px。数字 180–240，文字 80–140 |
| `text.sub_size` | ❌ | 36 | 副字 px |
| `text.appearedAt` | ✅（有 text 时） | — | 字开始出现的时间（秒，全局时间轴）。必须 ≥ `gatherEndAt × duration + 0.1s` |
| `text.animation` | ❌ | `'scratch'` | 字怎么出来：`'scratch'` 划痕法（先铺厚沙字底→划亮笔画）、`'slam'` 砸入、`'fade'` 淡入 |

## 起手必查

1. `gatherEndAt × duration` + 0.1s ≤ `text.appearedAt` ≤ `duration - 1.0s`。给字留至少 1 秒看。
2. 所有 `layers[].flowFrom` 不要全是同一个方向（会看起来像从一边倒沙，不像聚合）。至少两个不同方向。
3. `target_shape` 的面积不要超过画面面积的 40%。太大的话沙粒堆不满，聚完有空洞。
4. 目标形状是**连通的单一形状**（不要是两个不连接的区域），沙粒聚合时如果是两个不连通区会有一半流错。

## 时间分配举例

总 duration=6.0s、gatherEndAt=0.7、text.appearedAt=4.5s：
- 0–4.2s：流动聚合
- 4.2–4.5s：稳定
- 4.5s 起：划痕字法画主字 0.6s → 停 0.9s
- 5.1–6.0s：字+形状完整停留

## 踩坑

- 目标形状是文字（比如「Cooper」）时就不要再写 `text` 了，否则字叠字。
- 彩色层 >4 层时画面容易脏。彩沙风格最多 4 层（朱红/橙黄/金黄 + 一个冷色点缀）。
- 流动方向是 `'all-sides'` + 目标形状很小时，沙粒会在目标形状周围打转转不进去。这种情况把 flowFrom 拆成 3 层不同方向，不要 all-sides。
