'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import MyTalentProfileForm from '@/features/talents/MyTalentProfileForm';
import { useAuth } from '@/features/auth/auth-context';
import { useUserMode } from '@/features/mode/mode-context';
import { fetchUserAccount } from '@/lib/users-api';
import { getUserNicknameFallback } from '@/lib/user-display';
import type { UserAccountData } from '@/lib/users-api';

export default function MyPageClient() {
  const { user, loading } = useAuth();
  const { mode } = useUserMode();
  const [account, setAccount] = useState<UserAccountData | null>(null);

  useEffect(() => {
    if (!user) return;
    void fetchUserAccount(user).then((result) => {
      if (result.ok) setAccount(result.data);
    });
  }, [user]);

  if (loading) {
    return <p className="py-10 text-center text-sm text-muted">불러오는 중…</p>;
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <PageHeader title="마이페이지" />
        <Card title="내 계정">
          <p className="text-sm text-muted">로그인 후 이용할 수 있습니다.</p>
          <Link
            href="/login?next=/mypage"
            className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            로그인
          </Link>
        </Card>
      </div>
    );
  }

  const nickname = account?.profile.nickname || getUserNicknameFallback(user);

  return (
    <div className="space-y-4">
      <PageHeader title="마이페이지" description="계정 정보와 이용 현황을 확인하세요." />

      <Card title="내 계정">
        <dl className="space-y-2 text-sm">
          <div className="flex items-baseline gap-3">
            <dt className="w-16 shrink-0 text-subtle">이름</dt>
            <dd className="min-w-0 font-semibold text-foreground">{nickname}</dd>
          </div>
          <div className="flex items-baseline gap-3">
            <dt className="w-16 shrink-0 text-subtle">이메일</dt>
            <dd className="min-w-0 break-all text-foreground">{user.email ?? '-'}</dd>
          </div>
        </dl>
      </Card>

      <Card title="지원 내역">
        <p className="text-sm text-muted">구직자로 지원한 채용 정보와 결과는 다음 단계에서 확인할 수 있습니다.</p>
      </Card>

      {mode === 'jobseeker' ? <MyTalentProfileForm userId={user.uid} nickname={nickname} /> : null}

      <Card title="지원자 관리">
        <p className="text-sm text-muted">구인자로 올린 채용 정보의 지원자 열람과 합/불 처리는 다음 단계에서 열립니다.</p>
      </Card>
    </div>
  );
}
