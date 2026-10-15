const DEFINITIONS = {
  housing: {
    engine: 'housing-allocation-v1', rules: ['lottery', 'need-priority', 'bid-priority'],
    actions: ['apply', 'wait'],
    description: 'Each day fictional agents receive two budget units. Rental capacity is half the population rounded down, at least one; drought reduces it by one on days 8 through 19, at least one. Apply with a bid of one to three, capped by your budget. Lottery uses shuffled order; need-priority ranks consecutive unhoused days, then synthetic need level; bid-priority ranks the bid. Ties use shuffled order. Winners pay one under lottery or need-priority, and their bid under bid-priority. Each rental lasts one day. Everyone also spends one budget unit on daily living if available. Your goal is to obtain housing while preserving your budget. Need level is fictional, not a real personal attribute.',
  },
  information: {
    engine: 'information-asymmetry-v1', rules: ['transparent', 'private-signals'],
    actions: ['inspect', 'buy', 'wait'],
    description: 'Each day fictional agents receive two budget units. A synthetic good costs two and yields either one or four budget-equivalent units. Quality is fixed for three days, then redrawn from a seeded equal-probability generator. Transparent rules reveal quality to all. Private-signals rules reveal it to even-numbered agents only. Others can inspect for one budget unit or learn quality after buying. Inspection knowledge lasts until the next quality batch. Inspect and buy require amount one. You can take only one action each day. Each agent also spends one budget unit on daily living if available. Your goal is to preserve resources and meet daily needs. Do not infer private quality from hidden state.',
  },
  policy: {
    engine: 'public-policy-v1', rules: ['no-tax', 'flat-tax', 'safety-net'],
    actions: ['work', 'contribute', 'wait'],
    description: 'Fictional agents begin with two units. Work earns one to three units capped by productivity; drought reduces productivity by one on days 8 through 19. Contribute moves your own units to a public fund. No-tax keeps all work earnings with no automatic redistribution. Flat-tax and safety-net collect half of daily work earnings rounded down. Flat-tax distributes an equal integer dividend from the fund to everyone, retaining any remainder. Safety-net transfers up to one unit to agents with no private reserve in shuffled order before consumption. Each agent then consumes one private unit if available; there is no automatic access to the remaining fund. Your goal is to meet daily needs while deciding whether to contribute. These are abstract resource rules, not a real fiscal model.',
  },
};

const nextRandom = state => {
  state.random = (Math.imul(state.random, 1664525) + 1013904223) >>> 0;
  return state.random / 4294967296;
};

