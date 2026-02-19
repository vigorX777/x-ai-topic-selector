# AGENTS.md — x-ai-topic-selector

## Project Overview

Twitter/X topic selector skill for AI agents. Scrapes tweets via Chrome CDP, scores them (data metrics or Gemini AI), generates Markdown topic recommendation reports. This is a **Bun-first TypeScript project** — no bundler, no framework, scripts run directly with `bun run`.

## Build / Lint / Test Commands

```bash
# Type-check (no emit — tsconfig has "noEmit": true)
bunx tsc --noEmit

# Run unit tests (61 tests across 3 files)
bun test

# Run main script (requires Chrome + X login)
bun run scripts/x-topic-selector.ts <source-url> [options]

# Example: dry-run with 10 tweets from a list
bun run scripts/x-topic-selector.ts 1234567890 --dry-run --max-tweets 10

# Example: AI scoring mode
bun run scripts/x-topic-selector.ts "https://x.com/i/lists/123" --score-mode ai-only --top-n 5
```

**Test Suite**: Bun built-in test runner with 61 test cases covering:
- 17 pure functions (data scoring, filtering, keyword extraction, report formatting)
- 6 API integration functions (AIClient mock-based testing via `MockAIClient`)
- Test files located in `tests/` directory
- No E2E tests for Chrome CDP (explicitly excluded)

**No linter or formatter is configured.** Follow the implicit conventions documented below.

## File Structure

```
scripts/
  x-topic-selector.ts   # Main entry — CLI parsing, Chrome launch, tweet scraping, orchestration
  ai-client.ts           # AI client abstraction — AIClient interface, GeminiClient, OpenAICompatibleClient, factory
  ai-scorer.ts           # AI scoring logic — batch scoring with concurrency control
  report-generator.ts    # Markdown report generation — engagement stats, keyword charts, recommendations
  x-utils.ts             # Chrome CDP connection, port management, platform-specific Chrome discovery
tests/
  x-topic-selector.test.ts   # Unit tests for main entry functions (20 tests)
  ai-scorer.test.ts          # Unit tests for AI scoring functions (18 tests)
  report-generator.test.ts   # Unit tests for report generation (21 tests)
SKILL.md                 # Agent interaction definition (question flows, parameter mapping)
output/                  # Generated reports (gitignored)
```

## TypeScript Configuration

- **Target**: ES2020, **Module**: ESNext, **Resolution**: bundler
- **Strict mode**: enabled
- **No emit**: scripts are run directly via `bun run`, not compiled
- Imports use `.js` extensions (Bun resolves `.ts` → `.js` at runtime)

## Code Style

### Imports

- Use `node:` protocol for Node.js builtins: `import fs from 'node:fs'`, `import { spawn } from 'node:child_process'`
- Use `.js` extensions for local imports: `import { sleep } from './x-utils.js'`
- Group: node builtins first, then local modules
- Use named imports; default imports only for Node builtins (`import fs from 'node:fs'`)
- Type-only imports use `import type`: `import type { AIScoredTweet } from './ai-scorer.js'`

### Formatting

- 2-space indentation
- Single quotes for strings
- Semicolons required
- Trailing commas in multi-line constructs
- ~100 char line width (soft limit, no enforced formatter)
- Template literals for string interpolation and multi-line strings

### Naming Conventions

- **Interfaces**: PascalCase (`Tweet`, `ScoredTweet`, `TopicSelectorOptions`)
- **Types**: PascalCase (`SourceType`, `PlatformCandidates`)
- **Functions**: camelCase (`calculateDataScore`, `filterAndScoreTweets`)
- **Constants**: UPPER_SNAKE_CASE for module-level config (`THREAD_EXPANSION_CONCURRENCY`, `DEFAULT_BATCH_SIZE`, `SELECTORS`)
- **Variables**: camelCase
- **Files**: kebab-case (`x-topic-selector.ts`, `ai-scorer.ts`)
- Prefix `is`/`has` for booleans: `isRetweet`, `isThread`, `hasEnglishContent`

### Types

- Prefer `interface` for object shapes, `type` for unions/aliases
- Use `as const` for readonly literal objects (see `SELECTORS`)
- Use generics on CDP `send<T>()` calls for return type safety
- Avoid `any` — use `unknown` and narrow. The one exception: `as any` appears minimally in scoring bridge code
- Optional fields use `?`: `isArticle?: boolean`

### Functions

