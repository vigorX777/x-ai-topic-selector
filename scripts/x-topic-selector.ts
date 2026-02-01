import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import process from 'node:process';
import {
  CHROME_CANDIDATES_FULL,
  CdpConnection,
  findChromeExecutable,
  getDefaultProfileDir,
  getFreePort,
  sleep,
  waitForChromeDebugPort,
} from './x-utils.js';
import { scoreTweetsWithAI, isApiKeyConfigured, type AIScoredTweet } from './ai-scorer.js';
import { generateReport } from './report-generator.js';

// Parallel thread expansion settings
const THREAD_EXPANSION_CONCURRENCY = 3;

// DOM Selectors (Twitter's data-testid attributes)
const SELECTORS = {
  TWEET: '[data-testid="tweet"]',
  TWEET_TEXT: '[data-testid="tweetText"]',
  USER_NAME: '[data-testid="User-Name"]',
  LIKE_BUTTON: '[data-testid="like"]',
  RETWEET_BUTTON: '[data-testid="retweet"]',
  REPLY_BUTTON: '[data-testid="reply"]',
  ANALYTICS_BUTTON: '[aria-label*="View post analytics"]',
  TWEET_TIME: 'time',
} as const;

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
  isThread: boolean;
  threadLength: number;
}

interface ScoringOptions {
  scoreMode: 'data-only' | 'ai-only';
  topicCategory: string;
  keywords: string[];
  exclude: string[];
  topN: number;
}

interface ScoredTweet extends Tweet {
  dataScore: number;
  totalScore: number;
  aiScore?: AIScoredTweet['aiScore'];
}

interface TopicSelectorOptions {
  sourceUrl: string;
  maxTweets?: number;
  dryRun?: boolean;
  timeoutMs?: number;
  profileDir?: string;
  chromePath?: string;
}

function calculateDataScore(tweet: Tweet, maxRawScore: number): number {
  if (maxRawScore === 0) return 0;
  const rawScore = tweet.likes + (tweet.retweets * 3) + (tweet.replies * 2) + (tweet.views * 0.01);
  return rawScore / maxRawScore;
}

function calculateTotalScore(
  tweet: ScoredTweet, 
  options: ScoringOptions
): number {
  if (options.scoreMode === 'data-only') {
    return 3 + (tweet.dataScore * 12);
  }
  const aiScore = tweet.aiScore;
  if (aiScore) {
    return aiScore.innovation + aiScore.practicality + aiScore.influence;
  }
  return 3;
}

function filterByCategory(tweets: ScoredTweet[], category: string): ScoredTweet[] {
  if (category === 'all') return tweets;
  return tweets.filter(t => t.aiScore?.category === category);
}

function filterAndScoreTweets(tweets: Tweet[], options: ScoringOptions): ScoredTweet[] {
  let filtered = tweets;
  
  if (options.keywords.length > 0) {
    filtered = filtered.filter(t => 
      options.keywords.some(kw => t.text.toLowerCase().includes(kw.toLowerCase()))
    );
  }
  
  if (options.exclude.length > 0) {
    filtered = filtered.filter(t => 
      !options.exclude.some(ex => t.text.toLowerCase().includes(ex.toLowerCase()))
    );
  }
  
  const rawScores = filtered.map(t => t.likes + (t.retweets * 3) + (t.replies * 2) + (t.views * 0.01));
  const maxRawScore = rawScores.length > 0 ? Math.max(...rawScores) : 0;
  
  let scored: ScoredTweet[] = filtered.map(tweet => {
    const dataScore = calculateDataScore(tweet, maxRawScore);
    
    const partialScored = {
      ...tweet,
      dataScore,
      totalScore: 0
    } as ScoredTweet;

    partialScored.totalScore = calculateTotalScore(partialScored, options);
    
    return partialScored;
  });

  scored = filterByCategory(scored, options.topicCategory);
  
  return scored.sort((a, b) => b.totalScore - a.totalScore).slice(0, options.topN);
}

type SourceType = 'list' | 'home' | 'bookmarks';

interface ParsedSource {
  type: SourceType;
  url: string;
  displayName: string;
}

