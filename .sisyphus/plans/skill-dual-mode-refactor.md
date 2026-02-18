# Skill 双模式重构：扫描过滤 + 书签提取

## TL;DR

> **Quick Summary**: 将 x-ai-topic-selector 从单一管线拆分为两套执行模式——扫描过滤模式（Home/Lists）保持不变，书签提取模式（Bookmarks）跳过所有过滤/排名/截断，直接对全部收藏内容做 AI 分析辅助理解。通过统一 `/select-topics` 命令按来源自动分流。
>
> **Deliverables**:
> - 重构后的 `x-topic-selector.ts`，`main()` 按 sourceType 分流到两套管线
> - 书签管线绕过 `filterAndScoreTweets()`，保留全部收藏内容
> - `generateDigestReport()` 书签模式措辞微调
> - 更新后的 SKILL.md 交互流程（统一命令 + 自动分流）
> - 更新后的 README.md 文档
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 5

---

## Context

### Original Request
用户认为书签内容是手动收藏的选题备份，本身已表达选题意愿，不应再经过 AI/热度二次过滤。要求 skill 拆分为两套执行模式：扫描过滤模式 + 书签提取模式，通过统一命令自动分流。

### Interview Summary
**Key Discussions**:
- 书签 AI 分析范围：用户选择全部保留（摘要、翻译、标题、选题思路、分类、三维评分），但用途从"打分筛选"变为"辅助理解"
- 数量控制：经讨论发现 X DOM 不提供收藏时间（只有发布时间），时间过滤语义不准确。用户决定**取消时间过滤**，沿用 `max-tweets` 数量控制
- 命令设计：统一 `/select-topics` 命令，按来源自动分流，合并 `/bookmark-digest`

**Research Findings**:
- `filterAndScoreTweets()` (lines 96-131) 是书签内容丢失的根源——应用 keywords/exclude 过滤 + score 排名 + topN 截断
- `generateDigestReport()` (report-generator.ts:319-460) 已有杂志风格模板，可复用，仅需措辞微调
- `--digest` flag (lines 870-893) 已是书签快捷方式的雏形，但仍走过滤管线
- `scoreTweetsWithAI()` 纯分析函数，返回值可直接复用无需修改
- Tweet `time` 字段 (line 653) 已作为 ISO datetime 提取

### Metis Review
**Identified Gaps** (addressed):
- `--digest` CLI flag 命运：保留为向后兼容别名，映射到书签管线
- `ScoredTweet` 类型桥接：需要 `toScoredTweet()` 适配函数（`dataScore:0, totalScore:sum(aiScores)`）
- 无 `time` 属性的推文：包含在结果中（假设在范围内）+ 日志警告（仅影响日志，不影响核心逻辑）
- 时间基准问题：用户最终决定取消时间过滤，此问题不再适用
- 大量书签的 API 限流：现有进度日志足够，不额外处理
- `--digest` + 显式 URL 冲突：显式 URL 优先
- 空书签结果：生成报告含"没有找到书签内容"提示

---

## Work Objectives

### Core Objective
将 `main()` 管线按 `sourceType` 分流：bookmarks → 书签提取管线（无过滤），其他 → 现有扫描过滤管线（不变）。

### Concrete Deliverables
- `scripts/x-topic-selector.ts`: 新增书签管线分支 + `toScoredTweet()` 适配函数
- `scripts/report-generator.ts`: `generateDigestReport()` 书签模式措辞微调
- `SKILL.md`: 合并 `/bookmark-digest` 到 `/select-topics`，更新交互流程
- `README.md`: 文档更新，说明双模式

### Definition of Done
- [ ] `bunx tsc --noEmit` → exit code 0，无类型错误
- [ ] `bun run scripts/x-topic-selector.ts --help` → CLI 正常显示帮助
- [ ] 书签来源自动进入书签管线（不经过 `filterAndScoreTweets`）
- [ ] 扫描来源管线行为完全不变

