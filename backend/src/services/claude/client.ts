import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const MODEL = 'claude-sonnet-4-6';

export interface ClaudeCallOptions {
  system: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
}

export async function callClaude(options: ClaudeCallOptions): Promise<string> {
  const { system, userMessage, temperature = 0.3, maxTokens = 4096 } = options;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: userMessage }],
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude');
  return content.text;
}

export async function callClaudeJson<T>(options: ClaudeCallOptions): Promise<T> {
  const text = await callClaude(options);

  // Strip markdown code fences if present
  const cleaned = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch (firstError) {
    // Retry with explicit instruction
    console.warn('JSON parse failed, retrying with explicit schema reminder');
    const retryText = await callClaude({
      ...options,
      userMessage: options.userMessage + '\n\nIMPORTANT: Your response must be ONLY valid JSON with no markdown, no explanation, no code fences.',
    });
    const retrycleaned = retryText.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
    return JSON.parse(retrycleaned) as T;
  }
}

export default client;
