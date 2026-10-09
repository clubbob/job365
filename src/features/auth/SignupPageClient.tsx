'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { updateProfile } from 'firebase/auth';
import PageHeader from '@/components/navigation/PageHeader';
import { Button, Card, FieldLabel } from '@/components/ui/Card';
import { FieldFeedback, FormFeedback } from '@/components/ui/FormFeedback';
import { getAuthErrorMessage, isValidPassword, PASSWORD_MIN_LENGTH } from '@/features/auth/auth-errors';
import { useAuth } from '@/features/auth/auth-context';
import { getSafeReturnPath } from '@/lib/auth-return';
import { authFormInputClassName } from '@/lib/auth-ui';
import { getClientAuth } from '@/lib/firebase';

export default function SignupPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnPath = getSafeReturnPath(searchParams.get('next'));
  const loginHref = `/login${returnPath !== '/' ? `?next=${encodeURIComponent(returnPath)}` : ''}`;
  const { user, loading, needsConsent, signUpWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [emailChecked, setEmailChecked] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [nicknameChecked, setNicknameChecked] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState(false);
  const [checkingNickname, setCheckingNickname] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (loading || !user) return;

    if (needsConsent) {
      const next = returnPath === '/' ? '' : `?next=${encodeURIComponent(returnPath)}`;
      router.replace(`/signup/consent${next}`);
      return;
    }

    router.replace(returnPath);
  }, [user, loading, needsConsent, returnPath, router]);

  async function handleCheckEmail() {
    const value = email.trim();
    if (!value) {
      setError('이메일을 입력해 주세요.');
      return;
    }

    setCheckingEmail(true);
    setError(null);

    try {
      const res = await fetch(`/api/users/email/check?email=${encodeURIComponent(value)}`);
      const json = (await res.json()) as {
        ok?: boolean;
        data?: { available: boolean; reason?: string | null };
      };

      if (!res.ok || !json.ok || !json.data) {
        throw new Error('이메일 확인에 실패했습니다.');
      }

      setEmailChecked(true);
      setEmailAvailable(json.data.available);
      if (!json.data.available) {
        setError(json.data.reason ?? '이미 사용 중인 이메일입니다.');
      }
    } catch (err) {
      setEmailChecked(false);
      setEmailAvailable(false);
      setError(err instanceof Error ? err.message : '이메일 확인에 실패했습니다.');
    } finally {
      setCheckingEmail(false);
    }
  }

  async function handleCheckNickname() {
    const value = nickname.trim();
    if (!value) {
      setError('닉네임을 입력해 주세요.');
      return;
    }

    setCheckingNickname(true);
    setError(null);

    try {
      const res = await fetch(`/api/users/nickname/check?nickname=${encodeURIComponent(value)}`);
      const json = (await res.json()) as {
        ok?: boolean;
        data?: { available: boolean; reason?: string | null };
      };

      if (!res.ok || !json.ok || !json.data) {
        throw new Error('닉네임 확인에 실패했습니다.');
      }

      setNicknameChecked(true);
      setNicknameAvailable(json.data.available);
      if (!json.data.available) {
        setError(json.data.reason ?? '이미 사용 중인 닉네임입니다.');
      }
    } catch (err) {
      setNicknameChecked(false);
      setNicknameAvailable(false);
      setError(err instanceof Error ? err.message : '닉네임 확인에 실패했습니다.');
    } finally {
      setCheckingNickname(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedNickname = nickname.trim();
    if (!email.trim() || !password || !trimmedNickname) {
      setError('이메일, 비밀번호, 닉네임을 모두 입력해 주세요.');
      return;
    }

    if (!emailChecked || !emailAvailable) {
      setError('이메일 중복 확인을 해 주세요.');
      return;
    }

    if (!nicknameChecked || !nicknameAvailable) {
      setError('닉네임 중복 확인을 해 주세요.');
      return;
    }

    if (!isValidPassword(password)) {
      setError(`비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상으로 입력해 주세요.`);
      return;
    }

    setPending(true);
    try {
      await signUpWithEmail(email, password);

      const auth = getClientAuth();
      const currentUser = auth?.currentUser;
      if (!currentUser) throw new Error('회원가입 후 로그인 상태를 확인하지 못했습니다.');

      await updateProfile(currentUser, { displayName: trimmedNickname });

      const token = await currentUser.getIdToken();
      const registerRes = await fetch('/api/users/me/register-nickname', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nickname: trimmedNickname }),
      });
      const registerJson = (await registerRes.json()) as {
        ok?: boolean;
        error?: { message?: string };
      };

      if (!registerRes.ok || !registerJson.ok) {
        throw new Error(registerJson.error?.message ?? '닉네임 등록에 실패했습니다.');
      }
    } catch (err) {
      setError(getAuthErrorMessage(err, '회원가입에 실패했습니다.'));
    } finally {
      setPending(false);
    }
  }

  if (loading || user) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader
          title="회원가입"
          description={needsConsent ? '약관 동의 페이지로 이동 중입니다.' : '불러오는 중…'}
          showRefresh={false}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="회원가입" description="구직자 회원가입입니다." showRefresh={false} />

      <Card>
        <form className="flex flex-col gap-4" onSubmit={(e) => void handleSubmit(e)}>
          <div>
            <FieldLabel htmlFor="signup-email" required>이메일</FieldLabel>
            <div className="flex gap-2">
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailChecked(false);
                  setEmailAvailable(false);
                }}
                className={`${authFormInputClassName} min-w-0 flex-1`}
                required
              />
              <Button
                type="button"
                variant="secondary"
                className="shrink-0"
                onClick={() => void handleCheckEmail()}
                disabled={checkingEmail}
              >
                {checkingEmail ? '확인 중…' : '중복 확인'}
              </Button>
            </div>
            {emailChecked && emailAvailable ? (
              <FieldFeedback variant="success" message="사용할 수 있는 이메일입니다." />
            ) : null}
          </div>

          <div>
            <FieldLabel htmlFor="signup-password" required>비밀번호</FieldLabel>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={authFormInputClassName}
              minLength={PASSWORD_MIN_LENGTH}
              required
            />
            <p className="mt-1 text-xs text-muted">{PASSWORD_MIN_LENGTH}자 이상으로 입력해 주세요.</p>
          </div>

          <div>
            <FieldLabel htmlFor="signup-nickname" required>닉네임</FieldLabel>
            <div className="flex gap-2">
              <input
                id="signup-nickname"
                type="text"
                autoComplete="nickname"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  setNicknameChecked(false);
                  setNicknameAvailable(false);
                }}
                className={`${authFormInputClassName} min-w-0 flex-1`}
                maxLength={20}
                required
              />
              <Button
                type="button"
                variant="secondary"
                className="shrink-0"
                onClick={() => void handleCheckNickname()}
                disabled={checkingNickname}
              >
                {checkingNickname ? '확인 중…' : '중복 확인'}
              </Button>
            </div>
            {nicknameChecked && nicknameAvailable ? (
              <FieldFeedback variant="success" message="사용할 수 있는 닉네임입니다." />
            ) : null}
          </div>

          {error ? <FormFeedback variant="error">{error}</FormFeedback> : null}

          <Button
            type="submit"
            disabled={pending || !emailChecked || !emailAvailable || !nicknameChecked || !nicknameAvailable}
          >
            {pending ? '가입 중…' : '회원가입'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          이미 계정이 있나요?{' '}
          <Link href={loginHref} className="font-semibold text-primary hover:underline">
            로그인
          </Link>
        </p>
      </Card>
    </div>
  );
}
