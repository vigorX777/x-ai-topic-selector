import * as process from 'node:process';

/**
 * AI Scoring Module
 * Uses Gemini API to analyze tweet content and provide scoring/suggestions
 */

// Gemini API Configuration
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const DEFAULT_BATCH_SIZE = 5;
const MAX_CONCURRENT_BATCHES = 2;

// ============================================================================
// Interfaces
// ============================================================================

export interface AIScoreOptions {
  translate?: boolean;  // Translate English tweets to Chinese
  batchSize?: number;   // Number of tweets per API call (default: 5)
}

export interface AIScoreResult {
  innovation: number;        // 1-5 整数
  innovationComment: string; // 一句话评语
  practicality: number;      // 1-5 整数
  practicalityComment: string;
  influence: number;         // 1-5 整数
  influenceComment: string;
  category: string;          // 分类标签: ai-tools | industry-news | tech-breakthroughs | tutorials | controversial | other
  tags: string[];            // 保留原有 tags
  title?: string;            // AI 生成的选题标题（突出核心内容）
  summary?: string;          // 保留中文摘要
  translation?: string;      // 英文原文的中文翻译（仅当原文包含英文时）
}

export interface AIScoredTweet {
  // Original tweet fields
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
  
  // AI analysis
  aiScore: AIScoreResult;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

interface BatchAnalysisResult {
  results: Array<{
    index: number;
    innovation: number;
    innovationComment: string;
    practicality: number;
    practicalityComment: string;
    influence: number;
    influenceComment: string;
    category: string;
    tags: string[];
    title?: string;
    summary?: string;
    translation?: string;
  }>;
}

// ============================================================================
// Gemini API Client
// ============================================================================

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { 
        temperature: 0.3,
        topP: 0.8,
        topK: 40,
      }
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }
  
  const data = await response.json() as GeminiResponse;
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ============================================================================
// Prompt Construction
// ============================================================================

function buildScoringPrompt(tweets: Array<{ index: number; text: string; authorUsername: string }>, translate: boolean): string {
  const tweetsList = tweets.map(t => 
    `Index ${t.index}: @${t.authorUsername}\n${t.text}`
  ).join('\n\n---\n\n');

  return `你是一个推特内容分析专家，正在为一篇面向**普通用户**（非开发者）的 AI 资讯公众号筛选选题素材。

请对以下推特内容进行三个维度的评分（1-5 整数，5 分最高）并提供一句话评语（中文）：

## 评分维度与标准

### 1. 创新性 (innovation) - 综合评估时效性、思想性、应用创新

**5分 - 重大突破**：
- 首发/独家新闻：新产品发布、重大更新、技术突破的第一手报道
- 颠覆性观点：挑战主流认知、提出全新理论框架
- 开创性应用：前所未见的工具使用方式或组合

**4分 - 显著创新**：
- 较早报道重要新闻（非首发但时效性强）
- 独到的深度分析，提供新视角
- 巧妙的工具应用技巧，有明显创意

**3分 - 有一定新意**：
- 常规新闻报道，时效性一般
- 观点有价值但非原创
- 应用方法实用但较常见

**2分 - 新意有限**：
- 旧闻重提或二手信息
- 观点老生常谈
- 方法已被广泛使用

**1分 - 无创新价值**：
- 过时信息或重复内容
- 无独立观点，纯转发
- 无任何新颖之处

### 2. 实用性 (practicality) - 从普通用户角度评估，关注易用性和即时价值

**5分 - 即学即用**：
- 普通用户可直接使用，无需技术背景
- 解决日常痛点，效果立竿见影
- 步骤清晰，工具免费或低成本

**4分 - 容易上手**：
- 稍加学习即可使用
- 对工作/生活有明显帮助
- 门槛较低，大部分人可尝试

**3分 - 有参考价值**：
- 需要一定学习成本
- 对特定场景有帮助
- 普通用户可能需要简化后使用

**2分 - 实用性有限**：
- 需要专业知识或技术背景
- 使用场景较窄
- 普通用户难以直接应用

**1分 - 不具实用性**：
- 纯理论讨论，无法落地
- 仅对专业开发者有价值
- 普通用户完全无法使用

### 3. 影响力 (influence) - 评估话题本身的行业重要性，权威来源加分

**5分 - 行业重大事件**：
- 官方来源：OpenAI/Anthropic/Google/Meta/Microsoft 等 AI 巨头的官方发布
- 改变行业格局的重大新闻
- 广泛讨论的热点话题

**4分 - 重要行业动态**：
- 知名公司/产品的重要更新
- 有影响力的行业分析报告
- 引发广泛讨论的话题

**3分 - 值得关注**：
- 中等规模公司的产品更新
- 有一定影响的行业讨论
- 特定领域的重要信息

**2分 - 影响有限**：
- 小众产品或服务
- 讨论范围较窄
- 行业关注度低

**1分 - 无行业影响**：
- 个人项目或实验
- 无人讨论的话题
- 与行业发展无关

## 内容分类

请从以下选项中选择一个最合适的：
- ai-tools (AI 工具)
- industry-news (行业新闻)
- tech-breakthroughs (技术突破)
- tutorials (教程指南)
- controversial (争议话题)
- other (其他)

## 必须提供的内容

1. **title**: 为每条推文生成一个吸引人的中文选题标题（15-30字），突出核心内容和价值点，可以带有话题感或争议性
2. **summary**: 1-2 句简洁的中文内容摘要
3. **translation**: 如果原文包含英文内容，请提供完整的中文翻译；如果原文全是中文则留空

## 待分析推特

${tweetsList}

请严格按 JSON 格式返回，不要包含 markdown 代码块或其他文字：
{
  "results": [
    {
      "index": 0,
      "innovation": 5,
      "innovationComment": "评语...",
      "practicality": 4,
      "practicalityComment": "评语...",
      "influence": 3,
      "influenceComment": "评语...",
      "category": "ai-tools",
      "tags": ["标签1", "标签2"],
      "title": "吸引人的选题标题",
      "summary": "中文摘要",
      "translation": "完整中文翻译（如果原文有英文）"
    }
  ]
}`;
}
// ============================================================================
// Scoring Logic
// ============================================================================

