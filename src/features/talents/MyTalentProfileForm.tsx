'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, FieldLabel } from '@/components/ui/Card';
import AutoGrowTextarea from '@/components/ui/AutoGrowTextarea';
import { authInputClassName } from '@/lib/auth-ui';
import { getKoreaDateLocalToday } from '@/lib/datetime';
import { firstRequiredError } from '@/lib/form-required';
import { createTalentProfileId, getMyTalentProfile, saveMyTalentProfile } from '@/lib/my-talent-profile';
import { syncMyTalentProfile } from '@/lib/posting-sync';
import { cn } from '@/lib/utils';
import { AVAILABLE_OPTIONS, isAvailableOption, normalizeAvailable } from '@/lib/work-preferences';
import {
  CAREER_TYPE_LABELS,
  JOBSEEKER_CAREER_TYPES,
  WORK_TYPE_FILTERS,
  WORK_TYPE_LABELS,
  formatCareerYearsInput,
  isJobCareerType,
  parseCareerYears,
  type JobCareerType,
  type JobWorkType,
} from '@/types/job';
import TalentSchoolFields, {
  emptySchoolDraft,
  schoolDraftsFromProfile,
  schoolFieldsFromDrafts,
  type SchoolDraft,
} from '@/features/talents/TalentSchoolFields';
import { EDUCATION_OPTIONS, isEducationLevel, normalizeEducation, talentWorkTypes, type EducationLevel, type TalentProfile } from '@/types/talent';

const WORK_TYPES: JobWorkType[] = WORK_TYPE_FILTERS.flatMap((item) =>
  item.id === 'all' ? [] : [item.id],
);
const controlClassName =
  'rounded-xl border border-border-strong bg-surface px-4 py-3 text-sm font-medium text-foreground outline-none transition placeholder:text-subtle placeholder:font-normal focus:border-primary focus:ring-2 focus:ring-primary/25 sm:text-base';

function PlaceholderOption() {
  return <option value="">선택</option>;
}

function careerLabelFrom(type: JobCareerType, years: string): string {
  if (type === 'experienced') {
    const count = parseCareerYears(years);
    return count ? `경력 ${count}년` : CAREER_TYPE_LABELS.experienced;
  }
  return CAREER_TYPE_LABELS[type];
}

function parseCareer(label: string): { type: JobCareerType | ''; years: string } {
  if (label === CAREER_TYPE_LABELS.new) return { type: 'new', years: '' };
  if (label === '경력무관') return { type: '', years: '' };
  const match = /경력\s*(\d+)\s*년/.exec(label);
  if (match) {
    const years = parseCareerYears(match[1]);
    return { type: 'experienced', years: years ? String(years) : '' };
  }
  if (label === CAREER_TYPE_LABELS.experienced || label.includes('경력')) {
    return { type: 'experienced', years: '' };
  }
  return { type: '', years: '' };
}

type TalentDraft = {
  title: string;
  name: string;
  headline: string;
  workTypes: JobWorkType[];
  careerType: JobCareerType | '';
  careerMinYears: string;
  education: EducationLevel | '';
  location: string;
  available: string;
  summary: string;
  experience: string;
  careerHistory: string;
  schools: SchoolDraft[];
  languages: string;
  tags: string;
};

