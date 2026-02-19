---
type: mixed (flowchart + infographic)
density: balanced
style: notion
image_count: 4
language: zh-CN
watermark: 懂点儿AI
---

## Illustration 1

**Position**: After "双模式自动路由" section header (line 15-25)
**Purpose**: Visually distinguish the two operating modes — Scan vs Bookmark — as a side-by-side comparison
**Visual Content**: Left side shows Scan mode pipeline (Lists/Home → Filter → Score → Rank → Top N), right side shows Bookmark mode pipeline (Bookmarks → AI Analysis → Keep All → Digest). Center divider with auto-routing indicator.
**Type Application**: Comparison with flowchart elements — two parallel pipelines
**Filename**: 01-comparison-dual-mode.png

## Illustration 2

**Position**: After "架构概览" section (line 80-87), replacing the ASCII art
**Purpose**: Replace the text-based architecture diagram with a proper visual flowchart
**Visual Content**: End-to-end pipeline: Source URL → Auto-Route → Chrome CDP Scrape → Thread/Text Expansion → Score/Filter → Report Generation. Branch at auto-route showing Lists/Home → Scan path and Bookmarks → Bookmark path.
**Type Application**: Flowchart — left-to-right pipeline with branch point
**Filename**: 02-flowchart-architecture.png

## Illustration 3

**Position**: After "AI 评分维度" section (line 27-39)
**Purpose**: Visualize the 3-axis scoring system and additional AI outputs
**Visual Content**: Three radar/axis diagram with Innovation (1-5), Practicality (1-5), Influence (1-5). Surrounding elements: category tags, Chinese title/summary, translation, reason. Show how raw tweet becomes scored tweet.
**Type Application**: Infographic — data visualization with metrics
**Filename**: 03-infographic-ai-scoring.png

## Illustration 4

**Position**: After "模块职责" table (line 89-97)
**Purpose**: Show module relationships and data flow between the 5 components
**Visual Content**: 5 modules as connected nodes: x-topic-selector.ts (orchestrator, center) connecting to ai-client.ts, ai-scorer.ts, report-generator.ts, x-utils.ts. Show data flow: tweets → scorer → report, with x-utils providing Chrome CDP infrastructure.
**Type Application**: Infographic/framework — module dependency diagram
**Filename**: 04-infographic-modules.png
