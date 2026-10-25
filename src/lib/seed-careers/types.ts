export type SeedCareersTarget = {
  name: string;
  crawlSourceId: string;
  careersUrl: string;
  businessNumber?: string | null;
  adapter?: 'generic' | 'greenhouse';
  greenhouseBoard?: string | null;
};

export type SeedCareersDiscoveryEntry = {
  status: 'pending' | 'found' | 'not_found';
  checkedAt: string;
  careersUrl?: string;
};

export type SeedCareersDbCompany = {
  companyName: string;
  businessNumber: string | null;
  crawlSourceId: string;
  careersUrl: string | null;
  careersAdapter: 'generic' | 'greenhouse';
  greenhouseBoard: string | null;
  careersDiscoveryStatus: 'pending' | 'found' | 'not_found' | 'enterprise';
  careersUrlCheckedAt: string | null;
};

export type SeedCareersRegistryDbFile = {
  version: 1;
  updatedAt: string;
  segment: 'it' | 'semi-equipment';
  sourceNote: string;
  uniqueCompanyCount: number;
  careersUrlLinkedCount: number;
  companies: SeedCareersDbCompany[];
};
