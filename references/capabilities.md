# 语音与图像能力配置指南

> **核心原则**：语音和图像能力是**按会话可选（Optional per-session）**的。不配置这些能力，沙画动画仍然可以正常进行静默渲染。本指南仅用于需要角色 F3/F4 精细度、或需要口播解说的场景。

---

## 1. 什么时候需要配置

| 场景 | 需要语音能力 | 需要图像能力 |
|---|---|---|
| 纯静默沙画动画（撒沙、手指作画、转场） | ❌ 不需要 | ❌ 不需要 |
| 参数化片段 + 屏上字（无配音） | ❌ 不需要 | ❌ 不需要 |
| 角色 F1/F2（只出手和背影，纯代码画剪影） | ❌ 不需要 | ❌ 不需要 |
| 角色 F3（方案A：生帧 → 沙化合成） | ❌ 不需要 | ✅ 必须配置 |
| 角色 F4（精细人脸沙化） | ❌ 不需要 | ✅ 必须配置 |
| 口播驱动解说短片（无配音，只出画面） | ❌ 不需要 | ❌ 不需要 |
| 口播驱动解说短片（需要生成配音 wav） | ✅ 必须配置 | ❌ 不需要 |
| 整片片尾出人物介绍 + 真人沙化脸 | ❌ 不需要 | ✅ 必须配置 |

---

## 2. 能力状态检查

任何时候执行下面这条命令查看当前配置状态：

```bash
python3 .trae/skills/sand-painting-motion/scripts/capabilities.py status
```

输出示例（未配置时）：
```
[capabilities] 语音能力: ❌ 未配置（可用模式: existing_recording / system_synth / trained_voice_replica）
[capabilities] 图像能力: ❌ 未配置（可用模式: import_existing / generation_by_tool / none）
[capabilities] 提示: 运行 capabilities.py --help 查看启用方式
```

输出示例（已配置时）：
```
[capabilities] 语音能力: ✅ 已配置
              mode   = system_synth
              voice  = default_narrator
              path   = ~/.sand-painting-caps/voice.json
[capabilities] 图像能力: ✅ 已配置
              mode   = generation_by_tool
              tool   = text_to_image
              path   = ~/.sand-painting-caps/image.json
```

带解释的输出：
```bash
python3 scripts/capabilities.py status --explain
```

---

## 3. 语音能力的三种模式

### 3.1 Mode A: `existing_recording` — 用户自备录音

适用场景：用户自己录了口播 wav，只想做对齐和混音。

**配置命令**：
```bash
python3 scripts/capabilities.py voice enable \
  --mode existing \
  --recording-dir /path/to/user/recordings
```

**提供的能力**：
- `koubo.py` 的 `voices` 子命令会列出 `--recording-dir` 下的所有 wav 文件作为可用"音色"
- `koubo.py say` 会按文本名匹配现有文件，找不到则报错提示手动指定 `--file`
- 不做任何 TTS 合成，不联网

### 3.2 Mode B: `system_synth` — 系统内置数学合成

适用场景：没有外部 TTS 库，但需要生成占位音频做节奏对齐；后期可替换为真人配音。

**配置命令**：
```bash
python3 scripts/capabilities.py voice enable --mode synth
```

**提供的能力**：
- `koubo.py say "文本" --out out.wav` 会用纯 numpy 共振峰合成生成 22050Hz 单声道 WAV
- 元音 a/e/i/o/u 有不同共振峰频率，辅音做静音/噪声占位
- 输出可被 ffmpeg 正常识别，时长可用于脚本节奏对齐
- **完全离线**，不加载任何外部模型，不联网

### 3.3 Mode C: `trained_voice_replica` — 用户音色复刻

适用场景：用户提供自己的语音素材，需要克隆音色做长篇解说。

**配置命令**：
```bash
python3 scripts/capabilities.py voice enable \
  --mode trained \
  --voice-model-dir /path/to/user/trained_models \
  --voice-name my_voice
```

