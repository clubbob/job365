'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, FieldLabel } from '@/components/ui/Card';
import { authInputClassName } from '@/lib/auth-ui';
import { addDaysToKoreaDate, getKoreaDateLocalToday } from '@/lib/datetime';
import { formatJobPayLabel, formatPayAmountInput } from '@/lib/job-display';
import { saveMyJobPosting } from '@/lib/my-job-posts';
import { cn } from '@/lib/utils';
import {
  CAREER_TYPE_LABELS,
  JOB_CAREER_TYPES,
  JOB_EDUCATION_OPTIONS,
  JOB_WORK_TYPES,
  PAY_TYPE_LABELS,
  WORK_TYPE_LABELS,
  isJobCareerType,
  isJobEducation,
  isJobPayType,
  isJobWorkType,
  type JobCareerType,
  type JobEducation,
  type JobPayType,
  type JobPosting,
  type JobWorkType,
} from '@/types/job';

const PAY_TYPES = Object.keys(PAY_TYPE_LABELS) as JobPayType[];

const PAY_UNIT: Record<JobPayType, string> = {
  hourly: '원 / 시간',
  daily: '원 / 일',
  monthly: '만원 / 월',
  per_task: '원 / 건',
};

const controlClassName =
  'rounded-xl border border-border-strong bg-surface px-4 py-3 text-sm font-medium text-foreground outline-none transition placeholder:text-subtle placeholder:font-normal focus:border-primary focus:ring-2 focus:ring-primary/25 sm:text-base';

const amountInputClassName = cn(controlClassName, 'w-28 text-right tabular-nums sm:w-32');

function PlaceholderOption() {
  return <option value="">선택</option>;
}

const textareaClassName = `${authInputClassName} min-h-36 resize-y leading-relaxed`;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border-t border-border py-7 first:border-t-0 first:pt-0 last:pb-0">
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

