import { engineFor } from './registry.mjs';

async function boundedJson(response) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Provider returned no body');
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 262144) throw new Error('Provider response too large');
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } finally { await reader.cancel(); }
}

export function modelProvider(config, { env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const { SYSTEM_PROMPT, validateAction, actions } = engineFor(config);
  const schema = {
    type: 'object', additionalProperties: false, required: ['action', 'amount'],
    properties: { action: { type: 'string', enum: actions }, amount: { type: 'integer', minimum: 0, maximum: 3 } },
  };
  const openai = config.provider === 'openai';
  if (!openai && config.provider !== 'anthropic') throw new Error('Unknown model provider');
  const key = env[openai ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY'];
  if (typeof key !== 'string' || !key.trim() || key !== key.trim() || /\s/.test(key)) throw new Error('Missing or malformed provider credential');
  // Fixed HTTPS endpoints: no base-URL overrides, redirects, plugins or model tools.
  const endpoint = openai ? 'https://api.openai.com/v1/responses' : 'https://api.anthropic.com/v1/messages';
  return async (view, signal) => {
    const content = JSON.stringify(view);
    if (Buffer.byteLength(content) > 8192) throw new Error('Observation too large');
    const body = openai ? {
      model: config.model, store: false, instructions: SYSTEM_PROMPT,
      input: content, max_output_tokens: config.budget.maxOutputTokens,
      text: { format: { type: 'json_schema', name: 'society_action', strict: true, schema } },
    } : {
      model: config.model, system: SYSTEM_PROMPT, max_tokens: config.budget.maxOutputTokens,
      messages: [{ role: 'user', content }],
    };
    const headers = openai
      ? { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
      : { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' };
    const deadline = AbortSignal.any([signal, AbortSignal.timeout(config.budget.timeoutMs)]);
    let data;
    try {
      const response = await fetchImpl(endpoint, { method: 'POST', redirect: 'error', headers,
        body: JSON.stringify(body), signal: deadline });
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error('Provider rejected request');
      }
      data = await boundedJson(response);
    } catch {
      // Do not print provider bodies, headers, request content or low-level network errors.
      throw new Error('Model request failed; check model access, credentials, budget or deadline locally');
    }
    if (data.model !== config.model) throw new Error('Resolved model differs; configure its exact snapshot identifier');
    let text;
    if (openai) {
      if (data.status !== 'completed') throw new Error('Incomplete model output');
      const parts = data.output?.flatMap(item => item.type === 'message' ? item.content ?? [] : []) ?? [];
      if (parts.some(part => part.type === 'refusal')) throw new Error('Model refused action');
      text = parts.filter(part => part.type === 'output_text').map(part => part.text).join('');
    } else {
      if (data.stop_reason !== 'end_turn') throw new Error('Incomplete model output');
      text = (data.content ?? []).filter(part => part.type === 'text').map(part => part.text).join('');
    }
    let action;
    try { action = validateAction(JSON.parse(text)); }
    catch { throw new Error('Model returned an invalid action; run stopped without fallback'); }
    const inputTokens = data.usage?.input_tokens;
    const outputTokens = data.usage?.output_tokens;
    if (!Number.isSafeInteger(inputTokens) || inputTokens < 0 || !Number.isSafeInteger(outputTokens) ||
        outputTokens < 0 || outputTokens > config.budget.maxOutputTokens) throw new Error('Invalid provider usage');
    return { action, inputTokens, outputTokens };
  };
}
