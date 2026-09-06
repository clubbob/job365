import Link from 'next/link';
import AdSlot from '@/components/ads/AdSlot';
import JobList from '@/features/jobs/JobList';

export default function JobseekerHome() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-primary to-primary-dark px-5 py-8 text-white shadow-card sm:px-8">
        <p className="text-sm font-semibold text-blue-100">구직자 홈</p>
        <h1 className="mt-2 text-2xl font-bold leading-snug sm:text-3xl">
          지금 지원할 수 있는 알바·재택·프리랜서 일을 찾아 보세요
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-blue-100 sm:text-base">
          채용 공고를 선택해 바로 지원할 수 있습니다. 이용료는 없습니다.
        </p>
        <Link
          href="/jobs"
          className="mt-5 inline-flex rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-primary shadow-sm transition hover:bg-blue-50"
        >
          채용 공고
        </Link>
      </section>

      <AdSlot placement="header" />

      <div>
        <h2 className="text-lg font-bold text-foreground">최근 채용 공고</h2>
        <p className="mt-1 text-sm text-muted">관심 있는 근무 형태를 골라 보세요.</p>
      </div>

      <JobList />
    </div>
  );
}
