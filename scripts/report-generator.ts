import type { AIScoredTweet } from './ai-scorer.js';

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

interface ScoredTweet extends Tweet {
  dataScore: number;
  totalScore: number;
  aiScore?: AIScoredTweet['aiScore'];
}

interface ReportOptions {
  scoreMode: string;
  totalTweets: number;
  filteredTweets: number;
  topicCategory?: string;
  allTweets?: ScoredTweet[];
}

const CATEGORY_DISPLAY: Record<string, string> = {
  'ai-tools': 'AI 工具',
  'industry-news': '行业新闻',
  'tech-breakthroughs': '技术突破',
  'tutorials': '教程指南',
  'controversial': '争议话题',
  'other': '其他',
};

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used',
  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
  'through', 'during', 'before', 'after', 'above', 'below', 'between',
  'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither',
  'not', 'only', 'own', 'same', 'than', 'too', 'very', 'just', 'also',
  'this', 'that', 'these', 'those', 'it', 'its', 'they', 'their', 'them',
  'we', 'our', 'us', 'you', 'your', 'he', 'his', 'him', 'she', 'her',
  'i', 'my', 'me', 'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'how',
  'all', 'each', 'every', 'any', 'some', 'no', 'none', 'one', 'two', 'more',
  'most', 'other', 'another', 'such', 'much', 'many', 'few', 'little', 'less',
  'new', 'get', 'got', 'like', 'make', 'made', 'use', 'using', 'now', 'even',
  'still', 'already', 'about', 'over', 'out', 'up', 'down', 'here', 'there',
  'then', 'first', 'last', 'next', 'want', 'see', 'look', 'think', 'know',
  'come', 'go', 'take', 'give', 'find', 'tell', 'say', 'said', 'way', 'time',
  'year', 'day', 'thing', 'man', 'world', 'life', 'hand', 'part', 'place',
  'case', 'week', 'work', 'fact', 'being', 'issue', 'point', 'something',
  '的', '是', '在', '了', '和', '有', '这', '我', '你', '他', '她', '它',
  '们', '个', '上', '下', '不', '与', '也', '就', '都', '而', '及', '或',
  '但', '如', '果', '等', '着', '被', '到', '把', '让', '给', '从', '向',
  '对', '为', '以', '于', '很', '更', '最', '还', '会', '能', '可', '要',
  '想', '看', '说', '做', '去', '来', '没', '好', '多', '大', '小', '中',
  'https', 'http', 'www', 'com', 'co', 'amp', 'rt', 'via',
]);

function extractKeywords(tweets: ScoredTweet[]): Map<string, number> {
  const wordCount = new Map<string, number>();
  
  for (const tweet of tweets) {
    const text = tweet.text.toLowerCase();
    const words = text.match(/[a-z]{3,}|[\u4e00-\u9fff]{2,}/g) || [];
    
    for (const word of words) {
      if (STOP_WORDS.has(word)) continue;
      if (/^\d+$/.test(word)) continue;
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    }
    
    if (tweet.aiScore?.tags) {
      for (const tag of tweet.aiScore.tags) {
        const normalizedTag = tag.toLowerCase().trim();
        if (normalizedTag.length >= 2) {
          wordCount.set(normalizedTag, (wordCount.get(normalizedTag) || 0) + 2);
        }
      }
    }
  }
  
  return wordCount;
}

