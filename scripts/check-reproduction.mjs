import { open, lstat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { parseBundle, MAX_BUNDLE_BYTES } from '../research/protocol.mjs';
import { compareReproduction } from '../research/reproduction.mjs';

async function readBundle(path) {
  const file = await open(resolve(path), 'r');
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > MAX_BUNDLE_BYTES) throw new Error('Invalid input');
    return parseBundle(await file.readFile('utf8'));
  } finally { await file.close(); }
}
try {
  const args = process.argv.slice(2);
  if (args.length !== 3) throw new Error('Three file paths required');
  const report = compareReproduction(await readBundle(args[0]), await readBundle(args[1]));
  const destination = resolve(args[2]);
  const parent = await lstat(dirname(destination));
  if (!destination.endsWith('.json') || !parent.isDirectory() || parent.isSymbolicLink()) throw new Error('Use an existing private output directory');
  const file = await open(destination, 'wx', 0o600);
  try { await file.writeFile(JSON.stringify(report, null, 2) + '\n'); await file.sync(); }
  finally { await file.close(); }
  console.log('Reproduction comparison saved locally. No model call, upload or claim of scientific verification.');
} catch {
  console.error('Comparison stopped. Check the two validated bundles, unchanged assumptions and a fresh output filename.');
  process.exitCode = 1;
}
