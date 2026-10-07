'use client';

import { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import MultiSelect from '@/components/ui/MultiSelect';
import { Button, Card } from '@/components/ui/Card';
import { filterChipButtonClass } from '@/features/job-board/filter-chips';
import {
  EMPLOYMENT_TYPES,
  JOB_REGIONS,
  JOB_ROLES,
  QUICK_EMPLOYMENT_TYPES,
  type JobRegion,
  type JobRole,
} from '@/lib/job-board/constants';
import { formatKoreaDateTime } from '@/lib/datetime';
import type { JobAlertPrefs } from '@/types/job-alert-prefs';

const ALERT_EMPLOYMENT_TYPES = [
  ...QUICK_EMPLOYMENT_TYPES,
  ...EMPLOYMENT_TYPES.filter((type) => !QUICK_EMPLOYMENT_TYPES.includes(type)),
] as const;

function toggleItem<T extends string>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((v) => v !== item) : [...list, item];
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
          throw new Error('맞춤 채용 설정을 불러오지 못했습니다.');
        }
        if (!mounted) return;
        setPrefs(json.data.prefs);
        setDraft(json.data.prefs);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : '맞춤 채용 설정을 불러오지 못했습니다.');
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
        }),
      });
      const json = (await res.json()) as { ok?: boolean; data?: { prefs: JobAlertPrefs }; error?: { message?: string } };
      if (!res.ok || !json.ok || !json.data) {
        throw new Error(json.error?.message ?? '맞춤 채용 설정을 저장하지 못했습니다.');
      }
      setPrefs(json.data.prefs);
      setDraft(json.data.prefs);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '맞춤 채용 설정을 저장하지 못했습니다.');
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
    return <p className="text-sm text-muted">맞춤 채용 설정을 불러오는 중…</p>;
  }

  if (!draft) {
    return <p className="text-sm text-red-700">{error || '맞춤 채용 설정을 불러오지 못했습니다.'}</p>;
  }

  return (
    <Card>
      {prefs?.updatedAt ? (
        <p className="mb-4 text-sm text-muted">최근 업데이트 {formatKoreaDateTime(prefs.updatedAt)}</p>
      ) : null}
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
                className={filterChipButtonClass(draft.emailEnabled === item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold text-foreground">채용 형태</legend>
          <div className="flex flex-wrap gap-2" role="group" aria-label="채용 형태">
            <button
              type="button"
              onClick={() => setDraft({ ...draft, employmentTypes: [] })}
              className={filterChipButtonClass(draft.employmentTypes.length === 0)}
            >
              전체
            </button>
            {ALERT_EMPLOYMENT_TYPES.map((option) => {
              const checked = draft.employmentTypes.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      employmentTypes: toggleItem(draft.employmentTypes, option),
                    })
                  }
                  className={filterChipButtonClass(checked)}
                >
                  {option}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted">선택하지 않으면 모든 채용 형태를 받습니다.</p>
        </fieldset>

        <div className="grid gap-3 rounded-xl border border-border bg-neutral-50/80 p-3 sm:grid-cols-2">
          <MultiSelect
            id="alert-role-filter"
            label="관심 직무"
            allLabel="전체"
            options={JOB_ROLES}
            selected={draft.roles}
            onChange={(roles: JobRole[]) => setDraft({ ...draft, roles })}
          />
          <MultiSelect
            id="alert-region-filter"
            label="희망 지역"
            allLabel="전체"
            options={JOB_REGIONS}
            selected={draft.regions}
            onChange={(regions: JobRegion[]) => setDraft({ ...draft, regions })}
          />
        </div>

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
