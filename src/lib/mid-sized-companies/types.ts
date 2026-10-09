export type MidSizedCompanyRecord = {
  companyName: string;
  businessNumber: string;
  corporateNumber: string | null;
  certificateNo: string | null;
  validFrom: string | null;
  validTo: string | null;
  region: string | null;
  industry: string | null;
  /** 채용 URL 탐색·수동 보강으로 연결된 경우 */
  careersUrl?: string | null;
  careersDiscoveryStatus?: 'pending' | 'found' | 'not_found';
  careersUrlCheckedAt?: string | null;
  crawlSourceId?: string;
  careersAdapter?: 'generic' | 'greenhouse';
  greenhouseBoard?: string | null;
};

export type MidSizedRegistryFile = {
  version: 1;
  source: 'mme';
  sourceNote: string;
  importedAt: string;
  companies: MidSizedCompanyRecord[];
};

export type MidSizedCareersConfig = {
  name: string;
  crawlSourceId: string;
  careersUrl: string;
  businessNumber?: string;
  adapter?: 'generic' | 'greenhouse';
  greenhouseBoard?: string;
  koreaOnly?: boolean;
};
