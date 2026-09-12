'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdSlot from '@/components/ads/AdSlot';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import ResumeRegisterForm from '@/features/talents/ResumeRegisterForm';
import { useAuth } from '@/features/auth/auth-context';
import { useUserMode } from '@/features/mode/mode-context';
import { getMyTalentProfile } from '@/lib/my-talent-profile';
import { fetchUserAccount } from '@/lib/users-api';
import { getUserNicknameFallback } from '@/lib/user-display';
import { isWorkPreferencesComplete } from '@/lib/work-preferences';

export default function TalentNewPageClient({
  editId,
  from,
}: {
  editId?: string;
  from?: string;
}) {
  const { user, loading } = useAuth();
  const { mode } = useUserMode();
  const fromMypage = from === 'mypage';
  const returnPath = fromMypage ? '/mypage?tab=resume&sub=resume' : undefined;
  const nextQuery = new URLSearchParams();
  if (editId) nextQuery.set('edit', editId);
  if (from) nextQuery.set('from', from);
  const nextPath = `/talents/new${nextQuery.size > 0 ? `?${nextQuery.toString()}` : ''}`;
  const [nickname, setNickname] = useState('');
  const [editMissing, setEditMissing] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setEditMissing(false);
    if (!user) {
      setNickname('');
      setReady(true);
      return;
    }
    setNickname(getUserNicknameFallback(user));
    if (editId && !getMyTalentProfile(user.uid, editId)) {
      setEditMissing(true);
    }
    void fetchUserAccount(user)
      .then((result) => {
        if (result.ok) {
          setNickname(result.data.profile.nickname || getUserNicknameFallback(user));
        }
      })
      .finally(() => setReady(true));
  }, [user, editId]);

  const editing = Boolean(editId) && !editMissing;

  return (
    <div className="space-y-6">
      <PageHeader
        title={editing ? '이력서 수정' : '이력서 등록'}
        description={
          editing
            ? '이력서 탭과 희망 근무 조건을 모두 저장한 뒤, 마이페이지의 이력서 관리에서 한 건만 공개할 수 있습니다.'
            : '희망 근무 조건을 모두 저장한 뒤 이력서를 등록할 수 있습니다. 공개도 희망 근무 조건과 이력서가 완료된 1건만 할 수 있습니다.'
        }
        homeHref={returnPath || '/'}
        homeLabel={returnPath ? '돌아가기' : '홈으로'}
      />
      <AdSlot placement="header" />

      {loading || !ready ? (
        <p className="py-8 text-center text-sm text-muted">불러오는 중…</p>
      ) : !user ? (
        <Card>
          <p className="text-sm text-muted">이력서를 등록하려면 로그인해 주세요.</p>
          <Link
            href={`/login?next=${encodeURIComponent(nextPath)}`}
            className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            로그인
          </Link>
        </Card>
      ) : mode !== 'jobseeker' ? (
        <Card>
          <p className="text-sm text-muted">이력서 등록은 구직자로 이용할 때 할 수 있습니다.</p>
        </Card>
      ) : editMissing ? (
        <Card>
          <p className="text-sm text-muted">이력서를 찾을 수 없습니다.</p>
          {returnPath ? (
            <Link
              href={returnPath}
              className="mt-4 inline-flex rounded-lg border border-border-strong bg-surface px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-neutral-50"
            >
              이력서 관리로
            </Link>
          ) : null}
        </Card>
      ) : !editing && !isWorkPreferencesComplete(user.uid) ? (
        <Card>
          <p className="text-sm text-muted">
            이력서를 등록하려면 먼저 마이페이지에서 근무 형태, 지역, 직종, 근무 가능을 저장해 주세요.
          </p>
          <Link
            href="/mypage?tab=resume"
            className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            희망 근무 조건으로
          </Link>
        </Card>
      ) : (
        <ResumeRegisterForm
          key={editId || 'new'}
          userId={user.uid}
          nickname={nickname}
          accountEmail={user.email ?? ''}
          profileId={editId ?? undefined}
          returnPath={returnPath}
        />
      )}
    </div>
  );
}
