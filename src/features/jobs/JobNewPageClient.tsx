'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AdSlot from '@/components/ads/AdSlot';
import PageHeader from '@/components/navigation/PageHeader';
import { Button, Card, FieldLabel } from '@/components/ui/Card';
import JobCreateForm from '@/features/jobs/JobCreateForm';
import { useAuth } from '@/features/auth/auth-context';
import { useUserMode } from '@/features/mode/mode-context';
import { authInputClassName } from '@/lib/auth-ui';
import { digitsOnly, formatBusinessNumber } from '@/lib/business-number';
import { NTS_STATUS_SOURCE } from '@/lib/company';
import {
  loadBizVerify,
  saveBizVerify,
  type BizVerifyRecord,
} from '@/lib/biz-verify-store';
import { getMyJobPosting } from '@/lib/my-job-posts';
import type { JobPosting } from '@/types/job';

type NumberCheck = {
  businessNumber: string;
  statusLabel: string;
  taxType: string | null;
};

type StatusApiResponse =
  | { ok: true; data: NumberCheck & { message?: string } }
  | { ok: false; error?: { message?: string } };

export default function JobNewPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const { mode } = useUserMode();
  const editId = searchParams.get('edit');
  const fromMypage = searchParams.get('from') === 'mypage';
  const returnPath = fromMypage ? '/mypage?tab=jobs&sub=jobs' : undefined;
  const nextPath = `/jobs/new${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  const [companyName, setCompanyName] = useState('');
  const [businessNumber, setBusinessNumber] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [numberCheck, setNumberCheck] = useState<NumberCheck | null>(null);
  const [verified, setVerified] = useState<BizVerifyRecord | null>(null);
  const [showJobForm, setShowJobForm] = useState(false);
  const [editJob, setEditJob] = useState<JobPosting | null>(null);
  const [editMissing, setEditMissing] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setVerified(null);
    setNumberCheck(null);
    setShowJobForm(false);
    setError('');
    setEditJob(null);
    setEditMissing(false);
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
    if (existing) {
      setCompanyName(existing.companyName);
      setBusinessNumber(existing.businessNumber);
    }
    setReady(true);
  }, [user, editId]);

  async function handleVerifyNumber(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    if (digitsOnly(businessNumber).length !== 10) {
      setError('사업자등록번호를 입력해 주세요.');
      return;
    }
    setError('');
    setPending(true);
    try {
      const res = await fetch('/api/biz/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessNumber }),
      });
      const data = (await res.json()) as StatusApiResponse;
      if (!res.ok || !data.ok) {
        setNumberCheck(null);
        setVerified(null);
        setError(!data.ok ? data.error?.message || '상태조회에 실패했습니다.' : '상태조회에 실패했습니다.');
        return;
      }
      setBusinessNumber(data.data.businessNumber);
      setNumberCheck({
        businessNumber: data.data.businessNumber,
        statusLabel: data.data.statusLabel,
        taxType: data.data.taxType,
      });
    } catch {
      setError('상태조회에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setPending(false);
    }
  }

  function handleVerifyName(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !numberCheck) return;
    const name = companyName.trim();
    if (!name) {
      setError('회사명을 입력해 주세요.');
      return;
    }
    const record: BizVerifyRecord = {
      businessNumber: numberCheck.businessNumber,
      companyName: name,
      status: 'active',
      statusLabel: numberCheck.statusLabel,
      taxType: numberCheck.taxType,
      verifiedAt: new Date().toISOString(),
      source: 'nts',
    };
    saveBizVerify(user.uid, record);
    setVerified(record);
    setShowJobForm(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={editId ? '채용 정보 수정' : '채용 정보 등록'}
        description={
          editId
            ? '등록한 채용 정보를 수정하면 목록과 마이페이지에 바로 반영됩니다.'
            : '채용 정보를 등록할 때마다 국세청 사업자등록 상태조회를 합니다.'
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
      ) : verified && showJobForm && user ? (
        <JobCreateForm
          userId={user.uid}
          companyName={verified.companyName}
          businessNumber={verified.businessNumber}
          returnPath={returnPath}
          onCancel={() => setShowJobForm(false)}
        />
      ) : verified ? (
        <Card
          title="상태조회 완료"
          description="조회 시점의 국세청 상태이며, 국세청 인증이나 회사의 보증이 아닙니다."
        >
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-subtle">사업자등록번호</dt>
              <dd className="mt-0.5 font-medium text-foreground">{verified.businessNumber}</dd>
            </div>
            <div>
              <dt className="text-subtle">회사명</dt>
              <dd className="mt-0.5 font-medium text-foreground">{verified.companyName}</dd>
            </div>
            <div>
              <dt className="text-subtle">조회 상태</dt>
              <dd className="mt-0.5 font-semibold text-success">{verified.statusLabel}</dd>
            </div>
            {verified.taxType ? (
              <div>
                <dt className="text-subtle">과세유형</dt>
                <dd className="mt-0.5 font-medium text-foreground">{verified.taxType}</dd>
              </div>
            ) : null}
          </dl>
          <p className="mt-4 text-sm text-muted">
            회사명은 이용자가 입력한 값입니다. 이후 휴업·폐업될 수 있습니다.
          </p>
          <p className="mt-2 text-xs text-subtle">{NTS_STATUS_SOURCE}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={() => setShowJobForm(true)}>
              채용 정보 등록
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setVerified(null);
                setNumberCheck(null);
                setError('');
              }}
            >
              다시 조회
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.push(returnPath || '/jobs')}>
              돌아가기
            </Button>
          </div>
        </Card>
      ) : (
        <Card
          title="사업자등록 상태조회"
          description="계속·휴업·폐업·미등록만 조회합니다."
        >
          {!numberCheck ? (
            <form className="space-y-4" onSubmit={handleVerifyNumber} noValidate>
              <div>
                <FieldLabel htmlFor="biz-number" required>
                  사업자등록번호
                </FieldLabel>
                <input
                  id="biz-number"
                  inputMode="numeric"
                  autoComplete="off"
                  autoFocus
                  value={businessNumber}
                  onChange={(event) => {
                    setBusinessNumber(formatBusinessNumber(event.target.value));
                    setError('');
                  }}
                  className={authInputClassName}
                  placeholder="000-00-00000"
                  required
                />
              </div>
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <Button type="submit" fullWidth disabled={pending}>
                {pending ? '조회 중…' : '상태조회'}
              </Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleVerifyName} noValidate>
              <div>
                <FieldLabel htmlFor="biz-number-confirmed">사업자등록번호</FieldLabel>
                <input
                  id="biz-number-confirmed"
                  value={numberCheck.businessNumber}
                  className={authInputClassName}
                  readOnly
                />
                <p className="mt-1 text-sm text-success">조회 결과: {numberCheck.statusLabel} (조회 시점 기준)</p>
              </div>
              <div>
                <FieldLabel htmlFor="biz-name" required>
                  회사명
                </FieldLabel>
                <input
                  id="biz-name"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  className={authInputClassName}
                  placeholder="사업자 상호를 입력해 주세요"
                  autoFocus
                  required
                />
              </div>
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="submit" fullWidth>
                  확인
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  onClick={() => {
                    setNumberCheck(null);
                    setError('');
                  }}
                >
                  번호 다시 입력
                </Button>
              </div>
            </form>
          )}
        </Card>
      )}
    </div>
  );
}
