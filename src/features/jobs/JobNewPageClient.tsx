import Link from 'next/link';
import AdSlot from '@/components/ads/AdSlot';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';

export default function JobNewPageClient() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="채용 공고 등록"
        description="구인자로 공고를 올리는 화면입니다. 작성 폼은 다음 단계에서 연결됩니다."
      />
      <AdSlot placement="header" />
      <Card>
        <p className="text-sm leading-relaxed text-muted">
          첫 공고는 국세청 사업자등록번호 확인 후 관리자 승인을 거쳐 게시됩니다. 같은 계정으로 구직도 계속 이용할 수
          있습니다.
        </p>
        <Link
          href="/jobs"
          className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          채용 공고 보러 가기
        </Link>
      </Card>
    </div>
  );
}
