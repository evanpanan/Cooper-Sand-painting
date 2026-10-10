# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-10

### Added

- **SKILL.md** - Core router document defining skill triggers, input parsing, and the 8-step
  rendering pipeline: intent → breakdown → storyboard_lint → spec composition → render →
  qa → film_gate → deliver.
- **12 Method Reference Docs** in `references/`:
  - 01-拆解.md: Scene deconstruction methodology for converting natural-language scripts
    into renderable sand painting shot lists.
  - 02-机制.md: The 5-layer sand painting visual mechanism (light table → thin sand bed
    → thick sand shapes → scratch highlights → motion motifs).
  - 03-一帧先行四条路线.md: Four validation paths before committing to full render
    (static frame preview, grain quality check, light transmission check, motion range check).
  - 04-纯代码绘制.md: Pure-code sand painting rendering API via `SAND.*` functions and the
    `scenes/*.js` scene descriptor pattern.
  - 05-节奏与配乐.md: Beat-synced animation timing, the 3:7 keyframe rule, and breath
    pauses between narrative beats.
  - 06-口播驱动的艺术短片.md: Voiceover-first pipeline: transcript → phoneme timings →
    sand gesture choreography → final composite.
  - 07-正面经验.md: Curated list of 30+ proven sand painting compositions, motifs, and
    transitions with reference stills.
  - 08-风格作者规范.md: Style author guide for adding new palettes and rendering variants
    without breaking the s01 baseline quality.
  - 09-视频动画语法.md: Master index of the 8 grammar families (y1–y8) with usage scope
    and cross-references.
  - 10-角色.md: Character rendering in sand: silhouette → detail scratch → 3 expression
    archetypes (warm smile / neutral / determined).
  - 11-长卷穿越片.md: Long-scroll (horizontal pan) feature-film-style sand painting shots,
    parallax layers, and the "scroll reveal" signature motion.
  - 12-口播整片与经验回流.md: End-to-end voiceover short film production workflow and the
    empirical experience feedback loop.
- **3 Style Recipe Cards** in `references/风格配方/`:
  - 01_classic_warm.md: Classic warm sand palette, 5-layer draw order, 6 motion motifs, 3
    signature transitions, and the s01 acceptance checklist.
  - 02_colorful_sand.md: Multi-hued celebration palette with enforced ≥70% warm-color
    ratio rule, 4-layer max for visual cleanliness, and festival/children's usage notes.
  - 03_glow_night.md: Night-glow neon palette with dark blue-purple light table (the only
    approved exception to the warm-only rule), bloom strength guidelines, and
    sci-fi/dreamscape usage notes.
- **8 Grammar Cards** in `references/沙画语法/` (y1_whiteboard_hand, y2_pour_reveal,
  y3_palm_wipe_list, y4_flow_gather, y5_split_compare, y6_line_highlight,
  y7_finance_chart, y8_keynote_bigtype) — each with field-level JSON schema, timing
  rules, hard lint constraints, and pitfalls.
- **6 Signature Transitions** in `scripts/engine/transitions.js`:
  - `t_light_table`: Opening fade (light table → thin sand → pour → first frame), 0.8s.
  - `t_pour_in`: Direct sand pour reveal, 0.6s.
  - `t_wipe_palm`: Palm wipe L→R with pushed-sand ridges, 0.45s.
  - `t_finger_draw`: Scratch line that cuts old scene to reveal new, 0.4s.
  - `t_blow_away`: Sand grains blown off-screen by wind, 0.7s.
  - `t_sift_fade`: Thin-sand sift-down dissolve, 0.55s.
- **4 Example Scenes** in `scripts/engine/scenes/` plus the `index.js` scene router with
  auto-registration pattern and `scenes/s01_classic.js` canonical 5-layer baseline scene.
- **render.py** — Headless CLI renderer: spec JSON → Playwright-driven Canvas → FFmpeg
  MP4. Supports `--solo` (single example), `--spec` (custom spec file), shot-range
  cropping, and deterministic frame hashing.
- **qa.py** — 12-check quality audit: determinism (same spec → identical pixels), grain
  layer thickness correlation, light table visibility in scratches, frame-difference
  motion range (3.5%–10%), text legibility (≥3px stroke), palette warm-color ratio,
  grammar lint rules, audio peak level, frame-drop check, transition duration bounds,
  color-hue constraints, and output file integrity.
- **storyboard_lint.py** — Pre-render static spec validator: text-length-per-line caps,
  segment count caps, timing overlap detection, y_max ≥ 1.2×max(data) for charts,
  palette/theme consistency, segment coordinate bounding, and callout-to-total temporal
  ordering.
- **breakdown.py** — Natural-language Chinese script → structured shot list decomposer
  with grammar auto-assignment, palette suggestion, and per-shot duration estimation.
- **deliver.py** — Final packaging: MP4 + storyboard PDF + QA report zip, with naming
  convention `{project}_{yyyymmdd}_{grammar}.mp4`, checksum manifest, and delivery
  checklist stamp.
- **film_gate.py** — Final human-review checklist runner before delivery. Ensures the
  release candidate passes all 12 QA checks, required metadata, thumbnail stills,
  and audio-sync spot checks (3 random timecodes).
