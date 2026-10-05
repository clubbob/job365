'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';

type EmailDigest = {
  id: string;
  email: string;
  jobCount: number;
  todayDate: string;
  status: string;
  error: string | null;
  createdAt: string | null;
};

export default function AdminEmailDigestsClient() {
  const [digests, setDigests] = useState<EmailDigest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/admin/email-digests');
        const json = (await res.json()) as { ok?: boolean; data?: { digests: EmailDigest[] } };
        if (!res.ok || !json.ok || !json.data) throw new Error('이메일 발송 내역을 불러오지 못했습니다.');
        setDigests(json.data.digests);
      } catch (err) {
        setError(err instanceof Error ? err.message : '이메일 발송 내역을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-5">
      <PageHeader title="이메일 발송 내역" description="채용 공고 알림 메일 발송 기록입니다." homeHref="/admin" homeLabel="관리자" />

      {loading ? <p className="text-sm text-muted">불러오는 중…</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="py-2 pr-4">발송일</th>
                <th className="py-2 pr-4">이메일</th>
                <th className="py-2 pr-4">공고 수</th>
                <th className="py-2 pr-4">상태</th>
              </tr>
            </thead>
            <tbody>
              {digests.map((item) => (
                <tr key={item.id} className="border-b border-border/70">
                  <td className="py-2.5 pr-4">{item.todayDate}</td>
                  <td className="py-2.5 pr-4">{item.email}</td>
                  <td className="py-2.5 pr-4">{item.jobCount}</td>
                  <td className="py-2.5 pr-4">
                    {item.status === 'sent' ? '발송' : '실패'}
                    {item.error ? ` (${item.error})` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && digests.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">발송 내역이 없습니다.</p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
