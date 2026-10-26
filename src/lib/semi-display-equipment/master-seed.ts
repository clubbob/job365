/**
 * 반도체·디스플레이 전공정 장비·검사·정밀 부품·제어 인프라 (점사·기판·소재·화학·범용 IT 제외).
 * 관리자 「수집 채용 회사」 반도체·디스플레이 장비 탭 시드.
 */

const ZONE_PROCESS_EQUIPMENT: readonly string[] = [
  '원익IPS',
  '주성엔지니어링',
  '테스',
  '피에스케이',
  '케이씨텍',
  '에스앤에스텍',
  '에프에스티',
  '오로스테크놀로지',
  '인텍플러스',
  '기가레인',
  '코미코',
  '월덱스',
  '하나머티리얼즈',
  '티씨케이',
  '비씨엔씨',
  '케이엔제이',
  '디에스테크노',
  '신성이엔지',
  '위아이엠',
  '제이티',
  '유니셈',
  '엘오티베큠',
  '에스티아이',
  '싸이맥스',
  '라온테크',
  '티로보틱스',
  '코윈테크',
  '뉴파워프라즈마',
  '지오엘리먼트',
  '서플러스글로벌',
  '넥스틴',
  '엔시스',
  '제우스',
  '와이아이케이',
  '이오테크닉스',
  '레이저쎌',
  '아이씨디',
  '아바코',
  '야스',
  '선익시스템',
  '디바이스이엔지',
  '제이스텍',
  '헤스',
  '브이원텍',
  '영우디에스피',
  '케이맥',
  '참엔지니어링',
];

const ZONE_INSPECTION_TEST: readonly string[] = [
  '디아이',
  '미래컴퍼니',
  '오디텍',
  '코세스',
  '케이피에스',
  '코디',
  '프로이천',
  '피엔티',
  '원익피앤이',
  '디이엔티',
  '피엠티',
  '마이크로컨텍솔',
  'ISC',
  '리노공업',
  '네오셈',
  '피에프네트웍스',
  '에이엠테크놀로지',
  '탑정밀',
  '에이치앤비디자인',
  '제임스텍',
  '우리에이엔티',
  '디에스티아이',
  '아토스',
  '제이티에스',
  '엑스이크로',
  '신성델타테크',
  '코디엠',
  '에스티큐브',
  '위지트',
  '성우테크론',
];

const ZONE_INFRA_AUTOMATION: readonly string[] = [
  '하이록코리아',
  '비엠티',
  '성광벤드',
  '한익스프레스',
  '국보',
  '알에스오토메이션',
  '에스피시스템스',
  '휴림로봇',
  '디알텍',
  '레이언스',
  '센서뷰',
  '파워로직스',
  '캠시스',
  '엠씨넥스',
  '파트론',
  '나무가',
  '하이비젼시스템',
  '삼영엠텍',
  '뷰웍스',
];

const ZONE_PRECISION_PARTS: readonly string[] = [
  '우진',
  'NI제일기공',
  '화성밸브',
  '디케이락',
  '엔케이',
  '비에이치아이',
  '케이프',
  '삼기',
  '코리아에프티',
  '서연탑메탈',
  '우수AMS',
  '티에이치케이',
  '에스피지',
  '해성옵틱스',
  '삼화콘덴서',
  '삼화전자',
  '와이엠씨',
  '디에프텍',
  '에이치앤이',
  '디피씨',
  '삼익THK',
  '와이엔텍',
];

/** 공정 인프라·정밀 가공·2차전지 라인 장비 등 경계 업체 (소재·화학·범용 IT는 여전히 제외) */
const ZONE_BORDERLINE_INFRA: readonly string[] = [
  '상아프론테크',
  '에코프로에이치엔',
  '성우하이텍',
  '세화아이엠씨',
  '티피씨글로벌',
  '케이비아이동국실업',
  '태광',
  '지엔씨에너지',
  '대창스틸',
  '포스코스틸리온',
  '에이치엘비',
  '대동기어',
  '디와이',
  '진성티이씨',
  '코센',
  '제이브이엠',
  '하나기술',
  '씨아이에스',
  '엔에스',
];

const ZONES: readonly (readonly string[])[] = [
  ZONE_PROCESS_EQUIPMENT,
  ZONE_INSPECTION_TEST,
  ZONE_INFRA_AUTOMATION,
  ZONE_PRECISION_PARTS,
  ZONE_BORDERLINE_INFRA,
];

export function semiEquipmentSeedNormalizeKey(name: string): string {
  return name
    .replace(/\(주\)|주식회사|㈜|\s+/g, '')
    .trim()
    .toLowerCase();
}

function buildMasterSeedList(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const zone of ZONES) {
    for (const raw of zone) {
      const companyName = raw.trim();
      if (!companyName) continue;
      const key = semiEquipmentSeedNormalizeKey(companyName);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(companyName);
    }
  }
  return out;
}

export const MASTER_SEMI_DISPLAY_EQUIPMENT_SEED_NAMES: readonly string[] = buildMasterSeedList();

const SEED_KEY_SET = new Set(
  MASTER_SEMI_DISPLAY_EQUIPMENT_SEED_NAMES.map((name) => semiEquipmentSeedNormalizeKey(name)),
);

export function isMasterSeedSemiDisplayEquipmentCompany(companyName: string): boolean {
  return SEED_KEY_SET.has(semiEquipmentSeedNormalizeKey(companyName));
}

export function countMasterSemiDisplayEquipmentSeedCompanies(): number {
  return MASTER_SEMI_DISPLAY_EQUIPMENT_SEED_NAMES.length;
}
