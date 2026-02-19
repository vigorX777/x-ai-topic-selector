# X AI Topic Selector

智能 Twitter/X 选题助手 — 从海量推文中筛选精华，或深度分析收藏内容，给出选题意见。由公众号「懂点儿AI」开发维护。如有问题或建议，欢迎关注公众号反馈。
## 这是什么

X AI Topic Selector 是一个 Claude Agent 技能，帮内容创作者从 X (Twitter) 上高效发现优质内容、生成结构化选题报告。由「懂点儿AI」开发维护。

支持两种工作模式：

- **扫描模式**：从 Lists / Home 过滤热门推文，评分排名后生成 Top N 精选推荐
- **书签模式**：从 Bookmarks 提取全部收藏，AI 深度分析后整理为完整日报

## 核心功能

### 双模式自动路由

系统根据内容来源自动选择工作模式：

| 模式 | 触发来源 | 核心逻辑 | 输出 |
|------|----------|----------|------|
| **扫描过滤** | Lists / Home | 抓取 → 筛选 → 评分 → Top N 截断 | 精选选题推荐 |
| **书签提取** | Bookmarks | 抓取 → AI 深度分析 → 保留全部 | 完整日报 |

- **扫描模式**：支持关键词过滤（包含/排除）、分类过滤（6 类）、数据或 AI 评分、Top N 排名
- **书签模式**：强制 AI 分析，不做过滤和排名，目标是「理解辅助」而非质量筛选

### AI 评分维度

基于 Gemini API（默认 `gemini-2.0-flash`，可通过 `GEMINI_MODEL` 自定义）或 OpenAI 兼容 API，对每条推文进行多维分析：

- **三维评分**（各 1-5 分）+ 每维评语
  - 🎯 创新性（innovation）— 新颖度、原创性
  - 💡 实用性（practicality）— 实用价值、可操作性
  - 📈 影响力（influence）— 行业影响、传播潜力
- **智能分类**：ai-tools / industry-news / tech-breakthroughs / tutorials / controversial / other
- **标签**：自动生成话题标签（tags）
- **中文标题 / 摘要**：为英文内容生成中文标题和摘要
- **英文翻译**：英文原文的完整中文翻译（translation）
- **关注理由**：一句话说明「为什么值得关注」（reason）

### 数据评分

无需 API Key，基于互动数据计算热度分：

```
点赞 × 1 + 转发 × 3 + 评论 × 2 + 浏览量 × 0.01
```

分数在批次内归一化到 0-100。

### 智能内容展开

- **Thread 并发展开**：自动检测并在独立标签页中展开 Thread，并发度 3
- **长文本展开**：被截断的推文自动导航到详情页获取完整内容
- **去噪过滤**：可配置关键词白名单 / 黑名单

### AI 生成内容

书签日报模式额外生成：

- **今日看点**（highlights）：AI 生成的当日亮点摘要
- **选题思路**（topicSuggestions）：基于收藏内容的创作建议

## 输出示例

报告以 Markdown 格式输出，包含 Mermaid 图表和结构化数据。完整样本参见 `docs/` 目录：

### 扫描模式

示例报告：[docs/example-scan-report.md](docs/example-scan-report.md)

报告结构：摘要统计 → 互动热度 Top 3 → 关键词词频图（Mermaid） → Top N 选题推荐（含 AI 评分、评语、标签、翻译）

### 书签模式

示例报告：[docs/example-bookmark-digest.md](docs/example-bookmark-digest.md)

报告结构：今日看点 → 今日必读（Top 3 深度展示） → 数据概览（分类饼图、关键词 Mermaid 图、ASCII 柱状图、标签云） → 分类文章列表 → 选题思路

## 架构概览

```
来源 URL → 自动路由 → Chrome CDP 抓取 → Thread/长文展开 → 评分/过滤 → 报告生成
               │                                                    │
               ├── Lists/Home ──→ 扫描模式 ──→ 筛选+排名 ──→ 选题推荐报告
               └── Bookmarks ──→ 书签模式 ──→ AI 全量分析 ──→ 书签日报
```

### 模块职责

| 模块 | 行数 | 职责 |
|------|------|------|
| `x-topic-selector.ts` | 1020 | 主入口：CLI 解析、Chrome 启动、推文抓取、模式路由 |
| `ai-client.ts` | 139 | AI 客户端抽象：AIClient 接口、Gemini/OpenAI 实现、工厂函数 |
| `ai-scorer.ts` | 421 | AI 评分逻辑：批量评分、并发控制、亮点/选题生成 |
| `report-generator.ts` | 470 | Markdown 报告：扫描报告 + 书签日报，图表可视化 |
| `x-utils.ts` | 219 | CDP 连接管理、Chrome 路径检测、平台工具函数 |

