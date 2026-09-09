'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import {
  adminDangerActionClassName,
  adminJson,
  adminPrimaryActionClassName,
  adminSecondaryActionClassName,
} from '@/lib/admin-ui';
import { deleteMyTalentProfileById, listMyTalentProfilesWithOwners } from '@/lib/my-talent-profile';
import { talentEducation, talentRecentDate } from '@/lib/talent-display';
import { WORK_TYPE_LABELS } from '@/types/job';
import type { TalentProfile } from '@/types/talent';

type TalentRow = { ownerId: string; profile: TalentProfile };

type ListResponse =
  | { ok: true; data: { talents: TalentRow[]; firebaseReady?: boolean } }
  | { ok: false; error?: { message?: string } };

function mergeRows(remote: TalentRow[], local: TalentRow[]): TalentRow[] {
  const map = new Map<string, TalentRow>();
  for (const item of local) map.set(item.profile.id, item);
  for (const item of remote) map.set(item.profile.id, item);
  return [...map.values()].sort((a, b) => talentRecentDate(b.profile).localeCompare(talentRecentDate(a.profile)));
}

export default function AdminTalentsClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<TalentRow[]>([]);

  async function load() {
    setLoading(true);
    setError('');
    const local = listMyTalentProfilesWithOwners().map((item) => ({ ownerId: item.userId, profile: item.profile }));
    try {
      const data = await adminJson<ListResponse>('/api/admin/talents');
      if (!data.ok) throw new Error(data.error?.message || '이력서를 불러오지 못했습니다.');
      setRows(mergeRows(data.data.talents, local));
    } catch (err) {
      setRows(local);
      setError(err instanceof Error ? err.message : '이력서를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleDelete(row: TalentRow) {
    if (!window.confirm(`${row.profile.name} 이력서를 삭제할까요?`)) return;
    deleteMyTalentProfileById(row.profile.id);
    try {
      await adminJson(`/api/admin/talents/${encodeURIComponent(row.ownerId)}`, { method: 'DELETE' });
    } catch {
      // 로컬에서는 이미 지웠습니다.
    }
    setRows((current) => current.filter((item) => item.profile.id !== row.profile.id));
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="이력서"
        description="등록된 이력서를 확인하고 수정·삭제합니다."
        homeHref="/admin"
        homeLabel="관리 홈"
      />
      <Card>
        {loading ? (
          <p className="text-sm text-muted">불러오는 중…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted">
            {error || '등록된 이력서가 없습니다. 회원이 등록하면 여기에 나타납니다.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            {error ? <p className="mb-3 text-sm text-muted">{error}</p> : null}
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-subtle">
                  <th className="py-2 pr-4 font-semibold">이름</th>
                  <th className="py-2 pr-4 font-semibold">직무</th>
                  <th className="py-2 pr-4 font-semibold">희망 근무</th>
                  <th className="py-2 pr-4 font-semibold">최근 저장</th>
                  <th className="py-2 font-semibold">관리</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.profile.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-foreground">{row.profile.name}</td>
                    <td className="py-2.5 pr-4 text-muted">{row.profile.headline}</td>
                    <td className="py-2.5 pr-4 text-muted">
                      {WORK_TYPE_LABELS[row.profile.workType]} · {talentEducation(row.profile)}
                    </td>
                    <td className="py-2.5 pr-4 whitespace-nowrap text-muted">{talentRecentDate(row.profile)}</td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        <Link
                          href={`/admin/talents/${encodeURIComponent(row.ownerId)}`}
                          className={adminSecondaryActionClassName}
                        >
                          보기
                        </Link>
                        <Link
                          href={`/admin/talents/${encodeURIComponent(row.ownerId)}/edit`}
                          className={adminPrimaryActionClassName}
                        >
                          수정
                        </Link>
                        <button type="button" className={adminDangerActionClassName} onClick={() => void handleDelete(row)}>
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