### Must Have
- 书签管线绕过 `filterAndScoreTweets()` 的所有过滤环节
- 书签管线保留 AI 分析（摘要、翻译、标题、分类、评分、选题思路）
- 统一 `/select-topics` 命令入口
- `--digest` 向后兼容
- `ScoredTweet` 类型安全桥接（不用 `as any`）

### Must NOT Have (Guardrails)
- **G1: 扫描管线冻结** — MUST NOT 修改 `filterAndScoreTweets()` (lines 96-131)、`calculateDataScore()` (lines 71-81)、`calculateTotalScore()` (lines 83-89) 的任何逻辑
- **G2: AI Scorer 冻结** — MUST NOT 修改 `ai-scorer.ts` 的任何内容（不改 prompt、不改批处理逻辑、不改 API 调用）
- **G3: CDP 工具冻结** — MUST NOT 修改 `x-utils.ts`
- **G4: 报告结构冻结** — `generateDigestReport()` 仅改措辞（≤10 行变更），不改模板结构
- **G5: 不创建新文件** — 所有变更在现有 4 个源文件 + SKILL.md + README.md 内完成
- **G6: 不重构共享类型** — 不把 `Tweet`/`ScoredTweet` 接口抽到新模块
- **G7: 配置向后兼容** — 旧 config.json（无新字段）必须正常解析，不报错
- **G8: 不修改 AI prompt** — 书签模式和扫描模式使用完全相同的 AI 分析 prompt
- **G9: 不新增时间过滤** — 用户已明确取消时间过滤，不实现任何时间相关逻辑

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None
- **Framework**: none

### Agent-Executed QA Scenarios (PRIMARY — all tasks)

**Verification Tool by Deliverable Type:**

| Type | Tool | How Agent Verifies |
|------|------|-------------------|
| TypeScript source | Bash (`bunx tsc --noEmit`) | Type check passes, exit code 0 |
| CLI behavior | Bash (`bun run scripts/x-topic-selector.ts --help`) | Help output displays correctly |
| Code logic | Code inspection via Read/Grep | Verify branching logic, function calls, no-filter path |
| SKILL.md/README.md | Read tool | Verify content accuracy, no stale references |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Core bookmark pipeline in x-topic-selector.ts
└── Task 4: SKILL.md interaction flow redesign

Wave 2 (After Task 1):
├── Task 2: Report wording adjustments (depends: 1)
├── Task 3: --digest backward compat + edge cases (depends: 1)
└── Task 5: README.md documentation update (depends: 1, 4)

Wave 3 (Final):
└── Task 6: Full type check + integration verification (depends: all)
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3, 5, 6 | 4 |
| 2 | 1 | 6 | 3, 4, 5 |
| 3 | 1 | 6 | 2, 4, 5 |
| 4 | None | 5, 6 | 1 |
| 5 | 1, 4 | 6 | 2, 3 |
| 6 | 1, 2, 3, 4, 5 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Dispatch |
|------|-------|---------------------|
| 1 | 1, 4 | Parallel: Task 1 (deep), Task 4 (quick) |
| 2 | 2, 3, 5 | Parallel after Wave 1 |
| 3 | 6 | Final verification |

---

## TODOs

