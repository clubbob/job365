import Link from 'next/link';
import AdSlot from '@/components/ads/AdSlot';
import JobBoardList from '@/features/job-board/JobBoardList';
import { JOB_HOME_PAGE_SIZE } from '@/lib/job-board/constants';
import { JOB_TREND_PAGE_TITLE } from '@/lib/site-menu-copy';

export default function JobseekerHome() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-primary to-primary-dark px-5 py-8 text-white shadow-card sm:px-8">
        <p className="text-sm font-semibold text-blue-100">구직자 홈</p>
        <h1 className="mt-2 text-2xl font-bold leading-snug sm:text-3xl">
          지금 지원할 수 있는 채용 정보를 찾아 보세요
        </h1>
        <p className="mt-3 whitespace-pre-line break-keep text-sm leading-relaxed text-blue-100 sm:text-base">
          {'모인 채용 공고를 확인하고, 채용 트렌드로 최근 흐름을 볼 수 있습니다.\n지원은 회사 채용 페이지에서 합니다.'}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/jobs"
            className="inline-flex rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-primary shadow-sm transition hover:bg-blue-50"
          >
            채용 공고 보기
          </Link>
          <Link
            href="/jobs/trend"
            className="inline-flex rounded-lg border border-white/70 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            {JOB_TREND_PAGE_TITLE}
          </Link>
        </div>
      </section>

      <AdSlot placement="header" />

      <JobBoardList
        showFilters={false}
        listTitle="최근 채용 공고"
        listMoreHref="/jobs"
        showCount={false}
        showLoadMore={false}
        pageSize={JOB_HOME_PAGE_SIZE}
      />
    </div>
  );
}
