import test from 'node:test';
import assert from 'node:assert/strict';
import { modelProvider } from './providers.mjs';

const config = provider => ({ provider, model: 'test-model', budget: { timeoutMs: 1000, maxOutputTokens: 256 } });
const env = { OPENAI_API_KEY: 'fixture', ANTHROPIC_API_KEY: 'fixture' };
const signal = new AbortController().signal;
const reply = { action: 'gather', amount: 1 };

test('OpenAI uses fixed endpoint, no tools, no persistence and strict action output', async () => {
  const decide = modelProvider(config('openai'), { env, fetchImpl: async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    assert.equal(options.redirect, 'error');
    const body = JSON.parse(options.body);
    assert.equal(body.store, false);
    assert.equal(body.text.format.strict, true);
    assert.equal('tools' in body, false);
    return new Response(JSON.stringify({ model: 'test-model', status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(reply) }] }], usage: { input_tokens: 50, output_tokens: 10 } }));
  } });
  assert.deepEqual(await decide({ day: 1 }, signal), { action: reply, inputTokens: 50, outputTokens: 10 });
});

test('Anthropic sends bounded stateless synthetic observation without tools', async () => {
  const decide = modelProvider(config('anthropic'), { env, fetchImpl: async (url, options) => {
    assert.equal(url, 'https://api.anthropic.com/v1/messages');
    assert.equal(options.headers['anthropic-version'], '2023-06-01');
    const body = JSON.parse(options.body);
    assert.equal(body.max_tokens, 256);
    assert.equal('tools' in body, false);
    return new Response(JSON.stringify({ model: 'test-model', stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(reply) }], usage: { input_tokens: 30, output_tokens: 10 } }));
  } });
  assert.equal((await decide({ day: 1 }, signal)).action.action, 'gather');
});

test('provider errors never echo body or low-level transport details and never retry', async () => {
  let calls = 0;
  const decide = modelProvider(config('openai'), { env, fetchImpl: async () => {
    calls++;
    return new Response('private response fixture', { status: 401 });
  } });
  await assert.rejects(decide({}, signal), error => !error.message.includes('private response fixture'));
  assert.equal(calls, 1);
  assert.throws(() => modelProvider(config('openai'), { env: {} }), /credential/);
});

test('oversized, incomplete and invalid actions are rejected', async () => {
  for (const data of [
    { status: 'incomplete' },
    { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: '{"action":"execute","amount":1}' }] }] },
  ]) {
    const decide = modelProvider(config('openai'), { env, fetchImpl: async () => new Response(JSON.stringify(data)) });
    await assert.rejects(decide({}, signal));
  }
  const decide = modelProvider(config('openai'), { env, fetchImpl: async () => new Response('x'.repeat(262145)) });
  await assert.rejects(decide({}, signal), /failed/);
});

test('model action schema follows the selected social engine, not resource actions', async () => {
  const decide = modelProvider({ ...config('openai'), experiment: 'housing' }, { env,
    fetchImpl: async (_url, options) => {
      const body = JSON.parse(options.body);
      assert.deepEqual(body.text.format.schema.properties.action.enum, ['apply', 'wait']);
      return new Response(JSON.stringify({ model: 'test-model', status: 'completed',
        output: [{ type: 'message', content: [{ type: 'output_text', text: '{"action":"apply","amount":1}' }] }],
        usage: { input_tokens: 50, output_tokens: 10 } }));
    },
  });
  assert.deepEqual((await decide({ day: 1 }, signal)).action, { action: 'apply', amount: 1 });
});
