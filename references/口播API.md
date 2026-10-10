# 口播 API 速查卡

> Cheat Sheet：参数化 clip spec 中的 narration 字段、koubo.py 子命令、render.py 音频 flag、逐句对齐 JSON schema。一页内查完，不展开说明。

---

## 1. Clip Spec JSON 字段：`narration`

在片段 spec JSON 顶层写：

```json
{
  "theme": "classic_warm",
  "duration": 4.0,
  "narration": {
    "text": "这一镜解说的完整一句话。",
    "voice": "default_narrator",
    "audio_file": "音频/句03.wav",
    "start_offset": 0.2,
    "loudness_norm": {
      "target": -2.0,
      "lra": 3.0
    }
  },
  "elements": [ ... ]
}
```

字段说明：

| 字段 | 必填 | 类型 | 说明 |
|---|---|---|---|
| `narration.text` | 是（除非有 audio_file） | string | 解说文字；用于自动生成或检索录音 |
| `narration.voice` | 否 | string | 音色名；对应 `koubo.py voices` 的输出；默认用 capabilities 配置的 default_voice |
| `narration.audio_file` | 否 | string | 已有的 wav 路径；指定后直接用，不再调 say |
| `narration.start_offset` | 否 | float | 该镜内解说相对镜起点的延迟秒数；默认 0 |
| `narration.loudness_norm` | 否 | object | 若给出，混音前做响度归一化；字段同下 |

---

## 2. koubo.py 子命令一览

### 2.1 总览

```bash
koubo.py say    <TEXT> [--voice NAME] [--out FILE] [--file OVERRIDE_FILE]
koubo.py voices [--mode MODE]
koubo.py list
koubo.py train  [--out DIR]
```

### 2.2 `koubo.py say` — 生成/取一句音频

```bash
# synth 模式：合成占位音
python3 scripts/koubo.py say "这是一句解说" \
  --voice default_narrator \
  --out 句01.wav

# existing 模式：按文本匹配现有 wav；找不到就报错
python3 scripts/koubo.py say "这是一句解说" --out 句01.wav

# 直接指定文件（三种模式都认）
python3 scripts/koubo.py say "" --file 已有的.wav --out 句01.wav
```

退出码：
- 0：成功，--out 路径已写入 wav
- 1：语音能力未配置；stderr 含提示 `请先运行 capabilities.py voice enable ...`
- 2：参数错误 / 找不到指定文件

### 2.3 `koubo.py voices` — 列出可用音色

```bash
python3 scripts/koubo.py voices
```

输出示例（synth 模式）：
```
[koubo] 当前模式: synth
  NAME                 LABEL
  default_narrator     内置合成（中文占位共振峰音）
  deep_narrator        内置合成（低频，男声风格）
  light_narrator       内置合成（高频，女声风格）
共 3 个音色
```

输出示例（existing 模式）：
```
[koubo] 当前模式: existing  录音目录 = ~/recordings
  NAME (文件名)
  user_intro.wav
  chapter1.wav
  chapter2.wav
共 2 个录音
```

`--mode synth|existing|trained` 可临时切换视角查看，不改变实际配置。

### 2.4 `koubo.py list` — voices 的纯文本别名

```bash
python3 scripts/koubo.py list
```

输出适合脚本 `grep` / `cut`，不打印前缀：
```
default_narrator	内置合成（中文占位共振峰音）
deep_narrator	内置合成（低频，男声风格）
light_narrator	内置合成（高频，女声风格）
```

### 2.5 `koubo.py train` — 打印素材收集清单

```bash
python3 scripts/koubo.py train --out ~/voice_assets
```

行为：**不处理任何音频，不联网，不上传**。仅：
1. 在 `--out` 写 `素材清单.md`（目录结构 + 最低数量要求 + 合规声明模板）
2. stdout 打印清单摘要
3. 以 0 退出

---

## 3. render.py 音频相关 flag

### 3.1 快速对照

```bash
python3 代码工程/render.py \
  --spec 镜03.json \
  --out 镜03.mp4 \
  --audio 音频/口播_整片.wav \
  --audio_mix 1.0
```

| flag | 说明 |
|---|---|
| `--audio PATH` | 额外混入的音频文件（wav/mp3/aac 均可）。默认和视频等长；长了裁掉，短了补静音 |
| `--audio_mix FLOAT` | 音频轨整体音量倍率，0–1 默认 0.8。1.0 表示原音量（配合口播_已标化.wav 使用） |
| `--sfx_only` | 不出视频，只出一条 WAV 音效占位轨（给后续分步混音用） |

### 3.2 spec 内 narration 和 --audio 的优先级

当同时指定时：
1. 如果 spec 有 `narration.audio_file` → 用该句级文件，拼进对应时间窗
2. 如果 spec 只有 `narration.text` 且没音频 → 调 `koubo.py say` 合成后拼
3. `--audio` 叠加在上面（通常作为 BGM 或整片解说轨）

**建议二选一**：要么整片 `--audio 口播_整片.wav`，要么每镜 spec 写 `narration`。不要两套同时上。

---

## 4. 逐句对齐 JSON Schema（`逐句对齐.json`）

文件路径：`<项目>/音频/逐句对齐.json`

```json
{
  "version": 1,
  "source_audio": "口播_已转.wav",
  "source_script": "文稿.txt",
  "align_tool": "manual_20251010",
  "sentences": [
    {
      "sentence": "第一句，关于主题是什么。",
      "start": 0.000,
      "end": 2.413,
      "confidence": 0.80,
      "index": 1
    },
    {
      "sentence": "第二句，核心观点和数据。",
      "start": 2.713,
      "end": 5.108,
      "confidence": 0.80,
      "index": 2
    }
  ],
  "total_duration": 18.2
}
```

### 4.1 字段必填表

| 字段 | 必填 | 类型 | 单位/值域 |
|---|---|---|---|
| `version` | 是 | int | 目前固定 1 |
| `source_audio` | 是 | string | 被对齐的原始音频相对路径 |
| `source_script` | 否 | string | 文稿文件相对路径 |
| `align_tool` | 是 | string | `manual`、`whisper_timestamped`、`aeneas`、… |
| `sentences` | 是 | array | 至少 1 句 |
| `sentences[].sentence` | 是 | string | 与 `source_script` 逐行对应 |
| `sentences[].start` | 是 | float | 秒，≥0，保留 3 位小数 |
| `sentences[].end` | 是 | float | 秒，> start |
| `sentences[].confidence` | 是 | float | 0–1；手工填 0.80，工具填实际值 |
| `sentences[].index` | 是 | int | 从 1 开始递增 |
| `total_duration` | 否 | float | 整片秒数，便于镜头表反查 |

### 4.2 校验小命令

```bash
python3 -c "
import json, sys
d = json.load(open(sys.argv[1]))
assert isinstance(d['sentences'], list) and d['sentences']
prev_end = -1
for s in d['sentences']:
    for k in ['sentence','start','end','confidence','index']:
        assert k in s, f'missing {k}'
    assert s['start'] >= prev_end, f'overlap at index {s[\"index\"]}'
    assert s['end'] > s['start']
    assert 0 <= s['confidence'] <= 1
    prev_end = s['start']
print(f'OK: {len(d[\"sentences\"])} 句')
" 逐句对齐.json
```
