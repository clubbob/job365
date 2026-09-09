'use client';

import { useState } from 'react';
import PageHeader from '@/components/navigation/PageHeader';
import { Button, Card, FieldLabel } from '@/components/ui/Card';
import { useAdminAuth } from '@/features/admin/admin-auth-context';
import { authInputClassName } from '@/lib/auth-ui';

export default function AdminLoginForm() {
  const { login } = useAdminAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setPending(true);
    const result = await login(username, password);
    setPending(false);
    if (!result.ok) setError(result.message);
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-5 py-6">
      <PageHeader
        title="관리자 로그인"
        description="관리자 아이디와 비밀번호로 로그인하세요."
        showRefresh={false}
        homeHref="/"
        homeLabel="사이트로"
      />
      <Card>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <FieldLabel htmlFor="admin-username" required>
              아이디
            </FieldLabel>
            <input
              id="admin-username"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className={authInputClassName}
              required
            />
          </div>
          <div>
            <FieldLabel htmlFor="admin-password" required>
              비밀번호
            </FieldLabel>
            <input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={authInputClassName}
              required
            />
          </div>
          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <Button type="submit" fullWidth disabled={pending}>
            {pending ? '로그인 중…' : '로그인'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
