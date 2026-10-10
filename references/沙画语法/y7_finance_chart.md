# 沙画语法 y7 · 财经图表型

> 坐标轴是划痕亮线，数据是沙从底部慢慢堆起来形成柱子/折线/饼。数字在卡拍点出现。
> 参考：`scripts/engine/examples/y7_finance_chart.json`

## 适用

- 营收/用户数/数据的季度或年度柱状图
- 趋势折线图（≤4 条线）
- 占比环形图（donut，≤6 块）

单段时长 6–8s。

## 视觉机制

1. 开头 0.5s：坐标轴划痕亮线划出来（x 轴→y 轴→刻度亮线）。
2. 0.5s → `(duration-1.5)`：数据按顺序「堆起来」。柱状图是沙从 y=0 往 y=value 堆（像沙漏堆起来）；折线是点一个一个亮然后连成划痕线；环形是一块一块按顺序从中心向圆弧方向堆沙。
3. 数据堆完后 0.3s：`callouts[]` 按指定时间一个个出现（沙粒聚合成标签）。
4. 最后 1.0–1.5s：`total_number`（大数字）划痕字法砸入，停一下看。

## JSON 字段

| 字段 | 必写 | 默认 | 说明 |
|---|---|---|---|
| `chart_type` | ✅ | — | `'bar'` 柱状 `'line'` 折线 `'donut'` 环形 |
| `axis` | ✅ | — | 坐标轴（donut 时忽略） |
| `axis.x_labels` | ✅ (bar/line) | — | 横轴标签字符串数组。≤8 个，每个 ≤4 字 |
| `axis.y_max` | ✅ | — | y 轴最大值。**必须 ≥ max(data) × 1.2**，留余量不然堆出界 |
| `axis.y_step` | ❌ | y_max/5 | y 轴刻度间隔。不要太小（≤5 条刻度线好看） |
| `axis.x_label_size` | ❌ | 24 | px |
| `chart_area` | ❌ | `[200, 180, 1720, 840]` | 图表区 [x1, y1, x2, y2] 像素。标题/数字放外面 |
| `data` | ✅ | — | 数据数组。bar/line 时长度＝x_labels 长度 |
| `data_colors_idx` | ❌ | [2,2,2,2…] | 每根柱子/每条折线用哪个沙色（索引 sandColors）。bar 可以每个柱子不同色；line 不同折线不同色（传二维数组） |
| `data_appear_order` | ❌ | `'one_by_one'` | `'one_by_one'` 按顺序一根一根堆；`'sync'` 所有柱子同时从 0 长到对应高度 |
| `data_appear_duration` | ❌ | `duration - 2.0` | 数据堆起来总共花多少秒。必须 ≤ duration-1.5，给 callouts 和 total 留时间 |
| `callouts` | ❌ | [] | 指向某条数据的标注。≤3 个 |
| `callouts[].idx` | ✅ | — | 指向 data[idx] |
| `callouts[].label` | ✅ | — | 标注文字，**≤8 字** |
| `callouts[].t` | ✅ | — | 标注出现时间（秒）。必须 ≥ data_appear_duration + 0.2s |
| `total_number` | ❌ | null | 最后出的大数字框 |
| `total_number.text` | ✅ | — | 字串，**≤12 字** |
| `total_number.appearedAt` | ✅ | — | 出现时间。必须 ≥ data_appear_duration + 所有 callouts 出完 + 0.2s，≤ duration - 0.8s |
| `total_number.pos` | ❌ | [960, 900] | 中心 [x,y] |
| `total_number.size` | ❌ | 96 | px |

## 起手必查

1. `axis.y_max ≥ 1.2 × max(data)`。lint 会查。
2. `data_appear_duration + 0.2s ≤ min(callouts[].t) ≤ max(callouts[].t) + 0.5s ≤ total_number.appearedAt ≤ duration - 0.8s`。时间顺序：数据→callouts→total，每个之间留 0.2–0.5s 呼吸。
3. 柱状图柱子个数 ≤8。折线 ≤4 条同时画。环形扇区 ≤6 块。超过 → 拆成两张图（两个 spec 再 concat）。
4. `callouts` 标注文字 ≤8 字且不要和柱子叠。`label_pos` 自己写（`callouts[].label_pos: [x,y]`），默认位置经常叠。

## 时间分配举例（6.0s，柱状图 4 根柱子）

- 0–0.5s：坐标轴划痕亮
- 0.5–4.0s：one_by_one 每根柱子花 (4.0-0.5)/4 = 0.875s 堆起来
- 4.0–4.5s：停留 0.5s
- 4.5s 起：callout 1 (idx=3, 新高) 0.3s → 停 0.4s
- 5.2s 起：total_number 划痕字 0.6s → 停 0.2s
- 5.8–6.0s：全部停

## 踩坑

- **柱子堆得太快**（一根 < 0.4s），观众看不到「沙堆起来」的过程。`data_appear_duration` 至少 = 柱子数 × 0.6s。
- y_max 给得刚好等于 max(data)，最高那根柱子顶端刚好贴在图区顶边，视觉上像「被截断了」。乘以 1.2。
- 用彩沙风格时每根柱子不同色，颜色乱。柱图时默认同色（sandColors[0] 厚沙），只在对比图时（A 组 vs B 组）用两色。
- 环形图某块占比 <5% 时那块会非常薄，沙粒堆不住有空洞。把所有 <5% 的块合并成一个「其他」块。
