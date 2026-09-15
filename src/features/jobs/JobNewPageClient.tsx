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
import { loadBizVerify, saveBizVerify } from '@/lib/biz-verify-store';
import { getMyJobPosting } from '@/lib/my-job-posts';
import { fetchUserAccount } from '@/lib/users-api';
import type { JobPosting } from '@/types/job';

export default function JobNewPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const { mode } = useUserMode();
  const editId = searchParams.get('edit');
  const fromMypage = searchParams.get('from') === 'mypage';
  const returnPath = fromMypage ? '/mypage?tab=jobs' : undefined;
  const nextPath = `/jobs/new${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  const [accountCompanyName, setAccountCompanyName] = useState('');
  const [accountBusinessNumber, setAccountBusinessNumber] = useState('');
  const [editJob, setEditJob] = useState<JobPosting | null>(null);
  const [editMissing, setEditMissing] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setEditJob(null);
    setEditMissing(false);
    setReady(false);

    if (!user) {
      setAccountCompanyName('');
      setAccountBusinessNumber('');
      setReady(true);
      return;
    }

    const local = loadBizVerify(user.uid);
    setAccountCompanyName(local?.companyName ?? '');
    setAccountBusinessNumber(local?.businessNumber ?? '');

    if (editId) {
      const job = getMyJobPosting(user.uid, editId);
      if (job) setEditJob(job);
      else setEditMissing(true);
      setReady(true);
      return;
    }

    void fetchUserAccount(user).then((result) => {
      if (cancelled) return;
      const remote = result.ok ? result.data.company : null;
      if (remote) {
        const persisted = saveBizVerify(user.uid, remote);
        setAccountCompanyName(persisted.companyName);
        setAccountBusinessNumber(persisted.businessNumber);
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
            ? '채용 정보 탭을 저장하면 목록과 마이페이지에 반영됩니다. 공개 여부는 바꾸지 않습니다.'
            : '회사 정보부터 상세 내용까지 채용 정보 탭을 저장합니다. 공개는 마이페이지에서 할 수 있습니다.'
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
            href={returnPath || '/mypage?tab=jobs'}
            className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            마이페이지로
          </Link>
        </Card>
      ) : (
        <JobCreateForm
          key={editJob?.id ?? 'new'}
          userId={user.uid}
          companyName={editJob?.companyName || accountCompanyName}
          businessNumber={editJob?.businessNumber || accountBusinessNumber}
          initialJob={editJob ?? undefined}
          returnPath={returnPath}
          onCancel={() => router.push(returnPath || (editJob ? `/jobs/${editJob.id}` : '/jobs'))}
        />
      )}
    </div>
  );
}
