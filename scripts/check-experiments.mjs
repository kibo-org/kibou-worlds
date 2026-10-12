import { open, readdir, lstat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { parseBundle, MAX_BUNDLE_BYTES } from '../research/protocol.mjs';

const root = fileURLToPath(new URL('../submissions/', import.meta.url));
const supplied = process.argv.slice(2);
const files = supplied.length ? supplied.map(file => resolve(file))
  : (await readdir(root)).filter(name => name !== 'README.md').map(name => resolve(root, name));
const ids = new Set();
for (const file of files) {
  const stat = await lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink() || !file.endsWith('.json') || stat.size > MAX_BUNDLE_BYTES) throw new Error('Only bounded JSON submissions are accepted');
  const handle = await open(file, 'r');
  try {
    const bundle = parseBundle(await handle.readFile('utf8'));
    if (bundle.author.interpretation === 'Not yet interpreted.') throw new Error('Author interpretation required');
    if (ids.has(bundle.settings.id)) throw new Error('Duplicate experiment identity');
    ids.add(bundle.settings.id);
  } finally { await handle.close(); }
}
console.log(`Validated ${files.length} submission(s). Replay validates internal consistency, not provider authenticity or privacy completeness.`);
