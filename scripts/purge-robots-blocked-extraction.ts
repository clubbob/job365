/**
 * 채용 URL 전체를 robots.txt 기준으로 검사해, 불허 회사는 추출 대상에서 제거합니다.
 * pnpm purge:robots-blocked
 */
import { ENTERPRISE_CAREERS_CONFIGS } from '@/lib/crawler/enterprise-careers-urls';
import { excludeCompanyExtractionForRobots, loadRobotsBlockedCrawlSourceIds } from '@/lib/crawler/robots-blocked-extraction';
import { classifyCareersUrlRobotsAccess } from '@/lib/crawler/robots';
import { getMiscCrawlerCompanies } from '@/lib/crawler/companies';
import { loadMidSizedRegistryDbCompanies } from '@/lib/mid-sized-companies/registry-db';
import { loadSeedCareersRegistryDbCompanies } from '@/lib/seed-careers/registry-db';
import { isCompleteRegistryCompanyIdentity } from '@/lib/registry-company-identity';

async function main() {
  const before = loadRobotsBlockedCrawlSourceIds().size;
  let scanned = 0;
  let removed = 0;

  const targets: Array<{ crawlSourceId: string; careersUrl: string; companyName: string }> = [];

  for (const config of ENTERPRISE_CAREERS_CONFIGS) {
    targets.push({
      crawlSourceId: config.crawlSourceId,
      careersUrl: config.careersUrl,
      companyName: config.ftcName,
    });
  }

  for (const record of loadMidSizedRegistryDbCompanies().filter((row) =>
    isCompleteRegistryCompanyIdentity(row),
  )) {
    targets.push({
      crawlSourceId: record.crawlSourceId,
      careersUrl: record.careersUrl!.trim(),
      companyName: record.companyName,
    });
  }

  for (const segment of ['it', 'semi-equipment'] as const) {
    for (const record of loadSeedCareersRegistryDbCompanies(segment).filter((row) =>
      isCompleteRegistryCompanyIdentity(row),
    )) {
      targets.push({
        crawlSourceId: record.crawlSourceId,
        careersUrl: record.careersUrl!.trim(),
        companyName: record.companyName,
      });
    }
  }

  for (const company of getMiscCrawlerCompanies()) {
    targets.push({
      crawlSourceId: company.id,
      careersUrl: company.careersUrl,
      companyName: company.name,
    });
  }

  const seen = new Set<string>();
  for (const target of targets) {
    const key = `${target.crawlSourceId}\t${target.careersUrl}`;
    if (seen.has(key)) continue;
    seen.add(key);
    scanned += 1;
    const access = await classifyCareersUrlRobotsAccess(target.careersUrl);
    if (access !== 'blocked') continue;
    const did = await excludeCompanyExtractionForRobots(target);
    if (did) removed += 1;
  }

  const after = loadRobotsBlockedCrawlSourceIds().size;
  console.log(
    `robots 불허 검사 ${scanned.toLocaleString('ko-KR')}곳 · 이번 명단 DB 삭제 ${removed.toLocaleString('ko-KR')}곳 · 삭제 이력 ${before.toLocaleString('ko-KR')} → ${after.toLocaleString('ko-KR')}곳`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
