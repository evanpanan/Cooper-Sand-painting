# 兼容性说明

## 1. 经过验证的运行环境

以下组合在 CI / 实际项目中经过完整渲染验证（全流程：镜头表 lint → render → qa → deliver 绿灯）：

| 项目 | 最低版本 | 已知稳定版本 | 备注 |
|---|---|---|---|
| **操作系统** | — | macOS 14 (M1/M2/M3/M4 系列) | 主要开发与测试平台；Apple Silicon 原生运行 |
| | macOS 13 | 13.5+ (Intel) | 可用，ffmpeg 用 brew 版 |
| | Linux Ubuntu | 22.04 LTS (x86_64) | headless 模式，需加 GPU 禁用 flag（见第 2 节） |
| **Python** | 3.10 | 3.10 / 3.11 / 3.12 | 推荐 3.11；3.13 可用但 playwright 某些版本需要升级 |
| **uv** | 0.3 | 0.4+ | 不强制，但文档中命令默认用 `uv run` |
| **Playwright** | 1.40 | 1.44 / 1.45 | Chromium 分支；Firefox/WebKit 未测 |
| **ffmpeg** | 6.0 | 6.1 / 7.0 | `libx264` + `aac` 编码器必须可用 |
| **Pillow** | 9.0 | 10.0+ | images.py validate / qa.py 指标依赖 |
| **numpy** | 1.23 | 1.24+ | koubo.py 合成模式需要 |

### 1.1 macOS 快速检查清单

新机器一键验证：
```bash
python3 --version        # 期望 Python 3.10+
ffmpeg -version          # 期望 ffmpeg 6+，带 --enable-libx264
python3 -c "import PIL; print(PIL.__version__)"   # Pillow 9+
python3 -c "import numpy; print(numpy.__version__)"  # numpy 1.23+
uv --version             # 可选
```

未安装：
```bash
brew install ffmpeg
pip3 install --user pillow numpy playwright
playwright install chromium
```

---

## 2. 已知问题与解决方案

### 2.1 Playwright Chromium 在 Headless Linux 上崩溃

**现象**：Linux 服务器上跑 `render.py`，在 `browser.new_context()` 或截图处崩溃，报错含 `gpu` / `viz` / `sentinel stack trace`。

**根因**：部分无头 Linux 环境没有 GPU，Chromium 默认 GPU 进程启动失败。

**修复**：在 `render.py` 启动参数加禁用 GPU flag。临时改法：

```bash
# 不改代码，用环境变量
export PLAYWRIGHT_CHROMIUM_ARGS="--disable-gpu,--disable-software-rasterizer"
# 然后正常 render
```

永久改法（在 `render.py` 的 `pw.chromium.launch` 里加 args）：
```python
browser = pw.chromium.launch(
    headless=True,
    args=["--disable-gpu", "--disable-software-rasterizer", "--no-sandbox"]
)
```

`--no-sandbox` 仅在 root 用户跑 CI 时需要；本地用户不要加。

### 2.2 PIL 报 "image size exceeds limit"

**现象**：`images.py validate` 或 `qa.py` 处理 >8192px 大图时，Pillow 抛：
```
PIL.Image.DecompressionBombError: Image size (N pixels) exceeds limit of 89478485 pixels
```

**根因**：Pillow 默认防止解压炸弹，限制单图像素上限约 8900 万。

**修复**：在脚本入口前加环境变量覆盖，或在代码里显式设置：

```bash
export MAX_IMAGE_PIXELS=300000000   # 3 亿像素，够 16384x16384
python3 scripts/images.py validate --src 超大幅.png
```

代码中对应：
```python
from PIL import Image
Image.MAX_IMAGE_PIXELS = int(os.environ.get("MAX_IMAGE_PIXELS", 300_000_000))
```

不建议完全设为 `None`（解除所有限制），防御性阈值更安全。

### 2.3 字体子集化步骤可选、失败不阻塞

**现象**：项目中有屏上字需要用非系统字体，跑 subset 时 `fonttools` 没装或字体授权不允许子集化。

**说明**：字体子集是**可选优化步骤**（减少最终视频里嵌入字体的大小）。失败或跳过不会影响渲染画面，只是字体文件稍大。

跳过：
```bash
# render.py 本身不强制做子集化；如果你有自定义 pre-flight 脚本：
export SKIP_FONT_SUBSET=1
```

在 scene 里用 CSS `font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif` 可以完全避免自定义字体需求。

### 2.4 Python 3.14 / Playwright nightly

不保证兼容。遇到时降级 Python 或升级 Playwright 到官方 release 版。

### 2.5 Windows 下路径分隔符

脚本在 Windows 下用 `pathlib.Path`，理论上正斜杠反斜杠都能识别。如果 ffmpeg concat demuxer 不认反斜杠路径，统一把项目放在纯英文路径下（无空格、无中文），或用 WSL2（推荐 Windows 开发环境）。

---

## 3. 向后兼容承诺

### 3.1 版本号含义

`SKILL.md` frontmatter 在未来会加 `version` 字段（目前第一版尚未标注），格式遵循 [SemVer 2.0](https://semver.org)：

```
MAJOR.MINOR.PATCH
```

- **MAJOR 升级**（1.x → 2.x）：包含**破坏性变更**。具体指：
  - `render.py` 的已有 CLI flag 被删除或语义改变
  - 参数化 clip spec JSON 的已有字段被删除/重命名
  - `SAND` 模块公开 API 签名改变
  - `qa.py` 判定阈值收紧导致之前绿灯的片子现在红灯
  - 能力配置 JSON schema 不兼容

- **MINOR 升级**：新增能力，已有用法不变。比如：
  - 新增 `koubo.py` 的子命令
  - `images.py` 新增校验规则但退出码不变
  - 新增沙画语法片段
  - 新的 style recipe

- **PATCH 升级**：修 bug，不影响公共接口。比如：
  - 修 `sandify()` 某边界像素错误
  - 修 lint 漏判
  - 更新文档文字

### 3.2 旧版本片子的可运行性

- 一个项目一旦用某个版本的 skill 成功跑过绿灯，把 `scripts/engine/` 目录原样留在项目里，那么即使 skill 升级 MAJOR，**该项目的代码工程仍然可以渲染**——因为 engine 是复制进项目的，不随 skill 升级。
- `references/` 文档是全局共享的，所以当文档提到的命令与项目内旧脚本冲突时，以项目内 `代码工程/` 的实际脚本 `--help` 输出为准。

### 3.3 破坏性变更的预告窗口

每次 MAJOR 升级前，至少在前一个 MINOR 版本里：
1. 把要删除的 API / flag 标记为 deprecated 但仍正常工作
2. `--help` 输出 deprecated 警告
3. 在 `CHANGELOG.md` 写明替代方案和切换指南

预告窗口内的项目可以有至少一个完整版本周期的升级时间。

---

## 4. 不承诺兼容的场景

以下行为不视为兼容性破坏：
- 同一 spec 两次渲染的像素级完全一致（只承诺同一 t 同一 seed 像素一致；算法内部随机分布的微调不属破坏）
- `qa.py` 判定**放松**（红灯变绿灯视为修复，不是破坏）
- `images.py validate` 新增检查项（默认用 warning 级，不改变退出码；若收紧退出码会提 MINOR 并在 CHANGELOG 注明）
- 内部私有模块（`_` 开头的函数、未在文档中列出的 API）随时可变
