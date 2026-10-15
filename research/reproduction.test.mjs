import test from 'node:test';
import assert from 'node:assert/strict';
import { runExperiment } from './run.mjs';
import { compareReproduction } from './reproduction.mjs';
import { mkdtemp, writeFile, readFile, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const config = { version: 1, id: 'original-fixture', title: 'Synthetic fixture', question: 'Does replay agree?',
  hypothesis: 'Recorded metrics agree.', seed: 42, days: 1, population: 2, scenario: 'steady',
  rules: ['commons', 'private'], repeats: 2, provider: 'rules', model: 'deterministic-v1',
  budget: { maxCalls: 1, maxOutputTokens: 64, maxTotalTokens: 1, timeoutMs: 1000, maxRunMs: 1000 } };

test('offline same-settings reproduction compares every same-seed run', async () => {
  const original = await runExperiment(config);
  const candidate = await runExperiment({ ...config, id: 'replica-fixture' });
  const report = compareReproduction(original, candidate);
  assert.equal(report.kind, 'same-settings');
  assert.equal(report.comparisons.length, 4);
  assert(report.comparisons.every(run => run.recordedActionsAgree && run.recordedMetricsAgree));
  assert.match(report.original, /^sha256:[a-f0-9]{64}$/);
});

test('seed extensions are not paired and changed assumptions or forged metrics fail', async () => {
  const original = await runExperiment(config);
  const extension = await runExperiment({ ...config, id: 'new-seed-fixture', seed: 100 });
  assert.deepEqual(compareReproduction(original, extension).comparisons, []);
  assert.equal(compareReproduction(original, extension).kind, 'new-seeds');
  const changed = await runExperiment({ ...config, id: 'changed-fixture', days: 2 });
  assert.throws(() => compareReproduction(original, changed));
  assert.throws(() => compareReproduction(original, original));
  extension.runs[0].metrics[0].met++;
  assert.throws(() => compareReproduction(original, extension));
});

test('comparison CLI writes private output, rejects overwrite and removes its temporary files', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'worlds-reproduction-test-'));
  try {
    const original = join(directory, 'original.json'), candidate = join(directory, 'candidate.json'), output = join(directory, 'comparison.json');
    await writeFile(original, JSON.stringify(await runExperiment(config)), { mode: 0o600 });
    await writeFile(candidate, JSON.stringify(await runExperiment({ ...config, id: 'cli-replica' })), { mode: 0o600 });
    const cli = fileURLToPath(new URL('../scripts/check-reproduction.mjs', import.meta.url));
    const args = [cli, original, candidate, output];
    const invoke = () => spawnSync(process.execPath, args, { env: {}, encoding: 'utf8', timeout: 10000 });
    assert.equal(invoke().status, 0);
    const saved = await readFile(output, 'utf8');
    assert.equal(JSON.parse(saved).kind, 'same-settings');
    assert.equal((await stat(output)).mode & 0o777, 0o600);
    assert.equal(invoke().status, 1);
    assert.equal(await readFile(output, 'utf8'), saved);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
