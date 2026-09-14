'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import { adminDangerActionClassName, adminJson, firebaseAdminUnavailableText } from '@/lib/admin-ui';
import { clearBizVerify } from '@/lib/biz-verify-store';
import { deleteAllMyJobPostings } from '@/lib/my-job-posts';
import { deleteMyTalentProfile } from '@/lib/my-talent-profile';
import { getProviderLabel } from '@/lib/user-display';
import type { AdminUserListItem, UserStatus } from '@/types/user';

const STATUS_LABELS: Record<UserStatus, string> = {
  active: '이용중',
  suspended: '이용중단',
  deleted: '탈퇴',
};

type FirebaseAdminCheck = {
  hasProjectId?: boolean;
  hasClientEmail?: boolean;
  hasPrivateKey?: boolean;
  privateKeyHasBegin?: boolean;
  privateKeyHasEnd?: boolean;
  privateKeyChars?: number;
};

function formatAdminCheck(check?: FirebaseAdminCheck | null): string {
  if (!check) return '';
  const flag = (ok: boolean | undefined) => (ok ? '있음' : '없음');
  return [
    `프로젝트 ID ${flag(check.hasProjectId)}`,
    `서비스 계정 이메일 ${flag(check.hasClientEmail)}`,
    `개인키 ${check.hasPrivateKey ? `${check.privateKeyChars ?? 0}자` : '없음'}`,
    `BEGIN ${check.privateKeyHasBegin ? '있음' : '없음'}`,
    `END ${check.privateKeyHasEnd ? '있음' : '없음'}`,
  ].join(' · ');
}

type DeleteResponse =
  | { ok: true; data: { deleted: true } }
  | { ok: false; error?: { message?: string } };

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
  const [firebaseAdminMessage, setFirebaseAdminMessage] = useState('');
  const [firebaseAdminCheck, setFirebaseAdminCheck] = useState('');
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
          data?: {
            users?: AdminUserListItem[];
            firebaseReady?: boolean;
            firebaseAdminMessage?: string | null;
            firebaseAdminCheck?: FirebaseAdminCheck;
          };
        };
        if (!res.ok || !data.ok) {
          throw new Error(data.error?.message || '회원 목록을 불러오지 못했습니다.');
        }
        if (cancelled) return;
        setUsers(data.data?.users ?? []);
        setFirebaseReady(data.data?.firebaseReady !== false);
        setFirebaseAdminMessage(data.data?.firebaseAdminMessage ?? '');
        setFirebaseAdminCheck(formatAdminCheck(data.data?.firebaseAdminCheck));
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

  async function handleDelete(user: AdminUserListItem) {
    const confirmed = window.confirm(
      `「${user.nickname}」 회원을 삭제할까요?\n회원 정보와 이 회원이 등록한 이력서, 채용 정보도 함께 삭제됩니다.`,
    );
    if (!confirmed) return;

    setDeletingId(user.id);
    setError('');
    try {
      const data = await adminJson<DeleteResponse>(`/api/admin/users/${encodeURIComponent(user.id)}`, {
        method: 'DELETE',
      });
      if (!data.ok) {
        throw new Error(data.error?.message || '회원을 삭제하지 못했습니다.');
      }
      deleteAllMyJobPostings(user.id);
      deleteMyTalentProfile(user.id);
      clearBizVerify(user.id);
      setUsers((current) => current.filter((item) => item.id !== user.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원을 삭제하지 못했습니다.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="회원"
        description="가입한 회원과 회사 정보 등록 여부를 확인하고 삭제합니다. 삭제하면 이력서와 채용 정보도 함께 지워집니다."
        homeHref="/admin"
        homeLabel="관리 홈"
      />

      <Card>
        {loading ? (
          <p className="text-sm text-muted">불러오는 중…</p>
        ) : !firebaseReady ? (
          <div className="space-y-2">
            <p className="text-sm text-muted">{firebaseAdminUnavailableText(firebaseAdminMessage)}</p>
            {firebaseAdminCheck ? <p className="text-xs text-subtle">{firebaseAdminCheck}</p> : null}
          </div>
        ) : users.length === 0 && !error ? (
          <p className="text-sm text-muted">가입한 회원이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            {error ? <p className="mb-3 text-sm text-red-700">{error}</p> : null}
            {users.length === 0 ? (
              <p className="text-sm text-muted">가입한 회원이 없습니다.</p>
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-subtle">
                    <th className="py-2 pr-4 font-semibold">닉네임</th>
                    <th className="py-2 pr-4 font-semibold">이메일</th>
                    <th className="py-2 pr-4 font-semibold">가입</th>
                    <th className="py-2 pr-4 font-semibold">회사 정보</th>
                    <th className="py-2 pr-4 font-semibold">상태</th>
                    <th className="py-2 pr-4 font-semibold">가입일</th>
                    <th className="py-2 font-semibold">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-border last:border-0">
                      <td className="py-2.5 pr-4 font-medium text-foreground">{user.nickname}</td>
                      <td className="py-2.5 pr-4 break-all text-foreground">{user.email ?? '-'}</td>
                      <td className="py-2.5 pr-4 text-muted">{getProviderLabel(user.provider)}</td>
                      <td className="py-2.5 pr-4 text-muted">
                        {user.companyReady
                          ? user.companyName || '완료'
                          : user.companyName
                            ? `${user.companyName} · 미완료`
                            : '없음'}
                      </td>
                      <td className="py-2.5 pr-4 text-muted">{STATUS_LABELS[user.status]}</td>
                      <td className="py-2.5 pr-4 whitespace-nowrap text-muted">{formatCreatedAt(user.createdAt)}</td>
                      <td className="py-2.5">
                        {user.role === 'admin' ? (
                          <span className="text-xs text-muted">관리자</span>
                        ) : (
                          <button
                            type="button"
                            className={adminDangerActionClassName}
                            disabled={deletingId === user.id}
                            onClick={() => void handleDelete(user)}
                          >
                            {deletingId === user.id ? '삭제 중…' : '삭제'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
