'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import WorkPreferencesForm from '@/features/mypage/WorkPreferencesForm';
import {
  deleteMyTalentProfileById,
  duplicateMyTalentProfile,
  listMyTalentProfilesForUser,
} from '@/lib/my-talent-profile';
import { syncDeleteTalentProfile, syncMyTalentProfile } from '@/lib/posting-sync';
import { talentEducation, talentRecentDate, talentResumeTitle, talentWorkTypeLabel } from '@/lib/talent-display';
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
const rowActionClassName =
  'inline-flex rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm font-semibold text-foreground hover:bg-neutral-50';
const dangerActionClassName =
  'inline-flex rounded-lg border border-danger/30 px-3 py-2 text-sm font-semibold text-danger hover:bg-red-50';

export default function JobseekerManagePanel({
  userId,
  resumes,
  ready,
  subTab,
  onSelectSubTab,
  onResumesChange,
}: {
  userId: string;
  resumes: TalentProfile[];
  ready: boolean;
  subTab: JobseekerSubTab;
  onSelectSubTab: (id: JobseekerSubTab) => void;
  onResumesChange: (resumes: TalentProfile[]) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    setBusyId(null);
  }, [resumes]);

  function refresh() {
    onResumesChange(listMyTalentProfilesForUser(userId));
  }

  async function handleCopy(resume: TalentProfile) {
    setBusyId(resume.id);
    const copied = duplicateMyTalentProfile(userId, resume.id);
    if (copied) {
      await syncMyTalentProfile(copied);
      refresh();
    }
    setBusyId(null);
  }

  async function handleDelete(resume: TalentProfile) {
    const title = talentResumeTitle(resume);
    if (!window.confirm(`「${title}」 이력서를 삭제할까요?`)) return;
    setBusyId(resume.id);
    deleteMyTalentProfileById(resume.id);
    await syncDeleteTalentProfile(resume.id);
    refresh();
    setBusyId(null);
  }

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
            ready && resumes.length > 0
              ? `${resumes.length}건이 등록되어 있습니다. 지원 회사별로 내용을 나눠 등록하거나 복사해 새로 만들 수 있습니다.`
              : '지원 회사별로 내용을 나눠 등록하고, 복사해서 새 이력서를 만들 수 있습니다.'
          }
          action={
            <Link href="/talents/new?from=mypage" className={primaryLinkClassName}>
              이력서 등록
            </Link>
          }
        >
          {!ready ? (
            <p className="text-sm text-muted">불러오는 중…</p>
          ) : resumes.length > 0 ? (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {resumes.map((resume) => {
                const published = isPublishedTalent(resume);
                const title = talentResumeTitle(resume);
                const busy = busyId === resume.id;
                return (
                  <li key={resume.id} className="p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {published ? (
                            <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-white">
                              공개
                            </span>
                          ) : (
                            <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-muted">
                              작성 중
                            </span>
                          )}
                          {resume.workType ? (
                            <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-muted">
                              {talentWorkTypeLabel(resume.workType)}
                            </span>
                          ) : null}
                          {resume.careerLabel ? (
                            <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-muted">
                              {resume.careerLabel}
                            </span>
                          ) : null}
                          {resume.education ? (
                            <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-muted">
                              {talentEducation(resume)}
                            </span>
                          ) : null}
                        </div>
                        <p
                          className={
                            resume.title?.trim()
                              ? 'mt-2 text-base font-bold text-foreground'
                              : 'mt-2 text-base font-bold text-subtle'
                          }
                        >
                          {title}
                        </p>
                        {resume.headline?.trim() && resume.headline.trim() !== title ? (
                          <p className="mt-1 text-sm text-muted">{resume.headline}</p>
                        ) : null}
                        <p className="mt-1 text-xs text-subtle">최근 저장일 {talentRecentDate(resume)}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5 sm:justify-end">
                        <Link
                          href={`/talents/new?edit=${encodeURIComponent(resume.id)}&from=mypage`}
                          className={rowActionClassName}
                        >
                          수정
                        </Link>
                        <button
                          type="button"
                          className={rowActionClassName}
                          disabled={busy}
                          onClick={() => void handleCopy(resume)}
                        >
                          복사
                        </button>
                        {published ? (
                          <Link href={`/talents/${resume.id}`} className={rowActionClassName}>
                            보기
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          className={dangerActionClassName}
                          disabled={busy}
                          onClick={() => void handleDelete(resume)}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
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
