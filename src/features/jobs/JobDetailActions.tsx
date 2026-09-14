'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/auth-context';
import { useUserMode } from '@/features/mode/mode-context';
import {
  applyToJob,
  getJobApplication,
  JOB_APPLICATION_STATUS_LABELS,
  type JobApplication,
} from '@/lib/job-applications';
import {
  followCompany,
  isCompanyFollowed,
} from '@/lib/followed-companies';
import { findApplyReadyResume, missingApplyRequirements } from '@/lib/my-talent-profile';
import { cn } from '@/lib/utils';
import {
  buttonBaseClassName,
  buttonPrimaryClassName,
  buttonSecondaryClassName,
  buttonSizeDefaultClassName,
} from '@/lib/button-ui';
import type { JobPosting } from '@/types/job';

const gridButtonClassName = cn(
  buttonBaseClassName,
  buttonSizeDefaultClassName,
  'w-full px-2 text-center sm:px-3',
);

const followButtonClassName = cn(gridButtonClassName, buttonSecondaryClassName);

const applyButtonClassName = cn(gridButtonClassName, buttonPrimaryClassName);

const statusButtonClassName = cn(
  gridButtonClassName,
  'cursor-default border border-border-strong bg-surface text-foreground shadow-none',
);

const linkButtonClassName = cn(gridButtonClassName, buttonSecondaryClassName, 'text-primary');

export default function JobDetailActions({ job }: { job: JobPosting }) {
  const { user, loading } = useAuth();
  const { mode, ready: modeReady } = useUserMode();
  const pathname = usePathname();
  const [followed, setFollowed] = useState(false);
  const [application, setApplication] = useState<JobApplication | null>(null);
  const [ready, setReady] = useState(false);
  const userId = user?.uid ?? '';
  const jobId = job.id;
  const companyName = job.companyName;
  const businessNumber = job.businessNumber ?? '';
  const loginHref = `/login?next=${encodeURIComponent(pathname || `/jobs/${jobId}`)}`;

  useEffect(() => {
    if (!userId) {
      setFollowed(false);
      setApplication(null);
      setReady(true);
      return;
    }
    setFollowed(isCompanyFollowed(userId, { companyName, businessNumber }));
    setApplication(getJobApplication(userId, jobId));
    setReady(true);
  }, [businessNumber, companyName, jobId, userId]);

  if (loading || !ready || !modeReady) {
    return <p className="text-center text-sm text-muted">불러오는 중…</p>;
  }

  if (!user) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted">이력서를 완성한 뒤 지원할 수 있습니다.</p>
        <div className="grid grid-cols-1 gap-2">
          <Link href={loginHref} className={followButtonClassName}>
            관심 회사로 저장
          </Link>
          <Link href={loginHref} className={applyButtonClassName}>
            지원하기
          </Link>
        </div>
      </div>
    );
  }

  if (mode !== 'jobseeker') {
    return (
      <p className="rounded-lg bg-neutral-50 px-4 py-3 text-sm text-muted">
        지원은 구직자로 이용할 때 할 수 있습니다.
      </p>
    );
  }

  const missing = application ? [] : missingApplyRequirements(user.uid);

  function handleFollow() {
    followCompany(user!.uid, job);
    setFollowed(true);
  }

  function handleApply() {
    const resume = findApplyReadyResume(user!.uid);
    if (!resume) return;
    if (!window.confirm(`「${job.title}」에 지원할까요?`)) return;
    const next = applyToJob(user!.uid, job, resume);
    if (next) setApplication(next);
  }

  return (
    <div className="space-y-3">
      {!application && missing.length === 0 ? (
        <p className="text-sm text-muted">완성한 이력서로 이 채용 정보에 지원합니다.</p>
      ) : null}
      {!application && missing.length > 0 ? (
        <p className="rounded-lg bg-neutral-50 px-4 py-3 text-sm text-muted">
          이력서를 완성해야 지원할 수 있습니다.{' '}
          <Link href="/mypage?tab=resume&sub=resume" className="font-semibold text-primary hover:underline">
            이력서 관리
          </Link>
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        {followed ? (
          <>
            <span className={statusButtonClassName}>관심 회사로 등록함</span>
            <Link href="/mypage?tab=resume&sub=companies" className={linkButtonClassName}>
              ← 관심 회사 채용 정보
            </Link>
          </>
        ) : (
          <button type="button" className={cn(followButtonClassName, 'col-span-2')} onClick={handleFollow}>
            관심 회사로 저장
          </button>
        )}

        {application ? (
          <>
            <span className={statusButtonClassName}>
              {JOB_APPLICATION_STATUS_LABELS[application.status]}
            </span>
            <Link href="/mypage?tab=resume&sub=applications" className={linkButtonClassName}>
              ← 입사 지원 현황
            </Link>
          </>
        ) : (
          <button
            type="button"
            className={cn(applyButtonClassName, 'col-span-2')}
            disabled={missing.length > 0}
            onClick={handleApply}
          >
            지원하기
          </button>
        )}
      </div>
    </div>
  );
}
