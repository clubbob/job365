/**
 * 관리자 IT 명단 보강용 마스터 시드 (참조 리스트 정제·중복 제거).
 * 크롤 소스가 없어도 명단·인지도 정렬에 포함됩니다.
 */

export type ItMasterSeedZone = 1 | 2 | 3 | 4 | 5 | 6;

const ZONE_1_GLOBAL: readonly string[] = [
  '구글코리아',
  '아마존웹서비스코리아',
  '애플코리아',
  '마이크로소프트코리아',
  '메타코리아',
  '넷플릭스서비시스코리아',
  '오라클코리아',
  'IBM코리아',
  'SAP코리아',
  '세일즈포스코리아',
  'VM웨어코리아',
  '레드햇코리아',
  '시스코시스템즈코리아',
  '델테크놀로지스코리아',
  '휴렛팩커드엔터프라이즈코리아',
  '서비스나우코리아',
  '워크데이코리아',
  '어도비코리아',
  '오토데스크코리아',
  'SAS코리아',
  '팔로알토네트웍스코리아',
  '포티넷코리아',
  '체크포인트소프트웨어테크놀로지스',
  'F5네트웍스코리아',
  '트렌드마이크로코리아',
  '클라우드플레어코리아',
  '크라우드스트라이크코리아',
  '지스케일러코리아',
  '다이나트레이스코리아',
  '뉴렐릭코리아',
  '페이팔코리아',
  '스트라이프코리아',
  '비자코리아',
  '마스터카드코리아',
  '아고다코리아',
  '부킹닷컴코리아',
  '익스피디아코리아',
  '에어비앤비코리아',
  '우버코리아',
  '스포티파이코리아',
  '테이크투인터랙티브코리아',
  '일렉트로닉아츠코리아',
  '블리자드엔터테인먼트코리아',
  '라이엇게임즈코리아',
  '유니티테크놀로지스코리아',
  '에픽게임즈코리아',
  '엔비디아코리아',
  '퀄컴코리아',
  '인텔코리아',
  'AMD코리아',
];

const ZONE_2_PLATFORM: readonly string[] = [
  '네이버',
  '네이버클라우드',
  '네이버랩스',
  '네이버웹툰',
  '네이버페이',
  '스노우',
  '카카오',
  '카카오페이',
  '카카오뱅크',
  '카카오모빌리티',
  '카카오엔터테인먼트',
  '카카오페이증권',
  '우아한형제들',
  '당근마켓',
  '비바리퍼블리카',
  '토스페이먼츠',
  '토스증권',
  '토스인베스트먼트',
  '라인플러스',
  '쿠팡',
  '쿠팡이츠',
  '두나무',
  '빗썸코리아',
];

const ZONE_3_GAME: readonly string[] = [
  '넥슨코리아',
  '네오플',
  '넥슨게임즈',
  '엔씨소프트',
  '넷마블',
  '넷마블네오',
  '크래프톤',
  '펍지스튜디오',
  '스마일게이트알피지',
  '스마일게이트엔터테인먼트',
  '펄어비스',
  '카카오게임즈',
  '라이온하트스튜디오',
  '위메이드',
  '컴투스',
  '컴투스홀딩스',
  '데브시스터즈',
  '시프트업',
  '웹젠',
  '네오위즈',
  '그라비티',
  '위메이드플레이',
  '액토즈소프트',
  '조이시티',
  '엠게임',
  '슈퍼캣',
  '하이브아이엠',
  '엔픽셀',
  '스튜디오비사이드',
  '레드랩게임즈',
  '라인게임즈',
  '밸로프',
  '데브캣',
  '스카이워크',
  '모비릭스',
  '하운드13',
  '플레이위드',
  '한빛소프트',
  '룽투코리아',
  '미투온',
  '미투젠',
  '에이펀인터렉티브',
  '자이언트스텝',
  '위지윅스튜디오',
  '덱스터스튜디오',
];

