import { expect, test } from 'vitest';
import { createWorld, forkWorld, MAX_TICKS, metrics, stepWorld } from '../src/simulation';

const run = (seed: number, scenario: 'steady' | 'drought' = 'steady') => {
  let world = createWorld(seed, 'commons', scenario);
  for (let tick = 0; tick < MAX_TICKS; tick++) world = stepWorld(world);
  return world;
};

test('same seed and configuration reproduce the complete experiment', () => {
  expect(run(42)).toEqual(run(42));
  expect(run(43).random).not.toEqual(run(42).random);
});

test('transitions and forks do not mutate prior state or share references', () => {
  const original = createWorld();
  const snapshot = structuredClone(original);
  const next = stepWorld(original);
  const fork = forkWorld(next, 'private');
  expect(original).toEqual(snapshot);
  expect(fork.random).toBe(next.random);
  expect(fork.agents).toEqual(next.agents);
  fork.agents[0].reserve = 999;
  expect(next.agents[0].reserve).toBe(2);
  expect(fork.rule).toBe('private');
});

test.each(['steady', 'drought'] as const)('%s runs are bounded with valid metrics', scenario => {
  const world = run(42, scenario);
  expect(world.tick).toBe(MAX_TICKS);
  expect(stepWorld(world)).toBe(world);
  expect(world.history).toHaveLength(100);
  expect(world.events.length).toBeLessThanOrEqual(30);
  for (const sample of world.history) {
    expect(sample.met).toBeGreaterThanOrEqual(0);
    expect(sample.met).toBeLessThanOrEqual(12);
    expect(sample.reserves).toBeGreaterThanOrEqual(0);
    expect(sample.inequality).toBeGreaterThanOrEqual(0);
    expect(sample.inequality).toBeLessThanOrEqual(1);
  }
  expect(world.shared).toBeGreaterThanOrEqual(0);
  expect(world.supply).toBeGreaterThanOrEqual(0);
});

test('forked ownership rules diverge while both clocks stay synchronized', () => {
  let baseline = createWorld(7);
  for (let i = 0; i < 60; i++) baseline = stepWorld(baseline);
  let branch = forkWorld(baseline, 'private');
  for (let i = 0; i < 120; i++) {
    baseline = stepWorld(baseline);
    branch = stepWorld(branch);
  }
  expect(branch.tick).toBe(baseline.tick);
  expect(branch.random).toBe(baseline.random);
  expect(branch.agents.map(a => a.reserve)).not.toEqual(baseline.agents.map(a => a.reserve));
  expect(metrics(branch).inequality).toBeGreaterThanOrEqual(0);
});

test('drought changes the experiment without changing its random stream', () => {
  const steady = run(10);
  const drought = run(10, 'drought');
  expect(steady.random).toBe(drought.random);
  expect(steady.history).not.toEqual(drought.history);
});
