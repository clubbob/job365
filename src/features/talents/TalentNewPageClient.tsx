'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AdSlot from '@/components/ads/AdSlot';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import MyTalentProfileForm from '@/features/talents/MyTalentProfileForm';
import { useAuth } from '@/features/auth/auth-context';
import { useUserMode } from '@/features/mode/mode-context';
import { loadMyTalentProfile } from '@/lib/my-talent-profile';
import { fetchUserAccount } from '@/lib/users-api';
import { getUserNicknameFallback } from '@/lib/user-display';

export default function TalentNewPageClient() {
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const { mode } = useUserMode();
  const fromMypage = searchParams.get('from') === 'mypage';
  const returnPath = fromMypage ? '/mypage?tab=resume' : undefined;
  const nextPath = `/talents/new${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  const [nickname, setNickname] = useState('');
  const [hasResume, setHasResume] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) {
      setNickname('');
      setHasResume(false);
      setReady(true);
      return;
    }
    setNickname(getUserNicknameFallback(user));
    setHasResume(Boolean(loadMyTalentProfile(user.uid)));
    void fetchUserAccount(user)
      .then((result) => {
        if (result.ok) {
          setNickname(result.data.profile.nickname || getUserNicknameFallback(user));
        }
      })
      .finally(() => setReady(true));
  }, [user]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={hasResume ? '이력서 수정' : '이력서 등록'}
        description={
          hasResume
            ? '수정한 내용은 인재 정보와 마이페이지에 바로 반영됩니다.'
            : '인재 정보에 올릴 이력을 등록합니다.'
        }
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
      ) : (
        <MyTalentProfileForm userId={user.uid} nickname={nickname} returnPath={returnPath} />
      )}
    </div>
  );
}
