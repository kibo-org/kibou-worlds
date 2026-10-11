import { execFileSync } from 'node:child_process';

const records = execFileSync('git', ['log', '--all', '--format=%ae%n%ce'], { encoding: 'utf8' }).trim();
for (const email of records.split('\n').filter(Boolean)) {
  const noreply = /^(?:\d+\+)?[a-z\d-]+@users\.noreply\.github\.com$/i;
  if (!noreply.test(email) && email !== 'noreply@github.com') {
    throw new Error('Public history contains a non-noreply author/committer address. Do not publish until reviewed.');
  }
}
console.log('Public author/committer email policy passed.');
