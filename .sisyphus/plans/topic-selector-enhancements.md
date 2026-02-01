# X AI Topic Selector 功能增强

## TL;DR

> **Quick Summary**: 修复互动热度 Top3 原文链接缺失，并实现 Thread 自动展开功能
> 
> **Deliverables**:
> - 互动热度 Top3 表格添加原文链接列
> - Thread 自动检测与完整内容抓取
> - Thread 内容合并为单条记录（不增加帖子计数）
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: NO - sequential
> **Critical Path**: Task 1 → Task 2 → Task 3

---

## Context

### Original Request
用户要求：
1. 互动热度 Top3 需要显示原文链接
2. 实现 Thread（帖子串）自动展开，获取完整内容而非只看首贴
3. 完整 Thread 算一个帖子计数，不重复统计

### 当前状态
- `report-generator.ts` 的互动热度 Top3 表格缺少链接列
- 抓取逻辑只获取 Thread 首贴，无法获取后续内容
- 评分系统已更新为 创新性/实用性/影响力 三维度

---

## Work Objectives

### Core Objective
增强选题工具：补全链接显示 + Thread 完整内容抓取

### Concrete Deliverables
- `scripts/report-generator.ts` - 互动热度 Top3 添加链接列
- `scripts/x-topic-selector.ts` - Thread 检测与展开逻辑
- `scripts/x-utils.ts` - 可能新增 Thread 抓取辅助函数

### Definition of Done
- [x] 互动热度 Top3 每行显示可点击的原文链接
- [x] Thread 帖子自动检测（通过 "Show this thread" 或回复数 > 0 判断）
- [x] Thread 完整内容合并到一条记录的 `text` 字段
- [x] Thread 计数为 1（不是 N 条）

### Must Have
- 原文链接可点击
- Thread 完整内容被抓取
- Thread 首贴的互动数据保留作为整体数据

### Must NOT Have (Guardrails)
- 不要改变现有评分逻辑
- 不要破坏非 Thread 帖子的抓取逻辑
- Thread 展开不应显著增加抓取时间（设置合理超时）

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (可通过实际运行验证)
- **User wants tests**: Manual-only
- **QA approach**: 手动执行脚本，检查输出报告

---

## TODOs

- [x] 1. 修复互动热度 Top3 - 添加原文链接列

  **What to do**:
  1. 打开 `scripts/report-generator.ts`
  2. 找到 `generateEngagementTop3` 函数（约第 40-61 行）
  3. 修改表头：添加 `| 链接 |` 列
  4. 修改每行数据：添加 `| [🔗](${tweet.url}) |`

  **Must NOT do**:
  - 不要修改其他报告生成逻辑
  - 不要改变表格其他列的格式

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
    - 简单的字符串修改，无需特殊 skill

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Task 3
  - **Blocked By**: None

  **References**:
  - `scripts/report-generator.ts:40-61` - `generateEngagementTop3` 函数
  
  **具体代码修改**:
  ```typescript
  // 修改前（第 50-51 行）
  section += `| 排名 | 作者 | 互动总量 | 内容预览 |\n`;
  section += `|------|------|----------|----------|\n`;
  
  // 修改后
  section += `| 排名 | 作者 | 互动总量 | 内容预览 | 链接 |\n`;
  section += `|------|------|----------|----------|------|\n`;
  
  // 修改前（第 55-56 行）
  section += `| ${index + 1} | @${tweet.authorUsername} | ${engagement.toLocaleString()} | ${preview} |\n`;
  
  // 修改后
  section += `| ${index + 1} | @${tweet.authorUsername} | ${engagement.toLocaleString()} | ${preview} | [🔗](${tweet.url}) |\n`;
  ```

  **Acceptance Criteria**:
  - [x] 运行脚本生成报告
  - [x] 检查互动热度 Top3 表格是否有 5 列（排名、作者、互动总量、内容预览、链接）
  - [x] 点击链接应跳转到正确的推文页面

  **Commit**: YES
  - Message: `fix(report): add tweet URL to engagement top 3 table`
  - Files: `scripts/report-generator.ts`

---

