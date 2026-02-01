# X AI Topic Selector

自动从 X (Twitter) 抓取推文，通过多维评分（数据指标 + AI 分析）生成选题推荐报告，帮助内容创作者高效筛选优质选题。

## 功能特性

### 核心功能

- **多来源支持**: 支持从 X 列表 (List)、推荐页 (For You)、书签 (Bookmarks) 抓取内容
- **智能评分**: 提供纯数据评分和 AI 评分两种模式
- **Thread 展开**: 自动检测并展开 Thread 帖子，获取完整内容
- **长文本处理**: 自动展开被截断的长推文
- **报告生成**: 生成结构化的 Markdown 选题报告，包含互动热度排名、关键词统计等

### 评分系统

#### 数据分析模式 (data-only)
基于推文互动数据进行评分，无需 API Key：
- 评分公式: `点赞×1 + 转发×3 + 评论×2 + 浏览量×0.01`
- 自动归一化处理，确保评分可比性

#### AI 分析模式 (ai-only)
使用 Gemini API 进行内容深度分析，需要 API Key：

| 维度 | 说明 | 评分标准 |
|------|------|----------|
| 创新性 | 时效性、思想性、应用创新 | 1-5 分 |
| 实用性 | 普通用户易用性、即时价值 | 1-5 分 |
| 影响力 | 行业重要性、来源权威度 | 1-5 分 |

AI 模式还提供：
- 内容分类 (6 种类别)
- 中文选题标题生成
- 内容摘要
- 英文内容翻译

### 内容分类

| 分类 | 说明 |
|------|------|
| ai-tools | AI 工具/产品发布 |
| industry-news | 行业新闻/动态 |
| tech-breakthroughs | 技术突破/论文 |
| tutorials | 教程/实用技巧 |
| controversial | 争议/讨论话题 |
| other | 其他 |

---

## 系统架构

![System Architecture](architecture.svg)

[查看完整架构图 (HTML)](architecture.html)


---

## 工作流程

### 完整执行流程

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  检查配置   │ ──▶ │  参数收集   │ ──▶ │  启动 Chrome │
│  (config)   │     │  (交互式)   │     │  (CDP)      │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
       ┌──────────────────────────────────────┘
       ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  导航到目标 │ ──▶ │  滚动加载   │ ──▶ │  解析推文   │
│  URL        │     │  推文       │     │  DOM        │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
       ┌──────────────────────────────────────┘
       ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  展开Thread │ ──▶ │  评分处理   │ ──▶ │  生成报告   │
│  (并行)     │     │  (Data/AI)  │     │  (Markdown) │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
       ┌──────────────────────────────────────┘
       ▼
┌─────────────┐     ┌─────────────┐
│  保存配置   │ ──▶ │  输出结果   │
│  (复用)     │     │  完成       │
└─────────────┘     └─────────────┘
```

### 推文抓取流程

1. **启动 Chrome**: 使用 CDP (Chrome DevTools Protocol) 启动带用户配置的 Chrome
2. **导航**: 访问目标 URL (列表/推荐/书签)
3. **等待加载**: 检测推文元素出现并包含有效内容
4. **滚动收集**: 循环滚动页面，收集唯一推文直到达到目标数量
5. **Thread 展开**: 并行打开新 Tab 展开可能的 Thread 帖子
6. **长文本展开**: 展开被截断的推文内容

### AI 评分流程

1. **批量处理**: 将推文分批 (默认 5 条/批)
2. **并发控制**: 最多 2 个批次并行请求 Gemini API
3. **结构化输出**: 解析 JSON 格式的评分结果
4. **容错处理**: 失败时返回默认评分，不中断整体流程

---

## 使用说明

### 环境要求

- **运行时**: Bun (推荐) 或 Node.js
- **浏览器**: Google Chrome 或 Chromium
- **API Key**: Gemini API Key (仅 AI 模式需要)

### 命令

#### `/select-topics`

启动交互式选题工具，Agent 将引导完成以下配置：

1. **内容来源**: X 列表 / 推荐 (For You) / 书签
2. **评分模式**: 数据分析模式 / AI 分析模式
3. **选题范围**: 6 种分类或不限
4. **扫描数量**: 100 / 200 / 500 条或自定义
5. **推荐数量**: 5 / 10 / 20 条或自定义
6. **输出目录**: 默认 `./output` 或自定义

### 命令行直接使用

```bash
# 基本用法
bun run scripts/x-topic-selector.ts "https://x.com/i/lists/1234567890"

# 使用列表 ID
bun run scripts/x-topic-selector.ts 1234567890

# 扫描推荐页
bun run scripts/x-topic-selector.ts "https://x.com/home"

# 扫描书签
bun run scripts/x-topic-selector.ts "https://x.com/i/bookmarks"

# 完整参数示例
bun run scripts/x-topic-selector.ts "https://x.com/i/lists/123" \
  --score-mode ai-only \
  --max-tweets 200 \
  --topic-category ai-tools \
  --top-n 10 \
  --output ./output/report.md