const ZONE_4_ENTERPRISE_SW: readonly string[] = [
  '삼성SDS',
  'LG CNS',
  'SK C&C',
  '현대오토에버',
  '포스코DX',
  '한화시스템',
  'CJ올리브네트웍스',
  '신세계I&C',
  '롯데이노베이트',
  'GS ITM',
  '농심NDS',
  '두산디지털이노베이션',
  '코오롱베니트',
  '효성ITX',
  'KT DS',
  '케이티클라우드',
  '메가존클라우드',
  '베스핀글로벌',
  '클라우드메이트',
  '더존비즈온',
  '한글과컴퓨터',
  '티맥스소프트',
  '티맥스테크놀로지',
  '영림원소프트랩',
  '안랩',
  '지니언스',
  '이스트소프트',
  '파수',
  '지란지교소프트',
  '이글루코퍼레이션',
  'SK쉴더스',
  '윈스',
  'SGA솔루션즈',
  '라온시큐어',
  '시큐아이',
  '파이오링크',
  '휴네시온',
  '브레인즈컴퍼니',
  '위세아이텍',
  '데이타솔루션',
  '와이즈넛',
  '솔트룩스',
  '코난테크놀로지',
  '바이브컴퍼니',
  '마음AI',
  '오브젠',
  '플래티어',
  'KINX',
  '가비아',
  '후이즈',
  '카페24',
  '다우기술',
  '스패로우',
  '엑셈',
  '티베로',
  '오픈에스앤에스',
  '타이거컴퍼니',
  '엔쓰리엔',
  '아이티센',
  '쌍용정보통신',
  '대신정보통신',
  '대보정보통신',
  '웹케시',
  '쿠콘',
  '비즈니스온',
  '핑거',
  '페이레터',
  '세틀뱅크',
  'KG이니시스',
  'KG모빌리언스',
  'NHN KCP',
  '다날',
  '토스플레이스',
  '하이픈코퍼레이션',
  '웰컴페이먼츠',
  '페이민트',
  'NHN',
  'NHN페이코',
  'NHN벅스',
  'NHN클라우드',
  'NHN에듀',
  'NHN커머스',
  '카카오엔터프라이즈',
  '슈프리마',
  '유니온커뮤니티',
];

const ZONE_5_VERTICAL: readonly string[] = [
  '컬리',
  '버킷플레이스',
  '지마켓',
  '11번가',
  '무신사',
  '에이블리코퍼레이션',
  '카카오스타일',
  '브랜디',
  'W컨셉',
  '라포랩스',
  'SSG닷컴',
  '롯데쇼핑 e커머스',
  '하이퍼커넥트',
  '직방',
  '스테이션3',
  '야놀자',
  '야놀자클라우드',
  '여기어때컴퍼니',
  '마이리얼트립',
  '트립비토즈',
  '쏘카',
  'VCNC',
  '그린카',
  '우아한청년들',
  '바로고',
  '로지올',
  '쿠팡로지스틱스서비스',
  '두핸즈',
  '테크타카',
  '아톤',
  '뱅크샐러드',
  '핀다',
  '해빗팩토리',
  '세니젠',
  '코인원',
  '코빗',
  '고팍스',
  '루트에너지',
  '인터파크트리플',
  '다나와',
  '써머스플랫폼',
  '카카오헬스케어',
  '피알앤디컴퍼니',
  '카닥',
  '오픈서베이',
  '캐치테이블',
  '테이블링',
  '페이히어',
  '스포카',
  '발란',
  '트렌비',
  '머스트잇',
  '야놀자에프앤비솔루션',
  '넛지헬스케어',
  '닥터나우',
  '굿닥',
  '피플펀드',
  '렌딧',
  '에잇퍼센트',
  '핀크',
  '갤럭시아머니트리',
  '예스24',
  '알라딘커뮤니케이션',
  '인터파크커머스',
  'SK스토아',
  'KT알파',
  'GS리테일 디지털커머스',
  'CJ온스타일',
  '롯데홈쇼핑',
  '케이카',
  '호갱노노',
  '아파트아이',
  '알스퀘어',
  '스파크플러스',
  '패스트파이브',
  '트레바리',
  '토스인슈어런스',
  '토스씨엑스',
  '에임메드',
  '나만의닥터',
];

