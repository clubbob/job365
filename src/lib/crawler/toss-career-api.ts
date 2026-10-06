import { BROWSER_AJAX_HEADERS } from '@/lib/crawler/browser-headers';
import { isLikelyJobTitle } from '@/lib/crawler/job-heuristics';
import { normalizeJobTitle } from '@/lib/crawler/normalize-job-title';
import type { RecruiterNoticeCandidate } from '@/lib/crawler/recruiter-notice-api';

const TOSS_JOB_GROUPS_URL = 'https://api-public.toss.im/api/v3/ipd-eggnog/career/job-groups';

type TossJobGroup = {
  id?: number;
  title?: string;
  primary_job?: {
    id?: number;
    absolute_url?: string;
    location?: { name?: string };
    metadata?: Array<{ name?: string; value?: string }>;
    content?: string;
  };
};

function metadataValue(metadata: TossJobGroup['primary_job'], name: string): string | undefined {
  const item = metadata?.metadata?.find((row) => row.name === name);
  return typeof item?.value === 'string' ? item.value : undefined;
}

/** 토스 채용 공고 API (Greenhouse 기반) */
export async function fetchTossCareerCandidates(careersUrl: string): Promise<RecruiterNoticeCandidate[]> {
  if (!/toss\.im/i.test(careersUrl)) return [];

  try {
    const res = await fetch(TOSS_JOB_GROUPS_URL, {
      headers: { ...BROWSER_AJAX_HEADERS, Referer: careersUrl },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return [];
    const payload = (await res.json()) as { success?: TossJobGroup[] };
    const groups = payload.success ?? [];
    const candidates: RecruiterNoticeCandidate[] = [];
    const seen = new Set<string>();

    for (const group of groups) {
      const job = group.primary_job;
      const title = group.title?.trim();
      const applyUrl = job?.absolute_url?.trim();
      if (!title || !applyUrl || !isLikelyJobTitle(title)) continue;
      if (seen.has(applyUrl)) continue;

      const companyName = metadataValue(job, '포지션의 소속 자회사를 선택해 주세요.') ?? '토스';
      const employmentType = metadataValue(job, 'Employment_Type');
      const location = job?.location?.name;
      const listDescription =
        typeof job?.content === 'string' && job.content.trim().length > 80 ? job.content : undefined;

      const jobId = job?.id ?? group.id;
      const detailApiUrl =
        typeof jobId === 'number'
          ? `https://api-public.toss.im/api/v3/ipd-eggnog/career/jobs/${jobId}`
          : undefined;

      seen.add(applyUrl);
      candidates.push({
        title: normalizeJobTitle(title),
        applyUrl,
        companyName,
        dedupeKey: applyUrl,
        locationHint: location,
        roleHint: employmentType,
        listDescription,
        detailApiUrl,
      });
    }

    return candidates;
  } catch {
    return [];
  }
}
