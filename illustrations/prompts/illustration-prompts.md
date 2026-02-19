# Illustration Prompts

## 01-comparison-dual-mode.png

Minimalist hand-drawn line art comparison diagram on pure white background. Notion-style with slight wobble in lines.

Layout: Split composition, left and right panels with a vertical divider in center.

LEFT SIDE - "扫描模式" (Scan Mode):
- Input icons at top: Lists icon and Home icon with labels "Lists" and "Home"
- Arrow down to "抓取" (Scrape) step
- Arrow down to "筛选" (Filter) step with funnel icon
- Arrow down to "评分" (Score) step with star rating icon
- Arrow down to "排名" (Rank) step
- Arrow down to output: "Top N 选题推荐" with document icon
- Color accent: Pastel Blue (#A8D4F0) for highlights

RIGHT SIDE - "书签模式" (Bookmark Mode):
- Input icon at top: Bookmark icon with label "Bookmarks"
- Arrow down to "抓取" (Scrape) step
- Arrow down to "AI 深度分析" step with brain/AI icon
- Arrow down to "保留全部" (Keep All) step
- Arrow down to output: "完整日报" with document icon
- Color accent: Pastel Yellow (#F9E79F) for highlights

CENTER DIVIDER: Dashed vertical line with "自动路由" label and branching arrows icon

All text in Chinese. Simple doodle-style icons. Single-weight black lines (#1A1A1A) with pastel accents. Maximum whitespace.

Include a subtle watermark "懂点儿AI" positioned at bottom-right with approximately 70% visibility.

ASPECT: 16:9


## 02-flowchart-architecture.png

Minimalist hand-drawn line art flowchart on pure white background. Notion-style with intentional wobble.

Layout: Left-to-right flow with one branch point.

STEPS:
1. "来源 URL" - rounded rectangle, starting node
2. "自动路由" - diamond/decision shape, branch point
3. "Chrome CDP 抓取" - rectangle with Chrome icon doodle
4. "Thread/长文 展开" - rectangle with expand arrows icon
5. Two branches from step 4:
   - Upper branch (Pastel Blue): "筛选 + 排名" → "选题推荐报告"
   - Lower branch (Pastel Yellow): "AI 全量分析" → "书签日报"

CONNECTIONS: Hand-drawn arrows with slight curve. Decision diamond has two labeled exits: "Lists/Home" going up, "Bookmarks" going down.

Labels along the flow: small annotations like "WebSocket", "CDP", "Gemini API" in gray (#4A4A4A)

All text in Chinese. Simple line doodles. Black outlines (#1A1A1A) on white (#FFFFFF). Pastel accents for the two mode branches.

Include a subtle watermark "懂点儿AI" positioned at bottom-right with approximately 70% visibility.

ASPECT: 16:9


## 03-infographic-ai-scoring.png

Minimalist hand-drawn line art infographic on pure white background. Notion-style with slight wobble.

Layout: Center-focused radial with surrounding elements.

CENTER: Triangle/radar chart with three axes:
- 🎯 创新性 (Innovation) — axis going up-left, scale 1-5
- 💡 实用性 (Practicality) — axis going up-right, scale 1-5
- 📈 影响力 (Influence) — axis going down, scale 1-5
- A filled polygon showing example scores (e.g., 4, 3, 5) with Pastel Blue (#A8D4F0) fill

SURROUNDING ELEMENTS (arranged around the radar):
- Top-right: "智能分类" with 6 small category tag bubbles: ai-tools, industry-news, tech-breakthroughs, tutorials, controversial, other
- Bottom-left: "中文标题 / 摘要" with a small text snippet icon
- Bottom-right: "关注理由" with a lightbulb doodle
- Top-left: "标签" with hashtag icons

FLOW: Small arrow from a tweet icon (left edge) through the scoring system to a scored result card (right edge), showing transformation.

All text in Chinese. Simple doodle icons. Black lines (#1A1A1A). Pastel accents sparingly. Maximum whitespace.

Include a subtle watermark "懂点儿AI" positioned at bottom-right with approximately 70% visibility.

ASPECT: 16:9


## 04-infographic-modules.png

Minimalist hand-drawn line art module dependency diagram on pure white background. Notion-style.

Layout: Center-hub with 4 satellite nodes.

CENTER HUB: Large rounded rectangle "x-topic-selector.ts" labeled "主入口 / 编排器" with a conductor/orchestrator doodle icon. Pastel Blue (#A8D4F0) subtle fill.

SATELLITE NODES (connected to center with hand-drawn lines):
- Top-left: "ai-client.ts" — "AI 客户端抽象" with API icon. Small labels: "Gemini", "OpenAI"
- Top-right: "ai-scorer.ts" — "评分逻辑" with score/star icon. Small label: "批量并发"
- Bottom-right: "report-generator.ts" — "报告生成" with document/Markdown icon. Small label: "Mermaid 图表"
- Bottom-left: "x-utils.ts" — "CDP 工具" with Chrome icon. Small label: "WebSocket"

DATA FLOW ARROWS (gray #4A4A4A, dashed):
- Center → ai-client: "创建客户端"
- Center → ai-scorer: "推文数据"
- ai-scorer → report-generator: "评分结果"
- Center → x-utils: "Chrome 连接"
- x-utils → Center: "CDP 会话"
- ai-client → ai-scorer: "AI 接口"

Small line count annotations near each node in light gray: "(1020行)", "(139行)", "(421行)", "(470行)", "(219行)"

All text in Chinese. Simple doodle icons. Black outlines on white. Minimal pastel accents.

Include a subtle watermark "懂点儿AI" positioned at bottom-right with approximately 70% visibility.

ASPECT: 16:9