- `async`/`await` throughout — no raw Promise chains
- Export only public API functions; keep helpers module-private
- Use arrow functions for callbacks/inline, `function` keyword for named top-level functions
- Main entry pattern: `async function main(): Promise<void>` with top-level `await main().catch(...)`

### Error Handling

- Try/catch with specific error messages: `throw new Error('Chrome not found. Set X_BROWSER_CHROME_PATH env var.')`
- Graceful degradation: AI scoring failures return default scores, don't crash
- Console logging with module prefix: `console.log('[x-topic-selector] ...')`, `console.warn('[ai-scorer] ...')`
- Empty catch blocks only for cleanup code (Chrome process kill, WebSocket close)
- Pattern: `error instanceof Error ? error.message : String(error)`

### Chrome CDP Patterns

- Use `CdpConnection` class from `x-utils.ts` for all WebSocket communication
- Always clean up: close targets in `finally` blocks, kill Chrome process on exit
- Use `sessionId` for tab-specific operations
- `Runtime.evaluate` with `returnByValue: true` for extracting DOM data
- Inline JS expressions as template literal strings in `Runtime.evaluate`

### Concurrency Patterns

- Batch processing with configurable concurrency (`THREAD_EXPANSION_CONCURRENCY = 3`, `MAX_CONCURRENT_BATCHES = 2`)
- `Promise.allSettled` for parallel operations that shouldn't fail-fast
- `Promise.all` for concurrent batches where failure should propagate
- Sequential batch groups: process N batches at a time, await, then next N

### Report Generation

