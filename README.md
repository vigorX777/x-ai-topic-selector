# X AI Topic Selector

智能 Twitter/X 选题助手 — 从海量推文中**筛选精华**，或深度**分析收藏内容**。

## 这是什么

一个 Claude Agent 技能，帮你从 X (Twitter) 上高效发现优质内容：

- 📊 **扫描模式**: 从列表/主页过滤热门推文，生成精选选题推荐
- 🔖 **书签模式**: 从书签提取全部内容，AI 深度分析并整理
- 🤖 **AI 评分**: 用 Gemini 多维评分（创新性/实用性/影响力）
- 📝 **Markdown 报告**: 自动生成结构化选题推荐日报

## 核心功能

### 🎯 双模式自动路由

系统根据内容来源**自动选择**工作模式：

| 模式 | 适用场景 | 特点 |
|------|----------|------|
| **扫描过滤** | Lists / Home | 智能筛选 → 评分排名 → Top N 推荐 |
| **书签提取** | Bookmarks | AI 深度分析 → 保留全部 → 完整日报 |

### 🤖 智能分析能力

**AI 模式**（Gemini API）:
- 三维评分：创新性 / 实用性 / 影响力（各 1-5 分）
- 生成中文标题和摘要
- 英文内容自动翻译
- 智能分类（AI 工具、行业新闻、技术突破等 6 类）

**数据模式**（无需 API Key）:
- 基于互动数据计算热度
- 公式：`点赞×1 + 转发×3 + 评论×2 + 浏览量×0.01`

### 🧵 智能内容展开

- **Thread 自动完整抓取**（并发度 3）
- **长文本自动展开**（导航到详情页）
- **去噪过滤**（可配置关键词白名单/黑名单）

## 架构图

![Dual-Mode Architecture](architecture-dual-mode.svg)

**核心流程**:
```
选择来源 → 自动路由 → Chrome CDP 抓取 → 评分/过滤 → Markdown 报告
    ↓              ↓                ↓              ↓             ↓
Lists/Home    扫描模式        Thread展开      Top N 截断    精选推荐
Bookmarks     书签模式        长文本展开      保留全部      完整日报
```

## 快速开始

### 1. Agent 模式（推荐）

```bash
/x-ai-topic-selector
```

按提示选择：
1. **内容来源**: Lists / Home / Bookmarks
2. **参数配置**: 评分方式、分类过滤、推荐数量
3. **API Key**: 首次 AI 模式需提供（自动保存）

下次运行可直接选"使用上次配置"，1 秒启动。

### 2. 命令行模式

```bash
# 扫描列表（数据模式）
bun run scripts/x-topic-selector.ts "https://x.com/i/lists/1234567890" \
  --score-mode data-only --max-tweets 200 --top-n 10

# 扫描主页（AI 模式）
bun run scripts/x-topic-selector.ts "https://x.com/home" \
  --score-mode ai-only --max-tweets 100 --top-n 5

# 书签整理（强制 AI 模式）
bun run scripts/x-topic-selector.ts "https://x.com/i/bookmarks" \
  --max-tweets 50
```

## 参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `<source-url>` | 来源 URL 或列表 ID | 必填 |
| `--score-mode` | 评分模式: `data-only` / `ai-only` | `data-only` |
| `--max-tweets` | 最大抓取数量 | 200 |
| `--top-n` | 推荐数量（扫描模式） | 10 |
| `--topic-category` | 分类过滤（`all` / `ai-tools` 等） | `all` |
| `--keywords` | 包含关键词（逗号分隔） | - |
| `--exclude` | 排除关键词（逗号分隔） | - |
| `--output` | 报告输出路径 | `./output/topic-report-{timestamp}.md` |
| `--dry-run` | 仅打印结果，不保存文件 | false |

**注意**:
- 书签模式自动强制 AI 分析，无需指定 `--score-mode`
- 首次使用需在 Chrome 中手动登录 X（登录状态持久化）

## 环境配置

