'use client';

import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import { CRAWL_SCHEDULE } from '@/lib/crawler/schedule';
import { JOB_BOARD_COMPANY_SEGMENTS } from '@/lib/job-board/company-segment';

const logicListClassName =
  'mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground';

const companySegmentList = JOB_BOARD_COMPANY_SEGMENTS.join(', ');

export default function AdminExtractListLogicClient() {
  const autoRunLabel = CRAWL_SCHEDULE.label;

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
            <span className="font-medium">통계 요약</span> — 회사 분류({companySegmentList})별로 「수집 채용 회사」
            명단 곳수, 지금 DB의 수집·부적합·노출 공고 건수, 마지막 수집의 추가된 공고·마감 처리 공고·순 증감 공고를
            봅니다. 부적합은 수집에서 노출을 뺀 값(마감으로 보이는 건, 중복, 품질·노출 제한 등)이며 −로 표시합니다.
            공고 행은 분류마다 한 번만 세며, 네 분류 합이 「합계」 열과 같습니다.
          </li>
          <li>
            <span className="font-medium">수집 채용 회사</span> — 네 분류 탭별 등록 명단, 채용 URL 연결(사업자번호·전용
            URL), 행별 「모집 공고」 건수입니다. 행 건수는 수집 출처·모집 회사명에 맞춘 집계이며, 통계 요약의
            분류별 공고 합과 숫자가 같지 않을 수 있습니다(집단 통합 사이트·여러 출처 등).
          </li>
          <li>
            <span className="font-medium">수집 채용 공고</span> — Firestore에 저장된 모집 중(active) 공고 전체입니다.
            노출 필터·중복 제거 전 건수라 「노출 채용 공고」보다 많을 수 있습니다. 그 차이는 통계 요약의 「부적합
            채용 공고」입니다. 분류 탭은 공고당 하나의 회사 분류로 걸러 봅니다.
          </li>
          <li>
            <span className="font-medium">노출 채용 공고</span> — 아래 노출 로직과 목록 중복 제거를 거친 공고입니다.
            구직자 「채용 정보」 목록과 같은 기준입니다.
          </li>
        </ul>
      </Card>

      <Card title="수집 로직" description="채용 사이트에서 공고를 가져와 DB에 반영하는 방식입니다.">
        <ul className={logicListClassName}>
          <li>
            <span className="font-medium">자동 실행</span> — {autoRunLabel}에 전체 수집이 돌아갑니다. 「통계
            요약」에서 「지금 수집 실행」으로 수동 실행할 수 있습니다(로컬 예상 약{' '}
            {CRAWL_SCHEDULE.localManualRunEstimateMinutes}분).
          </li>
          <li>
            <span className="font-medium">명단 DB</span> — 대기업·중견기업·IT 회사·반도체·디스플레이 장비사는 각각
            별도 JSON DB이며, 한 법인·한 집단 행은 하나의 DB에만 속합니다. IT·장비 시드 명단에 있는 회사는
            대기업·중견 명단·수집 대상에서 빼 둡니다. 대기업은 공정거래위원회 기업집단별 통합 채용 URL(집단
            행)과, 사업자번호·전용 URL이 갖춰진 법인 행이 있습니다. 중견은 법인 단위 명단과 고용24 연동
            배치가 있습니다.
          </li>
          <li>
            <span className="font-medium">수집 대상</span> — 명단에 연결된 채용 URL·집단 통합 채용 사이트·(중견)
            고용24 배치입니다. {CRAWL_SCHEDULE.detail} IT·장비는 시드 DB에 URL이 연결된 곳만{' '}
            {CRAWL_SCHEDULE.perRunFullCrawlLabel} 돌립니다. 대기업 집단 수집에는 IT 전용 대기업 출처(네이버·카카오 등)는 넣지 않고, 해당 회사는 IT
            시드 명단 경로로만 다룹니다.
          </li>
          <li>
            <span className="font-medium">집단 통합 채용</span> — 계열사 전용 URL 없이 그룹 채용 사이트만 있는
            경우, 그 사이트에서 공고를 가져온 뒤 제목·모집 회사명으로 계열사를 구분합니다. 명단에 「집단 통합
            채용만 있음」인 법인은 전용 URL이 없어 연결 완료로 보지 않습니다.
          </li>
          <li>
            <span className="font-medium">수집 내용</span> — 제목, 지원 링크, 마감일, 지역, 채용 형태, 요약 등.
            사이트가 허용한 범위만 조회하고 요청 간격을 둡니다.
          </li>
          <li>
            <span className="font-medium">저장</span> — 제목·본문이 채용 공고로 보이는 항목만 DB에 넣습니다(뉴스·
            가이드·스팸 문구 등은 저장하지 않음). 이미 있는 공고는 이번에 확인한 제목·마감일 등으로 갱신합니다.
          </li>
          <li>
            <span className="font-medium">마감</span> — 채용 페이지에서 사라졌거나 마감일이 지난 공고는 삭제하지
            않고 status를 마감으로 바꿉니다. 「통계 요약」의 「마감 처리 공고」에 반영됩니다.
          </li>
          <li>
            <span className="font-medium">회사 분류(공고·통계)</span> — active 공고마다 아래 순서로 하나만
            붙입니다. 반도체·디스플레이 장비사(모집 회사명) → IT 회사(모집 회사명·IT 수집 출처) → 대기업
            (companySize) → 그 외 중견기업. 같은 공고가 여러 분류 칸에 중복 집계되지 않습니다.
          </li>
          <li>
            <span className="font-medium">마지막 수집 분류별 건수</span> — 추가·마감·순 증감의 분류 칸은 수집
            run의 출처(source)를 분류에 매핑한 값입니다. 「지금」 공고 분류(모집 회사명 기준)와 run마다
            완전히 같지 않을 수 있습니다.
          </li>
        </ul>
      </Card>

      <Card title="노출 로직" description="구직자 「채용 정보」에 올릴 공고를 고르는 방식입니다.">
        <ul className={logicListClassName}>
          <li>
            <span className="font-medium">모집 중만</span> — active이고, 제목·마감일 기준으로 아직 마감으로 보이지
            않는 공고만 후보입니다.
          </li>
          <li>
            <span className="font-medium">채용 공고만</span> — 마감 표시·비채용 제목, 이메일 수집 안내 등 스팸
            본문, 커리어 가이드형 긴 본문은 제외합니다. 본문이 비어 있는 목록 조회는 지원 URL이 공고 형태일
            때만 통과할 수 있습니다.
          </li>
          <li>
            <span className="font-medium">노출 제한</span> — 관리자가 끈 수집 출처·회사(출처+회사명)는 목록에서
            빼 둡니다. 공고 단위로 showInJobBoard=false인 경우도 목록에 넣지 않습니다.
          </li>
          <li>
            <span className="font-medium">제목 정리</span> — 카드·목록 표시 시 「며칠 남음」 같은 홍보 문구는
            제목에서 뺍니다.
          </li>
          <li>
            <span className="font-medium">목록 중복 제거</span> — 노출 목록·통계의 「노출 채용 공고」 건수는 같은
            모집 회사·같은 제목(또는 같은 지원 URL·제목)으로 여러 DB 문서가 있으면 최신 한 건만 남깁니다. DB
            문서 수와 목록 건수는 다를 수 있습니다.
          </li>
          <li>
            <span className="font-medium">구직자 목록</span> — 「채용 정보」(/jobs)는 주소에 검색·필터가 없으면
            전체 노출 목록을 보여 줍니다(이전에 고른 필터를 세션만으로 다시 켜지 않음). 필터는 URL에 있을 때만
            적용합니다.
          </li>
          <li>
            <span className="font-medium">맞춤 채용 정보</span> — 구직자 맞춤 설정(회사 분류, 채용 형태, 직무,
            지역)에 맞는 공고만 보입니다. 분류·직무 등을 비워 두면 맞춤 목록은 노출 가능한 모집 중 공고 전체를
            후보로 둡니다. 노출·마감·중복 제거 기준은 일반 「채용 정보」와 같습니다.
          </li>
        </ul>
        <p className="mt-4 text-sm text-muted">
          「통계 요약」의 「노출 채용 공고」·구직자 「채용 정보」 건수는 위 조건과 중복 제거 후 분류별로 센
          값입니다. 「수집 채용 공고」는 DB 모집 중 문서 수로, 노출보다 많을 수 있습니다.
        </p>
      </Card>
    </div>
  );
}
