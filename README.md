# 🏜️ Cooper Sand Painting Motion · 沙画动画技能

> **一句话简介**：让 Coding Agent 把沙画艺术写成会流动的动画。

---

## 动画样片

本项目自带 8 套参数化动画语法（y1–y8），每套都配了可直接渲染的示例 spec JSON。
把任意一份 `scripts/engine/examples/*.json` 喂给渲染器，30 秒内就能出一段 4–8 秒的
1920×1080 沙画样片，颗粒、划痕、透光、呼吸感全都有。

```
📁 scripts/engine/examples/
├── y1_whiteboard_hand.json    白板手划时间线（创业四步）
├── y2_pour_reveal.json        倒沙揭晓主标题
├── y3_palm_wipe_list.json     手掌擦拭要点列表
├── y4_flow_gather.json        沙粒流动聚合成关键数字
├── y5_split_compare.json      左右分屏前后对比
├── y6_line_highlight.json     诗词逐行高亮吟诵
├── y7_finance_chart.json      营收柱状图 + 数据标注
└── y8_keynote_bigtype.json    品牌口号大字冲击
```

渲染命令见下「快速上手 3 条命令」。

---

## 三大沙画风格

| 风格名 | palette_name | 视觉特点 | 最适合题材 |
|---|---|---|---|
| **经典暖沙** | `暖沙标准-5色` `暖沙深棕-5色` `暖沙米金-5色` `暖沙海岸-5色` | 暖黄透光台 + 五档棕金沙层。厚沙堆暗、薄沙层过渡、划痕透光，一眼就是「沙画」。默认首选。 | 叙事、人物、回忆、情感短片、品牌故事、婚礼庆典、企业宣传片。 |
| **多彩彩沙** | `彩沙庆典-6色` `彩沙童话-6色` | 保留 70% 暖色基底（朱红+橙黄+金黄），用冷色做点缀。颗粒层减少、颜色更艳。 | 节日贺岁、儿童故事、童话奇幻、品牌活动动画、产品发布会。 |
| **夜间荧光沙** | `荧光星河-4色` `荧光深海-4色` | 深紫蓝黑为光台底色 + 浅 Pastel 霓虹沙色 + Bloom 泛光。唯一允许冷色光台的风格。 | 夜空星河、梦境、科幻未来、深海探索、赛博城市、概念片。 |

> **调色原则**：三套风格的色板都在 `references/色板.md` 里锁定了十六进制值。
> 不要自己改色值，除非先按色板文档的「新色板验证流程」跑过一次成片验收。

---

## 8 种解说动画语法

| 编号 | 语法名 | 一句话说明 | 典型时长 |
|---|---|---|---|
| y1 | 白板手划型 | 一只手沿路径划沙，每到一站露出图标 + 文字，适合 Step 流程 / 里程碑时间线。 | 5–8s |
| y2 | 倒沙揭晓型 | 细沙从画面上方或某角落倾泻而下，铺完后从沙下「刮」出主标题和副标题。 | 4–6s |
| y3 | 手掌擦拭列表型 | 一只手掌左右擦，擦掉一层沙露出一条要点。4 条要点各停 2 秒，非常适合口播要点。 | 7–10s |
| y4 | 流动聚合型 | 沙粒从四面八方流向画面中心，聚合成一个目标形状，然后划痕字法爆出关键数字。 | 4–7s |
| y5 | 分屏对比型 | 画面中间一条亮划痕分开左右两侧，同时 or 先后揭示「Before vs After」两组内容。 | 5–8s |
| y6 | 逐行高亮型 | 一首诗 / 一段台词先以半透明薄沙全铺，然后按口播节奏一行一行「刮亮」。 | 6–10s |
| y7 | 财经图表型 | 坐标轴亮划痕 → 沙从底部慢慢堆成柱子/折线/饼 → 标注卡拍出现 → 最后大数字砸入。 | 6–9s |
| y8 | 主题大字冲击型 | 四字主 slogan 先 Slam 砸入带冲击波，然后轻微呼吸停住，副句从下往上淡入。 | 3–5s |

> 语法级 JSON 字段、起手必查 Lint 规则、坑点避坑表 → 翻 `references/沙画语法/y*.md`。

