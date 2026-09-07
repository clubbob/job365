'use client';

import { useEffect, useState } from 'react';
import { Button, Card, FieldLabel } from '@/components/ui/Card';
import { authInputClassName } from '@/lib/auth-ui';
import { getKoreaDateLocalToday } from '@/lib/datetime';
import { loadMyTalentProfile, saveMyTalentProfile } from '@/lib/my-talent-profile';
import { WORK_TYPE_FILTERS, WORK_TYPE_LABELS, type JobWorkType } from '@/types/job';
import { EDUCATION_OPTIONS, isEducationLevel, type EducationLevel, type TalentProfile } from '@/types/talent';

const WORK_TYPES: JobWorkType[] = WORK_TYPE_FILTERS.flatMap((item) =>
  item.id === 'all' ? [] : [item.id],
);

export default function MyTalentProfileForm({ userId, nickname }: { userId: string; nickname: string }) {
  const [name, setName] = useState(nickname);
  const [headline, setHeadline] = useState('');
  const [workType, setWorkType] = useState<JobWorkType>('fulltime');
  const [careerLabel, setCareerLabel] = useState('');
  const [education, setEducation] = useState<EducationLevel | ''>('');
  const [location, setLocation] = useState('');
  const [desiredPay, setDesiredPay] = useState('');
  const [available, setAvailable] = useState('');
  const [summary, setSummary] = useState('');
  const [experience, setExperience] = useState('');
  const [tags, setTags] = useState('');
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const existing = loadMyTalentProfile(userId);
    if (!existing) {
      setName(nickname);
      return;
    }
    setName(existing.name);
    setHeadline(existing.headline);
    setWorkType(existing.workType);
    setCareerLabel(existing.careerLabel);
    setEducation(isEducationLevel(existing.education) ? existing.education : '');
    setLocation(existing.location);
    setDesiredPay(existing.desiredPay);
    setAvailable(existing.available);
    setSummary(existing.summary);
    setExperience(existing.experience);
    setTags(existing.tags.join(', '));
    setCreatedAt(existing.createdAt);
    setUpdatedAt(existing.updatedAt);
  }, [nickname, userId]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isEducationLevel(education)) {
      setSaved(false);
      setError('학력은 필수 등록 항목입니다.');
      return;
    }
    setError('');
    const today = getKoreaDateLocalToday();
    const profile: TalentProfile = {
      id: `talent-me-${userId}`,
      name: name.trim(),
      headline: headline.trim(),
      workType,
      careerLabel: careerLabel.trim(),
      education,
      location: location.trim(),
      desiredPay: desiredPay.trim(),
      available: available.trim(),
      summary: summary.trim(),
      experience: experience.trim(),
      tags: tags
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      createdAt: createdAt ?? today,
      updatedAt: today,
    };
    saveMyTalentProfile(userId, profile);
    setCreatedAt(profile.createdAt);
    setUpdatedAt(profile.updatedAt);
    setSaved(true);
  }

  return (
    <div id="resume" className="scroll-mt-20">
    <Card
      title="인재 프로필"
      description="학력은 필수입니다. 저장하면 인재 정보에 반영되고, 프로필 최근일은 수정한 날짜로 바뀝니다."
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <FieldLabel htmlFor="talent-name">이름</FieldLabel>
          <input
            id="talent-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={authInputClassName}
            required
          />
        </div>
        <div>
          <FieldLabel htmlFor="talent-headline">직무</FieldLabel>
          <input
            id="talent-headline"
            value={headline}
            onChange={(event) => setHeadline(event.target.value)}
            placeholder="예: 프론트엔드 개발"
            className={authInputClassName}
            required
          />
        </div>
        <div>
          <FieldLabel htmlFor="talent-work-type">희망 근무 형태</FieldLabel>
          <select
            id="talent-work-type"
            value={workType}
            onChange={(event) => setWorkType(event.target.value as JobWorkType)}
            className={authInputClassName}
          >
            {WORK_TYPES.map((item) => (
              <option key={item} value={item}>
                {WORK_TYPE_LABELS[item]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel htmlFor="talent-career">경력</FieldLabel>
          <input
            id="talent-career"
            value={careerLabel}
            onChange={(event) => setCareerLabel(event.target.value)}
            placeholder="예: 경력 3년"
            className={authInputClassName}
            required
          />
        </div>
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
            className={authInputClassName}
            required
          >
            <option value="" disabled>
              학력을 선택하세요
            </option>
            {EDUCATION_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          {error ? <p className="mt-1.5 text-sm text-danger">{error}</p> : null}
        </div>
        <div>
          <FieldLabel htmlFor="talent-location">희망 근무지</FieldLabel>
          <input
            id="talent-location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className={authInputClassName}
            required
          />
        </div>
        <div>
          <FieldLabel htmlFor="talent-pay">희망 급여</FieldLabel>
          <input
            id="talent-pay"
            value={desiredPay}
            onChange={(event) => setDesiredPay(event.target.value)}
            placeholder="예: 월급 300만원"
            className={authInputClassName}
            required
          />
        </div>
        <div>
          <FieldLabel htmlFor="talent-available">가능 시기</FieldLabel>
          <input
            id="talent-available"
            value={available}
            onChange={(event) => setAvailable(event.target.value)}
            placeholder="예: 즉시 가능"
            className={authInputClassName}
            required
          />
        </div>
        <div>
          <FieldLabel htmlFor="talent-summary">소개</FieldLabel>
          <textarea
            id="talent-summary"
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            className={`${authInputClassName} min-h-24`}
            required
          />
        </div>
        <div>
          <FieldLabel htmlFor="talent-experience">경력 요약</FieldLabel>
          <textarea
            id="talent-experience"
            value={experience}
            onChange={(event) => setExperience(event.target.value)}
            className={`${authInputClassName} min-h-24`}
            required
          />
        </div>
        <div>
          <FieldLabel htmlFor="talent-tags" optional>
            태그
          </FieldLabel>
          <input
            id="talent-tags"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="쉼표로 구분해 입력"
            className={authInputClassName}
          />
        </div>
        {updatedAt ? <p className="text-sm text-muted">프로필 최근일 {updatedAt}</p> : null}
        {saved ? <p className="text-sm text-success">저장했습니다. 프로필 최근일이 오늘로 반영됩니다.</p> : null}
        <Button type="submit" fullWidth>
          프로필 저장
        </Button>
      </form>
    </Card>
    </div>
  );
}
