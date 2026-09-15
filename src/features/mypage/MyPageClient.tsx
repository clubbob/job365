'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/features/auth/auth-context';
import { useUserMode } from '@/features/mode/mode-context';
import { hydrateMissingCompanyFromAccount } from '@/lib/my-job-posts';
import { hydrateMissingWorkPreferencesFromAccount } from '@/lib/my-talent-profile';
import { syncMyJobPosting, syncMyTalentProfile } from '@/lib/posting-sync';
import JobseekerManagePanel, {
  isJobseekerSubTab,
  type JobseekerSubTab,
} from '@/features/mypage/JobseekerManagePanel';
import AccountMarketingConsent from '@/features/mypage/AccountMarketingConsent';
import RecruiterManagePanel, {
  isRecruiterSubTab,
  type RecruiterSubTab,
} from '@/features/mypage/RecruiterManagePanel';
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

function defaultTabForMode(mode: UserMode): TabId {
  return mode === 'jobseeker' ? 'resume' : 'jobs';
}

function tabsForMode(mode: UserMode): Array<{ id: TabId; label: string }> {
  if (mode === 'jobseeker') {
    return [
      { id: 'resume', label: '취업 관리' },
      { id: 'account', label: '내 계정' },
    ];
  }
  return [
    { id: 'jobs', label: '채용 관리' },
    { id: 'account', label: '내 계정' },
  ];
}

function resolveMyPageTab(mode: UserMode | null, requested: string | null): TabId {
  if (!mode) return 'account';
  if (requested === 'applications') return 'resume';
  if (requested && tabsForMode(mode).some((item) => item.id === requested)) {
    return requested as TabId;
  }
  return defaultTabForMode(mode);
}

export default function MyPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const { mode, ready } = useUserMode();
  const [account, setAccount] = useState<UserAccountData | null>(null);
  const requestedTab = searchParams.get('tab');
  const requestedSub = searchParams.get('sub');
  const tab = resolveMyPageTab(mode, requestedTab);
  const [jobseekerSubTab, setJobseekerSubTab] = useState<JobseekerSubTab>('resume');
  const [recruiterSubTab, setRecruiterSubTab] = useState<RecruiterSubTab>('jobs');
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
    const userId = user.uid;
    const jobs = hydrateMissingCompanyFromAccount(userId);
    const resumes = hydrateMissingWorkPreferencesFromAccount(userId);
    setMyJobs(jobs);
    setMyResumes(resumes);
    setMineReady(true);
    void Promise.all([
      ...jobs.map((job) => syncMyJobPosting(job)),
      ...resumes.map((resume) => syncMyTalentProfile(resume)),
    ]);

    function reloadMine() {
      setMyJobs(hydrateMissingCompanyFromAccount(userId));
      setMyResumes(hydrateMissingWorkPreferencesFromAccount(userId));
    }
    window.addEventListener('focus', reloadMine);
    window.addEventListener('pageshow', reloadMine);
    window.addEventListener('job365.jobs', reloadMine);
    return () => {
      window.removeEventListener('focus', reloadMine);
      window.removeEventListener('pageshow', reloadMine);
      window.removeEventListener('job365.jobs', reloadMine);
    };
  }, [user]);

  useEffect(() => {
    if (requestedTab === 'applications') {
      setJobseekerSubTab('applications');
      return;
    }
    if (requestedTab === 'resume') {
      setJobseekerSubTab(isJobseekerSubTab(requestedSub) ? requestedSub : 'resume');
    }
    if (requestedTab === 'jobs') {
      setRecruiterSubTab(isRecruiterSubTab(requestedSub) ? requestedSub : 'jobs');
    }
  }, [requestedTab, requestedSub]);

  useEffect(() => {
    if (loading || !ready) return;
    if (user && !mode) {
      router.replace('/');
    }
  }, [loading, ready, user, mode, router]);

  function selectTab(id: TabId) {
    if (id === 'resume') {
      setJobseekerSubTab('resume');
      router.replace('/mypage?tab=resume');
      return;
    }
    if (id === 'jobs') {
      setRecruiterSubTab('jobs');
      router.replace('/mypage?tab=jobs');
      return;
    }
    router.replace(id === 'account' ? '/mypage?tab=account' : `/mypage?tab=${id}`);
  }

  function selectJobseekerSubTab(id: JobseekerSubTab) {
    setJobseekerSubTab(id);
    router.replace(id === 'resume' ? '/mypage?tab=resume' : `/mypage?tab=resume&sub=${id}`);
  }

  function selectRecruiterSubTab(id: RecruiterSubTab) {
    setRecruiterSubTab(id);
    router.replace(id === 'jobs' ? '/mypage?tab=jobs' : `/mypage?tab=jobs&sub=${id}`);
  }

  if (loading || !ready || (user && !mode)) {
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
      <PageHeader title="마이페이지" description="계정과 활동 내용을 확인하고 관리하세요." />

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
        <>
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
          {account ? (
            <AccountMarketingConsent
              user={user}
              agreed={account.marketingAgreed}
              onSaved={(marketingAgreed) => setAccount({ ...account, marketingAgreed })}
            />
          ) : null}
        </>
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
        <RecruiterManagePanel
          userId={user.uid}
          jobs={myJobs}
          ready={mineReady}
          subTab={recruiterSubTab}
          onSelectSubTab={selectRecruiterSubTab}
          onJobsChange={setMyJobs}
        />
      ) : null}
    </div>
  );
}
