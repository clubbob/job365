/**
 * 채용 공고 이메일 발송 cron을 수동 실행합니다.
 * 사용: pnpm job-alerts
 * .env.local의 CRON_SECRET, NEXT_PUBLIC_APP_URL, NAVER_SMTP_*를 읽습니다.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local');
  try {
    const text = readFileSync(path, 'utf8');
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
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

async function main() {
  loadEnvLocal();

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  const secret = process.env.CRON_SECRET?.trim();

  if (!secret) {
    console.error('CRON_SECRET이 .env.local에 없습니다.');
    process.exit(1);
  }

  const res = await fetch(`${baseUrl}/api/cron/job-alerts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
    },
  });

  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));

  if (!res.ok || !json.ok) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
