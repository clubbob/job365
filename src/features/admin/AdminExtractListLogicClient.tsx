'use client';

import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import { CRAWL_SCHEDULE } from '@/lib/crawler/schedule';

const logicListClassName =
  'mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground';

export default function AdminExtractListLogicClient() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="수집/노출 로직"
        description="공고를 어떻게 가져오고, 구직자에게 어떻게 보여 주는지입니다."
        homeHref="/admin"
        homeLabel="대시보드"
      />

      <Card title="수집 로직" description="회사 채용 페이지에서 공고를 가져옵니다.">
        <ul className={logicListClassName}>
          <li>
            <span className="font-medium">언제</span> — 매주 {CRAWL_SCHEDULE.weekdaysKo}{' '}
            {CRAWL_SCHEDULE.localTime}
          </li>
          <li>
            <span className="font-medium">대상</span> — 대기업·IT·장비는 매번 전부, 중견은 회차당{' '}
            {CRAWL_SCHEDULE.midSizedSitesPerRun.toLocaleString('ko-KR')}곳
          </li>
          <li>
            <span className="font-medium">저장</span> — 실제 채용만 넣고, 홍보는 빼기
          </li>
          <li>
            <span className="font-medium">마감</span> — 기간이 지난 공고는 마감 처리
          </li>
          <li>
            <span className="font-medium">분류</span> — 공고마다 회사 분류 하나
          </li>
        </ul>
      </Card>

      <Card title="노출 로직" description="구직자 「채용 정보」에 올리는 기준입니다.">
        <ul className={logicListClassName}>
          <li>
            <span className="font-medium">모집 중</span> — 접수 기간이 지나지 않은 공고
          </li>
          <li>
            <span className="font-medium">채용만</span> — 홍보·대외활동 글은 빼기
          </li>
          <li>
            <span className="font-medium">제목</span> — 채용 회사와 공고 제목을 나눠 보여 줌
          </li>
          <li>
            <span className="font-medium">중복</span> — 같은 공고는 하나만
          </li>
          <li>
            <span className="font-medium">맞춤</span> — 구직자 설정에 맞는 공고
          </li>
        </ul>
      </Card>
    </div>
  );
}