| 组件 | 要求 | 说明 |
|------|------|------|
| **运行时** | Bun ≥ 1.0 | 或 Node.js ≥ 18 |
| **浏览器** | Chrome / Chromium | 自动检测系统路径 |
| **API Key** | Gemini API Key | 仅 AI 模式需要（[获取](https://aistudio.google.com/apikey)） |

```bash
# 设置 API Key（可选）
export GEMINI_API_KEY="your-api-key"

# 自定义 Chrome 路径（可选）
export X_BROWSER_CHROME_PATH="/path/to/chrome"
```

配置文件路径: `~/.x-topic-selector/config.json`

## 输出示例

### 扫描模式报告

<details>
<summary>点击展开：精选选题推荐</summary>

```markdown
# AI 选题报告 - 2025-02-18

## 摘要
- 扫描推文: 200
- 筛选后: 150
- 精选推荐: 10

## 🔥 互动热度 Top 3
| 作者 | 内容 | 互动 |
|------|------|------|
| @openai | GPT-5 发布预告 | ❤️15K 🔄3.5K |
| @anthropic | Claude 3.5 更新 | ❤️12K 🔄2.1K |
| @google | Gemini 2.0 性能提升 | ❤️10K 🔄1.8K |

## 🎯 Top 10 选题推荐

### 1. OpenAI 发布 GPT-5 开发者预览版

**AI 评分**: 14/15 (创新5 实用5 影响4)

**摘要**: OpenAI 宣布 GPT-5 开发者预览版上线，推理速度提升 10 倍，支持 1M token 上下文...

**互动**: ❤️8,234 🔄3,567 💬1,289
**链接**: [🔗](https://x.com/openai/status/xxx)

---

_（省略第 2-10 条）_
```

</details>

### 书签模式报告

<details>
<summary>点击展开：书签内容整理</summary>

```markdown
# 书签内容日报 - 2025-02-18

## 摘要
- 抓取书签: 50
- 收录内容: 50（完整保留）

## 📚 收藏内容列表

### 1. Karpathy 谈大模型训练的七个阶段

**分类**: 教程 | **AI 评分**: 15/15

**摘要**: Karpathy 系统性总结了大模型训练的七个阶段：数据准备、预训练、指令微调、RLHF、蒸馏、量化、部署...

**作者**: @karpathy
**链接**: [🔗](https://x.com/karpathy/status/xxx)

---

_（省略第 2-50 条）_
```

</details>

## 常见问题

### 1. Chrome 未找到

**错误**: `Chrome not found`

**解决**:
```bash
export X_BROWSER_CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

### 2. X 账号未登录

**错误**: `Please log in to X`

**解决**:
1. 首次运行时 Chrome 会自动打开
2. 手动登录 X 账号
3. 关闭浏览器（登录状态会保存）

### 3. Gemini API Key 未设置

**错误**: `GEMINI_API_KEY not set`

**解决**:
```bash
export GEMINI_API_KEY="your-api-key"
# 或在交互式流程中输入（自动保存）
```

获取 API Key: https://aistudio.google.com/apikey

### 4. 未抓取到推文

**可能原因**:
- URL 格式错误
- 列表为私有或空
- 账号未登录
- 网络问题

**解决**:
1. 确认 URL 格式: `https://x.com/i/lists/1234567890`
2. 在浏览器中手动打开列表检查
3. 重新登录 X（删除 `~/.local/share/x-topic-selector-profile`）

### 5. AI 评分失败

**错误**: `429 Too Many Requests`

**解决**:
1. 等待 1-2 分钟后重试
2. 检查 API Key 配额
3. 切换到数据模式（`--score-mode data-only`）

### 6. 报告内容为空

**可能原因**:
- 关键词过滤过严
- 分类筛选过窄
- Top N 设置过小

**解决**:
1. 检查 `--keywords` 和 `--exclude`
2. 设置 `--topic-category all`
3. 增加 `--max-tweets` 和 `--top-n`
4. 使用 `--dry-run` 调试

## 高级用法

### 关键词过滤

```bash
# 精准过滤
--keywords "GPT,Claude,Gemini,LLM"

# 排除噪音
--exclude "giveaway,airdrop,spam"

# 组合过滤
--keywords "AI,agent" --exclude "ad,promo"
```

### 批量处理

```bash
#!/bin/bash
LISTS=("1234567890" "0987654321")

for list in "${LISTS[@]}"; do
  bun run scripts/x-topic-selector.ts "$list" \
    --score-mode ai-only \
    --output "./output/list-$list.md"
done
```

### 定时任务

```bash
# cron 每天 9 点执行
0 9 * * * cd /path/to/x-ai-topic-selector && \
  bun run scripts/x-topic-selector.ts "https://x.com/i/lists/123" \
  --score-mode ai-only --output "./output/daily-$(date +\%Y\%m\%d).md"
```

### 集成邮件/Slack

```bash
# 生成报告后发送邮件
bun run scripts/x-topic-selector.ts "..." --output "./report.md" && \
  mail -s "Daily Report" your@email.com < ./report.md

# 推送到 Slack
REPORT=$(cat ./report.md)
curl -X POST https://hooks.slack.com/... \
  -H 'Content-Type: application/json' \
  -d "{\"text\": \"$REPORT\"}"
```

## 更新日志

### v1.2.0 (2025-02-18) - 双模式架构

- ✨ 新增书签提取模式（Bookmarks）
- 🔀 智能路由：根据来源自动切换模式
- 🤖 书签模式强制 AI 深度分析
- 📊 扫描模式保持原有逻辑不变
- 📝 优化报告措辞（双模式差异化）
- 🎨 新增双模式架构图

### v1.1.0 (2025-02-04)

- ⚡ 简化交互流程（5 步 → 1-2 步）
- 📝 配置复用优化
- 🗂️ 固定输出目录

### v1.0.0 (2025-02-01)

- 🌐 支持 X 列表/主页/书签
- 📊 双评分模式（数据/AI）
- 🧵 Thread 自动展开
- 📄 Markdown 报告生成
- 💾 配置持久化

## 项目结构

```
x-ai-topic-selector/
├── scripts/
│   ├── x-topic-selector.ts    # 主入口、流程编排
│   ├── ai-scorer.ts            # Gemini API 评分
│   ├── report-generator.ts     # Markdown 报告生成
│   └── x-utils.ts              # Chrome CDP 连接
├── output/                     # 报告输出目录
├── SKILL.md                    # Agent 交互定义
├── README.md                   # 本文档（用户指南）
└── AGENTS.md                   # 技术文档（开发规范）
```

**技术细节**: 参见 [AGENTS.md](AGENTS.md) 了解架构设计、类型系统、开发规范。

## License

MIT
