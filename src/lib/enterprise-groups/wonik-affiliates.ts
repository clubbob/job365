/** 원익 집단 통합 채용(wonik-careers)과 장비 시드 명단 계열사 연결 */
export const WONIK_GROUP_CAREERS = {
  groupName: '원익',
  groupSourceId: 'wonik-careers',
  groupCareersUrl: 'https://wonik.recruiter.co.kr/career/home',
} as const;

export type WonikAffiliateSeedLink = {
  registryCompanyName: string;
  employerAliases: string[];
};

function uniqueAliases(names: string[]): string[] {
  return [...new Set(names.map((name) => name.trim()).filter(Boolean))];
}

function ipsAliases(registryName: string): string[] {
  return uniqueAliases([
    registryName,
    registryName.replace(/IPS/gi, '아이피에스'),
    '원익 IPS',
    'WONIK IPS',
    'WONIKIPS',
    '원익아이피에스',
  ]);
}

function peAliases(registryName: string): string[] {
  return uniqueAliases([
    registryName,
    registryName.replace(/피앤이/g, '피엔이'),
    '원익 P&E',
    '원익P&E',
    '원익피엔이',
    'WONIK P&E',
    'WONIK PNE',
  ]);
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
  {
    registryCompanyName: '원익큐엔씨',
    employerAliases: uniqueAliases([
      '원익큐엔씨',
      '원익큐앤씨',
      '원익 QnC',
      '원익QnC',
      'WONIK QnC',
      'WONIKQNC',
    ]),
  },
  {
    registryCompanyName: '원익머트리얼즈',
    employerAliases: uniqueAliases([
      '원익머트리얼즈',
      '원익머티리얼즈',
      '원익머트리얼스',
      'WONIK Materials',
      'WONIK MATERIALS',
    ]),
  },
  {
    registryCompanyName: '원익홀딩스',
    employerAliases: uniqueAliases(['원익홀딩스', 'WONIK Holdings', 'WONIK HOLDINGS', '원익그룹']),
  },
  {
    registryCompanyName: '원익로보틱스',
    employerAliases: uniqueAliases(['원익로보틱스', 'WONIK Robotics', 'WONIK ROBOTICS']),
  },
  {
    registryCompanyName: '티엘아이',
    employerAliases: uniqueAliases(['티엘아이', 'TLI', '원익티엘아이', '원익 TLI']),
  },
];
