import { redirect } from 'next/navigation';

/** 예전 수집 데이터 통계 URL — 수집 채용 공고로 보냅니다. */
export default function AdminJobsStatsRedirectPage() {
  redirect('/admin/jobs/crawled');
}
