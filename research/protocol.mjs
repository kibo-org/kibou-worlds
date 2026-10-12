import { isIP } from 'node:net';
import { LIMITATIONS } from './engine.mjs';
import { engineFor } from './registry.mjs';

export const MAX_BUNDLE_BYTES = 2_000_000;
export const RULES = ['commons', 'private', 'guarantee'];
export const PROVIDERS = ['rules', 'openai', 'anthropic'];
const fail = message => { throw new Error(message); };

export function exact(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).sort().join(',') !== [...keys].sort().join(',')) fail(`Invalid ${label} fields`);
}
function integer(value, min, max, label) {
  if (!Number.isInteger(value) || value < min || value > max) fail(`Invalid ${label}`);
}
function same(left, right) {
  if (typeof left !== typeof right || left === null || right === null) return left === right;
  if (typeof left !== 'object') return left === right;
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  const keys = Object.keys(left).sort();
  return keys.join(',') === Object.keys(right).sort().join(',') && keys.every(key => same(left[key], right[key]));
}

// Tripwires supplement human privacy review; they do not detect every kind of PII.
export function publicText(value, max, label) {
  if (typeof value !== 'string' || !value.trim() || value.length > max ||
      /[<>\x00-\x08\x0b-\x1f\x7f]|https?:|www\.|@|\/(?:Users|home|private)\/|[A-Z]:\\|\b(?:sk-|ghp_|github_pat_|Bearer\s)|\b\d[\d ()+-]{8,}\d\b/i.test(value)) {
    fail(`Unsafe or invalid ${label}; use synthetic, non-identifying text`);
  }
  const addresses = value.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b|\b(?:[a-f\d]{1,4}:){2,}[a-f\d:]{0,39}\b/gi) ?? [];
  if (addresses.some(candidate => isIP(candidate))) fail(`Network address in ${label}`);
  return value;
}

export function validateConfig(config) {
  exact(config, ['version', 'id', 'title', 'question', 'hypothesis', 'seed', 'days', 'population',
    'scenario', 'rules', 'repeats', 'provider', 'model', 'budget',
    ...(Object.hasOwn(config ?? {}, 'experiment') ? ['experiment'] : [])], 'settings');
  const engine = engineFor(config);
  if (config.version !== 1 || !/^[a-z][a-z0-9-]{2,59}$/.test(config.id)) fail('Invalid experiment identity');
  if (/\b(?:sk-|ghp_|github_pat_)/i.test(config.id)) fail('Credential-like experiment identity');
  for (const field of ['title', 'question', 'hypothesis']) publicText(config[field], 600, field);
  integer(config.seed, 0, 4294967295, 'seed');
  integer(config.days, 1, 100, 'days');
  integer(config.population, 2, 12, 'population');
  integer(config.repeats, 1, 5, 'repeats');
  if (!['steady', 'drought'].includes(config.scenario) || !PROVIDERS.includes(config.provider)) fail('Invalid scenario/provider');
  if (!Array.isArray(config.rules) || config.rules.length < 1 || config.rules.length > 3 ||
      new Set(config.rules).size !== config.rules.length || config.rules.some(rule => !engine.rules.includes(rule))) fail('Invalid rules');
  if (config.experiment === 'information' && config.scenario !== 'steady') fail('Information experiment supports steady scenario only');
  if (typeof config.model !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(config.model) ||
      (config.provider === 'rules' && config.model !== 'deterministic-v1')) fail('Invalid model identifier');
  if (/\b(?:sk-|ghp_|github_pat_)/i.test(config.model) ||
      (config.model.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) ?? []).some(value => isIP(value))) fail('Unsafe model identifier');
  exact(config.budget, ['maxCalls', 'maxOutputTokens', 'maxTotalTokens', 'timeoutMs', 'maxRunMs'], 'budget');
  integer(config.budget.maxCalls, 1, 18000, 'call budget');
  integer(config.budget.maxOutputTokens, 64, 2048, 'output token cap');
  integer(config.budget.maxTotalTokens, 1, 2_000_000, 'total token budget');
  integer(config.budget.timeoutMs, 1000, 120000, 'request deadline');
  integer(config.budget.maxRunMs, 1000, 3_600_000, 'run deadline');
  const calls = config.rules.length * config.repeats * config.days * config.population;
  if (calls > 4000) fail('Experiment exceeds action-record limit; split into smaller experiments');
  if (config.provider !== 'rules' && config.budget.maxCalls < calls) fail('Call budget cannot complete the experiment');
  return config;
}

export function newBundle(config) {
  validateConfig(config);
  const { ENGINE, PROMPT_VERSION, SYSTEM_PROMPT } = engineFor(config);
  return {
    format: 'kibou-worlds-society', version: 1, engine: ENGINE,
    settings: structuredClone(config), prompt: { version: PROMPT_VERSION, system: SYSTEM_PROMPT },
    status: 'complete', usage: { calls: 0, inputTokens: 0, outputTokens: 0 }, runs: [],
    author: { interpretation: 'Not yet interpreted.', limitations: LIMITATIONS },
  };
}

