import { engineFor } from './registry.mjs';
import { validateConfig, newBundle, validateBundle } from './protocol.mjs';

export async function runExperiment(config, { decide, signal = new AbortController().signal } = {}) {
  validateConfig(config);
  const { initialState, beginDay, observation, baselineAction, applyAction, finishDay } = engineFor(config);
  if (config.provider !== 'rules' && typeof decide !== 'function') throw new Error('A model adapter is required');
  const bundle = newBundle(config);
  const deadline = AbortSignal.any([signal, AbortSignal.timeout(config.budget.maxRunMs)]);
  for (const rule of config.rules) {
    for (let repeat = 0; repeat < config.repeats; repeat++) {
      const seed = (config.seed + repeat) >>> 0;
      const state = initialState({ ...config, seed }, rule);
      const memory = state.agents.map(() => []);
      const run = { rule, repeat, seed, decisions: [], metrics: [] };
      for (let day = 1; day <= config.days; day++) {
        const order = beginDay(state, config);
        for (const agent of order) {
          deadline.throwIfAborted();
          const view = observation(state, agent, memory[agent]);
          let proposal;
          if (config.provider === 'rules') proposal = baselineAction(view);
          else {
            // Reserve conservatively before sending. No retries and no silent rule fallback.
            // The fixed prompt/observation fit within 8192 UTF-8 bytes; input tokens may
            // also include provider framing, so reserve 16384 plus maximum output.
            const used = bundle.usage.inputTokens + bundle.usage.outputTokens;
            if (bundle.usage.calls >= config.budget.maxCalls ||
                used + 16384 + config.budget.maxOutputTokens > config.budget.maxTotalTokens) {
              throw new Error('Budget exhausted before request; incomplete results cannot be published');
            }
            bundle.usage.calls++;
            const result = await decide(view, deadline);
            deadline.throwIfAborted();
            if (!Number.isSafeInteger(result.inputTokens) || result.inputTokens < 0 || result.inputTokens > 16384 ||
                !Number.isSafeInteger(result.outputTokens) || result.outputTokens < 0 ||
                result.outputTokens > config.budget.maxOutputTokens) throw new Error('Provider usage exceeds reserved request allowance');
            bundle.usage.inputTokens += result.inputTokens;
            bundle.usage.outputTokens += result.outputTokens;
            if (!Number.isSafeInteger(bundle.usage.inputTokens) || !Number.isSafeInteger(bundle.usage.outputTokens) ||
                bundle.usage.inputTokens + bundle.usage.outputTokens > config.budget.maxTotalTokens) throw new Error('Provider exceeded token budget');
            proposal = result.action;
          }
          const executed = applyAction(state, agent, proposal);
          run.decisions.push({ day, agent, proposal, executed });
          memory[agent].push({ day, ...executed });
          memory[agent] = memory[agent].slice(-3);
        }
        run.metrics.push(finishDay(state, order));
      }
      bundle.runs.push(run);
    }
  }
  return validateBundle(bundle);
}
