'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { User } from 'firebase/auth';
import AutoGrowTextarea from '@/components/ui/AutoGrowTextarea';
import { Card } from '@/components/ui/Card';
import { FormFeedback } from '@/components/ui/FormFeedback';
import { getAuthErrorMessage } from '@/features/auth/auth-errors';
import { useAuth } from '@/features/auth/auth-context';
import { deleteUserAccount } from '@/lib/users-api';
import { WITHDRAWAL_REASON_MAX_LENGTH } from '@/types/withdrawal';

const inputClassName =
  'h-10 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm text-foreground outline-none transition placeholder:text-subtle focus:border-primary focus:ring-2 focus:ring-primary/25';

const textareaClassName =
  'min-h-[2.5rem] w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-subtle focus:border-primary focus:ring-2 focus:ring-primary/25';

export default function WithdrawAccountForm({ user }: { user: User }) {
  const router = useRouter();
  const { logout, reauthenticate } = useAuth();
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const trimmedReason = reason.trim();
  const dirty = password.length > 0 || trimmedReason.length > 0;
  const canWithdraw = password.length > 0 && trimmedReason.length > 0 && trimmedReason.length <= WITHDRAWAL_REASON_MAX_LENGTH;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;

    if (!password) {
      setError('비밀번호를 입력해 주세요.');
      return;
    }

    if (!trimmedReason) {
      setError('탈퇴 사유를 입력해 주세요.');
      return;
    }

    if (trimmedReason.length > WITHDRAWAL_REASON_MAX_LENGTH) {
      setError(`탈퇴 사유는 ${WITHDRAWAL_REASON_MAX_LENGTH}자 이하로 입력해 주세요.`);
      return;
    }

    setPending(true);
    setError('');

    try {
      await reauthenticate(password);
    } catch (err) {
      setError(getAuthErrorMessage(err, '비밀번호 확인에 실패했습니다.', 'passwordConfirm'));
      setPending(false);
      return;
    }

    setPending(false);

    const confirmed = window.confirm('회원 탈퇴 시 계정과 저장된 정보가 삭제됩니다. 탈퇴할까요?');
    if (!confirmed) return;

    setPending(true);

    try {
      const result = await deleteUserAccount(user, { reason: trimmedReason });
      if (!result.ok) {
        throw new Error(result.error.message ?? '회원 탈퇴에 실패했습니다.');
      }

      await logout();
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원 탈퇴에 실패했습니다.');
    } finally {
      setPending(false);
    }
  }

  function handleCancel() {
    setPassword('');
    setReason('');
    setError('');
  }

  return (
    <Card>
      <form className="flex flex-col gap-4" onSubmit={(e) => void handleSubmit(e)}>
        <p className="text-sm text-muted">탈퇴하면 계정과 저장된 설정이 삭제됩니다.</p>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-foreground">비밀번호</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError('');
            }}
            className={inputClassName}
            required
          />
          <p className="text-xs text-muted">본인 확인을 위해 현재 비밀번호를 입력해 주세요. 탈퇴 시 일치 여부를 검증합니다.</p>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-foreground">탈퇴 사유</span>
          <AutoGrowTextarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError('');
            }}
            maxLength={WITHDRAWAL_REASON_MAX_LENGTH}
            placeholder="탈퇴 사유를 간단히 적어 주세요."
            className={textareaClassName}
          />
          <p className="text-xs text-muted">입력한 사유는 서비스 개선을 위해 관리자가 확인합니다.</p>
        </label>

        {error ? <FormFeedback variant="error">{error}</FormFeedback> : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={!canWithdraw || pending}
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
          >
            {pending ? '확인 중…' : '회원 탈퇴'}
          </button>
          {dirty ? (
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg border border-border-strong bg-surface px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-neutral-50"
            >
              취소
            </button>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
