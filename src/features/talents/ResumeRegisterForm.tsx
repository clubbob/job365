'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, FieldLabel } from '@/components/ui/Card';
import { authInputClassName } from '@/lib/auth-ui';
import { getKoreaDateLocalToday } from '@/lib/datetime';
import { formatJobPayLabel, formatPayAmountInput, parsePayLabel, PAY_UNIT_LABELS } from '@/lib/job-display';
import {
  RESIDENCE_CITIES,
  RESIDENCE_DISTRICTS,
  formatResidence,
  isCompleteResidence,
  parseResidence,
  type ResidenceCity,
} from '@/lib/korea-regions';
import { createEmptyTalentProfile, createTalentProfileId, getMyTalentProfile, saveMyTalentProfile } from '@/lib/my-talent-profile';
import { syncMyTalentProfile } from '@/lib/posting-sync';
import { readResumePhoto } from '@/lib/resume-photo';
import {
  formatPhoneInput,
  isValidEmail,
  isValidPhone,
  normalizeWebsite,
} from '@/lib/talent-contact';
import { cn } from '@/lib/utils';
import {
  isNationwideSelection,
  loadWorkPreferences,
  locationLabelFromRegions,
  NATIONWIDE_REGION,
  OCCUPATION_OPTIONS,
  REGION_OPTIONS,
  regionsFromLocationText,
  saveWorkPreferences,
  toggleRegionSelection,
  type OccupationOption,
  type RegionOption,
} from '@/lib/work-preferences';
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
import {
  EDUCATION_OPTIONS,
  TALENT_GENDERS,
  isEducationLevel,
  isTalentGender,
  normalizeEducation,
  type EducationLevel,
  type TalentGender,
  type TalentProfile,
} from '@/types/talent';

const WORK_TYPES: JobWorkType[] = WORK_TYPE_FILTERS.flatMap((item) =>
  item.id === 'all' ? [] : [item.id],
);
const PAY_TYPES = Object.keys(PAY_TYPE_LABELS) as JobPayType[];

