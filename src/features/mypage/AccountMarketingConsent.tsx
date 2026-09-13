'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { User } from 'firebase/auth';
import { Button, Card } from '@/components/ui/Card';
import { updateUserAccount } from '@/lib/users-api';

type AccountMarketingConsentProps = {
  user: User;
  agreed: boolean;
  onSaved: (agreed: boolean) => void;
};

export default function AccountMarketingConsent({
  user,
  agreed,
  onSaved,
}: AccountMarketingConsentProps) {
  const [draft, setDraft] = useState(agreed);
  const [savedValue, setSavedValue] = useState(agreed);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    setDraft(agreed);
    setSavedValue(agreed);
    setError('');
    setJustSaved(false);
  }, [agreed]);

  const dirty = draft !== savedValue;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty || saving) return;

    setSaving(true);
    setError('');
    const result = await updateUserAccount(user, { marketingAgreed: draft });
    setSaving(false);

    if (!result.ok) {
      setError(result.error.message ?? '마케팅 수신 동의를 저장하지 못했습니다.');
      return;
    }

    const next = result.data.marketingAgreed;
    setSavedValue(next);
    setDraft(next);
    setJustSaved(true);
    onSaved(next);
  }

  function handleCancel() {
    setDraft(savedValue);
    setError('');
    setJustSaved(false);
  }

  return (
    <Card
      title="마케팅 수신 동의"
      description="이벤트·신규 기능·채용 관련 광고성 정보를 이메일로 받을지 정합니다. 동의하지 않아도 필수 서비스는 그대로 이용할 수 있습니다."
    >
      <form onSubmit={handleSave} className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg bg-surface px-3 py-3 shadow-sm ring-1 ring-border">
          <input
            id="account-marketing-consent"
            type="checkbox"
            checked={draft}
            onChange={(e) => {
              setDraft(e.target.checked);
              setJustSaved(false);
            }}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border-strong text-primary focus:ring-primary/25"
          />
          <div className="min-w-0 text-sm leading-relaxed text-foreground">
            <label htmlFor="account-marketing-consent" className="cursor-pointer">
              마케팅 활용 및 광고성 정보 수신에 동의합니다.
            </label>{' '}
            <Link
              href="/marketing"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary underline underline-offset-2 hover:text-primary-hover"
            >
              마케팅 수신 동의
            </Link>
          </div>
        </div>
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        {justSaved && !dirty ? (
          <p className="text-sm font-medium text-primary">마케팅 수신 동의를 저장했습니다.</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={!dirty || saving}>
            {saving ? '저장 중…' : '저장'}
          </Button>
          {dirty ? (
            <Button type="button" variant="secondary" disabled={saving} onClick={handleCancel}>
              취소
            </Button>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
