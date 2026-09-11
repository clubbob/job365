'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import WorkPreferencesForm from '@/features/mypage/WorkPreferencesForm';
import { talentEducation, talentRecentDate, talentWorkTypeLabel } from '@/lib/talent-display';
import { cn } from '@/lib/utils';
import { isPublishedTalent, type TalentProfile } from '@/types/talent';

export const JOBSEEKER_SUB_TABS = [
  { id: 'conditions', label: '희망 근무 조건' },
  { id: 'resume', label: '이력서 관리' },
  { id: 'applications', label: '입사 지원 현황' },
  { id: 'proposals', label: '받은 면접 제안' },
  { id: 'companies', label: '관심 회사 채용 정보' },
  { id: 'privacy', label: '이력서 열람 제한' },
] as const;

export type JobseekerSubTab = (typeof JOBSEEKER_SUB_TABS)[number]['id'];

export function isJobseekerSubTab(value: string | null): value is JobseekerSubTab {
  return JOBSEEKER_SUB_TABS.some((item) => item.id === value);
}

const primaryLinkClassName =
  'inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover';
const secondaryLinkClassName =
  'inline-flex rounded-lg border border-border-strong bg-surface px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-neutral-50';

export default function JobseekerManagePanel({
  userId,
  resume,
  ready,
  subTab,
  onSelectSubTab,
}: {
  userId: string;
  resume: TalentProfile | null;
  ready: boolean;
  subTab: JobseekerSubTab;
  onSelectSubTab: (id: JobseekerSubTab) => void;
}) {
  const resumePublished = Boolean(resume && isPublishedTalent(resume));
  return (
    <div className="space-y-4">
      <div
        className="-mx-1 flex gap-1 overflow-x-auto border-b border-border px-1"
        role="tablist"
        aria-label="취업 관리"
      >
        {JOBSEEKER_SUB_TABS.map((item) => {
          const active = subTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelectSubTab(item.id)}
              className={cn(
                'shrink-0 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors',
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted hover:text-foreground',
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {subTab === 'conditions' ? <WorkPreferencesForm userId={userId} /> : null}

      {subTab === 'resume' ? (
        <Card
          title="이력서 관리"
          description={
            ready && resume
              ? resumePublished
                ? `최근 저장일 ${talentRecentDate(resume)}`
                : `작성 중 · 최근 저장일 ${talentRecentDate(resume)}`
              : '항목별로 나눠 입력하고, 각 항목에서 바로 저장할 수 있습니다.'
          }
          action={
            <Link href="/talents/new?from=mypage" className={primaryLinkClassName}>
              {resume ? '이력서 수정' : '이력서 등록'}
            </Link>
          }
        >
          {!ready ? (
            <p className="text-sm text-muted">불러오는 중…</p>
          ) : resume ? (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border border-primary/15 bg-gradient-to-br from-primary/10 via-surface to-surface p-4">
                <div className="flex items-start gap-3">
                  {resume.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resume.photoUrl}
                      alt=""
                      className="size-14 shrink-0 rounded-xl object-contain bg-white ring-1 ring-border"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-1.5">
                      {resumePublished ? (
                        <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-white">
                          공개
                        </span>
                      ) : (
                        <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-muted">
                          작성 중
                        </span>
                      )}
                      <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-medium text-muted ring-1 ring-inset ring-border">
                        {talentWorkTypeLabel(resume.workType)}
                      </span>
                      {resume.careerLabel ? (
                        <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-medium text-muted ring-1 ring-inset ring-border">
                          {resume.careerLabel}
                        </span>
                      ) : null}
                      <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-medium text-muted ring-1 ring-inset ring-border">
                        {talentEducation(resume)}
                      </span>
                    </div>
                    <p className="mt-3 text-lg font-bold leading-snug text-foreground">
                      {resume.name}
                      {resume.headline ? ` · ${resume.headline}` : ''}
                    </p>
                    {resume.desiredPay ? (
                      <p className="mt-2 text-base font-bold text-primary">{resume.desiredPay}</p>
                    ) : null}
                    {resume.location ? <p className="mt-1 text-sm text-muted">{resume.location}</p> : null}
                  </div>
                </div>
              </div>
              {resumePublished ? (
                <Link href={`/talents/${resume.id}`} className={secondaryLinkClassName}>
                  내 이력서 보기
                </Link>
              ) : (
                <p className="text-sm text-muted">필수 항목을 모두 저장하면 인재 정보에 공개됩니다.</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">아직 등록한 이력서가 없습니다.</p>
          )}
        </Card>
      ) : null}

      {subTab === 'applications' ? (
        <Card title="입사 지원 현황">
          <p className="text-sm text-muted">지원한 채용 정보가 없습니다. 지원하면 진행 상태가 여기에 표시됩니다.</p>
        </Card>
      ) : null}

      {subTab === 'proposals' ? (
        <Card title="받은 면접 제안">
          <p className="text-sm text-muted">받은 면접 제안이 없습니다. 구인자가 제안하면 여기에서 확인할 수 있습니다.</p>
        </Card>
      ) : null}

      {subTab === 'privacy' ? (
        <Card title="이력서 열람 제한" description="이력서를 볼 수 있는 범위를 설정합니다.">
          <p className="text-sm text-muted">
            특정 회사의 이력서 열람을 제한하는 기능은 준비 중입니다. 지금은 인재 정보에 올린 이력서가 구인자에게
            공개됩니다.
          </p>
        </Card>
      ) : null}

      {subTab === 'companies' ? (
        <Card title="관심 회사 채용 정보">
          <p className="text-sm text-muted">
            관심 회사의 채용 정보가 없습니다. 관심 회사를 추가하면 해당 채용 정보를 여기에서 모아 볼 수 있습니다.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