---

## 能做什么

| 你（用户）对 Agent 说 | 它自动做什么 | 读哪号文档 |
|---|---|---|
| "帮我把这 4 个创业里程碑做成沙画短片" | 选 y1，自动分 4 段，分配图标（日历/火箭/图表/地球），排 6.5s 时间轴 → lint → 渲染 → QA | y1_whiteboard_hand.md + 01-拆解.md |
| "做一段品牌发布会开场的倒沙揭晓标题" | 选 y2，定 pour_from=top pour_endAt=0.6，主副标题字距字号 → 渲染 | y2_pour_reveal.md + 08-风格作者规范.md |
| "我这 4 条价值观，每条停 2 秒，带口播" | 选 y3，4 条 × 2.0s = 8s 总时长，配图标 → storyboard 对齐口播字卡 | y3_palm_wipe_list.md + 06-口播驱动的艺术短片.md |
| "今年关键数字 3 亿用户，做一个视觉爆点" | 选 y4，圆形聚合目标 3 层沙不同来源，数字 200px 字，appearedAt 卡拍 | y4_flow_gather.md + 05-节奏与配乐.md |
| "对比 2018 和 2026 的变化" | 选 y5，split_at_x=960，左右两块各配色+图标+2 条 body → together 揭示 | y5_split_compare.md + 03-一帧先行四条路线.md |
| "《静夜思》做成配诗朗诵的沙画" | 选 y6，四句 base_text 半透明铺底，按每句 1.2s 节奏 scratch 高亮 | y6_line_highlight.md + 10-角色.md |
| "把 Q1–Q4 营收数据做个图，总营收标出来" | 选 y7，柱状图 y_max=110，callout 指 Q4 历史新高，total_number 砸入 | y7_finance_chart.md + 09-视频动画语法.md |
| "结尾定版 slogan：长期主义，做时间的朋友" | 选 y8，主字 260px slam 入，呼吸微动画，暖沙米金品牌配色 | y8_keynote_bigtype.md + 11-长卷穿越片.md |
| "把我写的 3 分钟口播稿整合成片" | 跑 12-口播整片 流程：拆解 → 语法分配 → 镜头表 → 转场串联 → 配乐对齐 → 审片 | 12-口播整片与经验回流.md + 02-机制.md |
| "我加一套新风格色板" | 先按 08-风格作者规范.md 三关验证：静帧观感 × 3 段不同构图 → 登记色板 → 注册进 SAND.palette() | 08-风格作者规范.md + references/色板.md |

---

## 里面有什么

| 资产分类 | 数量 | 存放路径 |
|---|---|---|
| 🎨 风格配方卡 | 3 张 | `references/风格配方/01_classic_warm.md` · `02_colorful_sand.md` · `03_glow_night.md` |
| 🎬 对应场景代码 | 4 个 | `scripts/engine/scenes/s01_classic.js` + 索引 + 未来 s02/s03 占位 |
| 📐 方法文档 | 12 篇 | `references/01-拆解.md` … `references/12-口播整片与经验回流.md` |
| ✨ 签名转场 | 6 个 | `scripts/engine/transitions.js` · t_light_table / t_pour_in / t_wipe_palm / t_finger_draw / t_blow_away / t_sift_fade |
| 🧩 语法卡 | 8 张 | `references/沙画语法/y1*.md` … `y8*.md` |
| 📊 示例 spec JSON | 8 份 | `scripts/engine/examples/y1*.json` … `y8*.json` |
| 🧪 QA 检查项 | 12 条 | `scripts/qa.py` · 确定性、颗粒层、透光率、运动量… |
| 🧱 Lint 规则 | 9 条 | `scripts/storyboard_lint.py` · 字数、段数、时序、坐标… |
| 🎨 色板锁值 | 10 套 | `references/色板.md` · 暖沙 4 + 彩沙 2 + 荧光 2 + 扩展规范 |

---

## 目录树结构

