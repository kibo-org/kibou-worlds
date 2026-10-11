export type Rule = 'commons' | 'private';
export type Scenario = 'steady' | 'drought';
export type Place = 'grove' | 'commons' | 'home';
export type Agent = { id: number; name: string; x: number; y: number; target: Place; cargo: number; reserve: number; fed: boolean; productivity: number };
export type Observation = { tick: number; kind: 'gather' | 'share' | 'day'; agent?: number; amount: number };
export type Sample = { day: number; met: number; reserves: number; inequality: number };
export type World = { version: 1; seed: number; random: number; tick: number; rule: Rule; scenario: Scenario; supply: number; shared: number; agents: Agent[]; events: Observation[]; history: Sample[] };
export const PLACES: Record<Place, { x: number; y: number }> = { grove: { x: 27, y: 34 }, commons: { x: 54, y: 53 }, home: { x: 77, y: 37 } };
const NAMES = ['Aoi', 'Ren', 'Mika', 'Sora', 'Yui', 'Haru', 'Noa', 'Kai', 'Rio', 'Mei', 'Riku', 'Nagi'];
export const MAX_TICKS = 1200;

export function createWorld(seed = 42, rule: Rule = 'commons', scenario: Scenario = 'steady'): World {
  return { version: 1, seed: seed >>> 0, random: seed >>> 0, tick: 0, rule, scenario, supply: 40, shared: 12,
    agents: NAMES.map((name, id) => ({ id, name, x: 65 + (id % 4) * 5, y: 43 + Math.floor(id / 4) * 7,
      target: 'grove', cargo: 0, reserve: 2, fed: true, productivity: 1 + id % 3 })), events: [], history: [] };
}
export function forkWorld(world: World, rule: Rule): World {
  const fork = structuredClone(world);
  fork.rule = rule;
  return fork;
}
function random(world: World) {
  world.random = (Math.imul(world.random, 1664525) + 1013904223) >>> 0;
  return world.random / 4294967296;
}
export function metrics(world: World): Sample {
  const holdings = world.agents.map(a => a.reserve + world.shared / world.agents.length);
  const total = holdings.reduce((sum, value) => sum + value, 0);
  const differences = holdings.reduce((sum, a) => sum + holdings.reduce((s, b) => s + Math.abs(a - b), 0), 0);
  return { day: Math.floor(world.tick / 12), met: world.agents.filter(a => a.fed).length,
    reserves: total, inequality: total ? differences / (2 * holdings.length * total) : 0 };
}
export function stepWorld(previous: World): World {
  if (previous.tick >= MAX_TICKS) return previous;
  const world = structuredClone(previous);
  world.tick++;
  const day = Math.floor(world.tick / 12);
  const scarce = world.scenario === 'drought' && day >= 8 && day < 20;
  world.supply = Math.min(60, world.supply + (scarce ? 0 : 2));
  const order = [...world.agents];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random(world) * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const events: Observation[] = [];
  for (const agent of order) {
    const destination = PLACES[agent.target];
    const dx = destination.x - agent.x, dy = destination.y - agent.y, distance = Math.hypot(dx, dy);
    if (distance > 5) { agent.x += dx / distance * 5; agent.y += dy / distance * 5; continue; }
    if (agent.target === 'grove') {
      const amount = Math.min(world.supply, agent.productivity);
      world.supply -= amount; agent.cargo = amount; agent.target = 'commons';
      if (amount) events.push({ tick: world.tick, kind: 'gather', agent: agent.id, amount });
    } else if (agent.target === 'commons') {
      if (world.rule === 'commons') world.shared += agent.cargo;
      else agent.reserve += agent.cargo;
      events.push({ tick: world.tick, kind: 'share', agent: agent.id, amount: agent.cargo });
      agent.cargo = 0; agent.target = 'home';
    } else agent.target = 'grove';
  }
  if (world.tick % 12 === 0) {
    // Shared resources meet unmet needs first; private reserves remain owned in both rules.
    for (const agent of order) {
      agent.fed = agent.reserve > 0 || world.shared > 0;
      if (agent.reserve > 0) agent.reserve--;
      else if (world.shared > 0) world.shared--;
    }
    const sample = metrics(world);
    world.history.push(sample);
    events.push({ tick: world.tick, kind: 'day', amount: sample.met });
  }
  world.events = [...events.reverse(), ...world.events].slice(0, 30);
  return world;
}
