'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, FieldLabel } from '@/components/ui/Card';
import { authInputClassName } from '@/lib/auth-ui';
import { getKoreaDateLocalToday } from '@/lib/datetime';
import { formatJobPayLabel, formatPayAmountInput, parsePayLabel, PAY_UNIT_LABELS } from '@/lib/job-display';
import { createTalentProfileId, getMyTalentProfile, saveMyTalentProfile } from '@/lib/my-talent-profile';
import { syncMyTalentProfile } from '@/lib/posting-sync';
import { cn } from '@/lib/utils';
import {
  CAREER_TYPE_LABELS,
  JOB_CAREER_TYPES,
  PAY_TYPE_LABELS,
  WORK_TYPE_FILTERS,
  WORK_TYPE_LABELS,
  isJobCareerType,
  isJobPayType,
  isJobWorkType,
  type JobCareerType,
  type JobPayType,
  type JobWorkType,
} from '@/types/job';
import { EDUCATION_OPTIONS, isEducationLevel, normalizeEducation, type EducationLevel, type TalentProfile } from '@/types/talent';

const WORK_TYPES: JobWorkType[] = WORK_TYPE_FILTERS.flatMap((item) =>
  item.id === 'all' ? [] : [item.id],
);
const PAY_TYPES = Object.keys(PAY_TYPE_LABELS) as JobPayType[];

const controlClassName =
  'rounded-xl border border-border-strong bg-surface px-4 py-3 text-sm font-medium text-foreground outline-none transition placeholder:text-subtle placeholder:font-normal focus:border-primary focus:ring-2 focus:ring-primary/25 sm:text-base';
const amountInputClassName = cn(controlClassName, 'w-28 text-right tabular-nums sm:w-32');

function PlaceholderOption() {
  return <option value="">선택</option>;
}

function careerLabelFrom(type: JobCareerType, years: string): string {
  if (type === 'experienced') {
    const count = Math.max(1, Math.floor(Number(years) || 1));
    return `경력 ${count}년`;
  }
  return CAREER_TYPE_LABELS[type];
}

function parseCareer(label: string): { type: JobCareerType | ''; years: string } {
  if (label === CAREER_TYPE_LABELS.new) return { type: 'new', years: '1' };
  if (label === CAREER_TYPE_LABELS.any) return { type: 'any', years: '1' };
  const match = /경력\s*(\d+)\s*년/.exec(label);
  if (match) return { type: 'experienced', years: match[1] ?? '1' };
  if (label === CAREER_TYPE_LABELS.experienced || label.includes('경력')) {
    return { type: 'experienced', years: '1' };
  }
  return { type: '', years: '1' };
}

