'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, Card, FieldLabel } from '@/components/ui/Card';
import AutoGrowTextarea from '@/components/ui/AutoGrowTextarea';
import { useAuth } from '@/features/auth/auth-context';
import { authInputClassName } from '@/lib/auth-ui';
import { digitsOnly, formatBusinessNumber } from '@/lib/business-number';
import {
  isCompanyInfoComplete,
  loadBizVerify,
  missingCompanyInfoMessage,
  saveBizVerify,
  type BizVerifyRecord,
} from '@/lib/biz-verify-store';
import { NTS_STATUS_SOURCE } from '@/lib/company';
import { firstRequiredError } from '@/lib/form-required';
import { formatPhoneInput } from '@/lib/talent-contact';
import { fetchUserAccount, updateUserAccount } from '@/lib/users-api';
import { getUserNicknameFallback } from '@/lib/user-display';

type NumberCheck = {
  businessNumber: string;
  status: 'active';
  statusLabel: string;
  taxType: string | null;
};

type StatusApiResponse =
  | { ok: true; data: NumberCheck & { status?: string } }
  | {
      ok: false;
      error?: { message?: string };
      data?: { statusLabel?: string; status?: string; message?: string };
    };

type CompanyDraft = {
  companyName: string;
  businessNumber: string;
  ceo: string;
  address: string;
  phone: string;
  fax: string;
  foundedOn: string;
  employeeCount: string;
  lastYearRevenue: string;
  website: string;
  intro: string;
  registrantName: string;
  registrantEmail: string;
  registrantMobile: string;
};

function FieldAlert({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-sm text-danger" role="alert">
      {message}
    </p>
  );
}

