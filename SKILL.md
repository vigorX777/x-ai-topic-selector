---
name: x-ai-topic-selector
description: Fetches tweets from Twitter List, scores them using data metrics and AI analysis, and generates topic recommendation reports for content creators.
commands:
  - name: /select-topics
    description: Generate topic report from Twitter List (interactive guided flow)
---

# X AI Topic Selector

自动从 Twitter 列表中抓取推文，通过多维评分（数据指标 + AI 分析）生成选题推荐报告。

![alt text](architecture.svg)

## 命令

### `/select-topics`

运行选题工具。

**使用方式**: 直接输入 `/select-topics`，Agent 将通过交互式引导收集参数。

---

## 配置持久化

配置文件路径: `~/.x-topic-selector/config.json`

Agent 在执行前**必须检查**此文件是否存在：
1. 如果存在，读取并解析 JSON
2. 在 Step 1 后询问用户是否使用已保存配置
3. 执行完成后保存当前配置到此文件

**配置文件结构**:
```json
{
  "sourceType": "list|home|bookmarks",
  "listUrls": ["https://x.com/i/lists/xxx"],
  "scoreMode": "data-only",
  "geminiApiKey": "",
  "topicCategory": "all",
  "maxTweets": 200,
  "topN": 10,
  "lastUsed": "2025-02-01T12:00:00Z"
}
```

---

## 参数回填规则

为了提升交互体验，当 `config.json` 存在时，Agent 应遵循以下回填规则：

1. **单选类**: 在对应的选项 `label` 后添加 `(上次选择)` 标记。
2. **自定义数值**: 如果上次使用的是自定义数值（不在预设选项中），应动态添加一个新选项。
3. **API Key**: 如果已保存且用户选择 AI 模式，自动复用，无需再次输入。
4. **列表 URL**: 在 `question` 文本中包含 `📌 上次使用: <value>`，并在 `options` 中将该值作为第一个选项提供。

---

## 交互流程

当用户触发 `/select-topics` 命令后，Agent **必须按以下步骤**使用 `question()` 工具引导用户：

### Step 0: 检查已保存配置

**必须执行**: Agent 先检查 `~/.x-topic-selector/config.json` 是否存在

```bash
cat ~/.x-topic-selector/config.json 2>/dev/null || echo "NO_CONFIG"
```

如果配置存在，进入 Step 0b；否则跳到 Step 1。

### Step 0b: 询问是否使用已保存配置

如果检测到已保存配置，使用 `question()` 询问：

```
question({
  questions: [{
    header: "使用已保存配置",
    question: "检测到上次使用的配置：\n\n• 内容来源: ${config.sourceType || 'list'}\n• 列表 URL: ${config.listUrls.join(', ')}\n• 评分模式: ${config.scoreMode}\n• 扫描数量: ${config.maxTweets}\n• 推荐数量: ${config.topN}\n\n请选择操作：",
    options: [
      { label: "使用上次配置直接运行 (Recommended)", description: "使用所有已保存的参数立即开始" },
      { label: "重新配置全部", description: "从头开始配置所有参数" }
    ]
  }]
})
```

**处理逻辑**:
- "使用上次配置直接运行" → 跳到 Step 3 执行
- "重新配置全部" → 从 Step 1 开始完整流程

### Step 1: 欢迎 + 登录提示

首先显示欢迎信息和重要提示：

```
📊 X AI 选题助手

在开始之前，请确保：
✅ 已安装 Google Chrome 浏览器
✅ 已在 Chrome 中登录您的 X (Twitter) 账号

首次运行时，脚本会打开 Chrome 窗口，请在窗口中完成登录（登录状态会被保存）。
```

### Step 2: 一次性收集所有参数

**核心设计**: 将所有参数放在单次 `question()` 调用中，用户可以一次性完成所有配置。

使用 `question()` 工具一次性询问所有参数：