```

### 参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--score-mode` | 评分模式: `data-only` / `ai-only` | `data-only` |
| `--max-tweets` | 最大扫描推文数 | 200 |
| `--topic-category` | 选题分类过滤 | `all` |
| `--top-n` | 推荐选题数量 | 10 |
| `--output` | 报告输出路径 | `topic-report-{timestamp}.md` |
| `--keywords` | 关键词过滤 (逗号分隔) | - |
| `--exclude` | 排除关键词 (逗号分隔) | - |
| `--profile` | Chrome 配置目录 | `~/.local/share/x-topic-selector-profile` |
| `--dry-run` | 仅打印结果，不保存 | false |

---

## 配置持久化

配置文件路径: `~/.x-topic-selector/config.json`

```json
{
  "sourceType": "list",
  "listUrls": ["https://x.com/i/lists/xxx"],
  "scoreMode": "data-only",
  "geminiApiKey": "",
  "topicCategory": "all",
  "maxTweets": 200,
  "topN": 10,
  "outputDir": "./output",
  "lastUsed": "2025-02-01T12:00:00Z"
}
```

- 首次运行后自动保存配置
- 再次运行时可选择复用上次配置
- API Key 会被安全保存，下次 AI 模式自动复用

---

## 输出报告示例

```markdown
# AI 选题报告 - 2025-02-01

## 摘要
- **扫描推文**: 200
- **筛选后**: 150
- **推荐选题**: 10

---

## 🔥 互动热度 Top 3

| 排名 | 作者 | 互动总量 | 内容预览 | 链接 |
|------|------|----------|----------|------|
| 1 | @openai | 15,234 | GPT-5 发布预告... | [🔗](url) |
| 2 | @anthropic | 12,456 | Claude 3.5 重大更新... | [🔗](url) |
| 3 | @google | 10,123 | Gemini 2.0 性能提升... | [🔗](url) |

---

## 📊 关键词词频统计

| 关键词 | 出现次数 |
|--------|----------|
| claude | 45 |
| gpt | 38 |
| agent | 32 |
...

---

## Top 10 选题推荐

### 1. [AI 生成的选题标题]

**作者**: @username (Display Name) | **分类**: AI 工具

**AI 评分**: 13/15
- 🎯 创新性: 5/5 - 首发重大产品更新
- 💡 实用性: 4/5 - 普通用户可直接使用
- 📈 影响力: 4/5 - 行业巨头官方发布

**AI 摘要**:
> 简洁的中文内容摘要...

**原文内容**:
> 完整的推文原文...

**中文翻译**:
> 英文内容的中文翻译（如有）...

**互动数据**: ❤️ 1,234 | 🔄 567 | 💬 89 | 👀 123,456
**发布时间**: 2025-02-01T10:00:00Z | 🔗 [查看原帖](url)
**标签**: 原创 | AI工具 | GPT

---
```

---

## 技术实现细节

### Chrome CDP 连接

使用 Chrome DevTools Protocol 进行浏览器自动化：

- 自动检测系统 Chrome 安装路径
- 支持自定义 Chrome 路径 (`X_BROWSER_CHROME_PATH` 环境变量)
- 使用独立用户配置目录保存登录状态
- WebSocket 连接管理，支持超时和错误处理

### 推文解析

基于 Twitter 的 `data-testid` 属性进行 DOM 解析：

```typescript
const SELECTORS = {
  TWEET: '[data-testid="tweet"]',
  TWEET_TEXT: '[data-testid="tweetText"]',
  USER_NAME: '[data-testid="User-Name"]',
  LIKE_BUTTON: '[data-testid="like"]',
  RETWEET_BUTTON: '[data-testid="retweet"]',
  REPLY_BUTTON: '[data-testid="reply"]',
  TWEET_TIME: 'time',
};
```

### Thread 并行展开

- 并发度: 3 (可配置)
- 为每个 Thread 打开独立 Tab
- 失败自动重试 (回退到主 Session)
- 提取同一作者的连续推文内容

### Gemini API 集成

- 批量处理: 5 条推文/请求
- 并发控制: 最多 2 个并行请求
- 结构化 Prompt，确保输出 JSON 格式
- 完整的错误处理和降级策略

---

## 故障排除

### "Chrome not found"

```bash
# 设置 Chrome 路径
export X_BROWSER_CHROME_PATH="/path/to/chrome"
```

### "Please log in to X"

首次运行时脚本会打开 Chrome 窗口，请手动登录 X 账号。登录状态会保存在配置目录中。

### "GEMINI_API_KEY not set"

AI 模式需要设置 Gemini API Key：

```bash
export GEMINI_API_KEY="your-api-key"
```

或通过交互式流程提供，会自动保存到配置文件。

### "No tweets found"

- 检查 URL 是否正确
- 确保已在 Chrome 中登录 X
- 检查列表是否为私有或为空
- 尝试增加等待时间

---

## 扩展配置

支持在项目目录下创建 `EXTEND.md` 进行默认配置：

```markdown
## x-ai-topic-selector

- keywords: AI,GPT,Claude,LLM
- exclude: giveaway,airdrop,crypto
- top-n: 10
- translate: true
```

---

## 文件结构

```
x-ai-topic-selector/
├── SKILL.md              # Skill 定义文件 (Agent 交互逻辑)
├── README.md             # 本文档
└── scripts/
    ├── x-topic-selector.ts    # 主脚本入口
    ├── ai-scorer.ts           # AI 评分模块
    ├── report-generator.ts    # 报告生成模块
    └── x-utils.ts             # Chrome CDP 工具函数
```

---

## License

MIT
