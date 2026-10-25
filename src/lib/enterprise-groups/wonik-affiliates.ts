/** 원익 집단 통합 채용(wonik-careers)과 장비 시드 명단 계열사 연결 */
export const WONIK_GROUP_CAREERS = {
  groupName: '원익',
  groupSourceId: 'wonik-careers',
  groupCareersUrl: 'https://recruit.wonik.com',
} as const;

export type WonikAffiliateSeedLink = {
  registryCompanyName: string;
  employerAliases: string[];
};

function ipsAliases(registryName: string): string[] {
  const base = [registryName, registryName.replace(/IPS/gi, '아이피에스')];
  if (/IPS/i.test(registryName)) {
    base.push('원익 IPS', 'WONIK IPS', 'WONIKIPS', '원익아이피에스');
  }
  return [...new Set(base)];
}

function peAliases(registryName: string): string[] {
  return [
    registryName,
    registryName.replace(/피앤이/g, '피엔이'),
    '원익 P&E',
    '원익P&E',
    '원익피엔이',
  ];
}

export const WONIK_AFFILIATE_SEED_LINKS: WonikAffiliateSeedLink[] = [
  {
    registryCompanyName: '원익IPS',
    employerAliases: ipsAliases('원익IPS'),
  },
  {
    registryCompanyName: '원익피앤이',
    employerAliases: peAliases('원익피앤이'),
  },
];
