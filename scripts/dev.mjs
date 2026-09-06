import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || 'localhost';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(true));
    server.once('listening', () => {
      server.close(() => resolve(false));
    });
    server.listen(port, HOST);
  });
}

function killPortWindows(port) {
  try {
    const output = execSync(`netstat -ano | findstr :${port}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });

    for (const line of output.split(/\r?\n/)) {
      if (!/LISTENING/i.test(line)) continue;
      const pid = line.trim().split(/\s+/).at(-1);
      if (!pid || pid === '0') continue;
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
      } catch {
        /* already gone */
      }
    }
  } catch {
    /* port not in use */
  }
}

function removeNextDir(dir) {
  if (!fs.existsSync(dir)) return true;

  try {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    return true;
  } catch {
    return false;
  }
}

async function prepareNextDir(shouldClean) {
  if (process.platform === 'win32') {
    killPortWindows(PORT);
    await sleep(800);
  }

  if (!shouldClean) return process.env;

  if (removeNextDir('.next')) {
    return process.env;
  }

  const altDir = '.next-dev';
  removeNextDir(altDir);
  console.warn(`[job365] .next 삭제 실패 — ${altDir} 폴더를 사용합니다.`);

  return { ...process.env, JOB365_NEXT_DIST_DIR: altDir };
}

async function main() {
  const noClean = process.argv.includes('--no-clean');
  const shouldClean =
    process.argv.includes('--clean') ||
    (process.platform === 'win32' && !noClean && process.env.JOB365_DEV_NO_CLEAN !== '1');

  if (shouldClean && process.platform === 'win32') {
    console.log('[job365] Windows 개발 모드: .next 캐시를 비운 뒤 시작합니다. (--no-clean 으로 건너뛸 수 있음)');
  }

  const env = await prepareNextDir(shouldClean);

  if (process.platform === 'win32' && (await isPortInUse(PORT))) {
    killPortWindows(PORT);
    await sleep(500);
  }

  console.log(`[job365] http://${HOST}:${PORT}`);

  const useTurbopack = process.env.JOB365_DEV_TURBOPACK !== '0';
  const nextArgs = ['next', 'dev', '-p', String(PORT), '-H', HOST];
  if (useTurbopack) {
    nextArgs.push('--turbopack');
  }

  const child = spawn(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    nextArgs,
    { stdio: 'inherit', shell: true, env },
  );

  child.on('exit', (code) => process.exit(code ?? 0));
}

main().catch((err) => {
  console.error('[job365] dev 시작 실패:', err);
  process.exit(1);
});
