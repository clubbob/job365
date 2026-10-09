'use client';

import { useState } from 'react';
import { Button, Card } from '@/components/ui/Card';
import { FormFeedback } from '@/components/ui/FormFeedback';
import { getAuthErrorMessage, PASSWORD_MIN_LENGTH } from '@/features/auth/auth-errors';
import { useAuth } from '@/features/auth/auth-context';

const inputClassName =
  'h-10 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm text-foreground outline-none transition placeholder:text-subtle focus:border-primary focus:ring-2 focus:ring-primary/25';

export default function PasswordChangeForm() {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  const dirty = currentPassword.length > 0 || newPassword.length > 0;
  const canSave = currentPassword.length > 0 && newPassword.length >= PASSWORD_MIN_LENGTH;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;

    if (!currentPassword) {
      setError('현재 비밀번호를 입력해 주세요.');
      setSaved(false);
      return;
    }

    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      setError(`새 비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상으로 입력해 주세요.`);
      setSaved(false);
      return;
    }

    setPending(true);
    setError('');
    setSaved(false);

    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setSaved(true);
    } catch (err) {
      setError(getAuthErrorMessage(err, '비밀번호를 변경하지 못했습니다.', 'passwordConfirm'));
    } finally {
      setPending(false);
    }
  }

  function handleCancel() {
    setCurrentPassword('');
    setNewPassword('');
    setError('');
    setSaved(false);
  }

  return (
    <Card>
      <form className="flex flex-col gap-4" onSubmit={(e) => void handleSubmit(e)}>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-foreground">현재 비밀번호</span>
          <input
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClassName}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-foreground">새 비밀번호</span>
          <input
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClassName}
            minLength={PASSWORD_MIN_LENGTH}
          />
          <p className="text-xs text-muted">{PASSWORD_MIN_LENGTH}자 이상으로 입력해 주세요.</p>
        </label>

        {error ? <FormFeedback variant="error">{error}</FormFeedback> : null}
        {saved ? <FormFeedback variant="success">비밀번호를 변경했습니다.</FormFeedback> : null}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={!canSave || pending}>
            {pending ? '변경 중…' : '비밀번호 변경'}
          </Button>
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
