import { formatKoreaDateWithWeekday } from '@/lib/datetime';
import {
  CAREER_TYPE_LABELS,
  PAY_TYPE_LABELS,
  type JobCareerType,
  type JobPayType,
  type JobPosting,
} from '@/types/job';

export function formatJobPayLabel(
  payType: JobPayType,
  amountRaw: string,
  negotiable: boolean,
): string {
  const amount = Number(amountRaw.replace(/[^\d]/g, ''));
  const hasAmount = Number.isFinite(amount) && amount > 0;
  const formatted = amount.toLocaleString('ko-KR');
  const body = hasAmount
    ? payType === 'monthly'
      ? `월급 ${amount}만원`
      : payType === 'hourly'
        ? `시급 ${formatted}원`
        : payType === 'daily'
          ? `일급 ${formatted}원`
          : `건당 ${formatted}원`
    : '';

  if (negotiable) {
    const typeLabel = payType === 'per_task' ? '건당' : PAY_TYPE_LABELS[payType];
    return body ? `${body} (협의가능)` : `${typeLabel} 협의`;
  }
  return body;
}

export function formatPayAmountInput(digits: string): string {
  if (!digits) return '';
  const amount = Number(digits.replace(/[^\d]/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) return '';
  return amount.toLocaleString('ko-KR');
}

export function jobCareerLabel(job: Pick<JobPosting, 'careerType' | 'careerMinYears'>): string | null {
  if (!job.careerType) return null;
  if (job.careerType === 'experienced' && job.careerMinYears && job.careerMinYears > 0) {
    return `경력 ${job.careerMinYears}년 이상`;
  }
  return CAREER_TYPE_LABELS[job.careerType];
}

export function jobDeadlineLabel(deadline?: string): string {
  if (!deadline || deadline === 'open') return '상시채용';
  return `${formatKoreaDateWithWeekday(deadline)} 마감`;
}

export function jobHeadcountLabel(headcount?: number): string | null {
  if (!headcount || headcount < 1) return null;
  return `${headcount}명`;
}

export function jobSearchText(job: JobPosting): string {
  return [
    job.title,
    job.companyName,
    job.location,
    job.summary,
    job.payLabel,
    job.workHours,
    job.education,
    job.requirements,
    job.preferred,
    job.benefits,
    jobCareerLabel(job),
    ...job.tags,
  ]
    .filter(Boolean)
    .join(' ');
}
