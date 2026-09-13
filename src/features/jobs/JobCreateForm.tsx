'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, FieldLabel } from '@/components/ui/Card';
import AutoGrowTextarea from '@/components/ui/AutoGrowTextarea';
import { authInputClassName } from '@/lib/auth-ui';
import { loadBizVerify } from '@/lib/biz-verify-store';
import { addDaysToKoreaDate, getKoreaDateLocalToday } from '@/lib/datetime';
import { formatJobPayLabel, formatPayAmountInput, parsePayLabel, PAY_UNIT_LABELS } from '@/lib/job-display';
import { firstRequiredError } from '@/lib/form-required';
import { attachJobCompany } from '@/lib/job-company';
import { createJobPostingId, saveMyJobPosting } from '@/lib/my-job-posts';
import { syncMyJobPosting } from '@/lib/posting-sync';
import { cn } from '@/lib/utils';
import {
  CAREER_TYPE_LABELS,
  JOB_CAREER_TYPES,
  JOB_EDUCATION_OPTIONS,
  JOB_POSITION_OPTIONS,
  JOB_PROBATION_OPTIONS,
  JOB_WORK_DAY_OPTIONS,
  JOB_WORK_TYPES,
  PAY_TYPE_LABELS,
  WORK_TYPE_LABELS,
  isJobCareerType,
  isJobEducation,
  isJobPayType,
  isJobWorkType,
  isPublishedJob,
  jobPositionLabel,
  jobWorkTypes,
  type JobCareerType,
  type JobEducation,
  type JobPayType,
  type JobPosting,
  type JobWorkType,
} from '@/types/job';

const PAY_TYPES = Object.keys(PAY_TYPE_LABELS) as JobPayType[];

const controlClassName =
  'rounded-xl border border-border-strong bg-surface px-4 py-3 text-sm font-medium text-foreground outline-none transition placeholder:text-subtle placeholder:font-normal focus:border-primary focus:ring-2 focus:ring-primary/25 sm:text-base';

const amountInputClassName = cn(controlClassName, 'w-28 text-right tabular-nums sm:w-32');

function PlaceholderOption() {
  return <option value="">선택</option>;
}

const textareaClassName = `${authInputClassName} min-h-36 leading-relaxed`;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border-t border-border py-7 first:border-t-0 first:pt-0 last:pb-0">
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

type JobDraft = {
  title: string;
  workTypes: JobWorkType[];
  headcount: string;
  careerType: JobCareerType | '';
  education: JobEducation | '';
  location: string;
  workDays: string;
  workHours: string;
  positionLevel: string;
  probation: string;
  alwaysOpen: boolean;
  deadline: string;
  payType: JobPayType | '';
  payAmount: string;
  payNegotiable: boolean;
  summary: string;
  requirements: string;
  preferred: string;
  benefits: string;
  process: string;
  company: string;
  bizNumber: string;
};

function encodeJobDraft(draft: JobDraft): string {
  return JSON.stringify(draft);
}

