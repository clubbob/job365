/**
 * GitHub Actions Secrets 등록 (채용 수집 cron)
 * 사용: GITHUB_TOKEN=ghp_... node scripts/set-github-crawl-secrets.mjs
 * .env.local에서 FIREBASE_* 값을 읽습니다.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sodium from 'libsodium-wrappers';

const REPO = 'clubbob/job365';

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local');
  const text = readFileSync(path, 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

async function getPublicKey(token) {
  const res = await fetch(`https://api.github.com/repos/${REPO}/actions/secrets/public-key`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) {
    throw new Error(`public-key 조회 실패: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function encryptSecret(publicKey, secretValue) {
  await sodium.ready;
  const encryptedBytes = sodium.crypto_box_seal(Buffer.from(secretValue), Buffer.from(publicKey, 'base64'));
  return Buffer.from(encryptedBytes).toString('base64');
}

async function setSecret(token, name, value) {
  const { key_id, key } = await getPublicKey(token);
  const encrypted_value = await encryptSecret(key, value);
  const res = await fetch(`https://api.github.com/repos/${REPO}/actions/secrets/${name}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ encrypted_value, key_id }),
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`${name} 등록 실패: ${res.status} ${await res.text()}`);
  }
}

async function dispatchWorkflow(token) {
  const res = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/crawl-daily.yml/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ref: 'main' }),
  });
  if (!res.ok) {
    throw new Error(`workflow 실행 실패: ${res.status} ${await res.text()}`);
  }
}

async function main() {
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    console.error('GITHUB_TOKEN이 필요합니다. repo 권한이 있는 PAT를 설정해 주세요.');
    process.exit(1);
  }

  const env = loadEnvLocal();
  const projectId = env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').trim();

  if (!projectId || !clientEmail || !privateKey) {
    console.error('.env.local에 FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY가 필요합니다.');
    process.exit(1);
  }

  await setSecret(token, 'FIREBASE_PROJECT_ID', projectId);
  await setSecret(token, 'FIREBASE_CLIENT_EMAIL', clientEmail);
  await setSecret(token, 'FIREBASE_PRIVATE_KEY', privateKey);
  console.log('GitHub Actions Secrets 3개를 등록했습니다.');

  await dispatchWorkflow(token);
  console.log('Daily job crawl 워크플로를 실행했습니다.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
