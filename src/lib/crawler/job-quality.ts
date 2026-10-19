import { isLikelyJobTitle, isNonJobContentTitle } from '@/lib/crawler/job-heuristics';
import { isTitleMarkedRecruitmentClosed } from '@/lib/job-board/crawled-deadline';
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

/** 안내 팝업·푸터 등 공고가 아닌 내용(스팸·오탐). 설명이 짧은 공고는 제외하지 않습니다. */
export function isInvalidJobDescription(description: string): boolean {
  const text = htmlToPlainText(description);
  if (!text) return false;
  if (/이메일\s*주소\s*무단\s*수집/.test(text)) return true;
  if (/정보통신망법에\s*의해\s*형사처벌/.test(text)) return true;
  if (/^닫기\s*$/i.test(text)) return true;
  return false;
}

/** 가이드·아티클 본문 (채용 공고 문맥이 아님) */
const NON_JOB_BODY_PATTERN =
  /포트폴리오\s*(?:양식|예시|작성|템플릿)|(?:이력서|자소서|면접)\s*(?:작성|예시)\s*(?:법|가이드|팁)|커리어\s*(?:팁|콘텐츠|인사이트)|(?:많은\s*)?구직자(?:에게|들에게)|비중\s*\d+\s*%\s*시대|학점\s*[\d.]+\s*\/\s*[\d.]+|(?:오픽|opic)\s*[:：]?\s*[A-Z]{1,3}\b|대외활동\s*\d+\s*회|유관\s*업무\s*경력|집중할\s*곳은|실무를\s*채우는\s*지금/;

/** 실제 채용 공고 본문에 흔한 표현 (LLM 없이 맥락 판별) */
const JOB_POSTING_BODY_SIGNAL_PATTERN =
  /(?:채용|모집)\s*(?:공고|분야|인원|요강)|지원\s*(?:기간|방법|절차|서류)|접수\s*기간|전형\s*(?:절차|방법)|서류\s*전형|실무\s*역량|담당\s*업무|주요\s*업무|자격\s*요건|우대\s*사항|근무\s*지|근로\s*조건|복리\s*후생|채용\s*프로세스|입사\s*지원|모집\s*요강|hiring|job\s*description|responsibilities|qualifications|how\s+to\s+apply/i;

/**
 * 설명이 충분히 길 때 본문이 채용 공고 맥락이 아니면 true.
 * 짧은 요약은 제목·URL 검사에 맡깁니다.
 */
export function lacksJobPostingContext(description: string): boolean {
  const text = htmlToPlainText(description);
  if (text.length < 80) return false;
  if (NON_JOB_BODY_PATTERN.test(text)) return true;
  return !JOB_POSTING_BODY_SIGNAL_PATTERN.test(text);
}

export function isInvalidJobTitle(title: string | null | undefined): boolean {
  const trimmed = title?.trim() ?? '';
  if (!trimmed) return true;
  if (isTitleMarkedRecruitmentClosed(trimmed)) return true;
  if (isNonJobContentTitle(trimmed)) return true;
  return !isLikelyJobTitle(trimmed);
}

/** 채용 공고 목록·상세에 노출할 수 있는 공고 */
export function isBrowsableCrawledJob(job: Pick<CrawledJob, 'title' | 'description' | 'status'>): boolean {
  if (job.status !== 'active') return false;
  if (isInvalidJobTitle(job.title)) return false;
  if (isInvalidJobDescription(job.description)) return false;
  if (lacksJobPostingContext(job.description)) return false;
  return true;
}

export function shouldPersistCrawledJob(job: Pick<CrawledJob, 'title' | 'description'>): boolean {
  if (isInvalidJobTitle(job.title)) return false;
  if (isInvalidJobDescription(job.description)) return false;
  if (lacksJobPostingContext(job.description)) return false;
  return true;
}
