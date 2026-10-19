'use client';

import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import { CRAWL_SCHEDULE } from '@/lib/crawler/schedule';

const logicListClassName =
  'mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground';

export default function AdminExtractListLogicClient() {
  const autoRunLabel = `매일 ${CRAWL_SCHEDULE.localTime} (한국 시간)`;

  return (
    <div className="space-y-5">
      <PageHeader
        title="수집/노출 로직"
        description="회사 채용 사이트에서 공고를 수집하고, 구직자에게 노출할 때 쓰는 기준입니다."
        homeHref="/admin"
        homeLabel="대시보드"
      />

      <Card title="수집 로직" description="채용 사이트에서 공고를 가져와 저장하는 방식입니다.">
        <ul className={logicListClassName}>
          <li>
            <span className="font-medium">자동 실행</span> — {autoRunLabel}에 전체 수집이 돌아갑니다. 필요 시 직접
            실행할 수 있습니다.
          </li>
          <li>
            <span className="font-medium">수집 대상</span> — 「수집 채용 회사」의 대기업·계열사, 중견기업, 기타기업
            명단에 등록된 채용 페이지 주소를 기준으로 합니다. {CRAWL_SCHEDULE.detail}
          </li>
          <li>
            <span className="font-medium">IT 기업</span> — 관리자 「IT 기업」 탭은 위 명단에서 IT만 모아 보여 줍니다.
            수집 주기는 대기업·계열·중견·기타 구분을 따릅니다.
          </li>
          <li>
            <span className="font-medium">수집하는 내용</span> — 공고 제목, 지원 링크, 마감일, 지역, 채용 형태,
            요약 문구 등입니다. 사이트가 허용한 범위만 조회하고, 너무 자주 접속하지 않도록 간격을 둡니다.
          </li>
          <li>
            <span className="font-medium">저장</span> — 수집할 때 채용 페이지에 보인 공고를 DB에 반영합니다.
            처음 보는 공고는 새로 등록하고, 이미 있는 공고는 제목·마감일 등을 이번에 확인한 내용으로 맞춥니다.
          </li>
          <li>
            <span className="font-medium">마감</span> — 이번 수집에서 채용 페이지에 더 없는 공고, 마감일이 지난
            공고는 삭제하지 않고 상태만 「마감」으로 바꿉니다.
          </li>
          <li>
            <span className="font-medium">통계 요약</span> — 명단 회사 수, 마지막 수집의 추가된·마감 건수,
            현재 모집 중 공고를 「통계 요약」에서 한눈에 봅니다.
          </li>
        </ul>
      </Card>

      <Card title="노출 로직" description="구직자에게 보여 줄 공고를 고르는 방식입니다.">
        <ul className={logicListClassName}>
          <li>
            <span className="font-medium">채용 공고만</span> — 뉴스, 소개 글, 질문 글처럼 채용이 아닌 항목은
            빼고, 제목과 지원 링크가 실제 공고처럼 보이는 것만 남깁니다.
          </li>
          <li>
            <span className="font-medium">제목 정리</span> — 「며칠 남음」 같은 홍보 문구는 제목에서 제거합니다.
          </li>
          <li>
            <span className="font-medium">모집 중만</span> — 마감이 지난 공고는 목록에 내지 않습니다. 같은 지원
            링크·같은 제목은 한 건으로 묶습니다.
          </li>
          <li>
            <span className="font-medium">맞춤 채용 정보</span> — 구직자가 설정한 희망 조건에 맞는 공고만 「맞춤
            채용 정보」 탭에 보입니다. 보이는·마감 기준은 일반 「채용 정보」와 같습니다.
          </li>
        </ul>
        <p className="mt-4 text-sm text-muted">
          대시보드·채용 정보의 「모집 중」 숫자는 노출 로직을 거친 후 구직자에게 보이는 건수입니다.
        </p>
      </Card>
    </div>
  );
}
