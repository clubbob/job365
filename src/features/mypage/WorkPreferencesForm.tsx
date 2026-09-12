'use client';

import { useEffect, useState } from 'react';
import { Button, Card, FieldLabel } from '@/components/ui/Card';
import { firstRequiredError } from '@/lib/form-required';
import { applyWorkPreferencesToMyProfiles, listMyTalentProfilesForUser } from '@/lib/my-talent-profile';
import { syncMyTalentProfile } from '@/lib/posting-sync';
import { cn } from '@/lib/utils';
import {
  AVAILABLE_OPTIONS,
  NATIONWIDE_REGION,
  OCCUPATION_OPTIONS,
  REGION_OPTIONS,
  isNationwideSelection,
  isAvailableOption,
  loadWorkPreferences,
  workPreferencesAreComplete,
  normalizeAvailable,
  saveWorkPreferences,
  toggleRegionSelection,
  type AvailableOption,
  type OccupationOption,
  type RegionOption,
  type WorkPreferenceInput,
} from '@/lib/work-preferences';
import { talentWorkTypes } from '@/types/talent';
import { JOB_WORK_TYPES, WORK_TYPE_LABELS, type JobWorkType } from '@/types/job';

function toggleValue<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

type PreferenceDraft = WorkPreferenceInput;

function ChoiceGroup<T extends string>({
  legend,
  options,
  selected,
  required,
  optional,
  isActive,
  labelOf,
  onToggle,
}: {
  legend: string;
  options: readonly T[];
  selected: T[];
  required?: boolean;
  optional?: boolean;
  isActive?: (value: T) => boolean;
  labelOf?: (value: T) => string;
  onToggle: (value: T) => void;
}) {
  return (
    <fieldset>
      <FieldLabel required={required} optional={optional}>
        {legend}
      </FieldLabel>
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

function emptyDraft(): PreferenceDraft {
  return {
    regions: [],
    occupations: [],
    workTypes: [],
    available: '',
  };
}

function encodeDraft(draft: PreferenceDraft): string {
  return JSON.stringify(draft);
}

export default function WorkPreferencesForm({
  userId,
  onSaved,
}: {
  userId: string;
  onSaved?: () => void;
}) {
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [occupations, setOccupations] = useState<OccupationOption[]>([]);
  const [workTypes, setWorkTypes] = useState<JobWorkType[]>([]);
  const [available, setAvailable] = useState<AvailableOption | ''>('');
  const [savedDraft, setSavedDraft] = useState<PreferenceDraft>(emptyDraft);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const existing = loadWorkPreferences(userId);
    const latest = listMyTalentProfilesForUser(userId)[0];
    const next: PreferenceDraft = {
      regions: existing?.regions ?? [],
      occupations: existing?.occupations ?? [],
      workTypes: existing?.hasJobConditions
        ? existing.workTypes
        : existing?.workTypes.length
          ? existing.workTypes
          : latest
            ? talentWorkTypes(latest)
            : [],
      available: normalizeAvailable(
        existing?.hasJobConditions ? existing.available : existing?.available || latest?.available || '',
      ),
    };
    setRegions(next.regions);
    setOccupations(next.occupations);
    setWorkTypes(next.workTypes);
    setAvailable(next.available);
    setSavedDraft(next);
    setSaved(false);
    setError('');
  }, [userId]);

  function currentDraft(): PreferenceDraft {
    return {
      regions,
      occupations,
      workTypes,
      available,
    };
  }

  const dirty = encodeDraft(currentDraft()) !== encodeDraft(savedDraft);
  const complete = workPreferencesAreComplete(savedDraft);

  function handleSave() {
    const requiredError = firstRequiredError([
      { ok: regions.length > 0, message: '지역을 하나 이상 선택해 주세요.' },
      { ok: occupations.length > 0, message: '직종을 하나 이상 선택해 주세요.' },
      { ok: workTypes.length > 0, message: '근무 형태를 하나 이상 선택해 주세요.' },
      { ok: isAvailableOption(available), message: '근무 가능을 선택해 주세요.' },
    ]);
    if (requiredError) {
      setError(requiredError);
      setSaved(false);
      return;
    }
    setError('');
    const draft = currentDraft();
    saveWorkPreferences(userId, draft);
    const profiles = applyWorkPreferencesToMyProfiles(userId);
    void Promise.all(profiles.map((profile) => syncMyTalentProfile(profile)));
    setSavedDraft(draft);
    setSaved(true);
    onSaved?.();
  }

  function handleCancel() {
    setRegions(savedDraft.regions);
    setOccupations(savedDraft.occupations);
    setWorkTypes(savedDraft.workTypes);
    setAvailable(savedDraft.available);
    setSaved(false);
    setError('');
  }

  return (
    <Card
      title={
        <span className="inline-flex flex-wrap items-center gap-2">
          희망 근무 조건
          {complete ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">완료</span>
          ) : null}
        </span>
      }
      description="근무 형태, 지역, 직종, 근무 가능을 모두 저장해야 이력서를 등록하고 공개할 수 있습니다. 고른 조건은 맞는 채용 정보를 찾는 데 도움이 되고, 공개한 이력서에도 반영됩니다."
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          handleSave();
        }}
      >
        <ChoiceGroup
          legend="근무 형태"
          required
          options={JOB_WORK_TYPES}
          selected={workTypes}
          labelOf={(value) => WORK_TYPE_LABELS[value]}
          onToggle={(value) => {
            setSaved(false);
            setWorkTypes((current) => toggleValue(current, value));
          }}
        />
        <ChoiceGroup
          legend="지역"
          required
          options={REGION_OPTIONS}
          selected={regions}
          isActive={(value) =>
            value === NATIONWIDE_REGION ? isNationwideSelection(regions) : regions.includes(value)
          }
          onToggle={(value) => {
            setSaved(false);
            setRegions((current) => toggleRegionSelection(current, value));
          }}
        />
        <ChoiceGroup
          legend="직종"
          required
          options={OCCUPATION_OPTIONS}
          selected={occupations}
          onToggle={(value) => {
            setSaved(false);
            setOccupations((current) => toggleValue(current, value));
          }}
        />
        <ChoiceGroup
          legend="근무 가능"
          required
          options={AVAILABLE_OPTIONS}
          selected={available ? [available] : []}
          onToggle={(value) => {
            setSaved(false);
            setAvailable((current) => (current === value ? '' : value));
          }}
        />
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {saved && !dirty ? <p className="text-sm font-medium text-primary">희망 근무 조건을 저장했습니다.</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={!dirty}>
            저장
          </Button>
          {dirty ? (
            <Button type="button" variant="secondary" onClick={handleCancel}>
              취소
            </Button>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