**提供的能力**：
- `koubo.py train` 输出素材收集指引（不会实际训练，见第 5 节安全说明）
- `koubo.py voices` 列出模型目录下已有的音色名
- `koubo.py say` 调用外部合成脚本（若存在），否则降级到 `system_synth` 并告警

---

## 4. 图像能力的三种模式

### 4.1 Mode A: `import_existing` — 导入用户已有图片

适用场景：用户提供了自己的照片、手绘稿或已生成好的素材，只需要沙化合成。

**配置命令**：
```bash
python3 scripts/capabilities.py image enable \
  --mode existing \
  --library-dir /path/to/user/images
```

**提供的能力**：
- `images.py import --src photo.jpg --out project/assets/char.png` 复制并校验尺寸
- `images.py validate --src char.png` 校验分辨率、色彩分布、亮度
- 引擎 `sandify()` 函数直接读取该路径做颗粒合成

### 4.2 Mode B: `generation_by_tool` — 调用可用生图工具

适用场景：需要 AI 生成角色 F3/F4 生帧，然后沙化。

**配置命令**：
```bash
python3 scripts/capabilities.py image enable --mode generate
```

**提供的能力**：
- `images.py gen --prompt "中年男子侧脸，暖沙色调" --count 3 --out project/assets/` 输出**生成作业单 JSON**（不是直接生成图片）
- 作业单格式：`{ "prompt": str, "steps": [...], "tool_hint": "text_to_image" }`
- 具体生成由 agent 调用环境中可用的生图工具完成（如 text_to_image skill）
- **默认不直接调用任何模型**，只输出结构化的生成计划供上层执行

### 4.3 Mode C: `none` — 显式关闭图像能力

适用场景：当前项目不需要任何生图，避免误用。

```bash
python3 scripts/capabilities.py image enable --mode none
```

---

## 5. 配置文件路径与安全

### 5.1 配置存放位置

所有能力配置**不放在 skill 安装目录内**，也不提交到项目仓库。使用用户主目录下的私有配置目录：

```
~/.sand-painting-caps/
├── voice.json          # 语音能力配置（含路径引用，不含密钥明文）
├── image.json          # 图像能力配置
└── README.txt          # 说明文件，首次生成时写入
```

对应关系：
- macOS / Linux: `$HOME/.sand-painting-caps/`
- Windows: `%USERPROFILE%\.sand-painting-caps\`

### 5.2 JSON 结构（写入时自动校验）

`voice.json` 示例：
```json
{
  "version": 1,
  "mode": "synth",
  "updated_at": "2025-10-10T12:00:00Z",
  "options": {
    "sample_rate": 22050,
    "default_voice": "default_narrator"
  }
}
```

`image.json` 示例：
```json
{
  "version": 1,
  "mode": "generate",
  "updated_at": "2025-10-10T12:00:00Z",
  "options": {
    "default_size": "1024x1024",
    "library_dir": null
  }
}
```

### 5.3 安全原则

1. **配置文件不含任何 API Key 明文**。若某个生图/语音服务需要密钥，写入用户 shell 环境变量（如 `$OPENAI_API_KEY`），配置中只引用变量名。
2. **不在项目仓库中提交 `~/.sand-painting-caps/`**。`.gitignore` 中默认忽略该模式。
3. **`train` 命令不执行训练**，只打印用户需要自行准备的素材清单。训练是高计算、高隐私操作，必须由用户在自己的环境中手动触发。
4. **所有脚本默认不联网**。需要网络调用的合成模式一律降级为离线占位 + 明确提示。

---

## 6. 相关脚本入口

| 功能 | 脚本 | 文档 |
|---|---|---|
| 能力启用/状态检查 | `scripts/capabilities.py` | 本文档 |
| 语音合成/音色列表/训练指引 | `scripts/koubo.py` | `references/13-口播与语音复刻.md` + `references/口播API.md` |
| 图像生成作业单/导入/校验 | `scripts/images.py` | `references/images.md` |
| 渲染时音频混音 | `scripts/engine/render.py --audio` | `references/06-口播驱动的艺术短片.md` |
