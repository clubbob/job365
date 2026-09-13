'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/navigation/PageHeader';
import {
  DetailBadge,
  DetailHero,
  DetailSection,
  DetailStatGrid,
  DetailText,
} from '@/components/ui/PostingDetail';
import { Card } from '@/components/ui/Card';
import JobCompanySection from '@/features/jobs/JobCompanySection';
import {
  adminDangerActionClassName,
  adminJson,
  adminPrimaryActionClassName,
  adminSecondaryActionClassName,
} from '@/lib/admin-ui';
import { jobCareerLabel, jobDeadlineLabel, jobEducationLabel, jobHeadcountLabel } from '@/lib/job-display';
import { deleteMyJobPostingById, findMyJobPosting, saveMyJobPosting } from '@/lib/my-job-posts';
import { isPublishedJob, jobPositionLabel, jobWorkTypesLabel, type JobPosting } from '@/types/job';
import AdminPublishBadge from '@/features/admin/AdminPublishBadge';

type ItemResponse =
  | { ok: true; data: { item: { ownerId: string; job: JobPosting } | null } }
  | { ok: false; error?: { message?: string } };

export default function AdminJobDetailClient({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [item, setItem] = useState<{ ownerId: string; job: JobPosting } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const local = findMyJobPosting(jobId);
      try {
        const data = await adminJson<ItemResponse>(`/api/admin/jobs/${encodeURIComponent(jobId)}`);
        if (!cancelled && data.ok && data.data.item) {
          setItem(data.data.item);
          saveMyJobPosting(data.data.item.ownerId, data.data.item.job);
          setReady(true);
          return;
        }
      } catch {
        // 로컬 저장 건으로 이어갑니다.
      }
      if (!cancelled) {
        setItem(local ? { ownerId: local.userId, job: local.job } : null);
        setReady(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  async function handleDelete() {
    if (!item) return;
    if (!window.confirm(`「${item.job.title}」 채용 정보를 삭제할까요?`)) return;
    deleteMyJobPostingById(item.job.id);
    try {
      await adminJson(`/api/admin/jobs/${encodeURIComponent(item.job.id)}`, { method: 'DELETE' });
    } catch {
      // 로컬에서는 이미 지웠습니다.
    }
    router.push('/admin/jobs');
  }

  if (!ready) {
    return <p className="py-8 text-center text-sm text-muted">불러오는 중…</p>;
  }

  if (!item) {
    return (
      <div className="space-y-5">
        <PageHeader title="채용 정보" homeHref="/admin/jobs" homeLabel="목록으로" />
        <Card>
          <p className="text-sm text-muted">채용 정보를 찾을 수 없습니다.</p>
        </Card>
      </div>
    );
  }

  const { job } = item;
  const career = jobCareerLabel(job);
  const education = jobEducationLabel(job.education);
  const headcount = jobHeadcountLabel(job.headcount);
  const workType = jobWorkTypesLabel(job);
  const deadline = job.deadline ? jobDeadlineLabel(job.deadline) : null;

  return (
    <div className="space-y-5">
      <PageHeader title="채용 정보" description={job.companyName} homeHref="/admin/jobs" homeLabel="목록으로" />
      <div className="flex flex-wrap items-center gap-2">
        <AdminPublishBadge published={isPublishedJob(job)} />
        {isPublishedJob(job) ? (
          <Link href={`/jobs/${job.id}`} className={adminSecondaryActionClassName}>
            사이트에서 보기
          </Link>
        ) : null}
        <Link href={`/admin/jobs/${encodeURIComponent(job.id)}/edit`} className={adminPrimaryActionClassName}>
          수정
        </Link>
        <button type="button" className={adminDangerActionClassName} onClick={() => void handleDelete()}>
          삭제
        </button>
      </div>
      <article className="space-y-4">
        <DetailHero
          eyebrow={job.companyName}
          title={job.title}
          badges={
            <>
              <DetailBadge tone="primary">{isPublishedJob(job) ? '공개' : '작성 중'}</DetailBadge>
              <DetailBadge>{workType}</DetailBadge>
              {career ? <DetailBadge>{career}</DetailBadge> : null}
              {education ? <DetailBadge>{education}</DetailBadge> : null}
            </>
          }
          highlightLabel="지급 기준"
          highlightValue={job.payLabel}
          facts={[
            { label: '근무지', value: job.location },
            { label: '접수 마감', value: deadline || '—' },
            { label: '모집 인원', value: headcount || '—' },
          ]}
        />
        <JobCompanySection job={job} ownerId={item.ownerId} />
        <DetailStatGrid
          items={[
            { label: '근무 형태', value: workType },
            { label: '모집 인원', value: headcount },
            { label: '경력 유무', value: career },
            { label: '학력', value: education },
            { label: '직급/직책', value: jobPositionLabel(job.positionLevel) },
            { label: '수습 기간', value: job.probation },
            { label: '근무지', value: job.location },
            { label: '근무 요일', value: job.workDays },
            { label: '근무 시간', value: job.workHours },
            { label: '접수 마감', value: deadline },
          ]}
        />
        <DetailSection title="담당 업무">
          <DetailText value={job.summary} />
        </DetailSection>
        <DetailSection title="자격 요건">
          <DetailText value={job.requirements} />
        </DetailSection>
        <DetailSection title="우대 사항">
          <DetailText value={job.preferred} />
        </DetailSection>
        <DetailSection title="복리후생">
          <DetailText value={job.benefits} />
        </DetailSection>
        <DetailSection title="전형 절차">
          <DetailText value={job.process} />
        </DetailSection>
      </article>
    </div>
  );
}
