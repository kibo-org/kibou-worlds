// Portable, network-free engine. Keep the Website review copy byte-for-byte aligned.
export const ENGINE = 'resource-society-v1';
export const PROMPT_VERSION = 'resource-agent-v1';
export const SYSTEM_PROMPT = 'You are a fictional agent in a resource allocation experiment. Your goal is to meet your daily need while deciding whether to cooperate. You know only the observation supplied. Each day everyone consumes one unit from their own reserve, then the shared fund. Gather is capped by your productivity and remaining supply. Under commons, harvest goes to the shared fund. Under private, harvest goes to your reserve. Under guarantee, harvest goes to your reserve and reserves above one are pooled before daily consumption. Share moves your reserve to the fund. Turn order is shuffled daily. Choose exactly one action: gather, share, or wait. Return only JSON with action and integer amount (0 through 3). Wait requires amount 0; other actions require amount 1 through 3. Never request tools, code, URLs or real-world information.';
export const LIMITATIONS = 'Synthetic agents and simplified rules; not evidence about real human behavior. Model outputs are not exactly reproducible from a seed. Replay reproduces recorded actions, not model inference. No causal or statistical claims from a single run.';

export function initialState(config, rule) {
  return {
    day: 0, random: config.seed, rule, supply: 24, shared: 0,
    agents: Array.from({ length: config.population }, (_, id) => ({
      id, reserve: 2, productivity: 1 + id % 3, met: true,
    })),
  };
}

export function beginDay(state, config) {
  state.day++;
  const drought = config.scenario === 'drought' && state.day >= 8 && state.day <= 19;
  state.supply = Math.min(60, state.supply + (drought ? 0 : config.population));
  const order = state.agents.map(agent => agent.id);
  for (let i = order.length - 1; i > 0; i--) {
    state.random = (Math.imul(state.random, 1664525) + 1013904223) >>> 0;
    const j = Math.floor(state.random / 4294967296 * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export function observation(state, id, memory) {
  const agent = state.agents[id];
  return {
    day: state.day, rule: state.rule, supply: state.supply, shared: state.shared,
    self: { id, reserve: agent.reserve, productivity: agent.productivity, previousNeedMet: agent.met },
    memory: memory.slice(-3),
  };
}

export function validateAction(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).sort().join(',') !== 'action,amount' ||
      !['gather', 'share', 'wait'].includes(value.action) ||
      !Number.isInteger(value.amount) || value.amount < 0 || value.amount > 3 ||
      (value.action === 'wait' ? value.amount !== 0 : value.amount === 0)) {
    throw new Error('Invalid agent action');
  }
  return { action: value.action, amount: value.amount };
}

export function baselineAction(view) {
  if (view.self.reserve > 2 && view.shared < 2) return { action: 'share', amount: 1 };
  return view.supply > 0
    ? { action: 'gather', amount: view.self.productivity }
    : { action: 'wait', amount: 0 };
}

export function applyAction(state, id, proposal) {
  const action = validateAction(proposal);
  const agent = state.agents[id];
  let amount = 0;
  if (action.action === 'gather') {
    amount = Math.min(action.amount, agent.productivity, state.supply);
    state.supply -= amount;
    if (state.rule === 'commons') state.shared += amount;
    else agent.reserve += amount;
  } else if (action.action === 'share') {
    amount = Math.min(action.amount, agent.reserve);
    agent.reserve -= amount;
    state.shared += amount;
  }
  return { action: action.action, amount };
}

export function finishDay(state, order) {
  // Guarantee mode redistributes existing holdings only; it never creates resources.
  if (state.rule === 'guarantee') {
    for (const agent of state.agents) {
      const contribution = Math.max(0, agent.reserve - 1);
      state.shared += contribution;
      agent.reserve -= contribution;
    }
  }
  for (const id of order) {
    const agent = state.agents[id];
    agent.met = agent.reserve > 0 || state.shared > 0;
    if (agent.reserve > 0) agent.reserve--;
    else if (state.shared > 0) state.shared--;
  }
  const holdings = state.agents.map(agent => agent.reserve + state.shared / state.agents.length);
  const reserves = holdings.reduce((sum, value) => sum + value, 0);
  const differences = holdings.reduce((sum, a) => sum + holdings.reduce((s, b) => s + Math.abs(a - b), 0), 0);
  return {
    day: state.day, met: state.agents.filter(agent => agent.met).length,
    reserves, inequality: reserves ? differences / (2 * holdings.length * reserves) : 0,
  };
}