```
question({
  questions: [
    // Q1: 内容来源
    {
      header: "内容来源",
      question: "请选择要扫描的内容来源",
      options: [
        { label: `X 列表 (List)${config?.sourceType === 'list' ? ' (上次选择)' : ''}`, description: "扫描指定的 Twitter 列表，选择后需要输入列表 URL" },
        { label: `推荐 (For You)${config?.sourceType === 'home' ? ' (上次选择)' : ''}`, description: "扫描 X 推荐的内容" },
        { label: `书签 (Bookmarks)${config?.sourceType === 'bookmarks' ? ' (上次选择)' : ''}`, description: "扫描你收藏的推文" }
      ]
    },
    // Q2: 评分模式
    {
      header: "评分模式",
      question: "请选择选题评分模式",
      options: [
        { 
          label: `数据分析模式 (Recommended)${config?.scoreMode === 'data-only' ? ' (上次选择)' : ''}`, 
          description: "基于互动数据评分，无需 API Key" 
        },
        { 
          label: `AI 分析模式${config?.scoreMode === 'ai-only' ? ' (上次选择)' : ''}`, 
          description: "基于 AI 内容分析，需要 Gemini API Key" 
        }
      ]
    },
    // Q3: 选题范围
    {
      header: "选题范围",
      question: "请选择要关注的选题范围",
      options: [
        { label: `不限 (Recommended)${config?.topicCategory === 'all' ? ' (上次选择)' : ''}`, description: "显示所有类型的选题" },
        { label: `AI 工具/产品发布${config?.topicCategory === 'ai-tools' ? ' (上次选择)' : ''}`, description: "新工具、新功能、产品更新" },
        { label: `行业新闻/动态${config?.topicCategory === 'industry-news' ? ' (上次选择)' : ''}`, description: "公司动态、融资、并购等" },
        { label: `技术突破/论文${config?.topicCategory === 'tech-breakthroughs' ? ' (上次选择)' : ''}`, description: "新研究、技术创新" },
        { label: `教程/实用技巧${config?.topicCategory === 'tutorials' ? ' (上次选择)' : ''}`, description: "使用指南、最佳实践" },
        { label: `争议/讨论话题${config?.topicCategory === 'controversial' ? ' (上次选择)' : ''}`, description: "行业争论、热点讨论" }
      ]
    },
    // Q4: 扫描数量
    {
      header: "扫描数量",
      question: "请选择要扫描的推文数量",
      options: [
        ...(config && ![100, 200, 500].includes(config.maxTweets) ? [{ label: `${config.maxTweets} 条 (上次选择)`, description: "使用上次自定义的扫描数量" }] : []),
        { label: `100 条${config?.maxTweets === 100 ? ' (上次选择)' : ''}`, description: "快速扫描，约 1-2 分钟" },
        { label: `200 条 (Recommended)${config?.maxTweets === 200 ? ' (上次选择)' : ''}`, description: "标准扫描，约 2-4 分钟" },
        { label: `500 条${config?.maxTweets === 500 ? ' (上次选择)' : ''}`, description: "深度扫描，约 5-8 分钟" }
      ]
    },
    // Q5: 推荐条数
    {
      header: "推荐条数",
      question: "请选择要推荐的选题数量",
      options: [
        ...(config && ![5, 10, 20].includes(config.topN) ? [{ label: `${config.topN} 条 (上次选择)`, description: "使用上次自定义的推荐条数" }] : []),
        { label: `5 条${config?.topN === 5 ? ' (上次选择)' : ''}`, description: "精选推荐" },
        { label: `10 条 (Recommended)${config?.topN === 10 ? ' (上次选择)' : ''}`, description: "标准推荐" },
        { label: `20 条${config?.topN === 20 ? ' (上次选择)' : ''}`, description: "扩展推荐" }
      ]
    }
  ]
})
```

### Step 2b: 条件性补充收集

根据 Step 2 的选择结果，可能需要补充收集以下信息：

#### 如果选择了 "X 列表 (List)"

需要继续询问列表 URL：

```
question({
  questions: [{
    header: "X 列表 URL",
    question: "请输入要扫描的 X 列表 URL 地址（支持多个，用逗号分隔）\n\n示例格式：https://x.com/i/lists/1234567890${config?.listUrls?.[0] ? `\n\n📌 上次使用: ${config.listUrls.join(', ')}` : ''}",
    options: config?.listUrls?.[0] ? [{ label: config.listUrls.join(', '), description: "复用上次输入的 URL" }] : []
  }]
})
```

**验证规则**：
- URL 必须包含 `x.com/i/lists/`、`twitter.com/i/lists/`
- 或者是纯数字 ID
- 多个列表 URL 用逗号分隔

**其他来源的 URL**:
- 推荐 (For You): `https://x.com/home`
- 书签 (Bookmarks): `https://x.com/i/bookmarks`

#### 如果选择了 "AI 分析模式" 且配置中没有已保存的 API Key

需要继续询问 Gemini API Key：

```
question({
  questions: [{
    header: "Gemini API Key",
    question: "请输入您的 Gemini API Key\n\n获取方式：访问 https://aistudio.google.com/apikey 创建 API Key${config?.geminiApiKey ? '\n\n📌 检测到已保存的 API Key，可直接回车复用' : ''}",
    options: config?.geminiApiKey ? [{ label: "使用已保存的 API Key", description: "复用上次保存的 Gemini API Key" }] : []
  }]
})
```

**注意**: 如果 `config.geminiApiKey` 已存在，跳过此步骤，直接使用已保存的 Key。

### Step 3: 执行脚本

收集完所有参数后，Agent 构建并执行命令：

```bash
# 确保输出目录存在（默认使用当前工作目录下的 output 文件夹）
mkdir -p ./output

# 设置环境变量（如果需要 AI 模式）
export GEMINI_API_KEY="用户提供的key"

# 执行脚本
bun run ${SKILL_DIR}/scripts/x-topic-selector.ts \
  "URL1" \
  --score-mode <mode> \
  --max-tweets <count> \
  --topic-category <category> \
  --top-n <n> \
  --output ./output/topic-report-{timestamp}.md
```

**多个 URL 处理**：
- 对于多个列表 URL，依次执行脚本
- 每个列表生成独立的报告文件

### Step 3b: 保存配置

