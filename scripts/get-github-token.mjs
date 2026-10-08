import { spawnSync } from 'node:child_process';

function fromCredentialFill() {
  const result = spawnSync('git', ['credential', 'fill'], {
    input: 'protocol=https\nhost=github.com\n\n',
    encoding: 'utf8',
  });
  if (result.status !== 0) return '';
  const lines = result.stdout.split('\n');
  const passwordLine = lines.find((line) => line.startsWith('password='));
  return passwordLine ? passwordLine.slice('password='.length).trim() : '';
}

const token = process.env.GITHUB_TOKEN?.trim() || fromCredentialFill();
if (!token) {
  process.exit(2);
}
process.stdout.write(token);