export function validateBundle(bundle) {
  exact(bundle, ['format', 'version', 'engine', 'settings', 'prompt', 'status', 'usage', 'runs', 'author'], 'bundle');
  const config = validateConfig(bundle.settings);
  const { ENGINE, PROMPT_VERSION, SYSTEM_PROMPT, initialState, beginDay, observation,
    baselineAction, applyAction, finishDay, validateAction } = engineFor(config);
  if (bundle.format !== 'kibou-worlds-society' || bundle.version !== 1 || bundle.engine !== ENGINE ||
      bundle.status !== 'complete') fail('Unsupported or incomplete experiment');
  if (!same(bundle.prompt, { version: PROMPT_VERSION, system: SYSTEM_PROMPT })) fail('Prompt version/content mismatch');
  exact(bundle.author, ['interpretation', 'limitations'], 'author');
  publicText(bundle.author.interpretation, 3000, 'author interpretation');
  publicText(bundle.author.limitations, 3000, 'author limitations');
  exact(bundle.usage, ['calls', 'inputTokens', 'outputTokens'], 'usage');
  for (const field of ['calls', 'inputTokens', 'outputTokens']) integer(bundle.usage[field], 0, 2_000_000, field);
  const expectedCalls = config.rules.length * config.repeats * config.days * config.population;
  if (bundle.usage.calls !== (config.provider === 'rules' ? 0 : expectedCalls) ||
      bundle.usage.calls > config.budget.maxCalls ||
      bundle.usage.inputTokens + bundle.usage.outputTokens > config.budget.maxTotalTokens ||
      (config.provider === 'rules' && (bundle.usage.inputTokens || bundle.usage.outputTokens))) fail('Usage inconsistent with budget');
  if (!Array.isArray(bundle.runs) || bundle.runs.length !== config.rules.length * config.repeats) fail('Incomplete runs');
  let index = 0;
  for (const rule of config.rules) {
    for (let repeat = 0; repeat < config.repeats; repeat++) {
      const run = bundle.runs[index++];
      exact(run, ['rule', 'repeat', 'seed', 'decisions', 'metrics'], 'run');
      const seed = (config.seed + repeat) >>> 0;
      if (run.rule !== rule || run.repeat !== repeat || run.seed !== seed || !Array.isArray(run.decisions) ||
          run.decisions.length !== config.days * config.population || !Array.isArray(run.metrics) ||
          run.metrics.length !== config.days) fail('Invalid run dimensions/order');
      const state = initialState({ ...config, seed }, rule);
      const memories = state.agents.map(() => []);
      let cursor = 0;
      for (let day = 1; day <= config.days; day++) {
        const order = beginDay(state, config);
        for (const agent of order) {
          const decision = run.decisions[cursor++];
          exact(decision, ['day', 'agent', 'proposal', 'executed'], 'decision');
          if (decision.day !== day || decision.agent !== agent) fail('Decision order mismatch');
          const proposal = validateAction(decision.proposal);
          if (config.provider === 'rules' && !same(proposal, baselineAction(observation(state, agent, memories[agent])))) fail('Baseline action mismatch');
          const executed = applyAction(state, agent, proposal);
          if (!same(executed, decision.executed)) fail('Action execution mismatch');
          memories[agent].push({ day, ...executed });
        }
        if (!same(finishDay(state, order), run.metrics[day - 1])) fail('Reported metrics differ from replay');
      }
    }
  }
  return bundle;
}

export function parseBundle(text) {
  if (Buffer.byteLength(text, 'utf8') > MAX_BUNDLE_BYTES) fail('Bundle exceeds size limit');
  let value;
  try { value = JSON.parse(text); }
  catch { fail('Invalid bundle JSON'); }
  return validateBundle(value);
}

export function galleryEntry(bundle, source, reviewer) {
  validateBundle(bundle);
  if (bundle.author.interpretation === 'Not yet interpreted.') fail('Write an author interpretation before submission');
  if (!/^https:\/\/github\.com\/kibo-org\/kibou-worlds\/pull\/[1-9]\d*$/.test(source) ||
      !/^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}$/.test(reviewer)) fail('Invalid review provenance');
  return {
    id: bundle.settings.id, title: bundle.settings.title, question: bundle.settings.question,
    hypothesis: bundle.settings.hypothesis, engine: bundle.engine,
    settings: bundle.settings, prompt: bundle.prompt, usage: bundle.usage,
    interpretation: bundle.author.interpretation, limitations: bundle.author.limitations,
    review: { source, reviewer },
    runs: bundle.runs.map(({ rule, repeat, seed, metrics }) => ({ rule, repeat, seed, metrics })),
  };
}
