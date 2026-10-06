import type { CrawledJob } from '@/types/crawled-job';

export function htmlToPlainText(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** 제목만 넣은 generic 수집 결과 등 */
export function isThinCrawledDescription(description: string): boolean {
  const text = htmlToPlainText(description);
  if (/<img\s/i.test(description) && /서류|모집|채용|접수|지원/.test(text)) return false;
  if (text.length < 80) return true;
  if (/^채용 공고\s/.test(text) && text.length < 160) return true;
  return false;
}

/** 안내 팝업·푸터 등 공고가 아닌 내용 */
export function isInvalidJobDescription(description: string): boolean {
  if (isThinCrawledDescription(description)) return true;
  const text = htmlToPlainText(description);
  if (/이메일\s*주소\s*무단\s*수집/.test(text)) return true;
  if (/정보통신망법에\s*의해\s*형사처벌/.test(text)) return true;
  if (/^닫기\s*$/i.test(text)) return true;
  return false;
}

/** 채용 공고 목록·상세에 노출할 수 있는 공고 */
export function isBrowsableCrawledJob(job: Pick<CrawledJob, 'title' | 'description' | 'status'>): boolean {
  if (job.status !== 'active') return false;
  if (!job.title?.trim()) return false;
  return !isInvalidJobDescription(job.description);
}

export function shouldPersistCrawledJob(job: Pick<CrawledJob, 'title' | 'description'>): boolean {
  if (!job.title?.trim()) return false;
  return !isInvalidJobDescription(job.description);
}
