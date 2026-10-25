import {
  isMasterSeedSemiDisplayEquipmentCompany,
  semiEquipmentSeedNormalizeKey,
} from '@/lib/semi-display-equipment/master-seed';

/** 점사·기판(PCB·서브스트레이트) 등 명단 제외 */
const SEMI_DISPLAY_EQUIPMENT_EXCLUDED_NAME_KEYS = new Set(
  [
    '티엘비',
    '심텍',
    '해성디에스',
    '대덕전자',
    '코리아써키트',
    '이수페타시스',
    '비에이치',
    '뉴프렉스',
    '프로텍',
    '나래나노텍',
    '탑엔지니어링',
    '상보',
  ].map((name) => semiEquipmentSeedNormalizeKey(name)),
);

const SEMI_DISPLAY_EQUIPMENT_EXCLUDED_INDUSTRY_PATTERN =
  /(?:인쇄회로|PCB|FPCB|적층\s*기판|패키지\s*기판|서브스트레이트|리드프레임|점사|도포\s*장비|디스펜)/iu;

/** 반도체·디스플레이 장비·부품·검사 장비 업종 표현 */
const SEMI_DISPLAY_EQUIPMENT_INDUSTRY_PATTERN =
  /(?:반도체\s*(?:장비|제조|검사|부품)|디스플레이\s*(?:장비|검사|장치)|FPD|OLED\s*장비|웨이퍼|패키징\s*장비|프로브\s*카드|진공\s*(?:로봇|펌프)|클린룸\s*장비)/iu;

function isSemiDisplayEquipmentExcluded(companyName: string, industry?: string | null): boolean {
  const key = semiEquipmentSeedNormalizeKey(companyName);
  if (key && SEMI_DISPLAY_EQUIPMENT_EXCLUDED_NAME_KEYS.has(key)) return true;
  const industryText = (industry ?? '').trim();
  if (industryText && SEMI_DISPLAY_EQUIPMENT_EXCLUDED_INDUSTRY_PATTERN.test(industryText)) {
    return true;
  }
  return false;
}

export function isSemiDisplayEquipmentIndustry(industry: string | null | undefined): boolean {
  const trimmed = (industry ?? '').trim();
  if (!trimmed) return false;
  if (SEMI_DISPLAY_EQUIPMENT_EXCLUDED_INDUSTRY_PATTERN.test(trimmed)) return false;
  return SEMI_DISPLAY_EQUIPMENT_INDUSTRY_PATTERN.test(trimmed);
}

export function isSemiDisplayEquipmentCompanyName(companyName: string): boolean {
  const trimmed = companyName.trim();
  if (!trimmed) return false;
  return isMasterSeedSemiDisplayEquipmentCompany(trimmed);
}

export function isSemiDisplayEquipmentCompany(
  companyName: string,
  industry?: string | null,
): boolean {
  if (isSemiDisplayEquipmentExcluded(companyName, industry)) return false;
  if (isSemiDisplayEquipmentIndustry(industry)) return true;
  return isSemiDisplayEquipmentCompanyName(companyName);
}
