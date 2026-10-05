'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdSlot from '@/components/ads/AdSlot';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/features/auth/auth-context';
import { isJobNewToday } from '@/lib/job-board/match';
import type { CrawledJob } from '@/types/crawled-job';

export default function CrawledJobDetailPageClient({ jobId }: { jobId: string }) {
  const { user } = useAuth();
  const [job, setJob] = useState<CrawledJob | null>(null);
  const [todayDate, setTodayDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkPending, setBookmarkPending] = useState(false);
  const [bookmarkMessage, setBookmarkMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/crawled-jobs/${encodeURIComponent(jobId)}`);
        const json = (await res.json()) as {
          ok?: boolean;
          data?: { job: CrawledJob };
          error?: { message?: string };
        };

        if (!res.ok || !json.ok || !json.data?.job) {
          throw new Error(json.error?.message ?? '채용 공고를 찾을 수 없습니다.');
        }

        if (!mounted) return;
        setJob(json.data.job);
        setTodayDate(json.data.job.crawledAt.slice(0, 10));
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : '채용 공고를 불러오지 못했습니다.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [jobId]);

  useEffect(() => {
    if (!user || !job) {
      setBookmarked(false);
      return;
    }

    void (async () => {
      const token = await user.getIdToken();
      const res = await fetch(`/api/users/me/bookmarks?page=1&pageSize=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json()) as { ok?: boolean; data?: { items: Array<{ id: string }> } };
      if (res.ok && json.ok && json.data) {
        setBookmarked(json.data.items.some((item) => item.id === job.id));
      }
    })();
  }, [user, job]);

  async function toggleBookmark() {
    if (!user || !job || bookmarkPending) return;

    setBookmarkPending(true);
    setBookmarkMessage(null);

    try {
      const token = await user.getIdToken();
      const removing = bookmarked;

      const res = removing
        ? await fetch(`/api/users/me/bookmarks?jobId=${encodeURIComponent(job.id)}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          })
        : await fetch('/api/users/me/bookmarks', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ jobId: job.id }),
          });

      const json = (await res.json()) as { ok?: boolean; error?: { message?: string } };

      if (!res.ok || !json.ok) {
        throw new Error(
          json.error?.message ?? (removing ? '찜 해제에 실패했습니다.' : '찜하기에 실패했습니다.'),
        );
      }

      setBookmarked(!removing);
      setBookmarkMessage({
        type: 'success',
        text: removing ? '찜을 해제했습니다.' : '찜 목록에 추가했습니다.',
      });
    } catch (err) {
      setBookmarkMessage({
        type: 'error',
        text: err instanceof Error ? err.message : '찜 처리에 실패했습니다.',
      });
    } finally {
      setBookmarkPending(false);
    }
  }

  if (loading) {
    return <p className="py-8 text-center text-sm text-muted">불러오는 중…</p>;
  }

  if (error || !job) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
        {error ?? '채용 공고를 찾을 수 없습니다.'}
      </div>
    );
  }

  const closed = job.status === 'closed';
  const isNew = todayDate ? isJobNewToday(job, todayDate) : false;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={job.title}
        description={`${job.companyName} · ${job.sourceName}`}
        showRefresh={false}
      />

      {closed ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          이 공고는 마감되었습니다.
        </div>
      ) : null}

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          {job.employmentTypes.map((type) => (
            <span key={type} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {type}
            </span>
          ))}
          {isNew ? (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">New</span>
          ) : null}
        </div>

        <dl className="mt-4 grid gap-2 text-sm">
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-muted">지역</dt>
            <dd className="text-foreground">{job.regions.join(', ') || '—'}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-muted">직무</dt>
            <dd className="text-foreground">{job.roles.join(', ') || '—'}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-muted">기업 규모</dt>
            <dd className="text-foreground">{job.companySize}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-muted">마감일</dt>
            <dd className="text-foreground">{job.deadline ?? '채용 시까지'}</dd>
          </div>
        </dl>

        {job.description ? (
          <div
            className="prose prose-sm mt-5 max-w-none text-foreground"
            dangerouslySetInnerHTML={{ __html: job.description }}
          />
        ) : (
          <p className="mt-5 text-sm text-muted">상세 내용이 없습니다. 원문 사이트에서 확인해 주세요.</p>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover"
            >
              지원하기
            </a>
            {user ? (
              <button
                type="button"
                disabled={bookmarkPending}
                onClick={() => void toggleBookmark()}
                className="inline-flex rounded-lg border border-border-strong bg-surface px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-neutral-50 disabled:opacity-60"
              >
                {bookmarkPending ? '처리 중…' : bookmarked ? '찜 해제' : '찜하기'}
              </button>
            ) : (
              <Link
                href={`/login?next=/jobs/${job.id}`}
                className="inline-flex rounded-lg border border-border-strong bg-surface px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-neutral-50"
              >
                로그인 후 찜하기
              </Link>
            )}
          </div>
          {bookmarkMessage ? (
            <p
              className={`text-sm font-medium ${bookmarkMessage.type === 'success' ? 'text-green-700' : 'text-red-700'}`}
            >
              {bookmarkMessage.text}
              {bookmarkMessage.type === 'success' && bookmarked ? (
                <>
                  {' '}
                  <Link href="/mypage?tab=bookmarks" className="font-semibold text-primary hover:underline">
                    찜한 공고 보기
                  </Link>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
      </Card>

      <AdSlot placement="detail" />

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="text-base font-bold text-foreground">댓글</h2>
        <p className="mt-2 text-sm text-muted">댓글 기능은 준비 중입니다.</p>
      </section>
    </div>
  );
}
