import { lstat, readFile, readdir } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isIP } from 'node:net';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const approved = new Set(JSON.parse(await readFile(join(root, 'public-export.json'), 'utf8')).files);
const ignored = new Set(['.git', 'node_modules', 'dist', 'coverage', '.vite', 'results']);
const fail = (file, reason) => { throw new Error(`Public boundary: ${file}: ${reason}`); };
const files = [];
async function walk(directory) {
  for (const name of await readdir(directory)) {
    if (ignored.has(name)) continue;
    const path = join(directory, name);
    const local = relative(root, path).replaceAll('\\', '/');
    const stat = await lstat(path);
    if (stat.isSymbolicLink()) fail(local, 'symlink');
    if (stat.isDirectory()) await walk(path);
    else if (stat.isFile()) files.push(local);
    else fail(local, 'unsupported file');
  }
}
await walk(root);
for (const file of files) {
  if (!approved.has(file) && !/^submissions\/[a-z][a-z0-9-]{2,59}\.json$/.test(file)) fail(file, 'not in the reviewed file allowlist');
}
for (const file of approved) if (!files.includes(file)) fail(file, 'allowlisted file missing');
const blockedRuntime = new Set([
  'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'sendBeacon',
  'RTCPeerConnection', 'Worker', 'SharedWorker', 'serviceWorker',
  'geolocation', 'localStorage', 'sessionStorage', 'indexedDB', 'cookie',
  'eval', 'Function', 'dangerouslySetInnerHTML', 'innerHTML',
]);
const publicLinks = new Set([
  'https://github.com/kibo-org/kibou-worlds/blob/main/CONTRIBUTING.md',
  'https://github.com/kibo-org/kibou-worlds/issues',
  'https://github.com/kibo-org/kibou-worlds/blob/main/docs/AGENT_EXPERIMENTS.md',
]);
for (const file of files) {
  const text = await readFile(join(root, file), 'utf8');
  if (/\/(?:Users|home)\/[^\s/]+|\/private\/(?:tmp|var)\//.test(text)) fail(file, 'private machine path');
  const emails = [...text.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)];
  if (emails.some(match => match[0] !== 'noreply@github.com')) fail(file, 'email address; use GitHub contact links');
  const candidates = [...text.matchAll(/\b(?:\d{1,3}\.){3}\d{1,3}\b|\b(?:[a-f\d]{1,4}:){2,}[a-f\d:]{0,39}\b/gi)];
  if (candidates.some(match => isIP(match[0]))) fail(file, 'literal IP address');
  if (/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[A-Z0-9]{16}|sk-(?:ant-)?[A-Za-z0-9_-]{20,})\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)) fail(file, 'credential-like material');
  if (/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b|postgres(?:ql)?:\/\/[^\s]+:[^\s]+@/i.test(text)) fail(file, 'token or database credential');
  if (file.startsWith('research/') && file.endsWith('.mjs') && !file.endsWith('.test.mjs')) {
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    function visitResearch(node) {
      if (ts.isIdentifier(node) && blockedRuntime.has(node.text) &&
          !(node.text === 'fetch' && file === 'research/providers.mjs')) fail(file, 'unreviewed research capability');
      if (node.kind === ts.SyntaxKind.ImportKeyword || node.kind === ts.SyntaxKind.ImportMeta) fail(file, 'dynamic research import');
      if (ts.isImportDeclaration(node) && !['./engine.mjs', './protocol.mjs', './registry.mjs', './social-engine.mjs', 'node:net'].includes(node.moduleSpecifier.text)) fail(file, 'unreviewed research import');
      if (ts.isStringLiteralLike(node) && /^https?:\/\//i.test(node.text) &&
          !(file === 'research/providers.mjs' && ['https://api.openai.com/v1/responses', 'https://api.anthropic.com/v1/messages'].includes(node.text))) fail(file, 'unreviewed model endpoint');
      ts.forEachChild(node, visitResearch);
    }
    visitResearch(source);
  }
  if (!file.startsWith('src/')) continue;
  if (/https?:\/\//i.test(text) && !file.endsWith('.tsx')) fail(file, 'runtime network configuration');
  if (file.endsWith('.css') && /@import|url\s*\(/i.test(text)) fail(file, 'unreviewed media/font source');
  if (!/\.tsx?$/.test(file)) continue;
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  function visit(node) {
    if (ts.isIdentifier(node) && blockedRuntime.has(node.text)) fail(file, 'network, persistence or unsafe execution API');
    if (node.kind === ts.SyntaxKind.ImportKeyword || node.kind === ts.SyntaxKind.ImportMeta) fail(file, 'dynamic/environment access');
    if (ts.isImportDeclaration(node)) {
      const name = node.moduleSpecifier.text;
      if (!['react', 'react-dom/client'].includes(name) && !name.startsWith('./')) fail(file, 'unreviewed import');
    }
    if (ts.isStringLiteralLike(node) && /^https?:\/\//i.test(node.text) && !publicLinks.has(node.text)) fail(file, 'unreviewed external URL');
    ts.forEachChild(node, visit);
  }
  visit(source);
}
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
if (pkg.workspaces || pkg.private !== true || pkg.license !== 'MIT') fail('package.json', 'package isolation/license changed');
if (Object.keys(pkg.dependencies).sort().join(',') !== 'react,react-dom') fail('package.json', 'unreviewed runtime dependency');
const lock = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'));
for (const [name, entry] of Object.entries(lock.packages)) {
  if (!name) continue;
  if (entry.link || !entry.resolved?.startsWith('https://registry.npmjs.org/') || !entry.integrity?.startsWith('sha512-')) fail('package-lock.json', 'non-registry or unlocked dependency');
}
const workflow = await readFile(join(root, '.github/workflows/ci.yml'), 'utf8');
if (/secrets\s*[.\[]|pull_request_target|workflow_run|self-hosted|id-token|write-all|:\s*write\b|\benvironment:/i.test(workflow)) fail('CI', 'privileged workflow');
if (!/persist-credentials:\s*false/.test(workflow) || !/contents:\s*read/.test(workflow)) fail('CI', 'credential policy');
for (const [, action] of workflow.matchAll(/\buses:\s*([^\s#]+)/g)) {
  if (!/^actions\/(?:checkout|setup-node)@[a-f0-9]{40}$/.test(action)) fail('CI', 'unreviewed/unpinned action');
}
console.log(`Public boundary passed for ${files.length} files. Static tripwires do not replace review or secret scanning.`);
