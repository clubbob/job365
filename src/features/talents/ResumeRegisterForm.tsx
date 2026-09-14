'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, FieldLabel } from '@/components/ui/Card';
import AutoGrowTextarea from '@/components/ui/AutoGrowTextarea';
import { authInputClassName } from '@/lib/auth-ui';
import { getKoreaDateLocalToday } from '@/lib/datetime';
import { firstRequiredError } from '@/lib/form-required';
import {
  RESIDENCE_CITIES,
  RESIDENCE_DISTRICTS,
  formatResidence,
  isCompleteResidence,
  parseResidence,
  type ResidenceCity,
} from '@/lib/korea-regions';
import { canPublishMyTalentProfile, createEmptyTalentProfile, createTalentProfileId, getMyTalentProfile, missingPublishRequirements, saveMyTalentProfile } from '@/lib/my-talent-profile';
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
  AVAILABLE_OPTIONS,
  NATIONWIDE_REGION,
  OCCUPATION_OPTIONS,
  REGION_OPTIONS,
  isAvailableOption,
  isNationwideSelection,
  isOccupationOption,
  isRegionOption,
  headlineFromOccupations,
  loadWorkPreferences,
  locationLabelFromRegions,
  normalizeAvailable,
  toggleRegionSelection,
  workPreferencesAreComplete,
  workPreferencesFromTalent,
  type AvailableOption,
  type OccupationOption,
  type RegionOption,
} from '@/lib/work-preferences';
import {
  CAREER_TYPE_LABELS,
  JOBSEEKER_CAREER_TYPES,
  JOB_WORK_TYPES,
  WORK_TYPE_LABELS,
  formatCareerYearsInput,
  isJobCareerType,
  isJobWorkType,
  parseCareerYears,
  type JobCareerType,
  type JobWorkType,
} from '@/types/job';
import TalentSchoolFields, {
  emptySchoolDraft,
  schoolDraftsFromProfile,
  schoolDraftsFromUnknown,
  schoolFieldsFromDrafts,
  type SchoolDraft,
} from '@/features/talents/TalentSchoolFields';
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

