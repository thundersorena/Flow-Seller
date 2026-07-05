/** Minimal OpenAI Chat Completions client (no SDK dependency). */

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

export const OPENAI_MODEL = 'gpt-4o-mini';

export interface CompletionResult {
  content:     string;
  tokensUsed:  number;
  model:       string;
}

export async function createCompletion(system: string, prompt: string, maxTokens = 2048): Promise<CompletionResult> {
  const apiKey = process.env.API_KEY_OPENAI;
  if (!apiKey) throw new Error('API_KEY_OPENAI is not set');

  const res = await fetch(OPENAI_ENDPOINT, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      Authorization:   `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model:      OPENAI_MODEL,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`OpenAI request failed (${res.status}): ${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
    usage?:  { total_tokens?: number };
    model?:  string;
  };

  return {
    content:    data.choices[0]?.message?.content ?? '',
    tokensUsed: data.usage?.total_tokens ?? 0,
    model:      data.model ?? OPENAI_MODEL,
  };
}