- [ ] 1. Core: 书签管线分支 + 类型桥接

  **What to do**:
  1. 在 `main()` 中，`parseSourceUrl()` 之后、进入评分/过滤流程之前，添加 sourceType 分流：
     - `if (source.type === 'bookmarks')` → 进入书签管线
     - `else` → 现有扫描过滤管线（完全不变）
  2. 书签管线流程：
     - `scrapeTweets()` → 抓取（现有逻辑，用 maxTweets 控制数量）
     - Thread 展开 + 截断文本展开（复用现有逻辑）
     - `scoreTweetsWithAI()` → AI 分析（强制 ai-only 模式）
     - `toScoredTweet()` → 类型转换（新函数）
     - `buildDigestReport()` → 生成报告（复用现有函数）
  3. 创建 `toScoredTweet()` 适配函数：
     ```typescript
     function toScoredTweet(tweet: Tweet, aiScore?: AIScoredTweet['aiScore']): ScoredTweet {
       const totalScore = aiScore 
         ? aiScore.innovation + aiScore.practicality + aiScore.influence 
         : 0;
       return { ...tweet, dataScore: 0, totalScore, aiScore };
     }
     ```
  4. 书签管线中，如果 `GEMINI_API_KEY` 未设置，提前报错（fail fast）：
     ```
     throw new Error('Bookmark mode requires GEMINI_API_KEY for AI analysis. Set it via env or config.');
     ```
  5. 处理空书签场景：如果抓取结果为空，生成包含提示信息的报告而非报错

  **Must NOT do**:
  - MUST NOT 修改 `filterAndScoreTweets()`、`calculateDataScore()`、`calculateTotalScore()` 的任何行
  - MUST NOT 修改 `scrapeTweets()` 的核心滚动逻辑
  - MUST NOT 修改 `ai-scorer.ts` 的任何内容
  - MUST NOT 使用 `as any` 做类型转换
  - MUST NOT 实现任何时间过滤逻辑

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 核心重构任务，需要理解完整管线流程和类型系统，在正确位置插入分支
  - **Skills**: [`x-ai-topic-selector`]
    - `x-ai-topic-selector`: 提供项目架构和代码风格上下文
  - **Skills Evaluated but Omitted**:
    - `playwright`: 无浏览器交互
    - `frontend-ui-ux`: 无 UI 工作

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 4)
  - **Blocks**: Tasks 2, 3, 5, 6
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References** (existing code to follow):
  - `scripts/x-topic-selector.ts:889-893` — 现有 `digestMode` 分支模式，可作为书签分支的参考模型
  - `scripts/x-topic-selector.ts:843-950` — `main()` 完整流程，理解分支插入点
  - `scripts/x-topic-selector.ts:96-131` — `filterAndScoreTweets()` 函数，**书签管线必须绕过此函数**
  - `scripts/x-topic-selector.ts:56-61` — `ScoredTweet` 接口定义，`toScoredTweet()` 必须满足此接口
  - `scripts/x-topic-selector.ts:808-841` — `buildDigestReport()` 桥接函数，书签管线直接复用

  **API/Type References** (contracts to implement against):
  - `scripts/x-topic-selector.ts:18-30` — `Tweet` 接口定义
  - `scripts/x-topic-selector.ts:56-61` — `ScoredTweet` 接口定义（含 `dataScore` 和 `totalScore`）
  - `scripts/ai-scorer.ts` — `AIScoredTweet` 类型，`scoreTweetsWithAI()` 返回值形状
  - `scripts/ai-scorer.ts:322-379` — `scoreTweetsWithAI()` 函数签名和调用方式

  **WHY Each Reference Matters**:
  - `main():889-893`: 从这里学习如何在现有 `digestMode` 分支旁边添加新的书签分支
  - `filterAndScoreTweets():96-131`: 必须确认书签管线完全不调用此函数
  - `ScoredTweet:56-61`: `toScoredTweet()` 必须产出完全符合此接口的对象，确保 `generateDigestReport()` 能接收
  - `buildDigestReport():808-841`: 理解它如何调用 `generateHighlights()` 和 `generateTopicSuggestions()`，书签管线直接复用

  **Acceptance Criteria**:

  - [ ] `main()` 中存在 `source.type === 'bookmarks'` 分支判断
  - [ ] 书签分支中不调用 `filterAndScoreTweets()`
  - [ ] 书签分支中调用 `scoreTweetsWithAI()` 进行 AI 分析
  - [ ] `toScoredTweet()` 函数存在，设置 `dataScore: 0`，`totalScore` 为 AI 三维分之和
  - [ ] 书签模式在缺少 GEMINI_API_KEY 时提前报错
  - [ ] `bunx tsc --noEmit` → exit code 0

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Type check passes after core refactor
    Tool: Bash
    Preconditions: All source changes in x-topic-selector.ts complete
    Steps:
      1. Run: bunx tsc --noEmit
      2. Assert: exit code 0
      3. Assert: no type errors in output
    Expected Result: Clean type check
    Evidence: Terminal output captured

  Scenario: Bookmark branch exists and bypasses filtering
    Tool: Grep + Read
    Preconditions: x-topic-selector.ts has been modified
    Steps:
      1. Grep for: source.type.*bookmarks OR sourceType.*bookmarks in x-topic-selector.ts
      2. Assert: Branch condition exists in main()
      3. Read the bookmark branch code block
      4. Assert: filterAndScoreTweets is NOT called within the bookmark branch
      5. Assert: scoreTweetsWithAI IS called within the bookmark branch
      6. Assert: toScoredTweet function is defined and called
    Expected Result: Clean separation of bookmark pipeline from scan pipeline
    Evidence: Code inspection output

  Scenario: toScoredTweet produces valid ScoredTweet shape
    Tool: Grep + Read
    Preconditions: toScoredTweet function exists
    Steps:
      1. Read toScoredTweet function definition
      2. Assert: return type matches ScoredTweet interface
      3. Assert: dataScore is set to 0
      4. Assert: totalScore equals innovation + practicality + influence
      5. Assert: no `as any` casts used
    Expected Result: Type-safe adapter function
    Evidence: Code inspection output

  Scenario: Scan pipeline unchanged
    Tool: Grep + Read
    Preconditions: All modifications complete
    Steps:
      1. Read filterAndScoreTweets function (lines 96-131)
      2. Assert: function body is identical to pre-refactor
      3. Read calculateDataScore and calculateTotalScore
      4. Assert: function bodies are identical to pre-refactor
    Expected Result: Zero changes to scan pipeline functions
    Evidence: Code diff or read output
  ```

  **Commit**: YES
  - Message: `feat(topic-selector): add bookmark extraction pipeline bypassing score filtering`
  - Files: `scripts/x-topic-selector.ts`
  - Pre-commit: `bunx tsc --noEmit`

---

- [ ] 2. Report: 书签模式措辞微调

  **What to do**:
  1. 在 `generateDigestReport()` 中，修改书签模式下的措辞：
     - Line 324: `"AI 精选 Top ${tweets.length}"` → 当书签模式时改为 `"共 ${tweets.length} 条书签收藏"` 
     - Line 367-369: `"扫描推文 | 筛选后 | 精选"` 表头 → 书签模式改为 `"抓取书签 | — | 收录"`
  2. 需要一种方式让 `generateDigestReport` 知道当前是书签模式。选项：
     - 在 `DigestOptions` 接口中新增 `isBookmarkMode?: boolean` 字段（推荐，最小改动）
  3. 修改 Line 456 页脚：书签模式下 `"扫描 N 条 → 精选 N 条"` → `"收录 N 条书签"`

  **Must NOT do**:
  - MUST NOT 改变 `generateDigestReport()` 的函数签名（仅在 DigestOptions 中加可选字段）
  - MUST NOT 修改报告的结构/模板布局
  - MUST NOT 改变非书签模式（isBookmarkMode 为 false/undefined 时）的任何输出
  - 总变更量 ≤10 行

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 小范围措辞修改，影响面很小
  - **Skills**: [`x-ai-topic-selector`]
    - `x-ai-topic-selector`: 提供项目上下文
  - **Skills Evaluated but Omitted**:
    - `writing`: 不是文档写作，是代码中的字符串修改

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 5)
  - **Blocks**: Task 6
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `scripts/report-generator.ts:319-460` — `generateDigestReport()` 完整函数，理解需要修改的位置
  - `scripts/report-generator.ts:323-324` — 报告标题行 `"AI 精选 Top N"`，需要条件化
  - `scripts/report-generator.ts:367-369` — 数据概览表头 `"扫描推文 | 筛选后 | 精选"`，需要条件化
  - `scripts/report-generator.ts:456` — 页脚文案，需要条件化

  **API/Type References**:
  - `scripts/report-generator.ts:306-317` — `DigestOptions` 接口定义，需要新增 `isBookmarkMode?: boolean`

  **WHY Each Reference Matters**:
  - `generateDigestReport():323-324`: 这是书签报告最显眼的措辞不一致处——"精选"暗示过滤，而书签模式不过滤
  - `DigestOptions:306-317`: 新增可选字段是向报告函数传递模式信息的最小侵入方式

  **Acceptance Criteria**:

  - [ ] `DigestOptions` 接口包含 `isBookmarkMode?: boolean`
  - [ ] 书签模式下报告标题不含"精选"或"Top"
  - [ ] 非书签模式下报告输出完全不变
  - [ ] `bunx tsc --noEmit` → exit code 0
  - [ ] 变更行数 ≤10

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Bookmark mode wording is correct
    Tool: Grep + Read
    Preconditions: report-generator.ts has been modified
    Steps:
      1. Read generateDigestReport function
      2. Assert: isBookmarkMode check exists for title line
      3. Assert: when isBookmarkMode=true, title says "共 N 条书签收藏" not "AI 精选 Top N"
      4. Assert: when isBookmarkMode=false/undefined, title still says "AI 精选 Top N"
      5. Grep for "精选" in generateDigestReport — should only appear in non-bookmark branch
    Expected Result: Wording is mode-aware
    Evidence: Code inspection output

  Scenario: DigestOptions interface updated
    Tool: Read
    Preconditions: report-generator.ts modified
    Steps:
      1. Read DigestOptions interface definition
      2. Assert: isBookmarkMode field exists with type boolean and is optional (?)
    Expected Result: Interface extended minimally
    Evidence: Code inspection output
  ```

  **Commit**: YES (groups with Task 3)
  - Message: `feat(report): adjust digest report wording for bookmark extraction mode`
  - Files: `scripts/report-generator.ts`
  - Pre-commit: `bunx tsc --noEmit`

