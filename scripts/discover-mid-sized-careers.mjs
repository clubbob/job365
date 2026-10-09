/**
 * 중견기업 채용 URL 자동 탐색 → data/mid-sized-crawl-targets.json
 * 마당(MME)은 회사 명단만 쓰고, URL은 ATS·네이버·다음·웹검색으로 찾아 DB에 쌓습니다.
 * - DISCOVER_OFFSET, DISCOVER_LIMIT 로 구간 실행 가능
 * - DISCOVER_AUTO_RECONCILE=0 이면 Firestore 반영 생략
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isAcceptableCareersUrl, isStorableCareersUrl } from './lib/careers-url-policy.mjs';
import {
  crawlSourceId,
  discoverCareersUrl,
} from './lib/mid-sized-discover-urls.mjs';

const root = process.cwd();
const registryPath = resolve(root, 'data/mid-sized-companies.json');
const outPath = resolve(root, 'data/mid-sized-crawl-targets.json');
const statePath = resolve(root, 'data/mid-sized-discovery-state.json');
const CONCURRENCY = Number(process.env.DISCOVER_CONCURRENCY ?? 12);
const TIMEOUT_MS = Number(process.env.DISCOVER_TIMEOUT_MS ?? 8000);
const SAVE_EVERY = 50;
/** 기본은 마당 명단 전체(약 3만 건)를 순회합니다. 유효 인증만 보려면 DISCOVER_ONLY_ACTIVE=1 */
const ONLY_ACTIVE = process.env.DISCOVER_ONLY_ACTIVE === '1';
/** 미연결(not_found) 회사를 네이버 검색 등으로 다시 탐색합니다. */
const RETRY_NOT_FOUND = process.env.DISCOVER_RETRY_NOT_FOUND === '1';
/** 포털·잘못된 URL로 연결된 회사를 다시 탐색합니다. */
const REPROBE_BAD = process.env.DISCOVER_REPROBE_BAD !== '0';
/** URL이 없는 회사는 not_found 여부와 관계없이 다시 탐색합니다. */
const ALL_MISSING = process.env.DISCOVER_ALL_MISSING === '1';

async function discoverForCompany(company) {
  const hit = await discoverCareersUrl(company, TIMEOUT_MS);
  if (!hit) return null;
  return {
    name: company.companyName,
    crawlSourceId: crawlSourceId(company.businessNumber, company.companyName),
    careersUrl: hit,
    businessNumber: company.businessNumber,
    adapter: hit.includes('greenhouse.io') ? 'greenhouse' : undefined,
    greenhouseBoard:
      hit.includes('boards.greenhouse.io/') ? hit.split('boards.greenhouse.io/')[1]?.replace(/\/$/, '') : undefined,
  };
}

function loadExistingTargets() {
  if (!existsSync(outPath)) {
    return { version: 1, generatedAt: null, source: 'mme+heuristic', targets: [] };
  }
  try {
    const raw = JSON.parse(readFileSync(outPath, 'utf8'));
    return {
      version: raw.version ?? 1,
      generatedAt: raw.generatedAt ?? null,
      source: raw.source ?? 'mme+heuristic',
      targets: Array.isArray(raw.targets) ? raw.targets : [],
    };
  } catch {
    return { version: 1, generatedAt: null, source: 'mme+heuristic', targets: [] };
  }
}

function loadDiscoveryState() {
  if (!existsSync(statePath)) return { version: 1, updatedAt: '', entries: {} };
  try {
    const raw = JSON.parse(readFileSync(statePath, 'utf8'));
    return { version: 1, updatedAt: raw.updatedAt ?? '', entries: raw.entries ?? {} };
  } catch {
    return { version: 1, updatedAt: '', entries: {} };
  }
}

function saveDiscoveryState(entries) {
  const payload = { version: 1, updatedAt: new Date().toISOString(), entries };
  writeFileSync(statePath, `${JSON.stringify(payload)}\n`, 'utf8');
}

function saveTargets(file, targets) {
  const payload = {
    ...file,
    generatedAt: new Date().toISOString(),
    targets,
  };
  writeFileSync(outPath, `${JSON.stringify(payload)}\n`, 'utf8');
}

async function mapPool(items, worker, onProgress) {
  let index = 0;
  let done = 0;
  async function run() {
    while (index < items.length) {
      const current = index++;
      const company = items[current];
      const result = await worker(company, current);
      done += 1;
      if (onProgress) await onProgress(company, result, done, items.length);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => run()));
}

