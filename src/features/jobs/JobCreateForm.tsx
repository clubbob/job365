'use client';

import { useState } from 'react';

import { Button, Card, FieldLabel } from '@/components/ui/Card';
import AutoGrowTextarea from '@/components/ui/AutoGrowTextarea';
import CompanyInfoForm from '@/features/mypage/CompanyInfoForm';
import { authInputClassName } from '@/lib/auth-ui';
import { isCompanyInfoComplete, isJobCompanyComplete, loadBizVerify, toJobCompanyInfo } from '@/lib/biz-verify-store';
import { addDaysToKoreaDate, getKoreaDateLocalToday } from '@/lib/datetime';
import { formatJobPayLabel, formatPayAmountInput, parsePayLabel, PAY_UNIT_LABELS } from '@/lib/job-display';
import { firstRequiredError } from '@/lib/form-required';
import { attachJobCompany } from '@/lib/job-company';
import {
  canPublishMyJobPosting,
  createJobPostingId,
  getMyJobPosting,
  missingJobPublishRequirements,
  saveMyJobPosting,
} from '@/lib/my-job-posts';
import { syncMyJobPosting } from '@/lib/posting-sync';
import { cn } from '@/lib/utils';
import {
  compactRegions,
  isNationwideSelection,
  isOccupationOption,
  isRegionOption,
  locationLabelFromRegions,
  NATIONWIDE_REGION,
  OCCUPATION_OPTIONS,
  occupationsFromJob,
  REGION_OPTIONS,
  regionsFromJob,
  toggleRegionSelection,
  type OccupationOption,
  type RegionOption,
} from '@/lib/work-preferences';
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