执行成功后，**必须保存配置**以便下次复用：

```bash
# 创建配置目录
mkdir -p ~/.x-topic-selector

# 保存配置（包括 API Key）
cat > ~/.x-topic-selector/config.json << 'EOF'
{
  "sourceType": "<list|home|bookmarks>",
  "listUrls": ["<用户输入的URL列表>"],
  "scoreMode": "<data-only|ai-only>",
  "geminiApiKey": "<用户输入的API Key，如果有>",
  "topicCategory": "<category>",
  "maxTweets": <count>,
  "topN": <n>,
  "lastUsed": "<当前ISO时间戳>"
}
EOF
```

**注意**：
- API Key 会保存到配置文件，下次使用 AI 模式时自动复用
- `lastUsed` 使用 ISO 8601 格式（如 `2025-02-01T12:00:00Z`）

### Step 4: 结果展示

执行完成后，向用户展示：

**成功时**：
- 📁 报告文件路径
- 📊 简要摘要：扫描推文数、推荐选题数
- 🔥 **互动热度 Top 3**：按纯数据指标排名的热门推文
- 🏆 **推荐选题预览**：Top 3 选题的标题预览（80字符）

**报告内容说明**：
- 每个选题包含 **AI 摘要**（80字符标题）和 **原文内容**（完整文本）
- 互动数据格式：❤️ 点赞 | 🔄 转发 | 💬 评论 | 👀 浏览
- 三维度 AI 评分（创新性/实用性/影响力）各 1-5 分
- Thread 帖子标记：📜 Thread (N 条)

**失败时**：
- 显示错误信息和可能原因
- 提供故障排除建议（参考文档末尾的故障排除章节）

---

## 脚本目录

**重要**: 所有脚本位于此 skill 的 `scripts/` 子目录。

**Agent 执行说明**:
1. 确定此 SKILL.md 文件的目录路径为 `SKILL_DIR`
2. 脚本路径 = `${SKILL_DIR}/scripts/<script-name>.ts`
3. 将本文档中所有 `${SKILL_DIR}` 替换为实际路径

| 脚本 | 用途 |
|------|------|
| `scripts/x-topic-selector.ts` | 主脚本 - 抓取、评分、生成报告 |
| `scripts/ai-scorer.ts` | Gemini API 集成，AI 评分 |
| `scripts/report-generator.ts` | Markdown 报告生成 |
| `scripts/x-utils.ts` | Chrome CDP 工具函数 |

---

## 参数映射

| 交互选项 | 脚本参数 |
|----------|----------|
| 数据分析模式 | `--score-mode data-only` |
| AI 分析模式 | `--score-mode ai-only` |
| AI 工具/产品发布 | `--topic-category ai-tools` |
| 行业新闻/动态 | `--topic-category industry-news` |
| 技术突破/论文 | `--topic-category tech-breakthroughs` |
| 教程/实用技巧 | `--topic-category tutorials` |
| 争议/讨论话题 | `--topic-category controversial` |
| 不限 | `--topic-category all` |
| 100 条 | `--max-tweets 100` |
| 200 条 | `--max-tweets 200` |
| 500 条 | `--max-tweets 500` |
| 5 条 | `--top-n 5` |
| 10 条 | `--top-n 10` |
| 20 条 | `--top-n 20` |

---

## 环境要求

- Google Chrome 或 Chromium 浏览器
- `bun` 运行时
- GEMINI_API_KEY 环境变量（仅混合/AI 模式需要）

---

## 扩展配置 (EXTEND.md)

支持在用户项目目录下创建 `EXTEND.md` 文件进行默认配置：

```markdown
## x-ai-topic-selector

- keywords: AI,GPT,Claude,LLM,Machine Learning
- exclude: giveaway,airdrop,crypto,nft
- top-n: 10
- translate: true
```

---

## Thread 自动展开

脚本会自动检测并展开 Thread（帖子串），获取完整内容而非仅首贴。

**工作原理**：
- 对于非转发推文，脚本会导航到详情页检查是否为 Thread
- 如果是 Thread，提取同一作者的所有连续推文内容
- 多个部分用 `---` 分隔合并为一条记录

**报告显示**：
- Thread 帖子在报告中会显示 `📜 Thread (N 条)` 标识
- Thread 整体算作 1 条帖子，不重复计数
- 互动数据使用 Thread 首贴的数据

**注意事项**：
- Thread 展开会增加少量抓取时间（每条约 3 秒）
- 如果展开失败，会自动回退到仅使用首贴内容

---

## 故障排除

### "Chrome not found"
设置 `X_BROWSER_CHROME_PATH` 环境变量指向 Chrome 可执行文件路径。

### "Please log in to X"
首次运行时，脚本会打开 Chrome 窗口等待登录。请在窗口中手动登录 X 账号。

### "GEMINI_API_KEY not set"
混合/AI 模式需要设置 Gemini API Key，可以通过交互流程提供。

### "No tweets found"
- 检查列表 URL 是否正确
- 确保已在 Chrome profile 中登录 X
- 列表可能是私有的或为空
