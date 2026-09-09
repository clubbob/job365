'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/features/auth/auth-context';
import JobCard from '@/features/jobs/JobCard';
import { useUserMode } from '@/features/mode/mode-context';
import { listMyJobPostings } from '@/lib/my-job-posts';
import { loadMyTalentProfile } from '@/lib/my-talent-profile';
import { talentEducation, talentRecentDate } from '@/lib/talent-display';
import { fetchUserAccount } from '@/lib/users-api';
import { getUserNicknameFallback } from '@/lib/user-display';
import { cn } from '@/lib/utils';
import type { UserAccountData } from '@/lib/users-api';
import type { UserMode } from '@/lib/user-mode';
import { WORK_TYPE_LABELS, type JobPosting } from '@/types/job';
import type { TalentProfile } from '@/types/talent';

type TabId = 'account' | 'applications' | 'resume' | 'jobs' | 'applicants' | 'mode';

const TAB_CLASS =
  'shrink-0 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors';
const primaryLinkClassName =
  'inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover';
const secondaryLinkClassName =
  'inline-flex rounded-lg border border-border-strong bg-surface px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-neutral-50';

function tabsForMode(mode: UserMode | null): Array<{ id: TabId; label: string }> {
  if (mode === 'jobseeker') {
    return [
      { id: 'account', label: '내 계정' },
      { id: 'applications', label: '지원 내역' },
      { id: 'resume', label: '이력서' },
    ];
  }
  if (mode === 'recruiter') {
    return [
      { id: 'account', label: '내 계정' },
      { id: 'jobs', label: '채용 정보' },
      { id: 'applicants', label: '지원자' },
    ];
  }
  return [
    { id: 'account', label: '내 계정' },
    { id: 'mode', label: '이용 방식' },
  ];
}

export default function MyPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const { mode } = useUserMode();
  const [account, setAccount] = useState<UserAccountData | null>(null);
  const [tab, setTab] = useState<TabId>('account');
  const [myJobs, setMyJobs] = useState<JobPosting[]>([]);
  const [myResume, setMyResume] = useState<TalentProfile | null>(null);
  const [mineReady, setMineReady] = useState(false);
  const tabs = tabsForMode(mode);

  useEffect(() => {
    if (!user) return;
    void fetchUserAccount(user).then((result) => {
      if (result.ok) setAccount(result.data);
    });
  }, [user]);

  useEffect(() => {
    if (!user) {
      setMyJobs([]);
      setMyResume(null);
      setMineReady(false);
      return;
    }
    setMyJobs(listMyJobPostings(user.uid));
    setMyResume(loadMyTalentProfile(user.uid));
    setMineReady(true);
  }, [user]);

  useEffect(() => {
    const requested = searchParams.get('tab');
    if (requested && tabsForMode(mode).some((item) => item.id === requested)) {
      setTab(requested as TabId);
    }
  }, [mode, searchParams]);

  useEffect(() => {
    if (!tabsForMode(mode).some((item) => item.id === tab)) {
      setTab('account');
    }
  }, [mode, tab]);

  function selectTab(id: TabId) {
    setTab(id);
    router.replace(id === 'account' ? '/mypage' : `/mypage?tab=${id}`);
  }

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

      <div className="-mx-1 flex gap-1 overflow-x-auto px-1" role="tablist" aria-label="마이페이지 메뉴">
        {tabs.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectTab(item.id)}
              className={cn(
                TAB_CLASS,
                active
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:bg-neutral-100 hover:text-foreground',
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === 'account' ? (
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
      ) : null}

      {tab === 'applications' ? (
        <Card title="지원 내역">
          <p className="text-sm text-muted">구직자로 지원한 채용 정보와 결과는 다음 단계에서 확인할 수 있습니다.</p>
        </Card>
      ) : null}

      {tab === 'resume' ? (
        <Card
          title="이력서"
          description={
            mineReady && myResume
              ? `최근 저장일 ${talentRecentDate(myResume)}`
              : '인재 정보에 올릴 이력을 등록합니다.'
          }
          action={
            <Link href="/talents/new?from=mypage" className={primaryLinkClassName}>
              {myResume ? '이력서 수정' : '이력서 등록'}
            </Link>
          }
        >
          {!mineReady ? (
            <p className="text-sm text-muted">불러오는 중…</p>
          ) : myResume ? (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border border-primary/15 bg-gradient-to-br from-primary/10 via-surface to-surface p-4">
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-white">
                    {WORK_TYPE_LABELS[myResume.workType]}
                  </span>
                  <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-medium text-muted ring-1 ring-inset ring-border">
                    {myResume.careerLabel}
                  </span>
                  <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-medium text-muted ring-1 ring-inset ring-border">
                    {talentEducation(myResume)}
                  </span>
                </div>
                <p className="mt-3 text-lg font-bold leading-snug text-foreground">
                  {myResume.name} · {myResume.headline}
                </p>
                {myResume.desiredPay ? (
                  <p className="mt-2 text-base font-bold text-primary">{myResume.desiredPay}</p>
                ) : null}
                {myResume.location ? <p className="mt-1 text-sm text-muted">{myResume.location}</p> : null}
              </div>
              <Link href={`/talents/${myResume.id}`} className={secondaryLinkClassName}>
                내 이력서 보기
              </Link>
            </div>
          ) : (
            <p className="text-sm text-muted">아직 등록한 이력서가 없습니다.</p>
          )}
        </Card>
      ) : null}

      {tab === 'jobs' ? (
        <Card
          title="채용 정보"
          description={
            mineReady && myJobs.length > 0
              ? `${myJobs.length}건이 등록되어 있습니다.`
              : '구직자에게 노출할 채용 정보를 등록합니다.'
          }
          action={
            <Link href="/jobs/new?from=mypage" className={primaryLinkClassName}>
              채용 정보 등록
            </Link>
          }
        >
          {!mineReady ? (
            <p className="text-sm text-muted">불러오는 중…</p>
          ) : myJobs.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {myJobs.map((job) => (
                <div key={job.id} className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
                  <JobCard
                    job={job}
                    className="rounded-none border-0 shadow-none hover:border-0 hover:shadow-none"
                  />
                  <div className="border-t border-border bg-neutral-50 p-2">
                    <Link
                      href={`/jobs/new?edit=${encodeURIComponent(job.id)}&from=mypage`}
                      className={`${secondaryLinkClassName} w-full`}
                    >
                      수정
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">아직 등록한 채용 정보가 없습니다.</p>
          )}
        </Card>
      ) : null}

      {tab === 'applicants' ? (
        <Card title="지원자">
          <p className="text-sm text-muted">구인자로 올린 채용 정보의 지원자 열람과 합/불 처리는 다음 단계에서 열립니다.</p>
        </Card>
      ) : null}

      {tab === 'mode' ? (
        <Card title="이용 방식">
          <p className="text-sm text-muted">
            상단 설정에서 구인자 또는 구직자를 선택하면 채용 정보 등록이나 이력서 등록을 할 수 있습니다.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