---

- [ ] 3. Compat: `--digest` 向后兼容 + 边缘场景

  **What to do**:
  1. 保留 `--digest` CLI flag，使其成为书签管线的向后兼容别名：
     - 当 `--digest` 被传入时，自动设置 `source = bookmarks`
     - 如果同时传入了显式 URL（如 `--digest https://x.com/i/lists/123`），显式 URL 优先（保持原行为）
  2. 处理 `--digest` + 显式 bookmarks URL 的冗余情况（不报错，正常执行）
  3. 确保现有 digestMode 的默认参数（ai-only, topN=15）在新书签管线中仍可用：
     - 书签管线强制 `scoreMode = 'ai-only'`（因为需要 AI 分析）
     - `maxTweets` 使用用户传入值或默认值（不再有 topN 概念）
  4. 移除 SKILL.md 中的 `/bookmark-digest` 独立命令（在 Task 4 中处理）

  **Must NOT do**:
  - MUST NOT 删除 `--digest` flag 的解析逻辑（向后兼容）
  - MUST NOT 改变 `--digest` 在非书签来源时的行为（如果有 explicit URL 则用 URL）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 小范围兼容性调整
  - **Skills**: [`x-ai-topic-selector`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 5)
  - **Blocks**: Task 6
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `scripts/x-topic-selector.ts:870-893` — 现有 `digestMode` 处理逻辑，理解 `--digest` 如何设置默认参数
  - `scripts/x-topic-selector.ts:856-868` — CLI 参数解析区域

  **WHY Each Reference Matters**:
  - `digestMode:870-893`: 这是 `--digest` 的现有行为——强制 bookmarks、ai-only、topN=15。重构后这段逻辑需要适配到新的书签分支

  **Acceptance Criteria**:

  - [ ] `--digest` flag 仍被解析且不报错
  - [ ] `--digest` 不带 URL 时自动路由到书签管线
  - [ ] `--digest` 带显式 URL 时，URL 优先（如 lists URL → 走扫描管线）
  - [ ] 书签管线强制 `scoreMode = 'ai-only'`
  - [ ] `bunx tsc --noEmit` → exit code 0

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: --digest flag routes to bookmark pipeline
    Tool: Grep + Read
    Preconditions: x-topic-selector.ts fully refactored
    Steps:
      1. Read the --digest handling code
      2. Assert: --digest sets source to bookmarks when no explicit URL
      3. Assert: --digest with explicit URL uses the explicit URL
      4. Assert: bookmark pipeline is entered when source is bookmarks
    Expected Result: Backward-compatible --digest behavior
    Evidence: Code inspection output
  ```

  **Commit**: YES (groups with Task 2)
  - Message: `refactor(topic-selector): adapt --digest flag as backward-compat bookmark alias`
  - Files: `scripts/x-topic-selector.ts`
  - Pre-commit: `bunx tsc --noEmit`

---

- [ ] 4. SKILL.md: 交互流程重设计

  **What to do**:
  1. 合并 `/bookmark-digest` 命令到 `/select-topics`：
     - 移除 `/bookmark-digest` 的独立命令定义
     - 在 `/select-topics` 流程中，当用户选择"书签"来源时，自动进入书签提取模式
  2. 更新 `/select-topics` 的参数收集流程：
     - 扫描过滤模式（Home/Lists）：保持现有参数（评分模式、分类、扫描数量、推荐条数）
     - 书签提取模式（Bookmarks）：简化参数——只需扫描数量（max-tweets），不需评分模式/分类/推荐条数/关键词
  3. 书签模式参数收集逻辑：
     - 来源选择 → 选择"书签" → 自动分流
     - 仅收集：扫描数量（默认 50/100/200）
     - 自动设置：scoreMode=ai-only（不让用户选，因为 AI 分析是必须的）
     - 检查 GEMINI_API_KEY（无则要求输入）
  4. 更新配置复用逻辑：
     - 如果上次是书签模式，"使用上次配置"应正确回到书签模式
     - 配置中记录 `sourceType` 即可区分

  **Must NOT do**:
  - MUST NOT 改变扫描过滤模式的交互流程
  - MUST NOT 增加超过 4 个选项的选择题（保持简洁）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: SKILL.md 是纯 Markdown 文件，修改逻辑描述
  - **Skills**: [`x-ai-topic-selector`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Tasks 5, 6
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `SKILL.md:19-22` — 现有 `/select-topics` 命令定义
  - `SKILL.md:26-28` — 现有 `/bookmark-digest` 命令定义（将被合并）
  - `SKILL.md:30-200` (approx) — 参数收集交互流程，需要添加书签分支

  **Documentation References**:
  - `README.md:命令` section — 理解现有命令描述，确保 SKILL.md 改动一致

  **WHY Each Reference Matters**:
  - `SKILL.md:19-22`: 这是要修改的核心命令定义，需要加入书签自动分流逻辑
  - `SKILL.md:26-28`: 这是要移除的独立命令，其功能合并到 `/select-topics`

  **Acceptance Criteria**:

  - [ ] SKILL.md 中不再有 `/bookmark-digest` 独立命令
  - [ ] `/select-topics` 中"书签"选项存在且描述了自动进入书签提取模式
  - [ ] 书签模式参数收集仅包含扫描数量（不含评分模式、分类、推荐条数）
  - [ ] 书签模式强制 ai-only + GEMINI_API_KEY 检查
  - [ ] 扫描过滤模式的交互流程完全不变

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: SKILL.md structure is correct
    Tool: Read + Grep
    Preconditions: SKILL.md has been modified
    Steps:
      1. Grep for "bookmark-digest" in SKILL.md
      2. Assert: No standalone /bookmark-digest command definition exists
      3. Read /select-topics command section
      4. Assert: Bookmarks source option exists
      5. Assert: Bookmark mode describes simplified parameter collection
      6. Assert: Bookmark mode mentions ai-only and GEMINI_API_KEY requirement
      7. Grep for scan mode parameters (评分模式, 分类, 推荐条数)
      8. Assert: These only appear in non-bookmark flow
    Expected Result: Clean unified command with auto-routing
    Evidence: SKILL.md content inspection
  ```

  **Commit**: YES
  - Message: `feat(skill): merge bookmark-digest into select-topics with auto-routing`
  - Files: `SKILL.md`
  - Pre-commit: N/A (markdown file)