function formatRevenueAmountInput(value: string): string {
  const digits = value.replace(/[^\d]/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('ko-KR');
}

function emptyDraft(): CompanyDraft {
  return {
    companyName: '',
    businessNumber: '',
    ceo: '',
    address: '',
    phone: '',
    fax: '',
    foundedOn: '',
    employeeCount: '',
    lastYearRevenue: '',
    website: '',
    intro: '',
    registrantName: '',
    registrantEmail: '',
    registrantMobile: '',
  };
}

function withAccountContact(draft: CompanyDraft, name: string, email: string): CompanyDraft {
  return {
    ...draft,
    registrantName: name.trim() || draft.registrantName,
    registrantEmail: email.trim() || draft.registrantEmail,
  };
}

function draftFromRecord(record: BizVerifyRecord | null): CompanyDraft {
  if (!record) return emptyDraft();
  return {
    companyName: record.companyName,
    businessNumber: record.businessNumber,
    ceo: record.ceo ?? '',
    address: record.address ?? '',
    phone: record.phone ?? '',
    fax: record.fax ?? '',
    foundedOn: record.foundedOn ?? '',
    employeeCount: record.employeeCount ?? '',
    lastYearRevenue: (record.lastYearRevenue ?? '').replace(/[^\d]/g, ''),
    website: record.website ?? '',
    intro: record.intro ?? '',
    registrantName: record.registrantName ?? '',
    registrantEmail: record.registrantEmail ?? '',
    registrantMobile: record.registrantMobile ?? '',
  };
}

function encodeDraft(draft: CompanyDraft, verifiedDigits: string): string {
  return JSON.stringify({
    ...draft,
    businessNumber: digitsOnly(draft.businessNumber),
    companyName: draft.companyName.trim(),
    ceo: draft.ceo.trim(),
    address: draft.address.trim(),
    phone: draft.phone.trim(),
    fax: draft.fax.trim(),
    foundedOn: draft.foundedOn.trim(),
    employeeCount: draft.employeeCount.trim(),
    lastYearRevenue: draft.lastYearRevenue.replace(/[^\d]/g, ''),
    website: draft.website.trim(),
    intro: draft.intro.trim(),
    registrantName: draft.registrantName.trim(),
    registrantEmail: draft.registrantEmail.trim(),
    registrantMobile: draft.registrantMobile.trim(),
    verifiedDigits,
  });
}

export default function CompanyInfoForm({
  userId,
  onSaved,
}: {
  userId: string;
  onSaved?: () => void;
}) {
  const { user } = useAuth();
  const [saved, setSaved] = useState<BizVerifyRecord | null>(null);
  const [draft, setDraft] = useState<CompanyDraft>(emptyDraft);
  const [accountName, setAccountName] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [numberCheck, setNumberCheck] = useState<NumberCheck | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [didSave, setDidSave] = useState(false);
  const [retryServer, setRetryServer] = useState(false);
  const accountRef = useRef({ name: '', email: '' });
  const dirtyRef = useRef(false);
  const onSavedRef = useRef(onSaved);
  accountRef.current = { name: accountName, email: accountEmail };
  onSavedRef.current = onSaved;

  useEffect(() => {
    if (!user) {
      setAccountName('');
      setAccountEmail('');
      return;
    }
    setAccountName(getUserNicknameFallback(user));
    setAccountEmail(user.email?.trim() ?? '');
    void fetchUserAccount(user).then((result) => {
      if (!result.ok) return;
      setAccountName(result.data.profile.nickname || getUserNicknameFallback(user));
      setAccountEmail(result.data.profile.email?.trim() || user.email?.trim() || '');
      if (!result.data.company || dirtyRef.current) return;
      applyRecord(saveBizVerify(userId, result.data.company));
      onSavedRef.current?.();
    });
  }, [user, userId]);

  useEffect(() => {
    applyRecord(loadBizVerify(userId));
    setError('');
    setLookupError('');
    setDidSave(false);
    setRetryServer(false);
  }, [userId]);

  useEffect(() => {
    if (!accountName && !accountEmail) return;
    setDraft((current) => withAccountContact(current, accountName, accountEmail));
  }, [accountEmail, accountName]);

  const verifiedDigits = numberCheck ? digitsOnly(numberCheck.businessNumber) : '';
  const savedVerifiedDigits = saved ? digitsOnly(saved.businessNumber) : '';
  const canEditCompany =
    numberCheck?.status === 'active' &&
    verifiedDigits.length === 10 &&
    verifiedDigits === digitsOnly(draft.businessNumber);
  const dirty = encodeDraft(draft, verifiedDigits) !== encodeDraft(draftFromRecord(saved), savedVerifiedDigits);
  dirtyRef.current = dirty;
  const complete = isCompanyInfoComplete(saved);
  const canSave = canEditCompany && (dirty || retryServer);
  const lockedInputClassName = `${authInputClassName} disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-muted`;
  const accountInputClassName = `${authInputClassName} bg-neutral-50`;

  function applyRecord(record: BizVerifyRecord | null) {
    setSaved(record);
    setDraft(withAccountContact(draftFromRecord(record), accountRef.current.name, accountRef.current.email));
    setNumberCheck(
      record
        ? {
            businessNumber: record.businessNumber,
            status: 'active',
            statusLabel: record.statusLabel || '계속사업자',
            taxType: record.taxType,
          }
        : null,
    );
  }

  function patchDraft(patch: Partial<CompanyDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setError('');
    setDidSave(false);
  }

  async function handleLookup() {
    const missing = firstRequiredError([
      { ok: digitsOnly(draft.businessNumber).length === 10, message: '사업자등록번호를 입력해 주세요.' },
    ]);
    if (missing) {
      setLookupError(missing);
      return;
    }
    setError('');
    setLookupError('');
    setPending(true);
    try {
      const res = await fetch('/api/biz/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessNumber: draft.businessNumber }),
      });
      const data = (await res.json()) as StatusApiResponse;
      if (!res.ok || !data.ok) {
        setNumberCheck(null);
        const statusLabel = !data.ok ? data.data?.statusLabel?.trim() : '';
        const message = !data.ok
          ? data.error?.message || data.data?.message || '상태조회에 실패했습니다.'
          : '상태조회에 실패했습니다.';
        setLookupError(
          statusLabel && !message.includes(statusLabel)
            ? `조회 결과: ${statusLabel}. ${message}`
            : message,
        );
        return;
      }
      if (data.data.status !== 'active') {
        setNumberCheck(null);
        setLookupError(
          `조회 결과: ${data.data.statusLabel || '계속사업자 아님'}. 계속사업자로 조회된 경우에만 회사 정보를 등록할 수 있습니다.`,
        );
        return;
      }
      setDraft((current) => ({ ...current, businessNumber: data.data.businessNumber }));
      setNumberCheck({
        businessNumber: data.data.businessNumber,
        status: 'active',
        statusLabel: data.data.statusLabel,
        taxType: data.data.taxType,
      });
      setLookupError('');
      setDidSave(false);
    } catch {
      setNumberCheck(null);
      setLookupError('상태조회에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setPending(false);
    }
  }

  function handleSave() {
    const missing =
      firstRequiredError([
        { ok: digitsOnly(draft.businessNumber).length === 10, message: '사업자등록번호를 입력해 주세요.' },
        { ok: canEditCompany, message: '계속사업자로 조회된 경우에만 회사 정보를 저장할 수 있습니다.' },
      ]) ?? missingCompanyInfoMessage(draft);
    if (missing) {
      if (missing === '사업자등록번호를 입력해 주세요.' || missing.startsWith('계속사업자')) {
        setLookupError(missing);
        setError('');
      } else {
        setError(missing);
        setLookupError('');
      }
      return;
    }
    if (!canEditCompany || !numberCheck) return;
    if (!dirty && !retryServer) return;
    const record: BizVerifyRecord = {
      businessNumber: numberCheck.businessNumber,
      companyName: draft.companyName.trim(),
      status: 'active',
      statusLabel: numberCheck.statusLabel,
      taxType: numberCheck.taxType,
      verifiedAt: new Date().toISOString(),
      source: 'nts',
      ceo: draft.ceo.trim(),
      address: draft.address.trim(),
      phone: draft.phone.trim(),
      fax: draft.fax.trim() || undefined,
      foundedOn: draft.foundedOn.trim(),
      employeeCount: draft.employeeCount.replace(/[^\d]/g, ''),
      lastYearRevenue: draft.lastYearRevenue.replace(/[^\d]/g, ''),
      website: draft.website.trim() || undefined,
      intro: draft.intro.trim(),
      registrantName: draft.registrantName.trim(),
      registrantEmail: draft.registrantEmail.trim(),
      registrantMobile: draft.registrantMobile.trim(),
    };
    const persisted = saveBizVerify(userId, record);
    const nextDraft = withAccountContact(draftFromRecord(persisted), accountRef.current.name, accountRef.current.email);
    setSaved({
      ...persisted,
      registrantName: nextDraft.registrantName,
      registrantEmail: nextDraft.registrantEmail,
    });
    setDraft(nextDraft);
    setNumberCheck({
      businessNumber: persisted.businessNumber,
      status: 'active',
      statusLabel: persisted.statusLabel || '계속사업자',
      taxType: persisted.taxType,
    });
    setError('');
    setLookupError('');
    setDidSave(true);
    setRetryServer(false);
    onSaved?.();
    if (!user) return;
    void updateUserAccount(user, { company: persisted })
      .then((result) => {
        if (!result.ok) {
          if (result.error?.code === 'ADMIN_NOT_CONFIGURED') return;
          setError(result.error?.message || '이 기기에는 저장했습니다. 서버 저장에 실패해 다시 저장해 주세요.');
          setRetryServer(true);
          return;
        }
        if (result.data.company) saveBizVerify(userId, result.data.company);
        onSaved?.();
      })
      .catch(() => {
        setError('이 기기에는 저장했습니다. 서버 저장에 실패해 다시 저장해 주세요.');
        setRetryServer(true);
      });
  }

  function handleCancel() {
    setDraft(withAccountContact(draftFromRecord(saved), accountName, accountEmail));
    setNumberCheck(
      saved
        ? {
            businessNumber: saved.businessNumber,
            status: 'active',
            statusLabel: saved.statusLabel,
            taxType: saved.taxType,
          }
        : null,
    );
    setError('');
    setLookupError('');
    setDidSave(false);
  }

  return (
    <Card
      title={
        <span className="inline-flex flex-wrap items-center gap-2">
          회사 정보
          {complete ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">완료</span>
          ) : null}
        </span>
      }
      description="채용 정보에 쓸 회사 정보를 등록합니다. 국세청 상태조회에서 계속사업자로 나온 경우에만 입력하고 저장할 수 있습니다. 조회 시점의 상태이며, 국세청 인증이나 회사의 보증이 아닙니다."
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          handleSave();
        }}
        noValidate
      >
        <div>
          <FieldLabel htmlFor="company-biz-number" required>
            사업자등록번호
          </FieldLabel>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="company-biz-number"
              inputMode="numeric"
              autoComplete="off"
              value={draft.businessNumber}
              onChange={(event) => {
                const next = formatBusinessNumber(event.target.value);
                patchDraft({ businessNumber: next });
                if (digitsOnly(next) !== verifiedDigits) setNumberCheck(null);
                setLookupError('');
              }}
              className={`${authInputClassName} sm:flex-1`}
              placeholder="000-00-00000"
            />
            <Button type="button" variant="secondary" className="sm:shrink-0" disabled={pending} onClick={() => void handleLookup()}>
              {pending ? '조회 중…' : '상태조회'}
            </Button>
          </div>
          {canEditCompany ? (
            <p className="mt-1 text-sm text-success" aria-live="polite">
              조회 결과: {numberCheck.statusLabel} (조회 시점 기준)
              {numberCheck.taxType ? ` · ${numberCheck.taxType}` : ''}
            </p>
          ) : lookupError ? (
            <p className="mt-1 text-sm text-danger" role="alert">
              {lookupError}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted">계속사업자로 조회되면 아래 회사 정보를 입력할 수 있습니다.</p>
          )}
          <p className="mt-1 text-xs text-subtle">{NTS_STATUS_SOURCE}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="company-name" required>
              회사명
            </FieldLabel>
            <input
              id="company-name"
              value={draft.companyName}
              onChange={(event) => patchDraft({ companyName: event.target.value })}
              className={lockedInputClassName}
              placeholder="사업자 상호를 입력해 주세요"
              disabled={!canEditCompany}
            />
            {error === '회사명을 입력해 주세요.' ? <FieldAlert message={error} /> : null}
          </div>
          <div>
            <FieldLabel htmlFor="company-ceo" required>
              대표자명
            </FieldLabel>
            <input
              id="company-ceo"
              value={draft.ceo}
              onChange={(event) => patchDraft({ ceo: event.target.value })}
              className={lockedInputClassName}
              placeholder="대표자 성명"
              disabled={!canEditCompany}
            />
            {error === '대표자명을 입력해 주세요.' ? <FieldAlert message={error} /> : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="company-phone" required>
              전화번호
            </FieldLabel>
            <input
              id="company-phone"
              inputMode="tel"
              value={draft.phone}
              onChange={(event) => patchDraft({ phone: event.target.value })}
              className={lockedInputClassName}
              placeholder="02-0000-0000"
              disabled={!canEditCompany}
            />
            {error === '전화번호를 입력해 주세요.' ? <FieldAlert message={error} /> : null}
          </div>
          <div>
            <FieldLabel htmlFor="company-fax" optional>
              팩스번호
            </FieldLabel>
            <input
              id="company-fax"
              inputMode="tel"
              value={draft.fax}
              onChange={(event) => patchDraft({ fax: event.target.value })}
              className={lockedInputClassName}
              placeholder="02-0000-0000"
              disabled={!canEditCompany}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="min-w-0">
            <FieldLabel htmlFor="company-founded-on" required>
              설립일
            </FieldLabel>
            <input
              id="company-founded-on"
              type="date"
              value={draft.foundedOn}
              onChange={(event) => patchDraft({ foundedOn: event.target.value })}
              className={lockedInputClassName}
              disabled={!canEditCompany}
            />
            {error === '설립일을 입력해 주세요.' ? <FieldAlert message={error} /> : null}
          </div>
          <div className="min-w-0">
            <FieldLabel htmlFor="company-employee-count" required>
              직원 수
            </FieldLabel>
            <div className="flex min-w-0 items-center gap-2">
              <input
                id="company-employee-count"
                inputMode="numeric"
                value={draft.employeeCount}
                onChange={(event) => patchDraft({ employeeCount: event.target.value.replace(/[^\d]/g, '') })}
                className={`${lockedInputClassName} min-w-0 flex-1 text-right tabular-nums`}
                placeholder="0"
                disabled={!canEditCompany}
              />
              <span className="shrink-0 whitespace-nowrap text-sm text-muted">명</span>
            </div>
            {error === '직원 수를 입력해 주세요.' ? <FieldAlert message={error} /> : null}
          </div>
          <div className="min-w-0">
            <FieldLabel htmlFor="company-revenue" required>
              전년 매출액
            </FieldLabel>
            <div className="flex min-w-0 items-center gap-2">
              <input
                id="company-revenue"
                inputMode="numeric"
                value={formatRevenueAmountInput(draft.lastYearRevenue)}
                onChange={(event) => patchDraft({ lastYearRevenue: event.target.value.replace(/[^\d]/g, '') })}
                className={`${lockedInputClassName} min-w-0 flex-1 text-right tabular-nums`}
                placeholder="0"
                disabled={!canEditCompany}
              />
              <span className="shrink-0 whitespace-nowrap text-sm text-muted">백만 원</span>
            </div>
            {error === '전년 매출액을 입력해 주세요.' ? <FieldAlert message={error} /> : null}
          </div>
        </div>

        <div>
          <FieldLabel htmlFor="company-address" required>
            사업장 주소
          </FieldLabel>
          <input
            id="company-address"
            value={draft.address}
            onChange={(event) => patchDraft({ address: event.target.value })}
            className={lockedInputClassName}
            placeholder="본사 또는 사업장 주소"
            disabled={!canEditCompany}
          />
          {error === '사업장 주소를 입력해 주세요.' ? <FieldAlert message={error} /> : null}
        </div>

        <div>
          <FieldLabel htmlFor="company-website" optional>
            홈페이지
          </FieldLabel>
          <input
            id="company-website"
            inputMode="url"
            value={draft.website}
            onChange={(event) => patchDraft({ website: event.target.value })}
            className={lockedInputClassName}
            placeholder="https://"
            disabled={!canEditCompany}
          />
        </div>

        <div>
          <FieldLabel htmlFor="company-intro" required>
            회사 소개
          </FieldLabel>
          <AutoGrowTextarea
            id="company-intro"
            value={draft.intro}
            onChange={(event) => patchDraft({ intro: event.target.value })}
            className={lockedInputClassName}
            placeholder="회사의 사업 내용이나 소개를 적어 주세요"
            rows={3}
            disabled={!canEditCompany}
          />
          {error === '회사 소개를 입력해 주세요.' ? <FieldAlert message={error} /> : null}
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="company-registrant-name" required>
                등록자 이름
              </FieldLabel>
              <input
                id="company-registrant-name"
                value={draft.registrantName}
                readOnly
                className={accountInputClassName}
                autoComplete="name"
              />
            {error.startsWith('등록자 이름') ? <FieldAlert message={error} /> : null}
              </div>
              <div>
              <FieldLabel htmlFor="company-registrant-email" required>
                이메일
              </FieldLabel>
              <input
                id="company-registrant-email"
                type="email"
                value={draft.registrantEmail}
                readOnly
                className={accountInputClassName}
                autoComplete="email"
              />
            {error.startsWith('로그인 이메일') ? <FieldAlert message={error} /> : null}
            </div>
          </div>
          <p className="text-xs text-subtle">로그인 계정의 이름과 이메일을 보여 줍니다.</p>
          <div className="max-w-md">
            <FieldLabel htmlFor="company-registrant-mobile" required>
              핸드폰 번호
            </FieldLabel>
            <input
              id="company-registrant-mobile"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={draft.registrantMobile}
              onChange={(event) => patchDraft({ registrantMobile: formatPhoneInput(event.target.value) })}
              className={lockedInputClassName}
              placeholder="010-0000-0000"
              disabled={!canEditCompany}
            />
            {error === '핸드폰 번호를 입력해 주세요.' ? <FieldAlert message={error} /> : null}
          </div>
        </div>

        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : lookupError ? (
          <p className="text-sm text-danger" role="alert">
            {lookupError}
          </p>
        ) : didSave && !dirty ? (
          <p className="text-sm font-medium text-primary">회사 정보를 저장했습니다.</p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={!canSave}>
            저장
          </Button>
          {dirty ? (
            <Button type="button" variant="secondary" onClick={handleCancel}>
              취소
            </Button>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
