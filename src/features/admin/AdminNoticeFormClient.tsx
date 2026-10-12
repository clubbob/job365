'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import AutoGrowTextarea from '@/components/ui/AutoGrowTextarea';
import PageHeader from '@/components/navigation/PageHeader';
import { Button, Card, FieldLabel } from '@/components/ui/Card';
import { FormFeedback } from '@/components/ui/FormFeedback';
import { adminJson } from '@/lib/admin-ui';
import { authFormInputClassName } from '@/lib/auth-ui';
import type { Notice } from '@/types/notice';

type NoticeDraft = {
  title: string;
  body: string;
  published: boolean;
};

function draftFromNotice(notice: Notice | null): NoticeDraft {
  return {
    title: notice?.title ?? '',
    body: notice?.body ?? '',
    published: notice?.published ?? false,
  };
}

type SaveResponse =
  | { ok: true; data: { notice: Notice } }
  | { ok: false; error?: { message?: string } };

export default function AdminNoticeFormClient({
  mode,
  noticeId,
}: {
  mode: 'create' | 'edit';
  noticeId?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(mode === 'edit');
  const [saved, setSaved] = useState<NoticeDraft>(() => draftFromNotice(null));
  const [draft, setDraft] = useState<NoticeDraft>(() => draftFromNotice(null));
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const dirty = useMemo(
    () =>
      draft.title !== saved.title || draft.body !== saved.body || draft.published !== saved.published,
    [draft, saved],
  );

  useEffect(() => {
    if (mode !== 'edit' || !noticeId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const id = noticeId ?? '';
        const data = await adminJson<{ ok: true; data: { notice: Notice | null } }>(
          `/api/admin/notices/${encodeURIComponent(id)}`,
        );
        if (cancelled) return;
        if (!data.ok || !data.data.notice) {
          setError('공지사항을 찾을 수 없습니다.');
          return;
        }
        const next = draftFromNotice(data.data.notice);
        setSaved(next);
        setDraft(next);
      } catch {
        if (!cancelled) setError('공지사항을 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [mode, noticeId]);

  function handleCancel() {
    if (!dirty) {
      router.push('/admin/notices');
      return;
    }
    setDraft(saved);
    setError('');
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (!dirty || pending) return;

    const title = draft.title.trim();
    const body = draft.body;
    if (!title) {
      setError('제목을 입력해 주세요.');
      return;
    }
    if (!body.trim()) {
      setError('내용을 입력해 주세요.');
      return;
    }

    setPending(true);
    try {
      const payload = { title, body, published: draft.published };
      const data =
        mode === 'create'
          ? await adminJson<SaveResponse>('/api/admin/notices', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            })
          : await adminJson<SaveResponse>(`/api/admin/notices/${encodeURIComponent(noticeId!)}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });

      if (!data.ok) {
        setError(data.error?.message ?? '공지사항을 저장하지 못했습니다.');
        return;
      }

      router.push('/admin/notices');
      router.refresh();
    } catch {
      setError('공지사항을 저장하지 못했습니다.');
    } finally {
      setPending(false);
    }
  }

  const titleLabel = mode === 'create' ? '공지사항 등록' : '공지사항 수정';

  return (
    <div className="space-y-5">
      <PageHeader
        title={titleLabel}
        description="공개한 공지만 사이트 공지사항 메뉴에 표시됩니다."
        homeHref="/admin/notices"
        homeLabel="목록으로"
        showRefresh={false}
      />

      {loading ? <p className="text-sm text-muted">불러오는 중…</p> : null}
      {error && !loading ? <FormFeedback variant="error">{error}</FormFeedback> : null}

      {!loading && (mode === 'create' || draft.title || saved.title) ? (
        <Card>
          <form className="flex flex-col gap-4" onSubmit={(e) => void handleSubmit(e)}>
            <div>
              <FieldLabel htmlFor="notice-title" required>제목</FieldLabel>
              <input
                id="notice-title"
                type="text"
                value={draft.title}
                onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                className={authFormInputClassName}
                maxLength={200}
              />
            </div>

            <div>
              <FieldLabel htmlFor="notice-body" required>내용</FieldLabel>
              <AutoGrowTextarea
                id="notice-body"
                value={draft.body}
                onChange={(e) => setDraft((prev) => ({ ...prev, body: e.target.value }))}
                className={authFormInputClassName}
                maxLength={20000}
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={draft.published}
                onChange={(e) => setDraft((prev) => ({ ...prev, published: e.target.checked }))}
                className="h-4 w-4 rounded border-border-strong text-primary focus:ring-primary/25"
              />
              사이트에 공개
            </label>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={!dirty || pending}>
                {pending ? '저장 중…' : '저장'}
              </Button>
              {dirty ? (
                <Button type="button" variant="secondary" disabled={pending} onClick={handleCancel}>
                  취소
                </Button>
              ) : null}
            </div>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
