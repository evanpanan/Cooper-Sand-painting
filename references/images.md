# 图像能力使用手册：角色 F3/F4 生帧→沙化全流程

> 本文档覆盖角色精细度 F3（方案A：生帧 → 沙化）与 F4（精细人脸沙化）的完整图像工作流。100% 面向操作步骤，不做概念解释。

---

## 0. 什么时候需要走这条流程

- 镜头表「角色」列写了 F3 / F4
- 沙画台里要出现**能一眼认出的真人脸**（如用户本人、历史人物、角色肖像）
- 纯代码剪影（F1/F2）无法满足识别度要求

如果只是出一只手、一个背影，跳过去直接看 `references/角色精细度.md` 的 F1/F2 画法。

---

## 1. 能力检查（开工前第一步）

```bash
python3 .trae/skills/sand-painting-motion/scripts/capabilities.py status
```

看到 `图像能力: ✅` 才能继续。未配置则：

```bash
# 方案A：已有素材
python3 scripts/capabilities.py image enable --mode existing --library-dir ~/mypics

# 方案B：需要生成
python3 scripts/capabilities.py image enable --mode generate
```

---

## 2. 路径 A：导入用户已有图片

### 2.1 执行导入

```bash
cd <项目目录>
python3 ../.trae/skills/sand-painting-motion/scripts/images.py import \
  --src ~/Downloads/用户照片.jpg \
  --out assets/角色_主角.png
```

`import` 子命令在写入目标前会：
1. 用 Pillow 打开确认文件可读
2. 记录原始尺寸，若小于 1024×1024 打印 WARNING（不阻止，后续 validate 会失败）
3. 复制到 `assets/` 下，文件名为你指定的 `--out`

### 2.2 跳过导入的场景

用户直接把图片放到了 `<项目>/assets/` 下 → 跳到第 4 节 validate。

---

## 3. 路径 B：生成新图片

### 3.1 输出生成作业单

```bash
cd <项目目录>
python3 ../.trae/skills/sand-painting-motion/scripts/images.py gen \
  --prompt "一位35岁左右的中国男性侧脸，微笑，暖沙色调背景，柔和顶光，无蓝紫光，高清人像" \
  --count 3 \
  --out assets/角色_主角
```

命令输出一份 JSON 作业单（写入 stdout，同时保存到 `<out>_作业单.json`）：

```json
{
  "job_id": "img_gen_20251010_143022",
  "requested_count": 3,
  "output_prefix": "assets/角色_主角",
  "prompts": [
    {
      "variant": 1,
      "full_prompt": "一位35岁左右的中国男性侧脸，微笑，暖沙色调背景，柔和顶光，无蓝紫光，高清人像 --no AI感蓝紫 霓虹色 赛博朋克 塑料感 过度锐化",
      "size": "1024x1024"
    }
  ],
  "tool_hint": "text_to_image",
  "next_steps": [
    "调用环境中可用的生图工具（如 text_to_image skill）按 prompts 生成",
    "保存为 assets/角色_主角_01.png ... assets/角色_主角_03.png",
    "运行 images.py validate 对每张做质量检查",
    "选定一张后在 assets/角色_主角_已批准.txt 记录文件名"
  ]
}
```

### 3.2 沙画专用中文提示词模板

所有 `--prompt` 自动附加后缀（在作业单里拼接好，不用你手敲）：

```
--no AI感蓝紫 霓虹色 赛博朋克 塑料感 过度锐化 奇怪的几何纹理
```

通用模板结构（直接套进 `--prompt`）：

```
[年龄] [性别] [正脸/侧脸/半身]，[表情]，[服装]，
暖沙色调背景，柔和顶光，人像摄影风格，高清细节，
皮肤质感真实，边缘清晰，无蓝紫光，无霓虹色
```

不写「沙画风格」——后面 engine 的 sandify 会负责加颗粒。生图阶段只要干净、好认的真人肖像。

### 3.3 生图后落地

agent 按作业单调用生图工具后，图片命名必须是：
```
<out>_01.png
<out>_02.png
<out>_03.png
```

即 `--out` 的值加 `_NN.png`。

---

## 4. 校验（每张生图必过）

```bash
python3 scripts/images.py validate --src assets/角色_主角_01.png
```

`validate` 执行以下 3 项检查，任何一项失败以非 0 退出：

| 检查项 | 阈值 | 失败时的修法 |
|---|---|---|
| 最小尺寸 | ≥ 1024×1024 | 重新生成时指定更大分辨率；不要放大低分辨率图 |
| 非纯色 | 全图像素标准差 > 10（RGB 任一通道） | 重新生成，当前是一张色块或全黑/全白 |
| 亮度合理 | 平均亮度 ∈ [50, 230]（0-255） | 太暗 → 换更亮的光照提示词；太亮 → 降低曝光 |