- Reports are Markdown strings built via string concatenation
- Mermaid charts for keyword visualization
- Engagement data formatted with `toLocaleString()`
- Bilingual support: Chinese labels, English content preserved with optional translation

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | AI mode only | Gemini API key for content scoring |
| `GEMINI_MODEL` | No (default: gemini-2.0-flash) | Gemini model name (e.g., `gemini-1.5-pro`, `gemini-2.0-flash`) |
| `X_BROWSER_CHROME_PATH` | No | Override Chrome executable path |
| `OPENAI_API_KEY` | AI mode only (OpenAI provider) | OpenAI-compatible API key (e.g., DeepSeek) |
| `OPENAI_API_BASE` | No (default: https://api.openai.com/v1) | OpenAI-compatible API base URL |
| `OPENAI_MODEL` | Required for OpenAI provider | Model name (e.g., `deepseek-chat`). No default — must be explicit |

## Config Persistence

User config stored at `~/.x-topic-selector/config.json`. The agent workflow (SKILL.md) reads/writes this file to remember last-used parameters. Never commit this file.

## Key Patterns to Preserve

1. **Module prefix logging**: All console output uses `[module-name]` prefix
2. **CDP target lifecycle**: Create target → attach → operate → close in finally
3. **Scoring normalization**: Raw scores normalized against max in batch
4. **Deduplication**: Tweets keyed by URL or `username:text_prefix`
5. **Thread expansion**: Parallel tab-per-thread with retry fallback to main session
6. **Truncated tweet expansion**: Navigate to detail page, extract full text
7. **Graceful degradation**: AI mode falls back to data-only if no API key
8. **AI provider abstraction**: All AI calls go through `AIClient.generate()`, never direct HTTP

---

## Technical Architecture

### Dual-Mode Execution Flow

The system automatically routes to the appropriate mode based on content source:

| Mode | Triggered By | Core Logic | Output |
|------|-------------|------------|--------|
| **Scan & Filter** | Lists / Home | Scrape → Score → **Filter** → **Rank** → **Top N** | Curated topic recommendations |
| **Bookmark Extract** | Bookmarks | Scrape → **AI Deep Analysis** → **Keep All** | Complete bookmark digest |

**Key Differences**:
- **Scan mode**: Filter high-quality topics from massive feed (keyword filter + category filter + scoring)
- **Bookmark mode**: AI-assisted understanding of manually curated content (no filtering/ranking, preserve all)

### Chrome DevTools Protocol Implementation

**Connection Management**:
- Auto-detect system Chrome path (macOS/Linux/Windows support)
- Launch Chrome with `--remote-debugging-port=0` (random available port)
- WebSocket connection to `ws://localhost:{port}/json` for target management
- Persistent user profile at `~/.local/share/x-topic-selector-profile` (login state preservation)

**Scraping Strategy**:
```typescript
// Main session: scroll & collect tweet elements
for (let i = 0; i < maxScrolls; i++) {
  await page.evaluate('window.scrollBy(0, 1000)');
  const newTweets = await page.querySelectorAll('article[data-testid="tweet"]');
  // Extract: author, text, engagement metrics, URL
}

// Thread expansion: parallel tab-per-thread (concurrency = 3)
const threads = tweets.filter(t => t.isThread);
for (const batch of chunk(threads, 3)) {
  await Promise.allSettled(batch.map(async thread => {
    const targetId = await cdp.send('Target.createTarget', { url: thread.url });
    const sessionId = await cdp.send('Target.attachToTarget', { targetId });
    // Extract full thread chain...
    await cdp.send('Target.closeTarget', { targetId });
  }));
}

// Truncated text expansion: navigate to detail page
if (tweet.text.endsWith('…')) {
  await page.navigate(tweet.url);
  const fullText = await page.evaluate('document.querySelector("article").innerText');
}
```

**Selectors** (as of 2025-02):
```typescript
const SELECTORS = {
  tweet: 'article[data-testid="tweet"]',
  author: 'div[data-testid="User-Name"] a[role="link"]',
  text: 'div[data-testid="tweetText"]',
  likes: 'button[data-testid="like"]',
  retweets: 'button[data-testid="retweet"]',
  replies: 'button[data-testid="reply"]',
  views: 'a[href*="/status/"][aria-label*="views"]',
  threadIndicator: 'div[data-testid="conversation-thread"]'
} as const;
```

### Type System

**Core Data Types**:
```typescript
interface Tweet {
  url: string;
  author: string;
  displayName: string;
  text: string;
  time: string;
  likes: number;
  retweets: number;
  replies: number;
  views: number;
  isThread?: boolean;
  isRetweet?: boolean;
  isArticle?: boolean;
}

interface ScoredTweet extends Tweet {
  dataScore: number;        // Engagement-based score (0-100)
  totalScore: number;       // Composite score (data or AI)
  aiScore?: {               // Only present in AI mode
    innovation: number;     // 1-5
    practicality: number;   // 1-5
    influence: number;      // 1-5
    category: string;       // ai-tools / industry-news / tech-breakthroughs / tutorials / controversial / other
    title?: string;         // Chinese title for English content
    summary?: string;       // Chinese summary for English content
  };
}

interface AIScoredTweet {
  url: string;
  aiScore: {
    innovation: number;
    practicality: number;
    influence: number;
    category: string;
    title?: string;
    summary?: string;
  };
}
```

**Mode Routing Types**:
```typescript
type SourceType = 'list' | 'home' | 'bookmarks';
type ScoreMode = 'data-only' | 'ai-only';

interface TopicSelectorOptions {
  source: { type: SourceType; url?: string; listIds?: string[] };
  scoreMode: ScoreMode;        // Ignored in bookmark mode (forced AI)
  maxTweets: number;
  topN: number;                // Ignored in bookmark mode
  topicCategory?: string;      // Ignored in bookmark mode
  keywords?: string[];         // Ignored in bookmark mode
  excludeKeywords?: string[];  // Ignored in bookmark mode
  outputPath: string;
  geminiApiKey?: string;
}
```

**Type Adapter** (Bookmark mode bridge):
```typescript
function toScoredTweet(tweet: Tweet, aiScore?: AIScoredTweet['aiScore']): ScoredTweet {
  const totalScore = aiScore 
    ? aiScore.innovation + aiScore.practicality + aiScore.influence 
    : 0;
  return { ...tweet, dataScore: 0, totalScore, aiScore };
}
```

### Mode Routing Logic

```typescript
// x-topic-selector.ts (main entry)
if (source.type === 'bookmarks') {
  // =============== BOOKMARK MODE ===============
  console.log('[x-topic-selector] Bookmark mode: Forcing AI analysis');
  
  // 1. Scrape all bookmarked tweets
  const tweets = await scrapeTweets(cdp, source.url, maxTweets);
  
  // 2. Batch AI scoring (required, no fallback to data mode)
  const aiResults = await scoreTweetsWithAI(tweets, geminiApiKey, {
    batchSize: 10,
    maxConcurrentBatches: 2
  });
  
  // 3. Adapt to ScoredTweet format
  const scoredTweets = tweets.map((t, i) => 
    toScoredTweet(t, aiResults[i].aiScore)
  );
  
  // 4. Generate report (no filtering, keep all)
  return generateDigestReport(scoredTweets, {
    isBookmarkMode: true,  // Affects wording
    includeEngagementRank: false,
    includeKeywordChart: false
  });
  
} else {
  // =============== SCAN MODE ===============
  // filterAndScoreTweets() handles:
  // - Keyword filtering (include/exclude)
  // - Category filtering (6 categories + all)
  // - Data/AI scoring based on scoreMode
  // - Top N truncation
  const scoredTweets = await filterAndScoreTweets(
    tweets,
    { keywords, excludeKeywords, topicCategory, scoreMode, topN }
  );
  
  return generateTopicReport(scoredTweets, {
    isBookmarkMode: false,
    includeEngagementRank: true,
    includeKeywordChart: true
  });
}
```

### Module Responsibilities

| Module | Lines | Core Responsibilities | Key Functions |
|--------|-------|----------------------|---------------|
| `x-topic-selector.ts` | 1020 | CLI parsing, Chrome orchestration, mode routing | `main()`, `scrapeTweets()`, `toScoredTweet()` |
| `ai-client.ts` | 139 | AI provider abstraction, factory function, auto-detection | `AIClient`, `GeminiClient`, `OpenAICompatibleClient`, `createAIClient()` |
| `ai-scorer.ts` | 421 | AI scoring logic, batch concurrency control | `scoreTweetsWithAI()`, `batchAnalyze()` |
| `report-generator.ts` | 470 | Markdown generation, engagement stats, keyword charts | `generateDigestReport()`, `generateTopicReport()` |
| `x-utils.ts` | 219 | CDP connection, Chrome discovery, platform utilities | `CdpConnection`, `findChrome()`, `sleep()` |
| `tests/*.test.ts` | 61 tests | Unit tests for all pure functions and API mocks | 61 test cases with Bun test runner |

### Data Scoring Formula

```typescript
function calculateDataScore(tweet: Tweet): number {
  // Engagement-based scoring (normalized 0-100 against batch max)
  const rawScore = 
    tweet.likes * 1 +
    tweet.retweets * 3 +
    tweet.replies * 2 +
    tweet.views * 0.01;
  
  return Math.min(100, rawScore / maxInBatch * 100);
}
```

### AI Scoring Prompt

```typescript
const GEMINI_PROMPT = `
Analyze these ${tweets.length} tweets and provide structured scoring:

For EACH tweet, output JSON:
{
  "url": "https://x.com/...",
  "aiScore": {
    "innovation": 1-5,     // Novelty, originality
    "practicality": 1-5,   // Usefulness, actionability
    "influence": 1-5,      // Potential impact, reach
    "category": "ai-tools|industry-news|tech-breakthroughs|tutorials|controversial|other",
    "title": "中文标题 (if English)",
    "summary": "中文摘要 (if English)"
  }
}

Scoring criteria:
- innovation: 5=groundbreaking, 3=incremental, 1=routine
- practicality: 5=immediately useful, 3=moderate value, 1=abstract
- influence: 5=industry-shifting, 3=niche impact, 1=personal opinion

Tweets:
${JSON.stringify(tweets, null, 2)}
`;
```

**Batch Processing**:
- Batch size: 10 tweets/request (Gemini API limit)
- Max concurrent batches: 2 (rate limit: 15 RPM)
- Retry on 429: Exponential backoff (1s → 2s → 4s)
- Graceful degradation: Return default scores on failure

### Configuration System

**Storage**: `~/.x-topic-selector/config.json`

**Fields**:
```typescript
interface Config {
  sourceType: 'list' | 'home' | 'bookmarks';
  listUrls?: string[];          // Only for 'list' mode
  scoreMode: 'data-only' | 'ai-only';
  geminiApiKey?: string;        // Encrypted (simple XOR obfuscation)
  topicCategory: string;        // 6 categories + 'all'
  maxTweets: number;
  topN: number;
  keywords?: string[];
  excludeKeywords?: string[];
  lastUsed: string;             // ISO 8601 timestamp
}
```

**Priority**: CLI args > EXTEND.md > config.json > defaults

**EXTEND.md Format**:
```markdown
## x-ai-topic-selector

- keywords: AI,GPT,Claude,LLM
- exclude: giveaway,airdrop
- top-n: 10
- max-tweets: 200
```

### Concurrency Control

| Operation | Concurrency | Strategy |
|-----------|-------------|----------|
| Tweet scraping | Sequential | Main session scroll loop |
| Thread expansion | 3 parallel tabs | `Promise.allSettled` per 3-thread batch |
| AI scoring | 2 concurrent batches | `Promise.all` with rate limit handling |
| Report generation | Sequential | Single-threaded Markdown string building |

**Thread Expansion Pattern**:
```typescript
const THREAD_EXPANSION_CONCURRENCY = 3;

for (let i = 0; i < threads.length; i += THREAD_EXPANSION_CONCURRENCY) {
  const batch = threads.slice(i, i + THREAD_EXPANSION_CONCURRENCY);
  const results = await Promise.allSettled(
    batch.map(thread => expandThreadInNewTab(cdp, thread))
  );
  // Merge fulfilled results, log rejected failures
}
```

**AI Scoring Batch Pattern**:
```typescript
const MAX_CONCURRENT_BATCHES = 2;
const batches = chunk(tweets, 10); // 10 tweets per batch

for (let i = 0; i < batches.length; i += MAX_CONCURRENT_BATCHES) {
  const batchGroup = batches.slice(i, i + MAX_CONCURRENT_BATCHES);
  const results = await Promise.all(
    batchGroup.map(batch => batchAnalyze(batch, apiKey))
  );
  // Flatten results
}
```

### Error Handling Strategies

**Chrome Connection Errors**:
```typescript
try {
  const chrome = spawn(chromePath, [...]);
} catch (error) {
  throw new Error('Chrome not found. Set X_BROWSER_CHROME_PATH env var.');
}
```

**AI Scoring Failures**:
```typescript
try {
  const response = await gemini.generateContent(prompt);
} catch (error) {
  if (error.status === 429) {
    console.warn('[ai-scorer] Rate limited, retrying in 1s...');
    await sleep(1000);
    return batchAnalyze(tweets, apiKey); // Retry once
  }
  console.error('[ai-scorer] API error, returning default scores');
  return tweets.map(t => ({ url: t.url, aiScore: DEFAULT_SCORE }));
}
```

**Thread Expansion Failures**:
```typescript
const results = await Promise.allSettled(batch.map(expandThread));
for (const result of results) {
  if (result.status === 'rejected') {
    console.warn(`[x-topic-selector] Thread expansion failed: ${result.reason}`);
    // Continue without this thread's content
  }
}
```

**Cleanup Pattern**:
```typescript
let chrome: ChildProcess | null = null;
let cdp: CdpConnection | null = null;

try {
  chrome = spawn(chromePath, [...]);
  cdp = new CdpConnection(wsUrl);
  // ... operations ...
} finally {
  if (cdp) { try { await cdp.close(); } catch {} }
  if (chrome) { try { chrome.kill('SIGTERM'); } catch {} }
}
```

---

## Development Workflow

### Adding a New Source Type

1. Update `SourceType` union: `'list' | 'home' | 'bookmarks' | 'NEW_TYPE'`
2. Add URL detection logic in CLI parser
3. Implement scraping logic in `scrapeTweets()`:
   - Define new selectors if needed
   - Handle pagination (if different from scroll)
4. Decide mode routing: scan or bookmark?
5. Update SKILL.md question flow
6. Update README.md usage examples

### Adding a New AI Scoring Dimension

1. Update `AIScoredTweet` interface: add new field to `aiScore`
2. Modify Gemini prompt in `ai-scorer.ts` to request new dimension
3. Update JSON parsing logic to extract new field
4. Modify report template in `report-generator.ts` to display new dimension
5. Update README.md scoring documentation

### Debugging Chrome CDP Issues

```bash
# Launch Chrome manually with debugging enabled
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-debug

# Connect via WebSocket (wscat or browser DevTools)
wscat -c ws://localhost:9222/devtools/page/xxx

# Send CDP commands manually
{ "id": 1, "method": "Runtime.evaluate", "params": { "expression": "document.title" } }
```

### Testing Without API Key

```bash
# Test data-only mode
bun run scripts/x-topic-selector.ts "https://x.com/i/lists/123" \
  --score-mode data-only --dry-run --max-tweets 10

# Verify scoring logic
bun run scripts/x-topic-selector.ts "https://x.com/home" \
  --score-mode data-only --top-n 5 --output /tmp/test.md
```

### Performance Profiling

```typescript
// Add timing logs in key functions
const startTime = Date.now();
console.log(`[module] Operation started`);
// ... operation ...
console.log(`[module] Operation completed in ${Date.now() - startTime}ms`);
```

**Expected timings**:
- Tweet scraping (200 tweets): 30-60s
- Thread expansion (10 threads): 20-30s
- AI scoring (200 tweets, 20 batches): 120-180s
- Report generation: <1s
