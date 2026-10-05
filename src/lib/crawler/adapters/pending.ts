import type { CrawlerSourceResult } from '@/lib/crawler/types';

type PendingSource = {
  sourceId: string;
  sourceName: string;
  companyName: string;
  careersUrl: string;
};

async function probeSite(source: PendingSource): Promise<CrawlerSourceResult> {
  const errors: string[] = [];

  try {
    const res = await fetch(source.careersUrl, {
      headers: { 'User-Agent': 'JobLink365Bot/1.0 (+https://joblink365.com)' },
      signal: AbortSignal.timeout(15_000),
      redirect: 'follow',
    });

    if (!res.ok) {
      errors.push(`${source.companyName}: 채용 사이트 HTTP ${res.status}`);
    } else {
      errors.push(`${source.companyName}: 공개 채용 목록 API를 찾지 못했습니다. 다음 수집 때 다시 시도합니다.`);
    }
  } catch (error) {
    errors.push(`${source.companyName}: ${error instanceof Error ? error.message : '수집 실패'}`);
  }

  return {
    sourceId: source.sourceId,
    sourceName: source.sourceName,
    jobs: [],
    errors,
  };
}

const HANWHA: PendingSource = {
  sourceId: 'hanwha-careers',
  sourceName: '한화 채용',
  companyName: '한화',
  careersUrl: 'https://www.hanwhain.com/',
};

const SK: PendingSource = {
  sourceId: 'sk-careers',
  sourceName: 'SK 채용',
  companyName: 'SK',
  careersUrl: 'https://www.skcareers.com/',
};

const POSCO: PendingSource = {
  sourceId: 'posco-careers',
  sourceName: 'POSCO 채용',
  companyName: 'POSCO',
  careersUrl: 'https://recruit.posco.com/',
};

export async function crawlHanwhaCareers(): Promise<CrawlerSourceResult> {
  return probeSite(HANWHA);
}

export async function crawlSkCareers(): Promise<CrawlerSourceResult> {
  return probeSite(SK);
}

export async function crawlPoscoCareers(): Promise<CrawlerSourceResult> {
  return probeSite(POSCO);
}
