import { companyLabelsMatch } from '@/lib/crawler/company-name-match';
import { crawledJobRecruitingCompanyName } from '@/lib/job-display';
import {
  WONIK_AFFILIATE_SEED_LINKS,
  WONIK_GROUP_CAREERS,
  type WonikAffiliateSeedLink,
} from '@/lib/enterprise-groups/wonik-affiliates';

export type GroupAffiliateRegistryLink = WonikAffiliateSeedLink & {
  groupSourceId: string;
  groupCareersUrl: string;
  dedicatedCareersUrl: string | null;
};

const ALL_LINKS: GroupAffiliateRegistryLink[] = WONIK_AFFILIATE_SEED_LINKS.map((row) => ({
  ...row,
  groupSourceId: WONIK_GROUP_CAREERS.groupSourceId,
  groupCareersUrl: WONIK_GROUP_CAREERS.groupCareersUrl,
  dedicatedCareersUrl: null,
}));

const byRegistryName = new Map<string, GroupAffiliateRegistryLink>(
  ALL_LINKS.map((link) => [link.registryCompanyName, link]),
);

export function findGroupAffiliateByRegistryName(companyName: string): GroupAffiliateRegistryLink | null {
  const trimmed = companyName.trim();
  if (!trimmed) return null;
  const direct = byRegistryName.get(trimmed);
  if (direct) return direct;
  return ALL_LINKS.find((link) => companyLabelsMatch(link.registryCompanyName, trimmed)) ?? null;
}

export function findGroupAffiliateByEmployerLabel(employerLabel: string): GroupAffiliateRegistryLink | null {
  const trimmed = employerLabel.trim();
  if (!trimmed) return null;
  for (const link of ALL_LINKS) {
    if (companyLabelsMatch(link.registryCompanyName, trimmed)) return link;
    if (link.employerAliases.some((alias) => companyLabelsMatch(alias, trimmed))) return link;
  }
  return null;
}

export type RegistryRowGroupAffiliateEnrichment = {
  careersUrl: string | null;
  careersUrlNote: string | null;
  linked: boolean;
  careersDiscoveryStatus: 'pending' | 'found' | 'not_found' | 'enterprise';
  groupSourceId: string | null;
};

/** 전용 URL이 없을 때 집단 통합 채용 URL·표기를 채웁니다. */
export function enrichRegistryRowWithGroupAffiliate(input: {
  companyName: string;
  careersUrl: string | null;
  linked: boolean;
  careersDiscoveryStatus: 'pending' | 'found' | 'not_found' | 'enterprise';
}): RegistryRowGroupAffiliateEnrichment {
  const link = findGroupAffiliateByRegistryName(input.companyName);
  if (!link) {
    return {
      careersUrl: input.careersUrl,
      careersUrlNote: null,
      linked: input.linked,
      careersDiscoveryStatus: input.careersDiscoveryStatus,
      groupSourceId: null,
    };
  }

  const dedicated = link.dedicatedCareersUrl?.trim() || null;
  const ownUrl = input.careersUrl?.trim() || dedicated || null;
  const needsDedicatedUrl =
    !ownUrl && Boolean(link.groupCareersUrl) && !input.careersUrl?.trim() && !dedicated;

  return {
    careersUrl: ownUrl,
    careersUrlNote: needsDedicatedUrl ? '집단 통합 채용만 있음 · 회사별 전용 URL 필요' : null,
    linked: Boolean(ownUrl),
    careersDiscoveryStatus: input.careersDiscoveryStatus,
    groupSourceId: ownUrl ? link.groupSourceId : null,
  };
}

/** wonik-careers 등 집단 소스 공고의 저장 companyName을 시드 표준명으로 맞춥니다. */
export function canonicalizeCrawledJobCompanyNameForPersist(
  job: Pick<{ sourceId: string; companyName: string; title: string }, 'sourceId' | 'companyName' | 'title'>,
): string {
  if (job.sourceId !== WONIK_GROUP_CAREERS.groupSourceId) return job.companyName;

  const employer = crawledJobRecruitingCompanyName(job).trim();
  const link = findGroupAffiliateByEmployerLabel(employer);
  if (link) return link.registryCompanyName;

  return job.companyName;
}

export function employerLabelsForRegistryCompany(companyName: string): string[] {
  const link = findGroupAffiliateByRegistryName(companyName);
  if (!link) return [companyName];
  return [...new Set([companyName, link.registryCompanyName, ...link.employerAliases])];
}
