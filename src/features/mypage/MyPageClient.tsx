'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import AccountMarketingConsent from '@/features/mypage/AccountMarketingConsent';
import JobAlertPrefsForm from '@/features/mypage/JobAlertPrefsForm';
import BookmarksPanel from '@/features/mypage/BookmarksPanel';
import PasswordChangeForm from '@/features/mypage/PasswordChangeForm';
import WithdrawAccountForm from '@/features/mypage/WithdrawAccountForm';
import { useAuth } from '@/features/auth/auth-context';
import { fetchUserAccount } from '@/lib/users-api';
import { getUserNicknameFallback } from '@/lib/user-display';
import { cn } from '@/lib/utils';
import type { UserAccountData } from '@/lib/users-api';

type TabId = 'account' | 'alerts' | 'bookmarks';

const TAB_CLASS = 'shrink-0 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'account', label: '회원 정보' },
  { id: 'alerts', label: '채용 공고 수신 설정' },
  { id: 'bookmarks', label: '찜한 공고' },
];

function resolveTab(requested: string | null): TabId {
  if (requested && TABS.some((tab) => tab.id === requested)) return requested as TabId;
  return 'account';
}

export default function MyPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [account, setAccount] = useState<UserAccountData | null>(null);
  const tab = resolveTab(searchParams.get('tab'));

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login?next=/mypage');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    void fetchUserAccount(user).then((result) => {
      if (result.ok) setAccount(result.data);
    });
  }, [user]);

  if (loading || !user) {
    return <p className="py-10 text-center text-sm text-muted">불러오는 중…</p>;
  }

  const nickname = account?.profile.nickname || getUserNicknameFallback(user);
  const email = account?.profile.email || user.email || '—';

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="마이페이지"
        description="회원 정보, 비밀번호, 이메일 수신, 채용 공고 알림, 찜한 공고 등 나의 계정과 취업 활동을 관리합니다."
        showRefresh={false}
      />

      <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="마이페이지 메뉴">
        {TABS.map((item) => {
          const active = tab === item.id;
          return (
            <Link
              key={item.id}
              href={`/mypage?tab=${item.id}`}
              className={cn(
                TAB_CLASS,
                active
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-neutral-100 text-muted hover:bg-neutral-200 hover:text-foreground',
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {tab === 'account' ? (
        <div className="flex flex-col gap-5">
          <Card>
            <dl className="grid gap-3 text-sm">
              <div className="flex gap-3">
                <dt className="w-20 shrink-0 text-muted">닉네임</dt>
                <dd className="min-w-0 font-semibold text-foreground">{nickname}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-20 shrink-0 text-muted">이메일</dt>
                <dd className="min-w-0 break-all font-semibold text-foreground">{email}</dd>
              </div>
            </dl>
          </Card>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-bold text-foreground">비밀번호 변경</h2>
            <PasswordChangeForm />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-bold text-foreground">이메일 수신</h2>
            <AccountMarketingConsent
              user={user}
              agreed={account?.marketingAgreed ?? false}
              onSaved={(agreed) => setAccount((prev) => (prev ? { ...prev, marketingAgreed: agreed } : prev))}
            />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-bold text-foreground">회원 탈퇴</h2>
            <WithdrawAccountForm user={user} />
          </section>
        </div>
      ) : null}

      {tab === 'alerts' ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-bold text-foreground">채용 공고 수신 설정</h2>
          <p className="text-sm text-muted">
            설정한 조건에 맞는 공고가{' '}
            <Link href="/my-jobs" className="font-semibold text-primary hover:underline">내 채용 공고</Link>
            와 아침 이메일에 표시됩니다.
          </p>
          <JobAlertPrefsForm user={user} />
        </section>
      ) : null}

      {tab === 'bookmarks' ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-bold text-foreground">찜한 공고</h2>
          <BookmarksPanel />
        </section>
      ) : null}
    </div>
  );
}
