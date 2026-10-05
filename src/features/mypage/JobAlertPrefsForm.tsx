'use client';

import { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { Button, Card } from '@/components/ui/Card';
import {
  COMPANY_SIZES,
  EMPLOYMENT_TYPES,
  JOB_REGIONS,
  JOB_ROLES,
  type CompanySize,
  type EmploymentType,
  type JobRegion,
  type JobRole,
} from '@/lib/job-board/constants';
import type { JobAlertPrefs } from '@/types/job-alert-prefs';
import { cn } from '@/lib/utils';

function toggleItem<T extends string>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((v) => v !== item) : [...list, item];
}

function CheckboxGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T[];
  onChange: (next: T[]) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-semibold text-foreground">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = value.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(toggleItem(value, option))}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors',
                checked
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-neutral-100 text-muted hover:bg-neutral-200 hover:text-foreground',
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function JobAlertPrefsForm({ user }: { user: User }) {
  const [prefs, setPrefs] = useState<JobAlertPrefs | null>(null);
  const [draft, setDraft] = useState<JobAlertPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      setLoading(true);
      setError('');
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/users/me/job-alert-prefs', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = (await res.json()) as { ok?: boolean; data?: { prefs: JobAlertPrefs } };
        if (!res.ok || !json.ok || !json.data) {
          throw new Error('수신 설정을 불러오지 못했습니다.');
        }
        if (!mounted) return;
        setPrefs(json.data.prefs);
        setDraft(json.data.prefs);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : '수신 설정을 불러오지 못했습니다.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user]);

  const dirty = useMemo(() => {
    if (!prefs || !draft) return false;
    return JSON.stringify(prefs) !== JSON.stringify(draft);
  }, [prefs, draft]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!draft || !dirty || saving) return;

    setSaving(true);
    setError('');
    setSaved(false);

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/users/me/job-alert-prefs', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailEnabled: draft.emailEnabled,
          employmentTypes: draft.employmentTypes,
          roles: draft.roles,
          regions: draft.regions,
          companySizes: draft.companySizes,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; data?: { prefs: JobAlertPrefs }; error?: { message?: string } };
      if (!res.ok || !json.ok || !json.data) {
        throw new Error(json.error?.message ?? '수신 설정을 저장하지 못했습니다.');
      }
      setPrefs(json.data.prefs);
      setDraft(json.data.prefs);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '수신 설정을 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (!prefs) return;
    setDraft(prefs);
    setError('');
    setSaved(false);
  }

  if (loading) {
    return <p className="text-sm text-muted">수신 설정을 불러오는 중…</p>;
  }

  if (!draft) {
    return <p className="text-sm text-red-700">{error || '수신 설정을 불러오지 못했습니다.'}</p>;
  }

  return (
    <Card>
      <form className="flex flex-col gap-5" onSubmit={(e) => void handleSave(e)}>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold text-foreground">수신 여부</legend>
          <div className="flex flex-wrap gap-2">
            {[
              { value: true, label: '채용 공고 이메일 받기' },
              { value: false, label: '받지 않기' },
            ].map((item) => (
              <button
                key={String(item.value)}
                type="button"
                onClick={() => setDraft({ ...draft, emailEnabled: item.value })}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors',
                  draft.emailEnabled === item.value
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-neutral-100 text-muted hover:bg-neutral-200 hover:text-foreground',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </fieldset>

        <CheckboxGroup
          label="채용 형태"
          options={EMPLOYMENT_TYPES}
          value={draft.employmentTypes}
          onChange={(employmentTypes: EmploymentType[]) => setDraft({ ...draft, employmentTypes })}
        />
        <CheckboxGroup
          label="관심 직무"
          options={JOB_ROLES}
          value={draft.roles}
          onChange={(roles: JobRole[]) => setDraft({ ...draft, roles })}
        />
        <CheckboxGroup
          label="희망 지역"
          options={JOB_REGIONS}
          value={draft.regions}
          onChange={(regions: JobRegion[]) => setDraft({ ...draft, regions })}
        />
        <CheckboxGroup
          label="기업 규모"
          options={COMPANY_SIZES}
          value={draft.companySizes}
          onChange={(companySizes: CompanySize[]) => setDraft({ ...draft, companySizes })}
        />

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}
        {saved ? <p className="text-sm font-medium text-green-700">저장했습니다.</p> : null}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={!dirty || saving}>
            {saving ? '저장 중…' : '저장'}
          </Button>
          {dirty ? (
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg border border-border-strong bg-surface px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-neutral-50"
            >
              취소
            </button>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