```
sand-painting-motion/
├── .trae/                          # ← 这是 Trae 技能包根目录
│   └── skills/
│       └── sand-painting-motion/   # ← 你现在在这里
│           ├── SKILL.md            # 技能主路由（Agent 入口说明）
│           ├── pyproject.toml      # Python 项目配置（uv 用）
│           ├── README.md           # 本文件
│           ├── CHANGELOG.md        # 版本变更日志（Keep-a-changelog）
│           ├── LICENSE             # MIT License
│           ├── .gitignore          # 忽略：__pycache__、渲染输出、媒体文件
│           │
│           ├── references/                     # 📚 所有规范与文档
│           │   ├── 01-拆解.md ~ 12-口播整片.md # 12 篇方法文档
│           │   ├── 色板.md                     # 10 套色板锁值
│           │   ├── 角色精细度.md               # 角色颗粒与绘制等级
│           │   ├── 镜头表模板.md               # 口播成片镜头表 xlsx 模板
│           │   ├── 风格配方/                   # 3 张风格配方卡
│           │   │   ├── INDEX.md
│           │   │   ├── 01_classic_warm.md
│           │   │   ├── 02_colorful_sand.md
│           │   │   └── 03_glow_night.md
│           │   └── 沙画语法/                   # 8 张语法卡
│           │       ├── y1_whiteboard_hand.md
│           │       ├── y4_flow_gather.md
│           │       └── y7_finance_chart.md
│           │
│           └── scripts/                        # 💻 可运行代码
│               ├── __init__.py
│               ├── qa.py                       # QA 审片检查
│               ├── storyboard_lint.py          # 渲染前 Lint
│               ├── analyze/
│               │   ├── __init__.py
│               │   └── breakdown.py            # 文案拆解 → 镜头表
│               └── engine/
│                   ├── __init__.py
│                   ├── render.py               # 主渲染器 CLI
│                   ├── engine.js               # Canvas 渲染核心
│                   ├── eras.js                 # 沙层绘制 ERA 函数库
│                   ├── transitions.js          # 6 个签名转场
│                   ├── lib/
│                   │   ├── sand_paint.js       # SAND.* 绘图 API
│                   │   └── util.js             # 通用工具
│                   ├── scenes/
│                   │   ├── index.js            # 场景注册路由
│                   │   └── s01_classic.js      # 经典暖沙基准场景
│                   └── examples/               # 📦 8 份可直接渲染的示例
│                       ├── y1_whiteboard_hand.json
│                       ├── y2_pour_reveal.json
│                       ├── y3_palm_wipe_list.json
│                       ├── y4_flow_gather.json
│                       ├── y5_split_compare.json
│                       ├── y6_line_highlight.json
│                       ├── y7_finance_chart.json
│                       └── y8_keynote_bigtype.json
```

---

## 安装 / 依赖安装

本项目用 **uv** 管理 Python 依赖。系统还需要 **ffmpeg**（视频合成）和 **Chromium**（Playwright 无头浏览器跑 Canvas）。

### 第一步：装 Python 依赖

```bash
cd .trae/skills/sand-painting-motion

# 用 uv 创建虚拟环境并装依赖（含 dev 组的 ruff/pytest）
uv sync --dev
```

成功后 `.venv/` 会出现在当前目录，里面有 `pillow`、`numpy`、`matplotlib`、`playwright`。

### 第二步：装 Playwright 的 Chromium 浏览器

```bash
# 激活虚拟环境后
uv run playwright install chromium

# 系统依赖（Linux 首次需要，macOS / Windows 通常跳过）
# uv run playwright install-deps chromium
```

### 第三步：确认系统有 ffmpeg

```bash
ffmpeg -version
```

没装的话：

- **macOS**：`brew install ffmpeg`
- **Ubuntu**：`sudo apt install ffmpeg`
- **Windows**：去 ffmpeg.org 下 build，加入 PATH。

> ffmpeg 版本不低于 5.0 就行，4.x 也能跑但 h264 编码参数会不同。

---

## 快速上手 3 条命令

都在 `sand-painting-motion/` 目录下执行，前缀都是 `uv run python -m scripts.engine.render`。

### 命令 1 · `--solo` 单示例渲染

把 `examples/` 里某份 JSON 直接出片：

