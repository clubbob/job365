import Link from 'next/link';
import AdSlot from '@/components/ads/AdSlot';
import { Card } from '@/components/ui/Card';

export default function RecruiterHome() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-primary-dark to-primary px-5 py-8 text-white shadow-card sm:px-8">
        <p className="text-sm font-semibold text-blue-100">구인자 홈</p>
        <h1 className="mt-2 text-2xl font-bold leading-snug sm:text-3xl">
          지금 채용할 수 있는 사람을 찾아 보세요
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-blue-100 sm:text-base">
          채용 공고를 올리고 지원자를 한 곳에서 관리합니다. 이용료는 없습니다.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/talents"
            className="inline-flex rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-primary shadow-sm transition hover:bg-blue-50"
          >
            인재 정보
          </Link>
          <Link
            href="/jobs/new"
            className="inline-flex rounded-lg border border-white/40 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            채용 공고 등록
          </Link>
        </div>
      </section>

      <AdSlot placement="header" />

      <Card title="내 채용 공고" description="등록한 공고와 지원 현황이 여기에 모입니다.">
        <p className="text-sm text-muted">아직 등록된 공고가 없습니다. 첫 공고는 다음 단계에서 작성할 수 있습니다.</p>
      </Card>

      <Card title="최근 지원자">
        <p className="text-sm text-muted">지원자가 생기면 열람과 합/불 처리를 여기서 하게 됩니다.</p>
      </Card>
    </div>
  );
}
