import Link from 'next/link';
import AdSlot from '@/components/ads/AdSlot';
import JobList from '@/features/jobs/JobList';

export default function JobseekerHome() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-primary to-primary-dark px-5 py-8 text-white shadow-card sm:px-8">
        <p className="text-sm font-semibold text-blue-100">구직자 홈</p>
        <h1 className="mt-2 text-2xl font-bold leading-snug sm:text-3xl">
          지금 지원할 수 있는 채용 정보를 찾아 보세요
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-blue-100 sm:text-base">
          채용 정보를 선택해 바로 지원할 수 있습니다. 이용료는 없습니다.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/mypage?tab=resume"
            className="inline-flex rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-primary shadow-sm transition hover:bg-blue-50"
          >
            취업 관리
          </Link>
        </div>
      </section>

      <AdSlot placement="header" />

      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">최근 채용 정보</h2>
          <p className="mt-1 text-sm text-muted">공개된 채용 정보를 확인해 보세요.</p>
        </div>
        <Link href="/jobs" className="text-sm font-semibold text-primary hover:underline">
          전체 보기
        </Link>
      </div>

      <JobList limit={6} hideFilters />
    </div>
  );
}
