/**
 * 고용24(워크넷) 채용정보 API 인증키 동작 확인 (1페이지만 조회).
 * .env.local의 WORK24_AUTH_KEY 사용: pnpm work24:test
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const API_BASE =
  'https://www.work24.go.kr/cm/openApi/call/hr/callOpenApiSvcInfo313L01.do';

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local');
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
}

function xmlTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'));
  const value = match?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1').trim();
  return value || null;
}

async function main() {
  try {
    loadEnvLocal();
  } catch {
    console.error('.env.local을 찾을 수 없습니다.');
    process.exit(1);
  }

  const authKey = process.env.WORK24_AUTH_KEY?.trim();
  if (!authKey) {
    console.error('WORK24_AUTH_KEY가 비어 있습니다.');
    console.error('고용24(work24.go.kr) OPEN-API 신청 후 .env.local에 넣어 주세요.');
    process.exit(1);
  }

  const url = new URL(API_BASE);
  url.searchParams.set('authKey', authKey);
  url.searchParams.set('callTp', 'L');
  url.searchParams.set('returnType', 'XML');
  url.searchParams.set('startPage', '1');
  url.searchParams.set('display', '3');

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'Mozilla/5.0 JobLink365-Crawler/1.0' },
  });
  const xml = await res.text();

  const errorText =
    xmlTag(xml, 'error') ??
    (/<error[^>]*>([\s\S]*?)<\/error>/i.exec(xml)?.[1]?.trim() || null);
  const wantedCount = (xml.match(/<wanted>/gi) ?? []).length;
  const total = xmlTag(xml, 'total') ?? xmlTag(xml, 'totalCount');

  if (errorText) {
    console.error('API 오류:', errorText);
    if (/개인회원/i.test(errorText)) {
      console.error('');
      console.error(
        '채용정보 OPEN-API는 보통 기업회원(사업자) 계정이 필요합니다. 개인으로는 키를 받았어도 호출이 거절될 수 있습니다.',
      );
    }
    process.exit(1);
  }

  if (wantedCount === 0) {
    console.warn('응답에 공고가 없습니다. HTTP', res.status);
    console.warn(xml.slice(0, 500));
    process.exit(res.ok ? 0 : 1);
  }

  console.log('인증 성공:', { httpStatus: res.status, totalReported: total, sampleWanted: wantedCount });
  console.log('다음: pnpm crawl:mid-sized (중견만) 또는 pnpm crawl (전체 파이프라인)');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