const SECTIONS = [
  { id: 'basics', label: '기본 정보' },
  { id: 'conditions', label: '희망 근무 조건' },
  { id: 'education', label: '학력 정보' },
  { id: 'career', label: '경력 정보' },
  { id: 'skills', label: '보유 역량' },
  { id: 'summary', label: '자기 소개' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];
type SectionSnapshots = Record<SectionId, string>;

type SectionValues = {
  title: string;
  name: string;
  photoUrl: string;
  birthYear: string;
  birthMonth: string;
  gender: string;
  phone: string;
  email: string;
  residenceCity: string;
  residenceDistrict: string;
  homepage: string;
  workTypes: JobWorkType[];
  regions: RegionOption[];
  occupations: OccupationOption[];
  available: AvailableOption | '';
  education: string;
  schools: Array<{ school: string; major: string }>;
  careerType: string;
  careerMinYears: string;
  careerHistory: string;
  experience: string;
  languages: string;
  tags: string;
  summary: string;
};

function snapshotsFromValues(values: SectionValues): SectionSnapshots {
  return {
    basics: JSON.stringify({
      title: values.title,
      name: values.name,
      photoUrl: values.photoUrl,
      birthYear: values.birthYear,
      birthMonth: values.birthMonth,
      gender: values.gender,
      phone: values.phone,
      email: values.email,
      residenceCity: values.residenceCity,
      residenceDistrict: values.residenceDistrict,
      homepage: values.homepage,
    }),
    conditions: JSON.stringify({
      workTypes: values.workTypes,
      regions: values.regions,
      occupations: values.occupations,
      available: values.available,
    }),
    education: JSON.stringify({
      education: values.education,
      schools: values.schools,
    }),
    career: JSON.stringify({
      careerType: values.careerType,
      careerMinYears: values.careerMinYears,
      careerHistory: values.careerHistory,
    }),
    skills: JSON.stringify({
      experience: values.experience,
      languages: values.languages,
      tags: values.tags,
    }),
    summary: JSON.stringify({ summary: values.summary }),
  };
}

function isSectionComplete(id: SectionId, values: SectionValues): boolean {
  switch (id) {
    case 'basics': {
      const birthDate = composeBirthDate(values.birthYear, values.birthMonth);
      const thisMonth = getKoreaDateLocalToday().slice(0, 7);
      return (
        Boolean(values.title.trim()) &&
        Boolean(values.name.trim()) &&
        Boolean(birthDate) &&
        birthDate <= thisMonth &&
        isTalentGender(values.gender) &&
        (!values.phone.trim() || isValidPhone(values.phone)) &&
        isValidEmail(values.email) &&
        isCompleteResidence(values.residenceCity, values.residenceDistrict)
      );
    }
    case 'conditions':
      return workPreferencesAreComplete({
        workTypes: values.workTypes,
        regions: values.regions,
        occupations: values.occupations,
        available: values.available,
      });
    case 'education':
      return isEducationLevel(values.education) && values.schools.some((item) => item.school.trim());
    case 'career':
      return (
        isJobCareerType(values.careerType) &&
        (values.careerType !== 'experienced' || Boolean(parseCareerYears(values.careerMinYears)))
      );
    case 'skills':
      return true;
    case 'summary':
      return Boolean(values.summary.trim());
  }
}

const controlClassName =
  'rounded-xl border border-border-strong bg-surface px-4 py-3 text-sm font-medium text-foreground outline-none transition placeholder:text-subtle placeholder:font-normal focus:border-primary focus:ring-2 focus:ring-primary/25 sm:text-base';

function PlaceholderOption() {
  return <option value="">선택</option>;
}

function toggleValue<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
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

function emptyConditions() {
  return {
    workTypes: [] as JobWorkType[],
    regions: [] as RegionOption[],
    occupations: [] as OccupationOption[],
    available: '' as AvailableOption | '',
  };
}

function seedConditions(existing: TalentProfile | null, userId: string) {
  const prefs = loadWorkPreferences(userId);
  const fromProfile = existing ? workPreferencesFromTalent(existing) : emptyConditions();
  return {
    workTypes: fromProfile.workTypes.length ? fromProfile.workTypes : prefs?.workTypes ?? [],
    regions: fromProfile.regions.length ? fromProfile.regions : prefs?.regions ?? [],
    occupations: fromProfile.occupations.length ? fromProfile.occupations : prefs?.occupations ?? [],
    available: normalizeAvailable(fromProfile.available || prefs?.available || ''),
  };
}

function asWorkTypes(value: unknown): JobWorkType[] {
  return Array.isArray(value) ? value.filter(isJobWorkType) : [];
}

function asRegions(value: unknown): RegionOption[] {
  return Array.isArray(value) ? value.filter(isRegionOption) : [];
}

function asOccupations(value: unknown): OccupationOption[] {
  return Array.isArray(value) ? value.filter(isOccupationOption) : [];
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

function parseTags(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
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
  const [workTypes, setWorkTypes] = useState<JobWorkType[]>([]);
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [occupations, setOccupations] = useState<OccupationOption[]>([]);
  const [available, setAvailable] = useState<AvailableOption | ''>('');
  const [education, setEducation] = useState<EducationLevel | ''>('');
  const [schools, setSchools] = useState<SchoolDraft[]>(() => [emptySchoolDraft()]);
  const [careerType, setCareerType] = useState<JobCareerType | ''>('');
  const [careerMinYears, setCareerMinYears] = useState('');
  const [careerHistory, setCareerHistory] = useState('');
  const [experience, setExperience] = useState('');
  const [languages, setLanguages] = useState('');
  const [tags, setTags] = useState('');
  const [summary, setSummary] = useState('');
  const [savingSection, setSavingSection] = useState<SectionId | null>(null);
  const [savedSection, setSavedSection] = useState<SectionId | null>(null);
  const [error, setError] = useState<{ section: SectionId; message: string } | null>(null);
  const [savedSnapshots, setSavedSnapshots] = useState<SectionSnapshots | null>(null);

  useEffect(() => {
    const existing = getMyTalentProfile(userId, resumeId);
    const conditions = seedConditions(existing, userId);
    const storedConditions = existing ? workPreferencesFromTalent(existing) : emptyConditions();

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
      setWorkTypes(conditions.workTypes);
      setRegions(conditions.regions);
      setOccupations(conditions.occupations);
      setAvailable(conditions.available);
      setEducation('');
      setSchools([emptySchoolDraft()]);
      setCareerType('');
      setCareerMinYears('');
      setCareerHistory('');
      setExperience('');
      setLanguages('');
      setTags('');
      setSummary('');
      setSavedSnapshots(
        snapshotsFromValues({
          title: '',
          name: nickname,
          photoUrl: '',
          birthYear: '',
          birthMonth: '',
          gender: '',
          phone: '',
          email: accountEmail ?? '',
          residenceCity: '',
          residenceDistrict: '',
          homepage: '',
          workTypes: storedConditions.workTypes,
          regions: storedConditions.regions,
          occupations: storedConditions.occupations,
          available: storedConditions.available,
          education: '',
          schools: [emptySchoolDraft()],
          careerType: '',
          careerMinYears: '',
          careerHistory: '',
          experience: '',
          languages: '',
          tags: '',
          summary: '',
        }),
      );
      return;
    }

    const birth = splitBirthDate(existing.birthDate ?? '');
    const residence = parseResidence(existing.address ?? '');
    const career = parseCareer(existing.careerLabel);
    const nextTitle = existing.title || existing.headline || '';
    const nextName = existing.name || nickname;
    const nextPhoto = existing.photoUrl ?? '';
    const nextGender = existing.gender ?? '';
    const nextPhone = existing.phone ?? '';
    const nextEmail = existing.email || accountEmail || '';
    const nextHomepage = existing.homepage ?? '';
    const nextEducation = normalizeEducation(existing.education);
    const nextSchools = schoolDraftsFromProfile(existing);
    const nextCareerHistory = existing.careerHistory ?? '';
    const nextLanguages = existing.languages ?? '';
    const nextTags = existing.tags.join(', ');

    setTitle(nextTitle);
    setName(nextName);
    setPhotoUrl(nextPhoto);
    setBirthYear(birth.year);
    setBirthMonth(birth.month);
    setGender(nextGender);
    setPhone(nextPhone);
    setEmail(nextEmail);
    setResidenceCity(residence.city);
    setResidenceDistrict(residence.district);
    setHomepage(nextHomepage);
    setWorkTypes(conditions.workTypes);
    setRegions(conditions.regions);
    setOccupations(conditions.occupations);
    setAvailable(conditions.available);
    setEducation(nextEducation);
    setSchools(nextSchools);
    setCareerType(career.type);
    setCareerMinYears(career.years);
    setCareerHistory(nextCareerHistory);
    setExperience(existing.experience);
    setLanguages(nextLanguages);
    setTags(nextTags);
    setSummary(existing.summary);
    setSavedSnapshots(
      snapshotsFromValues({
        title: existing.title || '',
        name: existing.name,
        photoUrl: nextPhoto,
        birthYear: birth.year,
        birthMonth: birth.month,
        gender: nextGender,
        phone: nextPhone,
        email: existing.email ?? '',
        residenceCity: residence.city,
        residenceDistrict: residence.district,
        homepage: nextHomepage,
        workTypes: storedConditions.workTypes,
        regions: storedConditions.regions,
        occupations: storedConditions.occupations,
        available: storedConditions.available,
        education: nextEducation,
        schools: nextSchools,
        careerType: career.type,
        careerMinYears: career.years,
        careerHistory: nextCareerHistory,
        experience: existing.experience,
        languages: nextLanguages,
        tags: nextTags,
        summary: existing.summary,
      }),
    );
  }, [accountEmail, nickname, resumeId, userId]);

  function currentValues(): SectionValues {
    return {
      title,
      name,
      photoUrl,
      birthYear,
      birthMonth,
      gender,
      phone,
      email,
      residenceCity,
      residenceDistrict,
      homepage,
      workTypes,
      regions,
      occupations,
      available,
      education,
      schools,
      careerType,
      careerMinYears,
      careerHistory,
      experience,
      languages,
      tags,
      summary,
    };
  }

  function currentSnapshots(): SectionSnapshots {
    return snapshotsFromValues(currentValues());
  }

  function isDirty(id: SectionId) {
    if (!savedSnapshots) return false;
    return currentSnapshots()[id] !== savedSnapshots[id];
  }

  function restoreSection(id: SectionId) {
    if (!savedSnapshots) return;
    const parsed = JSON.parse(savedSnapshots[id]) as Record<string, unknown>;
    if (id === 'basics') {
      setTitle(String(parsed.title ?? ''));
      setName(String(parsed.name ?? ''));
      setPhotoUrl(String(parsed.photoUrl ?? ''));
      setBirthYear(String(parsed.birthYear ?? ''));
      setBirthMonth(String(parsed.birthMonth ?? ''));
      setGender(isTalentGender(parsed.gender) ? parsed.gender : '');
      setPhone(String(parsed.phone ?? ''));
      setEmail(String(parsed.email ?? ''));
      setResidenceCity(
        typeof parsed.residenceCity === 'string' && parsed.residenceCity ? (parsed.residenceCity as ResidenceCity) : '',
      );
      setResidenceDistrict(String(parsed.residenceDistrict ?? ''));
      setHomepage(String(parsed.homepage ?? ''));
    } else if (id === 'conditions') {
      setWorkTypes(asWorkTypes(parsed.workTypes));
      setRegions(asRegions(parsed.regions));
      setOccupations(asOccupations(parsed.occupations));
      setAvailable(normalizeAvailable(String(parsed.available ?? '')));
    } else if (id === 'education') {
      setEducation(normalizeEducation(parsed.education));
      setSchools(schoolDraftsFromUnknown(parsed.schools));
    } else if (id === 'career') {
      setCareerType(isJobCareerType(String(parsed.careerType ?? '')) ? parsed.careerType as JobCareerType : '');
      setCareerMinYears(formatCareerYearsInput(String(parsed.careerMinYears ?? '')));
      setCareerHistory(String(parsed.careerHistory ?? ''));
    } else if (id === 'skills') {
      setExperience(String(parsed.experience ?? ''));
      setLanguages(String(parsed.languages ?? ''));
      setTags(String(parsed.tags ?? ''));
    } else {
      setSummary(String(parsed.summary ?? ''));
    }
    setError(null);
    if (savedSection === id) setSavedSection(null);
  }

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
    const encoded = currentSnapshots()[section];
    void (async () => {
      try {
        await syncMyTalentProfile(next);
        setSavedSnapshots((current) => (current ? { ...current, [section]: encoded } : current));
        setSavedSection(section);
        onSaved?.(next);
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

  function saveBasics(event: React.FormEvent) {
    event.preventDefault();
    const birthDate = composeBirthDate(birthYear, birthMonth);
    const thisMonth = getKoreaDateLocalToday().slice(0, 7);
    const requiredError = firstRequiredError([
      { ok: Boolean(title.trim()), message: '이력서 제목을 입력해 주세요.' },
      { ok: Boolean(name.trim()), message: '이름을 입력해 주세요.' },
      { ok: Boolean(birthDate) && birthDate <= thisMonth, message: '생년월을 선택해 주세요.' },
      { ok: isTalentGender(gender), message: '성별을 선택해 주세요.' },
      { ok: !phone.trim() || isValidPhone(phone), message: '휴대폰 번호를 확인해 주세요.' },
      { ok: Boolean(email.trim()) && isValidEmail(email), message: '이메일을 입력해 주세요.' },
      { ok: isCompleteResidence(residenceCity, residenceDistrict), message: '거주 지역을 선택해 주세요.' },
    ]);
    if (requiredError) {
      rejectSave('basics', requiredError);
      return;
    }
    if (!isTalentGender(gender)) return;
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

  function saveConditions(event: React.FormEvent) {
    event.preventDefault();
    const requiredError = firstRequiredError([
      { ok: workTypes.length > 0, message: '근무 형태를 하나 이상 선택해 주세요.' },
      { ok: regions.length > 0, message: '지역을 하나 이상 선택해 주세요.' },
      { ok: occupations.length > 0, message: '직종을 하나 이상 선택해 주세요.' },
      { ok: isAvailableOption(available), message: '근무 가능을 선택해 주세요.' },
    ]);
    if (requiredError) {
      rejectSave('conditions', requiredError);
      return;
    }
    mergeAndSave('conditions', {
      workType: workTypes[0] ?? '',
      workTypes,
      location: locationLabelFromRegions(regions),
      occupations,
      available,
      headline: headlineFromOccupations(occupations),
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
    const requiredError = firstRequiredError([
      { ok: isEducationLevel(education), message: '최종 학력을 선택해 주세요.' },
      { ok: schools.some((item) => item.school.trim()), message: '학교를 입력해 주세요.' },
      {
        ok: schools.every((item) => !item.major.trim() || item.school.trim()),
        message: '전공만 있는 학교는 학교 이름을 입력해 주세요.',
      },
    ]);
    if (requiredError) {
      rejectSave('education', requiredError);
      return;
    }
    if (!isEducationLevel(education)) return;
    mergeAndSave('education', {
      education,
      ...schoolFieldsFromDrafts(schools),
    });
  }

  function saveCareer(event: React.FormEvent) {
    event.preventDefault();
    const requiredError = firstRequiredError([
      { ok: isJobCareerType(careerType), message: '경력 유무를 선택해 주세요.' },
      {
        ok: careerType !== 'experienced' || Boolean(parseCareerYears(careerMinYears)),
        message: '경력 연수를 입력해 주세요.',
      },
    ]);
    if (requiredError) {
      rejectSave('career', requiredError);
      return;
    }
    if (!isJobCareerType(careerType)) return;
    mergeAndSave('career', {
      careerLabel: careerLabelFrom(careerType, careerMinYears),
      careerHistory: careerHistory.trim() || undefined,
    });
  }

  function saveSkills(event: React.FormEvent) {
    event.preventDefault();
    mergeAndSave('skills', {
      experience: experience.trim(),
      languages: languages.trim() || undefined,
      tags: parseTags(tags),
    });
  }

  function saveSummary(event: React.FormEvent) {
    event.preventDefault();
    const requiredError = firstRequiredError([
      { ok: Boolean(summary.trim()), message: '자기 소개를 입력해 주세요.' },
    ]);
    if (requiredError) {
      rejectSave('summary', requiredError);
      return;
    }
    mergeAndSave('summary', { summary: summary.trim() });
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

  const values = currentValues();
  const tabsComplete = SECTIONS.every((item) => isSectionComplete(item.id, values));
  const storedProfile = getMyTalentProfile(userId, resumeId);
  const storedPublishReady = storedProfile ? canPublishMyTalentProfile(userId, storedProfile) : false;
  const unsavedComplete = tabsComplete && SECTIONS.some((item) => isDirty(item.id));

  return (
    <div className="space-y-4">
      <nav
        className="sticky top-14 z-40 -mx-4 overflow-x-auto border-b border-border bg-background/95 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-xl sm:border"
        aria-label="이력서 항목"
      >
        <div className="flex gap-1">
          {SECTIONS.map((item) => {
            const complete = isSectionComplete(item.id, values);
            return (
              <a
                key={item.id}
                href={`#resume-${item.id}`}
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
      {storedPublishReady ? (
        <p className="text-sm text-success">모든 탭이 저장되었습니다. 마이페이지의 이력서 관리에서 공개할 수 있습니다.</p>
      ) : tabsComplete ? (
        <p className="text-sm text-muted">
          {unsavedComplete
            ? '입력은 끝났습니다. 각 탭에서 저장을 눌러야 공개할 수 있습니다.'
            : storedProfile
              ? `공개하려면 다음을 저장해 주세요. ${missingPublishRequirements(userId, storedProfile).join(', ')}`
              : '각 탭에서 저장을 눌러야 공개할 수 있습니다.'}
        </p>
      ) : (
        <p className="text-sm text-muted">모든 탭이 완료되어야 공개할 수 있습니다. 지금은 작성 중으로만 저장됩니다.</p>
      )}

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
                <FieldLabel htmlFor="talent-phone" optional>
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
        id="resume-conditions"
        title="희망 근무 조건"
        description="이 이력서로 찾고 싶은 근무 형태, 지역, 직종, 근무 가능을 고릅니다."
        className="scroll-mt-[7.5rem]"
      >
        <form className="space-y-5" onSubmit={saveConditions} noValidate>
          <ChoiceGroup
            legend="근무 형태"
            required
            options={JOB_WORK_TYPES}
            selected={workTypes}
            labelOf={(value) => WORK_TYPE_LABELS[value]}
            onToggle={(value) => setWorkTypes((current) => toggleValue(current, value))}
          />
          <ChoiceGroup
            legend="지역"
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
          <ChoiceGroup
            legend="근무 가능"
            required
            options={AVAILABLE_OPTIONS}
            selected={available ? [available] : []}
            onToggle={(value) => setAvailable((current) => (current === value ? '' : value))}
          />
          {sectionStatus('conditions')}
          {saveButton('conditions')}
        </form>
      </Card>

      <Card
        id="resume-education"
        title="학력 정보"
        description="최종 학력과 학교를 입력합니다. 학교는 여러 곳을 추가할 수 있습니다."
        className="scroll-mt-[7.5rem]"
      >
        <form className="space-y-4" onSubmit={saveEducation} noValidate>
          <div>
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
          <TalentSchoolFields schools={schools} onChange={setSchools} />
          {sectionStatus('education')}
          {saveButton('education')}
        </form>
      </Card>

      <Card
        id="resume-career"
        title="경력 정보"
        description="경력 유무와 주요 경력을 입력합니다."
        className="scroll-mt-[7.5rem]"
      >
        <form className="space-y-4" onSubmit={saveCareer} noValidate>
          <div>
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
          {sectionStatus('career')}
          {saveButton('career')}
        </form>
      </Card>

      <Card
        id="resume-skills"
        title="보유 역량"
        description="자격증, 어학, 스킬을 입력합니다. 비워 두어도 됩니다."
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
          {sectionStatus('skills')}
          {saveButton('skills')}
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
            <AutoGrowTextarea
              id="talent-summary"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              className={`${authInputClassName} min-h-28`}
              required
            />
          </div>
          {sectionStatus('summary')}
          {saveButton('summary')}
        </form>
      </Card>

      <div className="flex">
        <Button type="button" variant="secondary" onClick={() => router.push(returnPath || '/')}>
          돌아가기
        </Button>
      </div>
    </div>
  );
}
