'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/navigation/PageHeader';
import {
  DetailBadge,
  DetailHero,
  DetailSection,
  DetailStatGrid,
  DetailTags,
  DetailText,
} from '@/components/ui/PostingDetail';
import { Card } from '@/components/ui/Card';
import {
  adminDangerActionClassName,
  adminJson,
  adminPrimaryActionClassName,
  adminSecondaryActionClassName,
} from '@/lib/admin-ui';
import { deleteMyTalentProfileById, findMyTalentProfile, saveMyTalentProfile } from '@/lib/my-talent-profile';
import { displayTalentName, talentEducation } from '@/lib/talent-display';
import { WORK_TYPE_LABELS } from '@/types/job';
import type { TalentProfile } from '@/types/talent';

type ItemResponse =
  | { ok: true; data: { item: { ownerId: string; profile: TalentProfile } | null } }
  | { ok: false; error?: { message?: string } };

export default function AdminTalentDetailClient({ talentId }: { talentId: string }) {
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
          saveMyTalentProfile(data.data.item.ownerId, data.data.item.profile);
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

  async function handleDelete() {
    if (!item) return;
    if (!window.confirm(`${item.profile.name} 이력서를 삭제할까요?`)) return;
    deleteMyTalentProfileById(item.profile.id);
    try {
      await adminJson(`/api/admin/talents/${encodeURIComponent(item.ownerId)}`, { method: 'DELETE' });
    } catch {
      // 로컬에서는 이미 지웠습니다.
    }
    router.push('/admin/talents');
  }

  if (!ready) {
    return <p className="py-8 text-center text-sm text-muted">불러오는 중…</p>;
  }

  if (!item) {
    return (
      <div className="space-y-5">
        <PageHeader title="이력서" homeHref="/admin/talents" homeLabel="목록으로" />
        <Card>
          <p className="text-sm text-muted">이력서를 찾을 수 없습니다.</p>
        </Card>
      </div>
    );
  }

  const talent = item.profile;
  const workType = WORK_TYPE_LABELS[talent.workType];
  const displayName = displayTalentName(talent.name, true);

  return (
    <div className="space-y-5">
      <PageHeader title="이력서" description={talent.headline} homeHref="/admin/talents" homeLabel="목록으로" />
      <div className="flex flex-wrap gap-2">
        <Link href={`/talents/${talent.id}`} className={adminSecondaryActionClassName}>
          사이트에서 보기
        </Link>
        <Link href={`/admin/talents/${encodeURIComponent(item.ownerId)}/edit`} className={adminPrimaryActionClassName}>
          수정
        </Link>
        <button type="button" className={adminDangerActionClassName} onClick={() => void handleDelete()}>
          삭제
        </button>
      </div>
      <article className="space-y-4">
        <DetailHero
          eyebrow={displayName}
          title={talent.headline}
          badges={
            <>
              <DetailBadge tone="primary">{workType}</DetailBadge>
              <DetailBadge>{talent.careerLabel}</DetailBadge>
              <DetailBadge>{talentEducation(talent)}</DetailBadge>
            </>
          }
          highlightLabel={talent.desiredPay ? '희망 급여' : undefined}
          highlightValue={talent.desiredPay || undefined}
          facts={[
            { label: '희망 근무지', value: talent.location || '—' },
            { label: '가능 시기', value: talent.available || '—' },
            { label: '경력', value: talent.careerLabel },
          ]}
        />
        <DetailStatGrid
          items={[
            { label: '이름', value: displayName },
            { label: '직무', value: talent.headline },
            { label: '희망 근무 형태', value: workType },
            { label: '경력', value: talent.careerLabel },
            { label: '학력', value: talentEducation(talent) },
            { label: '희망 근무지', value: talent.location },
            { label: '가능 시기', value: talent.available },
            { label: '학교', value: talent.school },
            { label: '전공', value: talent.major },
          ]}
        />
        <DetailSection title="자기 소개">
          <DetailText value={talent.summary} />
        </DetailSection>
        <DetailSection title="경력 사항">
          <DetailText value={talent.careerHistory} />
        </DetailSection>
        <DetailSection title="자격증">
          <DetailText value={talent.experience} />
        </DetailSection>
        <DetailSection title="어학">
          <DetailText value={talent.languages} />
        </DetailSection>
        <DetailSection title="스킬">
          <DetailTags items={talent.tags} />
        </DetailSection>
        <DetailSection title="포트폴리오">
          {talent.portfolioUrl ? (
            <a
              href={talent.portfolioUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full break-all rounded-lg bg-primary/10 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/15"
            >
              {talent.portfolioUrl}
            </a>
          ) : (
            <p className="text-subtle">—</p>
          )}
        </DetailSection>
      </article>
    </div>
  );
}
