'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import { getProviderLabel } from '@/lib/user-display';
import type { AdminUserListItem, UserStatus } from '@/types/user';

const STATUS_LABELS: Record<UserStatus, string> = {
  active: '이용중',
  suspended: '이용중단',
  deleted: '탈퇴',
};

function formatCreatedAt(value: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export default function AdminUsersClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [firebaseReady, setFirebaseReady] = useState(true);
  const [users, setUsers] = useState<AdminUserListItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/admin/users', { credentials: 'include' });
        const data = (await res.json()) as {
          ok?: boolean;
          error?: { message?: string };
          data?: { users?: AdminUserListItem[]; firebaseReady?: boolean };
        };
        if (!res.ok || !data.ok) {
          throw new Error(data.error?.message || '회원 목록을 불러오지 못했습니다.');
        }
        if (cancelled) return;
        setUsers(data.data?.users ?? []);
        setFirebaseReady(data.data?.firebaseReady !== false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '회원 목록을 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-5">
      <PageHeader
        title="회원"
        description="가입한 회원을 최근 순으로 확인합니다."
        homeHref="/admin"
        homeLabel="관리 홈"
      />

      <Card>
        {loading ? (
          <p className="text-sm text-muted">불러오는 중…</p>
        ) : error ? (
          <p className="text-sm text-red-700">{error}</p>
        ) : !firebaseReady ? (
          <p className="text-sm text-muted">Firebase Admin 설정이 없어 회원 목록을 불러올 수 없습니다.</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted">가입한 회원이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-subtle">
                  <th className="py-2 pr-4 font-semibold">닉네임</th>
                  <th className="py-2 pr-4 font-semibold">이메일</th>
                  <th className="py-2 pr-4 font-semibold">가입</th>
                  <th className="py-2 pr-4 font-semibold">상태</th>
                  <th className="py-2 font-semibold">가입일</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-foreground">{user.nickname}</td>
                    <td className="py-2.5 pr-4 break-all text-foreground">{user.email ?? '-'}</td>
                    <td className="py-2.5 pr-4 text-muted">{getProviderLabel(user.provider)}</td>
                    <td className="py-2.5 pr-4 text-muted">{STATUS_LABELS[user.status]}</td>
                    <td className="py-2.5 whitespace-nowrap text-muted">{formatCreatedAt(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