function parseSourceUrl(input: string): ParsedSource {
  const trimmed = input.trim();
  
  // List: numeric ID or full URL
  if (/^\d+$/.test(trimmed)) {
    return { 
      type: 'list', 
      url: `https://x.com/i/lists/${trimmed}`,
      displayName: `List ${trimmed}`
    };
  }
  
  // List URL
  const listMatch = trimmed.match(/lists\/(\d+)/);
  if (listMatch?.[1]) {
    return { 
      type: 'list', 
      url: `https://x.com/i/lists/${listMatch[1]}`,
      displayName: `List ${listMatch[1]}`
    };
  }
  
  
  // Home (For You)
  if (trimmed.includes('/home') || trimmed === 'home') {
    return { 
      type: 'home', 
      url: 'https://x.com/home',
      displayName: 'For You'
    };
  }
  
  // Bookmarks
  if (trimmed.includes('/bookmarks') || trimmed === 'bookmarks') {
    return { 
      type: 'bookmarks', 
      url: 'https://x.com/i/bookmarks',
      displayName: 'Bookmarks'
    };
  }
  
  throw new Error(`Invalid source URL. Supported formats:
  - List: https://x.com/i/lists/123456 or numeric ID
  - For You: https://x.com/home
  - Bookmarks: https://x.com/i/bookmarks`);
}

async function expandThread(
  cdp: CdpConnection, 
  sessionId: string, 
  tweetUrl: string,
  authorUsername: string
): Promise<{ texts: string[]; success: boolean }> {
  try {
    await cdp.send('Page.navigate', { url: tweetUrl }, { sessionId });
    await sleep(3000);
    
    const result = await cdp.send<{ result: { value: string[] } }>('Runtime.evaluate', {
      expression: `
        (() => {
          const texts = [];
          const tweets = document.querySelectorAll('[data-testid="tweet"]');
          const targetAuthor = "${authorUsername}";
          
          for (const tweet of tweets) {
            const userLink = tweet.querySelector('[data-testid="User-Name"] a[href^="/"]');
            const username = userLink?.getAttribute('href')?.slice(1)?.split('/')[0];
            
            if (username === targetAuthor) {
              const textEl = tweet.querySelector('[data-testid="tweetText"]');
              if (textEl) {
                texts.push(textEl.innerText.trim());
              }
            }
          }
          return texts;
        })()
      `,
      returnByValue: true,
    }, { sessionId });
    
    return { texts: result.result.value || [], success: true };
  } catch (error) {
    console.warn(`[x-topic-selector] Failed to expand thread: ${tweetUrl}`);
    return { texts: [], success: false };
  }
}

async function expandThreadsInParallel(
  cdp: CdpConnection,
  tweets: Tweet[],
  mainSessionId: string
): Promise<void> {
  if (tweets.length === 0) return;
  
  const concurrency = THREAD_EXPANSION_CONCURRENCY;
  console.log(`[x-topic-selector] Expanding ${tweets.length} threads (concurrency: ${concurrency})`);
  
  const failed: Tweet[] = [];
  
  for (let i = 0; i < tweets.length; i += concurrency) {
    const batch = tweets.slice(i, i + concurrency);
    
    const promises = batch.map(async (tweet) => {
      let targetId: string | null = null;
      try {
        const target = await cdp.send<{ targetId: string }>('Target.createTarget', { 
          url: tweet.url 
        });
        targetId = target.targetId;
        
        const { sessionId } = await cdp.send<{ sessionId: string }>('Target.attachToTarget', { 
          targetId, 
          flatten: true 
        });
        
        await sleep(2500);
        
        const result = await cdp.send<{ result: { value: string[] } }>('Runtime.evaluate', {
          expression: `
            (() => {
              const texts = [];
              const tweets = document.querySelectorAll('[data-testid="tweet"]');
              const targetAuthor = "${tweet.authorUsername}";
              
              for (const t of tweets) {
                const userLink = t.querySelector('[data-testid="User-Name"] a[href^="/"]');
                const username = userLink?.getAttribute('href')?.slice(1)?.split('/')[0];
                
                if (username === targetAuthor) {
                  const textEl = t.querySelector('[data-testid="tweetText"]');
                  if (textEl) texts.push(textEl.innerText.trim());
                }
              }
              return texts;
            })()
          `,
          returnByValue: true,
        }, { sessionId });
        
        const texts = result.result.value || [];
        if (texts.length > 1) {
          tweet.text = texts.join('\n\n---\n\n');
          tweet.isThread = true;
          tweet.threadLength = texts.length;
          console.log(`[x-topic-selector] ✓ Thread @${tweet.authorUsername}: ${texts.length} parts`);
        }
        
        return { success: true };
      } catch (error) {
        console.warn(`[x-topic-selector] ✗ Failed: @${tweet.authorUsername}`);
        failed.push(tweet);
        return { success: false };
      } finally {
        if (targetId) {
          try {
            await cdp.send('Target.closeTarget', { targetId });
          } catch {}
        }
      }
    });
    
    await Promise.allSettled(promises);
    console.log(`[x-topic-selector] Batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(tweets.length / concurrency)} complete`);
  }
  
  if (failed.length > 0) {
    console.log(`[x-topic-selector] Retrying ${failed.length} failed threads...`);
    for (const tweet of failed) {
      const result = await expandThread(cdp, mainSessionId, tweet.url, tweet.authorUsername);
      if (result.success && result.texts.length > 1) {
        tweet.text = result.texts.join('\n\n---\n\n');
        tweet.isThread = true;
        tweet.threadLength = result.texts.length;
        console.log(`[x-topic-selector] ✓ Retry success: @${tweet.authorUsername}`);
      }
    }
  }
}

