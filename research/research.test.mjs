import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initialState, applyAction, finishDay, baselineAction } from './engine.mjs';
import { validateConfig, validateBundle, parseBundle, galleryEntry } from './protocol.mjs';
import { runExperiment } from './run.mjs';

const base = JSON.parse(await readFile(new URL('../experiments/resource-sharing.json', import.meta.url), 'utf8'));
const settings = () => ({ ...structuredClone(base), days: 2, population: 3, repeats: 1 });

test('rule baseline is deterministic, complete and replayable across policies', async () => {
  const config = settings();
  const first = await runExperiment(config);
  assert.deepEqual(first, await runExperiment(config));
  assert.equal(first.runs.length, 3);
  assert.equal(first.usage.calls, 0);
  assert.equal(validateBundle(first), first);
  for (const run of first.runs) {
    assert.equal(run.decisions.length, 6);
    assert.equal(run.metrics.length, 2);
    assert.ok(run.metrics.every(sample => sample.inequality >= 0 && sample.inequality <= 1));
  }
});

test('engine clamps proposals to actual holdings without resource creation', () => {
  const state = initialState(settings(), 'private');
  state.supply = 1;
  assert.deepEqual(applyAction(state, 0, { action: 'gather', amount: 3 }), { action: 'gather', amount: 1 });
  assert.equal(state.supply, 0);
  assert.deepEqual(applyAction(state, 0, { action: 'share', amount: 3 }), { action: 'share', amount: 3 });
  assert.throws(() => applyAction(state, 0, { action: 'execute', amount: 1 }));
  const guarantee = initialState(settings(), 'guarantee');
  guarantee.agents[0].reserve = 0;
  const before = guarantee.agents.reduce((sum, agent) => sum + agent.reserve, 0);
  finishDay(guarantee, [0, 1, 2]);
  assert.equal(guarantee.agents.reduce((sum, agent) => sum + agent.reserve, guarantee.shared), before - 3);
  assert.ok(guarantee.agents.every(agent => agent.met));
});

test('replay rejects edited observations, actions, metrics, unknown fields and incomplete output', async () => {
  const bundle = await runExperiment(settings());
  for (const mutate of [
    b => { b.runs[0].metrics[0].met++; },
    b => { b.runs[0].decisions[0].agent = 99; },
    b => { b.runs[0].decisions[0].proposal.amount = -1; },
    b => { b.runs.pop(); },
    b => { b.status = 'failed'; },
    b => { b.author.rawResponse = 'not allowed'; },
    b => { b.prompt.system += ' modified'; },
  ]) {
    const changed = structuredClone(bundle);
    mutate(changed);
    assert.throws(() => validateBundle(changed));
  }
});

test('settings and public annotations reject credential/path/address-like content', async () => {
  assert.throws(() => validateConfig({ ...settings(), endpoint: 'unreviewed' }));
  assert.throws(() => validateConfig({ ...settings(), population: 10000 }));
  const bundle = await runExperiment(settings());
  for (const text of ['Contact name' + '@' + 'example.invalid', 'https:' + '//example.invalid', 'Bearer ' + 'not-a-credential']) {
    const changed = structuredClone(bundle);
    changed.author.interpretation = text;
    assert.throws(() => validateBundle(changed));
  }
  assert.throws(() => parseBundle(' '.repeat(2_000_001)));
});

test('fake model adapter preserves decisions; no network or credentials required', async () => {
  const config = { ...settings(), provider: 'openai', model: 'test-model' };
  const bundle = await runExperiment(config, { decide: async view => ({ action: baselineAction(view), inputTokens: 20, outputTokens: 10 }) });
  assert.equal(bundle.usage.calls, 18);
  assert.equal(bundle.usage.inputTokens, 360);
  assert.equal(bundle.runs[0].decisions.length, 6);
  validateBundle(bundle);
});

test('budget, adapter error and cancellation fail closed without fallback', async () => {
  const config = { ...settings(), provider: 'anthropic', model: 'test-model' };
  let calls = 0;
  await assert.rejects(runExperiment({ ...config, budget: { ...config.budget, maxTotalTokens: 100 } }, {
    decide: async () => { calls++; },
  }), /Budget/);
  assert.equal(calls, 0);
  await assert.rejects(runExperiment(config, { decide: async () => { throw new Error('fake failure'); } }), /fake failure/);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(runExperiment(config, { decide: async () => { calls++; }, signal: controller.signal }));
  assert.equal(calls, 0);
});

test('publication projection requires interpretation and a bounded upstream PR', async () => {
  const bundle = await runExperiment(settings());
  const source = 'https://github.com/kibo-org/kibou-worlds/pull/1';
  assert.throws(() => galleryEntry(bundle, source, 'reviewer'));
  bundle.author.interpretation = 'This small run is a preliminary observation, not a general conclusion.';
  const entry = galleryEntry(bundle, source, 'reviewer');
  assert.ok(!('decisions' in entry.runs[0]));
  assert.equal(entry.settings.seed, 42);
  assert.equal(entry.prompt.version, bundle.prompt.version);
  assert.throws(() => galleryEntry(bundle, 'https://example.invalid/pull/1', 'reviewer'));
});