const SECTIONS = [
  { id: 'company', label: '회사 정보' },
  { id: 'outline', label: '모집 요강' },
  { id: 'details', label: '상세 내용' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];
type SectionSnapshots = Record<SectionId, string>;

const PAY_TYPES = Object.keys(PAY_TYPE_LABELS) as JobPayType[];

const controlClassName =
  'rounded-xl border border-border-strong bg-surface px-4 py-3 text-sm font-medium text-foreground outline-none transition placeholder:text-subtle placeholder:font-normal focus:border-primary focus:ring-2 focus:ring-primary/25 sm:text-base';

const amountInputClassName = cn(controlClassName, 'w-28 text-right tabular-nums sm:w-32');

const textareaClassName = `${authInputClassName} min-h-36 leading-relaxed`;

function PlaceholderOption() {
  return <option value="">선택</option>;
}

function ChoiceGroup<T extends string>({
  legend,
  options,
  selected,
  required,
  isActive,
  labelOf,
  onToggle,
}: {
  legend: string;
  options: readonly T[];
  selected: T[];
  required?: boolean;
  isActive?: (value: T) => boolean;
  labelOf?: (value: T) => string;
  onToggle: (value: T) => void;
}) {
  return (
    <fieldset>
      <FieldLabel required={required}>{legend}</FieldLabel>
      <div className="flex flex-wrap gap-1.5">
        {options.map((item) => {
          const active = isActive ? isActive(item) : selected.includes(item);
          return (
            <button
              key={item}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(item)}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                active
                  ? 'bg-primary text-white shadow-sm'
                  : 'border border-border-strong bg-surface text-foreground hover:bg-neutral-50',
              )}
            >
              {labelOf ? labelOf(item) : item}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function toggleValue<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

type JobDraft = {
  title: string;
  workTypes: JobWorkType[];
  occupations: OccupationOption[];
  headcount: string;
  careerType: JobCareerType | '';
  education: JobEducation | '';
  regions: RegionOption[];
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
};

function snapshotsFromValues(values: JobDraft): SectionSnapshots {
  return {
    company: '{}',
    outline: JSON.stringify({
      title: values.title,
      workTypes: values.workTypes,
      occupations: values.occupations,
      headcount: values.headcount,
      careerType: values.careerType,
      education: values.education,
      regions: values.regions,
      workDays: values.workDays,
      workHours: values.workHours,
      positionLevel: values.positionLevel,
      probation: values.probation,
      alwaysOpen: values.alwaysOpen,
      deadline: values.deadline,
      payType: values.payType,
      payAmount: values.payAmount,
      payNegotiable: values.payNegotiable,
    }),
    details: JSON.stringify({
      summary: values.summary,
      requirements: values.requirements,
      preferred: values.preferred,
      benefits: values.benefits,
      process: values.process,
    }),
  };
}

function isSectionComplete(id: SectionId, values: JobDraft, companyComplete: boolean): boolean {
  switch (id) {
    case 'company':
      return companyComplete;
    case 'outline': {
      const count = Math.floor(Number(values.headcount));
      const payLabel = isJobPayType(values.payType)
        ? formatJobPayLabel(values.payType, values.payAmount, values.payNegotiable)
        : '';
      return (
        Boolean(values.title.trim()) &&
        values.workTypes.length > 0 &&
        values.occupations.length > 0 &&
        Number.isFinite(count) &&
        count >= 1 &&
        isJobPayType(values.payType) &&
        Boolean(payLabel) &&
        isJobCareerType(values.careerType) &&
        isJobEducation(values.education) &&
        values.regions.length > 0 &&
        Boolean(values.workDays.trim()) &&
        Boolean(values.workHours.trim()) &&
        (values.alwaysOpen || Boolean(values.deadline))
      );
    }
    case 'details':
      return Boolean(values.summary.trim()) && Boolean(values.process.trim());
  }
}

export default function JobCreateForm({
  userId,
  companyName,
  businessNumber,
  initialJob,
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
  const today = getKoreaDateLocalToday();
  const [jobId] = useState(() => initialJob?.id ?? createJobPostingId(userId));
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
    occupations: initialJob ? occupationsFromJob(initialJob) : [],
    headcount: String(initialJob?.headcount || 1),
    careerType: initialJob?.careerType && isJobCareerType(initialJob.careerType) ? initialJob.careerType : '',
    education: initialJob?.education && isJobEducation(initialJob.education) ? initialJob.education : '',
    regions: initialJob ? regionsFromJob(initialJob) : [],
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
  };
  const [title, setTitle] = useState(initialDraft.title);
  const [workTypes, setWorkTypes] = useState<JobWorkType[]>(initialDraft.workTypes);
  const [occupations, setOccupations] = useState<OccupationOption[]>(initialDraft.occupations);
  const [headcount, setHeadcount] = useState(initialDraft.headcount);
  const [careerType, setCareerType] = useState<JobCareerType | ''>(initialDraft.careerType);
  const [education, setEducation] = useState<JobEducation | ''>(initialDraft.education);
  const [regions, setRegions] = useState<RegionOption[]>(initialDraft.regions);
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
  const [companyComplete, setCompanyComplete] = useState(
    () => isJobCompanyComplete(initialJob?.company) || isCompanyInfoComplete(loadBizVerify(userId)),
  );
  const [savedSnapshots, setSavedSnapshots] = useState<SectionSnapshots>(() => snapshotsFromValues(initialDraft));
  const [savingSection, setSavingSection] = useState<SectionId | null>(null);
  const [savedSection, setSavedSection] = useState<SectionId | null>(null);
  const [error, setError] = useState<{ section: SectionId; message: string } | null>(null);

  function currentDraft(): JobDraft {
    return {
      title,
      workTypes,
      occupations,
      headcount,
      careerType,
      education,
      regions,
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
    };
  }

  function currentSnapshots(): SectionSnapshots {
    return snapshotsFromValues(currentDraft());
  }

  function isDirty(id: SectionId) {
    return currentSnapshots()[id] !== savedSnapshots[id];
  }

  function restoreSection(id: SectionId) {
    const parsed = JSON.parse(savedSnapshots[id]) as Record<string, unknown>;
    if (id === 'outline') {
      setTitle(String(parsed.title ?? ''));
      setWorkTypes(Array.isArray(parsed.workTypes) ? parsed.workTypes.filter(isJobWorkType) : []);
      setOccupations(Array.isArray(parsed.occupations) ? parsed.occupations.filter(isOccupationOption) : []);
      setHeadcount(String(parsed.headcount ?? ''));
      setCareerType(isJobCareerType(String(parsed.careerType ?? '')) ? (parsed.careerType as JobCareerType) : '');
      setEducation(isJobEducation(String(parsed.education ?? '')) ? (parsed.education as JobEducation) : '');
      setRegions(Array.isArray(parsed.regions) ? parsed.regions.filter(isRegionOption) : []);
      setWorkDays(String(parsed.workDays ?? ''));
      setWorkHours(String(parsed.workHours ?? ''));
      setPositionLevel(String(parsed.positionLevel ?? ''));
      setProbation(String(parsed.probation ?? ''));
      setAlwaysOpen(Boolean(parsed.alwaysOpen));
      setDeadline(String(parsed.deadline ?? ''));
      setPayType(isJobPayType(String(parsed.payType ?? '')) ? (parsed.payType as JobPayType) : '');
      setPayAmount(String(parsed.payAmount ?? ''));
      setPayNegotiable(Boolean(parsed.payNegotiable));
    } else {
      setSummary(String(parsed.summary ?? ''));
      setRequirements(String(parsed.requirements ?? ''));
      setPreferred(String(parsed.preferred ?? ''));
      setBenefits(String(parsed.benefits ?? ''));
      setProcess(String(parsed.process ?? ''));
    }
    setError(null);
    if (savedSection === id) setSavedSection(null);
  }

  function baseJob(): JobPosting {
    const existing = getMyJobPosting(userId, jobId) ?? initialJob;
    if (existing) return existing;
    return {
      id: jobId,
      title: '',
      companyName,
      workType: '' as JobWorkType,
      workTypes: [],
      payType: '' as JobPayType,
      payLabel: '',
      location: '',
      occupations: [],
      regions: [],
      summary: '',
      createdAt: today,
      status: 'draft',
    };
  }

  function mergeAndSave(section: SectionId, partial: Partial<JobPosting>) {
    const existing = baseJob();
    const next = attachJobCompany(
      {
        ...existing,
        id: jobId,
        ...partial,
        companyName: (partial.companyName ?? existing.companyName).trim() || companyName,
        createdAt: existing.createdAt || today,
        updatedAt: today,
        status: existing && isPublishedJob(existing) ? (existing.status ?? 'published') : 'draft',
      },
      userId,
    );
    saveMyJobPosting(userId, next);
    setSavingSection(section);
    setError(null);
    const encoded = currentSnapshots()[section];
    void (async () => {
      try {
        if (onSave) await onSave(next);
        else await syncMyJobPosting(next);
        setSavedSnapshots((current) => ({ ...current, [section]: encoded }));
        setSavedSection(section);
      } catch {
        setError({ section, message: '저장에 실패했습니다. 다시 시도해 주세요.' });
      } finally {
        setSavingSection(null);
      }
    })();
  }

  function rejectSave(section: SectionId, message: string) {
    setSavedSection(null);
    setError({ section, message });
  }

  function saveOutline(event: React.FormEvent) {
    event.preventDefault();
    const count = Math.floor(Number(headcount));
    const payLabel = isJobPayType(payType) ? formatJobPayLabel(payType, payAmount, payNegotiable) : '';
    const requiredError = firstRequiredError([
      { ok: Boolean(title.trim()), message: '채용 제목을 입력해 주세요.' },
      { ok: workTypes.length > 0, message: '근무 형태를 하나 이상 선택해 주세요.' },
      { ok: regions.length > 0, message: '근무 지역을 하나 이상 선택해 주세요.' },
      { ok: occupations.length > 0, message: '직종을 하나 이상 선택해 주세요.' },
      { ok: Number.isFinite(count) && count >= 1, message: '모집 인원을 입력해 주세요.' },
      { ok: isJobPayType(payType), message: '지급 기준을 선택해 주세요.' },
      { ok: Boolean(payLabel), message: '급여를 입력하거나 협의 가능을 선택해 주세요.' },
      { ok: isJobCareerType(careerType), message: '경력 유무를 선택해 주세요.' },
      { ok: isJobEducation(education), message: '학력을 선택해 주세요.' },
      { ok: Boolean(workDays.trim()), message: '근무 요일을 선택해 주세요.' },
      { ok: Boolean(workHours.trim()), message: '근무 시간을 입력해 주세요.' },
      { ok: alwaysOpen || Boolean(deadline), message: '접수 마감을 선택하거나 상시채용을 선택해 주세요.' },
    ]);
    if (requiredError) {
      rejectSave('outline', requiredError);
      return;
    }
    if (workTypes.length === 0 || !isJobCareerType(careerType) || !isJobEducation(education) || !isJobPayType(payType)) {
      return;
    }
    const locationLabel = locationLabelFromRegions(compactRegions(regions));
    mergeAndSave('outline', {
      title: title.trim(),
      workType: workTypes[0],
      workTypes,
      occupations,
      payType,
      payLabel,
      payAmount: payAmount.replace(/[^\d]/g, ''),
      payNegotiable,
      regions: compactRegions(regions),
      location: locationLabel,
      locationDetail: undefined,
      workHours: workHours.trim(),
      workDays: workDays.trim(),
      positionLevel: positionLevel.trim() || undefined,
      probation: probation.trim() || undefined,
      headcount: count,
      careerType,
      education,
      deadline: alwaysOpen ? 'open' : deadline,
    });
  }

  function saveDetails(event: React.FormEvent) {
    event.preventDefault();
    const requiredError = firstRequiredError([
      { ok: Boolean(summary.trim()), message: '담당 업무를 입력해 주세요.' },
      { ok: Boolean(process.trim()), message: '전형 절차를 입력해 주세요.' },
    ]);
    if (requiredError) {
      rejectSave('details', requiredError);
      return;
    }
    mergeAndSave('details', {
      summary: summary.trim(),
      requirements: requirements.trim() || undefined,
      preferred: preferred.trim() || undefined,
      benefits: benefits.trim() || undefined,
      process: process.trim(),
    });
  }

  function sectionStatus(id: SectionId) {
    if (error?.section === id) return <p className="text-sm text-danger">{error.message}</p>;
    if (savedSection === id && !isDirty(id)) return <p className="text-sm text-success">저장했습니다.</p>;
    return null;
  }

  function saveButton(id: SectionId) {
    const saving = savingSection === id;
    const dirty = isDirty(id);
    return (
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={!dirty || Boolean(savingSection)}>
          {saving ? '저장 중…' : '저장'}
        </Button>
        {dirty ? (
          <Button type="button" variant="secondary" disabled={Boolean(savingSection)} onClick={() => restoreSection(id)}>
            취소
          </Button>
        ) : null}
      </div>
    );
  }

  const values = currentDraft();
  const tabsComplete = SECTIONS.every((item) => isSectionComplete(item.id, values, companyComplete));
  const storedJob = getMyJobPosting(userId, jobId);
  const storedPublishReady = storedJob ? canPublishMyJobPosting(userId, storedJob) : false;
  const unsavedComplete = tabsComplete && SECTIONS.some((item) => item.id !== 'company' && isDirty(item.id));

  return (
    <div className="space-y-4">
      <nav
        className="sticky top-14 z-40 -mx-4 overflow-x-auto border-b border-border bg-background/95 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-xl sm:border"
        aria-label="채용 정보 항목"
      >
        <div className="flex gap-1">
          {SECTIONS.map((item) => {
            const complete = isSectionComplete(item.id, values, companyComplete);
            return (
              <a
                key={item.id}
                href={`#job-${item.id}`}
                aria-label={`${item.label}, ${complete ? '완료' : '미입력'}`}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-neutral-100',
                  complete ? 'text-foreground hover:text-foreground' : 'text-muted hover:text-foreground',
                )}
              >
                {item.label}
                <span
                  className={cn('text-[11px] font-semibold', complete ? 'text-success' : 'text-subtle')}
                  aria-hidden
                >
                  {complete ? '완료' : '미입력'}
                </span>
              </a>
            );
          })}
        </div>
      </nav>
      {storedJob && isPublishedJob(storedJob) ? (
        <p className="text-sm text-muted">수정한 내용은 각 탭에서 저장됩니다. 공개 여부는 바꾸지 않습니다.</p>
      ) : storedPublishReady ? (
        <p className="text-sm text-success">모든 탭이 저장되었습니다. 마이페이지의 채용 정보 관리에서 공개할 수 있습니다.</p>
      ) : tabsComplete ? (
        <p className="text-sm text-muted">
          {unsavedComplete
            ? '입력은 끝났습니다. 각 탭에서 저장을 눌러야 공개할 수 있습니다.'
            : storedJob
              ? `공개하려면 다음을 저장해 주세요. ${missingJobPublishRequirements(userId, storedJob).join(', ')}`
              : '각 탭에서 저장을 눌러야 공개할 수 있습니다.'}
        </p>
      ) : (
        <p className="text-sm text-muted">모든 탭이 완료되어야 공개할 수 있습니다. 지금은 작성 중으로만 저장됩니다.</p>
      )}

      <Card
        id="job-company"
        title="회사 정보"
        description="이 채용 정보에 쓸 회사 정보를 입력합니다. 국세청 상태조회에서 계속사업자로 나온 경우에만 저장할 수 있습니다. 조회 시점의 상태이며, 국세청 인증이나 회사의 보증이 아닙니다."
        className="scroll-mt-[7.5rem]"
      >
        <CompanyInfoForm
          userId={userId}
          hideCard
          initialCompany={storedJob?.company ?? initialJob?.company}
          onStatusChange={({ complete }) => setCompanyComplete(complete)}
          onSaved={(record) => {
            mergeAndSave('company', {
              companyName: record.companyName,
              businessNumber: record.businessNumber,
              company: toJobCompanyInfo(record),
            });
          }}
        />
      </Card>

      <Card
        id="job-outline"
        title="모집 요강"
        description="구직자가 검색할 수 있도록 근무 형태, 근무 지역, 직종을 고르고 모집 조건을 입력합니다."
        className="scroll-mt-[7.5rem]"
      >
        <form className="space-y-4" onSubmit={saveOutline} noValidate>
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
          <ChoiceGroup
            legend="근무 형태"
            required
            options={JOB_WORK_TYPES}
            selected={workTypes}
            labelOf={(value) => WORK_TYPE_LABELS[value]}
            onToggle={(value) =>
              setWorkTypes((current) => JOB_WORK_TYPES.filter((item) => toggleValue(current, value).includes(item)))
            }
          />
          <ChoiceGroup
            legend="근무 지역"
            required
            options={REGION_OPTIONS}
            selected={regions}
            isActive={(value) =>
              value === NATIONWIDE_REGION ? isNationwideSelection(regions) : regions.includes(value)
            }
            onToggle={(value) => setRegions((current) => toggleRegionSelection(current, value))}
          />
          <ChoiceGroup
            legend="직종"
            required
            options={OCCUPATION_OPTIONS}
            selected={occupations}
            onToggle={(value) => setOccupations((current) => toggleValue(current, value))}
          />
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
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-6">
            <div className="min-w-0">
              <FieldLabel htmlFor="job-work-days" required>
                근무 요일
              </FieldLabel>
              <select
                id="job-work-days"
                value={workDays}
                onChange={(event) => setWorkDays(event.target.value)}
                className={cn(controlClassName, 'w-full sm:w-44', !workDays && 'font-normal text-subtle')}
                required
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
              <FieldLabel htmlFor="job-hours" required>
                근무 시간
              </FieldLabel>
              <input
                id="job-hours"
                value={workHours}
                onChange={(event) => setWorkHours(event.target.value)}
                className={authInputClassName}
                placeholder="예: 09:00~18:00"
                required
              />
            </div>
            <div className="shrink-0">
              <FieldLabel htmlFor="job-deadline" required>
                접수 마감
              </FieldLabel>
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
          {sectionStatus('outline')}
          {saveButton('outline')}
        </form>
      </Card>

      <Card
        id="job-details"
        title="상세 내용"
        description="담당 업무와 전형 안내를 입력합니다."
        className="scroll-mt-[7.5rem]"
      >
        <form className="space-y-4" onSubmit={saveDetails} noValidate>
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
            <FieldLabel htmlFor="job-process" required>
              전형 절차
            </FieldLabel>
            <input
              id="job-process"
              value={process}
              onChange={(event) => setProcess(event.target.value)}
              className={authInputClassName}
              placeholder="예: 서류 전형 → 면접 → 최종 합격"
              required
            />
          </div>
          {sectionStatus('details')}
          {saveButton('details')}
        </form>
      </Card>

      <div className="flex">
        <Button type="button" variant="secondary" disabled={Boolean(savingSection)} onClick={onCancel}>
          돌아가기
        </Button>
      </div>
    </div>
  );
}

JobCreateForm.displayName = 'JobCreateForm';
