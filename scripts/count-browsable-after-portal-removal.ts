/**
 * /jobs 노출과 동일한 browsable·중복 제거 후, 포털 유래 공고 제외 잔여 건수.
 * pnpm exec tsx scripts/count-browsable-after-portal-removal.ts
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getBrowsableCrawledJobsForTrend } from '@/lib/crawled-jobs-server';
import { isPortalCareersUrl } from '@/lib/mid-sized-companies/careers-url-policy';
import type { CrawledJob } from '@/types/crawled-job';

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
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

function isPortalSourcedJob(job: Pick<CrawledJob, 'id' | 'sourceId' | 'applyUrl'>): boolean {
  if (job.id.startsWith('work24-')) return true;
  if (job.sourceId.includes('work24')) return true;
  const applyUrl = job.applyUrl?.trim() ?? '';
  if (applyUrl && isPortalCareersUrl(applyUrl)) return true;
  return false;
}

loadEnvLocal();

async function main() {
  const browsable = await getBrowsableCrawledJobsForTrend();
  const portal = browsable.filter(isPortalSourcedJob);
  const remain = browsable.length - portal.length;

  console.log(
    JSON.stringify(
      {
        browsableUniqueTotal: browsable.length,
        browsablePortal: portal.length,
        browsableRemainAfterPortalRemoval: remain,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
