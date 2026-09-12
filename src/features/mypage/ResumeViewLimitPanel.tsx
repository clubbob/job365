'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Card } from '@/components/ui/Card';
import { talentResumeTitle } from '@/lib/talent-display';
import { isPublishedTalent, type TalentProfile } from '@/types/talent';
import { digitsOnly } from '@/lib/business-number';
import { getKoreaDateTimeLocalMin } from '@/lib/datetime';
import { followedCompanyKey } from '@/lib/followed-companies';
import { listJobs } from '@/lib/job-catalog';
import { listProposedCompaniesForJobseeker } from '@/lib/talent-proposals';
import {
  listResumeViewBlocks,
  saveResumeViewBlocks,
  type ResumeViewBlock,
} from '@/lib/resume-view-blocks';

function listKnownCompanies(): ResumeViewBlock[] {
  const map = new Map<string, ResumeViewBlock>();
  for (const job of listJobs()) {
    const companyName = job.companyName.trim();
    if (!companyName) continue;
    const key = followedCompanyKey(companyName, job.businessNumber);
    if (map.has(key)) continue;
    map.set(key, {
      key,
      companyName,
      businessNumber: digitsOnly(job.businessNumber ?? '') || undefined,
      blockedAt: '',
    });
  }
  return [...map.values()].sort((a, b) => a.companyName.localeCompare(b.companyName, 'ko'));
}

function sameKeys(a: ResumeViewBlock[], b: ResumeViewBlock[]): boolean {
  if (a.length !== b.length) return false;
  const left = a.map((item) => item.key).sort();
  const right = b.map((item) => item.key).sort();
  return left.every((key, index) => key === right[index]);
}

export default function ResumeViewLimitPanel({
  userId,
  resumes,
  onChange,
}: {
  userId: string;
  resumes: TalentProfile[];
  onChange?: () => void;
}) {
  const [saved, setSaved] = useState<ResumeViewBlock[]>([]);
  const [draft, setDraft] = useState<ResumeViewBlock[]>([]);
  const [query, setQuery] = useState('');
  const [didSave, setDidSave] = useState(false);

  const publishedResume = resumes.find(isPublishedTalent);
  const published = Boolean(publishedResume);
  const dirty = !sameKeys(saved, draft);

  useEffect(() => {
    const next = listResumeViewBlocks(userId);
    setSaved(next);
    setDraft(next);
    setQuery('');
    setDidSave(false);
  }, [userId]);

  const proposed = useMemo(() => listProposedCompaniesForJobseeker(userId), [userId, saved]);
  const known = useMemo(() => listKnownCompanies(), [userId]);

  const draftKeys = new Set(draft.map((item) => item.key));
  const proposedToAdd = proposed.filter((item) => !draftKeys.has(item.key));
  const keyword = query.trim().toLowerCase();
  const suggestions =
    keyword.length > 0
      ? known
          .filter((item) => !draftKeys.has(item.key) && item.companyName.toLowerCase().includes(keyword))
          .slice(0, 8)
      : [];

  function addCompany(company: Pick<ResumeViewBlock, 'key' | 'companyName' | 'businessNumber' | 'recruiterId'>) {
    setDidSave(false);
    setDraft((current) => {
      if (current.some((item) => item.key === company.key)) return current;
      return [
        {
          key: company.key,
          companyName: company.companyName,
          businessNumber: company.businessNumber,
          recruiterId: company.recruiterId,
          blockedAt: getKoreaDateTimeLocalMin(),
        },
        ...current,
      ];
    });
    setQuery('');
  }

  function removeCompany(key: string) {
    setDidSave(false);
    setDraft((current) => current.filter((item) => item.key !== key));
  }

  function handleSave() {
    const next = saveResumeViewBlocks(userId, draft);
    setSaved(next);
    setDraft(next);
    setDidSave(true);
    onChange?.();
  }

  function handleCancel() {
    setDraft(saved);
    setQuery('');
    setDidSave(false);
  }

  return (
    <Card
      title="이력서 열람 제한"
      description="이력서를 공개해도, 제한한 회사의 구인자는 인재 정보에서 이 이력서를 볼 수 없습니다. 면접을 제안한 회사와 채용 정보에 있는 회사를 제한할 수 있습니다."
    >
      <div className="space-y-5">
        {publishedResume ? (
          <p className="rounded-lg bg-primary/5 px-4 py-3 text-sm text-foreground">
            「{talentResumeTitle(publishedResume)}」를 공개했습니다.
            {saved.length > 0
              ? ` ${saved.map((item) => item.companyName).join(', ')} 구인자는 인재 정보에서 이 이력서를 볼 수 없습니다.`
              : ' 제한한 회사가 없으면 구인자 누구에게나 보입니다.'}
          </p>
        ) : (
          <p className="rounded-lg bg-neutral-50 px-4 py-3 text-sm text-muted">
            지금은 공개한 이력서가 없습니다. 나중에 공개해도 여기에서 제한한 회사 구인자에게는 보이지 않습니다.
          </p>
        )}

        {proposedToAdd.length > 0 ? (
          <div>
            <p className="mb-2 text-sm font-semibold text-foreground">면접 제안을 받은 회사</p>
            <ul className="flex flex-wrap gap-2">
              {proposedToAdd.map((company) => (
                <li
                  key={company.key}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-neutral-50 py-1 pl-3 pr-1.5 text-sm font-medium text-foreground"
                >
                  {company.companyName}
                  <button
                    type="button"
                    className="rounded-full px-2 py-0.5 text-xs font-semibold text-primary hover:bg-white"
                    onClick={() => addCompany(company)}
                  >
                    제한
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <label htmlFor="resume-view-company-search" className="mb-2 block text-sm font-semibold text-foreground">
            회사 추가
          </label>
          <input
            id="resume-view-company-search"
            type="search"
            value={query}
            onChange={(event) => {
              setDidSave(false);
              setQuery(event.target.value);
            }}
            placeholder="회사 이름을 입력하세요"
            className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          {suggestions.length > 0 ? (
            <ul className="mt-2 divide-y divide-border overflow-hidden rounded-lg border border-border">
              {suggestions.map((company) => (
                <li key={company.key}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-neutral-50"
                    onClick={() => addCompany(company)}
                  >
                    <span className="font-medium text-foreground">{company.companyName}</span>
                    <span className="shrink-0 text-xs font-semibold text-primary">제한</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {keyword && suggestions.length === 0 ? (
            <p className="mt-2 text-sm text-muted">채용 정보에서 해당 회사를 찾지 못했습니다.</p>
          ) : null}
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-foreground">열람을 제한한 회사</p>
          {draft.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {draft.map((company) => (
                <li
                  key={company.key}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-neutral-50 py-1 pl-3 pr-1.5 text-sm font-medium text-foreground"
                >
                  {company.companyName}
                  <button
                    type="button"
                    className="rounded-full px-2 py-0.5 text-xs font-semibold text-muted hover:bg-white hover:text-foreground"
                    onClick={() => removeCompany(company.key)}
                  >
                    해제
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">제한한 회사가 없습니다. 회사를 추가하면 그 회사 구인자는 이력서를 볼 수 없습니다.</p>
          )}
        </div>

        {didSave && !dirty ? (
          <p className="text-sm font-medium text-primary">이력서 열람 제한을 저장했습니다.</p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={!dirty} onClick={handleSave}>
            저장
          </Button>
          {dirty ? (
            <Button type="button" variant="secondary" onClick={handleCancel}>
              취소
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