const ZONE_6_INDEPENDENT_TECH: readonly string[] = [
  '업스테이지',
  '솔트룩스인사이트',
  '와이즈에이아이',
  '마인즈랩',
  '포티투마루',
  '셀바스AI',
  '솔트웨어',
  '이노그리드',
  '오픈소스컨설팅',
  '나이블',
  '아토리서치',
  '시큐레터',
  '쿼리파이',
  '센스톤',
  '모비젠',
  '데이터스트림즈',
  '위비콘',
  '위엠비',
  '케이엠에스테크놀로지',
  '에스에스앤씨',
  '엔키',
  '티오더',
  '에스넷시스템',
  '굿어스',
  '코인플러그',
  '람다256',
  '해치랩스',
  '체인파트너스',
  '헥슬란트',
  '스프링클라우드',
  '오토노머스에이투지',
  '모빌테크',
  '스트라드비젼',
  '서울로보틱스',
  '클루커스',
  '디딤365',
  '씨유박스',
  '오파스넷',
  '콤텍시스템',
  '비투엔',
  '모니터랩',
  '지란지교시큐리티',
  '엑스게이트',
  '한싹',
  '시큐브',
  '에스에스알',
  '이지서포트',
  '알서포트',
  '아이스크림미디어',
  '빅픽처인터렉티브',
  '한국신용데이터',
  '원티드스페이스',
  '플렉스',
  '시프티',
  '자비스앤빌런즈',
  '프로토콘',
  '체인네트웍스',
  '링고틀',
  '위드마크',
  '메가존솔루션',
];

const ZONES: readonly (readonly string[])[] = [
  ZONE_1_GLOBAL,
  ZONE_2_PLATFORM,
  ZONE_3_GAME,
  ZONE_4_ENTERPRISE_SW,
  ZONE_5_VERTICAL,
  ZONE_6_INDEPENDENT_TECH,
];

/** 명단 dedupe·채용 공고 매칭용 (catalog와 동일 규칙) */
export function masterSeedNormalizeKey(name: string): string {
  return name
    .replace(/\(주\)|주식회사|㈜|\s+/g, '')
    .trim()
    .toLowerCase();
}

function buildMasterSeedList(): { companyName: string; zone: ItMasterSeedZone }[] {
  const seen = new Set<string>();
  const out: { companyName: string; zone: ItMasterSeedZone }[] = [];

  ZONES.forEach((zoneNames, zoneIndex) => {
    const zone = (zoneIndex + 1) as ItMasterSeedZone;
    for (const raw of zoneNames) {
      const companyName = raw.trim();
      if (!companyName) continue;
      const key = masterSeedNormalizeKey(companyName);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ companyName, zone });
    }
  });

  return out;
}

const MASTER_SEED_ENTRIES = buildMasterSeedList();

export const MASTER_IT_COMPANY_SEED_NAMES: readonly string[] = MASTER_SEED_ENTRIES.map(
  (entry) => entry.companyName,
);

const MASTER_SEED_KEY_TO_FAME_INDEX = new Map<string, number>(
  MASTER_IT_COMPANY_SEED_NAMES.map((name, index) => [masterSeedNormalizeKey(name), index]),
);

export function isMasterSeedItCompany(companyName: string): boolean {
  const key = masterSeedNormalizeKey(companyName);
  return MASTER_SEED_KEY_TO_FAME_INDEX.has(key);
}

/** 시드 목록 순서(앞쪽이 더 유명). crawl·기존 fame 토큰 다음 구간 */
const MASTER_SEED_FAME_BASE = 250;

export function masterSeedFameRank(companyName: string): number | null {
  const index = MASTER_SEED_KEY_TO_FAME_INDEX.get(masterSeedNormalizeKey(companyName));
  if (index === undefined) return null;
  return MASTER_SEED_FAME_BASE + index;
}

export function masterSeedZoneForCompany(companyName: string): ItMasterSeedZone | null {
  const key = masterSeedNormalizeKey(companyName);
  const index = MASTER_SEED_KEY_TO_FAME_INDEX.get(key);
  if (index === undefined) return null;
  return MASTER_SEED_ENTRIES[index]?.zone ?? null;
}

export function countMasterSeedCompanies(): number {
  return MASTER_IT_COMPANY_SEED_NAMES.length;
}
