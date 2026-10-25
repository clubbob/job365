'use client';

import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import { CRAWL_SCHEDULE } from '@/lib/crawler/schedule';
import { JOB_BOARD_COMPANY_SEGMENTS } from '@/lib/job-board/company-segment';

const logicListClassName =
  'mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground';

const companySegmentList = JOB_BOARD_COMPANY_SEGMENTS.join(', ');

export default function AdminExtractListLogicClient() {
  const autoRunLabel = `매일 ${CRAWL_SCHEDULE.localTime} (한국 시간, ${CRAWL_SCHEDULE.runner})`;

  return (
    <div className="space-y-5">
      <PageHeader
        title="수집/노출 로직"
        description="채용 정보 메뉴에서 공고를 어떻게 가져오고, 구직자에게 어떻게 보여 주는지 정리한 페이지입니다."
        homeHref="/admin"
        homeLabel="대시보드"
      />

      <Card title="관리자 화면과의 연결" description="채용 정보 하위 탭이 무엇을 뜻하는지입니다.">
        <ul className={logicListClassName}>
          <li>
            <span className="font-medium">통계 요약</span> — 회사 분류({companySegmentList})별로 명단 회사 수,
            지금 DB에 있는 수집·노출 공고 수, 마지막 수집의 추가된 공고·마감 처리 공고·순 증감 공고를 봅니다.
          </li>
          <li>
            <span className="font-medium">수집 채용 회사</span> — 위 네 분류 탭별 등록 명단, 채용 URL 연결, 모집
            공고 건수입니다. IT·장비 명단에 있는 회사는 대기업 탭에서 빼고 각각의 탭에만 보입니다.
          </li>
          <li>
            <span className="font-medium">수집 채용 공고</span> — DB에 저장된 모집 중(active) 공고 전체입니다. 같은
            분류 탭으로 걸러 볼 수 있습니다.
          </li>
          <li>
            <span className="font-medium">노출 채용 공고</span> — 아래 노출 로직을 통과한 공고만 모은 목록으로,
            구직자 「채용 정보」와 같습니다.
          </li>
        </ul>
      </Card>

      <Card title="수집 로직" description="채용 사이트에서 공고를 가져와 DB에 반영하는 방식입니다.">
        <ul className={logicListClassName}>
          <li>
            <span className="font-medium">자동 실행</span> — {autoRunLabel}에 전체 수집이 돌아갑니다. 「통계
            요약」에서 「지금 수집 실행」으로 수동 실행할 수 있습니다.
          </li>
          <li>
            <span className="font-medium">명단 DB</span> — 대기업·중견기업·IT 회사·반도체·디스플레이 장비사는 각각
            별도 DB이며 한 회사는 하나의 DB에만 속합니다. IT·장비 명단 회사는 대기업·중견 명단·수집에 포함되지
            않습니다. 각 회사는 명단에 고유한 사업자번호와 전용 채용 URL이 있어야 수집·연결 완료로
            집계됩니다. 집단 통합 URL만 있는 경우는 연결되지 않습니다.
          </li>
          <li>
            <span className="font-medium">수집 대상</span> — 「수집 채용 회사」에 채용 URL이 연결된 페이지입니다.
            {CRAWL_SCHEDULE.detail}
          </li>
          <li>
            <span className="font-medium">집단 통합 채용</span> — 계열사마다 전용 URL이 없고 그룹 채용 사이트만
            있는 경우, 그 사이트에서 공고를 가져온 뒤 제목·모집 회사명으로 계열사를 구분합니다.
          </li>
          <li>
            <span className="font-medium">수집 내용</span> — 제목, 지원 링크, 마감일, 지역, 채용 형태, 요약 등.
            사이트가 허용한 범위만 조회하고 요청 간격을 둡니다.
          </li>
          <li>
            <span className="font-medium">저장</span> — 새 공고는 등록하고, 이미 있는 공고는 이번에 확인한
            제목·마감일 등으로 갱신합니다. 채용이 아닌 항목은 저장하지 않습니다.
          </li>
          <li>
            <span className="font-medium">마감</span> — 채용 페이지에서 사라졌거나 마감일이 지난 공고는 삭제하지
            않고 상태만 마감으로 바꿉니다. 마지막 수집의 「마감 처리 공고」에 반영됩니다.
          </li>
          <li>
            <span className="font-medium">회사 분류</span> — 공고·통계는 모집 회사명과 수집 출처를 기준으로{' '}
            {companySegmentList} 중 하나에만 붙입니다.
          </li>
        </ul>
      </Card>

      <Card title="노출 로직" description="구직자 「채용 정보」에 올릴 공고를 고르는 방식입니다.">
        <ul className={logicListClassName}>
          <li>
            <span className="font-medium">모집 중만</span> — active 상태이고 마감이 지나지 않은 공고만 후보입니다.
          </li>
          <li>
            <span className="font-medium">채용 공고만</span> — 뉴스·안내·가이드처럼 채용이 아닌 제목·본문은
            제외합니다. 지원 링크와 제목이 실제 공고 형태인지 검사합니다.
          </li>
          <li>
            <span className="font-medium">제목 정리</span> — 「며칠 남음」 같은 홍보 문구는 제목에서 뺍니다.
          </li>
          <li>
            <span className="font-medium">목록 정리</span> — 같은 지원 링크·같은 제목은 한 건으로 묶어 목록에
            보입니다.
          </li>
          <li>
            <span className="font-medium">맞춤 채용 정보</span> — 구직자가 맞춤 설정(회사 분류, 채용 형태 등)에
            맞는 공고만 「맞춤 채용 정보」에 보입니다. 노출·마감 기준은 일반 「채용 정보」와 같습니다.
          </li>
        </ul>
        <p className="mt-4 text-sm text-muted">
          대시보드·「통계 요약」의 「노출 채용 공고」·구직자 「채용 정보」 건수는 이 노출 로직을 거친 수입니다.
          「수집 채용 공고」는 DB 모집 중 건수로, 노출보다 많을 수 있습니다.
        </p>
      </Card>
    </div>
  );
}
