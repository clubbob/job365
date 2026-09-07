'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdSlot from '@/components/ads/AdSlot';
import PageHeader from '@/components/navigation/PageHeader';
import { Button, Card, FieldLabel } from '@/components/ui/Card';
import { useAuth } from '@/features/auth/auth-context';
import { useUserMode } from '@/features/mode/mode-context';
import { authInputClassName } from '@/lib/auth-ui';
import {
  clearBizVerify,
  formatBusinessNumber,
  loadBizVerify,
  saveBizVerify,
  simulateBusinessLookup,
  type BizVerifyRecord,
} from '@/lib/business-verify-sim';

export default function JobNewPageClient() {
  const { user, loading } = useAuth();
  const { mode } = useUserMode();
  const [companyName, setCompanyName] = useState('');
  const [businessNumber, setBusinessNumber] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [verified, setVerified] = useState<BizVerifyRecord | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) {
      setVerified(null);
      setReady(true);
      return;
    }
    const existing = loadBizVerify(user.uid);
    setVerified(existing);
    if (existing) {
      setCompanyName(existing.companyName);
      setBusinessNumber(existing.businessNumber);
    }
    setReady(true);
  }, [user]);

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    setError('');
    setPending(true);
    const result = await simulateBusinessLookup(businessNumber, companyName);
    setPending(false);
    if (!result.ok) {
      setVerified(null);
      setError(result.message);
      return;
    }
    const record = {
      businessNumber: result.businessNumber,
      companyName: result.companyName,
      status: result.status,
      verifiedAt: result.verifiedAt,
      simulated: true as const,
    };
    saveBizVerify(user.uid, record);
    setBusinessNumber(result.businessNumber);
    setVerified(record);
  }

  function handleReset() {
    if (!user) return;
    clearBizVerify(user.uid);
    setVerified(null);
    setError('');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="채용 정보 등록"
        description="사업자 확인은 시뮬레이션입니다. 국세청에 연결하지 않습니다."
      />
      <AdSlot placement="header" />

      {loading || !ready ? (
        <p className="py-8 text-center text-sm text-muted">불러오는 중…</p>
      ) : !user ? (
        <Card>
          <p className="text-sm text-muted">채용 정보를 등록하려면 로그인해 주세요.</p>
          <Link
            href="/login?next=/jobs/new"
            className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            로그인
          </Link>
        </Card>
      ) : mode !== 'recruiter' ? (
        <Card>
          <p className="text-sm text-muted">채용 정보 등록은 구인자로 이용할 때 할 수 있습니다.</p>
        </Card>
      ) : verified ? (
        <Card title="사업자 확인 완료" description="시뮬레이션 결과입니다. 국세청 조회가 아닙니다.">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-subtle">상호</dt>
              <dd className="mt-0.5 font-medium text-foreground">{verified.companyName}</dd>
            </div>
            <div>
              <dt className="text-subtle">사업자등록번호</dt>
              <dd className="mt-0.5 font-medium text-foreground">{verified.businessNumber}</dd>
            </div>
            <div>
              <dt className="text-subtle">상태</dt>
              <dd className="mt-0.5 font-semibold text-success">계속사업자</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm text-muted">채용 정보 작성 폼은 다음 단계에서 연결됩니다.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/jobs"
              className="inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
            >
              채용 정보 보기
            </Link>
            <Button type="button" variant="secondary" onClick={handleReset}>
              다시 확인
            </Button>
          </div>
        </Card>
      ) : (
        <Card title="사업자 확인" description="입력값을 바탕으로 확인 결과만 예시로 보여 줍니다.">
          <p className="mb-4 rounded-xl border border-border bg-neutral-50 px-4 py-3 text-sm text-muted">
            테스트: <span className="font-medium text-foreground">123-45-67890</span>은 계속사업자,{' '}
            <span className="font-medium text-foreground">000-00-00000</span>은 조회 안 됨,{' '}
            <span className="font-medium text-foreground">111-11-11111</span>은 폐업입니다.
          </p>
          <form className="space-y-4" onSubmit={handleVerify}>
            <div>
              <FieldLabel htmlFor="biz-name" required>
                상호
              </FieldLabel>
              <input
                id="biz-name"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                className={authInputClassName}
                placeholder="예: 잡365"
                required
              />
            </div>
            <div>
              <FieldLabel htmlFor="biz-number" required>
                사업자등록번호
              </FieldLabel>
              <input
                id="biz-number"
                inputMode="numeric"
                autoComplete="off"
                value={businessNumber}
                onChange={(event) => setBusinessNumber(formatBusinessNumber(event.target.value))}
                className={authInputClassName}
                placeholder="000-00-00000"
                required
              />
            </div>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <Button type="submit" fullWidth disabled={pending}>
              {pending ? '확인 중…' : '사업자 확인 (시뮬레이션)'}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
