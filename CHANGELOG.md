# 更新日志

### v1.4.0 (2025-02-19) - AI 多提供商支持

- 🔌 **AI 客户端抽象层**：引入 `AIClient` 接口，统一管理 Gemini 和 OpenAI 兼容 API 调用
- 🤖 **多 AI 提供商**：新增 `--ai-provider` 参数，支持 `gemini` / `openai` / `auto-detect` 三种模式
- 🔄 **自动检测**：未指定提供商时，按 Gemini → OpenAI 优先级自动检测可用 API
- 🧩 **DeepSeek 支持**：通过 OpenAI 兼容接口支持 DeepSeek 等第三方 AI 服务
- ⚙️ **GEMINI_MODEL 可配置**：新增 `GEMINI_MODEL` 环境变量，支持自定义 Gemini 模型（默认 `gemini-2.0-flash`）
- 🧪 **测试现代化**：用 `MockAIClient` 替换 `global.fetch` mocking，提升测试可靠性

### v1.3.0 (2025-02-19) - 书签日报升级

- 📰 **书签日报格式全面升级**：新增「今日看点」「今日必读」「选题思路」三大板块
- 🧠 **AI 评分维度增强**：每维增加一句话评语（innovationComment / practicalityComment / influenceComment）
- 💡 **关注理由**：新增 `reason` 字段，一句话说明「为什么值得关注」
- 🏷️ **话题标签**：新增 `tags` 字段，自动生成内容标签
- 🌐 **英文内容自动翻译**：新增 `translation` 字段，英文原文完整中文翻译
- 📊 **数据概览增强**：分类饼图、关键词 Mermaid 图、ASCII 柱状图、标签云
- ✨ **AI 生成亮点摘要**：`generateHighlights()` 自动生成今日看点
- 💡 **AI 生成选题建议**：`generateTopicSuggestions()` 基于内容生成创作思路

### v1.2.0 (2025-02-18) - 双模式架构

- 🔀 **双模式自动路由**：统一 `/select-topics` 命令，根据来源自动分流
  - 扫描过滤模式（Lists/Home）：筛选 → 评分 → Top N 推荐
  - 书签提取模式（Bookmarks）：AI 深度分析 → 保留全部 → 完整日报
- ✨ 书签模式重新定位为「理解辅助」而非质量筛选
- 🤖 书签模式强制 AI 深度分析（无数据模式降级）
- 📊 扫描模式保持原有筛选排名逻辑不变
- 📝 报告措辞双模式差异化（精选推荐 vs 完整日报）
- 🔧 `--digest` 保留为向后兼容别名

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