async function expandTruncatedTweets(
  cdp: CdpConnection,
  tweets: Tweet[],
  mainSessionId: string
): Promise<void> {
  if (tweets.length === 0) return;
  
  const concurrency = THREAD_EXPANSION_CONCURRENCY;
  console.log(`[x-topic-selector] Expanding ${tweets.length} truncated tweets (concurrency: ${concurrency})`);
  
  for (let i = 0; i < tweets.length; i += concurrency) {
    const batch = tweets.slice(i, i + concurrency);
    
    const promises = batch.map(async (tweet) => {
      let targetId: string | null = null;
      try {
        const target = await cdp.send<{ targetId: string }>('Target.createTarget', { 
          url: tweet.url 
        });
        targetId = target.targetId;
        
        const { sessionId } = await cdp.send<{ sessionId: string }>('Target.attachToTarget', { 
          targetId, 
          flatten: true 
        });
        
        await sleep(2500);
        
        const result = await cdp.send<{ result: { value: string } }>('Runtime.evaluate', {
          expression: `
            (() => {
              const tweets = document.querySelectorAll('[data-testid="tweet"]');
              for (const t of tweets) {
                const textEl = t.querySelector('[data-testid="tweetText"]');
                if (textEl) {
                  return textEl.innerText.trim();
                }
              }
              return '';
            })()
          `,
          returnByValue: true,
        }, { sessionId });
        
        const fullText = result.result.value || '';
        if (fullText && fullText.length > tweet.text.length - 5) {
          tweet.text = fullText;
          console.log(`[x-topic-selector] ✓ Expanded: @${tweet.authorUsername} (${fullText.length} chars)`);
        }
        
        return { success: true };
      } catch (error) {
        console.warn(`[x-topic-selector] ✗ Failed to expand: @${tweet.authorUsername}`);
        return { success: false };
      } finally {
        if (targetId) {
          try {
            await cdp.send('Target.closeTarget', { targetId });
          } catch {}
        }
      }
    });
    
    await Promise.allSettled(promises);
  }
}

