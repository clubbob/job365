'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import {
  adminDangerActionClassName,
  adminJson,
  adminSecondaryActionClassName,
} from '@/lib/admin-ui';
import { deleteInquiry, getInquiry } from '@/lib/inquiries-store';
import type { Inquiry } from '@/lib/inquiry';

type ItemResponse =
  | { ok: true; data: { item: Inquiry | null } }
  | { ok: false; error?: { message?: string } };

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
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

export default function AdminInquiryDetailClient({ inquiryId }: { inquiryId: string }) {
  const router = useRouter();
  const [item, setItem] = useState<Inquiry | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const local = getInquiry(inquiryId);
      try {
        const data = await adminJson<ItemResponse>(`/api/admin/inquiries/${encodeURIComponent(inquiryId)}`);
        if (!cancelled && data.ok && data.data.item) {
          setItem(data.data.item);
          setReady(true);
          return;
        }
      } catch {
        // 로컬 저장 건으로 이어갑니다.
      }
      if (!cancelled) {
        setItem(local);
        setReady(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [inquiryId]);

  async function handleDelete() {
    if (!item) return;
    if (!window.confirm(`「${item.name}」님의 문의를 삭제할까요?`)) return;
    deleteInquiry(item.id);
    try {
      await adminJson(`/api/admin/inquiries/${encodeURIComponent(item.id)}`, { method: 'DELETE' });
    } catch {
      // 로컬에서는 이미 지웠습니다.
    }
    router.push('/admin/inquiries');
  }

  if (!ready) {
    return <p className="py-8 text-center text-sm text-muted">불러오는 중…</p>;
  }

  if (!item) {
    return (
      <div className="space-y-5">
        <PageHeader title="문의" homeHref="/admin/inquiries" homeLabel="목록으로" />
        <Card>
          <p className="text-sm text-muted">문의를 찾을 수 없습니다.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="문의" description={item.name} homeHref="/admin/inquiries" homeLabel="목록으로" />
      <div className="flex flex-wrap items-center gap-2">
        <a href={`mailto:${item.email}`} className={adminSecondaryActionClassName}>
          이메일 보내기
        </a>
        <button type="button" className={adminDangerActionClassName} onClick={() => void handleDelete()}>
          삭제
        </button>
      </div>
      <Card title="문의 내용">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-subtle">접수일</dt>
            <dd className="mt-1 font-semibold text-foreground">{formatCreatedAt(item.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-subtle">이름</dt>
            <dd className="mt-1 font-semibold text-foreground">{item.name}</dd>
          </div>
          <div>
            <dt className="text-subtle">이메일</dt>
            <dd className="mt-1 font-semibold text-foreground">
              <a href={`mailto:${item.email}`} className="text-primary hover:underline">
                {item.email}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-subtle">내용</dt>
            <dd className="mt-1 whitespace-pre-wrap leading-relaxed text-foreground">{item.message}</dd>
          </div>
        </dl>
      </Card>
      <Link href="/admin/inquiries" className="text-sm font-semibold text-primary hover:underline">
        목록으로
      </Link>
    </div>
  );
}