输出示例（通过）：
```
[validate] assets/角色_主角_01.png
  尺寸: 1024x1024  ✅
  非纯色 (std=62.3)  ✅
  平均亮度 (156.2)  ✅
  结论: PASS
```

输出示例（失败）：
```
[validate] assets/角色_主角_02.png
  尺寸: 512x512  ❌ 期望 >= 1024x1024
  结论: FAIL (1 项未通过)
```

### 4.1 人工两层验收（机器 validate 不替代）

validate 通过后，还要人工过两关：

1. **是否一眼认出**：把图片缩小到 200×200，仍然能说出这是谁。不能 → 换角度/表情/服装重新生成。
2. **沙化后颗粒厚度正确**：挑一张脸的边缘和头发细节多的图。可以先跑：
   ```bash
   python3 scripts/images.py validate --src assets/角色_主角_01.png --sand-preview
   ```
   （`--sand-preview` 会在同目录写一张 `*_sandpreview.png`，用简化版颗粒合成查看大致效果；颗粒堆在头发/眉毛处的厚度要看起来自然，不要脸中间一片平滑）

---

## 5. 审批通过：固定文件路径

从 N 张候选中选一张，在 `<项目>/assets/` 下写一个审批标记文件：

```
assets/
├── 角色_主角_01.png     ← 候选A
├── 角色_主角_02.png     ← 候选B（被选中）
├── 角色_主角_03.png     ← 候选C
└── 角色_主角_已批准.json   ← ← ← 必须有这个文件
```

`角色_主角_已批准.json` 内容：

```json
{
  "approved_file": "角色_主角_02.png",
  "role": "主角",
  "approved_at": "2025-10-10T15:00:00Z",
  "checks": {
    "recognizable": true,
    "sand_thickness_ok": true,
    "validate_passed": true
  }
}
```

**后续 engine 只读这份 JSON 指向的文件**。候选图可以保留，但不会被误用。

---

## 6. Engine 沙化合成（sandify 如何用它）

在 scene JS 或 clip spec 里引用时，写：

```js
// scenes/xxx.js 中
const characterImg = SAND.loadImage("assets/角色_主角_已批准.json");
// loadImage 会读 JSON 的 approved_file 字段，加载真正的 PNG

// 合成
SAND.sandify(characterImg, {
  area: { x: 0.65, y: 0.2, w: 0.3, h: 0.6 },  // 放到沙台右上
  grainDensity: 0.85,        // 脸部用高密度颗粒，细节清楚
  edgeDensity: 1.2,          // 轮廓处额外堆沙
  hairBoost: 1.4,            // 头发区颗粒放大倍率
  grainColor: palette.sandColors[2],  // 颗粒主色来自色板
  blendMode: "overlay"
});
```

`sandify()` 在 engine 里做的事：
1. 读取原图 → 灰度 → 按「暗=沙厚、亮=沙薄」映射成高度图
2. 对高度图做 2px 高斯模糊，避免锯齿
3. 在每个像素位置按高度撒对应数量的沙粒（从色板中挑色，带随机抖动）
4. 轮廓线（边缘检测响应 > 阈值）额外叠加一层更细的颗粒
5. 头发区域（原图中最暗的 15% 像素）颗粒数量 × `hairBoost`

渲染后抽帧时再用肉眼确认：
- 颗粒厚度和原图的明暗对应 → 对
- 眼睛/嘴唇等关键特征不因颗粒被糊掉 → 对
- 整张脸不像是贴图盖在沙台上，而是沙粒堆出来的 → 对

对不上就回到第 4 节换一张图，或者调 `grainDensity` / `hairBoost` 参数。

---

## 7. 速查：全流程命令串

```bash
# 1. 能力检查
python3 scripts/capabilities.py status

# 2. 生成作业单 / 导入
python3 scripts/images.py gen --prompt "30岁女性正脸微笑，暖沙色调" --count 3 --out assets/主角
# 或
python3 scripts/images.py import --src ~/me.jpg --out assets/主角_01.png

# 3. 【agent 执行】调用生图工具产出 assets/主角_01.png ~ _03.png

# 4. 校验每张
for i in 01 02 03; do
  python3 scripts/images.py validate --src assets/主角_${i}.png || echo "FAIL $i"
done

# 5. 人工选一张 → 写 主角_已批准.json

# 6. 渲染抽帧看沙化效果
python3 代码工程/render.py --solo scene_with_face --stills 0.5,1,2 --out qa/face_check
```
