'use client';

import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import { CRAWL_SCHEDULE } from '@/lib/crawler/schedule';

const TABLE_CLASS =
  'w-full table-fixed border-collapse text-sm [&_th]:font-semibold [&_th]:text-subtle [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3 [&_th]:py-2.5 [&_th]:align-middle [&_td]:align-middle';

const ROWS: Array<{ group: string; label: string; value: string }> = [
  { group: '수집', label: '언제', value: `매주 ${CRAWL_SCHEDULE.weekdaysKo} ${CRAWL_SCHEDULE.localTime}` },
  {
    group: '수집',
    label: '대상',
    value: `대기업·IT·장비는 매번 전부, 중견은 회차당 ${CRAWL_SCHEDULE.midSizedSitesPerRun.toLocaleString('ko-KR')}곳`,
  },
  { group: '수집', label: '저장', value: '실제 채용만 넣고, 홍보는 빼기' },
  { group: '수집', label: '마감', value: '기간이 지난 공고는 마감 처리' },
  { group: '수집', label: '분류', value: '공고마다 회사 분류 하나' },
  { group: '노출', label: '모집 중', value: '접수 기간이 지나지 않은 공고' },
  { group: '노출', label: '채용만', value: '홍보·대외활동 글은 빼기' },
  { group: '노출', label: '제목', value: '채용 회사와 공고 제목을 나눠 보여 줌' },
  { group: '노출', label: '중복', value: '같은 공고는 하나만' },
  { group: '노출', label: '맞춤', value: '구직자 설정에 맞는 공고' },
];

export default function AdminExtractListLogicClient() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="수집/노출 로직"
        description="공고를 어떻게 가져오고, 구직자에게 어떻게 보여 주는지입니다."
        homeHref="/admin"
        homeLabel="대시보드"
      />

      <Card>
        <div className="overflow-x-auto">
          <table className={TABLE_CLASS}>
            <colgroup>
              <col className="w-[16%]" />
              <col className="w-[18%]" />
              <col className="w-[66%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border">
                <th className="whitespace-nowrap text-left">구분</th>
                <th className="whitespace-nowrap border-r border-border text-left">항목</th>
                <th className="text-left">내용</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {ROWS.map((row, index) => {
                const prev = ROWS[index - 1];
                const showGroup = row.group !== prev?.group;
                const groupRowSpan = showGroup
                  ? ROWS.filter((item) => item.group === row.group).length
                  : 0;
                return (
                  <tr key={`${row.group}-${row.label}`}>
                    {showGroup ? (
                      <td
                        rowSpan={groupRowSpan}
                        className="border-r border-border/60 bg-neutral-50/40 font-medium text-muted"
                      >
                        {row.group}
                      </td>
                    ) : null}
                    <td className="whitespace-nowrap border-r border-border font-medium">{row.label}</td>
                    <td>{row.value}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