function createDefaultScore(): AIScoreResult {
  return {
    innovation: 1,
    innovationComment: '',
    practicality: 1,
    practicalityComment: '',
    influence: 1,
    influenceComment: '',
    category: 'other',
    tags: [],
    title: undefined,
    summary: undefined,
    translation: undefined,
  };
}

async function scoreBatch(
  tweets: Array<{ index: number; text: string; authorUsername: string }>,
  apiKey: string,
  translate: boolean
): Promise<Map<number, AIScoreResult>> {
  const scores = new Map<number, AIScoreResult>();
  
  try {
    const prompt = buildScoringPrompt(tweets, translate);
    const responseText = await callGemini(prompt, apiKey);
    
    // Parse JSON response (strip markdown code blocks if present)
    let jsonText = responseText.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    
    const parsed = JSON.parse(jsonText) as BatchAnalysisResult;
    
    if (parsed.results && Array.isArray(parsed.results)) {
      for (const result of parsed.results) {
        const clamp = (v: number) => Math.min(5, Math.max(1, Math.round(v)));
        
        scores.set(result.index, {
          innovation: clamp(result.innovation),
          innovationComment: result.innovationComment || '',
          practicality: clamp(result.practicality),
          practicalityComment: result.practicalityComment || '',
          influence: clamp(result.influence),
          influenceComment: result.influenceComment || '',
          category: result.category || 'other',
          tags: result.tags || [],
          title: result.title,
          summary: result.summary,
          translation: result.translation,
        });
      }
    }
  } catch (error) {
    console.warn(`[ai-scorer] Batch scoring failed: ${error instanceof Error ? error.message : String(error)}`);
    // Return defaults for all tweets in batch
    for (const tweet of tweets) {
      scores.set(tweet.index, createDefaultScore());
    }
  }
  
  return scores;
}

// ============================================================================
// Main Export
// ============================================================================

export async function scoreTweetsWithAI(
  tweets: Array<{ text: string; authorUsername: string; authorDisplayName: string; likes: number; retweets: number; replies: number; views: number; time: string; url: string; isRetweet: boolean }>,
  options: AIScoreOptions = {}
): Promise<AIScoredTweet[]> {
  const { translate = false, batchSize = DEFAULT_BATCH_SIZE } = options;
  
  // Check for API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[ai-scorer] GEMINI_API_KEY not set. Returning default scores.');
    return tweets.map(tweet => ({
      ...tweet,
      aiScore: createDefaultScore(),
    }));
  }
  
  console.log(`[ai-scorer] Scoring ${tweets.length} tweets with Gemini API (batch size: ${batchSize})`);
  
  // Create indexed tweets for batch processing
  const indexedTweets = tweets.map((tweet, index) => ({
    index,
    text: tweet.text,
    authorUsername: tweet.authorUsername,
  }));
  
  // Split into batches
  const batches: Array<Array<{ index: number; text: string; authorUsername: string }>> = [];
  for (let i = 0; i < indexedTweets.length; i += batchSize) {
    batches.push(indexedTweets.slice(i, i + batchSize));
  }
  
  console.log(`[ai-scorer] Processing ${batches.length} batches (max ${MAX_CONCURRENT_BATCHES} concurrent)`);
  
  // Process batches with concurrency limit
  const allScores = new Map<number, AIScoreResult>();
  
  for (let i = 0; i < batches.length; i += MAX_CONCURRENT_BATCHES) {
    const batchGroup = batches.slice(i, i + MAX_CONCURRENT_BATCHES);
    const promises = batchGroup.map(batch => scoreBatch(batch, apiKey, translate));
    
    const results = await Promise.all(promises);
    
    // Merge results
    for (const batchScores of results) {
      for (const entry of Array.from(batchScores.entries())) {
        allScores.set(entry[0], entry[1]);
      }
    }
    
    console.log(`[ai-scorer] Completed ${Math.min(i + MAX_CONCURRENT_BATCHES, batches.length)}/${batches.length} batches`);
  }
  
  // Combine original tweets with AI scores
  return tweets.map((tweet, index) => ({
    ...tweet,
    aiScore: allScores.get(index) || createDefaultScore(),
  }));
}

// ============================================================================
// Utility Exports
// ============================================================================

export function isApiKeyConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}
