export type FtcEnterpriseGroup = {
  rank: number;
  name: string;
  owner: string;
  affiliateCount: number;
  /** 연결된 일일 수집 출처 ID (`CrawlerCompany.id`) */
  crawlSourceId?: string;
};

export type FtcEnterpriseScope = {
  designationYear: number;
  groupCount: number;
  affiliateCount: number;
  crossInvestmentRestrictedGroupCount: number;
  crossInvestmentRestrictedAffiliateCount: number;
  sourceNote: string;
  groups: FtcEnterpriseGroup[];
};