function isActive(company) {
  if (!company.validTo) return true;
  const end = new Date(company.validTo);
  if (Number.isNaN(end.getTime())) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return end >= today;
}

/** 마당 엑셀은 발급 이력이 여러 행이므로 사업자번호당 1건(가장 늦은 유효기간)만 탐색합니다. */
function dedupeByBusinessNumber(companies) {
  const map = new Map();
  for (const company of companies) {
    const bn = company.businessNumber?.replace(/\D/g, '');
    if (!bn) continue;
    const prev = map.get(bn);
    if (!prev) {
      map.set(bn, company);
      continue;
    }
    const prevEnd = prev.validTo ? new Date(prev.validTo).getTime() : 0;
    const nextEnd = company.validTo ? new Date(company.validTo).getTime() : 0;
    if (nextEnd >= prevEnd) map.set(bn, company);
  }
  return [...map.values()];
}

async function main() {
  const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
  const allCompanies = dedupeByBusinessNumber(registry.companies ?? []);
  const allActive = ONLY_ACTIVE ? allCompanies.filter(isActive) : allCompanies;

  const offset = Math.max(0, Number(process.env.DISCOVER_OFFSET ?? 0) || 0);
  const limitEnv = process.env.DISCOVER_LIMIT;
  const limit = limitEnv == null || limitEnv === '' ? allActive.length : Math.max(0, Number(limitEnv) || 0);
  const slice = allActive.slice(offset, offset + limit);

  const file = loadExistingTargets();
  const discoveryState = loadDiscoveryState();
  const byBusiness = new Map();
  for (const item of file.targets) {
    const bn = item.businessNumber?.replace(/\D/g, '') || item.crawlSourceId;
    if (bn) byBusiness.set(bn, item);
  }

  const pending = slice.filter((company) => {
    const bn = company.businessNumber?.replace(/\D/g, '');
    if (!bn) return false;
    const existing = byBusiness.get(bn);
    const hasUrl = existing?.careersUrl && isStorableCareersUrl(existing.careersUrl);
    if (ALL_MISSING && !hasUrl) {
      if (existing && REPROBE_BAD && !isStorableCareersUrl(existing.careersUrl)) {
        byBusiness.delete(bn);
      }
      return true;
    }
    if (hasUrl) return false;
    if (existing && REPROBE_BAD && !isStorableCareersUrl(existing.careersUrl)) {
      byBusiness.delete(bn);
      return true;
    }
    if (existing) return false;
    const prior = discoveryState.entries[bn];
    if (prior?.status === 'not_found') return RETRY_NOT_FOUND;
    return prior?.status !== 'not_found';
  });

  console.log(
    `채용 URL 탐색: 고유 회사 ${allCompanies.length}건, 대상 ${allActive.length}건(ONLY_ACTIVE=${ONLY_ACTIVE}), 이번 구간 ${slice.length}건, 신규 탐색 ${pending.length}건 (기존 targets ${file.targets.length}건)`,
  );

  let discoveredSinceSave = 0;
  const checkedAt = () => new Date().toISOString();

  await mapPool(
    pending,
    discoverForCompany,
    async (company, result, done, total) => {
      const bn = company.businessNumber?.replace(/\D/g, '');
      if (result && bn) {
        byBusiness.set(bn, result);
        discoveryState.entries[bn] = { status: 'found', checkedAt: checkedAt(), careersUrl: result.careersUrl };
        discoveredSinceSave += 1;
      } else if (bn) {
        discoveryState.entries[bn] = { status: 'not_found', checkedAt: checkedAt() };
      }
      if (done % 200 === 0 || done === total) {
        console.log(`진행 ${done}/${total} (누적 targets ${byBusiness.size}건)`);
      }
      if (result && bn) {
        saveTargets(file, [...byBusiness.values()]);
      }
      if (done % 150 === 0 || done === total) {
        saveDiscoveryState(discoveryState.entries);
        saveTargets(file, [...byBusiness.values()]);
        console.log(`중간 저장: targets ${byBusiness.size}건 (${done}/${total})`);
      }
    },
  );

  const targets = [...byBusiness.values()];
  saveTargets(file, targets);
  saveDiscoveryState(discoveryState.entries);
  console.log(`저장: ${outPath} (채용 URL ${targets.length}건)`);

  if (process.env.DISCOVER_AUTO_RECONCILE !== '0') {
    console.log('탐색 결과를 registry DB·Firestore에 반영합니다…');
    const result = spawnSync('pnpm', ['reconcile:mid-sized'], {
      cwd: root,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