function generateKeywordChart(tweets: ScoredTweet[]): string {
  const wordCount = extractKeywords(tweets);
  
  const topKeywords = Array.from(wordCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  if (topKeywords.length === 0) return '';
  
  let section = `## 📊 关键词词频统计\n\n`;
  
  section += '```mermaid\n';
  section += 'xychart-beta\n';
  section += '    title "Top 10 高频关键词"\n';
  section += `    x-axis [${topKeywords.map(([word]) => `"${word}"`).join(', ')}]\n`;
  section += `    y-axis "出现次数" 0 --> ${Math.max(...topKeywords.map(([, count]) => count)) + 2}\n`;
  section += `    bar [${topKeywords.map(([, count]) => count).join(', ')}]\n`;
  section += '```\n\n';
  
  section += '| 关键词 | 出现次数 |\n';
  section += '|--------|----------|\n';
  for (const [word, count] of topKeywords) {
    section += `| ${word} | ${count} |\n`;
  }
  section += '\n---\n\n';
  
  return section;
}

function generateEngagementTop3(tweets: ScoredTweet[]): string {
  const sorted = [...tweets].sort((a, b) => {
    const engagementA = a.likes + a.retweets + a.replies;
    const engagementB = b.likes + b.retweets + b.replies;
    return engagementB - engagementA;
  }).slice(0, 3);
  
  if (sorted.length === 0) return '';
  
  let section = `## 🔥 互动热度 Top 3\n\n`;
  section += `| 排名 | 作者 | 互动总量 | 内容预览 | 链接 |\n`;
  section += `|------|------|----------|----------|------|\n`;
  
  sorted.forEach((tweet, index) => {
    const engagement = tweet.likes + tweet.retweets + tweet.replies;
    const preview = (tweet.aiScore?.title || tweet.aiScore?.summary || tweet.text).slice(0, 40).replace(/\n/g, ' ') + '...';
    section += `| ${index + 1} | @${tweet.authorUsername} | ${engagement.toLocaleString()} | ${preview} | [🔗](${tweet.url}) |\n`;
  });
  
  section += `\n---\n\n`;
  return section;
}

function hasEnglishContent(text: string): boolean {
  const englishWords = text.match(/[a-zA-Z]{4,}/g) || [];
  return englishWords.length >= 3;
}

export function generateReport(tweets: ScoredTweet[], options: ReportOptions): string {
  const now = new Date().toISOString().split('T')[0];
  const topN = tweets.length;
  
  let report = `# AI 选题报告 - ${now}\n\n`;
  
  report += `## 摘要\n`;
  report += `- **扫描推文**: ${options.totalTweets}\n`;
  report += `- **筛选后**: ${options.filteredTweets}\n`;
  if (options.topicCategory && options.topicCategory !== 'all') {
    report += `- **选题范围**: ${CATEGORY_DISPLAY[options.topicCategory] || options.topicCategory}\n`;
  }
  report += `- **推荐选题**: ${topN}\n\n`;
  
  report += `---\n\n`;
  
  const engagementSource = options.allTweets || tweets;
  report += generateEngagementTop3(engagementSource);
  
  report += generateKeywordChart(engagementSource);
  
  report += `## Top ${topN} 选题推荐\n\n`;
  
  tweets.forEach((tweet, index) => {
    const title = tweet.aiScore?.title 
      || tweet.aiScore?.summary?.slice(0, 50)
      || tweet.text.slice(0, 50).replace(/\n/g, ' ');
    
    const categoryDisplay = tweet.aiScore?.category 
      ? CATEGORY_DISPLAY[tweet.aiScore.category] || tweet.aiScore.category
      : '未分类';
      
    report += `### ${index + 1}. ${title}\n\n`;
    report += `**作者**: @${tweet.authorUsername} (${tweet.authorDisplayName}) | **分类**: ${categoryDisplay}\n\n`;
    
    if (tweet.aiScore) {
      report += `**AI 评分**: ${tweet.totalScore}/15\n`;
      report += `- 🎯 创新性: ${tweet.aiScore.innovation}/5 - ${tweet.aiScore.innovationComment || '暂无评语'}\n`;
      report += `- 💡 实用性: ${tweet.aiScore.practicality}/5 - ${tweet.aiScore.practicalityComment || '暂无评语'}\n`;
      report += `- 📈 影响力: ${tweet.aiScore.influence}/5 - ${tweet.aiScore.influenceComment || '暂无评语'}\n\n`;
    }
    
    if (tweet.aiScore?.summary) {
      report += `**AI 摘要**:\n> ${tweet.aiScore.summary}\n\n`;
    }
    
    report += `**原文内容**:\n`;
    const fullText = tweet.text.split('\n').map(line => `> ${line}`).join('\n');
    report += `${fullText}\n\n`;
    
    if (tweet.aiScore?.translation && hasEnglishContent(tweet.text)) {
      report += `**中文翻译**:\n`;
      const translationText = tweet.aiScore.translation.split('\n').map(line => `> ${line}`).join('\n');
      report += `${translationText}\n\n`;
    }
    
    report += `**互动数据**: ❤️ ${tweet.likes.toLocaleString()} | 🔄 ${tweet.retweets.toLocaleString()} | 💬 ${tweet.replies.toLocaleString()} | 👀 ${tweet.views.toLocaleString()}\n`;
    report += `**发布时间**: ${tweet.time} | 🔗 [查看原帖](${tweet.url})\n`;
    
    const tags = [];
    tags.push(tweet.isRetweet ? "转发" : "原创");
    if (tweet.isThread && tweet.threadLength > 1) {
      tags.push(`📜 Thread (${tweet.threadLength} 条)`);
    }
    if (tweet.aiScore?.tags?.length) {
      tags.push(...tweet.aiScore.tags);
    }
    report += `**标签**: ${tags.join(' | ')}\n\n`;
    
    report += `---\n\n`;
  });
  
  return report;
}
