import * as resources from './engine.mjs';
import { socialEngine } from './social-engine.mjs';

export const EXPERIMENTS = ['resource-sharing', 'housing', 'information', 'policy'];
export function engineFor(config) {
  const kind = config.experiment === undefined ? 'resource-sharing' : config.experiment;
  if (!EXPERIMENTS.includes(kind)) throw new Error('Unknown experiment kind');
  if (kind === 'resource-sharing') return { ...resources, rules: ['commons', 'private', 'guarantee'], actions: ['gather', 'share', 'wait'] };
  return socialEngine(kind);
}