- [x] 2. 实现 Thread 自动展开功能

  **What to do**:
  1. 修改 `scripts/x-topic-selector.ts` 的 Tweet 接口和抓取逻辑
  2. 检测 Thread：通过 URL 结构或 "Show this thread" 按钮
  3. 对于 Thread 帖子，点击进入详情页抓取完整内容
  4. 合并 Thread 所有内容到 `text` 字段，用 `\n---\n` 分隔
  5. 添加 `isThread: boolean` 和 `threadLength: number` 字段

  **Must NOT do**:
  - 不要改变非 Thread 帖子的处理逻辑
  - Thread 展开失败时应 fallback 到只用首贴内容
  - 不要让 Thread 的每条回复都计入总帖数

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`playwright`] 或无（当前使用 CDP 直接操作）
    - CDP 操作涉及页面导航和 DOM 操作

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Task 3
  - **Blocked By**: None（可与 Task 1 并行但建议顺序执行）

  **References**:
  - `scripts/x-topic-selector.ts:28-39` - Tweet 接口定义
  - `scripts/x-topic-selector.ts:236-356` - 推文抓取循环逻辑
  - `scripts/x-utils.ts` - CDP 连接工具

  **实现思路**:

  **Step 2.1: 扩展 Tweet 接口**
  ```typescript
  interface Tweet {
    text: string;
    authorUsername: string;
    authorDisplayName: string;
    likes: number;
    retweets: number;
    replies: number;
    views: number;
    time: string;
    url: string;
    isRetweet: boolean;
    isThread: boolean;       // NEW
    threadLength: number;    // NEW: 1 for non-thread, N for thread
  }
  ```

  **Step 2.2: 检测 Thread 的方法**
  在列表页抓取时，检测：
  - 是否有 "Show this thread" 文本
  - 或者 replies > 0 且同一作者连续发帖
  - 或者检查 DOM 中是否有 thread 指示器

  **Step 2.3: 展开 Thread 的逻辑**
  ```typescript
  async function expandThread(cdp: CdpConnection, sessionId: string, tweetUrl: string): Promise<string[]> {
    // 1. 导航到推文详情页
    await cdp.send('Page.navigate', { url: tweetUrl }, { sessionId });
    await sleep(2000);
    
    // 2. 抓取该作者的所有连续推文
    const threadTexts = await cdp.send<{ result: { value: string[] } }>('Runtime.evaluate', {
      expression: `
        (() => {
          const texts = [];
          const tweets = document.querySelectorAll('[data-testid="tweet"]');
          let authorUsername = null;
          
          for (const tweet of tweets) {
            // 获取作者
            const userLink = tweet.querySelector('[data-testid="User-Name"] a[href^="/"]');
            const username = userLink?.getAttribute('href')?.slice(1);
            
            // 第一条确定作者
            if (!authorUsername) authorUsername = username;
            
            // 只取同一作者的内容（Thread）
            if (username === authorUsername) {
              const textEl = tweet.querySelector('[data-testid="tweetText"]');
              if (textEl) texts.push(textEl.innerText.trim());
            }
          }
          return texts;
        })()
      `,
      returnByValue: true
    }, { sessionId });
    
    return threadTexts.result.value;
  }
  ```

  **Step 2.4: 整合到主抓取流程**
  在收集完基础推文后，对检测到的 Thread 进行展开：
  ```typescript
  // 在主循环后添加
  const threadsToExpand = Array.from(collectedTweets.values())
    .filter(t => t.replies > 0 && !t.isRetweet);  // 可能是 Thread
  
  for (const tweet of threadsToExpand) {
    try {
      const threadTexts = await expandThread(cdp, sessionId, tweet.url);
      if (threadTexts.length > 1) {
        tweet.text = threadTexts.join('\n\n---\n\n');
        tweet.isThread = true;
        tweet.threadLength = threadTexts.length;
      }
    } catch (err) {
      console.warn(`[x-topic-selector] Failed to expand thread: ${tweet.url}`);
    }
  }
  ```

  **Acceptance Criteria**:
  - [x] 运行脚本抓取包含 Thread 的列表
  - [x] 检查报告中 Thread 帖子的 `text` 是否包含完整内容（用 `---` 分隔）
  - [x] 确认 Thread 只计为 1 条帖子
  - [x] 非 Thread 帖子不受影响

  **Commit**: YES
  - Message: `feat(scraper): auto-expand thread to get full content`
  - Files: `scripts/x-topic-selector.ts`

---

- [x] 3. 更新文档和报告格式

  **What to do**:
  1. 更新 `SKILL.md` 添加 Thread 处理说明
  2. 更新 `report-generator.ts` 在报告中标注 Thread 帖子
  3. 添加 Thread 长度信息到报告

  **Must NOT do**:
  - 不要改变交互流程

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: None
  - **Blocked By**: Task 1, Task 2

  **References**:
  - `SKILL.md` - 技能文档
  - `scripts/report-generator.ts:84-117` - 选题详情生成

  **具体修改**:
  
  在报告中为 Thread 帖子添加标识：
  ```typescript
  // 在 report-generator.ts 第 109 行附近
  report += `- 🏷️ ${tweet.isRetweet ? "转发" : "原创"}`;
  if (tweet.isThread && tweet.threadLength > 1) {
    report += ` | 📜 Thread (${tweet.threadLength} 条)`;
  }
  ```

  **Acceptance Criteria**:
  - [x] SKILL.md 包含 Thread 处理的说明
  - [x] 报告中 Thread 帖子显示 `📜 Thread (N 条)` 标识
  - [x] 非 Thread 帖子不显示此标识

  **Commit**: YES
  - Message: `docs: add thread handling documentation and report labels`
  - Files: `SKILL.md`, `scripts/report-generator.ts`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `fix(report): add tweet URL to engagement top 3 table` | report-generator.ts | 手动检查报告 |
| 2 | `feat(scraper): auto-expand thread to get full content` | x-topic-selector.ts | 手动抓取验证 |
| 3 | `docs: add thread handling documentation and report labels` | SKILL.md, report-generator.ts | 手动检查 |

---

## Success Criteria

### Verification Commands
```bash
# 运行抓取并生成报告
bun run scripts/x-topic-selector.ts "YOUR_LIST_URL" --max-tweets 20 --dry-run

# 检查报告格式
cat output/topic-report-*.md | grep -A5 "互动热度"
```

### Final Checklist
- [x] 互动热度 Top3 表格有 5 列（含链接）
- [x] Thread 帖子被正确检测并展开
- [x] Thread 计数正确（1 条而非 N 条）
- [x] 报告中 Thread 有特殊标识