export default function MyTalentProfileForm({
  userId,
  nickname,
  initialProfile,
  returnPath,
  onSave,
}: {
  userId: string;
  nickname: string;
  initialProfile?: TalentProfile;
  returnPath?: string;
  onSave?: (profile: TalentProfile) => Promise<void>;
}) {
  const router = useRouter();
  const [profileId] = useState(() => initialProfile?.id || createTalentProfileId());
  const [title, setTitle] = useState(initialProfile?.title ?? '');
  const [name, setName] = useState(nickname);
  const [headline, setHeadline] = useState('');
  const [workType, setWorkType] = useState<JobWorkType | ''>('');
  const [careerType, setCareerType] = useState<JobCareerType | ''>('');
  const [careerMinYears, setCareerMinYears] = useState('1');
  const [education, setEducation] = useState<EducationLevel | ''>('');
  const [location, setLocation] = useState('');
  const [payType, setPayType] = useState<JobPayType | ''>('');
  const [payAmount, setPayAmount] = useState('');
  const [payNegotiable, setPayNegotiable] = useState(false);
  const [available, setAvailable] = useState('');
  const [summary, setSummary] = useState('');
  const [experience, setExperience] = useState('');
  const [careerHistory, setCareerHistory] = useState('');
  const [school, setSchool] = useState('');
  const [major, setMajor] = useState('');
  const [languages, setLanguages] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [tags, setTags] = useState('');
  const [createdAt, setCreatedAt] = useState<string | null>(() => initialProfile?.createdAt ?? null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const existing = initialProfile ?? getMyTalentProfile(userId, profileId);
    if (!existing) {
      setTitle('');
      setName(nickname);
      setWorkType('');
      setCareerType('');
      setEducation('');
      setPayType('');
      setPayAmount('');
      setPayNegotiable(false);
      setCreatedAt(null);
      setUpdatedAt(null);
      return;
    }
    setTitle(existing.title || existing.headline || '');
    setName(existing.name);
    setHeadline(existing.headline);
    setWorkType(existing.workType);
    const career = parseCareer(existing.careerLabel);
    setCareerType(career.type);
    setCareerMinYears(career.years);
    setEducation(normalizeEducation(existing.education));
    setLocation(existing.location);
    const pay = existing.payType
      ? {
          payType: existing.payType,
          amount: existing.payAmount ?? '',
          negotiable: Boolean(existing.payNegotiable),
        }
      : parsePayLabel(existing.desiredPay);
    setPayType(pay.payType);
    setPayAmount(pay.amount);
    setPayNegotiable(pay.negotiable);
    setAvailable(existing.available);
    setSummary(existing.summary);
    setExperience(existing.experience);
    setCareerHistory(existing.careerHistory ?? '');
    setSchool(existing.school ?? '');
    setMajor(existing.major ?? '');
    setLanguages(existing.languages ?? '');
    setPortfolioUrl(existing.portfolioUrl ?? '');
    setTags(existing.tags.join(', '));
    setCreatedAt(existing.createdAt);
    setUpdatedAt(existing.updatedAt);
  }, [initialProfile, nickname, profileId, userId]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || !name.trim() || !headline.trim()) {
      setSaved(false);
      setError('이력서 제목, 이름, 직무를 입력해 주세요.');
      return;
    }
    if (!isJobWorkType(workType)) {
      setSaved(false);
      setError('희망 근무 형태를 선택해 주세요.');
      return;
    }
    if (!isJobCareerType(careerType)) {
      setSaved(false);
      setError('경력을 선택해 주세요.');
      return;
    }
    if (!isEducationLevel(education)) {
      setSaved(false);
      setError('학력은 필수 등록 항목입니다.');
      return;
    }
    if (!summary.trim()) {
      setSaved(false);
      setError('자기 소개를 입력해 주세요.');
      return;
    }
    const hasPayInput = Boolean(payType) || Boolean(payAmount.replace(/[^\d]/g, '')) || payNegotiable;
    let desiredPay = '';
    if (hasPayInput) {
      if (!isJobPayType(payType)) {
        setSaved(false);
        setError('희망 급여 지급 기준을 선택해 주세요.');
        return;
      }
      desiredPay = formatJobPayLabel(payType, payAmount, payNegotiable);
      if (!desiredPay) {
        setSaved(false);
        setError('희망 급여를 입력하거나 협의 가능을 선택해 주세요.');
        return;
      }
    }
    setError('');
    const today = getKoreaDateLocalToday();
    const existing = initialProfile ?? getMyTalentProfile(userId, profileId);
    const profile: TalentProfile = {
      ...(existing ?? {}),
      id: existing?.id ?? profileId,
      title: title.trim(),
      name: name.trim(),
      headline: headline.trim(),
      workType,
      careerLabel: careerLabelFrom(careerType, careerMinYears),
      education,
      location: location.trim(),
      desiredPay,
      payType: isJobPayType(payType) ? payType : undefined,
      payAmount: payAmount.replace(/[^\d]/g, ''),
      payNegotiable,
      available: available.trim(),
      summary: summary.trim(),
      experience: experience.trim(),
      careerHistory: careerHistory.trim() || undefined,
      school: school.trim() || undefined,
      major: major.trim() || undefined,
      languages: languages.trim() || undefined,
      portfolioUrl: portfolioUrl.trim()
        ? /^https?:\/\//i.test(portfolioUrl.trim())
          ? portfolioUrl.trim()
          : `https://${portfolioUrl.trim()}`
        : undefined,
      tags: tags
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      createdAt: createdAt ?? today,
      updatedAt: today,
    };
    setSaving(true);
    const savedProfile = saveMyTalentProfile(userId, profile);
    void (async () => {
      try {
        if (onSave) await onSave(savedProfile);
        else await syncMyTalentProfile(savedProfile);
        setCreatedAt(savedProfile.createdAt);
        setUpdatedAt(savedProfile.updatedAt);
        setSaved(true);
        router.push(returnPath || `/talents/${profile.id}`);
      } catch {
        setSaving(false);
        setError('저장에 실패했습니다. 다시 시도해 주세요.');
      }
    })();
  }

  const editing = Boolean(createdAt);

  return (
    <Card
      title={editing ? '이력서 수정' : '이력서 작성'}
      description={
        editing
          ? '수정한 내용은 인재 정보와 마이페이지에 바로 반영됩니다. 파란 ‘필수’ 항목은 반드시 입력하고, ‘(선택)’은 비워 두어도 됩니다.'
          : '파란 ‘필수’ 항목은 반드시 입력하고, ‘(선택)’은 비워 두어도 됩니다. 저장하면 인재 정보에 반영됩니다.'
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <FieldLabel htmlFor="talent-title" required>
            이력서 제목
          </FieldLabel>
          <input
            id="talent-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="예: 웹 개발자 지원용"
            className={authInputClassName}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="talent-name" required>
              이름
            </FieldLabel>
            <input
              id="talent-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={authInputClassName}
              required
            />
          </div>
          <div>
            <FieldLabel htmlFor="talent-headline" required>
              직무
            </FieldLabel>
            <input
              id="talent-headline"
              value={headline}
              onChange={(event) => setHeadline(event.target.value)}
              placeholder="예: 프론트엔드 개발"
              className={authInputClassName}
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-2 items-end gap-4 md:flex md:flex-nowrap">
          <div className="min-w-0">
            <FieldLabel htmlFor="talent-work-type" required>
              희망 근무 형태
            </FieldLabel>
            <select
              id="talent-work-type"
              value={workType}
              onChange={(event) => {
                const next = event.target.value;
                setWorkType(isJobWorkType(next) ? next : '');
              }}
              className={cn(controlClassName, 'w-full md:w-40', !workType && 'font-normal text-subtle')}
              required
            >
              <PlaceholderOption />
              {WORK_TYPES.map((item) => (
                <option key={item} value={item}>
                  {WORK_TYPE_LABELS[item]}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <FieldLabel htmlFor="talent-career" required>
              경력
            </FieldLabel>
            <div className="flex items-center gap-2">
              <select
                id="talent-career"
                value={careerType}
                onChange={(event) => {
                  const next = event.target.value;
                  setCareerType(isJobCareerType(next) ? next : '');
                }}
                className={cn(controlClassName, 'w-full md:w-32', !careerType && 'font-normal text-subtle')}
                required
              >
                <PlaceholderOption />
                {JOB_CAREER_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {CAREER_TYPE_LABELS[item]}
                  </option>
                ))}
              </select>
              {careerType === 'experienced' ? (
                <>
                  <input
                    id="talent-career-years"
                    type="number"
                    min={1}
                    max={40}
                    value={careerMinYears}
                    onChange={(event) => setCareerMinYears(event.target.value)}
                    className={cn(controlClassName, 'w-16 text-right tabular-nums')}
                    required
                  />
                  <span className="shrink-0 text-sm text-muted">년</span>
                </>
              ) : null}
            </div>
          </div>
          <div className="col-span-2 min-w-0 md:flex-1">
            <FieldLabel htmlFor="talent-education" required>
              학력
            </FieldLabel>
            <select
              id="talent-education"
              value={education}
              onChange={(event) => {
                const next = event.target.value;
                setEducation(isEducationLevel(next) ? next : '');
              }}
              className={cn(controlClassName, 'w-full md:w-52', !education && 'font-normal text-subtle')}
              required
            >
              <PlaceholderOption />
              {EDUCATION_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <FieldLabel htmlFor="talent-summary" required>
            자기 소개
          </FieldLabel>
          <textarea
            id="talent-summary"
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            className={`${authInputClassName} min-h-20`}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="talent-location" optional>
              희망 근무지
            </FieldLabel>
            <input
              id="talent-location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className={authInputClassName}
            />
          </div>
          <div>
            <FieldLabel htmlFor="talent-available" optional>
              가능 시기
            </FieldLabel>
            <input
              id="talent-available"
              value={available}
              onChange={(event) => setAvailable(event.target.value)}
              placeholder="예: 즉시 가능"
              className={authInputClassName}
            />
          </div>
        </div>
        <div>
          <FieldLabel htmlFor="talent-pay-type" optional>
            희망 급여
          </FieldLabel>
          <div className="flex flex-wrap items-center gap-2">
            <select
              id="talent-pay-type"
              value={payType}
              onChange={(event) => {
                const next = event.target.value;
                setPayType(isJobPayType(next) ? next : '');
                setPayAmount('');
              }}
              className={cn(controlClassName, 'w-28', !payType && 'font-normal text-subtle')}
            >
              <PlaceholderOption />
              {PAY_TYPES.map((item) => (
                <option key={item} value={item}>
                  {PAY_TYPE_LABELS[item]}
                </option>
              ))}
            </select>
            <input
              id="talent-pay"
              inputMode="numeric"
              value={formatPayAmountInput(payAmount)}
              onChange={(event) => setPayAmount(event.target.value.replace(/[^\d]/g, ''))}
              className={amountInputClassName}
              placeholder="금액"
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
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="talent-school" optional>
              학교
            </FieldLabel>
            <input
              id="talent-school"
              value={school}
              onChange={(event) => setSchool(event.target.value)}
              placeholder="예: 한국대학교"
              className={authInputClassName}
            />
          </div>
          <div>
            <FieldLabel htmlFor="talent-major" optional>
              전공
            </FieldLabel>
            <input
              id="talent-major"
              value={major}
              onChange={(event) => setMajor(event.target.value)}
              placeholder="예: 컴퓨터공학"
              className={authInputClassName}
            />
          </div>
        </div>
        <div>
          <FieldLabel htmlFor="talent-career-history" optional>
            경력 사항
          </FieldLabel>
          <textarea
            id="talent-career-history"
            value={careerHistory}
            onChange={(event) => setCareerHistory(event.target.value)}
            placeholder={'최근 경력부터 적어 주세요.\n예: 2022~2024 하모니커머스 고객센터 / 채팅·전화 응대'}
            className={`${authInputClassName} min-h-20`}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="talent-experience" optional>
              자격증
            </FieldLabel>
            <input
              id="talent-experience"
              value={experience}
              onChange={(event) => setExperience(event.target.value)}
              placeholder="예: 정보처리기사, 운전면허 1종"
              className={authInputClassName}
            />
          </div>
          <div>
            <FieldLabel htmlFor="talent-languages" optional>
              어학
            </FieldLabel>
            <input
              id="talent-languages"
              value={languages}
              onChange={(event) => setLanguages(event.target.value)}
              placeholder="예: 영어 중급, TOEIC 850"
              className={authInputClassName}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="talent-tags" optional>
              스킬
            </FieldLabel>
            <input
              id="talent-tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="쉼표로 구분 (예: Excel, 고객상담)"
              className={authInputClassName}
            />
          </div>
          <div>
            <FieldLabel htmlFor="talent-portfolio" optional>
              포트폴리오
            </FieldLabel>
            <input
              id="talent-portfolio"
              value={portfolioUrl}
              onChange={(event) => setPortfolioUrl(event.target.value)}
              placeholder="예: https://portfolio.example.com"
              className={authInputClassName}
            />
          </div>
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {updatedAt ? <p className="text-sm text-muted">프로필 최근일 {updatedAt}</p> : null}
        {saved ? (
          <p className="text-sm text-success">
            {returnPath ? '저장했습니다. 목록으로 이동합니다.' : '저장했습니다. 인재 정보로 이동합니다.'}
          </p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="submit" fullWidth disabled={saving}>
            {saving ? '저장 중…' : editing ? '수정 반영' : '이력서 등록'}
          </Button>
          {returnPath ? (
            <Button type="button" variant="secondary" fullWidth onClick={() => router.push(returnPath)}>
              취소
            </Button>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
