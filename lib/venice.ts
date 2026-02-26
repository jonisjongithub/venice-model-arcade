// Venice AI API Client

export const VENICE_API_BASE = 'https://api.venice.ai/api/v1';

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

export async function streamChat(
  apiKey: string,
  model: string,
  prompt: string,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  try {
    const response = await fetch(`${VENICE_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'user', content: prompt }
        ],
        stream: true,
        max_tokens: 1024,
        temperature: 0.7,
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`Venice API error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            callbacks.onComplete(fullText);
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const token = parsed.choices?.[0]?.delta?.content || '';
            if (token) {
              fullText += token;
              callbacks.onToken(token);
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }

    callbacks.onComplete(fullText);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      callbacks.onComplete('');
      return;
    }
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}

export async function getAvailableModels(apiKey: string): Promise<string[]> {
  try {
    const response = await fetch(`${VENICE_API_BASE}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch models');
    }

    const data = await response.json();
    return data.data
      ?.filter((m: any) => m.type === 'text' || m.object === 'model')
      .map((m: any) => m.id) || [];
  } catch {
    // Return default models on error (current Venice API models)
    return [
      'claude-opus-4-6',
      'claude-sonnet-4-6',
      'openai-gpt-53-codex',
      'gemini-3-1-pro-preview',
      'grok-41-fast',
      'zai-org-glm-5',
      'kimi-k2-5',
      'deepseek-v3.2',
      'qwen3-235b-a22b-thinking-2507',
      'llama-3.3-70b',
      'hermes-3-llama-3.1-405b',
      'venice-uncensored',
    ];
  }
}
