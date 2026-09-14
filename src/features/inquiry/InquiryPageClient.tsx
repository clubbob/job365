'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/navigation/PageHeader';
import { Button, Card, FieldLabel } from '@/components/ui/Card';
import AutoGrowTextarea from '@/components/ui/AutoGrowTextarea';
import { useAuth } from '@/features/auth/auth-context';
import { inputClassName } from '@/features/auth/auth-errors';
import { firstRequiredError } from '@/lib/form-required';
import { createInquiryId, saveInquiry } from '@/lib/inquiries-store';
import { isValidEmail } from '@/lib/talent-contact';

export default function InquiryPageClient() {
  const { user, loading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName((current) => current || user.displayName?.trim() || '');
    setEmail((current) => current || user.email?.trim() || '');
  }, [user]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user || sending) return;
    const requiredError = firstRequiredError([
      { ok: Boolean(name.trim()), message: '이름을 입력해 주세요.' },
      { ok: Boolean(email.trim()) && isValidEmail(email), message: '이메일을 입력해 주세요.' },
      { ok: Boolean(message.trim()), message: '내용을 입력해 주세요.' },
    ]);
    if (requiredError) {
      setError(requiredError);
      return;
    }

    setError('');
    setSending(true);
    const inquiry = {
      id: createInquiryId(user.uid),
      userId: user.uid,
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      createdAt: new Date().toISOString(),
    };

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inquiry),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: { message?: string };
        data?: { inquiry?: typeof inquiry };
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error?.message || '문의를 보내지 못했습니다. 잠시 후 다시 시도해 주세요.');
      }
      saveInquiry(data.data?.inquiry ?? inquiry);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '문의를 보내지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="문의하기" description="서비스 이용, 채용 정보, 사업자 상태조회 관련 문의를 남겨 주세요." />
      {loading ? (
        <p className="py-8 text-center text-sm text-muted">불러오는 중…</p>
      ) : !user ? (
        <Card>
          <p className="text-sm text-muted">문의하기는 로그인 후에 이용할 수 있습니다.</p>
          <Link
            href="/login?next=/inquiry"
            className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            로그인
          </Link>
        </Card>
      ) : (
        <Card>
          {submitted ? (
            <p className="text-sm text-muted">문의가 접수되었습니다. 확인 후 연락드리겠습니다.</p>
          ) : (
            <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4" noValidate>
              <div>
                <FieldLabel htmlFor="inquiry-name" required>
                  이름
                </FieldLabel>
                <input
                  id="inquiry-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className={inputClassName}
                  maxLength={50}
                  required
                />
              </div>
              <div>
                <FieldLabel htmlFor="inquiry-email" required>
                  이메일
                </FieldLabel>
                <input
                  id="inquiry-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={inputClassName}
                  required
                />
              </div>
              <div>
                <FieldLabel htmlFor="inquiry-message" required>
                  내용
                </FieldLabel>
                <AutoGrowTextarea
                  id="inquiry-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  className={`${inputClassName} min-h-32`}
                  maxLength={2000}
                  required
                />
              </div>
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <Button type="submit" fullWidth disabled={sending}>
                {sending ? '보내는 중…' : '보내기'}
              </Button>
            </form>
          )}
        </Card>
      )}
    </div>
  );
}
