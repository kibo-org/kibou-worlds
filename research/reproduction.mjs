import { createHash } from 'node:crypto';
import { validateBundle } from './protocol.mjs';

export const bundleDigest = bundle => `sha256:${createHash('sha256').update(JSON.stringify(bundle)).digest('hex')}`;
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const comparable = ({ id, seed, ...settings }) => { void id; void seed; return canonical(settings); };

export function compareReproduction(original, candidate) {
  validateBundle(original); validateBundle(candidate);
  if (original.settings.id === candidate.settings.id) throw new Error('Give the reproduction a new public identity');
  if (JSON.stringify(comparable(original.settings)) !== JSON.stringify(comparable(candidate.settings))) {
    throw new Error('Only experiment identity and base seed may change; other assumptions need a separate experiment');
  }
  const sameSeed = original.settings.seed === candidate.settings.seed;
  const comparisons = sameSeed ? candidate.runs.map((run, index) => {
    const baseline = original.runs[index];
    const last = run.metrics.at(-1), previous = baseline.metrics.at(-1);
    return { rule: run.rule, seed: run.seed,
      recordedActionsAgree: JSON.stringify(canonical(run.decisions)) === JSON.stringify(canonical(baseline.decisions)),
      recordedMetricsAgree: JSON.stringify(canonical(run.metrics)) === JSON.stringify(canonical(baseline.metrics)),
      finalDifference: { met: last.met - previous.met, reserves: last.reserves - previous.reserves,
        inequality: last.inequality - previous.inequality } };
  }) : [];
  return { format: 'kibou-worlds-reproduction-check', version: 1, original: bundleDigest(original),
    candidate: bundleDigest(candidate), kind: sameSeed ? 'same-settings' : 'new-seeds', comparisons,
    limitations: 'Replay validates recorded actions, not provider authenticity. A new seed is not a same-seed pair. Model inference may vary. No social or statistical conclusion is certified.' };
}
