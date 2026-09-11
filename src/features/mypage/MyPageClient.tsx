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
import { listMyTalentProfilesForUser } from '@/lib/my-talent-profile';
import { syncMyJobPosting, syncMyTalentProfile } from '@/lib/posting-sync';
import JobseekerManagePanel, {
  isJobseekerSubTab,
  type JobseekerSubTab,
} from '@/features/mypage/JobseekerManagePanel';
import { fetchUserAccount } from '@/lib/users-api';
import { getUserNicknameFallback } from '@/lib/user-display';
import { cn } from '@/lib/utils';
import type { UserAccountData } from '@/lib/users-api';
import type { UserMode } from '@/lib/user-mode';
import type { JobPosting } from '@/types/job';
import type { TalentProfile } from '@/types/talent';

type TabId = 'account' | 'applications' | 'resume' | 'jobs';

const TAB_CLASS =
  'shrink-0 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors';
const primaryLinkClassName =
  'inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover';
const secondaryLinkClassName =
  'inline-flex rounded-lg border border-border-strong bg-surface px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-neutral-50';

function tabsForMode(mode: UserMode): Array<{ id: TabId; label: string }> {
  if (mode === 'jobseeker') {
    return [
      { id: 'account', label: '내 계정' },
      { id: 'resume', label: '취업 관리' },
    ];
  }
  return [
    { id: 'account', label: '내 계정' },
    { id: 'jobs', label: '채용 관리' },
  ];
}

export default function MyPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const { mode, ready } = useUserMode();
  const [account, setAccount] = useState<UserAccountData | null>(null);
  const [tab, setTab] = useState<TabId>('account');
  const [jobseekerSubTab, setJobseekerSubTab] = useState<JobseekerSubTab>('conditions');
  const [myJobs, setMyJobs] = useState<JobPosting[]>([]);
  const [myResumes, setMyResumes] = useState<TalentProfile[]>([]);
  const [mineReady, setMineReady] = useState(false);
  const tabs = mode ? tabsForMode(mode) : [];

  useEffect(() => {
    if (!user) return;
    void fetchUserAccount(user).then((result) => {
      if (result.ok) setAccount(result.data);
    });
  }, [user]);

  useEffect(() => {
    if (!user) {
      setMyJobs([]);
      setMyResumes([]);
      setMineReady(false);
      return;
    }
    const jobs = listMyJobPostings(user.uid);
    const resumes = listMyTalentProfilesForUser(user.uid);
    setMyJobs(jobs);
    setMyResumes(resumes);
    setMineReady(true);
    void Promise.all([
      ...jobs.map((job) => syncMyJobPosting(job)),
      ...resumes.map((resume) => syncMyTalentProfile(resume)),
    ]);
  }, [user]);

  useEffect(() => {
    const requested = searchParams.get('tab');
    const requestedSub = searchParams.get('sub');
    if (requested === 'applications') {
      setTab('resume');
      setJobseekerSubTab('applications');
      return;
    }
    if (mode && requested && tabsForMode(mode).some((item) => item.id === requested)) {
      setTab(requested as TabId);
      if (requested === 'resume') {
        setJobseekerSubTab(isJobseekerSubTab(requestedSub) ? requestedSub : 'conditions');
      }
    }
  }, [mode, searchParams]);

  useEffect(() => {
    if (mode && !tabsForMode(mode).some((item) => item.id === tab)) {
      setTab('account');
    }
  }, [mode, tab]);

  useEffect(() => {
    if (loading || !ready) return;
    if (user && !mode) {
      router.replace('/');
    }
  }, [loading, ready, user, mode, router]);

  function selectTab(id: TabId) {
    setTab(id);
    if (id === 'resume') {
      setJobseekerSubTab('conditions');
      router.replace('/mypage?tab=resume');
      return;
    }
    router.replace(id === 'account' ? '/mypage' : `/mypage?tab=${id}`);
  }

  function selectJobseekerSubTab(id: JobseekerSubTab) {
    setJobseekerSubTab(id);
    router.replace(id === 'conditions' ? '/mypage?tab=resume' : `/mypage?tab=resume&sub=${id}`);
  }

  if (loading || !ready || (user && !mode)) {
    return <p className="py-10 text-center text-sm text-muted">불러오는 중…</p>;
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <PageHeader title="이용 현황" />
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
      <PageHeader title="이용 현황" description="계정 정보와 이용 현황을 확인하세요." />

      <div className="-mx-1 flex gap-1 overflow-x-auto px-1" role="tablist" aria-label="이용 현황 메뉴">
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

      {tab === 'resume' ? (
        <JobseekerManagePanel
          userId={user.uid}
          resumes={myResumes}
          ready={mineReady}
          subTab={jobseekerSubTab}
          onSelectSubTab={selectJobseekerSubTab}
          onResumesChange={setMyResumes}
        />
      ) : null}

      {tab === 'jobs' ? (
        <Card
          title="채용 관리"
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
    </div>
  );
}
