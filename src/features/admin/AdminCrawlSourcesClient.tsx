'use client';

import { useCallback, useEffect, useState } from 'react';
import JobCompaniesPanel from '@/features/jobs/JobCompaniesPanel';
import type { JobCompaniesPayload, JobCompanySourceView } from '@/lib/job-companies-server';

type AdminSourcePatch = Partial<
  Pick<JobCompanySourceView['policy'], 'crawlDisabled' | 'displayDisabled' | 'reason'>
>;

export default function AdminCrawlSourcesClient() {
  const [data, setData] = useState<JobCompaniesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/crawl-sources');
      const json = (await res.json()) as { ok?: boolean; data?: JobCompaniesPayload };
      if (!res.ok || !json.ok || !json.data) {
        throw new Error('채용 공고 회사 목록을 불러오지 못했습니다.');
      }
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '채용 공고 회사 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateSource(sourceId: string, patch: AdminSourcePatch, confirmMessage?: string) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;

    setPendingKey(sourceId);
    setError('');
    try {
      const res = await fetch('/api/admin/crawl-sources', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId, ...patch }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: { message?: string };
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.error?.message ?? '설정을 저장하지 못했습니다.');
      }

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '설정을 저장하지 못했습니다.');
    } finally {
      setPendingKey(null);
    }
  }

  async function updateCompany(
    sourceId: string,
    companyName: string,
    patch: Partial<Pick<JobCompanySourceView['policy'], 'crawlDisabled' | 'displayDisabled' | 'reason'>>,
    confirmMessage?: string,
  ) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;

    setPendingKey(`${sourceId}::${companyName}`);
    setError('');
    try {
      const res = await fetch('/api/admin/crawl-sources', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId, companyName, ...patch }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: { message?: string };
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.error?.message ?? '설정을 저장하지 못했습니다.');
      }

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '설정을 저장하지 못했습니다.');
    } finally {
      setPendingKey(null);
    }
  }

  if (loading && !data) {
    return <p className="text-sm text-muted">불러오는 중…</p>;
  }

  if (!data) {
    return <p className="text-sm text-red-700">{error || '채용 공고 회사 목록을 불러오지 못했습니다.'}</p>;
  }

  return (
    <JobCompaniesPanel
      data={data}
      error={error}
      busyKey={pendingKey}
      onUpdateSource={(sourceId, patch, confirmMessage) => void updateSource(sourceId, patch, confirmMessage)}
      onUpdateCompany={(sourceId, companyName, patch, confirmMessage) =>
        void updateCompany(sourceId, companyName, patch, confirmMessage)
      }
    />
  );
}