---

- [ ] 5. Docs: README.md 更新

  **What to do**:
  1. 更新"命令"部分：
     - 移除 `/bookmark-digest` 描述
     - 在 `/select-topics` 中说明双模式自动分流
  2. 更新"工作流程"部分：
     - 添加书签提取模式的流程说明（简化版：抓取 → 展开 → AI 分析 → 报告）
     - 标注与扫描过滤模式的区别
  3. 更新 CLI 参数说明：
     - `--digest` 标注为"向后兼容别名，等同于选择书签来源"
  4. 更新"更新日志"：
     - 新增 v1.2.0 条目，说明双模式拆分

  **Must NOT do**:
  - MUST NOT 重写整个 README
  - MUST NOT 添加与本次变更无关的内容

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: 文档更新任务
  - **Skills**: [`x-ai-topic-selector`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 3)
  - **Blocks**: Task 6
  - **Blocked By**: Tasks 1, 4

  **References**:

  **Documentation References**:
  - `README.md` 完整文件 — 当前文档内容，需要局部更新
  - `SKILL.md` (Task 4 的产出) — 确保命令描述一致

  **WHY Each Reference Matters**:
  - README.md: 需要理解当前文档结构才能做最小化更新
  - SKILL.md: 两个文件的命令描述必须一致，README 需要反映 SKILL.md 的变更

  **Acceptance Criteria**:

  - [ ] README 中不再有 `/bookmark-digest` 作为独立命令
  - [ ] `/select-topics` 描述包含双模式说明
  - [ ] `--digest` 标注为向后兼容别名
  - [ ] 更新日志包含 v1.2.0 条目
  - [ ] 书签提取模式流程说明存在

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: README content is accurate
    Tool: Read + Grep
    Preconditions: README.md has been updated
    Steps:
      1. Grep for "bookmark-digest" in README.md
      2. Assert: Not listed as standalone command (may appear as deprecated alias mention)
      3. Read /select-topics section
      4. Assert: Mentions dual mode (scan+filter and bookmark extraction)
      5. Read --digest parameter description
      6. Assert: Described as backward-compatible alias
      7. Read changelog section
      8. Assert: v1.2.0 entry exists describing dual-mode refactor
    Expected Result: Documentation accurately reflects refactored behavior
    Evidence: README.md content inspection
  ```

  **Commit**: YES
  - Message: `docs: update README for dual-mode refactor and bookmark extraction`
  - Files: `README.md`
  - Pre-commit: N/A (markdown file)

---

- [ ] 6. Verify: 完整类型检查 + 集成验证

  **What to do**:
  1. 运行 `bunx tsc --noEmit` 确认所有文件类型安全
  2. 运行 `bun run scripts/x-topic-selector.ts --help` 确认 CLI 正常
  3. 代码检查：
     - 确认 `filterAndScoreTweets()` 函数体未被修改
     - 确认 `ai-scorer.ts` 完全未被修改
     - 确认 `x-utils.ts` 完全未被修改
     - 确认书签分支存在且不调用 filterAndScoreTweets
  4. 如有任何错误，修复并重新验证

  **Must NOT do**:
  - MUST NOT 跳过类型检查
  - MUST NOT 引入新的 `as any`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 纯验证任务
  - **Skills**: [`x-ai-topic-selector`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential, final)
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 1, 2, 3, 4, 5

  **References**:

  - `scripts/x-topic-selector.ts` — 主要变更文件
  - `scripts/report-generator.ts` — 措辞变更文件
  - `scripts/ai-scorer.ts` — 冻结文件（验证未修改）
  - `scripts/x-utils.ts` — 冻结文件（验证未修改）
  - `SKILL.md` — 交互流程变更
  - `README.md` — 文档变更

  **Acceptance Criteria**:

  - [ ] `bunx tsc --noEmit` → exit code 0
  - [ ] `bun run scripts/x-topic-selector.ts --help` → 正常输出帮助
  - [ ] `ai-scorer.ts` 无任何 diff（git diff 为空）
  - [ ] `x-utils.ts` 无任何 diff（git diff 为空）
  - [ ] `filterAndScoreTweets()` 函数体无变更

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Full type check passes
    Tool: Bash
    Steps:
      1. Run: bunx tsc --noEmit
      2. Assert: exit code 0
      3. Assert: no output (clean pass)
    Expected Result: All TypeScript types valid
    Evidence: Terminal output

  Scenario: CLI still works
    Tool: Bash
    Steps:
      1. Run: bun run scripts/x-topic-selector.ts --help
      2. Assert: exit code 0 or help text displayed
    Expected Result: CLI functional
    Evidence: Terminal output

  Scenario: Frozen files untouched
    Tool: Bash
    Steps:
      1. Run: git diff scripts/ai-scorer.ts
      2. Assert: empty output (no changes)
      3. Run: git diff scripts/x-utils.ts
      4. Assert: empty output (no changes)
    Expected Result: Frozen files preserved
    Evidence: Git diff output

  Scenario: filterAndScoreTweets unchanged
    Tool: Bash
    Steps:
      1. Run: git diff scripts/x-topic-selector.ts | grep -A 5 'filterAndScoreTweets'
      2. Assert: function body has no - or + diff lines (only context lines if any)
    Expected Result: Scan pipeline function preserved
    Evidence: Git diff output
  ```

  **Commit**: NO (verification only, no new changes)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(topic-selector): add bookmark extraction pipeline bypassing score filtering` | `scripts/x-topic-selector.ts` | `bunx tsc --noEmit` |
| 2+3 | `feat(report): adjust digest report wording for bookmark mode` + `refactor(topic-selector): adapt --digest as backward-compat alias` | `scripts/report-generator.ts`, `scripts/x-topic-selector.ts` | `bunx tsc --noEmit` |
| 4 | `feat(skill): merge bookmark-digest into select-topics with auto-routing` | `SKILL.md` | N/A |
| 5 | `docs: update README for dual-mode refactor` | `README.md` | N/A |
| 6 | No commit (verification only) | — | — |

---

## Success Criteria

### Verification Commands
```bash
bunx tsc --noEmit          # Expected: exit code 0, no output
bun run scripts/x-topic-selector.ts --help  # Expected: help text displayed
git diff scripts/ai-scorer.ts   # Expected: empty (frozen)
git diff scripts/x-utils.ts     # Expected: empty (frozen)
```

### Final Checklist
- [ ] 书签来源自动进入书签提取管线（无 filterAndScoreTweets 调用）
- [ ] 扫描来源管线行为 100% 不变
- [ ] AI 分析在书签模式下正常工作（摘要、翻译、标题、分类、评分、选题思路）
- [ ] `--digest` 向后兼容
- [ ] 类型安全（无 `as any`，tsc 通过）
- [ ] `ai-scorer.ts` 和 `x-utils.ts` 零修改
- [ ] SKILL.md 无 `/bookmark-digest` 独立命令
- [ ] README.md 反映双模式架构
