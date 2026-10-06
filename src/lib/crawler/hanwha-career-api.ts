import { BROWSER_AJAX_HEADERS } from '@/lib/crawler/browser-headers';
import { buildDescription, textSection } from '@/lib/crawler/map-fields';
import { isInvalidJobDescription } from '@/lib/crawler/job-quality';
import type { JobDetailFetchResult } from '@/lib/crawler/fetch-job-detail';

const HANWHAIN_DETAIL_API = 'https://hwadm.hanwhain.com/new-backend/portal/api/rcRecruit/get-rcrt';

function parseHanwhainDeadline(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const match = value.match(/(\d{4})\.(\d{2})\.(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

export function parseHanwhainRtSeq(applyUrl: string): string | null {
  try {
    const url = new URL(applyUrl);
    if (!/hanwhain\.com$/i.test(url.hostname)) return null;
    const rtSeq = url.searchParams.get('rtSeq');
    return rtSeq && /^\d+$/.test(rtSeq) ? rtSeq : null;
  } catch {
    return null;
  }
}

function buildHanwhainDescription(item: Record<string, unknown>): string {
  const units = Array.isArray(item.unitDt) ? (item.unitDt as Record<string, unknown>[]) : [];

  const unitSections = units
    .map((unit) => {
      const name = typeof unit.ruNm === 'string' ? unit.ruNm.trim() : '';
      const detail = typeof unit.ruDtlJob === 'string' ? unit.ruDtlJob.trim() : '';
      const workplace = typeof unit.ruWorkpl === 'string' ? unit.ruWorkpl.trim() : '';
      const headcount = typeof unit.ruRcrtPrsn === 'string' ? unit.ruRcrtPrsn.trim() : '';
      if (!detail) return '';

      return [
        name ? `<strong>${name}</strong>` : '',
        textSection('근무 지역', workplace),
        textSection('모집 인원', headcount),
        textSection('상세', detail),
      ]
        .filter(Boolean)
        .join('');
    })
    .join('');

  return buildDescription([
    textSection('자격 요건', item.rtExmQlf as string | undefined),
    textSection('전형 절차', item.rtExmProc as string | undefined),
    textSection('접수 기간', item.rtRctPrd as string | undefined),
    textSection('기타', item.rtEct as string | undefined),
    unitSections,
  ]);
}

export async function fetchHanwhainRecruitDetail(
  rtSeq: string,
  referer: string,
): Promise<JobDetailFetchResult | null> {
  try {
    const res = await fetch(HANWHAIN_DETAIL_API, {
      method: 'POST',
      headers: {
        ...BROWSER_AJAX_HEADERS,
        Referer: referer,
        Origin: 'https://www.hanwhain.com',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rtSeq: Number(rtSeq) }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;

    const payload = (await res.json()) as {
      success?: boolean;
      data?: { item?: Record<string, unknown> };
    };
    const item = payload.data?.item;
    if (!item) return null;

    const title = typeof item.rtNm === 'string' ? item.rtNm.trim() : '';
    const companyName = typeof item.sdNm === 'string' ? item.sdNm.trim() : undefined;
    const description = buildHanwhainDescription(item);
    if (!title || isInvalidJobDescription(description)) return null;

    return {
      title,
      companyName,
      deadline: parseHanwhainDeadline(item.rtAcptEndDttm),
      description,
    };
  } catch {
    return null;
  }
}
