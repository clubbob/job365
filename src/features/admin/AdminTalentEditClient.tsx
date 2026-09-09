'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import MyTalentProfileForm from '@/features/talents/MyTalentProfileForm';
import { adminJson } from '@/lib/admin-ui';
import { findMyTalentProfile, saveMyTalentProfile } from '@/lib/my-talent-profile';
import type { TalentProfile } from '@/types/talent';

type ItemResponse =
  | { ok: true; data: { item: { ownerId: string; profile: TalentProfile } | null } }
  | { ok: false; error?: { message?: string } };

export default function AdminTalentEditClient({ talentId }: { talentId: string }) {
  const router = useRouter();
  const [item, setItem] = useState<{ ownerId: string; profile: TalentProfile } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const local = findMyTalentProfile(talentId);
      try {
        const data = await adminJson<ItemResponse>(`/api/admin/talents/${encodeURIComponent(talentId)}`);
        if (!cancelled && data.ok && data.data.item) {
          setItem(data.data.item);
          setReady(true);
          return;
        }
      } catch {
        // 로컬 저장 건으로 이어갑니다.
      }
      if (!cancelled) {
        setItem(local ? { ownerId: local.userId, profile: local.profile } : null);
        setReady(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [talentId]);

  if (!ready) {
    return <p className="py-8 text-center text-sm text-muted">불러오는 중…</p>;
  }

  if (!item) {
    return (
      <div className="space-y-5">
        <PageHeader title="이력서 수정" homeHref="/admin/talents" homeLabel="목록으로" />
        <Card>
          <p className="text-sm text-muted">이력서를 찾을 수 없습니다.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="이력서 수정" description={item.profile.headline} homeHref="/admin/talents" homeLabel="목록으로" />
      <MyTalentProfileForm
        userId={item.ownerId}
        nickname={item.profile.name}
        returnPath={`/admin/talents/${encodeURIComponent(item.ownerId)}`}
        onSave={async (profile) => {
          saveMyTalentProfile(item.ownerId, profile);
          const res = await adminJson<{ ok?: boolean; error?: { code?: string; message?: string } }>(
            `/api/admin/talents/${encodeURIComponent(item.ownerId)}`,
            { method: 'PUT', body: JSON.stringify(profile) },
          );
          if (res.ok === false && res.error?.code !== 'ADMIN_NOT_CONFIGURED') {
            throw new Error(res.error?.message || '저장에 실패했습니다.');
          }
        }}
      />
      <button
        type="button"
        className="text-sm font-semibold text-muted hover:text-foreground"
        onClick={() => router.push(`/admin/talents/${encodeURIComponent(item.ownerId)}`)}
      >
        취소하고 상세로
      </button>
    </div>
  );
}
