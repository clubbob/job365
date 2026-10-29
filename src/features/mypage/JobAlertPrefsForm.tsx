'use client';

import { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import MultiSelect from '@/components/ui/MultiSelect';
import { Button, Card } from '@/components/ui/Card';
import { FormFeedback } from '@/components/ui/FormFeedback';
import { filterChipButtonClass } from '@/features/job-board/filter-chips';
import {
  EMPLOYMENT_TYPES,
  JOB_REGIONS,
  JOB_ROLES,
  type EmploymentType,
  type JobRegion,
  type JobRole,
} from '@/lib/job-board/constants';
import {
  JOB_BOARD_COMPANY_SEGMENTS,
  type JobBoardCompanySegment,
} from '@/lib/job-board/company-segment';
import { formatKoreaDateTime } from '@/lib/datetime';
import { normalizeJobAlertPrefs, type JobAlertPrefs } from '@/types/job-alert-prefs';

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
        const loaded = normalizeJobAlertPrefs(json.data.prefs);
        setPrefs(loaded);
        setDraft(loaded);
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
          companySegments: draft.companySegments,
          roles: draft.roles,
          regions: draft.regions,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; data?: { prefs: JobAlertPrefs }; error?: { message?: string } };
      if (!res.ok || !json.ok || !json.data) {
        throw new Error(json.error?.message ?? '맞춤 채용 설정을 저장하지 못했습니다.');
      }
      const savedPrefs = normalizeJobAlertPrefs(json.data.prefs);
      setPrefs(savedPrefs);
      setDraft(savedPrefs);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '맞춤 채용 설정을 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (!prefs) return;
    setDraft(normalizeJobAlertPrefs(prefs));
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
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-foreground">수신 여부</p>
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
          <p className="text-xs leading-relaxed text-muted">
            &quot;채용 공고 이메일 받기&quot;를 선택하고 저장하면 맞춤 채용 설정에 따라 매일 한 번 채용 공고 안내 메일을
            받는 것에 동의한 것으로 봅니다. 마케팅 수신 동의와는 별개입니다.
          </p>
        </div>

        <div className="border-t border-border" role="presentation" aria-hidden="true" />

        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-foreground">맞춤 조건</p>
          <div className="grid gap-3 rounded-xl border border-border bg-neutral-50/80 p-3 sm:grid-cols-2">
            <MultiSelect
              id="alert-company-segment-filter"
              label="회사 분류"
              allLabel="전체"
              options={JOB_BOARD_COMPANY_SEGMENTS}
              selected={draft.companySegments}
              onChange={(companySegments: JobBoardCompanySegment[]) =>
                setDraft({ ...draft, companySegments })
              }
            />
            <MultiSelect
              id="alert-employment-type-filter"
              label="채용 형태"
              allLabel="전체"
              options={EMPLOYMENT_TYPES}
              selected={draft.employmentTypes}
              onChange={(employmentTypes: EmploymentType[]) =>
                setDraft({ ...draft, employmentTypes })
              }
            />
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
          <p className="text-xs text-muted">선택하지 않으면 해당 항목은 전체로 받습니다.</p>
        </div>

        {error ? <FormFeedback variant="error">{error}</FormFeedback> : null}
        {saved ? <FormFeedback variant="success">저장했습니다.</FormFeedback> : null}

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