### 技术栈

- **运行时**：Bun（TypeScript 直接执行，无编译）
- **浏览器自动化**：Chrome DevTools Protocol（原生 WebSocket）
- **AI 模型**：Google Gemini API / OpenAI-compatible API（可配置）
- **输出格式**：Markdown + Mermaid 图表

## 快速开始

### Agent 模式（推荐）

```bash
/x-ai-topic-selector
# 或直接调用
/select-topics
```

唯一命令 `/select-topics` 统一处理所有来源，按提示选择：

1. **内容来源**：Lists / Home / Bookmarks
2. **参数配置**：评分方式、分类过滤、推荐数量（书签模式自动跳过）
3. **API Key**：书签模式或 AI 评分模式需提供（自动保存）

下次运行可直接选「使用上次配置」，1 秒启动。

### 命令行模式

```bash
# 扫描列表（数据评分）
bun run scripts/x-topic-selector.ts "https://x.com/i/lists/1234567890"

# 扫描列表（AI 评分 + Top 5）
bun run scripts/x-topic-selector.ts "https://x.com/i/lists/123" --score-mode ai-only --top-n 5

# 书签日报（自动强制 AI 分析）
bun run scripts/x-topic-selector.ts "https://x.com/i/bookmarks" --max-tweets 50

# 书签日报（--digest 别名，等价写法）
bun run scripts/x-topic-selector.ts --digest --max-tweets 100 --top-n 10

# 调试模式
bun run scripts/x-topic-selector.ts 1234567890 --dry-run --max-tweets 10

# 使用 DeepSeek 作为 AI 提供商
bun run scripts/x-topic-selector.ts "https://x.com/i/lists/123" --score-mode ai-only --ai-provider openai --top-n 5
```

## 参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `<source-url>` | 来源 URL 或列表 ID（支持 Lists / Home / Bookmarks） | 必填 |
| `--score-mode <mode>` | 评分模式：`data-only` 基于互动数据 / `ai-only` 基于 AI 分析（需 API Key） | `data-only` |
| `--ai-provider <provider>` | AI 服务商：`auto-detect` 自动检测 / `gemini` 使用 Gemini / `openai` 使用 OpenAI 兼容接口 | `auto-detect` |
| `--max-tweets <n>` | 最大抓取数量 | 200 |
| `--top-n <n>` | 推荐数量（仅扫描模式生效） | 10 |
| `--topic-category <cat>` | 分类过滤：`all` / `ai-tools` / `industry-news` / `tech-breakthroughs` / `tutorials` / `controversial` | `all` |
| `--keywords <k1,k2>` | 包含关键词，逗号分隔 | - |
| `--exclude <e1,e2>` | 排除关键词，逗号分隔 | - |
| `--output <path>` | 报告输出路径 | 自动生成带时间戳的文件名 |
| `--digest` | 书签日报模式别名（自动设置 bookmarks 来源 + ai-only + top-n 15） | false |
| `--profile <dir>` | Chrome 用户配置目录 | `~/.local/share/x-topic-selector-profile` |
| `--dry-run` | 仅打印结果到终端，不保存文件 | false |
| `--help` | 显示帮助信息 | - |

**注意**：

- 书签模式自动强制 AI 分析，无需手动指定 `--score-mode`
- 首次使用需在 Chrome 中手动登录 X（登录状态会持久化保存）

## 环境配置

| 组件 | 要求 | 说明 |
|------|------|------|
| **运行时** | Bun ≥ 1.0 | 或 Node.js ≥ 18 |
| **浏览器** | Chrome / Chromium | 自动检测系统路径（macOS / Linux / Windows） |
| **API Key** | Gemini API Key | 仅 AI 模式 / 书签模式需要（默认），模型为 `gemini-2.0-flash` |
| **API Key** | OpenAI 兼容 API Key | 可选替代方案，需同时设置 `OPENAI_MODEL`（如 DeepSeek） |

