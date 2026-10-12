import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { engineFor } from './registry.mjs';
import { runExperiment } from './run.mjs';
import { validateBundle, validateConfig } from './protocol.mjs';

for (const name of ['housing-allocation', 'information-asymmetry', 'public-policy']) {
  test(`${name} has repeatable baseline, versioned prompt, complete metrics and replay`, async () => {
    const config = JSON.parse(await readFile(new URL(`../experiments/${name}.json`, import.meta.url), 'utf8'));
    const bundle = await runExperiment(config);
    assert.deepEqual(bundle, await runExperiment(config));
    validateBundle(bundle);
    assert.equal(bundle.runs.length, config.rules.length * config.repeats);
    assert.equal(bundle.usage.calls, 0);
    assert.ok(bundle.runs.every(run => run.metrics.length === config.days));
    const edited = structuredClone(bundle);
    edited.runs[0].metrics[0].met++;
    assert.throws(() => validateBundle(edited));
    edited.runs[0].metrics[0].met--;
    edited.engine = 'resource-society-v1';
    assert.throws(() => validateBundle(edited));
  });
}

test('housing respects capacity, available budgets and waiting priority', () => {
  const engine = engineFor({ experiment: 'housing' });
  const config = { seed: 42, population: 4, scenario: 'steady' };
  const state = engine.initialState(config, 'need-priority');
  const order = engine.beginDay(state, config);
  state.agents[0].waitDays = 4;
  state.agents[1].waitDays = 3;
  for (const id of order) engine.applyAction(state, id, { action: 'apply', amount: 3 });
  const metrics = engine.finishDay(state, order);
  assert.equal(metrics.housed, 2);
  assert.equal(metrics.waiting, 2);
  assert.ok(state.agents[0].met && state.agents[1].met);
  assert.ok(state.agents.every(agent => agent.reserve >= 0));
  assert.equal(metrics.rentPaid, 2);
});

test('information view never reveals hidden quality; inspection expires by batch', () => {
  const engine = engineFor({ experiment: 'information' });
  const config = { seed: 42, population: 4, scenario: 'steady' };
  const state = engine.initialState(config, 'private-signals');
  engine.beginDay(state, config);
  assert.equal(engine.observation(state, 1, []).self.knownQuality, null);
  assert.equal('quality' in engine.observation(state, 1, []), false);
  assert.equal(engine.observation(state, 0, []).self.knownQuality, state.quality);
  engine.applyAction(state, 1, { action: 'inspect', amount: 1 });
  assert.equal(engine.observation(state, 1, []).self.knownQuality, state.quality);
  engine.beginDay(state, config);
  engine.beginDay(state, config);
  engine.beginDay(state, config);
  assert.equal(engine.observation(state, 1, []).self.knownQuality, null);
  assert.throws(() => engine.validateAction({ action: 'buy', amount: 3 }));
});

test('targeted transfers use the existing public fund and do not create money', () => {
  const engine = engineFor({ experiment: 'policy' });
  const config = { seed: 42, population: 3, scenario: 'steady' };
  const state = engine.initialState(config, 'safety-net');
  const order = engine.beginDay(state, config);
  state.agents[0].reserve = 0;
  state.shared = 1;
  const before = state.shared + state.agents.reduce((sum, agent) => sum + agent.reserve, 0);
  const sample = engine.finishDay(state, order);
  assert.equal(sample.transfers, 1);
  assert.equal(sample.met, 3);
  assert.equal(state.shared + state.agents.reduce((sum, agent) => sum + agent.reserve, 0), before - 3);
});

test('unknown experiments and cross-experiment rule combinations fail closed', async () => {
  const config = JSON.parse(await readFile(new URL('../experiments/housing-allocation.json', import.meta.url), 'utf8'));
  assert.throws(() => validateConfig({ ...config, rules: ['flat-tax'] }));
  assert.throws(() => validateConfig({ ...config, experiment: null }));
  assert.throws(() => engineFor({ experiment: 'untrusted-code' }));
  assert.throws(() => engineFor(config).validateAction({ action: 'gather', amount: 1 }));
});
