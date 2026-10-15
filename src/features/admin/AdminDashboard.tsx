'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import { adminJson, firebaseAdminUnavailableText } from '@/lib/admin-ui';
import type { AdminDashboardStats } from '@/lib/admin-dashboard-stats';
import {
  ADMIN_DASHBOARD_CARD_ACTION_LABEL,
  ADMIN_DASHBOARD_DESCRIPTION,
  ADMIN_DASHBOARD_TITLE,
  ADMIN_SECTION_MENU,
} from '@/lib/admin-menu';

type StatsResponse =
  | {
      ok: true;
      data: {
        stats: AdminDashboardStats | null;
        firebaseReady?: boolean;
        firebaseAdminMessage?: string | null;
      };
    }
  | { ok: false; error?: { message?: string } };

function statForSection(
  href: string,
  stats: AdminDashboardStats | null,
): { value: string; hint: string } {
  if (!stats) return { value: '—', hint: '통계를 불러오지 못했습니다.' };

  switch (href) {
    case '/admin/users':
      return {
        value: `${stats.members.total.toLocaleString('ko-KR')}명`,
        hint: '가입 회원 수',
      };
    case '/admin/jobs/crawled':
      return {
        value: stats.jobs.active.toLocaleString('ko-KR'),
        hint: '모집 중 공고',
      };
    case '/admin/inquiries':
      return {
        value: `${stats.inquiries.pendingReply.toLocaleString('ko-KR')}건`,
        hint: `답변 대기 · 전체 ${stats.inquiries.total.toLocaleString('ko-KR')}건`,
      };
    case '/admin/withdrawals':
      return {
        value: `${stats.withdrawals.total.toLocaleString('ko-KR')}건`,
        hint: `최근 7일 ${stats.withdrawals.last7Days.toLocaleString('ko-KR')}건`,
      };
    case '/admin/notices':
      return {
        value: `${stats.notices.published.toLocaleString('ko-KR')}건`,
        hint: `게시 중 · 전체 ${stats.notices.total.toLocaleString('ko-KR')}건`,
      };
    case '/admin/extract-list-logic':
      return {
        value: '규칙',
        hint: '수집 추출·채용 목록 필터',
      };
    default:
      return { value: '—', hint: '' };
  }
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [firebaseAdminMessage, setFirebaseAdminMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminJson<StatsResponse>('/api/admin/dashboard-stats');
      if (!data.ok) throw new Error(data.error?.message || '통계를 불러오지 못했습니다.');
      setStats(data.data.stats);
      setFirebaseAdminMessage(
        data.data.firebaseReady === false ? data.data.firebaseAdminMessage ?? '' : '',
      );
    } catch (err) {
      setStats(null);
      setError(err instanceof Error ? err.message : '통계를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-5">
      <PageHeader
        title={ADMIN_DASHBOARD_TITLE}
        description={ADMIN_DASHBOARD_DESCRIPTION}
        homeHref="/"
        homeLabel="사이트로"
        homeOpenInNewWindow
      />

      {firebaseAdminMessage ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {firebaseAdminUnavailableText(firebaseAdminMessage)}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {ADMIN_SECTION_MENU.map((item) => {
          const { value, hint } = statForSection(item.href, stats);
          return (
            <Card key={item.href} className="flex h-full min-w-0 flex-col" title={item.label}>
              <div className="mt-2 min-w-0">
                <p className="text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
                  {loading ? '…' : value}
                </p>
                {hint ? (
                  <p
                    className="mt-1.5 truncate text-xs text-muted sm:text-sm"
                    title={loading ? undefined : hint}
                  >
                    {loading ? '\u00a0' : hint}
                  </p>
                ) : null}
              </div>
              <Link
                href={item.href}
                className="mt-auto inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
              >
                {ADMIN_DASHBOARD_CARD_ACTION_LABEL}
              </Link>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