```bash
# 渲 y4 流动聚合（3 亿用户）那段，6 秒的片
uv run python -m scripts.engine.render --solo y4_flow_gather

# 渲 y1 创业四步时间线
uv run python -m scripts.engine.render --solo y1_whiteboard_hand

# 8 个全渲一遍，产物在 render/ 下：
for g in y1 y2 y3 y4 y5 y6 y7 y8; do
  uv run python -m scripts.engine.render --solo ${g}_*
done
```

产物位置：`render/{grammar_name}_{timestamp}.mp4`（1920×1080 / 30fps / h264）。

### 命令 2 · `--spec` 自定义 spec 渲染

写自己的 JSON spec（照 examples 里的格式抄），然后：

```bash
uv run python -m scripts.engine.render --spec /path/to/your/spec.json
```

Spec JSON 必写字段：`grammar`、`version`、`theme`、`palette_name`、`duration`、`resolution`、`fps`，再加该语法的字段。渲染前 Lint 会先跑 9 条检查，红灯就打印哪里错了。

### 命令 3 · `qa` 审片一条龙

某段片子渲完后跑 QA，12 条检查全绿才算过：

```bash
# 对刚才渲的 mp4 + 对应 spec 一起审
uv run python -m scripts.qa \
  --video render/y4_flow_gather_20261010_143000.mp4 \
  --spec  scripts/engine/examples/y4_flow_gather.json

# 加 --strict 严格模式：任何一条警告也算失败
uv run python -m scripts.qa --video ... --spec ... --strict

# 一键 lint + render + qa（跑 render 时加 --qa 尾参数）
uv run python -m scripts.engine.render --solo y8_keynote_bigtype --qa
```

QA 通过的话会在 `qa/` 下生成一份 `qa_report_{name}.json`，交付包里带上。

---

## 关于作者

| 字段 | 内容 |
|---|---|
| **项目发起人** | Cooper / Cooper Sand Painting |
| **角色** | 沙画艺术指导 · 动效规范制定 |
| **联系方式** | （项目使用方自行填写：邮箱 / 微信 / 作品主页） |
| **个人作品站** | （占位符 — 使用方请替换为作者作品集或 Behance / Vimeo 链接） |
| **授权** | 本技能代码 MIT 开源；沙画艺术视觉规范非经作者书面授权不得用于商业广告二次分发。 |

> 此节为占位。接入方请把 Cooper 换成真实作者信息，并把 SKILL.md 的 credit 字段同步更新。

---

## 许可证

本项目代码（`scripts/`、`pyproject.toml`、示例 JSON、Lint/QA 脚本）以 **MIT License** 开源，
详见同目录 `LICENSE` 文件。

**简化说明（非法律文本）**：
- ✅ 随便用、改、分发、商用，无需申请。
- ✅ 改了之后闭源也可以。
- ❌ 唯一要求：分发时保留原 LICENSE 里那段 "Copyright (c) 2026 Cooper Sand Painting"
  和免责声明，别删。
- ❌ 作者不对代码做任何担保，用了出问题自己承担。

文档类（`references/*.md` 的沙画艺术方法论与风格配方）以 **CC BY 4.0** 共享，
引用请注明 "Cooper Sand Painting Motion · 沙画动画技能" 出处。

---

## English Blurb

> **Cooper Sand Painting Motion** is a parameterized sand-painting animation skill for
> coding agents. It turns natural-language scripts and structured specs into flowing,
> cinematic sand-art videos through an 8-step pipeline: intent → breakdown → lint →
> spec composition → headless Canvas render → 12-check QA → film gate → final delivery.
>
> The project ships **3 visual styles** (classic warm / multi-hued / neon night-glow),
> **8 animation grammars** (timeline, pour-reveal, palm-wipe list, flow-gather number,
> split-compare, poem line-highlight, finance chart, keynote slam-type), **6 signature
> transitions**, 12 method-reference docs, and 8 ready-to-render example JSONs. All
> output is 1920×1080 @ 30fps MP4 via Playwright + Canvas + FFmpeg, with deterministic
> pixel output and built-in quality gates so agents never deliver an "almost right"
> render.
>
> Licensed MIT · Copyright (c) 2026 Cooper Sand Painting.