export default function JobCreateForm({
  userId,
  companyName,
  businessNumber,
  initialJob,
  returnPath,
  companyEditable = false,
  onSave,
  onCancel,
}: {
  userId: string;
  companyName: string;
  businessNumber: string;
  initialJob?: JobPosting;
  returnPath?: string;
  companyEditable?: boolean;
  onSave?: (job: JobPosting) => Promise<void>;
  onCancel: () => void;
}) {
  const router = useRouter();
  const today = getKoreaDateLocalToday();
  const editing = Boolean(initialJob);
  const initialPay = initialJob
    ? initialJob.payType
      ? {
          payType: initialJob.payType,
          amount: initialJob.payAmount ?? '',
          negotiable: Boolean(initialJob.payNegotiable),
        }
      : parsePayLabel(initialJob.payLabel)
    : { payType: '' as JobPayType | '', amount: '', negotiable: false };
  const initialDraft: JobDraft = {
    title: initialJob?.title ?? '',
    workTypes: initialJob ? jobWorkTypes(initialJob) : [],
    headcount: String(initialJob?.headcount || 1),
    careerType: initialJob?.careerType && isJobCareerType(initialJob.careerType) ? initialJob.careerType : '',
    education: initialJob?.education && isJobEducation(initialJob.education) ? initialJob.education : '',
    location: initialJob?.location ?? '',
    workDays: initialJob?.workDays ?? '',
    workHours: initialJob?.workHours ?? '',
    positionLevel: jobPositionLabel(initialJob?.positionLevel) ?? '',
    probation: initialJob?.probation ?? '',
    alwaysOpen: initialJob?.deadline === 'open',
    deadline:
      initialJob?.deadline && initialJob.deadline !== 'open'
        ? initialJob.deadline
        : addDaysToKoreaDate(today, 30),
    payType: initialPay.payType,
    payAmount: initialPay.amount,
    payNegotiable: initialPay.negotiable,
    summary: initialJob?.summary ?? '',
    requirements: initialJob?.requirements ?? '',
    preferred: initialJob?.preferred ?? '',
    benefits: initialJob?.benefits ?? '',
    process: initialJob?.process ?? '',
    company: companyName,
    bizNumber: businessNumber,
  };
  const [title, setTitle] = useState(initialDraft.title);
  const [workTypes, setWorkTypes] = useState<JobWorkType[]>(initialDraft.workTypes);
  const [headcount, setHeadcount] = useState(initialDraft.headcount);
  const [careerType, setCareerType] = useState<JobCareerType | ''>(initialDraft.careerType);
  const [education, setEducation] = useState<JobEducation | ''>(initialDraft.education);
  const [location, setLocation] = useState(initialDraft.location);
  const [workDays, setWorkDays] = useState(initialDraft.workDays);
  const [workHours, setWorkHours] = useState(initialDraft.workHours);
  const [positionLevel, setPositionLevel] = useState(initialDraft.positionLevel);
  const [probation, setProbation] = useState(initialDraft.probation);
  const [alwaysOpen, setAlwaysOpen] = useState(initialDraft.alwaysOpen);
  const [deadline, setDeadline] = useState(initialDraft.deadline);
  const [payType, setPayType] = useState<JobPayType | ''>(initialDraft.payType);
  const [payAmount, setPayAmount] = useState(initialDraft.payAmount);
  const [payNegotiable, setPayNegotiable] = useState(initialDraft.payNegotiable);
  const [summary, setSummary] = useState(initialDraft.summary);
  const [requirements, setRequirements] = useState(initialDraft.requirements);
  const [preferred, setPreferred] = useState(initialDraft.preferred);
  const [benefits, setBenefits] = useState(initialDraft.benefits);
  const [process, setProcess] = useState(initialDraft.process);
  const [company, setCompany] = useState(initialDraft.company);
  const [bizNumber, setBizNumber] = useState(initialDraft.bizNumber);
  const [savedDraft, setSavedDraft] = useState(() => encodeJobDraft(initialDraft));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function currentDraft(): JobDraft {
    return {
      title,
      workTypes,
      headcount,
      careerType,
      education,
      location,
      workDays,
      workHours,
      positionLevel,
      probation,
      alwaysOpen,
      deadline,
      payType,
      payAmount,
      payNegotiable,
      summary,
      requirements,
      preferred,
      benefits,
      process,
      company,
      bizNumber,
    };
  }

  const dirty = encodeJobDraft(currentDraft()) !== savedDraft;

  function restoreDraft() {
    const draft = JSON.parse(savedDraft) as JobDraft;
    setTitle(draft.title);
    setWorkTypes(draft.workTypes.filter(isJobWorkType));
    setHeadcount(draft.headcount);
    setCareerType(isJobCareerType(draft.careerType) ? draft.careerType : '');
    setEducation(isJobEducation(draft.education) ? draft.education : '');
    setLocation(draft.location);
    setWorkDays(draft.workDays);
    setWorkHours(draft.workHours);
    setPositionLevel(draft.positionLevel);
    setProbation(draft.probation);
    setAlwaysOpen(draft.alwaysOpen);
    setDeadline(draft.deadline);
    setPayType(draft.payType);
    setPayAmount(draft.payAmount);
    setPayNegotiable(draft.payNegotiable);
    setSummary(draft.summary);
    setRequirements(draft.requirements);
    setPreferred(draft.preferred);
    setBenefits(draft.benefits);
    setProcess(draft.process);
    setCompany(draft.company);
    setBizNumber(draft.bizNumber);
    setError('');
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const count = Math.floor(Number(headcount));
    const payLabel = isJobPayType(payType) ? formatJobPayLabel(payType, payAmount, payNegotiable) : '';
    const requiredError = firstRequiredError([
      { ok: !companyEditable || Boolean(company.trim()), message: '회사명을 입력해 주세요.' },
      { ok: Boolean(title.trim()), message: '채용 제목을 입력해 주세요.' },
      { ok: workTypes.length > 0, message: '근무 형태를 하나 이상 선택해 주세요.' },
      { ok: Number.isFinite(count) && count >= 1, message: '모집 인원을 입력해 주세요.' },
      { ok: isJobPayType(payType), message: '지급 기준을 선택해 주세요.' },
      { ok: Boolean(payLabel), message: '급여를 입력하거나 협의 가능을 선택해 주세요.' },
      { ok: isJobCareerType(careerType), message: '경력 유무를 선택해 주세요.' },
      { ok: isJobEducation(education), message: '학력을 선택해 주세요.' },
      { ok: Boolean(location.trim()), message: '근무지를 입력해 주세요.' },
      { ok: alwaysOpen || Boolean(deadline), message: '접수 마감을 선택해 주세요.' },
      { ok: Boolean(summary.trim()), message: '담당 업무를 입력해 주세요.' },
    ]);
    if (requiredError) {
      setError(requiredError);
      return;
    }
    if (workTypes.length === 0 || !isJobCareerType(careerType) || !isJobEducation(education) || !isJobPayType(payType)) {
      return;
    }
    setError('');
    setSaving(true);
    const job: JobPosting = attachJobCompany(
      {
        id: initialJob?.id ?? createJobPostingId(userId),
        title: title.trim(),
        companyName: company.trim() || companyName,
        businessNumber: bizNumber.trim() || undefined,
        workType: workTypes[0],
        workTypes,
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
        workDays: workDays.trim() || undefined,
        positionLevel: positionLevel.trim() || undefined,
        probation: probation.trim() || undefined,
        process: process.trim() || undefined,
        headcount: count,
        careerType,
        education,
        deadline: alwaysOpen ? 'open' : deadline,
        createdAt: initialJob?.createdAt ?? today,
        status: initialJob && isPublishedJob(initialJob) ? (initialJob.status ?? 'published') : 'draft',
      },
      userId,
    );
    saveMyJobPosting(userId, job);
    try {
      if (onSave) await onSave(job);
      else await syncMyJobPosting(job);
      setSavedDraft(encodeJobDraft(currentDraft()));
      router.push(returnPath || (isPublishedJob(job) ? `/jobs/${job.id}` : '/mypage?tab=jobs&sub=jobs'));
    } catch {
      setSaving(false);
      setError('저장에 실패했습니다. 다시 시도해 주세요.');
    }
  }

  const companyIntro = loadBizVerify(userId)?.intro?.trim() || initialJob?.company?.intro?.trim() || '';

  return (
    <Card
      title={editing ? '채용 정보 수정' : '채용 정보 작성'}
      description={
        editing
          ? '수정한 내용은 저장됩니다. 공개 여부는 바꾸지 않습니다.'
          : '구직자에게 보이는 채용 정보를 입력합니다. 저장한 뒤 마이페이지에서 공개할 수 있습니다.'
      }
      action={
        <Button type="button" variant="secondary" disabled={saving} onClick={onCancel}>
          돌아가기
        </Button>
      }
    >
      <form className="space-y-0" onSubmit={handleSubmit} noValidate>
        <Section title="회사 정보">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="job-company" required={companyEditable}>
                회사명
              </FieldLabel>
              <input
                id="job-company"
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                className={authInputClassName}
                readOnly={!companyEditable}
                required={companyEditable}
              />
            </div>
            <div>
              <FieldLabel htmlFor="job-biz-number">사업자등록번호</FieldLabel>
              <input
                id="job-biz-number"
                value={bizNumber}
                onChange={(event) => setBizNumber(event.target.value)}
                className={authInputClassName}
                readOnly={!companyEditable}
              />
            </div>
          </div>
          {companyIntro ? (
            <div>
              <FieldLabel>회사 소개</FieldLabel>
              <p className="whitespace-pre-wrap rounded-xl border border-border bg-neutral-50 px-4 py-3 text-sm leading-relaxed text-foreground">
                {companyIntro}
              </p>
              <p className="mt-1.5 text-xs text-subtle">마이페이지 회사 정보에 저장된 소개이며, 채용 정보에도 함께 공개됩니다.</p>
            </div>
          ) : null}
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
          <div>
            <FieldLabel required>근무 형태</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {JOB_WORK_TYPES.map((item) => {
                const active = workTypes.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setWorkTypes((current) => {
                        const next = current.includes(item)
                          ? current.filter((value) => value !== item)
                          : [...current, item];
                        return JOB_WORK_TYPES.filter((value) => next.includes(value));
                      });
                      setError('');
                    }}
                    className={cn(
                      'rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                      active
                        ? 'bg-primary text-white shadow-sm'
                        : 'border border-border-strong bg-surface text-foreground hover:bg-neutral-50',
                    )}
                  >
                    {WORK_TYPE_LABELS[item]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 items-end gap-4 md:flex md:flex-nowrap">
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
                <FieldLabel htmlFor="job-pay-type" required>
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
                    {payType ? PAY_UNIT_LABELS[payType] : '원'}
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
            <div className="grid grid-cols-2 items-end gap-4 lg:grid-cols-4">
              <div className="min-w-0">
                <FieldLabel htmlFor="job-career" required>
                  경력 유무
                </FieldLabel>
                <select
                  id="job-career"
                  value={careerType}
                  onChange={(event) => {
                    const next = event.target.value;
                    setCareerType(isJobCareerType(next) ? next : '');
                  }}
                  className={cn(controlClassName, 'w-full', !careerType && 'font-normal text-subtle')}
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
                  className={cn(controlClassName, 'w-full', !education && 'font-normal text-subtle')}
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
              <div className="min-w-0">
                <FieldLabel htmlFor="job-position" optional>
                  직급/직책
                </FieldLabel>
                <select
                  id="job-position"
                  value={positionLevel}
                  onChange={(event) => setPositionLevel(event.target.value)}
                  className={cn(controlClassName, 'w-full', !positionLevel && 'font-normal text-subtle')}
                >
                  <PlaceholderOption />
                  {JOB_POSITION_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0">
                <FieldLabel htmlFor="job-probation" optional>
                  수습 기간
                </FieldLabel>
                <select
                  id="job-probation"
                  value={probation}
                  onChange={(event) => setProbation(event.target.value)}
                  className={cn(controlClassName, 'w-full', !probation && 'font-normal text-subtle')}
                >
                  <PlaceholderOption />
                  {JOB_PROBATION_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
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
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-6">
            <div className="min-w-0">
              <FieldLabel htmlFor="job-work-days" optional>
                근무 요일
              </FieldLabel>
              <select
                id="job-work-days"
                value={workDays}
                onChange={(event) => setWorkDays(event.target.value)}
                className={cn(controlClassName, 'w-full sm:w-44', !workDays && 'font-normal text-subtle')}
              >
                <PlaceholderOption />
                {JOB_WORK_DAY_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0 w-full sm:max-w-xs">
              <FieldLabel htmlFor="job-hours" optional>
                근무 시간
              </FieldLabel>
              <input
                id="job-hours"
                value={workHours}
                onChange={(event) => setWorkHours(event.target.value)}
                className={authInputClassName}
                placeholder="예: 09:00~18:00"
              />
            </div>
            <div className="shrink-0">
              <FieldLabel htmlFor="job-deadline" required={!alwaysOpen}>접수 마감</FieldLabel>
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
          </div>
        </Section>

        <Section title="상세 내용">
          <div>
            <FieldLabel htmlFor="job-summary" required>
              담당 업무
            </FieldLabel>
            <AutoGrowTextarea
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
            <AutoGrowTextarea
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
            <AutoGrowTextarea
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
            <AutoGrowTextarea
              id="job-benefits"
              value={benefits}
              onChange={(event) => setBenefits(event.target.value)}
              className={textareaClassName}
              placeholder="예: 4대보험, 중식 제공, 교통비 지원"
            />
          </div>
          <div>
            <FieldLabel htmlFor="job-process" optional>
              전형 절차
            </FieldLabel>
            <input
              id="job-process"
              value={process}
              onChange={(event) => setProcess(event.target.value)}
              className={authInputClassName}
              placeholder="예: 서류 전형 → 면접 → 최종 합격"
            />
          </div>
        </Section>

        {error ? <p className="pt-4 text-sm text-danger">{error}</p> : null}

        <div className="mt-6 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
          <Button type="submit" fullWidth disabled={!dirty || saving}>
            {saving ? '저장 중…' : '저장'}
          </Button>
          {dirty ? (
            <Button type="button" variant="secondary" fullWidth disabled={saving} onClick={restoreDraft}>
              취소
            </Button>
          ) : null}
          <Button type="button" variant="secondary" fullWidth disabled={saving} onClick={onCancel}>
            돌아가기
          </Button>
        </div>
      </form>
    </Card>
  );
}