export async function scrapeTweets(options: TopicSelectorOptions): Promise<Tweet[]> {
  const { 
    sourceUrl, 
    maxTweets = 50, 
    dryRun = false,
    timeoutMs = 120_000, 
    profileDir = getDefaultProfileDir() 
  } = options;

  const source = parseSourceUrl(sourceUrl);
  const fullUrl = source.url;

  const chromePath = options.chromePath ?? findChromeExecutable(CHROME_CANDIDATES_FULL);
  if (!chromePath) throw new Error('Chrome not found. Set X_BROWSER_CHROME_PATH env var.');

  await mkdir(profileDir, { recursive: true });

  const port = await getFreePort();
  console.log(`[x-topic-selector] Launching Chrome (profile: ${profileDir})`);
  console.log(`[x-topic-selector] Target: ${source.displayName} (${fullUrl})`);

  // For non-list sources (home/bookmarks), start with x.com first
  // then navigate via CDP to avoid redirect issues
  const needsNavigation = source.type !== 'list';
  const initialUrl = needsNavigation ? 'https://x.com' : fullUrl;

  const chrome = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-blink-features=AutomationControlled',
    '--start-maximized',
    initialUrl,
  ], { stdio: 'ignore' });

  let cdp: CdpConnection | null = null;

  try {
    const wsUrl = await waitForChromeDebugPort(port, 30_000, { includeLastError: true });
    cdp = await CdpConnection.connect(wsUrl, 30_000, { defaultTimeoutMs: 15_000 });

    const targets = await cdp.send<{ targetInfos: Array<{ targetId: string; url: string; type: string }> }>('Target.getTargets');
    let pageTarget = targets.targetInfos.find((t) => t.type === 'page' && t.url.includes('x.com'));

    if (!pageTarget) {
      const { targetId } = await cdp.send<{ targetId: string }>('Target.createTarget', { url: fullUrl });
      pageTarget = { targetId, url: fullUrl, type: 'page' };
    }

    const { sessionId } = await cdp.send<{ sessionId: string }>('Target.attachToTarget', { targetId: pageTarget.targetId, flatten: true });

    await cdp.send('Page.enable', {}, { sessionId });
    await cdp.send('Runtime.enable', {}, { sessionId });

    if (needsNavigation) {
      console.log(`[x-topic-selector] Navigating to ${fullUrl}...`);
      await sleep(2000);
      await cdp.send('Page.navigate', { url: fullUrl }, { sessionId });
      await sleep(3000);
    }

    console.log('[x-topic-selector] Waiting for tweets to load...');
    await sleep(3000);

    // Wait for tweets to appear
    const waitForTweets = async (): Promise<boolean> => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const result = await cdp!.send<{ result: { value: { found: boolean; hasContent: boolean; count: number } } }>('Runtime.evaluate', {
          expression: `
          (() => {
            const tweets = document.querySelectorAll('[data-testid="tweet"]');
            const firstText = tweets[0]?.querySelector('[data-testid="tweetText"]')?.textContent || '';
            const firstUrl = tweets[0]?.querySelector('time')?.closest('a')?.href || '';
            return {
              found: tweets.length > 0,
              hasContent: !!(firstText || firstUrl),
              count: tweets.length
            };
          })()
          `,
          returnByValue: true,
        }, { sessionId });
        const val = result.result.value;
        if (val.found && val.hasContent) {
          console.log(`[x-topic-selector] Found ${val.count} tweets with content`);
          return true;
        }
        if (val.found && !val.hasContent) {
          console.log(`[x-topic-selector] Found ${val.count} tweet elements, waiting for content...`);
        }
        await sleep(1000);
      }
      return false;
    };

    const tweetsFound = await waitForTweets();
    if (!tweetsFound) {
      console.log('[x-topic-selector] No tweets found. Please log in to X in the browser window.');
      console.log('[x-topic-selector] Waiting for login...');
      const loggedIn = await waitForTweets();
      if (!loggedIn) throw new Error('Timed out waiting for tweets. Please log in first.');
    }

    console.log(`[x-topic-selector] Loading tweets (target: ${maxTweets})...`);

    let stableCount = 0;
    const maxStableIterations = 5;
    const collectedTweets = new Map<string, Tweet>();
    let emptyViewRetries = 0;
    const maxEmptyViewRetries = 10;

    while (collectedTweets.size < maxTweets) {
      const debugInfo = await cdp.send<{ result: { value: { tweetCount: number; hasContent: boolean; pageUrl: string; bodyText: string } } }>('Runtime.evaluate', {
        expression: `
        (() => {
          const tweets = document.querySelectorAll('[data-testid="tweet"]');
          const firstTweetText = tweets[0]?.querySelector('[data-testid="tweetText"]')?.textContent?.slice(0, 50) || '';
          return {
            tweetCount: tweets.length,
            hasContent: !!firstTweetText,
            pageUrl: window.location.href,
            bodyText: firstTweetText
          };
        })()
        `,
        returnByValue: true,
      }, { sessionId });
      
      const debug = debugInfo?.result?.value;
      if (debug && emptyViewRetries === 0) {
        console.log(`[x-topic-selector] Page state: ${debug.tweetCount} tweet elements, hasContent: ${debug.hasContent}, url: ${debug.pageUrl}`);
        if (debug.bodyText) {
          console.log(`[x-topic-selector] First tweet preview: "${debug.bodyText}..."`);
        }
      }

      const currentViewTweets = await cdp.send<{ result: { value: Tweet[] } }>('Runtime.evaluate', {
        expression: `
        (() => {
          const tweets = [];
          const tweetElements = document.querySelectorAll('[data-testid="tweet"]');
          
          for (const tweetEl of tweetElements) {
            try {
              const textEl = tweetEl.querySelector('[data-testid="tweetText"]');
              let text = textEl ? textEl.textContent.trim() : '';
              
              let authorUsername = '';
              let authorDisplayName = '';
              const userNameEl = tweetEl.querySelector('[data-testid="User-Name"]');
              if (userNameEl) {
                const links = userNameEl.querySelectorAll('a');
                for (const link of links) {
                  const href = link.getAttribute('href');
                  if (href && href.startsWith('/') && !href.includes('/status/')) {
                    authorUsername = href.slice(1).split('/')[0];
                    break;
                  }
                }
                const spans = userNameEl.querySelectorAll('span');
                if (spans.length > 0) {
                  authorDisplayName = spans[0].textContent.trim();
                }
              }
              
              const isRetweet = !!tweetEl.querySelector('[data-testid="socialContext"]');
              
              const getLabelNumber = (el) => {
                if (!el) return 0;
                const label = el.getAttribute('aria-label') || '';
                const match = label.match(/\\d+/);
                return match ? parseInt(match[0], 10) : 0;
              };
              
              const likes = getLabelNumber(tweetEl.querySelector('[data-testid="like"]'));
              const retweets = getLabelNumber(tweetEl.querySelector('[data-testid="retweet"]'));
              const replies = getLabelNumber(tweetEl.querySelector('[data-testid="reply"]'));
              
              let views = 0;
              const actionBar = tweetEl.querySelector('[role="group"]');
              if (actionBar) {
                const allLinks = actionBar.querySelectorAll('a[href*="/analytics"]');
                for (const link of allLinks) {
                  const label = link.getAttribute('aria-label') || '';
                  const match = label.match(/([\\d,\\.]+[KMB]?)/i);
                  if (match) {
                    let numStr = match[1].toUpperCase().replace(/,/g, '');
                    let multiplier = 1;
                    if (numStr.includes('K')) { multiplier = 1000; numStr = numStr.replace('K', ''); }
                    else if (numStr.includes('M')) { multiplier = 1000000; numStr = numStr.replace('M', ''); }
                    views = Math.round(parseFloat(numStr) * multiplier);
                    if (views > 0) break;
                  }
                }
              }
              
              const timeEl = tweetEl.querySelector('time');
              const time = timeEl ? timeEl.getAttribute('datetime') || '' : '';
              
              const timeLink = timeEl?.closest('a');
              const url = timeLink ? 'https://x.com' + timeLink.getAttribute('href') : '';
              
              if (authorUsername || url || text) {
                tweets.push({
                  text: text || '[No text]',
                  authorUsername: authorUsername || 'unknown',
                  authorDisplayName: authorDisplayName || '',
                  likes,
                  retweets,
                  replies,
                  views,
                  time,
                  url,
                  isRetweet,
                  isThread: false,
                  threadLength: 1,
                  isLikelyThread: replies > 0,
                });
              }
            } catch (err) {}
          }
          return tweets;
        })()
        `,
        returnByValue: true,
      }, { sessionId });

      const newTweets = currentViewTweets?.result?.value || [];
      let addedCount = 0;
      
      if (!newTweets || newTweets.length === 0) {
        emptyViewRetries++;
        if (emptyViewRetries >= maxEmptyViewRetries) {
          console.log(`[x-topic-selector] No valid tweets found after ${maxEmptyViewRetries} retries.`);
          console.log('[x-topic-selector] This may indicate: login required, page structure changed, or the list is empty.');
          break;
        }
        console.log(`[x-topic-selector] No tweets in current view (retry ${emptyViewRetries}/${maxEmptyViewRetries}), waiting...`);
        await sleep(3000);
        continue;
      }
      emptyViewRetries = 0;
      
      for (const tweet of newTweets) {
        const key = tweet.url || `${tweet.authorUsername}:${tweet.text.slice(0, 20)}`;
        if (!collectedTweets.has(key)) {
          collectedTweets.set(key, tweet);
          addedCount++;
        }
      }

      console.log(`[x-topic-selector] Collected ${collectedTweets.size} unique tweets (Target: ${maxTweets})...`);

      if (collectedTweets.size >= maxTweets) {
        console.log(`[x-topic-selector] Reached target.`);
        break;
      }

      if (addedCount === 0) {
        stableCount++;
        if (stableCount >= maxStableIterations) {
          console.log(`[x-topic-selector] No new tweets found after ${maxStableIterations} scrolls. Stopping.`);
          break;
        }
      } else {
        stableCount = 0;
      }

      await cdp.send('Runtime.evaluate', {
        expression: 'window.scrollBy(0, window.innerHeight * 2)',
      }, { sessionId });

      await sleep(2000);
    }

    const potentialThreads = Array.from(collectedTweets.values())
      .filter(t => !t.isRetweet && t.url && (t as any).isLikelyThread);
    
    console.log(`[x-topic-selector] Found ${potentialThreads.length} likely Threads out of ${collectedTweets.size} tweets`);
    
    await expandThreadsInParallel(cdp, potentialThreads, sessionId);

    const truncatedTweets = Array.from(collectedTweets.values())
      .filter(t => !t.isRetweet && t.url && t.text.endsWith('[...]') && !t.isThread);
    
    if (truncatedTweets.length > 0) {
      console.log(`[x-topic-selector] Expanding ${truncatedTweets.length} truncated tweets...`);
      await expandTruncatedTweets(cdp, truncatedTweets, sessionId);
    }

    const tweets = Array.from(collectedTweets.values());
    console.log(`[x-topic-selector] Total unique tweets extracted: ${tweets.length}`);

    return tweets;

  } finally {
    if (cdp) {
      try { await cdp.send('Browser.close', {}, { timeoutMs: 5_000 }); } catch {}
      cdp.close();
    }

    setTimeout(() => {
      if (!chrome.killed) try { chrome.kill('SIGKILL'); } catch {}
    }, 2_000).unref?.();
    try { chrome.kill('SIGTERM'); } catch {}
  }
}

