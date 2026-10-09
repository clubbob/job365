import { SITE_URL } from '@/lib/site';

export type JobInquiryKind = 'crawled' | 'member';

const TITLE_MAX = 100;
const MESSAGE_MAX = 2000;

export function buildJobInquiryHref(
  kind: JobInquiryKind,
  jobId: string,
  meta: { title: string; companyName: string },
): string {
  const pageUrl = `${SITE_URL}/jobs/${encodeURIComponent(jobId)}`;
  const kindLabel = kind === 'crawled' ? '수집 채용 공고' : '회원 등록 채용 정보';
  const title = `[채용 공고 문의] ${meta.companyName}`.slice(0, TITLE_MAX);
  const message = [
    '아래 채용 공고에 대한 문의입니다.',
    '',
    `- 공고: ${meta.title}`,
    `- 회사: ${meta.companyName}`,
    `- 공고 ID: ${jobId}`,
    `- 구분: ${kindLabel}`,
    `- 페이지: ${pageUrl}`,
    '',
    '요청 내용(정정·삭제·오류 신고 등):',
    '',
  ]
    .join('\n')
    .slice(0, MESSAGE_MAX);

  const params = new URLSearchParams({ title, message });
  return `/inquiry?${params.toString()}`;
}

export function buildJobInquiryLoginHref(inquiryHref: string): string {
  return `/login?next=${encodeURIComponent(inquiryHref)}`;
}