function encodeTalentDraft(draft: TalentDraft): string {
  return JSON.stringify(draft);
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
  const [workTypes, setWorkTypes] = useState<JobWorkType[]>([]);
  const [careerType, setCareerType] = useState<JobCareerType | ''>('');
  const [careerMinYears, setCareerMinYears] = useState('');
  const [education, setEducation] = useState<EducationLevel | ''>('');
  const [location, setLocation] = useState('');
  const [available, setAvailable] = useState('');
  const [summary, setSummary] = useState('');
  const [experience, setExperience] = useState('');
  const [careerHistory, setCareerHistory] = useState('');
  const [schools, setSchools] = useState<SchoolDraft[]>(() => [emptySchoolDraft()]);
  const [languages, setLanguages] = useState('');
  const [tags, setTags] = useState('');
  const [createdAt, setCreatedAt] = useState<string | null>(() => initialProfile?.createdAt ?? null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedDraft, setSavedDraft] = useState<string | null>(null);

  useEffect(() => {
    const existing = initialProfile ?? getMyTalentProfile(userId, profileId);
    if (!existing) {
      const empty: TalentDraft = {
        title: '',
        name: nickname,
        headline: '',
        workTypes: [],
        careerType: '',
        careerMinYears: '',
        education: '',
        location: '',
        available: '',
        summary: '',
        experience: '',
        careerHistory: '',
        schools: [emptySchoolDraft()],
        languages: '',
        tags: '',
      };
      setTitle(empty.title);
      setName(empty.name);
      setHeadline(empty.headline);
      setWorkTypes(empty.workTypes);
      setCareerType(empty.careerType);
      setCareerMinYears(empty.careerMinYears);
      setEducation(empty.education);
      setLocation(empty.location);
      setAvailable(empty.available);
      setSummary(empty.summary);
      setExperience(empty.experience);
      setCareerHistory(empty.careerHistory);
      setSchools(empty.schools);
      setLanguages(empty.languages);
      setTags(empty.tags);
      setCreatedAt(null);
      setUpdatedAt(null);
      setSavedDraft(encodeTalentDraft(empty));
      return;
    }
    const career = parseCareer(existing.careerLabel);
    const next: TalentDraft = {
      title: existing.title || existing.headline || '',
      name: existing.name,
      headline: existing.headline,
      workTypes: talentWorkTypes(existing),
      careerType: career.type,
      careerMinYears: career.years,
      education: normalizeEducation(existing.education),
      location: existing.location,
      available: normalizeAvailable(existing.available),
      summary: existing.summary,
      experience: existing.experience,
      careerHistory: existing.careerHistory ?? '',
      schools: schoolDraftsFromProfile(existing),
      languages: existing.languages ?? '',
      tags: existing.tags.join(', '),
    };
    setTitle(next.title);
    setName(next.name);
    setHeadline(next.headline);
    setWorkTypes(next.workTypes);
    setCareerType(next.careerType);
    setCareerMinYears(next.careerMinYears);
    setEducation(next.education);
    setLocation(next.location);
    setAvailable(next.available);
    setSummary(next.summary);
    setExperience(next.experience);
    setCareerHistory(next.careerHistory);
    setSchools(next.schools);
    setLanguages(next.languages);
    setTags(next.tags);
    setCreatedAt(existing.createdAt);
    setUpdatedAt(existing.updatedAt);
    setSavedDraft(encodeTalentDraft(next));
  }, [initialProfile, nickname, profileId, userId]);

  function currentDraft(): TalentDraft {
    return {
      title,
      name,
      headline,
      workTypes,
      careerType,
      careerMinYears,
      education,
      location,
      available,
      summary,
      experience,
      careerHistory,
      schools,
      languages,
      tags,
    };
  }

  const dirty = savedDraft !== null && encodeTalentDraft(currentDraft()) !== savedDraft;

  function restoreDraft() {
    if (!savedDraft) return;
    const draft = JSON.parse(savedDraft) as TalentDraft;
    setTitle(draft.title);
    setName(draft.name);
    setHeadline(draft.headline);
    setWorkTypes(draft.workTypes);
    setCareerType(draft.careerType);
    setCareerMinYears(formatCareerYearsInput(draft.careerMinYears));
    setEducation(draft.education);
    setLocation(draft.location);
    setAvailable(draft.available);
    setSummary(draft.summary);
    setExperience(draft.experience);
    setCareerHistory(draft.careerHistory);
    setSchools(draft.schools.length > 0 ? draft.schools : [emptySchoolDraft()]);
    setLanguages(draft.languages);
    setTags(draft.tags);
    setError('');
    setSaved(false);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const requiredError = firstRequiredError([
      { ok: Boolean(title.trim()), message: '이력서 제목을 입력해 주세요.' },
      { ok: Boolean(name.trim()), message: '이름을 입력해 주세요.' },
      { ok: workTypes.length > 0, message: '근무 형태를 하나 이상 선택해 주세요.' },
      { ok: isAvailableOption(available), message: '근무 가능을 선택해 주세요.' },
      { ok: isJobCareerType(careerType), message: '경력 유무를 선택해 주세요.' },
      {
        ok: careerType !== 'experienced' || Boolean(parseCareerYears(careerMinYears)),
        message: '경력 연수를 입력해 주세요.',
      },
      { ok: isEducationLevel(education), message: '최종 학력을 선택해 주세요.' },
      { ok: schools.some((item) => item.school.trim()), message: '학교를 입력해 주세요.' },
      { ok: Boolean(summary.trim()), message: '자기 소개를 입력해 주세요.' },
    ]);
    if (requiredError) {
      setSaved(false);
      setError(requiredError);
      return;
    }
    if (workTypes.length === 0 || !isAvailableOption(available) || !isJobCareerType(careerType) || !isEducationLevel(education)) {
      return;
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
      workType: workTypes[0] ?? '',
      workTypes,
      careerLabel: careerLabelFrom(careerType, careerMinYears),
      education,
      location: location.trim(),
      desiredPay: '',
      payType: undefined,
      payAmount: '',
      payNegotiable: false,
      available: available.trim(),
      summary: summary.trim(),
      experience: experience.trim(),
      careerHistory: careerHistory.trim() || undefined,
      ...schoolFieldsFromDrafts(schools),
      languages: languages.trim() || undefined,
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
        setSavedDraft(encodeTalentDraft(currentDraft()));
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
      action={
        returnPath ? (
          <Button type="button" variant="secondary" disabled={saving} onClick={() => router.push(returnPath)}>
            돌아가기
          </Button>
        ) : null
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
        </div>
        <div>
          <FieldLabel required>근무 형태</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {WORK_TYPES.map((item) => {
              const active = workTypes.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    setWorkTypes((current) =>
                      current.includes(item) ? current.filter((value) => value !== item) : [...current, item],
                    )
                  }
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
        <div className="grid grid-cols-2 items-end gap-4 md:flex md:flex-nowrap">
          <div className="min-w-0">
            <FieldLabel htmlFor="talent-career" required>
              경력 유무
            </FieldLabel>
            <div className="flex flex-wrap items-center gap-2">
              <select
                id="talent-career"
                value={careerType}
                onChange={(event) => {
                  const next = event.target.value;
                  setCareerType(isJobCareerType(next) ? next : '');
                }}
                className={cn(controlClassName, 'min-w-[7.5rem] flex-1 md:flex-none md:w-32', !careerType && 'font-normal text-subtle')}
                required
              >
                <PlaceholderOption />
                {JOBSEEKER_CAREER_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {CAREER_TYPE_LABELS[item]}
                  </option>
                ))}
              </select>
              {careerType === 'experienced' ? (
                <div className="flex shrink-0 items-center gap-2">
                  <input
                    id="talent-career-years"
                    inputMode="numeric"
                    maxLength={2}
                    placeholder="00"
                    value={careerMinYears}
                    onChange={(event) => setCareerMinYears(formatCareerYearsInput(event.target.value))}
                    className={cn(controlClassName, 'w-[3.25rem] px-2 text-center tabular-nums')}
                    required
                  />
                  <span className="whitespace-nowrap text-sm text-muted">년</span>
                </div>
              ) : null}
            </div>
          </div>
          <div className="col-span-2 min-w-0 md:flex-1">
            <FieldLabel htmlFor="talent-education" required>
              최종 학력
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
          <AutoGrowTextarea
            id="talent-summary"
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            className={`${authInputClassName} min-h-20`}
            required
          />
        </div>
        <div>
          <FieldLabel required>근무 가능</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {AVAILABLE_OPTIONS.map((item) => {
              const active = available === item;
              return (
                <button
                  key={item}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setAvailable((current) => (current === item ? '' : item))}
                  className={cn(
                    'rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                    active
                      ? 'bg-primary text-white shadow-sm'
                      : 'border border-border-strong bg-surface text-foreground hover:bg-neutral-50',
                  )}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <FieldLabel htmlFor="talent-location" optional>
            지역
          </FieldLabel>
          <input
            id="talent-location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className={authInputClassName}
          />
        </div>
        <TalentSchoolFields schools={schools} onChange={setSchools} />
        <div>
          <FieldLabel htmlFor="talent-career-history" optional>
            경력 내역
          </FieldLabel>
          <AutoGrowTextarea
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
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {updatedAt ? <p className="text-sm text-muted">프로필 최근일 {updatedAt}</p> : null}
        {saved ? (
          <p className="text-sm text-success">
            {returnPath ? '저장했습니다. 목록으로 이동합니다.' : '저장했습니다. 인재 정보로 이동합니다.'}
          </p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="submit" fullWidth disabled={!dirty || saving}>
            {saving ? '저장 중…' : '저장'}
          </Button>
          {dirty ? (
            <Button type="button" variant="secondary" fullWidth disabled={saving} onClick={restoreDraft}>
              취소
            </Button>
          ) : null}
          {returnPath ? (
            <Button type="button" variant="secondary" fullWidth disabled={saving} onClick={() => router.push(returnPath)}>
              돌아가기
            </Button>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
