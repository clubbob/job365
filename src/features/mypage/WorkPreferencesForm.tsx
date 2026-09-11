'use client';

import { useEffect, useState } from 'react';
import { Button, Card, FieldLabel } from '@/components/ui/Card';
import {
  NATIONWIDE_REGION,
  OCCUPATION_OPTIONS,
  REGION_OPTIONS,
  isNationwideSelection,
  loadWorkPreferences,
  saveWorkPreferences,
  toggleRegionSelection,
  type OccupationOption,
  type RegionOption,
} from '@/lib/work-preferences';
import { cn } from '@/lib/utils';

function toggleValue<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function ChoiceGroup<T extends string>({
  legend,
  hint,
  options,
  selected,
  isActive,
  onToggle,
}: {
  legend: string;
  hint?: string;
  options: readonly T[];
  selected: T[];
  isActive?: (value: T) => boolean;
  onToggle: (value: T) => void;
}) {
  return (
    <fieldset>
      <FieldLabel>{legend}</FieldLabel>
      {hint ? <p className="-mt-1 mb-2 text-sm text-muted">{hint}</p> : null}
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

export default function WorkPreferencesForm({ userId }: { userId: string }) {
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [occupations, setOccupations] = useState<OccupationOption[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const existing = loadWorkPreferences(userId);
    setRegions(existing?.regions ?? []);
    setOccupations(existing?.occupations ?? []);
    setSaved(false);
    setError('');
  }, [userId]);

  function handleSave() {
    setError('');
    if (regions.length === 0 || occupations.length === 0) {
      setError('희망 지역과 희망 직종을 각각 하나 이상 선택해 주세요.');
      return;
    }
    saveWorkPreferences(userId, { regions, occupations });
    setSaved(true);
  }

  function handleCancel() {
    setRegions([]);
    setOccupations([]);
    setSaved(false);
    setError('');
  }

  return (
    <Card title="희망 근무 조건" description="희망 지역과 희망 직종을 고르면 맞는 채용 정보를 찾는 데 도움이 됩니다.">
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          handleSave();
        }}
      >
        <ChoiceGroup
          legend="희망 지역"
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
          legend="희망 직종"
          options={OCCUPATION_OPTIONS}
          selected={occupations}
          onToggle={(value) => {
            setSaved(false);
            setOccupations((current) => toggleValue(current, value));
          }}
        />
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {saved ? <p className="text-sm font-medium text-primary">희망 근무 조건을 저장했습니다.</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit">저장</Button>
          <Button type="button" variant="secondary" onClick={handleCancel}>
            취소
          </Button>
        </div>
      </form>
    </Card>
  );
}
