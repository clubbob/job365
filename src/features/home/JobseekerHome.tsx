import Link from 'next/link';
import AdSlot from '@/components/ads/AdSlot';
import JobBoardList from '@/features/job-board/JobBoardList';
import { JOB_HOME_PAGE_SIZE } from '@/lib/job-board/constants';

export default function JobseekerHome() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-primary to-primary-dark px-5 py-8 text-white shadow-card sm:px-8">
        <p className="text-sm font-semibold text-blue-100">구직자 홈</p>
        <h1 className="mt-2 text-2xl font-bold leading-snug sm:text-3xl">
          지금 지원할 수 있는 채용 정보를 찾아 보세요
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-blue-100 sm:text-base">
          수집된 채용 공고를 확인하고 원문 사이트에서 지원할 수 있습니다. 이용료는 없습니다.
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
