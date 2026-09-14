import { formatKoreaDateWithWeekday } from '@/lib/datetime';
import {
  CAREER_TYPE_LABELS,
  PAY_TYPE_LABELS,
  isJobCareerType,
  isJobEducation,
  jobPositionLabel,
  jobWorkTypesLabel,
  parseCareerYears,
  type JobPayType,
  type JobPosting,
} from '@/types/job';

export function jobEducationLabel(value?: string): string | undefined {
  if (!value || !isJobEducation(value)) return undefined;
  return value;
}

export function formatJobPayLabel(
  payType: JobPayType,
  amountRaw: string,
  negotiable: boolean,
): string {
  const amount = Number(amountRaw.replace(/[^\d]/g, ''));
  const hasAmount = Number.isFinite(amount) && amount > 0;
  const formatted = amount.toLocaleString('ko-KR');
  const body = hasAmount
    ? payType === 'yearly'
      ? `연봉 ${amount}만원`
      : payType === 'monthly'
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

export const PAY_UNIT_LABELS: Record<JobPayType, string> = {
  hourly: '원 / 시간',
  daily: '원 / 일',
  monthly: '만원 / 월',
  yearly: '만원 / 년',
  per_task: '원 / 건',
};

export function parsePayLabel(label: string): {
  payType: JobPayType | '';
  amount: string;
  negotiable: boolean;
} {
  const text = label.trim();
  const negotiable = /협의/.test(text);
  const digits = text.replace(/[^\d]/g, '');
  if (/시급/.test(text)) return { payType: 'hourly', amount: digits, negotiable };
  if (/일급/.test(text)) return { payType: 'daily', amount: digits, negotiable };
  if (/건당|건별/.test(text)) return { payType: 'per_task', amount: digits, negotiable };
  if (/연봉/.test(text)) return { payType: 'yearly', amount: digits, negotiable };
  if (/월급/.test(text)) return { payType: 'monthly', amount: digits, negotiable };
  return { payType: '', amount: '', negotiable };
}

export function formatPayAmountInput(digits: string): string {
  if (!digits) return '';
  const amount = Number(digits.replace(/[^\d]/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) return '';
  return amount.toLocaleString('ko-KR');
}

export function jobCareerLabel(job: Pick<JobPosting, 'careerType' | 'careerMinYears'>): string | null {
  if (!job.careerType || !isJobCareerType(job.careerType)) return null;
  if (job.careerType === 'experienced') {
    const years = parseCareerYears(job.careerMinYears);
    return years ? `경력 ${years}년 이상` : CAREER_TYPE_LABELS.experienced;
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

export function jobOutlineItems(job: JobPosting): Array<{ label: string; value?: string | null }> {
  return [
    { label: '채용 제목', value: job.title },
    { label: '근무 형태', value: jobWorkTypesLabel(job) },
    { label: '모집 인원', value: jobHeadcountLabel(job.headcount) },
    { label: '지급 기준', value: job.payLabel },
    { label: '경력 유무', value: jobCareerLabel(job) },
    { label: '학력', value: jobEducationLabel(job.education) },
    { label: '직급/직책', value: jobPositionLabel(job.positionLevel) },
    { label: '수습 기간', value: job.probation },
    { label: '근무지', value: job.location },
    { label: '근무 요일', value: job.workDays },
    { label: '근무 시간', value: job.workHours },
    { label: '접수 마감', value: jobDeadlineLabel(job.deadline) },
  ];
}

export function jobDetailItems(job: JobPosting): Array<{ label: string; value?: string | null }> {
  return [
    { label: '담당 업무', value: job.summary },
    { label: '자격 요건', value: job.requirements },
    { label: '우대 사항', value: job.preferred },
    { label: '복리후생', value: job.benefits },
    { label: '전형 절차', value: job.process },
  ];
}

export function jobSearchText(job: JobPosting): string {
  return [
    job.title,
    job.companyName,
    job.location,
    job.summary,
    job.payLabel,
    job.workHours,
    job.workDays,
    jobEducationLabel(job.education),
    jobPositionLabel(job.positionLevel),
    job.probation,
    job.requirements,
    job.preferred,
    job.benefits,
    job.process,
    jobCareerLabel(job),
    jobWorkTypesLabel(job),
  ]
    .filter(Boolean)
    .join(' ');
}
