'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AdSlot from '@/components/ads/AdSlot';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import JobCreateForm from '@/features/jobs/JobCreateForm';
import { useAuth } from '@/features/auth/auth-context';
import { useUserMode } from '@/features/mode/mode-context';
import { digitsOnly } from '@/lib/business-number';
import { loadBizVerify, saveBizVerify, type BizVerifyRecord } from '@/lib/biz-verify-store';
import { getMyJobPosting } from '@/lib/my-job-posts';
import { fetchUserAccount } from '@/lib/users-api';
import type { JobPosting } from '@/types/job';

function isVerifiedCompany(record: BizVerifyRecord | null): record is BizVerifyRecord {
  return Boolean(
    record &&
      record.status === 'active' &&
      record.companyName.trim() &&
      digitsOnly(record.businessNumber).length === 10,
  );
}

export default function JobNewPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const { mode } = useUserMode();
  const editId = searchParams.get('edit');
  const fromMypage = searchParams.get('from') === 'mypage';
  const returnPath = fromMypage ? '/mypage?tab=jobs&sub=jobs' : undefined;
  const companyPath = '/mypage?tab=jobs';
  const nextPath = `/jobs/new${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  const [verified, setVerified] = useState<BizVerifyRecord | null>(null);
  const [editJob, setEditJob] = useState<JobPosting | null>(null);
  const [editMissing, setEditMissing] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setVerified(null);
    setEditJob(null);
    setEditMissing(false);
    setReady(false);

    if (!user) {
      setReady(true);
      return;
    }

    if (editId) {
      const job = getMyJobPosting(user.uid, editId);
      if (job) setEditJob(job);
      else setEditMissing(true);
      setReady(true);
      return;
    }

    const existing = loadBizVerify(user.uid);
    if (isVerifiedCompany(existing)) {
      setVerified(existing);
      setReady(true);
      return;
    }

    void fetchUserAccount(user).then((result) => {
      if (cancelled) return;
      const remote = result.ok ? result.data.company : null;
      if (remote) {
        const persisted = saveBizVerify(user.uid, remote);
        if (isVerifiedCompany(persisted)) setVerified(persisted);
      }
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [user, editId]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={editId ? '채용 정보 수정' : '채용 정보 등록'}
        description={
          editId
            ? '등록한 채용 정보를 수정하면 목록과 마이페이지에 바로 반영됩니다.'
            : '마이페이지에 등록한 회사 정보로 채용 정보를 등록합니다.'
        }
        homeHref={returnPath || '/'}
        homeLabel={returnPath ? '돌아가기' : '홈으로'}
      />
      <AdSlot placement="header" />

      {loading || !ready ? (
        <p className="py-8 text-center text-sm text-muted">불러오는 중…</p>
      ) : !user ? (
        <Card>
          <p className="text-sm text-muted">채용 정보를 등록하려면 로그인해 주세요.</p>
          <Link
            href={`/login?next=${encodeURIComponent(nextPath)}`}
            className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            로그인
          </Link>
        </Card>
      ) : mode !== 'recruiter' ? (
        <Card>
          <p className="text-sm text-muted">채용 정보 등록은 구인자로 이용할 때 할 수 있습니다.</p>
        </Card>
      ) : editMissing ? (
        <Card title="채용 정보를 찾을 수 없습니다">
          <p className="text-sm text-muted">마이페이지에서 등록한 채용 정보만 수정할 수 있습니다.</p>
          <Link
            href={returnPath || '/mypage?tab=jobs&sub=jobs'}
            className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            마이페이지로
          </Link>
        </Card>
      ) : editJob && user ? (
        <JobCreateForm
          userId={user.uid}
          companyName={editJob.companyName}
          businessNumber={editJob.businessNumber ?? ''}
          initialJob={editJob}
          returnPath={returnPath}
          onCancel={() => router.push(returnPath || `/jobs/${editJob.id}`)}
        />
      ) : verified && user ? (
        <JobCreateForm
          userId={user.uid}
          companyName={verified.companyName}
          businessNumber={verified.businessNumber}
          returnPath={returnPath}
          onCancel={() => router.push(returnPath || '/jobs')}
        />
      ) : (
        <Card title="회사 정보가 필요합니다">
          <p className="text-sm text-muted">
            채용 정보를 등록하려면 회사 정보를 먼저 등록해 주세요. 국세청 상태조회는 회사 정보를 등록할 때 합니다.
          </p>
          <Link
            href={companyPath}
            className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            회사 정보 등록
          </Link>
        </Card>
      )}
    </div>
  );
}