```bash
# 设置 API Key — Gemini（默认 AI 提供商）
export GEMINI_API_KEY="your-api-key"
export GEMINI_MODEL="gemini-2.0-flash"                  # 可选，默认为 gemini-2.0-flash

# 或使用 OpenAI 兼容接口（如 DeepSeek）
export OPENAI_API_KEY="sk-xxxx"
export OPENAI_API_BASE="https://api.deepseek.com/v1"   # 可选，默认 https://api.openai.com/v1
export OPENAI_MODEL="deepseek-chat"                     # 必填，无默认值

# 自定义 Chrome 路径（可选，通常无需设置）
export X_BROWSER_CHROME_PATH="/path/to/chrome"
```

- **获取 API Key**：https://aistudio.google.com/apikey
- **Chrome 用户数据**：`~/.local/share/x-topic-selector-profile`（保存登录状态）
- **配置文件**：`~/.x-topic-selector/config.json`（Agent 模式自动读写）

## 常见问题

### 1. Chrome 未找到

**错误**：`Chrome not found`

**解决**：
```bash
export X_BROWSER_CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

### 2. X 账号未登录

**错误**：`Please log in to X`

**解决**：
1. 首次运行时 Chrome 会自动打开
2. 在打开的窗口中手动登录 X 账号
3. 登录状态会保存到 Chrome profile，下次无需重复登录

### 3. Gemini API Key 未设置

**错误**：`GEMINI_API_KEY not set`

**解决**：
```bash
export GEMINI_API_KEY="your-api-key"
# 或在 Agent 交互式流程中输入（自动保存到 config.json）
```

获取 API Key：https://aistudio.google.com/apikey

### 4. 未抓取到推文

**可能原因**：URL 格式错误、列表为私有或空、账号未登录、网络问题

**解决**：
1. 确认 URL 格式：`https://x.com/i/lists/1234567890`
2. 在浏览器中手动打开链接检查内容是否可访问
3. 重新登录 X（可删除 `~/.local/share/x-topic-selector-profile` 后重试）

### 5. AI 评分失败

**错误**：`429 Too Many Requests`

**解决**：
1. 等待 1-2 分钟后重试（Gemini API 限制 15 RPM）
2. 检查 API Key 配额
3. 切换到数据模式：`--score-mode data-only`

### 6. 报告内容为空

**可能原因**：关键词过滤过严、分类筛选过窄、Top N 设置过小

**解决**：
1. 检查 `--keywords` 和 `--exclude` 是否过于严格
2. 设置 `--topic-category all`
3. 增大 `--max-tweets` 和 `--top-n`
4. 使用 `--dry-run` 在终端查看中间结果

### 7. 如何使用 DeepSeek / OpenAI 兼容接口？

设置以下环境变量后，使用 `--ai-provider openai` 即可：

```bash
export OPENAI_API_KEY="sk-xxxx"
export OPENAI_API_BASE="https://api.deepseek.com/v1"
export OPENAI_MODEL="deepseek-chat"

bun run scripts/x-topic-selector.ts "https://x.com/i/lists/123" --score-mode ai-only --ai-provider openai
```

**注意**：`OPENAI_MODEL` 必填，无默认值。`OPENAI_API_BASE` 可选，默认为 `https://api.openai.com/v1`。

也可以不指定 `--ai-provider`，系统会按 Gemini → OpenAI 的优先级自动检测可用的 API。

## 更新日志

详见 [CHANGELOG.md](CHANGELOG.md)。

## 项目结构

```
x-ai-topic-selector/
├── scripts/
│   ├── x-topic-selector.ts    # 主入口：CLI、Chrome、抓取、路由 (1020 行)
│   ├── ai-client.ts           # AI 客户端抽象：Gemini/OpenAI 实现、工厂函数 (139 行)
│   ├── ai-scorer.ts           # AI 评分逻辑、亮点/选题生成 (421 行)
│   ├── report-generator.ts    # Markdown 报告生成、图表可视化 (470 行)
│   └── x-utils.ts             # Chrome CDP 连接、平台工具 (219 行)
├── docs/
│   ├── example-scan-report.md     # 扫描模式输出样本
│   └── example-bookmark-digest.md # 书签模式输出样本
├── output/                    # 报告输出目录（gitignored）
├── package.json               # 项目配置和测试脚本
├── tsconfig.json              # TypeScript 配置
├── SKILL.md                   # Agent 交互定义
├── AGENTS.md                  # 技术文档（开发规范）
├── CHANGELOG.md               # 更新日志
└── README.md                  # 本文档
```

## 关于

**X AI Topic Selector** 由公众号「懂点儿AI」开发维护。如有问题或建议，欢迎关注公众号反馈。

## License

MIT
