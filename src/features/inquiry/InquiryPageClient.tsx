'use client';

import { useState } from 'react';
import PageHeader from '@/components/navigation/PageHeader';
import { Button, Card, FieldLabel } from '@/components/ui/Card';
import AutoGrowTextarea from '@/components/ui/AutoGrowTextarea';
import { inputClassName } from '@/features/auth/auth-errors';
import { firstRequiredError } from '@/lib/form-required';
import { isValidEmail } from '@/lib/talent-contact';

export default function InquiryPageClient() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    setSubmitted(true);
  }

  return (
    <div className="space-y-5">
      <PageHeader title="문의하기" description="서비스 이용, 채용 정보, 사업자 상태조회 관련 문의를 남겨 주세요." />
      <Card>
      {submitted ? (
        <p className="text-sm text-muted">
          문의 접수 UI는 준비되었습니다. 실제 저장·메일 발송은 다음 단계에서 연결됩니다.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <FieldLabel htmlFor="inquiry-name" required>
              이름
            </FieldLabel>
            <input
              id="inquiry-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClassName}
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
              onChange={(e) => setEmail(e.target.value)}
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
              onChange={(e) => setMessage(e.target.value)}
              className={`${inputClassName} min-h-32`}
              required
            />
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" fullWidth>
            보내기
          </Button>
        </form>
      )}
      </Card>
    </div>
  );
}
