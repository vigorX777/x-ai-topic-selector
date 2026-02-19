import * as process from 'node:process';

export interface AIClient {
  generate(prompt: string): Promise<string>;
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

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';

export class GeminiClient implements AIClient {
  private model: string;

  constructor(private apiKey: string, model?: string) {
    this.model = model || DEFAULT_GEMINI_MODEL;
  }

  async generate(prompt: string): Promise<string> {
    const url = `${GEMINI_API_BASE}/${this.model}:generateContent`;
    const response = await fetch(`${url}?key=${this.apiKey}`, {
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
}

export class OpenAICompatibleClient implements AIClient {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(options: { apiKey: string; baseUrl: string; model: string }) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl.endsWith('/') ? options.baseUrl.slice(0, -1) : options.baseUrl;
    this.model = options.model;
  }

  async generate(prompt: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }
}

export function createAIClient(options?: { provider?: 'gemini' | 'openai' }): AIClient | null {
  const provider = options?.provider;

  if (provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set');
    }
    const model = process.env.GEMINI_MODEL;
    return new GeminiClient(apiKey, model);
  }

  if (provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    if (!model) {
      throw new Error('OPENAI_MODEL is not set');
    }
    const baseUrl = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
    return new OpenAICompatibleClient({ apiKey, baseUrl, model });
  }

  if (process.env.GEMINI_API_KEY) {
    const model = process.env.GEMINI_MODEL;
    return new GeminiClient(process.env.GEMINI_API_KEY, model);
  }

  if (process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL) {
    const baseUrl = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
    return new OpenAICompatibleClient({ 
      apiKey: process.env.OPENAI_API_KEY, 
      baseUrl, 
      model: process.env.OPENAI_MODEL 
    });
  }

  return null;
}

export function isAIProviderAvailable(provider?: string): boolean {
  if (provider === 'gemini') {
    return !!process.env.GEMINI_API_KEY;
  }
  if (provider === 'openai') {
    return !!process.env.OPENAI_API_KEY && !!process.env.OPENAI_MODEL;
  }
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY && !!process.env.OPENAI_MODEL;
  return hasGemini || hasOpenAI;
}
