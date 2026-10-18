/**
 * Offline-testable guard for the synthetic RuFlo+OpenAI handoff pilot.
 * It does not launch agents or access project repositories.
 */
export const HYBRID_ROLES = Object.freeze(['researcher', 'coder', 'tester']);
export const HYBRID_LIMITS = Object.freeze({
  model: 'gpt-4.1-mini',
  maxRequests: 3,
  maxPromptChars: 1500,
  maxOutputTokens: 240,
  maxResponseChars: 1500,
  timeoutMs: 25_000
});

const endpoint = 'https://api.openai.com/v1/responses';
const instructions = 'Answer in one concise line. Begin with the role prefix specified in the prompt. No code fences.';

export function createBoundedOpenAIClient({ apiKey, fetchImpl = fetch } = {}) {
  if (typeof apiKey !== 'string' || apiKey.length < 20) {
    throw new Error('OpenAI API credential is unavailable');
  }
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl must be a function');
  let attempted = 0;

  async function generate(role, prompt, prefix) {
    if (attempted >= HYBRID_LIMITS.maxRequests) {
      throw new Error('Three-call provider budget exhausted');
    }
    if (role !== HYBRID_ROLES[attempted]) {
      throw new Error('Unexpected role order in bounded hybrid pilot');
    }
    if (typeof prompt !== 'string' || prompt.length === 0 ||
        prompt.length > HYBRID_LIMITS.maxPromptChars) {
      throw new Error('Synthetic prompt exceeds configured bounds');
    }
    if (typeof prefix !== 'string' || !['FINDING:', 'PATCH:', 'CHECK:'].includes(prefix)) {
      throw new Error('Unexpected role response prefix');
    }

    // Increment *before* contacting the provider. No retries are allowed on failure.
    attempted += 1;
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(HYBRID_LIMITS.timeoutMs),
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: HYBRID_LIMITS.model,
        store: false,
        max_output_tokens: HYBRID_LIMITS.maxOutputTokens,
        input: prompt,
        instructions
      })
    });
    if (!response?.ok) {
      const code = Number.isInteger(response?.status) ? response.status : 'unknown';
      // Do not echo upstream response bodies, potentially containing arbitrary content.
      throw new Error('OpenAI response failed with HTTP ' + code);
    }
    const data = await response.json();
    const answer = (Array.isArray(data?.output) ? data.output : [])
      .flatMap(item => Array.isArray(item?.content) ? item.content : [])
      .filter(item => item?.type === 'output_text' && typeof item?.text === 'string')
      .map(item => item.text).join('\n').trim()
      .replace(/^\*\*([^*]+)\*\*/, '$1').trim();
    if (data?.status !== 'completed' || !answer ||
        answer.length > HYBRID_LIMITS.maxResponseChars) {
      throw new Error('OpenAI response was incomplete or outside content bounds');
    }
    const inTokens = data.usage?.input_tokens;
    const outTokens = data.usage?.output_tokens;
    const usage = {
      inputTokens: Number.isSafeInteger(inTokens) && inTokens >= 0 ? inTokens : null,
      outputTokens: Number.isSafeInteger(outTokens) && outTokens >= 0 ? outTokens : null
    };
    return { text: answer, prefixMatch: answer.startsWith(prefix), usage };
  }

  return Object.freeze({generate, attempts: () => attempted});
}
