'use client';

import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import { CRAWL_SCHEDULE } from '@/lib/crawler/schedule';

export default function AdminExtractListLogicClient() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="추출/리스트 로직"
        description="수집 사이트에서 공고 목록을 추출하고, 구직자 채용 정보 목록에 올릴 후보를 걸러 내는 규칙입니다."
        homeHref="/admin"
        homeLabel="대시보드"
      />

      <Card
        title="채용 정보 추출 로직"
        description="등록된 채용 사이트를 수집해 공고를 DB에 반영하는 크롤링 흐름입니다."
      >
        <p className="mt-3 text-sm font-semibold text-foreground">크롤링(수집) 흐름</p>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground">
          <li>
            <span className="font-medium">실행</span> — {CRAWL_SCHEDULE.label}({CRAWL_SCHEDULE.runner})에 전체 수집이
            돌아갑니다. 관리자는 수집 실행 내역에서 수동 실행도 할 수 있습니다.
          </li>
          <li>
            <span className="font-medium">대상</span> — 수집 채용 회사에 등록된 URL·추출 방식(adapter)을 읽습니다.{' '}
            {CRAWL_SCHEDULE.detail}
          </li>
          <li>
            <span className="font-medium">회사별 수집</span> — robots.txt를 확인한 뒤, 사이트에 맞는 수집기(일반 HTML,
            JSON API, Greenhouse, 전용 연동 등)로 목록 후보를 모읍니다. 필요하면 브라우저로 페이지를 열고, 후보마다 상세를
            조회해 제목·지원 URL·마감·지역·채용 형태·요약 본문을 채웁니다. 소스마다 요청 간격을 두어 과도한 접속을
            피합니다.
          </li>
          <li>
            <span className="font-medium">저장·마감</span> — 이번 수집에서 확인된 공고는 저장·갱신합니다. 이번에 목록에
            없던 기존 모집 중 공고는 마감 처리하고, 마감일이 지난 공고도 함께 정리합니다. 실행 결과는 수집 실행 내역에
            저장 건수·마감 건수·오류로 남습니다.
          </li>
          <li>
            <span className="font-medium">목록 반영</span> — 저장·마감이 있으면 채용 정보 목록 캐시를 갱신합니다.
            구직자에게 보이는 공고는 아래 「로직 요약」의 노출·필터 규칙을 한 번 더 적용한 건수입니다.
          </li>
        </ul>
      </Card>

      <Card title="로직 요약" description="코드 기준 동작을 운영자가 참고할 수 있도록 정리했습니다.">
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground">
          <li>
            <span className="font-medium">목록 추출</span> — 채용 페이지 HTML·AJAX 조각·일반 링크 목록에서 제목·지원 URL
            후보를 모읍니다.
          </li>
          <li>
            <span className="font-medium">제목·URL 정리</span> — 마감 카운트다운 등 제목 노이즈를 제거하고, 지원 링크와
            제목이 채용 공고 형태인지 검사합니다.
          </li>
          <li>
            <span className="font-medium">목록 노출</span> — 마감 지난 공고, 뉴스·스펙·질문형 제목, 비채용 문맥을
            제외하고, 동일 지원 URL·제목 중복을 한 건으로 묶습니다.
          </li>
          <li>
            <span className="font-medium">맞춤 목록</span> — 구직자 희망 조건과 공고 필드를 맞춰 맞춤 채용 정보 탭에
            노출합니다. 일반 목록과 같은 노출·마감 규칙을 따릅니다.
          </li>
        </ul>
      </Card>
    </div>
  );
}
