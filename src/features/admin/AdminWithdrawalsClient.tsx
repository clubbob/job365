'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import type { WithdrawalLog } from '@/types/withdrawal';

function formatWithdrawnAt(value: string): string {
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

export default function AdminWithdrawalsClient() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/admin/withdrawals');
        const json = (await res.json()) as { ok?: boolean; data?: { withdrawals: WithdrawalLog[] } };
        if (!res.ok || !json.ok || !json.data) throw new Error('탈퇴 내역을 불러오지 못했습니다.');
        setWithdrawals(json.data.withdrawals);
      } catch (err) {
        setError(err instanceof Error ? err.message : '탈퇴 내역을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-5">
      <PageHeader
        title="회원 탈퇴 내역"
        description="회원이 남긴 탈퇴 사유를 확인합니다."
        homeHref="/admin"
        homeLabel="관리자"
      />

      {loading ? <p className="text-sm text-muted">불러오는 중…</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="py-2 pr-4">탈퇴일</th>
                <th className="py-2 pr-4">닉네임</th>
                <th className="py-2 pr-4">이메일</th>
                <th className="py-2 pr-4">탈퇴 사유</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map((item) => (
                <tr key={item.id} className="border-b border-border/70 align-top">
                  <td className="py-2.5 pr-4 whitespace-nowrap">{formatWithdrawnAt(item.withdrawnAt)}</td>
                  <td className="py-2.5 pr-4 font-medium text-foreground">{item.nickname}</td>
                  <td className="py-2.5 pr-4 break-all">{item.email ?? '-'}</td>
                  <td className="py-2.5 pr-4 whitespace-pre-wrap text-foreground">{item.reason || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && withdrawals.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">탈퇴 내역이 없습니다.</p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