const SECTIONS = [
  { id: 'basics', label: '기본 정보' },
  { id: 'education', label: '학력 정보' },
  { id: 'career', label: '경력 정보' },
  { id: 'skills', label: '보유 역량 / 자격증' },
  { id: 'conditions', label: '희망 근무 조건' },
  { id: 'summary', label: '자기 소개' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

const controlClassName =
  'rounded-xl border border-border-strong bg-surface px-4 py-3 text-sm font-medium text-foreground outline-none transition placeholder:text-subtle placeholder:font-normal focus:border-primary focus:ring-2 focus:ring-primary/25 sm:text-base';
const amountInputClassName = cn(controlClassName, 'w-28 text-right tabular-nums sm:w-32');

function PlaceholderOption() {
  return <option value="">선택</option>;
}

const CURRENT_YEAR = Number(getKoreaDateLocalToday().slice(0, 4));
const BIRTH_YEARS = Array.from({ length: 90 }, (_, index) => String(CURRENT_YEAR - index));
const BIRTH_MONTHS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'));

function splitBirthDate(value: string): { year: string; month: string } {
  const match = /^(\d{4})-(\d{2})/.exec(value);
  if (!match) return { year: '', month: '' };
  return { year: match[1] ?? '', month: match[2] ?? '' };
}

function composeBirthDate(year: string, month: string): string {
  if (!year || !month) return '';
  return `${year}-${month}`;
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

function normalizePortfolioUrl(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function parseTags(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function ChoiceGroup<T extends string>({
  legend,
  options,
  selected,
  isActive,
  onToggle,
}: {
  legend: string;
  options: readonly T[];
  selected: T[];
  isActive?: (value: T) => boolean;
  onToggle: (value: T) => void;
}) {
  return (
    <fieldset>
      <FieldLabel>{legend}</FieldLabel>
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
              {item}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function ResumeRegisterForm({
  userId,
  nickname,
  accountEmail,
  profileId,
  returnPath,
  onSaved,
}: {
  userId: string;
  nickname: string;
  accountEmail?: string;
  profileId?: string;
  returnPath?: string;
  onSaved?: (profile: TalentProfile) => void;
}) {
  const router = useRouter();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [resumeId] = useState(() => profileId || createTalentProfileId());
  const [title, setTitle] = useState('');
  const [name, setName] = useState(nickname);
  const [photoUrl, setPhotoUrl] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [gender, setGender] = useState<TalentGender | ''>('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(accountEmail ?? '');
  const [residenceCity, setResidenceCity] = useState<ResidenceCity | ''>('');
  const [residenceDistrict, setResidenceDistrict] = useState('');
  const [homepage, setHomepage] = useState('');
  const [headline, setHeadline] = useState('');
  const [education, setEducation] = useState<EducationLevel | ''>('');
  const [school, setSchool] = useState('');
  const [major, setMajor] = useState('');
  const [careerType, setCareerType] = useState<JobCareerType | ''>('');
  const [careerMinYears, setCareerMinYears] = useState('1');
  const [careerHistory, setCareerHistory] = useState('');
  const [experience, setExperience] = useState('');
  const [languages, setLanguages] = useState('');
  const [tags, setTags] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [workType, setWorkType] = useState<JobWorkType | ''>('');
  const [available, setAvailable] = useState('');
  const [payType, setPayType] = useState<JobPayType | ''>('');
  const [payAmount, setPayAmount] = useState('');
  const [payNegotiable, setPayNegotiable] = useState(false);
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [occupations, setOccupations] = useState<OccupationOption[]>([]);
  const [summary, setSummary] = useState('');
  const [savingSection, setSavingSection] = useState<SectionId | null>(null);
  const [savedSection, setSavedSection] = useState<SectionId | null>(null);
  const [error, setError] = useState<{ section: SectionId; message: string } | null>(null);

  useEffect(() => {
    const existing = getMyTalentProfile(userId, resumeId);
    const prefs = loadWorkPreferences(userId);
    if (!existing) {
      setTitle('');
      setName(nickname);
      setPhotoUrl('');
      setBirthYear('');
      setBirthMonth('');
      setGender('');
      setPhone('');
      setEmail(accountEmail ?? '');
      setResidenceCity('');
      setResidenceDistrict('');
      setHomepage('');
      setHeadline('');
      setRegions(prefs?.regions ?? []);
      setOccupations(prefs?.occupations ?? []);
      return;
    }
    setTitle(existing.title || existing.headline || '');
    setName(existing.name || nickname);
    setPhotoUrl(existing.photoUrl ?? '');
    const birth = splitBirthDate(existing.birthDate ?? '');
    setBirthYear(birth.year);
    setBirthMonth(birth.month);
    setGender(existing.gender ?? '');
    setPhone(existing.phone ?? '');
    setEmail(existing.email || accountEmail || '');
    const residence = parseResidence(existing.address ?? '');
    setResidenceCity(residence.city);
    setResidenceDistrict(residence.district);
    setHomepage(existing.homepage ?? '');
    setHeadline(existing.headline);
    setEducation(normalizeEducation(existing.education));
    setSchool(existing.school ?? '');
    setMajor(existing.major ?? '');
    const career = parseCareer(existing.careerLabel);
    setCareerType(career.type);
    setCareerMinYears(career.years);
    setCareerHistory(existing.careerHistory ?? '');
    setExperience(existing.experience);
    setLanguages(existing.languages ?? '');
    setTags(existing.tags.join(', '));
    setPortfolioUrl(existing.portfolioUrl ?? '');
    setWorkType(existing.workType);
    setAvailable(existing.available);
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
    const fromLocation = regionsFromLocationText(existing.location);
    setRegions(fromLocation.length > 0 ? fromLocation : (prefs?.regions ?? []));
    setOccupations(prefs?.occupations ?? []);
    setSummary(existing.summary);
  }, [accountEmail, nickname, resumeId, userId]);

  function mergeAndSave(section: SectionId, partial: Partial<TalentProfile>) {
    const today = getKoreaDateLocalToday();
    const existing = getMyTalentProfile(userId, resumeId) ?? createEmptyTalentProfile(userId, nickname, resumeId);
    const next = saveMyTalentProfile(userId, {
      ...existing,
      id: resumeId,
      ...partial,
      createdAt: existing.createdAt || today,
      updatedAt: today,
    });
    setSavingSection(section);
    setError(null);
    void (async () => {
      try {
        await syncMyTalentProfile(next);
        setSavedSection(section);
        onSaved?.(next);
      } catch {
        setError({ section, message: '저장에 실패했습니다. 다시 시도해 주세요.' });
      } finally {
        setSavingSection(null);
      }
    })();
  }

  function saveBasics(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setSavedSection(null);
      setError({ section: 'basics', message: '이력서 제목을 입력해 주세요.' });
      return;
    }
    if (!name.trim()) {
      setSavedSection(null);
      setError({ section: 'basics', message: '이름을 입력해 주세요.' });
      return;
    }
    const birthDate = composeBirthDate(birthYear, birthMonth);
    const thisMonth = getKoreaDateLocalToday().slice(0, 7);
    if (!birthDate || birthDate > thisMonth) {
      setSavedSection(null);
      setError({ section: 'basics', message: '생년월을 선택해 주세요.' });
      return;
    }
    if (!isTalentGender(gender)) {
      setSavedSection(null);
      setError({ section: 'basics', message: '성별을 선택해 주세요.' });
      return;
    }
    if (!phone.trim() || !isValidPhone(phone)) {
      setSavedSection(null);
      setError({ section: 'basics', message: '휴대폰 번호를 입력해 주세요.' });
      return;
    }
    if (!email.trim() || !isValidEmail(email)) {
      setSavedSection(null);
      setError({ section: 'basics', message: '이메일을 입력해 주세요.' });
      return;
    }
    if (!isCompleteResidence(residenceCity, residenceDistrict)) {
      setSavedSection(null);
      setError({ section: 'basics', message: '거주 지역을 선택해 주세요.' });
      return;
    }
    mergeAndSave('basics', {
      title: title.trim(),
      name: name.trim(),
      photoUrl: photoUrl || undefined,
      birthDate,
      gender,
      phone: phone.trim(),
      email: email.trim(),
      address: formatResidence(residenceCity, residenceDistrict),
      homepage: normalizeWebsite(homepage),
    });
  }

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const next = await readResumePhoto(file);
      setPhotoUrl(next);
      setSavedSection(null);
      setError(null);
    } catch (caught) {
      setSavedSection(null);
      setError({
        section: 'basics',
        message: caught instanceof Error ? caught.message : '사진을 올리지 못했습니다.',
      });
    }
  }

  function saveEducation(event: React.FormEvent) {
    event.preventDefault();
    mergeAndSave('education', {
      education,
      school: school.trim() || undefined,
      major: major.trim() || undefined,
    });
  }

  function saveCareer(event: React.FormEvent) {
    event.preventDefault();
    mergeAndSave('career', {
      careerLabel: isJobCareerType(careerType) ? careerLabelFrom(careerType, careerMinYears) : '',
      careerHistory: careerHistory.trim() || undefined,
    });
  }

  function saveSkills(event: React.FormEvent) {
    event.preventDefault();
    mergeAndSave('skills', {
      experience: experience.trim(),
      languages: languages.trim() || undefined,
      tags: parseTags(tags),
      portfolioUrl: normalizePortfolioUrl(portfolioUrl),
    });
  }

  function saveConditions(event: React.FormEvent) {
    event.preventDefault();
    const hasPayInput = Boolean(payType) || Boolean(payAmount.replace(/[^\d]/g, '')) || payNegotiable;
    let desiredPay = '';
    if (hasPayInput) {
      if (!isJobPayType(payType)) {
        setSavedSection(null);
        setError({ section: 'conditions', message: '희망 급여 지급 기준을 선택해 주세요.' });
        return;
      }
      desiredPay = formatJobPayLabel(payType, payAmount, payNegotiable);
      if (!desiredPay) {
        setSavedSection(null);
        setError({ section: 'conditions', message: '희망 급여를 입력하거나 협의 가능을 선택해 주세요.' });
        return;
      }
    }
    if (regions.length > 0 && occupations.length > 0) {
      saveWorkPreferences(userId, { regions, occupations });
    }
    mergeAndSave('conditions', {
      headline: headline.trim(),
      workType,
      location: locationLabelFromRegions(regions),
      available: available.trim(),
      desiredPay,
      payType: isJobPayType(payType) ? payType : undefined,
      payAmount: payAmount.replace(/[^\d]/g, ''),
      payNegotiable,
    });
  }

  function saveSummary(event: React.FormEvent) {
    event.preventDefault();
    mergeAndSave('summary', { summary: summary.trim() });
  }

  function sectionStatus(id: SectionId) {
    if (error?.section === id) return <p className="text-sm text-danger">{error.message}</p>;
    if (savedSection === id) return <p className="text-sm text-success">저장했습니다.</p>;
    return null;
  }

  function saveButton(id: SectionId) {
    const saving = savingSection === id;
    return (
      <Button type="submit" disabled={Boolean(savingSection)}>
        {saving ? '저장 중…' : '이 항목 저장'}
      </Button>
    );
  }

  return (
    <div className="space-y-4">
      <nav
        className="sticky top-14 z-40 -mx-4 overflow-x-auto border-b border-border bg-background/95 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-xl sm:border"
        aria-label="이력서 항목"
      >
        <div className="flex gap-1">
          {SECTIONS.map((item) => (
            <a
              key={item.id}
              href={`#resume-${item.id}`}
              className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:bg-neutral-100 hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>

      <Card
        id="resume-basics"
        title="기본 정보"
        description="이력서 제목과 기본 정보를 입력합니다."
        className="scroll-mt-[7.5rem]"
      >
        <form className="space-y-4" onSubmit={saveBasics} noValidate>
          <div>
            <FieldLabel htmlFor="talent-title" required>
              이력서 제목
            </FieldLabel>
            <input
              id="talent-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={authInputClassName}
              placeholder="예: 웹 개발자 지원용"
              required
            />
          </div>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="shrink-0 sm:w-36">
              <FieldLabel htmlFor="talent-photo" optional>
                사진
              </FieldLabel>
              <input
                ref={photoInputRef}
                id="talent-photo"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => void handlePhotoChange(event)}
              />
              <div className="flex w-32 flex-col gap-2 sm:w-36">
                <div className="flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-white">
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl} alt="이력서 사진" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="px-2 text-center text-xs text-subtle">사진 없음</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-neutral-50"
                  >
                    {photoUrl ? '사진 변경' : '사진 등록'}
                  </button>
                  {photoUrl ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoUrl('');
                        setSavedSection(null);
                      }}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted hover:bg-neutral-100 hover:text-foreground"
                    >
                      삭제
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-4">
              <div className="grid gap-4 sm:grid-cols-[minmax(8rem,11rem)_minmax(0,1fr)]">
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
                <FieldLabel required>생년월</FieldLabel>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex min-w-0 items-center gap-1.5">
                    <select
                      id="talent-birth-year"
                      aria-label="출생 연도"
                      value={birthYear}
                      onChange={(event) => setBirthYear(event.target.value)}
                      className={cn(
                        controlClassName,
                        'min-w-0 flex-1 px-3',
                        !birthYear && 'font-normal text-subtle',
                      )}
                      required
                    >
                      <option value="">선택</option>
                      {BIRTH_YEARS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                    <span className="shrink-0 text-sm text-muted">년</span>
                  </label>
                  <label className="flex min-w-0 items-center gap-1.5">
                    <select
                      id="talent-birth-month"
                      aria-label="출생 월"
                      value={birthMonth}
                      onChange={(event) => setBirthMonth(event.target.value)}
                      className={cn(
                        controlClassName,
                        'min-w-0 flex-1 px-3',
                        !birthMonth && 'font-normal text-subtle',
                      )}
                      required
                    >
                      <option value="">선택</option>
                      {BIRTH_MONTHS.map((item) => (
                        <option key={item} value={item}>
                          {Number(item)}
                        </option>
                      ))}
                    </select>
                    <span className="shrink-0 text-sm text-muted">월</span>
                  </label>
                </div>
              </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-[auto_minmax(8rem,1fr)_minmax(10rem,1.4fr)]">
              <div>
                <FieldLabel required>성별</FieldLabel>
                <div className="flex gap-1.5">
                  {TALENT_GENDERS.map((item) => {
                    const active = gender === item;
                    return (
                      <button
                        key={item}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setGender(active ? '' : item)}
                        className={cn(
                          'min-w-14 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
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
                <FieldLabel htmlFor="talent-phone" required>
                  휴대폰
                </FieldLabel>
                <input
                  id="talent-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => setPhone(formatPhoneInput(event.target.value))}
                  placeholder="010-0000-0000"
                  className={authInputClassName}
                  required
                />
              </div>
              <div>
                <FieldLabel htmlFor="talent-email" required>
                  이메일
                </FieldLabel>
                <input
                  id="talent-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  className={authInputClassName}
                  required
                />
              </div>
              </div>
              <div>
                <FieldLabel required>거주 지역</FieldLabel>
                <div className="flex flex-wrap gap-1.5">
                  {RESIDENCE_CITIES.map((item) => {
                    const active = residenceCity === item;
                    return (
                      <button
                        key={item}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          if (active) {
                            setResidenceCity('');
                            setResidenceDistrict('');
                            return;
                          }
                          setResidenceCity(item);
                          setResidenceDistrict('');
                        }}
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
                {residenceCity && RESIDENCE_DISTRICTS[residenceCity].length > 0 ? (
                  <div className="mt-3 border-t border-border pt-3">
                    <div className="flex flex-wrap gap-1.5">
                    {RESIDENCE_DISTRICTS[residenceCity].map((item) => {
                      const active = residenceDistrict === item;
                      return (
                        <button
                          key={item}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setResidenceDistrict(active ? '' : item)}
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
                ) : null}
              </div>
              <div>
                <FieldLabel htmlFor="talent-homepage" optional>
                  홈페이지 / SNS
                </FieldLabel>
                <input
                  id="talent-homepage"
                  value={homepage}
                  onChange={(event) => setHomepage(event.target.value)}
                  placeholder="예: https://blog.example.com 또는 @sns"
                  className={authInputClassName}
                />
              </div>
            </div>
          </div>
          {sectionStatus('basics')}
          {saveButton('basics')}
        </form>
      </Card>

      <Card
        id="resume-education"
        title="학력 정보"
        description="최종 학력과 학교, 전공을 입력합니다."
        className="scroll-mt-[7.5rem]"
      >
        <form className="space-y-4" onSubmit={saveEducation} noValidate>
          <div>
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
            >
              <PlaceholderOption />
              {EDUCATION_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
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
          {sectionStatus('education')}
          {saveButton('education')}
        </form>
      </Card>

      <Card
        id="resume-career"
        title="경력 정보"
        description="경력 구분과 주요 경력을 입력합니다."
        className="scroll-mt-[7.5rem]"
      >
        <form className="space-y-4" onSubmit={saveCareer} noValidate>
          <div>
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
                  />
                  <span className="shrink-0 text-sm text-muted">년</span>
                </>
              ) : null}
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
          {sectionStatus('career')}
          {saveButton('career')}
        </form>
      </Card>

      <Card
        id="resume-skills"
        title="보유 역량 / 자격증"
        description="자격증, 어학, 스킬, 포트폴리오를 입력합니다."
        className="scroll-mt-[7.5rem]"
      >
        <form className="space-y-4" onSubmit={saveSkills} noValidate>
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
          {sectionStatus('skills')}
          {saveButton('skills')}
        </form>
      </Card>

      <Card
        id="resume-conditions"
        title="희망 근무 조건"
        description="희망 직무와 근무 형태, 지역, 직종, 급여를 입력합니다."
        className="scroll-mt-[7.5rem]"
      >
        <form className="space-y-5" onSubmit={saveConditions} noValidate>
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
            />
          </div>
          <div>
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
            >
              <PlaceholderOption />
              {WORK_TYPES.map((item) => (
                <option key={item} value={item}>
                  {WORK_TYPE_LABELS[item]}
                </option>
              ))}
            </select>
          </div>
          <ChoiceGroup
            legend="희망 지역"
            options={REGION_OPTIONS}
            selected={regions}
            isActive={(value) =>
              value === NATIONWIDE_REGION ? isNationwideSelection(regions) : regions.includes(value)
            }
            onToggle={(value) => setRegions((current) => toggleRegionSelection(current, value))}
          />
          <ChoiceGroup
            legend="희망 직종"
            options={OCCUPATION_OPTIONS}
            selected={occupations}
            onToggle={(value) =>
              setOccupations((current) =>
                current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
              )
            }
          />
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
          {sectionStatus('conditions')}
          {saveButton('conditions')}
        </form>
      </Card>

      <Card
        id="resume-summary"
        title="자기 소개"
        description="강점과 하고 싶은 일을 짧게 적어 주세요."
        className="scroll-mt-[7.5rem]"
      >
        <form className="space-y-4" onSubmit={saveSummary} noValidate>
          <div>
            <FieldLabel htmlFor="talent-summary" required>
              자기 소개
            </FieldLabel>
            <textarea
              id="talent-summary"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              className={`${authInputClassName} min-h-28`}
            />
          </div>
          {sectionStatus('summary')}
          {saveButton('summary')}
        </form>
      </Card>

      {returnPath ? (
        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={() => router.push(returnPath)}>
            돌아가기
          </Button>
        </div>
      ) : null}
    </div>
  );
}
