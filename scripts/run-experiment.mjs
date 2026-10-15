import { open, mkdir, lstat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { validateConfig, MAX_BUNDLE_BYTES } from '../research/protocol.mjs';
import { runExperiment } from '../research/run.mjs';
import { modelProvider } from '../research/providers.mjs';

async function main() {
  const args = process.argv.slice(2);
  const paid = args.at(-1) === '--allow-paid-api';
  if (paid) args.pop();
  if (args.length !== 2) throw new Error('Usage: npm run experiment -- settings.json results/run.json [--allow-paid-api]');
  const input = await open(resolve(args[0]), 'r');
  let config;
  try {
    if ((await input.stat()).size > 16384) throw new Error('Settings too large');
    config = validateConfig(JSON.parse(await input.readFile('utf8')));
  } finally { await input.close(); }
  if (config.provider !== 'rules' && !paid) throw new Error('Model calls require explicit --allow-paid-api; no request made');
  const destination = resolve(args[1]);
  if (!destination.endsWith('.json')) throw new Error('Output must be JSON');
  await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
  if ((await lstat(dirname(destination))).isSymbolicLink()) throw new Error('Output directory cannot be a symlink');
  // Claim the destination before any paid request. Never overwrite an earlier run.
  const output = await open(destination, 'wx', 0o600);
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  try {
    const decide = config.provider === 'rules' ? undefined : modelProvider(config);
    const bundle = await runExperiment(config, { decide, signal: controller.signal });
    const text = JSON.stringify(bundle, null, 2) + '\n';
    if (Buffer.byteLength(text) > MAX_BUNDLE_BYTES) throw new Error('Result exceeds submission size limit');
    await output.writeFile(text);
    await output.sync();
    console.log('Complete. Result saved locally with private file permissions. Add your interpretation and review it before sharing.');
  } finally {
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
    await output.close();
  }
}

main().catch(() => {
  console.error('Experiment stopped. Check settings, provider access and budgets locally. No complete result was published; an empty output file may remain.');
  process.exitCode = 1;
});