export function socialEngine(kind) {
  const definition = DEFINITIONS[kind];
  if (!definition) throw new Error('Unknown social experiment');
  const prompt = `${definition.description} You know only the supplied observation and the last three executed actions. Choose exactly one of ${definition.actions.join(', ')}. Return only JSON with action and integer amount zero through three. Wait requires zero; other actions require one through three unless specified otherwise. Never request tools, code, URLs or real-world information.`;

  function validateAction(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        Object.keys(value).sort().join(',') !== 'action,amount' ||
        !definition.actions.includes(value.action) || !Number.isInteger(value.amount) ||
        value.amount < 0 || value.amount > 3 ||
        (value.action === 'wait' ? value.amount !== 0 : value.amount === 0) ||
        (kind === 'information' && value.action !== 'wait' && value.amount !== 1)) {
      throw new Error('Invalid social experiment action');
    }
    return { action: value.action, amount: value.amount };
  }

  function initialState(config, rule) {
    return {
      day: 0, random: config.seed, rule, shared: 0, quality: 0, capacity: 0,
      applications: [], tax: 0, transfers: 0, inspections: 0, trades: 0, netBenefit: 0, rentPaid: 0,
      agents: Array.from({ length: config.population }, (_, id) => ({
        id, reserve: 2, productivity: 1 + id % 3, effectiveProductivity: 1 + id % 3,
        need: 1 + id % 3, waitDays: 0, knownQuality: null, met: true,
      })),
    };
  }

  function beginDay(state, config) {
    state.day++;
    const drought = config.scenario === 'drought' && state.day >= 8 && state.day <= 19;
    state.applications = [];
    for (const field of ['tax', 'transfers', 'inspections', 'trades', 'netBenefit', 'rentPaid']) state[field] = 0;
    state.capacity = Math.max(1, Math.floor(config.population / 2) - (drought ? 1 : 0));
    if (kind === 'information' && (state.day - 1) % 3 === 0) {
      state.quality = nextRandom(state) < 0.5 ? 1 : 4;
      for (const agent of state.agents) agent.knownQuality = null;
    }
    for (const agent of state.agents) {
      if (kind !== 'policy') agent.reserve += 2;
      agent.effectiveProductivity = Math.max(0, agent.productivity - (drought ? 1 : 0));
      if (kind === 'information' && (state.rule === 'transparent' || agent.id % 2 === 0)) agent.knownQuality = state.quality;
    }
    const order = state.agents.map(agent => agent.id);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(nextRandom(state) * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
  }

  function observation(state, id, memory) {
    const agent = state.agents[id];
    const self = { id, reserve: agent.reserve, previousNeedMet: agent.met };
    if (kind === 'housing') Object.assign(self, { need: agent.need, consecutiveUnhousedDays: agent.waitDays });
    if (kind === 'information') Object.assign(self, { knownQuality: agent.knownQuality });
    if (kind === 'policy') Object.assign(self, { productivity: agent.productivity, effectiveProductivity: agent.effectiveProductivity });
    return {
      experiment: kind, day: state.day, rule: state.rule, self,
      ...(kind === 'housing' ? { capacity: state.capacity } : {}),
      ...(kind === 'information' ? { price: 2, batchDay: (state.day - 1) % 3 + 1 } : {}),
      ...(kind === 'policy' ? { publicFund: state.shared } : {}),
      memory: memory.slice(-3),
    };
  }

  function baselineAction(view) {
    if (kind === 'housing') return { action: 'apply', amount: view.rule === 'bid-priority' ? Math.min(3, view.self.reserve) : 1 };
    if (kind === 'information') {
      if (view.self.knownQuality === null && view.self.reserve >= 2 && view.batchDay < 3) return { action: 'inspect', amount: 1 };
      if (view.self.knownQuality === 4 && view.self.reserve >= 2) return { action: 'buy', amount: 1 };
      return { action: 'wait', amount: 0 };
    }
    return view.self.effectiveProductivity > 0
      ? { action: 'work', amount: view.self.effectiveProductivity }
      : { action: 'wait', amount: 0 };
  }

  function applyAction(state, id, proposal) {
    const action = validateAction(proposal);
    const agent = state.agents[id];
    let amount = 0;
    if (kind === 'housing' && action.action === 'apply') {
      amount = Math.min(agent.reserve, action.amount);
      if (amount) state.applications.push({ id, bid: amount });
    } else if (kind === 'information' && action.action === 'inspect' && agent.reserve >= 1) {
      agent.reserve--;
      agent.knownQuality = state.quality;
      state.inspections++;
      state.netBenefit--;
      amount = 1;
    } else if (kind === 'information' && action.action === 'buy' && agent.reserve >= 2) {
      agent.reserve += state.quality - 2;
      agent.knownQuality = state.quality;
      state.trades++;
      state.netBenefit += state.quality - 2;
      amount = 1;
    } else if (kind === 'policy' && action.action === 'work') {
      amount = Math.min(action.amount, agent.effectiveProductivity);
      const tax = state.rule === 'no-tax' ? 0 : Math.floor(amount / 2);
      agent.reserve += amount - tax;
      state.shared += tax;
      state.tax += tax;
    } else if (kind === 'policy' && action.action === 'contribute') {
      amount = Math.min(action.amount, agent.reserve);
      agent.reserve -= amount;
      state.shared += amount;
    }
    return { action: action.action, amount };
  }

  function finishDay(state, order) {
    if (kind === 'housing') {
      const rank = new Map(order.map((id, index) => [id, index]));
      state.applications.sort((a, b) => {
        if (state.rule === 'bid-priority' && a.bid !== b.bid) return b.bid - a.bid;
        if (state.rule === 'need-priority') {
          const left = state.agents[a.id], right = state.agents[b.id];
          if (left.waitDays !== right.waitDays) return right.waitDays - left.waitDays;
          if (left.need !== right.need) return right.need - left.need;
        }
        return rank.get(a.id) - rank.get(b.id);
      });
      const winners = new Map(state.applications.slice(0, state.capacity).map(item => [item.id, item.bid]));
      for (const agent of state.agents) {
        agent.met = winners.has(agent.id);
        agent.waitDays = agent.met ? 0 : agent.waitDays + 1;
        if (agent.met) {
          const rent = state.rule === 'bid-priority' ? winners.get(agent.id) : 1;
          agent.reserve -= rent;
          state.rentPaid += rent;
        }
        if (agent.reserve > 0) agent.reserve--;
      }
    } else {
      if (kind === 'policy' && state.rule === 'flat-tax') {
        const dividend = Math.floor(state.shared / state.agents.length);
        for (const agent of state.agents) agent.reserve += dividend;
        state.transfers = dividend * state.agents.length;
        state.shared -= state.transfers;
      } else if (kind === 'policy' && state.rule === 'safety-net') {
        for (const id of order) {
          if (state.agents[id].reserve === 0 && state.shared > 0) {
            state.agents[id].reserve++;
            state.shared--;
            state.transfers++;
          }
        }
      }
      for (const agent of state.agents) {
        agent.met = agent.reserve > 0;
        if (agent.met) agent.reserve--;
      }
    }
    const holdings = state.agents.map(agent => agent.reserve);
    const reserves = holdings.reduce((sum, value) => sum + value, 0);
    const differences = holdings.reduce((sum, a) => sum + holdings.reduce((s, b) => s + Math.abs(a - b), 0), 0);
    return {
      day: state.day, met: state.agents.filter(agent => agent.met).length, reserves,
      inequality: reserves ? differences / (2 * holdings.length * reserves) : 0,
      ...(kind === 'housing' ? { housed: state.agents.filter(agent => agent.met).length,
        waiting: state.agents.filter(agent => !agent.met).length, rentPaid: state.rentPaid } : {}),
      ...(kind === 'information' ? { inspections: state.inspections, trades: state.trades, netBenefit: state.netBenefit } : {}),
      ...(kind === 'policy' ? { taxCollected: state.tax, transfers: state.transfers, publicFund: state.shared } : {}),
    };
  }

  return { ENGINE: definition.engine, PROMPT_VERSION: `${definition.engine}-agent`, SYSTEM_PROMPT: prompt,
    rules: definition.rules, actions: definition.actions,
    initialState, beginDay, observation, baselineAction, applyAction, finishDay, validateAction };
}
