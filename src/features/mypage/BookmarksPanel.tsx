'use client';

import { useCallback, useEffect, useState } from 'react';
import CrawledJobCard from '@/features/job-board/CrawledJobCard';
import { useAuth } from '@/features/auth/auth-context';
import { JOB_LIST_PAGE_SIZE } from '@/lib/job-board/constants';
import type { CrawledJobListItem } from '@/types/crawled-job';

export default function BookmarksPanel() {
  const { user } = useAuth();
  const [items, setItems] = useState<CrawledJobListItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/users/me/bookmarks?page=${page}&pageSize=${JOB_LIST_PAGE_SIZE}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json()) as {
        ok?: boolean;
        data?: { items: CrawledJobListItem[]; hasMore: boolean };
      };
      if (!res.ok || !json.ok || !json.data) {
        throw new Error('찜한 공고를 불러오지 못했습니다.');
      }
      setItems(json.data.items);
      setHasMore(json.data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : '찜한 공고를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [user, page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRemove(jobId: string) {
    if (!user || removingId) return;

    setRemovingId(jobId);
    setError('');

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/users/me/bookmarks?jobId=${encodeURIComponent(jobId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json()) as { ok?: boolean; error?: { message?: string } };

      if (!res.ok || !json.ok) {
        throw new Error(json.error?.message ?? '찜 해제에 실패했습니다.');
      }

      setItems((prev) => prev.filter((item) => item.id !== jobId));
    } catch (err) {
      setError(err instanceof Error ? err.message : '찜 해제에 실패했습니다.');
    } finally {
      setRemovingId(null);
    }
  }

  if (loading) return <p className="text-sm text-muted">불러오는 중…</p>;
  if (error) return <p className="text-sm text-red-700">{error}</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((job) => (
          <div key={job.id} className="relative">
            <CrawledJobCard job={job} className="pr-20" />
            <button
              type="button"
              disabled={removingId === job.id}
              onClick={() => void handleRemove(job.id)}
              className="absolute right-3 top-3 z-10 rounded-lg border border-border-strong bg-surface px-2.5 py-1 text-xs font-semibold text-muted transition hover:bg-neutral-50 hover:text-foreground disabled:opacity-60"
            >
              {removingId === job.id ? '처리 중…' : '찜 해제'}
            </button>
          </div>
        ))}
      </div>
      {items.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
          찜한 공고가 없습니다.
        </p>
      ) : null}
      {hasMore ? (
        <button
          type="button"
          onClick={() => setPage((p) => p + 1)}
          className="mx-auto rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover"
        >
          더보기
        </button>
      ) : null}
    </div>
  );
}
