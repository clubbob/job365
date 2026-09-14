'use client';

import { Button, FieldLabel } from '@/components/ui/Card';
import { authInputClassName } from '@/lib/auth-ui';
import { talentSchools, talentSchoolFields, type TalentProfile, type TalentSchool } from '@/types/talent';

export type SchoolDraft = {
  school: string;
  major: string;
};

export function emptySchoolDraft(): SchoolDraft {
  return { school: '', major: '' };
}

export function schoolDraftsFromProfile(profile: Pick<TalentProfile, 'schools' | 'school' | 'major'>): SchoolDraft[] {
  const list = talentSchools(profile);
  return list.length > 0
    ? list.map((item) => ({ school: item.school, major: item.major ?? '' }))
    : [emptySchoolDraft()];
}

export function schoolDraftsFromUnknown(value: unknown): SchoolDraft[] {
  if (!Array.isArray(value)) return [emptySchoolDraft()];
  const next = value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      school: String(item.school ?? ''),
      major: String(item.major ?? ''),
    }));
  return next.length > 0 ? next : [emptySchoolDraft()];
}

export function cleanedSchoolDrafts(schools: SchoolDraft[]): TalentSchool[] {
  return schools
    .map((item) => ({
      school: item.school.trim(),
      major: item.major.trim() || undefined,
    }))
    .filter((item) => item.school);
}

export function schoolFieldsFromDrafts(schools: SchoolDraft[]) {
  return talentSchoolFields(cleanedSchoolDrafts(schools));
}

export default function TalentSchoolFields({
  schools,
  onChange,
}: {
  schools: SchoolDraft[];
  onChange: (next: SchoolDraft[]) => void;
}) {
  function patch(index: number, partial: Partial<SchoolDraft>) {
    onChange(schools.map((item, current) => (current === index ? { ...item, ...partial } : item)));
  }

  function remove(index: number) {
    const next = schools.filter((_, current) => current !== index);
    onChange(next.length > 0 ? next : [emptySchoolDraft()]);
  }

  return (
    <div className="space-y-3">
      {schools.map((item, index) => (
        <div key={index} className="space-y-3 rounded-xl border border-border p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">학교 {index + 1}</p>
            {schools.length > 1 || item.school || item.major ? (
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-xs font-semibold text-danger hover:bg-red-50"
                onClick={() => remove(index)}
              >
                삭제
              </button>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor={`talent-school-${index}`} required>
                학교
              </FieldLabel>
              <input
                id={`talent-school-${index}`}
                value={item.school}
                onChange={(event) => patch(index, { school: event.target.value })}
                placeholder="예: 한국대학교"
                className={authInputClassName}
              />
            </div>
            <div>
              <FieldLabel htmlFor={`talent-major-${index}`} optional>
                전공
              </FieldLabel>
              <input
                id={`talent-major-${index}`}
                value={item.major}
                onChange={(event) => patch(index, { major: event.target.value })}
                placeholder="예: 컴퓨터공학"
                className={authInputClassName}
              />
            </div>
          </div>
        </div>
      ))}
      <Button type="button" variant="secondary" onClick={() => onChange([...schools, emptySchoolDraft()])}>
        학교 추가
      </Button>
    </div>
  );
}