function printUsage(): never {
  console.log(`Scrape tweets from a Twitter/X Source
  
  Usage:
    bun scripts/x-topic-selector.ts <source-url> [options]
  
  Arguments:
    <source-url>       Twitter/X source URL. Supported:
                         - List: https://x.com/i/lists/123456 or numeric ID
                         - For You: https://x.com/home  
                         - Bookmarks: https://x.com/i/bookmarks
  
   Options:

    --max-tweets <n>         Maximum number of tweets to scrape (default: 200)
    --topic-category <cat>   Topic category filter: ai-tools, industry-news, tech-breakthroughs, tutorials, controversial, all (default: all)
    --dry-run                Print results and exit
    --profile <dir>          Chrome profile directory
    --output <path>          Output path for the Markdown report
    --help                   Show this help
 
   Scoring Options:
   --score-mode <mode>      Scoring mode: data-only, ai-only (default: data-only)
                            - data-only: 基于互动数据（点赞×1 + 转发×3 + 评论×2 + 浏览×0.01）
                            - ai-only: 基于 AI 分析（创新度 + 影响力 + 实用性，需要 GEMINI_API_KEY）
   --keywords <k1,k2>       Comma-separated keywords to filter tweets
   --exclude <e1,e2>        Comma-separated keywords to exclude tweets
   --top-n <n>              Number of top tweets to return (default: 10)
 
 Examples:
   bun scripts/x-topic-selector.ts "https://x.com/i/lists/1234567890"
   bun scripts/x-topic-selector.ts 1234567890 --dry-run --max-tweets 10
   bun scripts/x-topic-selector.ts 1234567890 --score-mode ai-only --top-n 5
 `);
  process.exit(0);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) printUsage();

  let sourceUrl = '';
  let maxTweets = 200;
  let dryRun = false;
  let profileDir: string | undefined;
  let outputPath: string | undefined;

  const scoringOptions: ScoringOptions = {
    scoreMode: 'data-only',
    topicCategory: 'all',
    keywords: [],
    exclude: [],
    topN: 10,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--max-tweets' && args[i + 1]) {
      maxTweets = parseInt(args[++i]!, 10);
    } else if (arg === '--topic-category' && args[i + 1]) {
      scoringOptions.topicCategory = args[++i]!;
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--profile' && args[i + 1]) {
      profileDir = args[++i];
    } else if (arg === '--output' && args[i + 1]) {
      outputPath = args[++i];
    } else if (arg === '--score-mode' && args[i + 1]) {
      scoringOptions.scoreMode = args[++i] as 'data-only' | 'ai-only';
    } else if (arg === '--keywords' && args[i + 1]) {
      scoringOptions.keywords = args[++i]!.split(',').map(k => k.trim());
    } else if (arg === '--exclude' && args[i + 1]) {
      scoringOptions.exclude = args[++i]!.split(',').map(e => e.trim());
    } else if (arg === '--top-n' && args[i + 1]) {
      scoringOptions.topN = parseInt(args[++i]!, 10);
    } else if (!arg.startsWith('-')) {
      sourceUrl = arg;
    }
  }

  if (!sourceUrl) {
    console.error('Error: Source URL or ID required.');
    printUsage();
  }

  const tweets = await scrapeTweets({ sourceUrl, maxTweets, dryRun, profileDir });
  
  let processedTweets: Tweet[] = tweets;
  if (scoringOptions.scoreMode === 'ai-only') {
    if (!isApiKeyConfigured()) {
      console.warn('[x-topic-selector] GEMINI_API_KEY not set. Falling back to data-only mode.');
      scoringOptions.scoreMode = 'data-only';
    } else {
      console.log('[x-topic-selector] AI scoring enabled, analyzing tweets...');
      processedTweets = await scoreTweetsWithAI(tweets, { translate: true }) as any;
    }
  }

  const scoredTweets = filterAndScoreTweets(processedTweets, scoringOptions);

  if (dryRun) {
    console.log('\n=== SCORED TWEETS (TOP N) ===\n');
    scoredTweets.forEach((tweet, index) => {
      console.log(`${index + 1}. [Score: ${tweet.totalScore.toFixed(2)}] @${tweet.authorUsername} - "${(tweet.aiScore?.summary || tweet.text).slice(0, 100)}..."`);
      console.log(`   DataScore: ${tweet.dataScore.toFixed(2)}`);
      console.log(`   Likes ${tweet.likes} | Retweets ${tweet.retweets} | Replies ${tweet.replies} | Views ${tweet.views.toLocaleString()}`);
      console.log(`   Link: ${tweet.url}\n`);
    });
  } else {
    console.log(`\n=== SCRAPING COMPLETE ===`);
    console.log(`Total tweets scraped: ${tweets.length}`);
    console.log(`Top ${scoredTweets.length} tweets selected.`);
    if (scoredTweets.length > 0) {
      console.log(`Top tweet: [Score: ${scoredTweets[0].totalScore.toFixed(2)}] @${scoredTweets[0].authorUsername}`);
    }

    const report = generateReport(scoredTweets, {
      scoreMode: scoringOptions.scoreMode,
      totalTweets: tweets.length,
      filteredTweets: processedTweets.length,
      topicCategory: scoringOptions.topicCategory,
      allTweets: scoredTweets,
    });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const finalPath = outputPath || `topic-report-${timestamp}.md`;
    
    await writeFile(finalPath, report);
    console.log(`[x-topic-selector] Report saved to: ${finalPath}`);
  }
}


await main().catch((err) => {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