export default function JobCreateForm({
  userId,
  companyName,
  businessNumber,
  onCancel,
}: {
  userId: string;
  companyName: string;
  businessNumber: string;
  onCancel: () => void;
}) {
  const router = useRouter();
  const today = getKoreaDateLocalToday();
  const [title, setTitle] = useState('');
  const [workType, setWorkType] = useState<JobWorkType | ''>('');
  const [headcount, setHeadcount] = useState('1');
  const [careerType, setCareerType] = useState<JobCareerType | ''>('');
  const [careerMinYears, setCareerMinYears] = useState('1');
  const [education, setEducation] = useState<JobEducation | ''>('');
  const [location, setLocation] = useState('');
  const [workHours, setWorkHours] = useState('');
  const [alwaysOpen, setAlwaysOpen] = useState(false);
  const [deadline, setDeadline] = useState(addDaysToKoreaDate(today, 30));
  const [payType, setPayType] = useState<JobPayType | ''>('');
  const [payAmount, setPayAmount] = useState('');
  const [payNegotiable, setPayNegotiable] = useState(false);
  const [summary, setSummary] = useState('');
  const [requirements, setRequirements] = useState('');
  const [preferred, setPreferred] = useState('');
  const [benefits, setBenefits] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isJobWorkType(workType) || !isJobCareerType(careerType) || !isJobEducation(education) || !isJobPayType(payType)) {
      setError('근무 형태, 경력, 학력, 지급 기준을 선택해 주세요.');
      return;
    }
    const payLabel = formatJobPayLabel(payType, payAmount, payNegotiable);
    if (!payLabel) {
      setError('급여를 입력하거나 협의 가능을 선택해 주세요.');
      return;
    }
    const count = Math.max(1, Math.floor(Number(headcount) || 1));
    const years = Math.max(1, Math.floor(Number(careerMinYears) || 1));
    setError('');
    setSaving(true);
    const job: JobPosting = {
      id: `job-me-${userId}-${Date.now()}`,
      title: title.trim(),
      companyName,
      businessNumber,
      workType,
      payType,
      payLabel,
      payAmount: payAmount.replace(/[^\d]/g, ''),
      payNegotiable,
      location: location.trim(),
      summary: summary.trim(),
      requirements: requirements.trim() || undefined,
      preferred: preferred.trim() || undefined,
      benefits: benefits.trim() || undefined,
      workHours: workHours.trim() || undefined,
      headcount: count,
      careerType,
      careerMinYears: careerType === 'experienced' ? years : undefined,
      education,
      deadline: alwaysOpen ? 'open' : deadline,
      tags: tags
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      createdAt: today,
    };
    saveMyJobPosting(userId, job);
    router.push(`/jobs/${job.id}`);
  }

  return (
    <Card
      title="채용 정보 작성"
      description="구직자에게 보이는 채용 정보를 입력합니다. 등록하면 채용 정보 목록에 바로 게시됩니다."
    >
      <form className="space-y-0" onSubmit={handleSubmit}>
        <Section title="회사 정보">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="job-company">회사명</FieldLabel>
              <input id="job-company" value={companyName} className={authInputClassName} readOnly />
            </div>
            <div>
              <FieldLabel htmlFor="job-biz-number">사업자등록번호</FieldLabel>
              <input id="job-biz-number" value={businessNumber} className={authInputClassName} readOnly />
            </div>
          </div>
        </Section>

        <Section title="모집 요강">
          <div>
            <FieldLabel htmlFor="job-title" required>
              채용 제목
            </FieldLabel>
            <input
              id="job-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={authInputClassName}
              placeholder="예: 고객센터 상담원 정규직"
              maxLength={80}
              required
            />
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 items-end gap-4 md:flex md:flex-nowrap">
              <div className="min-w-0">
                <FieldLabel htmlFor="job-work-type" required>
                  근무 형태
                </FieldLabel>
                <select
                  id="job-work-type"
                  value={workType}
                  onChange={(event) => {
                    const next = event.target.value;
                    setWorkType(isJobWorkType(next) ? next : '');
                  }}
                  className={cn(controlClassName, 'w-full md:w-40', !workType && 'font-normal text-subtle')}
                  required
                >
                  <PlaceholderOption />
                  {JOB_WORK_TYPES.map((item) => (
                    <option key={item} value={item}>
                      {WORK_TYPE_LABELS[item]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0">
                <FieldLabel htmlFor="job-headcount" required>
                  모집 인원
                </FieldLabel>
                <div className="flex items-center gap-2">
                  <input
                    id="job-headcount"
                    type="number"
                    min={1}
                    max={99}
                    value={headcount}
                    onChange={(event) => setHeadcount(event.target.value)}
                    className={cn(controlClassName, 'w-full max-w-20 text-right tabular-nums')}
                    required
                  />
                  <span className="shrink-0 text-sm text-muted">명</span>
                </div>
              </div>
              <div className="col-span-2 min-w-0 md:flex-1">
                <FieldLabel htmlFor="job-pay-type" required={!payNegotiable}>
                  지급 기준
                </FieldLabel>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    id="job-pay-type"
                    value={payType}
                    onChange={(event) => {
                      const next = event.target.value;
                      setPayType(isJobPayType(next) ? next : '');
                      setPayAmount('');
                    }}
                    className={cn(controlClassName, 'w-28', !payType && 'font-normal text-subtle')}
                    required
                  >
                    <PlaceholderOption />
                    {PAY_TYPES.map((item) => (
                      <option key={item} value={item}>
                        {PAY_TYPE_LABELS[item]}
                      </option>
                    ))}
                  </select>
                  <input
                    id="job-pay"
                    inputMode="numeric"
                    value={formatPayAmountInput(payAmount)}
                    onChange={(event) => setPayAmount(event.target.value.replace(/[^\d]/g, ''))}
                    className={amountInputClassName}
                    placeholder="금액"
                    required={!payNegotiable}
                  />
                  <span className="shrink-0 whitespace-nowrap text-sm text-muted">
                    {payType ? PAY_UNIT[payType] : '원'}
                  </span>
                  <label className="flex shrink-0 items-center gap-2 whitespace-nowrap text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={payNegotiable}
                      onChange={(event) => setPayNegotiable(event.target.checked)}
                      className="size-4 accent-primary"
                    />
                    협의 가능
                  </label>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 items-end gap-4 md:flex md:flex-nowrap">
              <div className="min-w-0">
                <FieldLabel htmlFor="job-career" required>
                  경력
                </FieldLabel>
                <select
                  id="job-career"
                  value={careerType}
                  onChange={(event) => {
                    const next = event.target.value;
                    setCareerType(isJobCareerType(next) ? next : '');
                  }}
                  className={cn(controlClassName, 'w-full md:w-40', !careerType && 'font-normal text-subtle')}
                  required
                >
                  <PlaceholderOption />
                  {JOB_CAREER_TYPES.map((item) => (
                    <option key={item} value={item}>
                      {CAREER_TYPE_LABELS[item]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0">
                <FieldLabel htmlFor="job-education" required>
                  학력
                </FieldLabel>
                <select
                  id="job-education"
                  value={education}
                  onChange={(event) => {
                    const next = event.target.value;
                    setEducation(isJobEducation(next) ? next : '');
                  }}
                  className={cn(controlClassName, 'w-full md:w-52', !education && 'font-normal text-subtle')}
                  required
                >
                  <PlaceholderOption />
                  {JOB_EDUCATION_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          {careerType === 'experienced' ? (
            <div>
              <FieldLabel htmlFor="job-career-years" required>
                최소 경력
              </FieldLabel>
              <div className="flex items-center gap-2">
                <input
                  id="job-career-years"
                  type="number"
                  min={1}
                  max={40}
                  value={careerMinYears}
                  onChange={(event) => setCareerMinYears(event.target.value)}
                  className={cn(controlClassName, 'w-20 text-right tabular-nums')}
                  required
                />
                <span className="shrink-0 text-sm text-muted">년 이상</span>
              </div>
            </div>
          ) : null}
          <div>
            <FieldLabel htmlFor="job-location" required>
              근무지
            </FieldLabel>
            <input
              id="job-location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className={authInputClassName}
              placeholder="예: 서울 구로구 디지털로 300"
              required
            />
          </div>
          <div>
            <FieldLabel htmlFor="job-hours" optional>
              근무 시간
            </FieldLabel>
            <input
              id="job-hours"
              value={workHours}
              onChange={(event) => setWorkHours(event.target.value)}
              className={authInputClassName}
              placeholder="예: 주 5일, 09:00~18:00 (휴게 1시간)"
            />
          </div>
          <div>
            <FieldLabel htmlFor="job-deadline">접수 마감</FieldLabel>
            <div className="flex flex-wrap items-center gap-3">
              <input
                id="job-deadline"
                type="date"
                min={today}
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
                className={cn(controlClassName, 'w-44', alwaysOpen && 'text-subtle')}
                disabled={alwaysOpen}
                required={!alwaysOpen}
              />
              <label className="flex shrink-0 items-center gap-2 whitespace-nowrap text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={alwaysOpen}
                  onChange={(event) => setAlwaysOpen(event.target.checked)}
                  className="size-4 accent-primary"
                />
                상시채용
              </label>
            </div>
          </div>
        </Section>

        <Section title="상세 내용">
          <div>
            <FieldLabel htmlFor="job-summary" required>
              담당 업무
            </FieldLabel>
            <textarea
              id="job-summary"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              className={textareaClassName}
              placeholder={'담당하게 될 업무를 구체적으로 적어 주세요.\n예: 자사몰 전화·채팅 문의 응대, 주문 취소·교환 처리'}
              required
            />
          </div>
          <div>
            <FieldLabel htmlFor="job-requirements" optional>
              자격 요건
            </FieldLabel>
            <textarea
              id="job-requirements"
              value={requirements}
              onChange={(event) => setRequirements(event.target.value)}
              className={textareaClassName}
              placeholder={'필수 자격과 경력을 적어 주세요.\n예: 고객상담 경력 1년 이상, 컴퓨터 기본 활용'}
            />
          </div>
          <div>
            <FieldLabel htmlFor="job-preferred" optional>
              우대 사항
            </FieldLabel>
            <textarea
              id="job-preferred"
              value={preferred}
              onChange={(event) => setPreferred(event.target.value)}
              className={textareaClassName}
              placeholder="예: 관련 자격증, 동종업계 경력"
            />
          </div>
          <div>
            <FieldLabel htmlFor="job-benefits" optional>
              복리후생
            </FieldLabel>
            <textarea
              id="job-benefits"
              value={benefits}
              onChange={(event) => setBenefits(event.target.value)}
              className={textareaClassName}
              placeholder="예: 4대보험, 중식 제공, 교통비 지원"
            />
          </div>
          <div>
            <FieldLabel htmlFor="job-tags" optional>
              키워드
            </FieldLabel>
            <input
              id="job-tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              className={authInputClassName}
              placeholder="쉼표로 구분 (예: 정규직, 4대보험, 주 5일)"
            />
          </div>
        </Section>

        {error ? <p className="pt-4 text-sm text-danger">{error}</p> : null}

        <div className="mt-6 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
          <Button type="submit" fullWidth disabled={saving}>
            {saving ? '등록 중…' : '채용 정보 등록'}
          </Button>
          <Button type="button" variant="secondary" fullWidth onClick={onCancel}>
            취소
          </Button>
        </div>
      </form>
    </Card>
  );
}
